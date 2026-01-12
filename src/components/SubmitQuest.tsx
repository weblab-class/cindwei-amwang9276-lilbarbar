import { useState } from "react";
import { Sidequest } from "../types/sidequest";

interface Props {
  onClose: () => void;
  onSubmit: (quest: Sidequest) => void;
}

export default function SubmitQuest({ onClose, onSubmit }: Props) {
  const [title, setTitle] = useState("");
  const [icon, setIcon] = useState("✨");

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.6)",
        display: "grid",
        placeItems: "center",
        zIndex: 100,
      }}
    >
      <div
        style={{
          background: "var(--panel)",
          padding: 24,
          borderRadius: 12,
          width: 320,
        }}
      >
        <h3>New Sidequest</h3>

        <input
          placeholder="Quest title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          style={{ width: "100%", marginBottom: 12 }}
        />

        <input
          placeholder="Icon (emoji)"
          value={icon}
          onChange={(e) => setIcon(e.target.value)}
          style={{ width: "100%", marginBottom: 12 }}
        />

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button className="secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            onClick={() => {
              if (!title) return;
              onSubmit({
                id: crypto.randomUUID(),
                title,
                icon,
                votes: 0,
              });
              onClose();
            }}
          >
            Submit
          </button>
        </div>
      </div>
    </div>
  );
}
