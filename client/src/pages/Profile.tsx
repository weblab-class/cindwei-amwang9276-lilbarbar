import { useEffect, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import {
  sendFriendRequest,
  getIncomingRequests,
  respondFriendRequest,
  getFriends,
  fetchReceivedQuests,
  completeQuest,
  fetchCompletedQuests,
  fetchMe,
  uploadProfilePicture,
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
  const [pfpUrl, setPfpUrl] = useState<string | null>(null);
  const [isUploadingPfp, setIsUploadingPfp] = useState(false);
  const [showPfpDialog, setShowPfpDialog] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // incoming friend requests
  useEffect(() => {
    if (!token) return;
    getIncomingRequests(token).then(setRequests);
  }, [token]);

  // load own profile (pfp)
    useEffect(() => {
    if (!token) return;
    fetchMe(token)
      .then((me) => {
        if (me?.pfp_url) setPfpUrl(me.pfp_url);
      })
      .catch(() => {
        // ignore for now
      });
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
                  {/* profile picture (clickable to upload) */}
                  <div
                    aria-label="Profile picture"
                    onClick={() => setShowPfpDialog(true)}
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
                      cursor: "pointer",
                      overflow: "hidden",
                    }}
                  >
                    {pfpUrl ? (
                      <img
                        src={pfpUrl}
                        alt={`${user.username} profile`}
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                          display: "block",
                        }}
                      />
                    ) : (
                      (user.username?.[0] ?? "?").toUpperCase()
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
                    @{user.username}
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
                          <span
                            key={c.id}
                            title={c.title}
                            style={{
                              fontSize: "1.8rem",
                              filter: "drop-shadow(0 0 6px rgba(0,0,0,0.6))",
                              cursor: "default",
                            }}
                          >
                            {c.icon}
                          </span>
                        ))}
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
                {friends.length === 0 && <p>No friends yet</p>}
                {friends.map((f) => (
                  <div key={f.id}>@{f.username}</div>
                ))}

                {/* received quests */}
                <h3 style={{ marginTop: 24 }}>Received Quests</h3>
                {received.length === 0 && <p>No active quests</p>}
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
