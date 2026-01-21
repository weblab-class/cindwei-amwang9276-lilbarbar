import type { Badge } from "../types/badge";

interface Props {
  badge: Badge;
  onMove: (id: string, x: number, y: number) => void;
  onSelect: (id: string) => void;
}

export default function DraggableBadge({
  badge,
  onMove,
  onSelect,
}: Props) {
  function handleDrag(e: React.PointerEvent) {
    onMove(
      badge.id,
      badge.x + e.movementX,
      badge.y + e.movementY
    );
  }

  return (
    <div
      onPointerDown={(e) => e.currentTarget.setPointerCapture(e.pointerId)}
      onPointerMove={handleDrag}
      onClick={() => onSelect(badge.id)}
      style={{
        position: "absolute",
        left: badge.x,
        top: badge.y,
        width: badge.size,
        height: badge.size,
        fontSize: badge.size * 0.8,
        cursor: "grab",
        userSelect: "none",
      }}
    >
      {badge.icon}
    </div>
  );
}
