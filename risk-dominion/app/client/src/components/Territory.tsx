import { useDroppable } from "@dnd-kit/core";
import { getTerritoryName } from "../utils/territoryHelpers";
import type { TerritoryState } from "../types";
import { PLAYER_COLORS } from "../constants";

const NEUTRAL = "#2A2A3E";
const BORDER = "#334455";

function ownerColor(ownerId: number): string {
  return PLAYER_COLORS[ownerId] ?? NEUTRAL;
}

interface Props {
  state: TerritoryState;
  isHighlighted: boolean;
  isOwned: boolean;
}

// Flat-top hexagon split into four quadrants meeting at the center (40,35).
// Slice 1: top-left = Military, bottom-right = Economic; the other two neutral.
export function Territory({ state, isHighlighted, isOwned }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: state.territoryId });

  const militaryColor = ownerColor(state.militaryOwner);
  const economicColor = ownerColor(state.economicOwner);

  const borderColor = isHighlighted ? "#FFD700" : isOwned ? "#8899AA" : BORDER;
  const borderWidth = isHighlighted || isOwned ? 2 : 1.5;

  return (
    <div
      ref={setNodeRef}
      className="flex flex-col items-center transition-transform duration-150 ease-out hover:scale-[1.08]"
      style={{
        filter: isHighlighted
          ? "drop-shadow(0 0 12px rgba(255,215,0,0.6))"
          : isOver
            ? "drop-shadow(0 0 8px rgba(255,215,0,0.4))"
            : "none",
      }}
      title={`${getTerritoryName(state.territoryId)} — troops ${state.troopCount}, capital ${state.capital}`}
    >
      <svg width="80" height="70" viewBox="0 0 80 70">
        {/* Quadrant fills */}
        <polygon points="40,35 40,0 20,0 0,35" fill={militaryColor} />
        <polygon points="40,35 40,0 60,0 80,35" fill={NEUTRAL} />
        <polygon points="40,35 80,35 60,70 40,70" fill={economicColor} />
        <polygon points="40,35 0,35 20,70 40,70" fill={NEUTRAL} />
        {/* Internal dividers */}
        <g stroke={BORDER} strokeWidth={0.5}>
          <line x1="40" y1="35" x2="40" y2="0" />
          <line x1="40" y1="35" x2="40" y2="70" />
          <line x1="40" y1="35" x2="0" y2="35" />
          <line x1="40" y1="35" x2="80" y2="35" />
        </g>
        {/* Outline */}
        <polygon
          points="0,35 20,0 60,0 80,35 60,70 20,70"
          fill="none"
          stroke={borderColor}
          strokeWidth={borderWidth}
        />
      </svg>
      <span className="mt-1 font-ui text-[10px] text-text-primary">
        {getTerritoryName(state.territoryId)}
      </span>
    </div>
  );
}
