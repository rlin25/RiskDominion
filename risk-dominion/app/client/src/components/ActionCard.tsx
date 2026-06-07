import { useDraggable } from "@dnd-kit/core";
import type { CardType } from "../types";
import { DIMENSION_COLORS } from "../constants";

const ACCENT: Record<CardType, string> = {
  military: DIMENSION_COLORS.military,
  economic: DIMENSION_COLORS.economic,
  covert: DIMENSION_COLORS.covert,
};

const LABEL: Record<CardType, string> = {
  military: "ATTACK",
  economic: "INVEST",
  covert: "DEPLOY",
};

// Geometric dimension icons (INTERFACE_CONTRACT v2.0 section 2.3), stroke-only,
// rendered in the dimension's accent color.
function CardIcon({ cardType, color }: { cardType: CardType; color: string }) {
  if (cardType === "military") {
    // Upward chevron
    return (
      <svg width="24" height="24" viewBox="0 0 24 24">
        <polygon points="12,4 20,18 4,18" fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" />
      </svg>
    );
  }
  if (cardType === "economic") {
    // Circle with vertical line
    return (
      <svg width="24" height="24" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="7" fill="none" stroke={color} strokeWidth="2" />
        <line x1="12" y1="4" x2="12" y2="20" stroke={color} strokeWidth="2" />
      </svg>
    );
  }
  // Covert: concentric circles
  return (
    <svg width="24" height="24" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="8" fill="none" stroke={color} strokeWidth="2" />
      <circle cx="12" cy="12" r="3" fill={color} />
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

  const accent = ACCENT[cardType];
  const lifted = isDragging;

  const style: React.CSSProperties = {
    opacity: disabled ? 0.4 : lifted ? 0.9 : 1,
    transform: transform
      ? `translate3d(${transform.x}px, ${transform.y}px, 0) rotate(${lifted ? 2 : 0}deg) scale(${lifted ? 1.05 : 1})`
      : undefined,
    cursor: disabled ? "default" : lifted ? "grabbing" : "grab",
    zIndex: lifted ? 100 : 1,
    transition: lifted ? undefined : "transform 0.15s ease, box-shadow 0.15s ease",
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...(disabled ? {} : listeners)}
      {...attributes}
      className="relative"
    >
      <div
        className="relative flex flex-col items-center justify-between rounded-md bg-bg-surface"
        style={{
          width: 60,
          height: 84,
          border: "1px solid #3a3f3c",
          borderLeft: `3px solid ${accent}`,
          boxShadow: lifted ? "0 6px 16px rgba(0,0,0,0.5)" : "0 2px 8px rgba(0,0,0,0.3)",
        }}
      >
        {/* Count slot at top-right is rendered by the hand; the card centers its icon */}
        <div className="flex flex-1 items-center justify-center pt-2">
          <CardIcon cardType={cardType} color={accent} />
        </div>
        <div className="w-full pb-1.5 text-center">
          <span
            className="font-ui"
            style={{ fontSize: 8, fontWeight: 600, letterSpacing: "0.1em", color: accent }}
          >
            {LABEL[cardType]}
          </span>
        </div>
      </div>
    </div>
  );
}
