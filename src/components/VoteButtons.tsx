interface Props {
  votes: number;
  onUpvote: () => void;
  onDownvote: () => void;
}

export default function VoteButtons({
  votes,
  onUpvote,
  onDownvote,
}: Props) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <button className="secondary" onClick={onUpvote}>
        ▲
      </button>
      <span>{votes}</span>
      <button className="secondary" onClick={onDownvote}>
        ▼
      </button>
    </div>
  );
}
