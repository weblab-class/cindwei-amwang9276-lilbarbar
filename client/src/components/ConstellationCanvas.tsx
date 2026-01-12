import type { Badge } from "../types/badge";
import DraggableBadge from "./DraggableBadge";
import { useState } from "react";


interface Line {
  from: string;
  to: string;
}

interface Props {
  badges: Badge[];
  lines: Line[];
  setBadges: (b: Badge[]) => void;
  setLines: (l: Line[]) => void;
}

export default function ConstellationCanvas({
  badges,
  lines,
  setBadges,
  setLines,
}: Props) {
  const [selected, setSelected] = useState<string | null>(null);

  function moveBadge(id: string, x: number, y: number) {
    setBadges((bs) =>
      bs.map((b) => (b.id === id ? { ...b, x, y } : b))
    );
  }

  function selectBadge(id: string) {
    if (selected && selected !== id) {
      setLines((ls) => [...ls, { from: selected, to: id }]);
      setSelected(null);
    } else {
      setSelected(id);
    }
  }

  return (
    <div style={{ position: "relative", height: 500 }}>
      <svg
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
        }}
      >
        {lines.map((l, i) => {
          const a = badges.find((b) => b.id === l.from);
          const b = badges.find((b) => b.id === l.to);
          if (!a || !b) return null;
          return (
            <line
              key={i}
              x1={a.x + a.size / 2}
              y1={a.y + a.size / 2}
              x2={b.x + b.size / 2}
              y2={b.y + b.size / 2}
              stroke="white"
            />
          );
        })}
      </svg>

      {badges.map((b) => (
        <DraggableBadge
          key={b.id}
          badge={b}
          onMove={moveBadge}
          onSelect={selectBadge}
        />
      ))}
    </div>
  );
}
