import type { Sidequest } from "../types/sidequest";
import VoteButtons from "./VoteButtons";

interface Props {
  quest: Sidequest;
  onVote: (id: string, delta: number) => void;
  onShare: (id: string) => void;
}

export default function SidequestCard({
  quest,
  onVote,
  onShare,
}: Props) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        padding: 16,
        background: "var(--panel)",
        borderRadius: 12,
        marginBottom: 12,
      }}
    >
      <div style={{ fontSize: 28, marginRight: 16 }}>{quest.icon}</div>

      <div style={{ flex: 1 }}>
        <strong>{quest.title}</strong>
      </div>

      <VoteButtons
        votes={quest.votes}
        onUpvote={() => onVote(quest.id, +1)}
        onDownvote={() => onVote(quest.id, -1)}
      />

      <button
        className="secondary"
        style={{ marginLeft: 12 }}
        onClick={() => onShare(quest.id)}
      >
        Share
      </button>
    </div>
  );
}
