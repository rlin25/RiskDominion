import { PLAYER_COLORS, EVENT_TYPE_COLORS, EVENT_FEED_MAX_DISPLAY } from "../constants";
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

  if (recent.length === 0) {
    return (
      <div
        className="flex h-[30px] items-center justify-center"
        style={{ borderTop: "1px solid #3d3525", background: "#100e09" }}
      >
        <span style={{ fontFamily: "Cinzel, serif", fontSize: 9, color: "#4a4030", letterSpacing: "0.2em" }}>
          AWAITING DISPATCHES
        </span>
      </div>
    );
  }

  const row = (keyPrefix: string) =>
    recent.map((e, i) => {
      const icon = EVENT_ICONS[e.eventType] ?? "▸";
      const color = EVENT_TYPE_COLORS[e.eventType] ?? "#f0e6d0";
      const playerColor = e.playerId != null ? PLAYER_COLORS[e.playerId] ?? "#9a8870" : "#9a8870";
      return (
        <span key={`${keyPrefix}-${i}`} className="inline-flex items-center gap-1.5">
          <span style={{ color: playerColor, fontSize: 9 }}>{icon}</span>
          <button
            onClick={() => e.territoryId != null && onEventClick(e.territoryId)}
            className="transition-opacity hover:opacity-100"
            style={{
              fontFamily: "JetBrains Mono, monospace",
              fontSize: 10,
              color,
              opacity: 0.85,
            }}
          >
            {e.eventText}
          </button>
          <span style={{ color: "#3d3525", fontSize: 10 }}>✦</span>
        </span>
      );
    });

  return (
    <div
      className="group overflow-hidden"
      style={{
        height: 30,
        borderTop: "1px solid #3d3525",
        background: "linear-gradient(0deg, #0d0a06, #100e09)",
      }}
    >
      {/* "DISPATCHES" label */}
      <div className="flex h-full items-center">
        <div
          className="flex h-full shrink-0 items-center px-3"
          style={{
            borderRight: "1px solid #3d3525",
            background: "rgba(212,160,23,0.06)",
          }}
        >
          <span style={{ fontFamily: "Cinzel, serif", fontSize: 8, color: "#d4a017", letterSpacing: "0.2em" }}>
            DISPATCHES
          </span>
        </div>

        <div className="overflow-hidden flex-1">
          <div className="flex w-max animate-marquee items-center gap-0 whitespace-nowrap py-1 pl-4 group-hover:[animation-play-state:paused]">
            {row("a")}
            {row("b")}
          </div>
        </div>
      </div>
    </div>
  );
}
