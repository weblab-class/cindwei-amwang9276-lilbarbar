import { useEffect, useState } from "react";
import { getFriends, shareQuest } from "../services/api";
import { useAuth } from "../context/AuthContext";

interface Friend {
  id: string;
  username: string;
}

interface Props {
  questId: string;
  onClose: () => void;
}

export default function ShareQuestModal({ questId, onClose }: Props) {
  const { token } = useAuth();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    getFriends(token)
      .then(setFriends)
      .finally(() => setLoading(false));
  }, [token]);

  async function handleShare(friendId: string) {
    if (!token) return;
    await shareQuest(token, questId, friendId);
    onClose();
  }

  return (
    <div style={overlay}>
      <div style={modal}>
        <h3>Send Quest</h3>

        {loading && <p>Loading friends…</p>}

        {!loading && friends.length === 0 && (
          <p>You have no friends yet</p>
        )}

        {friends.map((f) => (
          <button
            key={f.id}
            style={friendButton}
            onClick={() => handleShare(f.id)}
          >
            @{f.username}
          </button>
        ))}

        <button className="secondary" onClick={onClose}>
          Cancel
        </button>
      </div>
    </div>
  );
}

/* simple styles */
const overlay: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.6)",
  display: "grid",
  placeItems: "center",
  zIndex: 1000,
};

const modal: React.CSSProperties = {
  background: "var(--panel)",
  padding: 24,
  borderRadius: 12,
  width: 300,
};

const friendButton: React.CSSProperties = {
  display: "block",
  width: "100%",
  marginBottom: 8,
};
