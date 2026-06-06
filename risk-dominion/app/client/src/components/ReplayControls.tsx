import { EVENT_TYPE_COLORS } from "../constants";
import type { EventFeedRow } from "../types";

interface Props {
  events: readonly EventFeedRow[];
  startedAt: number;
  endedAt: number;
  currentTimestamp: number;
  onSeek: (timestamp: number) => void;
  isPlaying: boolean;
  onPlayPause: () => void;
  speed: number;
  onSpeedChange: (speed: number) => void;
}

function fmt(ms: number, startedAt: number): string {
  const s = Math.max(0, Math.floor((ms - startedAt) / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

export function ReplayControls(props: Props) {
  const { events, startedAt, endedAt, currentTimestamp, onSeek, isPlaying, onPlayPause, speed, onSpeedChange } = props;
  const span = Math.max(1, endedAt - startedAt);
  const pct = (ts: number) => `${Math.max(0, Math.min(1, (ts - startedAt) / span)) * 100}%`;

  function seekFromClick(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const frac = (e.clientX - rect.left) / rect.width;
    onSeek(startedAt + frac * span);
  }

  return (
    <div className="flex h-[60px] flex-col justify-center gap-1 border-t border-[#334455] bg-bg-surface px-4">
      <div
        className="relative h-[20px] cursor-pointer rounded border border-[#334455] bg-bg-root"
        onClick={seekFromClick}
      >
        {events.map((ev) => (
          <span
            key={String(ev.id)}
            title={ev.eventText}
            className="absolute top-[6px] h-[8px] w-[8px] -translate-x-1/2 rounded-full"
            style={{ left: pct(Number(ev.eventAt)), backgroundColor: EVENT_TYPE_COLORS[ev.eventType] ?? "#FFD700" }}
          />
        ))}
        <span
          className="absolute top-0 h-full w-[2px] -translate-x-1/2 bg-white"
          style={{ left: pct(currentTimestamp) }}
        />
      </div>

      <div className="flex items-center gap-3 font-ui text-[12px] text-text-primary">
        <button onClick={() => onSeek(startedAt)} aria-label="Start">⏮</button>
        <button onClick={onPlayPause} aria-label="Play/Pause">{isPlaying ? "⏸" : "▶"}</button>
        <button onClick={() => onSeek(endedAt)} aria-label="End">⏭</button>
        <span className="font-data">{fmt(currentTimestamp, startedAt)} / {fmt(endedAt, startedAt)}</span>
        <div className="ml-auto flex gap-1">
          {[1, 2, 4].map((s) => (
            <button
              key={s}
              onClick={() => onSpeedChange(s)}
              className="font-data text-[11px]"
              style={{ color: speed === s ? "#FFD700" : "#8899AA" }}
            >
              {s}x
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
