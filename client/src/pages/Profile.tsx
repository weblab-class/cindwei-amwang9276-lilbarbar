import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import {
  sendFriendRequest,
  getIncomingRequests,
  respondFriendRequest,
  getFriends,
  fetchReceivedQuests,
  completeQuest,
  fetchCompletedQuests
} from "../services/api";
import LiquidEther from "../components/LiquidEther";

interface CompletedQuest {
  id: string;
  title: string;
  icon: string;
}



interface FriendRequest {
  id: string;
  from_user_id: string;
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

  const [username, setUsername] = useState("");

  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [received, setReceived] = useState<ReceivedQuest[]>([]);
  
  const [completed, setCompleted] = useState<CompletedQuest[]>([]);

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
        {/* Constrain just the 2-column top section so the right column doesn't drift on wide screens */}
        <div style={{ maxWidth: 920 }}>
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

              {/* quest badges */}
              <h3 style={{ marginTop: 40 }}>Quest Badges</h3>
              <p style={{ color: "rgba(180, 180, 180, 0.9)" }}>You have no badges</p>
              </div>


              {/* RIGHT: friends + add friend + incoming friend requests */}
              <div style={{ width: 340, minWidth: 320 }}>
              {/* friends */}
              <h3 style={{ marginTop: 0 }}>Friends</h3>
              {friends.length === 0 && <p>No friends yet</p>}
              {friends.map((f) => (
                <div key={f.id}>@{f.username}</div>
              ))}

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
                  <span>Request from {r.from_user_id}</span>
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
              
              {/* received quests */}
              <h3 style={{ marginTop: 88 }}>Received Quests</h3>
              {received.length === 0 && <p>No active quests</p>}
              </div>
            </div>
          </div>
          
          {/* completed quests */}
          <h3 style={{ marginTop: 32 }}>Your Completed Quests</h3>
          {completed.length === 0 && (
            <div
              style={{
                width: "100%",
                minHeight: "35vh",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                textAlign: "center",
                color: "rgba(180, 180, 180, 0.9)",
                padding: "24px 12px",
              }}
            >
              No completed quests yet, add your first to your quest chest!
            </div>
          )}
          {completed.map((c) => (
            <div key={c.id}>{c.title}</div>
          ))}
        </div>
      </div>
  );
}
