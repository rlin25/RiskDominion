import { PLAYER_COLORS, EVENT_TYPE_COLORS, EVENT_FEED_MAX_DISPLAY } from "../constants";
import type { EventFeedRow } from "../types";

interface Props {
  events: readonly EventFeedRow[];
  onEventClick: (territoryId: number) => void;
}

// Continuously scrolling event ticker. The content is duplicated so the marquee
// animation (tailwind config) loops seamlessly.
export function EventTicker({ events, onEventClick }: Props) {
  const recent = [...events]
    .sort((a, b) => Number(a.eventAt) - Number(b.eventAt))
    .slice(-EVENT_FEED_MAX_DISPLAY);

  if (recent.length === 0) return <div className="h-[28px] border-t border-[#334455] bg-bg-ticker" />;

  const row = (keyPrefix: string) =>
    recent.map((e, i) => (
      <span key={`${keyPrefix}-${i}`} className="inline-flex items-center">
        <span
          className="mr-1 inline-block h-2 w-2 rounded-sm"
          style={{ backgroundColor: e.playerId != null ? PLAYER_COLORS[e.playerId] ?? "#8899AA" : "#8899AA" }}
        />
        <button
          onClick={() => e.territoryId != null && onEventClick(e.territoryId)}
          className="font-data text-[11px]"
          style={{ color: EVENT_TYPE_COLORS[e.eventType] ?? "#E0E0E0" }}
        >
          {e.eventText}
        </button>
        <span className="px-2 text-text-secondary">·</span>
      </span>
    ));

  return (
    <div className="group h-[28px] overflow-hidden border-t border-[#334455] bg-bg-ticker">
      <div className="flex w-max animate-marquee items-center whitespace-nowrap py-1 group-hover:[animation-play-state:paused]">
        {row("a")}
        {row("b")}
      </div>
    </div>
  );
}
