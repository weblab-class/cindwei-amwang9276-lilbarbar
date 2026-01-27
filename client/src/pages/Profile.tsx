import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  sendFriendRequest,
  getIncomingRequests,
  respondFriendRequest,
  getFriends,
  fetchReceivedQuests,
  completeQuest,
  fetchCompletedQuests,
  fetchCompletedQuestsForUser,
  fetchMe,
  fetchUserByUsername,
  fetchComments,
  createComment,
  votePost,
  uploadProfilePicture,
  removeFriend,
} from "../services/api";
import type { Post } from "../types/post";
import { fetchPosts } from "../services/api";
import type { Comment } from "../types/comment";
import LiquidEther from "../components/LiquidEther";

interface CompletedQuest {
  id: string; // quest id (server returns quest_id as id)
  quest_id?: string;
  title: string;
  icon: string;
}



interface FriendRequest {
  id: string;
  from_user_id: string;
  from_username?: string;
}

interface Friend {
  id: string;
  username: string;
}

interface ReceivedQuest {
  id: string;
  title: string;
  icon: string;
}

//components

export default function Profile() {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [username, setUsername] = useState("");
  const [hoveredBadgeId, setHoveredBadgeId] = useState<string | null>(null);

  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [received, setReceived] = useState<ReceivedQuest[]>([]);
  const [completed, setCompleted] = useState<CompletedQuest[]>([]);
  const [pfpUrl, setPfpUrl] = useState<string | null>(null);
  const [isUploadingPfp, setIsUploadingPfp] = useState(false);
  const [showPfpDialog, setShowPfpDialog] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [myPosts, setMyPosts] = useState<Post[]>([]);
  const [hoveredPostId, setHoveredPostId] = useState<string | null>(null);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");

  const profileState = (location.state as { profileUsername?: string } | null) ?? null;
  const profileUsername = profileState?.profileUsername ?? user?.username ?? "";
  const isOwnProfile = profileUsername === user?.username;

  const fallbackCreatedAt = new Date("2026-01-27T09:00:00");

  const questStatsById = useMemo(() => {
    const map: Record<
      string,
      {
        maxVotes: number;
        count: number;
      }
    > = {};

    for (const p of myPosts) {
      const qid = p.quest_id;
      if (!qid) continue;
      const existing = map[qid] ?? { maxVotes: 0, count: 0 };
      const votes = p.votes ?? 0;
      existing.maxVotes = Math.max(existing.maxVotes, votes);
      existing.count += 1;
      map[qid] = existing;
    }

    return map;
  }, [myPosts]);

  async function handleVote(postId: string, delta: number) {
    if (!token) return;
    try {
      await votePost(token, postId, delta);
      setMyPosts((prev) =>
        prev.map((p) => (p.id === postId ? { ...p, votes: p.votes + delta } : p)),
      );
      setSelectedPost((prev) =>
        prev && prev.id === postId ? { ...prev, votes: prev.votes + delta } : prev,
      );
    } catch (e) {
      console.error("Failed to vote on post", e);
    }
  }

  async function loadCommentsForPost(postId: string) {
    if (!token) return;
    try {
      const data = await fetchComments(token, postId);
      setComments(data);
    } catch (e) {
      console.error("Failed to load comments", e);
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
    } catch (e) {
      console.error("Failed to create comment", e);
    }
  }

  // incoming friend requests
  useEffect(() => {
    if (!token) return;
    getIncomingRequests(token).then(setRequests);
  }, [token]);

  // load profile picture (own or friend's)
  useEffect(() => {
    if (!token || !profileUsername) return;

    const load = async () => {
      try {
        if (isOwnProfile) {
          const me = await fetchMe(token);
          setPfpUrl(me?.pfp_url ?? null);
        } else {
          const other = await fetchUserByUsername(token, profileUsername);
          setPfpUrl(other?.pfp_url ?? null);
        }
      } catch {
        // ignore for now
      }
    };

    void load();
  }, [token, profileUsername, isOwnProfile]);

  // friends list
  useEffect(() => {
    if (!token) return;
    getFriends(token).then(setFriends);
  }, [token]);

  // load received quests
  useEffect(() => {
    if (!token) return;
    fetchReceivedQuests(token).then(setReceived);
  }, [token]);

  // load completed quests / badges for the profile we're viewing
  useEffect(() => {
    if (!token || !profileUsername) return;

    const loadCompleted = async () => {
      try {
        if (isOwnProfile) {
          const mine = await fetchCompletedQuests(token);
          setCompleted(mine);
        } else {
          const other = await fetchUserByUsername(token, profileUsername);
          const theirs = await fetchCompletedQuestsForUser(token, other.id);
          setCompleted(theirs);
        }
      } catch (e) {
        console.error("Failed to load completed quests for profile", e);
        setCompleted([]);
      }
    };

    void loadCompleted();
  }, [token, profileUsername, isOwnProfile]);

  // load my posts for profile grid
  useEffect(() => {
    if (!token || !profileUsername) return;
    fetchPosts(token)
      .then((all: Post[]) =>
        all.filter((p) => p.poster_username === profileUsername)
      )
      .then(setMyPosts)
      .catch(() => {
        // ignore for now
      });
  }, [token, profileUsername]);


  //load badges here NOT IMPLEMENTED TODO

  if (!user) {
    return <p>Not logged in</p>;
  }

  //rendering

  return (
    <div
      className="page-fade-in"
      style={{ padding: 24, backgroundColor: "#000000", minHeight: "100vh", position: "relative" }}
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
        {!isOwnProfile && (
          <div
            style={{
              marginBottom: 12,
              padding: "8px 12px",
              borderRadius: 999,
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              background:
                "linear-gradient(90deg, rgba(88,55,164,0.7), rgba(0,255,238,0.25))",
              boxShadow: "0 10px 30px rgba(0,0,0,0.55)",
              fontSize: "0.85rem",
              color: "rgba(255,255,255,0.95)",
            }}
          >
            <span
              style={{
                width: 18,
                height: 18,
                borderRadius: "50%",
                border: "2px solid rgba(0,0,0,0.8)",
                background: "rgba(0,0,0,0.85)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "0.7rem",
              }}
            >
              👁
            </span>
            <span>
              Viewing <strong>@{profileUsername}</strong>&apos;s profile
            </span>
          </div>
        )}
        {/* Constrain just the 2-column top section so the right column doesn't drift on wide screens */}
        <div
          className="float-bob"
          style={{ maxWidth: 920, animationDelay: "0.3s" }}
        >
          <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
            {/* LEFT: username + received quests + badges */}
            <div style={{ flex: "0 1 560px", minWidth: 320 }}>
              {/* profile header (left-aligned as a block, but handle centered under avatar) */}
              <div style={{ display: "flex", justifyContent: "flex-start" }}>
                <div
                  style={{
                    width: 280,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 18,
                    textAlign: "center",
                  }}
                >
                  {/* profile picture (clickable to upload) */}
                  <div
                    aria-label="Profile picture"
                    onClick={isOwnProfile ? () => setShowPfpDialog(true) : undefined}
                    style={{
                      width: 240,
                      height: 240,
                      borderRadius: "50%",
                      background: pfpUrl
                        ? "transparent"
                        : "rgba(255,255,255,0.08)",
                      border: "2px solid rgba(255,255,255,0.18)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 800,
                      fontSize: 34,
                      color: "rgba(255,255,255,0.9)",
                      userSelect: "none",
                      cursor: isOwnProfile ? "pointer" : "default",
                      overflow: "hidden",
                    }}
                  >
                    {pfpUrl ? (
                      <img
                        src={pfpUrl}
                        alt={`${profileUsername} profile`}
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                          display: "block",
                        }}
                      />
                    ) : (
                      (profileUsername?.[0] ?? "?").toUpperCase()
                    )}
                  </div>

                  {isUploadingPfp && (
                    <div
                      style={{
                        fontSize: "0.8rem",
                        color: "rgba(200, 200, 200, 0.9)",
                      }}
                    >
                      Updating profile picture...
                    </div>
                  )}

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    style={{ display: "none" }}
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file || !token) return;
                      setIsUploadingPfp(true);
                      try {
                        const res = await uploadProfilePicture(token, file);
                        if (res?.pfp_url) setPfpUrl(res.pfp_url);
                        setShowPfpDialog(false);
                      } catch (err) {
                        console.error("Failed to upload profile picture:", err);
                      } finally {
                        setIsUploadingPfp(false);
                        e.target.value = "";
                      }
                    }}
                  />

                  <h2 style={{ marginTop: 0, marginBottom: 0, textAlign: "center" }}>
                    @{profileUsername}
                  </h2>

                  {/* Quest badges under avatar */}
                  <div style={{ marginTop: 16 }}>
                    <h3
                      style={{
                        margin: 0,
                        marginBottom: 8,
                        fontSize: "0.95rem",
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                        color: "rgba(200,200,200,0.9)",
                      }}
                    >
                      Quest Badges
                    </h3>
                    {completed.length === 0 ? (
                      <p
                        style={{
                          margin: 0,
                          fontSize: "0.85rem",
                          color: "rgba(160,160,160,0.9)",
                        }}
                      >
                        {isOwnProfile
                          ? "You have no badges yet. Complete shared quests to earn them."
                          : `@${profileUsername} has no badges yet.`}
                      </p>
                    ) : (
                      <div
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: 20,
                          justifyContent: "center",
                          marginTop: 4,
                        }}
                      >
                        {completed.map((c) => {
                          const questId = c.quest_id ?? c.id;
                          const stats = questId ? questStatsById[questId] : undefined;
                          return (
                            <div
                              key={c.id}
                              style={{
                                position: "relative",
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                              onMouseEnter={() => setHoveredBadgeId(c.id)}
                              onMouseLeave={() => setHoveredBadgeId(null)}
                            >
                              <span
                                style={{
                                  fontSize: "1.8rem",
                                  filter: "drop-shadow(0 0 6px rgba(0,0,0,0.6))",
                                  cursor: "default",
                                }}
                              >
                                {c.icon}
                              </span>
                              {stats && (
                                <div
                                  style={{
                                    position: "absolute",
                                    top: -4,
                                    right: -20,
                                    display: "flex",
                                    alignItems: "center",
                                    gap: -4,
                                  }}
                                >
                                  {/* Left circle - max votes (yellow) */}
                                  <div
                                    style={{
                                      width: 20,
                                      height: 20,
                                      borderRadius: "50%",
                                      background: "#FFD700",
                                      border: "1px solid rgba(255,255,255,0.3)",
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      fontSize: "0.65rem",
                                      fontWeight: 700,
                                      color: "#000",
                                      boxShadow: `0 0 ${Math.min(8 + stats.maxVotes * 0.5, 20)}px rgba(255, 215, 0, ${Math.min(0.4 + stats.maxVotes * 0.02, 0.8)})`,
                                      zIndex: 2,
                                    }}
                                  >
                                    {stats.maxVotes}
                                  </div>
                                  {/* Right circle - count (mint) */}
                                  <div
                                    style={{
                                      width: 20,
                                      height: 20,
                                      borderRadius: "50%",
                                      background: "var(--mint)",
                                      border: "1px solid rgba(255,255,255,0.3)",
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      fontSize: "0.65rem",
                                      fontWeight: 700,
                                      color: "#000",
                                      boxShadow: `0 0 ${Math.min(8 + stats.count * 0.5, 20)}px rgba(0, 255, 238, ${Math.min(0.4 + stats.count * 0.02, 0.8)})`,
                                      marginLeft: -6,
                                      zIndex: 1,
                                    }}
                                  >
                                    {stats.count}
                                  </div>
                                </div>
                              )}
                              {hoveredBadgeId === c.id && (
                                <div
                                  style={{
                                    position: "absolute",
                                    top: "120%",
                                    left: "50%",
                                    transform: "translateX(-50%)",
                                    whiteSpace: "nowrap",
                                    background: "rgba(0, 0, 0, 0.85)",
                                    color: "rgba(255, 255, 255, 0.95)",
                                    padding: "4px 8px",
                                    borderRadius: 6,
                                    fontSize: "0.75rem",
                                    boxShadow: "0 4px 12px rgba(0,0,0,0.6)",
                                    pointerEvents: "none",
                                    zIndex: 10,
                                  }}
                                >
                                  {c.title}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>


              {/* RIGHT: friends + add friend + incoming friend requests + received quests */}
              <div style={{ width: 340, minWidth: 320 }}>
                {/* friends */}
                <h3 style={{ marginTop: 0 }}>Friends</h3>
                {friends.length === 0 ? (
                  <p>No friends yet</p>
                ) : (
                  <div
                    style={{
                      maxHeight: 160, // roughly three rows
                      overflowY: "auto",
                      paddingRight: 4,
                    }}
                  >
                    {friends.map((f) => (
                      <div
                        key={f.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: 8,
                          padding: "4px 0",
                        }}
                      >
                        <button
                          onClick={() =>
                            navigate("/profile", {
                              state: { profileUsername: f.username },
                            })
                          }
                          style={{
                            border: "none",
                            background: "transparent",
                            color: "var(--text)",
                            cursor: "pointer",
                            padding: 0,
                            textAlign: "left",
                          }}
                        >
                          @{f.username}
                        </button>
                        <button
                          onClick={async () => {
                            if (!token) return;
                            try {
                              await removeFriend(token, f.id);
                              setFriends((prev) =>
                                prev.filter((friend) => friend.id !== f.id)
                              );
                            } catch (e) {
                              console.error("Failed to remove friend", e);
                            }
                          }}
                          style={{
                            border: "none",
                            background: "transparent",
                            color: "var(--muted)",
                            cursor: "pointer",
                            fontSize: "0.85rem",
                          }}
                          aria-label={`Remove @${f.username}`}
                          title={`Remove @${f.username}`}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* received quests */}
                <h3 style={{ marginTop: 24 }}>Received Quests</h3>
                {received.length === 0 ? (
                  <p>No active quests</p>
                ) : (
                  <div
                    style={{
                      maxHeight: 200, // roughly two cards tall
                      overflowY: "auto",
                      paddingRight: 4,
                    }}
                  >
                    {received.map((q) => (
                      <div
                        key={q.id}
                        style={{
                          background: "var(--panel)",
                          padding: 12,
                          borderRadius: 8,
                          marginBottom: 8,
                        }}
                      >
                        <span style={{ fontSize: 20 }}>{q.icon}</span> {q.title}

                        <button
                          style={{ marginLeft: 12 }}
                          onClick={async () => {
                            if (!token) return;
                            const completedQuest = await completeQuest(token, q.id);
                            // remove from received list
                            setReceived((r) => r.filter((x) => x.id !== q.id));
                            // add badge immediately if not already present
                            setCompleted((prev) => {
                              if (prev.some((c) => c.id === completedQuest.quest_id)) {
                                return prev;
                              }
                              return [
                                {
                                  id: completedQuest.quest_id,
                                  title: completedQuest.title,
                                  icon: completedQuest.icon,
                                },
                                ...prev,
                              ];
                            });
                            // Navigate to home and open the post modal with this quest pre-selected
                            navigate("/home", {
                              state: { completedQuestId: completedQuest.quest_id },
                            });
                          }}
                        >
                          Mark Completed
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* add friend */}
                <h3 style={{ marginTop: 24 }}>Add Friend</h3>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input
                    placeholder="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    style={{ flex: 1 }}
                  />
                  <button
                    onClick={() => {
                      if (!token || !username) return;
                      sendFriendRequest(token, username);
                      setUsername("");
                    }}
                  >
                    Send
                  </button>
                </div>

                {/* incoming friend reqs */}
                <h3 style={{ marginTop: 24 }}>Incoming Friend Requests</h3>
                {requests.length === 0 && <p>No requests</p>}
                {requests.map((r) => (
                  <div
                    key={r.id}
                    style={{
                      background: "var(--panel)",
                      padding: 12,
                      marginBottom: 8,
                      borderRadius: 8,
                    }}
                  >
                    <span>
                      Request from @{r.from_username || r.from_user_id}
                    </span>
                    <div style={{ marginTop: 8 }}>
                      <button
                        onClick={async () => {
                          if (!token) return;
                          await respondFriendRequest(token, r.id, true);
                          setRequests((rs) => rs.filter((x) => x.id !== r.id));
                          getFriends(token).then(setFriends);
                        }}
                      >
                        Accept
                      </button>
                      <button
                        className="secondary"
                        onClick={async () => {
                          if (!token) return;
                          await respondFriendRequest(token, r.id, false);
                          setRequests((rs) => rs.filter((x) => x.id !== r.id));
                        }}
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* my posts grid */}
          <h3 style={{ marginTop: 32 }}>
            {isOwnProfile ? "Your Posts" : `@${profileUsername}'s Posts`}
          </h3>
          {myPosts.length === 0 ? (
            <div
              style={{
                width: "100%",
                minHeight: "20vh",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                textAlign: "center",
                color: "rgba(180, 180, 180, 0.9)",
                padding: "16px 12px",
              }}
            >
              Building your QuestChest...
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
                gap: 12,
                marginTop: 8,
              }}
            >
              {myPosts.map((p) => (
                <div
                  key={p.id}
                  onMouseEnter={() => setHoveredPostId(p.id)}
                  onMouseLeave={() => setHoveredPostId((prev) => (prev === p.id ? null : prev))}
                  onClick={async () => {
                    setSelectedPost(p);
                    setComments([]);
                    setNewComment("");
                    await loadCommentsForPost(p.id);
                  }}
                  style={{
                    background: "var(--panel)",
                    borderRadius: 10,
                    overflow: "hidden",
                    border: "1px solid rgba(255,255,255,0.06)",
                    position: "relative",
                    transform:
                      hoveredPostId === p.id
                        ? "translateY(-6px) scale(1.03)"
                        : "translateY(0) scale(1)",
                    boxShadow:
                      hoveredPostId === p.id
                        ? "0 16px 36px rgba(0,0,0,0.55)"
                        : "0 4px 10px rgba(0,0,0,0.3)",
                    transition: "transform 160ms ease-out, box-shadow 160ms ease-out",
                    cursor: "pointer",
                  }}
                >
                  {p.media_type === "video" ? (
                    <video
                      src={p.media_url}
                      style={{
                        width: "100%",
                        height: 160,
                        objectFit: "cover",
                        display: "block",
                      }}
                      muted
                      loop
                      autoPlay
                      playsInline
                    />
                  ) : (
                    <img
                      src={p.media_url}
                      alt={p.quest_title || "Post"}
                      style={{
                        width: "100%",
                        height: 160,
                        objectFit: "cover",
                        display: "block",
                      }}
                    />
                  )}
                  {hoveredPostId === p.id && p.quest_title && (
                    <div
                      style={{
                        position: "absolute",
                        left: 0,
                        right: 0,
                        bottom: 0,
                        padding: "6px 8px",
                        background:
                          "linear-gradient(to top, rgba(0,0,0,0.85), rgba(0,0,0,0.3))",
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        fontSize: "0.8rem",
                        color: "rgba(255,255,255,0.96)",
                      }}
                    >
                      {p.quest_icon && (
                        <span style={{ fontSize: "1rem" }}>{p.quest_icon}</span>
                      )}
                      <span
                        style={{
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {p.quest_title}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

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
              {/* Left: media + quest + votes + meta */}
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
                        onClick={() => handleVote(selectedPost.id, 1)}
                        style={{
                          background: "transparent",
                          border: "1px solid var(--mint)",
                          color: "var(--mint)",
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
                        onClick={() => handleVote(selectedPost.id, -1)}
                        style={{
                          background: "transparent",
                          border: "1px solid var(--mint)",
                          color: "var(--mint)",
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

                  {/* Meta row with date and optional delete */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      fontSize: "0.8rem",
                      color: "var(--muted)",
                      marginTop: 4,
                    }}
                  >
                    <span>
                      {(() => {
                        const date =
                          selectedPost.created_at
                            ? new Date(selectedPost.created_at)
                            : fallbackCreatedAt;
                        return date.toLocaleString(undefined, {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        });
                      })()}
                    </span>
                    {isOwnProfile && (
                      <button
                        onClick={async () => {
                          if (!token || !selectedPost) return;
                          try {
                            const { deletePost } = await import("../services/api");
                            await deletePost(token, selectedPost.id);
                            setMyPosts((prev) =>
                              prev.filter((p) => p.id !== selectedPost.id),
                            );
                            setSelectedPost(null);
                          } catch (e) {
                            console.error("Failed to delete post", e);
                          }
                        }}
                        style={{
                          background: "transparent",
                          border: "1px solid rgba(255,0,0,0.5)",
                          color: "rgba(255,120,120,0.95)",
                          padding: "4px 10px",
                          borderRadius: 999,
                          cursor: "pointer",
                          fontSize: "0.8rem",
                        }}
                      >
                        Delete Post
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Right: comments column */}
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
        )}

      {/* PFP upload dialog */}
      {showPfpDialog && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.7)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
          onClick={() => !isUploadingPfp && setShowPfpDialog(false)}
        >
          <div
            style={{
              background: "#050505",
              borderRadius: 16,
              padding: 20,
              width: "min(420px, 90vw)",
              boxShadow: "0 18px 60px rgba(0,0,0,0.8)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ marginTop: 0, marginBottom: 8 }}>Update profile picture</h3>
            <p
              style={{
                marginTop: 0,
                marginBottom: 16,
                fontSize: "0.9rem",
                color: "rgba(200,200,200,0.9)",
              }}
            >
              Choose a new image to use as your avatar.
            </p>
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 8,
                marginTop: 8,
              }}
            >
              <button
                className="secondary"
                onClick={() => !isUploadingPfp && setShowPfpDialog(false)}
                disabled={isUploadingPfp}
              >
                Cancel
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingPfp}
              >
                {isUploadingPfp ? "Uploading..." : "Choose image"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
