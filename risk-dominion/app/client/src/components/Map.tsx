// The D3 geographic world map. React owns the SVG and all element creation;
// D3 is used only for projection/path math and one imperative zoom attachment.
// Ownership flows in via the `territories` prop and React reconciliation.

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
} from "react";
import {
  geoEqualEarth,
  geoPath,
  type GeoPath,
  type GeoProjection,
  type GeoContext,
} from "d3-geo";
import { zoom, type D3ZoomEvent } from "d3-zoom";
import { select } from "d3-selection";
import { scaleLinear, scaleSqrt } from "d3-scale";
import { Territory } from "./Territory";
import { TERRITORIES_GEOJSON } from "../data/territories.geo";
import { ADJACENCY, PLAYER_COLORS, DIMENSION_COLORS } from "../constants";
import type { TerritoryState, VizSpec, EndGameState } from "../types";

// ---- shared projected-territory model --------------------------------------

export interface ProjectedTerritory {
  territoryId: number;
  name: string;
  continent: string;
  d: string; // SVG path data
  centroidPx: [number, number];
  bboxPx: [number, number, number, number]; // [minX, minY, maxX, maxY]
  areaPx: number;
  ringsPx: [number, number][][]; // projected rings; [0] is the outer ring
}

export interface MapProps {
  territories: TerritoryState[];
  currentPlayerId: number; // 1
  attackMode: boolean; // a Military card is being dragged -> show arrows
  validTargets: number[]; // valid military attack target territory ids
  isCardDragging: boolean; // any card mid-drag -> disable map pan
  endGame: EndGameState | null;
  queryViz: VizSpec | null; // render heatmap/symbols; bar/table ignored here
}

// AI / player display names for the hover callout and tooltips.
const PLAYER_NAMES: Record<number, string> = {
  0: "Neutral",
  1: "You",
  2: "Zhao",
  3: "Consortium",
  4: "Prophet",
};

function playerName(id: number): string {
  return PLAYER_NAMES[id] ?? `Player ${id}`;
}

function playerColor(id: number): string {
  return PLAYER_COLORS[id] ?? "#7d827e";
}

// A tiny path-context that records the projected rings as geoPath streams them.
// We segment a new ring on every moveTo.
function makeRingContext(): { ctx: GeoContext; rings: [number, number][][] } {
  const rings: [number, number][][] = [];
  let current: [number, number][] | null = null;
  const ctx: GeoContext = {
    moveTo(x: number, y: number) {
      current = [[x, y]];
      rings.push(current);
    },
    lineTo(x: number, y: number) {
      if (current) current.push([x, y]);
    },
    closePath() {
      /* rings are implicitly closed by the renderer */
    },
    beginPath() {
      /* no-op: rings are segmented on moveTo */
    },
    arc() {
      /* not used by polygon geometry */
    },
  };
  return { ctx, rings };
}

export function Map(props: MapProps): JSX.Element {
  const {
    territories,
    currentPlayerId,
    attackMode,
    validTargets,
    isCardDragging,
    endGame,
    queryViz,
  } = props;

  // ---- measure the container ----
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState<{ width: number; height: number }>(() => ({
    width: typeof window !== "undefined" ? window.innerWidth : 1280,
    height: typeof window !== "undefined" ? window.innerHeight : 720,
  }));

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const r = entries[0]?.contentRect;
      if (r && r.width > 0 && r.height > 0) {
        setSize({ width: r.width, height: r.height });
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const { width, height } = size;

  // ---- projection + projected territories (memoized on size) ----
  const { projected, projection, path } = useMemo(() => {
    const proj: GeoProjection = geoEqualEarth().fitExtent(
      [
        [24, 24],
        [Math.max(48, width - 24), Math.max(48, height - 24)],
      ],
      TERRITORIES_GEOJSON,
    );
    const pathGen: GeoPath = geoPath(proj);

    const list: ProjectedTerritory[] = TERRITORIES_GEOJSON.features.map((f) => {
      const { ctx, rings } = makeRingContext();
      const ringPath = geoPath(proj, ctx);
      ringPath(f); // populates `rings`
      const [[minX, minY], [maxX, maxY]] = pathGen.bounds(f);
      return {
        territoryId: f.properties.territory_id,
        name: f.properties.name,
        continent: f.properties.continent,
        d: pathGen(f) ?? "",
        centroidPx: pathGen.centroid(f) as [number, number],
        bboxPx: [minX, minY, maxX, maxY],
        areaPx: Math.abs(pathGen.area(f)),
        ringsPx: rings,
      };
    });
    return { projected: list, projection: proj, path: pathGen };
  }, [width, height]);

  // void unused vars (projection/path are kept for clarity / future use)
  void projection;
  void path;

  // Lookups by id.
  const projById = useMemo(() => {
    const m = new globalThis.Map<number, ProjectedTerritory>();
    for (const p of projected) m.set(p.territoryId, p);
    return m;
  }, [projected]);

  const stateById = useMemo(() => {
    const m = new globalThis.Map<number, TerritoryState>();
    for (const s of territories) m.set(s.territoryId, s);
    return m;
  }, [territories]);

  // ---- d3 zoom (imperative attach) ----
  const svgRef = useRef<SVGSVGElement | null>(null);
  const bgRef = useRef<SVGRectElement | null>(null);
  const [zoomTransform, setZoomTransform] = useState<string>("translate(0,0) scale(1)");

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const zoomBehavior = zoom<SVGSVGElement, unknown>()
      .scaleExtent([1, 4])
      .filter((e: any) => {
        // Allow wheel-zoom always; allow drag-pan only when no card is dragging
        // and the gesture started on the transparent background surface.
        return (
          e.type === "wheel" ||
          (!isCardDragging && e.target === bgRef.current)
        );
      })
      .on("zoom", (e: D3ZoomEvent<SVGSVGElement, unknown>) => {
        setZoomTransform(e.transform.toString());
      });
    const sel = select(svg);
    sel.call(zoomBehavior);
    return () => {
      sel.on(".zoom", null);
    };
  }, [isCardDragging]);

  // ---- hover callout state (Map owns the 150ms debounce) ----
  const [hovered, setHovered] = useState<{
    id: number;
    pos: [number, number];
  } | null>(null);
  const hoverTimer = useRef<number | null>(null);

  const handleHover = useCallback(
    (id: number | null, clientPos: [number, number] | null) => {
      if (hoverTimer.current !== null) {
        window.clearTimeout(hoverTimer.current);
        hoverTimer.current = null;
      }
      if (id === null || clientPos === null) {
        setHovered(null);
        return;
      }
      hoverTimer.current = window.setTimeout(() => {
        setHovered({ id, pos: clientPos });
      }, 150);
    },
    [],
  );

  useEffect(() => {
    return () => {
      if (hoverTimer.current !== null) window.clearTimeout(hoverTimer.current);
    };
  }, []);

  const validSet = useMemo(() => new Set(validTargets), [validTargets]);

  return (
    <div
      ref={containerRef}
      className="map-bg vignette relative flex-1 overflow-hidden"
    >
      <svg ref={svgRef} width={width} height={height}>
        <defs>
          {/* Per-territory clip paths for the pattern layers. */}
          {projected.map((p) => (
            <clipPath key={`clip-${p.territoryId}`} id={`clip-${p.territoryId}`}>
              <path d={p.d} />
            </clipPath>
          ))}
          {/* Edge-fade gradients (vignette toward the viewport edges). */}
          <linearGradient id="edge-fade-x" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#1a1d1c" stopOpacity="1" />
            <stop offset="0.08" stopColor="#1a1d1c" stopOpacity="0" />
            <stop offset="0.92" stopColor="#1a1d1c" stopOpacity="0" />
            <stop offset="1" stopColor="#1a1d1c" stopOpacity="1" />
          </linearGradient>
          <linearGradient id="edge-fade-y" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#1a1d1c" stopOpacity="1" />
            <stop offset="0.08" stopColor="#1a1d1c" stopOpacity="0" />
            <stop offset="0.92" stopColor="#1a1d1c" stopOpacity="0" />
            <stop offset="1" stopColor="#1a1d1c" stopOpacity="1" />
          </linearGradient>
        </defs>

        {/* Transparent pan surface (the only drag-pannable target). */}
        <rect
          ref={bgRef}
          x={0}
          y={0}
          width={width}
          height={height}
          fill="transparent"
        />

        {/* Zoom layer: everything that should pan/zoom together. */}
        <g transform={zoomTransform}>
          {projected.map((p) => {
            const state =
              stateById.get(p.territoryId) ?? neutralState(p.territoryId);
            const dimmed =
              endGame?.outcome === "defeat" &&
              endGame.territoryId !== p.territoryId;
            return (
              <Territory
                key={p.territoryId}
                proj={p}
                state={state}
                currentPlayerId={currentPlayerId}
                highlighted={attackMode && validSet.has(p.territoryId)}
                dimmed={dimmed}
                onHover={handleHover}
              />
            );
          })}

          {attackMode && (
            <AttackArrowLayer
              projById={projById}
              stateById={stateById}
              currentPlayerId={currentPlayerId}
              validSet={validSet}
            />
          )}

          {queryViz && (queryViz.type === "heatmap" || queryViz.type === "symbols") && (
            <QueryOverlay queryViz={queryViz} projById={projById} stateById={stateById} />
          )}

          {endGame && (
            <EndGameOverlay endGame={endGame} projected={projected} />
          )}
        </g>

        {/* Edge fades pinned outside the zoom layer. */}
        <rect
          x={0}
          y={0}
          width={width}
          height={height}
          fill="url(#edge-fade-x)"
          pointerEvents="none"
        />
        <rect
          x={0}
          y={0}
          width={width}
          height={height}
          fill="url(#edge-fade-y)"
          pointerEvents="none"
        />

        {/* Leader line from the callout to the hovered territory centroid. */}
        {hovered &&
          (() => {
            const p = projById.get(hovered.id);
            if (!p) return null;
            // centroid in screen space requires the zoom transform; we draw the
            // leader line inside the zoom layer instead, so here we just anchor
            // the HTML callout. (Line below is a subtle accent at the centroid.)
            return null;
          })()}
      </svg>

      {/* HTML hover callout (fixed near cursor). */}
      {hovered &&
        (() => {
          const state = stateById.get(hovered.id);
          const proj = projById.get(hovered.id);
          if (!state || !proj) return null;
          return (
            <HoverCallout
              state={state}
              name={proj.name}
              pos={hovered.pos}
            />
          );
        })()}
    </div>
  );
}

// ---- neutral fallback when a territory has no state row yet ----
function neutralState(territoryId: number): TerritoryState {
  return {
    territoryId,
    militaryOwner: 0,
    troopCount: 0,
    economicOwner: 0,
    capital: 0,
    covertOwner: 0,
    agentCount: 0,
    culturalOwner: 0,
    influencePct: 0,
  };
}

// ---- attack arrows ----------------------------------------------------------

interface AttackArrowLayerProps {
  projById: globalThis.Map<number, ProjectedTerritory>;
  stateById: globalThis.Map<number, TerritoryState>;
  currentPlayerId: number;
  validSet: Set<number>;
}

interface ArrowDef {
  key: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

function AttackArrowLayer({
  projById,
  stateById,
  currentPlayerId,
  validSet,
}: AttackArrowLayerProps) {
  // Build the source->target arrow list: from each territory the player owns
  // militarily, to each adjacent territory that is a valid target.
  const arrows: ArrowDef[] = useMemo(() => {
    const out: ArrowDef[] = [];
    for (const [src, state] of stateById) {
      if (state.militaryOwner !== currentPlayerId) continue;
      const sp = projById.get(src);
      if (!sp) continue;
      for (const adj of ADJACENCY[src] ?? []) {
        if (!validSet.has(adj)) continue;
        const tp = projById.get(adj);
        if (!tp) continue;
        out.push({
          key: `${src}-${adj}`,
          x1: sp.centroidPx[0],
          y1: sp.centroidPx[1],
          x2: tp.centroidPx[0],
          y2: tp.centroidPx[1],
        });
      }
    }
    return out;
  }, [projById, stateById, currentPlayerId, validSet]);

  // Animate the travelling particles with ONE shared rAF loop, writing cx/cy
  // via refs so we never re-render React at 60fps.
  const particleRefs = useRef<(SVGCircleElement | null)[]>([]);
  useEffect(() => {
    let raf = 0;
    const loop = () => {
      const now = performance.now();
      const t = (now % 800) / 800; // 0..1 phase over 800ms
      for (let i = 0; i < arrows.length; i++) {
        const c = particleRefs.current[i];
        const a = arrows[i];
        if (!c || !a) continue;
        const x = a.x1 + (a.x2 - a.x1) * t;
        const y = a.y1 + (a.y2 - a.y1) * t;
        c.setAttribute("cx", String(x));
        c.setAttribute("cy", String(y));
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [arrows]);

  const color = PLAYER_COLORS[1]; // current player accent (blue)

  return (
    <g pointerEvents="none">
      {arrows.map((a, i) => (
        <g key={a.key}>
          <line
            x1={a.x1}
            y1={a.y1}
            x2={a.x2}
            y2={a.y2}
            stroke={color}
            strokeOpacity={0.6}
            strokeWidth={2}
            strokeDasharray="6 4"
          />
          <circle
            ref={(el) => {
              particleRefs.current[i] = el;
            }}
            cx={a.x1}
            cy={a.y1}
            r={2}
            fill={color}
            opacity={0.8}
          />
        </g>
      ))}
    </g>
  );
}

// ---- query overlays (heatmap / symbols) ------------------------------------

interface QueryOverlayProps {
  queryViz: VizSpec;
  projById: globalThis.Map<number, ProjectedTerritory>;
  stateById: globalThis.Map<number, TerritoryState>;
}

function QueryOverlay({ queryViz, projById, stateById }: QueryOverlayProps) {
  const values = queryViz.territories.map((t) => t.value);
  const min = values.length ? Math.min(...values) : 0;
  const max = values.length ? Math.max(...values) : 1;

  if (queryViz.type === "heatmap") {
    const color = scaleLinear<string>()
      .domain([min, (min + max) / 2, max])
      .range(["#2d302e", "#d4a843", "#c4554d"])
      .clamp(true);
    return (
      <g pointerEvents="none" style={{ transition: "opacity 300ms" }}>
        {queryViz.territories.map((t) => {
          const p = projById.get(t.id);
          if (!p) return null;
          return (
            <path
              key={`hm-${t.id}`}
              d={p.d}
              fill={color(t.value)}
              fillOpacity={0.6}
            />
          );
        })}
      </g>
    );
  }

  // symbols
  const radius = scaleSqrt().domain([min, max]).range([8, 32]).clamp(true);
  return (
    <g pointerEvents="none" style={{ transition: "opacity 300ms" }}>
      {queryViz.territories.map((t) => {
        const p = projById.get(t.id);
        if (!p) return null;
        const st = stateById.get(t.id);
        const owner = st?.militaryOwner ?? 0;
        const fill = PLAYER_COLORS[owner] ?? PLAYER_COLORS[1];
        return (
          <circle
            key={`sym-${t.id}`}
            cx={p.centroidPx[0]}
            cy={p.centroidPx[1]}
            r={radius(t.value)}
            fill={fill}
            fillOpacity={0.5}
          />
        );
      })}
    </g>
  );
}

// ---- endgame overlays -------------------------------------------------------

interface EndGameOverlayProps {
  endGame: EndGameState;
  projected: ProjectedTerritory[];
}

function EndGameOverlay({ endGame, projected }: EndGameOverlayProps) {
  const winColor = PLAYER_COLORS[endGame.winnerId] ?? "#d4a843";
  const target = projected.find((p) => p.territoryId === endGame.territoryId);

  if (endGame.outcome === "victory") {
    return (
      <g pointerEvents="none">
        {/* Pulsing winner-color overlay across all territories. */}
        {projected.map((p) => (
          <path
            key={`vp-${p.territoryId}`}
            className="animate-territory-pulse"
            d={p.d}
            fill={winColor}
          />
        ))}
        {/* Expanding shockwave ring from the winning territory. */}
        {target && (
          <circle
            className="animate-shockwave"
            cx={target.centroidPx[0]}
            cy={target.centroidPx[1]}
            r={0}
            fill="none"
            stroke={winColor}
            strokeWidth={3}
          />
        )}
      </g>
    );
  }

  // defeat: highlight the losing territory, dim all others.
  return (
    <g pointerEvents="none">
      {projected.map((p) =>
        p.territoryId === endGame.territoryId ? null : (
          <path
            key={`dim-${p.territoryId}`}
            d={p.d}
            fill="#1a1d1c"
            fillOpacity={0.6}
            style={{ transition: "fill-opacity 500ms" }}
          />
        ),
      )}
      {target && (
        <path
          className="animate-lose-pulse"
          d={target.d}
          fill="none"
          stroke={winColor}
          strokeWidth={3}
        />
      )}
    </g>
  );
}

// ---- hover callout ----------------------------------------------------------

interface HoverCalloutProps {
  state: TerritoryState;
  name: string;
  pos: [number, number]; // clientX, clientY
}

function HoverCallout({ state, name, pos }: HoverCalloutProps) {
  const rows: {
    key: string;
    label: string;
    color: string;
    owner: number;
    value: string;
  }[] = [
    {
      key: "military",
      label: "Military",
      color: DIMENSION_COLORS.military,
      owner: state.militaryOwner,
      value: String(state.troopCount),
    },
    {
      key: "economic",
      label: "Economic",
      color: DIMENSION_COLORS.economic,
      owner: state.economicOwner,
      value: String(state.capital),
    },
    {
      key: "cultural",
      label: "Cultural",
      color: DIMENSION_COLORS.cultural,
      owner: state.culturalOwner,
      value: `${state.influencePct}%`,
    },
    {
      key: "covert",
      label: "Covert",
      color: DIMENSION_COLORS.covert,
      owner: state.covertOwner,
      value: String(state.agentCount),
    },
  ];

  return (
    <div
      className="pointer-events-none fixed z-50"
      style={{
        left: pos[0] + 14,
        top: pos[1] + 14,
        background: "rgba(30, 33, 32, 0.92)",
        border: "1px solid #3a3f3c",
        borderRadius: 4,
        padding: "8px 10px",
      }}
    >
      <div
        style={{
          fontFamily: "Inter, sans-serif",
          fontSize: 12,
          fontWeight: 600,
          color: "#c5c9c6",
          marginBottom: 4,
        }}
      >
        {name}
      </div>
      {rows.map((r) => (
        <div
          key={r.key}
          className="flex items-center gap-2"
          style={{ lineHeight: "16px" }}
        >
          <span
            style={{
              display: "inline-block",
              width: 10,
              height: 10,
              borderRadius: 2,
              background: r.color,
              flexShrink: 0,
            }}
          />
          <span
            style={{
              fontFamily: "Inter, sans-serif",
              fontSize: 11,
              color: playerColor(r.owner),
              minWidth: 70,
            }}
          >
            {playerName(r.owner)}
          </span>
          <span
            style={{
              fontFamily: "JetBrains Mono, monospace",
              fontSize: 10,
              color: "#c5c9c6",
              marginLeft: "auto",
            }}
          >
            {r.value}
          </span>
        </div>
      ))}
    </div>
  );
}
