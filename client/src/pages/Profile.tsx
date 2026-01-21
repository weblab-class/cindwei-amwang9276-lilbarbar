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

import { useDebounce } from "../hooks/useDebounce";
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

//components

export default function Profile() {
  const { user, token } = useAuth();

  const [username, setUsername] = useState("");

  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [received, setReceived] = useState<ReceivedQuest[]>([]);

  // badge state
  const [badges, setBadges] = useState<Badge[]>([]);
  const [lines, setLines] = useState<Line[]>([]);
  const [loaded, setLoaded] = useState(false);

  const [completed, setCompleted] = useState<CompletedQuest[]>([]);


  // incoming friend requests
  useEffect(() => {
    if (!token) return;
    getIncomingRequests(token).then(setRequests);
  }, [token]);

    useEffect(() => {
    if (!token) return;
    fetchCompletedQuests(token).then(setCompleted);
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

  //load badges here NOT IMPLEMENTED TODO

  if (!user) {
    return <p>Not logged in</p>;
  }

  //rendering

  return (
    <div style={{ padding: 24 }}>
      <h2>@{user.username}</h2>

      {/* completed quests */}
      <h3>Your Completed Quests</h3>
      

      {/* friends */}
      <h3 style={{ marginTop: 24 }}>Friends</h3>
      {friends.length === 0 && <p>No friends yet</p>}
      {friends.map((f) => (
        <div key={f.id}>@{f.username}</div>
      ))}

      {/* recieved quests */}
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

              // add badge to completed badges TODO NOT IMPLEMENTED
        
            }}
          >
            Mark Completed
          </button>
        </div>
      ))}

      {/* add friend */}
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
  );
}
