interface Props {
  questTitle: string;
  timeToComplete: { days: number; hours: number; minutes: number };
  difficulty: number; // 0-5 (number of segments filled)
  difficultyLabel: string;
  onClose: () => void;
}

export default function CompletionCard({
  questTitle,
  timeToComplete,
  difficulty,
  difficultyLabel,
  onClose,
}: Props) {
  const timeString = [
    timeToComplete.days > 0 && `${timeToComplete.days}d`,
    timeToComplete.hours > 0 && `${timeToComplete.hours}h`,
    timeToComplete.minutes > 0 && `${timeToComplete.minutes}m`,
  ]
    .filter(Boolean)
    .join(" ") || "0m";

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.8)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 2000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          position: "relative",
          width: "min(650px, 90vw)",
          maxHeight: "90vh",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src="/completecard.svg"
          alt="Completion card"
          style={{
            width: "100%",
            height: "auto",
            display: "block",
            transform: "scale(1.3)",
            transformOrigin: "center center",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: "min(500px, 90vw)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "60px 40px 40px",
            textAlign: "center",
          }}
        >
          {/* Quest Title */}
          <h2
            style={{
              margin: 0,
              marginBottom: 24,
              fontSize: "2.1rem",
              fontWeight: 800,
              color: "#000",
            }}
          >
            {questTitle}
          </h2>

          {/* Time to Complete */}
          <div
            style={{
              marginBottom: 32,
              fontSize: "1.1rem",
              color: "#333",
              fontWeight: 600,
            }}
          >
            Completed in {timeString}
          </div>

          {/* Difficulty Bar */}
          <div style={{ marginBottom: 8, width: "100%" }}>
            <div
              style={{
                display: "flex",
                gap: 4,
                justifyContent: "center",
                marginBottom: 8,
              }}
            >
              {[1, 2, 3, 4, 5].map((level) => (
                <div
                  key={level}
                  style={{
                    width: 40,
                    height: 12,
                    borderRadius: 6,
                    background:
                      level <= difficulty ? "var(--mint)" : "rgba(0,0,0,0.2)",
                    border:
                      level <= difficulty
                        ? "1px solid rgba(0,0,0,0.1)"
                        : "1px solid rgba(0,0,0,0.3)",
                  }}
                />
              ))}
            </div>
            <div
              style={{
                fontSize: "0.9rem",
                fontWeight: 600,
                color: "#333",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              {difficultyLabel}
            </div>
          </div>

          {/* Share text */}
          <div
            style={{
              marginTop: "auto",
              fontSize: "0.75rem",
              color: "#666",
              fontStyle: "italic",
            }}
          >
            Share with your friends!
          </div>
        </div>
      </div>
    </div>
  );
}
