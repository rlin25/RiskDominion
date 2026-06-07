import { useDraggable } from "@dnd-kit/core";
import type { CardType } from "../types";
import { PLAYER_COLORS, HUMAN_PLAYER_ID } from "../constants";

// All cards use the human player's blue so the hand matches the player's
// own faction color.
const ACCENT = PLAYER_COLORS[HUMAN_PLAYER_ID] ?? "#4488FF";
const LABEL: Record<CardType, string> = {
  military: "ATTACK",
  economic: "INVEST",
  covert: "DEPLOY",
};

function CardIcon({ cardType }: { cardType: CardType }) {
  const color = ACCENT;
  if (cardType === "military") {
    return (
      <svg width="26" height="26" viewBox="0 0 20 20" style={{ color }}>
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
  if (cardType === "economic") {
    return (
      <svg width="26" height="26" viewBox="0 0 20 20" style={{ color }}>
        <circle cx="10" cy="10" r="7" fill="none" stroke="currentColor" strokeWidth={2} />
        <line x1="10" y1="2" x2="10" y2="18" stroke="currentColor" strokeWidth={2} />
      </svg>
    );
  }
  return (
    <svg width="26" height="26" viewBox="0 0 20 20" style={{ color }}>
      <circle cx="10" cy="10" r="8" fill="none" stroke="currentColor" strokeWidth={2} />
      <circle cx="10" cy="10" r="3" fill="currentColor" />
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

  const label = LABEL[cardType];

  const style: React.CSSProperties = {
    // Previous design: colored left bar accent (player blue).
    borderLeft: `3px solid ${ACCENT}`,
    opacity: disabled ? 0.35 : isDragging ? 0.9 : 1,
    transform: transform
      ? `translate3d(${transform.x}px, ${transform.y}px, 0) rotate(${isDragging ? 2 : 0}deg)`
      : undefined,
    cursor: disabled ? "not-allowed" : isDragging ? "grabbing" : "grab",
    zIndex: isDragging ? 100 : 1,
  };

  // Restrained by default; blue-purple glow on hover; strong highlight when
  // the card is picked up (the active/selected state). Box-shadow lives in
  // classes so the :hover variant isn't overridden by inline styles.
  const stateClass = disabled
    ? ""
    : isDragging
      ? "shadow-[0_0_22px_5px_rgba(138,99,255,0.9)] ring-2 ring-[#8A63FF]"
      : "shadow-[0_2px_8px_rgba(0,0,0,0.3)] hover:shadow-[0_0_16px_3px_rgba(138,99,255,0.65)]";

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex h-[55px] w-[90px] flex-col items-center justify-center gap-0.5 rounded-lg bg-bg-surface transition-shadow duration-150 ${stateClass}`}
      {...(disabled ? {} : listeners)}
      {...attributes}
    >
      <CardIcon cardType={cardType} />
      <span className="font-ui text-[13px] text-text-primary">{label}</span>
    </div>
  );
}
