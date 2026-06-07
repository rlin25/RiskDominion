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

const SUBLABEL: Record<CardType, string> = {
  military: "MILITARY",
  economic: "ECONOMIC",
  covert: "COVERT",
};

// Larger, more detailed dimension icons for a tactical-card feel.
function CardIcon({ cardType, color }: { cardType: CardType; color: string }) {
  if (cardType === "military") {
    // Stacked chevrons (an advancing spearhead).
    return (
      <svg width="34" height="34" viewBox="0 0 32 32" style={{ filter: `drop-shadow(0 0 5px ${color}aa)` }}>
        <polygon points="16,4 27,16 22,16 16,9 10,16 5,16" fill={color} />
        <polygon points="16,14 27,26 22,26 16,19 10,26 5,26" fill={color} fillOpacity="0.65" />
      </svg>
    );
  }
  if (cardType === "economic") {
    // Coin with a value bar.
    return (
      <svg width="34" height="34" viewBox="0 0 32 32" style={{ filter: `drop-shadow(0 0 5px ${color}aa)` }}>
        <circle cx="16" cy="16" r="11" fill="none" stroke={color} strokeWidth="2.5" />
        <circle cx="16" cy="16" r="11" fill={color} fillOpacity="0.12" />
        <line x1="16" y1="6" x2="16" y2="26" stroke={color} strokeWidth="2.5" />
        <line x1="11" y1="11" x2="11" y2="21" stroke={color} strokeWidth="2" strokeOpacity="0.6" />
        <line x1="21" y1="11" x2="21" y2="21" stroke={color} strokeWidth="2" strokeOpacity="0.6" />
      </svg>
    );
  }
  // Covert: concentric "watcher" rings.
  return (
    <svg width="34" height="34" viewBox="0 0 32 32" style={{ filter: `drop-shadow(0 0 5px ${color}aa)` }}>
      <circle cx="16" cy="16" r="12" fill="none" stroke={color} strokeWidth="2" strokeOpacity="0.5" />
      <circle cx="16" cy="16" r="8" fill="none" stroke={color} strokeWidth="2.5" />
      <circle cx="16" cy="16" r="3.5" fill={color} />
    </svg>
  );
}

interface Props {
  id: string;
  cardType: CardType;
  disabled: boolean;
  /** Fan rotation in degrees for the radial hand layout (0 = upright center). */
  fanAngle?: number;
  /** Distance (px) below the card to the shared fan pivot point. */
  pivotPx?: number;
}

export function ActionCard({ id, cardType, disabled, fanAngle = 0, pivotPx = 300 }: Props) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id,
    data: { cardType },
    disabled,
  });

  const accent = ACCENT[cardType];
  const lifted = isDragging;

  // Resting state: rotate around a shared pivot well below the hand so the cards
  // splay into a radial arc, like a held deck. While dragging, the card pops
  // upright and follows the cursor (no fan rotation in the drag transform, so the
  // pointer delta is not skewed by the card's angle).
  const wrapStyle: React.CSSProperties = lifted
    ? {
        opacity: 0.95,
        transform: `translate3d(${transform?.x ?? 0}px, ${transform?.y ?? 0}px, 0) rotate(2deg) scale(1.1)`,
        transformOrigin: "center bottom",
        cursor: "grabbing",
        zIndex: 100,
        filter: `drop-shadow(0 12px 20px rgba(0,0,0,0.6)) drop-shadow(0 0 14px ${accent}88)`,
      }
    : {
        opacity: disabled ? 0.4 : 1,
        transform: `rotate(${fanAngle}deg)`,
        transformOrigin: `50% ${pivotPx}px`,
        cursor: disabled ? "default" : "grab",
        transition: "transform 0.18s ease, filter 0.18s ease",
      };

  return (
    <div ref={setNodeRef} style={wrapStyle} {...(disabled ? {} : listeners)} {...attributes} className="select-none">
      <div
        className="relative flex flex-col items-center overflow-hidden"
        style={{
          width: 72,
          height: 102,
          borderRadius: 8,
          background:
            `radial-gradient(120% 70% at 50% 18%, ${accent}26 0%, transparent 55%),` +
            "linear-gradient(160deg, #262a28 0%, #15191800 40%, #121514 100%)",
          backgroundColor: "#1a1d1c",
          border: `1px solid ${accent}`,
          boxShadow: `inset 0 0 0 1px rgba(255,255,255,0.04), inset 0 0 14px ${accent}22, 0 3px 10px rgba(0,0,0,0.45)`,
        }}
      >
        {/* Corner ticks */}
        <span style={cornerTick(accent, "tl")} />
        <span style={cornerTick(accent, "tr")} />
        <span style={cornerTick(accent, "bl")} />
        <span style={cornerTick(accent, "br")} />

        {/* Header: dimension name */}
        <div
          className="w-full pt-1.5 text-center"
          style={{ fontFamily: "Inter, sans-serif", fontSize: 7.5, fontWeight: 600, letterSpacing: "0.18em", color: accent }}
        >
          {SUBLABEL[cardType]}
        </div>

        {/* Icon with a glowing disc */}
        <div className="relative flex flex-1 items-center justify-center">
          <div
            style={{
              position: "absolute",
              width: 46,
              height: 46,
              borderRadius: "50%",
              background: `radial-gradient(circle, ${accent}33 0%, transparent 70%)`,
              border: `1px solid ${accent}55`,
            }}
          />
          <CardIcon cardType={cardType} color={accent} />
        </div>

        {/* Action banner */}
        <div
          className="w-full py-1 text-center"
          style={{
            background: `linear-gradient(0deg, ${accent}3a, ${accent}10)`,
            borderTop: `1px solid ${accent}66`,
            fontFamily: "Inter, sans-serif",
            fontSize: 9,
            fontWeight: 600,
            letterSpacing: "0.14em",
            color: "#eef0ee",
            textShadow: `0 0 6px ${accent}cc`,
          }}
        >
          {LABEL[cardType]}
        </div>

        {/* Diagonal sheen */}
        <span
          className="pointer-events-none absolute inset-0"
          style={{
            background: "linear-gradient(125deg, transparent 42%, rgba(255,255,255,0.10) 50%, transparent 58%)",
          }}
        />
      </div>
    </div>
  );
}

function cornerTick(accent: string, pos: "tl" | "tr" | "bl" | "br"): React.CSSProperties {
  const base: React.CSSProperties = {
    position: "absolute",
    width: 6,
    height: 6,
    borderColor: accent,
    opacity: 0.8,
  };
  const m = 4;
  if (pos === "tl") return { ...base, top: m, left: m, borderTop: "1px solid", borderLeft: "1px solid" };
  if (pos === "tr") return { ...base, top: m, right: m, borderTop: "1px solid", borderRight: "1px solid" };
  if (pos === "bl") return { ...base, bottom: m, left: m, borderBottom: "1px solid", borderLeft: "1px solid" };
  return { ...base, bottom: m, right: m, borderBottom: "1px solid", borderRight: "1px solid" };
}
