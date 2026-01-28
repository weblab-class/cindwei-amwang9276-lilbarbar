import { useCallback, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import LiquidEther from "../components/LiquidEther";
import PostModal from "../components/PostModal";
import PostCard from "../components/PostCard";
import CompletionCard from "../components/CompletionCard";
import { fetchPosts, uploadPost, votePost, fetchComments, createComment, getQuestDifficulty } from "../services/api";
import { useAuth } from "../context/AuthContext";
import type { Post } from "../types/post";
import type { Comment } from "../types/comment";

type Vote = -1 | 0 | 1;

export default function Home() {
  const { token } = useAuth();
  const location = useLocation();
  const locationState = (location.state as {
    completedQuestId?: string;
    completedQuestTitle?: string;
    receivedAt?: string;
  } | null) ?? null;
  const completedQuestIdFromProfile = locationState?.completedQuestId ?? null;
  const completedQuestTitle = locationState?.completedQuestTitle ?? null;
  const receivedAt = locationState?.receivedAt ?? null;
  
  const [posts, setPosts] = useState<Post[]>([]);
  const [showPostModal, setShowPostModal] = useState(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [myVotes, setMyVotes] = useState<Record<string, Vote>>({});

  const [initialQuestForPostModal, setInitialQuestForPostModal] = useState<
    string | null
  >(completedQuestIdFromProfile);
  const [questSearch, setQuestSearch] = useState("");
  const [showUploadSuccess, setShowUploadSuccess] = useState(false);
  const [showCompletionCard, setShowCompletionCard] = useState(false);
  const [completionData, setCompletionData] = useState<{
    questTitle: string;
    timeToComplete: { days: number; hours: number; minutes: number };
    difficulty: number;
    difficultyLabel: string;
  } | null>(null);

  // If we navigated here from Profile after completing a quest, auto-open the post modal
  useEffect(() => {
    if (token && completedQuestIdFromProfile) {
      setInitialQuestForPostModal(completedQuestIdFromProfile);
      setShowPostModal(true);
    }
  }, [token, completedQuestIdFromProfile]);

  // Calculate completion data when post modal closes after completing a quest
  useEffect(() => {
    // Only trigger if we have all required data and the post modal just closed
    if (!showPostModal && completedQuestIdFromProfile && completedQuestTitle && token) {
      const calculateCompletionData = async () => {
        try {
          // Calculate time difference
          // Use receivedAt if available, otherwise default to 1 hour ago (fallback for old quests)
          const receivedTime = receivedAt 
            ? new Date(receivedAt).getTime() 
            : Date.now() - (60 * 60 * 1000); // 1 hour ago as fallback
          const completedTime = Date.now();
          const diffMs = completedTime - receivedTime;
          
          const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
          const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
          const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

          // Get difficulty
          const difficultyData = await getQuestDifficulty(completedQuestIdFromProfile);
          const completionRate = difficultyData.completion_rate;

          // Determine difficulty level (inverse: lower completion rate = higher difficulty)
          // Cutoffs: 80%, 60%, 40%, 20%, 5%
          let difficulty = 0;
          let difficultyLabel = "surface";
          if (completionRate >= 80) {
            difficulty = 1;
            difficultyLabel = "surface";
          } else if (completionRate >= 60) {
            difficulty = 2;
            difficultyLabel = "twilight";
          } else if (completionRate >= 40) {
            difficulty = 3;
            difficultyLabel = "midnight";
          } else if (completionRate >= 20) {
            difficulty = 4;
            difficultyLabel = "abyssal";
          } else if (completionRate >= 5) {
            difficulty = 5;
            difficultyLabel = "hadal";
          } else {
            difficulty = 5;
            difficultyLabel = "hadal";
          }

          setCompletionData({
            questTitle: completedQuestTitle,
            timeToComplete: { days, hours, minutes },
            difficulty,
            difficultyLabel,
          });
          setShowCompletionCard(true);
        } catch (error) {
          console.error("Failed to calculate completion data:", error);
        }
      };

      void calculateCompletionData();
    }
  }, [showPostModal, completedQuestIdFromProfile, completedQuestTitle, receivedAt, token]);

  useEffect(() => {
    if (!showUploadSuccess) return;
    const timer = setTimeout(() => setShowUploadSuccess(false), 2500);
    return () => clearTimeout(timer);
  }, [showUploadSuccess]);

  const loadPosts = useCallback(async () => {
    if (!token) return;
    try {
      const allPosts = (await fetchPosts(token)) as Post[];

      // Get top 5 most upvoted posts
      const topPosts = [...allPosts].sort((a, b) => b.votes - a.votes).slice(0, 5);

      // Get 5 random posts (excluding top posts)
      const remainingPosts = allPosts.filter((p) => !topPosts.some((tp) => tp.id === p.id));
      const randomPosts = [...remainingPosts].sort(() => Math.random() - 0.5).slice(0, 5);

      // Combine: top 5 + random 5 (or less if not enough posts)
      const displayPosts = [...topPosts, ...randomPosts].slice(0, 10);
      setPosts(displayPosts);
      setMyVotes(() => {
        const next: Record<string, Vote> = {};
        for (const p of displayPosts) {
          next[p.id] = (p.my_vote ?? 0) as Vote;
        }
        return next;
      });
    } catch (error) {
      console.error("Failed to load posts:", error);
    }
  }, [token]);

  useEffect(() => {
    // Defer to avoid synchronous setState within effect body (eslint rule)
    const t = window.setTimeout(() => {
      void loadPosts();
    }, 0);
    return () => window.clearTimeout(t);
  }, [loadPosts]);

  async function handleUpload(file: File, questId: string) {
    if (!token) {
      throw new Error("Missing credentials");
    }
    await uploadPost(token, file, questId);
    await loadPosts();
    setShowUploadSuccess(true);
  }

  async function handleVote(postId: string, direction: 1 | -1) {
    if (!token) return;
    const prevVote: Vote = myVotes[postId] ?? 0;
    const nextVote: Vote = prevVote === direction ? 0 : direction;
    const delta = nextVote - prevVote; // -2, -1, +1, +2
    if (delta === 0) return;

    // optimistic UI update
    setMyVotes((prev) => ({ ...prev, [postId]: nextVote }));
    try {
      await votePost(token, postId, delta);
      // Update local state
      setPosts((prevPosts) => {
        const updated = prevPosts.map((p) =>
          p.id === postId ? { ...p, votes: p.votes + delta } : p
        );
        return updated;
      });
      setSelectedPost((prev) =>
        prev && prev.id === postId ? { ...prev, votes: prev.votes + delta } : prev
      );
    } catch (error) {
      console.error("Failed to vote:", error);
      // rollback optimistic vote state if request failed
      setMyVotes((prev) => ({ ...prev, [postId]: prevVote }));
    }
  }

  async function loadComments(postId: string) {
    if (!token) return;
    try {
      const data = await fetchComments(token, postId);
      setComments(data);
    } catch (error) {
      console.error("Failed to load comments:", error);
    }
  }

  async function handleCreateComment() {
    if (!token || !selectedPost) return;
    const trimmed = newComment.trim();
    if (!trimmed) return;
    try {
      const created = await createComment(token, selectedPost.id, trimmed);
      setComments((prev) => [...prev, created]);
      setNewComment("");
    } catch (error) {
      console.error("Failed to create comment:", error);
    }
  }

  const filteredPosts =
    questSearch.trim().length === 0
      ? posts
      : posts.filter((p) => {
          const needle = questSearch.trim().toLowerCase();
          const questTitle = (p.quest_title || "").toLowerCase();
          const username = (p.poster_username || "").toLowerCase();
          return questTitle.includes(needle) || username.includes(needle);
        });

  return (
    <div
      className="page-fade-in"
      style={{ padding: 24, paddingRight: 48, backgroundColor: "#000000", minHeight: "100vh", position: "relative" }}
    >
      {/* react bit liquid background */}
      <div style={{ 
        width: '100vw', 
        height: '100vh', 
        position: 'fixed', 
        top: 0, 
        left: '200px', 
        zIndex: 0,
        pointerEvents: 'none',
        overflow: 'hidden',
      }}>
        <div style={{ width: '1080px', height: '1080px', position: 'relative' }}>
          <LiquidEther
            mouseForce={5}
            cursorSize={170}
            isViscous
            viscous={90}
            colors={["#5837a4","#2f54ca","#00ffee"]}
            autoDemo
            autoSpeed={0.5}
            autoIntensity={2.2}
            isBounce={false}
            resolution={0.5}
          />
        </div>
      </div>
      
      {/* content */}
      <div style={{ position: "relative", zIndex: 1 }}>
        {/* Header with Post button + quest search */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 16,
            marginBottom: 24,
          }}
        >
          <div
            style={{
              flex: 1,
              maxWidth: 320,
            }}
          >
            <input
              type="text"
              placeholder="Search by quest or user..."
              value={questSearch}
              onChange={(e) => setQuestSearch(e.target.value)}
              style={{
                width: "100%",
                padding: "0.6em 0.9em",
                borderRadius: 999,
                border: "1px solid var(--muted)",
                background: "rgba(0,0,0,0.65)",
                color: "var(--text)",
                fontSize: "0.9rem",
              }}
            />
          </div>
          <div>
            <button
              onClick={() => setShowPostModal(true)}
              className="float-bob"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "1.5em 2em",
                fontWeight: 700,
                fontSize: "1rem",
                animationDelay: "0.5s",
              }}
            >
              <img src="/turtle.svg" alt="" width={24} height={24} style={{ opacity: 0.8 }} />
              Post
            </button>
          </div>
        </div>

        {/* Masonry-style posts (4 columns, variable card heights) */}
        {filteredPosts.length === 0 ? (
          <div style={{ textAlign: "center", padding: "48px", color: "var(--muted)" }}>
            {posts.length === 0 && questSearch.trim().length === 0
              ? "Loading posts..."
              : "No posts match this quest search."}
          </div>
        ) : (
          <div
            style={{
              columnCount: 4,
              columnGap: "16px",
            }}
          >
            {filteredPosts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                myVote={myVotes[post.id] ?? 0}
                onVote={handleVote}
                onOpen={async () => {
                  setSelectedPost(post);
                  setComments([]);
                  setNewComment("");
                  await loadComments(post.id);
                }}
              />
            ))}
          </div>
        )}

        {/* Field Guide */}
        <div
          style={{
            marginTop: 64,
            padding: 32,
            background: "var(--panel)",
            borderRadius: 16,
            border: "1px solid rgba(255,255,255,0.1)",
            maxWidth: 800,
            marginLeft: "auto",
            marginRight: "auto",
          }}
        >
          <h2
            style={{
              marginTop: 0,
              marginBottom: 24,
              fontSize: "1.8rem",
              fontWeight: 700,
              color: "var(--text)",
            }}
          >
            Field Guide
          </h2>
          <div
            style={{
              fontSize: "0.95rem",
              lineHeight: 1.7,
              color: "var(--text)",
              display: "flex",
              flexDirection: "column",
              gap: 16,
            }}
          >
            <p style={{ margin: 0 }}>
              Friends may challenge each other to quests. Be mindful of challenges, quests cannot be removed once received! Once received, quests can be marked completed and posted, view your earned completion cards in your profile.
            </p>
            <p style={{ margin: 0 }}>
              Completed quests give badges displayed on your profile. Badges also have two statistics, the yellow number is the number of votes your top voted post in the quest category has, while the green number is how many posts you have in that quest category. Numbers will glow the higher they are!
            </p>
            <p style={{ margin: 0 }}>
              Any user can submit a quest and choose a corresponding badge icon.
            </p>
            <p style={{ margin: 0 }}>
              Quests are ranked in difficulty from surface, twilight, midnight, abyssal, to hadal. These represent average completed/received ratios over all users of 80%, 60%, 40%, 20%, and 5% respectively.
            </p>
          </div>
        </div>
      </div>

      {showUploadSuccess && (
        <div
          style={{
            position: "fixed",
            bottom: 24,
            left: "50%",
            transform: "translateX(-50%)",
            background: "rgba(0, 0, 0, 0.9)",
            color: "var(--text)",
            padding: "10px 16px",
            borderRadius: 999,
            border: "1px solid var(--mint)",
            fontSize: "0.9rem",
            zIndex: 1100,
            boxShadow: "0 10px 30px rgba(0,0,0,0.7)",
          }}
        >
          Successfully uploaded!
        </div>
      )}

      {showPostModal && (
        <PostModal
          onClose={() => {
            setShowPostModal(false);
            setInitialQuestForPostModal(null);
          }}
          onSubmit={handleUpload}
          initialQuestId={initialQuestForPostModal ?? undefined}
        />
      )}

      {showCompletionCard && completionData && (
        <CompletionCard
          questTitle={completionData.questTitle}
          timeToComplete={completionData.timeToComplete}
          difficulty={completionData.difficulty}
          difficultyLabel={completionData.difficultyLabel}
          onClose={() => {
            setShowCompletionCard(false);
            setCompletionData(null);
          }}
        />
      )}

      {selectedPost && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.75)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
          onClick={() => setSelectedPost(null)}
        >
          <div
            style={{
              background: "#050505",
              borderRadius: 16,
              maxWidth: "90vw",
              maxHeight: "90vh",
              overflow: "hidden",
              boxShadow: "0 24px 80px rgba(0,0,0,0.85)",
              display: "flex",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Left: media + caption + votes */}
            <div
              style={{
                flex: 3,
                display: "flex",
                flexDirection: "column",
                background: "#000",
              }}
            >
              <div
                style={{
                  position: "relative",
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: 12,
                }}
              >
                {/* Close button */}
                <button
                  onClick={() => setSelectedPost(null)}
                  style={{
                    position: "absolute",
                    top: 12,
                    right: 16,
                    background: "rgba(0,0,0,0.7)",
                    border: "1px solid var(--muted)",
                    borderRadius: 999,
                    color: "var(--text)",
                    padding: "4px 10px",
                    cursor: "pointer",
                    fontSize: "0.85rem",
                    zIndex: 3,
                  }}
                >
                  ✕
                </button>

                {/* Media */}
                {selectedPost.media_type === "video" ? (
                  <video
                    src={selectedPost.media_url}
                    style={{
                      maxWidth: "100%",
                      maxHeight: "80vh",
                      objectFit: "contain",
                    }}
                    muted
                    loop
                    autoPlay
                    playsInline
                    controls
                  />
                ) : (
                  <img
                    src={selectedPost.media_url}
                    alt={selectedPost.quest_title || "Post"}
                    style={{
                      maxWidth: "100%",
                      maxHeight: "80vh",
                      objectFit: "contain",
                    }}
                  />
                )}
              </div>

              <div
                style={{
                  padding: 16,
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                  background: "var(--panel)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 16,
                  }}
                >
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 10 }}
                  >
                    <span style={{ fontSize: "1.6rem" }}>
                      {selectedPost.quest_icon}
                    </span>
                    <div>
                      <div
                        style={{
                          fontSize: "0.95rem",
                          fontWeight: 600,
                        }}
                      >
                        {selectedPost.quest_title}
                      </div>
                      <div
                        style={{
                          fontSize: "0.8rem",
                          color: "var(--muted)",
                        }}
                      >
                        Linked quest
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        void handleVote(selectedPost.id, 1);
                      }}
                      style={{
                        background:
                          (myVotes[selectedPost.id] ?? 0) === 1
                            ? "var(--mint)"
                            : "transparent",
                        border: "1px solid var(--mint)",
                        color:
                          (myVotes[selectedPost.id] ?? 0) === 1
                            ? "#000"
                            : "var(--mint)",
                        padding: "4px 10px",
                        borderRadius: 999,
                        cursor: "pointer",
                        fontSize: "0.9rem",
                      }}
                    >
                      ↑
                    </button>
                    <span
                      style={{
                        minWidth: "32px",
                        textAlign: "center",
                        fontWeight: 700,
                      }}
                    >
                      {selectedPost.votes}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        void handleVote(selectedPost.id, -1);
                      }}
                      style={{
                        background:
                          (myVotes[selectedPost.id] ?? 0) === -1
                            ? "var(--mint)"
                            : "transparent",
                        border: "1px solid var(--mint)",
                        color:
                          (myVotes[selectedPost.id] ?? 0) === -1
                            ? "#000"
                            : "var(--mint)",
                        padding: "4px 10px",
                        borderRadius: 999,
                        cursor: "pointer",
                        fontSize: "0.9rem",
                      }}
                    >
                      ↓
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: comments full-height column */}
            <div
              style={{
                flex: 2,
                display: "flex",
                flexDirection: "column",
                background: "var(--panel)",
                borderLeft: "1px solid var(--muted)",
                padding: 16,
                maxWidth: "360px",
                position: "relative",
              }}
            >
              {/* Jellies background */}
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  backgroundImage: "url(/jellies.svg)",
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                  backgroundRepeat: "no-repeat",
                  opacity: 0.15,
                  pointerEvents: "none",
                  zIndex: 0,
                }}
              />
              <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
                <div
                  style={{
                    fontSize: "0.9rem",
                    fontWeight: 600,
                    marginBottom: 8,
                  }}
                >
                  Comments
                </div>

              <div
                style={{
                  flex: 1,
                  overflowY: "auto",
                  marginBottom: 8,
                }}
              >
                {comments.length === 0 ? (
                  <div
                    style={{
                      fontSize: "0.85rem",
                      color: "var(--muted)",
                    }}
                  >
                    No comments yet. Be the first to comment.
                  </div>
                ) : (
                  comments.map((c) => {
                    const displayName = c.username ?? "anon";
                    const initial = displayName[0]?.toUpperCase() ?? "?";
                    return (
                      <div
                        key={c.id}
                        style={{
                          marginBottom: 8,
                          fontSize: "0.85rem",
                          display: "flex",
                          alignItems: "flex-start",
                          gap: 8,
                        }}
                      >
                        <div
                          style={{
                            width: 24,
                            height: 24,
                            borderRadius: "50%",
                            background: c.pfp_url
                              ? "transparent"
                              : "rgba(255,255,255,0.12)",
                            border: "1px solid rgba(255,255,255,0.28)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "0.65rem",
                            fontWeight: 700,
                            color: "rgba(255,255,255,0.9)",
                            overflow: "hidden",
                            flexShrink: 0,
                          }}
                        >
                          {c.pfp_url ? (
                            <img
                              src={c.pfp_url}
                              alt={`${displayName} avatar`}
                              style={{
                                width: "100%",
                                height: "100%",
                                objectFit: "cover",
                                display: "block",
                              }}
                            />
                          ) : (
                            initial
                          )}
                        </div>
                        <div>
                          <span
                            style={{
                              fontWeight: 600,
                              marginRight: 4,
                            }}
                          >
                            {displayName}:
                          </span>
                          <span>{c.content}</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginTop: 4,
                }}
              >
                <input
                  placeholder="Add a comment..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      void handleCreateComment();
                    }
                  }}
                  style={{
                    flex: 1,
                    padding: "6px 10px",
                    borderRadius: 8,
                    border: "1px solid var(--muted)",
                    background: "transparent",
                    color: "var(--text)",
                    fontSize: "0.85rem",
                  }}
                />
                <button
                  onClick={handleCreateComment}
                  disabled={!newComment.trim()}
                  style={{
                    background: newComment.trim()
                      ? "var(--mint)"
                      : "rgba(255,255,255,0.12)",
                    border: "none",
                    color: newComment.trim() ? "#000" : "var(--muted)",
                    padding: "6px 12px",
                    borderRadius: 999,
                    cursor: newComment.trim() ? "pointer" : "default",
                    fontSize: "0.85rem",
                    fontWeight: 600,
                  }}
                >
                  Post
                </button>
              </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
