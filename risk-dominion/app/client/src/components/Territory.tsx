// A single projected territory rendered inside the map's zoom layer. The base
// <path> is the @dnd-kit droppable hit target; the procedural dimension pattern
// layers and label sit on top with pointer-events disabled so they never steal
// the drop. Memoized so map pan/zoom and hover do not re-render every territory.

import { memo, useMemo } from "react";
import { useDroppable } from "@dnd-kit/core";
import { PLAYER_COLORS } from "../constants";
import type { TerritoryState } from "../types";
import type { ProjectedTerritory } from "./Map";
import {
  militaryContours,
  economicDots,
  culturalHatch,
  covertPoisson,
  isUnified,
  resolveSpacing,
  singleDotPositions,
  type PatternInput,
  type LineSeg,
  type Dot,
} from "../utils/patternRenderer";

const GOLD = "#d4a843";
const LANDMASS = "#2d302e";
const BORDER_SUBTLE = "#3a3f3c";
const TEXT_SECONDARY = "#7d827e";

interface TerritoryComponentProps {
  proj: ProjectedTerritory;
  state: TerritoryState;
  currentPlayerId: number;
  highlighted: boolean; // valid attack target -> gold border
  dimmed: boolean; // defeat: non-losing territories dim
  onHover: (id: number | null, clientPos: [number, number] | null) => void;
}

function TerritoryImpl({
  proj,
  state,
  highlighted,
  dimmed,
  onHover,
}: TerritoryComponentProps) {
  const { setNodeRef, isOver } = useDroppable({ id: proj.territoryId });

  const unifiedOwner = isUnified(state);

  // Density mode (full pattern vs. single-dot fallback for tiny territories).
  const { mode } = useMemo(() => resolveSpacing(proj.areaPx, 8), [proj.areaPx]);

  // Build the four procedural pattern arrays once per relevant change. These are
  // the original textures: contour lines, dot grid, cross-hatch, poisson dots.
  const patterns = useMemo(() => {
    if (unifiedOwner !== null) {
      return { military: [], economic: [], cultural: [], covert: [] } as {
        military: LineSeg[];
        economic: Dot[];
        cultural: LineSeg[];
        covert: Dot[];
      };
    }
    const input: PatternInput = {
      territoryId: proj.territoryId,
      ringsPx: proj.ringsPx,
      bboxPx: proj.bboxPx,
      areaPx: proj.areaPx,
      centroidPx: proj.centroidPx,
    };
    return {
      military: state.militaryOwner > 0 ? militaryContours(input) : [],
      economic: state.economicOwner > 0 ? economicDots(input) : [],
      cultural: state.culturalOwner > 0 ? culturalHatch(input) : [],
      covert: state.covertOwner > 0 ? covertPoisson(input) : [],
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    proj.territoryId,
    proj.areaPx,
    state.militaryOwner,
    state.economicOwner,
    state.covertOwner,
    state.culturalOwner,
    unifiedOwner,
  ]);

  // Base path styling.
  const baseFill = unifiedOwner !== null ? PLAYER_COLORS[unifiedOwner] : LANDMASS;
  let stroke = BORDER_SUBTLE;
  let strokeWidth = 1;
  if (unifiedOwner !== null) {
    stroke = GOLD;
    strokeWidth = 1;
  }
  if (highlighted) {
    stroke = GOLD;
    strokeWidth = 2.5;
  }
  if (isOver) {
    stroke = GOLD;
    strokeWidth = 3;
  }

  const clipId = `clip-${proj.territoryId}`;
  const [cx, cy] = proj.centroidPx;

  return (
    <g style={{ opacity: dimmed ? 0.4 : 1, transition: "opacity 500ms" }}>
      {/* Base droppable path (the only pointer-events target). */}
      <path
        ref={setNodeRef as unknown as (el: SVGPathElement | null) => void}
        d={proj.d}
        fill={baseFill}
        stroke={stroke}
        strokeWidth={strokeWidth}
        style={{ pointerEvents: "all", transition: "stroke 200ms, stroke-width 200ms" }}
        onMouseEnter={(e) => onHover(proj.territoryId, [e.clientX, e.clientY])}
        onMouseMove={(e) => onHover(proj.territoryId, [e.clientX, e.clientY])}
        onMouseLeave={() => onHover(null, null)}
      />

      {/* Procedural dimension pattern layers (only when not unified). */}
      {unifiedOwner === null && mode === "full" && (
        <>
          {state.militaryOwner > 0 && (
            <PatternLines clipId={clipId} segs={patterns.military} color={PLAYER_COLORS[state.militaryOwner]} />
          )}
          {state.economicOwner > 0 && (
            <PatternDots clipId={clipId} dots={patterns.economic} color={PLAYER_COLORS[state.economicOwner]} />
          )}
          {state.culturalOwner > 0 && (
            <PatternLines clipId={clipId} segs={patterns.cultural} color={PLAYER_COLORS[state.culturalOwner]} />
          )}
          {state.covertOwner > 0 && (
            <PatternDots clipId={clipId} dots={patterns.covert} color={PLAYER_COLORS[state.covertOwner]} />
          )}
        </>
      )}

      {/* Single-dot fallback for tiny territories: one r=2 dot per owned dim. */}
      {unifiedOwner === null && mode === "single-dot" && (
        <SingleDots centroid={proj.centroidPx} state={state} />
      )}

      {/* Valid attack target: pulsing gold wash so the target reads clearly. */}
      {highlighted && (
        <path
          className="animate-target-pulse"
          d={proj.d}
          fill={GOLD}
          stroke={GOLD}
          strokeWidth={isOver ? 0 : 1}
          pointerEvents="none"
        />
      )}

      {/* Territory name label. */}
      <text
        x={cx}
        y={cy}
        textAnchor="middle"
        dominantBaseline="middle"
        style={{
          fontFamily: "Inter, sans-serif",
          fontSize: 9,
          fill: TEXT_SECONDARY,
          fillOpacity: isOver ? 1 : 0.4,
          pointerEvents: "none",
          transition: "fill-opacity 200ms",
        }}
      >
        {proj.name}
      </text>
    </g>
  );
}

export const Territory = memo(TerritoryImpl);

// ---- pattern sub-layers (clipped, non-interactive) -------------------------

function PatternLines({ clipId, segs, color }: { clipId: string; segs: LineSeg[]; color: string }) {
  return (
    <g clipPath={`url(#${clipId})`} opacity={0.4} pointerEvents="none">
      {segs.map((s, i) => (
        <line
          key={i}
          x1={s.x1}
          y1={s.y1}
          x2={s.x2}
          y2={s.y2}
          stroke={color}
          strokeWidth={1}
          vectorEffect="non-scaling-stroke"
        />
      ))}
    </g>
  );
}

function PatternDots({ clipId, dots, color }: { clipId: string; dots: Dot[]; color: string }) {
  return (
    <g clipPath={`url(#${clipId})`} opacity={0.4} pointerEvents="none">
      {dots.map((d, i) => (
        <circle key={i} cx={d.cx} cy={d.cy} r={d.r} fill={color} />
      ))}
    </g>
  );
}

// Up to 4 dots in a short horizontal row at the centroid, one per owned
// dimension, coloured by that dimension's owner.
function SingleDots({ centroid, state }: { centroid: [number, number]; state: TerritoryState }) {
  const owners = [
    state.militaryOwner,
    state.economicOwner,
    state.culturalOwner,
    state.covertOwner,
  ].filter((o) => o > 0);
  const positions = singleDotPositions(centroid, owners.length);
  return (
    <g pointerEvents="none" opacity={0.85}>
      {positions.map((pos, i) => (
        <circle key={i} cx={pos[0]} cy={pos[1]} r={2} fill={PLAYER_COLORS[owners[i]] ?? "#7d827e"} />
      ))}
    </g>
  );
}
