import { useDraggable } from "@dnd-kit/core";
import type { CardType } from "../types";

const MILITARY_ACCENT = "#FF6666";
const ECONOMIC_ACCENT = "#FFCC44";

function CardIcon({ cardType }: { cardType: CardType }) {
  const color = cardType === "military" ? MILITARY_ACCENT : ECONOMIC_ACCENT;
  if (cardType === "military") {
    return (
      <svg width="20" height="20" viewBox="0 0 20 20" style={{ color }}>
        <polygon
          points="10,3 17,16 3,16"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" style={{ color }}>
      <circle cx="10" cy="10" r="7" fill="none" stroke="currentColor" strokeWidth={2} />
      <line x1="10" y1="2" x2="10" y2="18" stroke="currentColor" strokeWidth={2} />
    </svg>
  );
}

interface Props {
  id: string;
  cardType: CardType;
  disabled: boolean;
}

export function ActionCard({ id, cardType, disabled }: Props) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id,
    data: { cardType },
    disabled,
  });

  const accent = cardType === "military" ? MILITARY_ACCENT : ECONOMIC_ACCENT;
  const label = cardType === "military" ? "ATTACK" : "INVEST";

  const style: React.CSSProperties = {
    borderLeft: `3px solid ${accent}`,
    boxShadow: disabled ? "none" : "0 2px 8px rgba(0,0,0,0.3)",
    opacity: disabled ? 0.35 : isDragging ? 0.85 : 1,
    transform: transform
      ? `translate3d(${transform.x}px, ${transform.y}px, 0) rotate(${isDragging ? 2 : 0}deg)`
      : undefined,
    cursor: disabled ? "not-allowed" : isDragging ? "grabbing" : "grab",
    zIndex: isDragging ? 100 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex h-[55px] w-[90px] flex-col items-center justify-center gap-0.5 rounded-lg bg-bg-surface"
      {...(disabled ? {} : listeners)}
      {...attributes}
    >
      <CardIcon cardType={cardType} />
      <span className="font-ui text-[13px] text-text-primary">{label}</span>
    </div>
  );
}
