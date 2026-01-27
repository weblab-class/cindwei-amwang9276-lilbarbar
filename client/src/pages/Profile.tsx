import { useEffect, useState } from "react";
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
} from "../services/api";
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

  const [username, setUsername] = useState("");

  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [received, setReceived] = useState<ReceivedQuest[]>([]);
  
  const [completed, setCompleted] = useState<CompletedQuest[]>([]);

  const visibleFriends = friends.slice(0, 8);
  const hiddenFriendsCount = Math.max(0, friends.length - visibleFriends.length);

  // incoming friend requests
  useEffect(() => {
    if (!token) return;
    getIncomingRequests(token).then(setRequests);
  }, [token]);

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
    <div style={{ padding: 24, backgroundColor: "#000000", minHeight: "100vh", position: "relative" }}>
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
                  {/* temporary profile picture placeholder */}
                  <div
                    aria-label="Profile picture"
                    style={{
                      width: 240,
                      height: 240,
                      borderRadius: "50%",
                      background: "rgba(255,255,255,0.08)",
                      border: "2px solid rgba(255,255,255,0.18)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 800,
                      fontSize: 34,
                      color: "rgba(255,255,255,0.9)",
                      userSelect: "none",
                    }}
                  >
                    {(user.username?.[0] ?? "?").toUpperCase()}
                  </div>

                  <h2 style={{ marginTop: 0, marginBottom: 0, textAlign: "center" }}>
                    @{user.username}
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
              <p style={{ color: "rgba(180, 180, 180, 0.9)" }}>You have no badges</p>
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
