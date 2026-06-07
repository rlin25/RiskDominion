import { useDraggable } from "@dnd-kit/core";
import type { CardType } from "../types";

const ACCENT: Record<CardType, string> = {
  military: "#cc3322",
  economic: "#e8a020",
  covert:   "#8e44ad",
};

const LABEL: Record<CardType, string> = {
  military: "ATTACK",
  economic: "INVEST",
  covert:   "DEPLOY",
};

const SUBLABEL: Record<CardType, string> = {
  military: "Military",
  economic: "Economic",
  covert:   "Covert",
};

function CardIcon({ cardType, color }: { cardType: CardType; color: string }) {
  if (cardType === "military") {
    return (
      <svg width="36" height="36" viewBox="0 0 36 36">
        {/* Sword pointing up */}
        <line x1="18" y1="4" x2="18" y2="28" stroke={color} strokeWidth="2.5" strokeLinecap="round"/>
        <line x1="18" y1="28" x2="12" y2="34" stroke={color} strokeWidth="2" strokeLinecap="round"/>
        <line x1="18" y1="28" x2="24" y2="34" stroke={color} strokeWidth="2" strokeLinecap="round"/>
        {/* Cross-guard */}
        <line x1="11" y1="22" x2="25" y2="22" stroke={color} strokeWidth="2.5" strokeLinecap="round"/>
        {/* Blade tip diamond */}
        <polygon points="18,4 21,10 18,8 15,10" fill={color} opacity="0.9"/>
      </svg>
    );
  }
  if (cardType === "economic") {
    return (
      <svg width="36" height="36" viewBox="0 0 36 36">
        {/* Coin stack */}
        <ellipse cx="18" cy="26" rx="11" ry="4" fill={color} opacity="0.3" />
        <ellipse cx="18" cy="26" rx="11" ry="4" fill="none" stroke={color} strokeWidth="1.5"/>
        <rect x="7" y="16" width="22" height="10" fill={color} opacity="0.15"/>
        <line x1="7" y1="16" x2="7"  y2="26" stroke={color} strokeWidth="1.5"/>
        <line x1="29" y1="16" x2="29" y2="26" stroke={color} strokeWidth="1.5"/>
        <ellipse cx="18" cy="16" rx="11" ry="4" fill={color} opacity="0.35" />
        <ellipse cx="18" cy="16" rx="11" ry="4" fill="none" stroke={color} strokeWidth="1.5"/>
        <text x="18" y="19.5" textAnchor="middle" fontSize="8" fontWeight="700" fill={color} fontFamily="JetBrains Mono">$</text>
      </svg>
    );
  }
  return (
    <svg width="36" height="36" viewBox="0 0 36 36">
      {/* Eye / spy */}
      <ellipse cx="18" cy="18" rx="13" ry="7" fill="none" stroke={color} strokeWidth="1.8"/>
      <circle cx="18" cy="18" r="4.5" fill={color} opacity="0.9"/>
      <circle cx="18" cy="18" r="2" fill="#0d0b08"/>
      {/* Lashes */}
      <line x1="18" y1="10" x2="18" y2="7"  stroke={color} strokeWidth="1.2" opacity="0.5"/>
      <line x1="24" y1="12" x2="26" y2="9"  stroke={color} strokeWidth="1.2" opacity="0.5"/>
      <line x1="12" y1="12" x2="10" y2="9"  stroke={color} strokeWidth="1.2" opacity="0.5"/>
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
  const label = LABEL[cardType];
  const sub = SUBLABEL[cardType];

  const lifted = isDragging;

  const style: React.CSSProperties = {
    opacity: disabled ? 0.3 : lifted ? 0.92 : 1,
    transform: transform
      ? `translate3d(${transform.x}px, ${transform.y}px, 0) rotate(${lifted ? 4 : 0}deg) scale(${lifted ? 1.08 : 1})`
      : undefined,
    cursor: disabled ? "not-allowed" : lifted ? "grabbing" : "grab",
    zIndex: lifted ? 100 : 1,
    transition: lifted ? undefined : "transform 0.15s ease, box-shadow 0.15s ease",
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...(disabled ? {} : listeners)}
      {...attributes}
      className="relative card-shimmer"
    >
      {/* Card body */}
      <div
        className="flex flex-col items-center justify-between overflow-hidden rounded-lg"
        style={{
          width: 78,
          height: 112,
          background: `linear-gradient(160deg, #221e18 0%, #13110d 100%)`,
          border: `1.5px solid ${disabled ? "#3d3525" : accent}`,
          boxShadow: disabled ? "none"
            : lifted ? `0 14px 36px rgba(0,0,0,0.7), 0 0 20px ${accent}55`
            : `0 4px 16px rgba(0,0,0,0.5), 0 0 6px ${accent}22`,
        }}
      >
        {/* Top corner marks */}
        <div className="flex w-full justify-between px-1.5 pt-1.5">
          <span style={{ fontFamily: "Rajdhani, sans-serif", fontWeight: 500, fontSize: 9, color: accent, opacity: 0.8 }}>
            {sub[0]}
          </span>
          <span style={{ fontFamily: "Rajdhani, sans-serif", fontWeight: 500, fontSize: 9, color: accent, opacity: 0.8 }}>
            ✦
          </span>
        </div>

        {/* Center icon */}
        <div className="flex flex-1 items-center justify-center">
          <CardIcon cardType={cardType} color={disabled ? "#3d3525" : accent} />
        </div>

        {/* Bottom label */}
        <div
          className="w-full py-1.5 text-center"
          style={{
            background: `linear-gradient(0deg, ${accent}22, transparent)`,
            borderTop: `1px solid ${accent}33`,
          }}
        >
          <span
            style={{
              fontFamily: "Rajdhani, sans-serif",
              fontSize: 8.5,
              fontWeight: 700,
              letterSpacing: "0.12em",
              color: disabled ? "#3d3525" : accent,
            }}
          >
            {label}
          </span>
        </div>
      </div>

      {/* Outer glow border on hover (non-disabled) */}
      {!disabled && !lifted && (
        <div
          className="pointer-events-none absolute inset-0 rounded-lg opacity-0 hover:opacity-100 transition-opacity duration-200"
          style={{ boxShadow: `0 0 0 1px ${accent}44, 0 0 12px ${accent}22` }}
        />
      )}
    </div>
  );
}
