import { useEffect, useRef, useState } from "react";
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
  uploadPost,
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
import PostModal from "../components/PostModal";

interface CompletedQuest {
  id: string;
  title: string;
  icon: string;
}



interface FriendRequest {
  id: string;
  from_user_id: string;
  from_username?: string | null;
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

  const row1HeightPx = 350;
  const [showPostModal, setShowPostModal] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const [username, setUsername] = useState("");
  const [hoveredBadgeId, setHoveredBadgeId] = useState<string | null>(null);

  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [received, setReceived] = useState<ReceivedQuest[]>([]);
  const [completed, setCompleted] = useState<CompletedQuest[]>([]);

  const visibleFriends = friends.slice(0, 8);
  const hiddenFriendsCount = Math.max(0, friends.length - visibleFriends.length);
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

  //load completed quests here NOT IMPLEMENTED TODO
  useEffect(() => {
    if (!token) return;
    fetchCompletedQuests(token).then(setCompleted);
  }, [token]);

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

  async function handleUpload(file: File, questId: string) {
    if (!token) {
      throw new Error("Missing credentials");
    }
    await uploadPost(token, file, questId);
  }

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
        <div style={{ maxWidth: 980, margin: "0 auto" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
              columnGap: 24,
              rowGap: 50,
              alignItems: "start",
            }}
          >
            {/* ROW 1 (left): profile */}
            <div style={{ height: row1HeightPx, overflow: "hidden" }}>
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
                </div>
              </div>
            </div>

            <div style={{ height: row1HeightPx }}>
              <div style={{ height: "100%", overflow: "hidden" }}>
                <h3 style={{ marginTop: 0 }}>Friends</h3>
                {friends.length === 0 && <p>No friends yet</p>}
                {visibleFriends.map((f) => (
                  <div key={f.id}>@{f.username}</div>
                ))}
                {hiddenFriendsCount > 0 && (
                  <p style={{ color: "rgba(180, 180, 180, 0.9)", marginTop: 6 }}>
                    +{hiddenFriendsCount} more
                  </p>
                )}

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

                <h3 style={{ marginTop: 24 }}>Incoming Friend Requests</h3>
                {requests.length === 0 && <p>No requests</p>}

                <div
                  className="themed-scrollbar"
                  style={{
                    height: 116,
                    overflowX: "auto",
                    overflowY: "hidden",
                    display: "flex",
                    gap: 16,
                    alignItems: "flex-start",
                    WebkitOverflowScrolling: "touch",
                  }}
                >
                  {requests.map((r) => (
                    <div
                      key={r.id}
                      style={{
                        background: "var(--panel)",
                        padding: "10px 10px",
                        borderRadius: 8,
                        minWidth: 260,
                        flex: "0 0 auto",
                      }}
                    >
                      <span>Request from @{r.from_username ?? r.from_user_id}</span>
                      <div style={{ marginTop: 14, display: "flex", gap: 16 }}>
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

            {/* ROW 2 (left): quest badges */}
            <div>            
              <h3 style={{ marginTop: 0 }}>Quest Badges</h3>
                {completed.length === 0 ? (
                  <p
                    style={{
                      margin: 0,
                      fontSize: "0.85rem",
                      color: "rgba(160,160,160,0.9)",
                    }}
                  >
                    You have no badges yet. Complete shared quests to earn them.
                  </p>
                ) : (
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 8,
                      justifyContent: "center",
                      marginTop: 4,
                    }}
                  >
                    {completed.map((c) => (
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
                    ))}
                  </div>
                )}
            </div>

            {/* ROW 2 (right): received quests */}
            <div>
              <h3 style={{ marginTop: 0 }}>Received Quests</h3>
              {received.length === 0 && <p>No active quests</p>}

              <div
                className="themed-scrollbar"
                style={{
                  height: 150,
                  overflowY: "auto",
                  paddingRight: 6,
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
                        await completeQuest(token, q.id);
                        setReceived((r) => r.filter((x) => x.id !== q.id));
                      }}
                    >
                      Mark Completed
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* FULL WIDTH: completed quests */}
            <div style={{ gridColumn: "1 / -1" }}>
              <h3 style={{ marginTop: 4 }}>Your Completed Quests</h3>
              {completed.length === 0 && (
                <div
                  style={{
                    width: "100%",
                    minHeight: "35vh",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    textAlign: "center",
                    color: "rgba(180, 180, 180, 0.9)",
                    padding: "24px 12px",
                  }}
                >
                  <div>No completed quests yet, add your first to your quest chest!</div>

                  <button
                    onClick={() => setShowPostModal(true)}
                    style={{
                      marginTop: 16,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "0.5rem",
                    }}
                  >
                    <span>📸</span>
                    Post
                  </button>
                </div>
              )}
              {completed.map((c) => (
                <div key={c.id}>{c.title}</div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {showPostModal && (
        <PostModal
          onClose={() => setShowPostModal(false)}
          onSubmit={handleUpload}
        />
      )}
    </div>
  );
}
