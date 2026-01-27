import { useCallback, useEffect, useState } from "react";
import LiquidEther from "../components/LiquidEther";
import PostModal from "../components/PostModal";
import PostCard from "../components/PostCard";
import { fetchPosts, uploadPost, votePost, fetchComments, createComment } from "../services/api";
import { useAuth } from "../context/AuthContext";
import type { Post } from "../types/post";
import type { Comment } from "../types/comment";

type Vote = -1 | 0 | 1;

export default function Home() {
  const { token } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [showPostModal, setShowPostModal] = useState(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [myVotes, setMyVotes] = useState<Record<string, Vote>>({});

  const loadPosts = useCallback(async () => {
    if (!token) return;
    try {
      const allPosts = (await fetchPosts(token)) as Post[];
      
      // Get top 5 most upvoted posts
      const topPosts = [...allPosts]
        .sort((a, b) => b.votes - a.votes)
        .slice(0, 5);

      // Get 5 random posts (excluding top posts)
      const remainingPosts = allPosts.filter(
        (p) => !topPosts.some((tp) => tp.id === p.id)
      );
      const randomPosts = [...remainingPosts]
        .sort(() => Math.random() - 0.5)
        .slice(0, 5);

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
        {/* Header with Post button */}
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 24 }}>
          <button 
            onClick={() => setShowPostModal(true)} 
            style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
          >
            <span>📸</span>
            Post
          </button>
        </div>

        {/* Masonry-style posts (4 columns, variable card heights) */}
        {posts.length === 0 ? (
          <div style={{ textAlign: "center", padding: "48px", color: "var(--muted)" }}>
            No posts yet. Be the first to post!
          </div>
        ) : (
          <div
            style={{
              columnCount: 4,
              columnGap: "16px",
            }}
          >
            {posts.map((post) => (
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
      </div>

      {showPostModal && (
        <PostModal
          onClose={() => setShowPostModal(false)}
          onSubmit={handleUpload}
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
              }}
            >
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
                  comments.map((c) => (
                    <div
                      key={c.id}
                      style={{
                        marginBottom: 8,
                        fontSize: "0.85rem",
                      }}
                    >
                      <span
                        style={{
                          fontWeight: 600,
                          marginRight: 4,
                        }}
                      >
                        {c.username ?? "anon"}:
                      </span>
                      <span>{c.content}</span>
                    </div>
                  ))
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
      )}
    </div>
  );
}
