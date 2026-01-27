import type { Sidequest } from "../types/sidequest";
import VoteButtons from "./VoteButtons";

interface Props {
  quest: Sidequest;
  myVote?: -1 | 0 | 1;
  onVote: (id: string, direction: 1 | -1) => void;
  onShare: (id: string) => void;
  index?: number;
}

export default function SidequestCard({
  quest,
  myVote = 0,
  onVote,
  onShare,
  index = 0,
}: Props) {
  const animationDelay = `${(index % 8) * 0.5}s`;
  
  return (
    <div
      className="float-bob"
      style={{
        display: "flex",
        alignItems: "center",
        padding: 16,
        background: "var(--panel)",
        borderRadius: 12,
        marginBottom: 12,
        animationDelay: animationDelay,
      }}
    >
      <div style={{ fontSize: 28, marginRight: 16 }}>{quest.icon}</div>

      <div style={{ flex: 1 }}>
        <strong>{quest.title}</strong>
      </div>

      <VoteButtons
        votes={quest.votes}
        myVote={myVote}
        onUpvote={() => onVote(quest.id, 1)}
        onDownvote={() => onVote(quest.id, -1)}
      />

      <button
        className="secondary"
        style={{ marginLeft: 12, display: "flex", alignItems: "center", gap: "0.5rem" }}
        onClick={() => onShare(quest.id)}
      >
        Share
      </button>
    </div>
  );
}
