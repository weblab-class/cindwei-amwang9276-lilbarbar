import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import {
  sendFriendRequest,
  getIncomingRequests,
  respondFriendRequest,
  getFriends,
  loadConstellation,
  saveConstellation,
  fetchReceivedQuests,
  completeQuest,
  fetchCompletedQuests
} from "../services/api";

import { useDebounce } from "../hooks/useDebounce";
import ConstellationCanvas from "../components/ConstellationCanvas";
import type { Badge } from "../types/badge";

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

interface Line {
  from: string;
  to: string;
}

/* ===== Component ===== */

export default function Profile() {
  const { user, token } = useAuth();

  const [username, setUsername] = useState("");

  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [received, setReceived] = useState<ReceivedQuest[]>([]);

  // constellation state
  const [badges, setBadges] = useState<Badge[]>([]);
  const [lines, setLines] = useState<Line[]>([]);
  const [loaded, setLoaded] = useState(false);

  const [completed, setCompleted] = useState<CompletedQuest[]>([]);

  /* ===== Effects ===== */

  // Incoming friend requests
  useEffect(() => {
    if (!token) return;
    getIncomingRequests(token).then(setRequests);
  }, [token]);

    useEffect(() => {
    if (!token) return;
    fetchCompletedQuests(token).then(setCompleted);
  }, [token]);

  // Friends list
  useEffect(() => {
    if (!token) return;
    getFriends(token).then(setFriends);
  }, [token]);

  // Load received quests
  useEffect(() => {
    if (!token) return;
    fetchReceivedQuests(token).then(setReceived);
  }, [token]);

  // Load constellation
  useEffect(() => {
    if (!token) return;

    loadConstellation(token).then((data) => {
      setBadges(data.badges || []);
      setLines(data.lines || []);
      setLoaded(true);
    });
  }, [token]);

  // Persist constellation (debounced)
  useDebounce(
    () => {
      if (!token || !loaded) return;

      saveConstellation(token, {
        badges,
        lines,
      });
    },
    [badges, lines],
    600
  );

  if (!user) {
    return <p>Not logged in</p>;
  }

  /* ===== Render ===== */

  return (
    <div style={{ padding: 24 }}>
      <h2>@{user.username}</h2>

      {/* ===== Constellation ===== */}
      <h3>Your Constellation</h3>
      <ConstellationCanvas
        badges={badges}
        lines={lines}
        setBadges={setBadges}
        setLines={setLines}
      />

      {/* ===== Friends ===== */}
      <h3 style={{ marginTop: 24 }}>Friends</h3>
      {friends.length === 0 && <p>No friends yet</p>}
      {friends.map((f) => (
        <div key={f.id}>@{f.username}</div>
      ))}

      {/* ===== Received Quests ===== */}
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

              const completed = await completeQuest(token, q.id);

              // remove quest from received list
              setReceived((r) => r.filter((x) => x.id !== q.id));

              // add badge to constellation
              setBadges((b) => [
                ...b,
                {
                  id: completed.quest_id,
                  icon: completed.icon,
                  x: 100 + Math.random() * 200,
                  y: 100 + Math.random() * 200,
                  size: 48,
                },
              ]);
            }}
          >
            Mark Completed
          </button>
        </div>
      ))}

      {/* ===== Completed Quests ===== */}
    <h3 style={{ marginTop: 24 }}>Completed Quests</h3>

    {completed.length === 0 && <p>No completed quests yet</p>}

    {completed.map((q) => (
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
      </div>
    ))}

      {/* ===== Add Friend ===== */}
      <h3 style={{ marginTop: 24 }}>Add Friend</h3>
      <input
        placeholder="username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
      />
      <button
        onClick={() => {
          if (!token || !username) return;
          sendFriendRequest(token, username);
          setUsername("");
        }}
      >
        Send Request
      </button>

      {/* ===== Incoming Friend Requests ===== */}
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
  );
}
