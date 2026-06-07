import { useDroppable } from "@dnd-kit/core";
import { getTerritoryName } from "../utils/territoryHelpers";
import type { TerritoryState } from "../types";
import { PLAYER_COLORS } from "../constants";

const NEUTRAL = "#2a2318";
const NEUTRAL_BORDER = "#3d3525";

function ownerColor(ownerId: number): string {
  return PLAYER_COLORS[ownerId] ?? NEUTRAL;
}

// Derive a single "dominant" owner for the outer glow
function dominantOwner(state: TerritoryState): number | null {
  const counts: Record<number, number> = {};
  for (const id of [state.militaryOwner, state.economicOwner, state.covertOwner, state.culturalOwner]) {
    if (id > 0) counts[id] = (counts[id] ?? 0) + 1;
  }
  let best = 0;
  let bestCount = 0;
  for (const [id, c] of Object.entries(counts)) {
    if (c > bestCount) { bestCount = c; best = Number(id); }
  }
  return best > 0 ? best : null;
}

interface Props {
  state: TerritoryState;
  isHighlighted: boolean;
  isOwned: boolean;
}

export function Territory({ state, isHighlighted, isOwned }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: state.territoryId });

  const militaryColor  = ownerColor(state.militaryOwner);
  const economicColor  = ownerColor(state.economicOwner);
  const covertColor    = state.agentCount > 0 ? ownerColor(state.covertOwner) : NEUTRAL;
  const culturalColor  = ownerColor(state.culturalOwner);

  const dominant = dominantOwner(state);
  const dominantColor = dominant ? PLAYER_COLORS[dominant] : NEUTRAL_BORDER;

  const borderColor = isHighlighted ? "#d4a017"
    : isOver              ? "#d4a017"
    : dominant            ? dominantColor
    : NEUTRAL_BORDER;
  const borderWidth = isHighlighted || isOver ? 2.5 : dominant ? 2 : 1.5;

  const glowColor = isHighlighted ? "rgba(212,160,23,0.7)"
    : isOver              ? "rgba(212,160,23,0.5)"
    : dominant            ? `${dominantColor}55`
    : "none";

  const label = getTerritoryName(state.territoryId);

  return (
    <div
      ref={setNodeRef}
      className="flex flex-col items-center select-none"
      style={{ filter: glowColor !== "none" ? `drop-shadow(0 0 10px ${glowColor})` : undefined }}
      title={`${label} — troops ${state.troopCount}, capital ${state.capital}, agents ${state.agentCount}, influence ${state.influencePct}%`}
    >
      <svg
        width="92"
        height="80"
        viewBox="0 0 92 80"
        className="transition-transform duration-150 ease-out hover:scale-[1.1] cursor-pointer"
        style={{ transformOrigin: "center 75%" }}
      >
        {/* ── Base hex fill (dark parchment) ── */}
        <polygon
          points="0,40 23,0 69,0 92,40 69,80 23,80"
          fill="#1a1610"
        />

        {/* ── Dimension quadrants: TL=Military  TR=Cultural  BR=Economic  BL=Covert ── */}
        <clipPath id={`hex-clip-${state.territoryId}`}>
          <polygon points="0,40 23,0 69,0 92,40 69,80 23,80" />
        </clipPath>
        <g clipPath={`url(#hex-clip-${state.territoryId})`}>
          {/* Military – top-left */}
          <polygon points="46,40 46,0 23,0 0,40" fill={militaryColor} fillOpacity={0.82} />
          {/* Cultural – top-right */}
          <polygon points="46,40 46,0 69,0 92,40" fill={culturalColor} fillOpacity={0.82} />
          {/* Economic – bottom-right */}
          <polygon points="46,40 92,40 69,80 46,80" fill={economicColor} fillOpacity={0.82} />
          {/* Covert – bottom-left */}
          <polygon points="46,40 0,40 23,80 46,80" fill={covertColor} fillOpacity={0.82} />
        </g>

        {/* ── Inner dividers ── */}
        <g stroke="#0d0a06" strokeWidth={1} opacity={0.6}>
          <line x1="46" y1="40" x2="46" y2="0" />
          <line x1="46" y1="40" x2="46" y2="80" />
          <line x1="46" y1="40" x2="0"  y2="40" />
          <line x1="46" y1="40" x2="92" y2="40" />
        </g>

        {/* ── Outer border ── */}
        <polygon
          points="0,40 23,0 69,0 92,40 69,80 23,80"
          fill="none"
          stroke={borderColor}
          strokeWidth={borderWidth}
        />

        {/* ── Center medallion ── */}
        <circle cx="46" cy="40" r="16" fill="#0d0a06" stroke={borderColor} strokeWidth="1.5" />
        <circle cx="46" cy="40" r="13" fill="#1a1610" />

        {/* Troop count */}
        <text
          x="46" y="44"
          textAnchor="middle"
          fontSize="13"
          fontWeight="700"
          fontFamily="JetBrains Mono, monospace"
          fill="#f0e6d0"
        >
          {state.troopCount}
        </text>

        {/* ── Highlight ring when active ── */}
        {(isHighlighted || isOver) && (
          <polygon
            points="3,40 24,3 68,3 89,40 68,77 24,77"
            fill="none"
            stroke="#d4a017"
            strokeWidth={1.5}
            strokeDasharray="6 3"
            opacity={0.7}
          />
        )}
      </svg>

      {/* Territory name label */}
      <div
        className="mt-1 px-2 py-0.5 rounded text-center leading-tight"
        style={{
          fontFamily: "Rajdhani, sans-serif",
          fontSize: "8.5px",
          fontWeight: isOwned || dominant ? 600 : 500,
          color: isHighlighted ? "#d4a017" : dominant ? dominantColor : "#9a8870",
          letterSpacing: "0.03em",
          textShadow: dominant ? `0 0 8px ${dominantColor}44` : undefined,
          maxWidth: 88,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {label}
      </div>
    </div>
  );
}
