import { useState } from "react";
import type { Sidequest } from "../types/sidequest";
import VoteButtons from "./VoteButtons";

interface Props {
  quest: Sidequest;
  myVote?: -1 | 0 | 1;
  onVote: (id: string, direction: 1 | -1) => void;
  onShare: (id: string) => void;
  index?: number;
  difficulty?: number; // 1-5 (number of segments filled)
  difficultyLabel?: string;
}

export default function SidequestCard({
  quest,
  myVote = 0,
  onVote,
  onShare,
  index = 0,
  difficulty,
  difficultyLabel,
}: Props) {
  const animationDelay = `${(index % 8) * 0.5}s`;
  const [isHovered, setIsHovered] = useState(false);
  
  return (
    <div
      className="float-bob"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        display: "flex",
        alignItems: "center",
        padding: 16,
        background: "var(--panel)",
        borderRadius: 12,
        marginBottom: 12,
        animationDelay: animationDelay,
        transform: isHovered ? "translateY(-4px) scale(1.02)" : "translateY(0) scale(1)",
        boxShadow: isHovered 
          ? "0 8px 24px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.1)" 
          : "0 2px 8px rgba(0,0,0,0.2)",
        transition: "transform 0.2s ease-out, box-shadow 0.2s ease-out",
        cursor: "pointer",
      }}
    >
      <div style={{ fontSize: 28, marginRight: 16 }}>{quest.icon}</div>

      <div style={{ flex: 1 }}>
        <div style={{ marginBottom: 4 }}>
          <strong>{quest.title}</strong>
        </div>
        {difficulty !== undefined && difficultyLabel && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
            <div style={{ display: "flex", gap: 2 }}>
              {[1, 2, 3, 4, 5].map((level) => (
                <div
                  key={level}
                  style={{
                    width: 20,
                    height: 6,
                    borderRadius: 3,
                    background:
                      level <= difficulty ? "var(--mint)" : "rgba(255,255,255,0.15)",
                    border:
                      level <= difficulty
                        ? "1px solid rgba(0,0,0,0.1)"
                        : "1px solid rgba(255,255,255,0.2)",
                  }}
                />
              ))}
            </div>
            <span
              style={{
                fontSize: "0.7rem",
                fontWeight: 600,
                color: "var(--muted)",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              {difficultyLabel}
            </span>
          </div>
        )}
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
        Challenge
      </button>
    </div>
  );
}
