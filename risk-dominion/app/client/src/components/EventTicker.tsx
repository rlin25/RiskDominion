import { EVENT_TYPE_COLORS, EVENT_FEED_MAX_DISPLAY } from "../constants";
import type { EventFeedRow } from "../types";

const EVENT_ICONS: Record<string, string> = {
  military: "⚔",
  economic: "◈",
  cultural: "✦",
  covert:   "◉",
  victory:  "★",
  system:   "▸",
};

interface Props {
  events: readonly EventFeedRow[];
  onEventClick: (territoryId: number) => void;
}

export function EventTicker({ events, onEventClick }: Props) {
  const recent = [...events]
    .sort((a, b) => Number(a.eventAt) - Number(b.eventAt))
    .slice(-EVENT_FEED_MAX_DISPLAY);

  return (
    <div
      className="flex flex-col flex-shrink-0"
      style={{ width: 200, borderRight: "1px solid #3d3525", background: "rgba(13,10,6,0.7)", overflow: "hidden" }}
    >
      {/* Header */}
      <div
        className="flex-shrink-0 px-3 py-2"
        style={{ borderBottom: "1px solid #3d3525" }}
      >
        <span style={{ fontFamily: "Rajdhani, sans-serif", fontWeight: 600, fontSize: 10, letterSpacing: "0.22em", color: "#d4a017", textTransform: "uppercase" as const }}>
          ◉ DISPATCHES
        </span>
      </div>

      {/* Events list */}
      <div className="styled-scroll flex-1 overflow-y-auto py-1">
        {recent.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <span style={{ fontFamily: "Rajdhani, sans-serif", fontWeight: 500, fontSize: 9, color: "#4a4030", letterSpacing: "0.2em" }}>
              AWAITING DISPATCHES
            </span>
          </div>
        ) : (
          recent.map((e, i) => {
            const icon = EVENT_ICONS[e.eventType] ?? "▸";
            const color = EVENT_TYPE_COLORS[e.eventType] ?? "#f0e6d0";
            return (
              <button
                key={i}
                onClick={() => e.territoryId != null && onEventClick(e.territoryId)}
                className="flex w-full items-center gap-1.5 px-3 py-1 text-left opacity-80 hover:opacity-100 transition-opacity"
              >
                <span style={{ color, fontSize: 9, flexShrink: 0 }}>{icon}</span>
                <span
                  className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap"
                  style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 11, color: "#f0e6d0" }}
                >
                  {e.eventText}
                </span>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
