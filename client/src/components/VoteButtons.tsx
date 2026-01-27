interface Props {
  votes: number;
  myVote?: -1 | 0 | 1;
  onUpvote: () => void;
  onDownvote: () => void;
}

export default function VoteButtons({
  votes,
  myVote = 0,
  onUpvote,
  onDownvote,
}: Props) {
  const upActive = myVote === 1;
  const downActive = myVote === -1;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <button
        onClick={onUpvote}
        style={{
          background: upActive ? "var(--mint)" : "transparent",
          border: "1px solid var(--mint)",
          color: upActive ? "#000" : "var(--mint)",
          padding: "6px 10px",
          borderRadius: 999,
          cursor: "pointer",
        }}
      >
        ▲
      </button>
      <span>{votes}</span>
      <button
        onClick={onDownvote}
        style={{
          background: downActive ? "var(--mint)" : "transparent",
          border: "1px solid var(--mint)",
          color: downActive ? "#000" : "var(--mint)",
          padding: "6px 10px",
          borderRadius: 999,
          cursor: "pointer",
        }}
      >
        ▼
      </button>
    </div>
  );
}
