import type { StrategistLogRow } from "../types";

const PRIORITY_COLOR: Record<string, string> = {
  critical: "#FF4444",
  warning: "#FF8844",
  info: "#8899AA",
};

interface Props {
  alerts: readonly StrategistLogRow[];
  onDismiss: (id: bigint) => void;
  onAlertClick: (territoryId: number) => void;
}

// The human's Strategist advisor notifications (written by the strategist_cycle
// procedure). Shows the most recent non-dismissed alerts.
export function StrategistAlerts({ alerts, onDismiss, onAlertClick }: Props) {
  const active = [...alerts]
    .filter((a) => !a.dismissed)
    .sort((a, b) => Number(b.createdAt) - Number(a.createdAt))
    .slice(0, 3);

  if (active.length === 0) return null;

  return (
    <div className="absolute right-4 top-16 z-30 flex w-[280px] flex-col gap-1">
      {active.map((a) => (
        <div
          key={String(a.id)}
          className="rounded bg-bg-surface/95 p-2 shadow-lg"
          style={{ borderLeft: `3px solid ${PRIORITY_COLOR[a.priority] ?? "#8899AA"}` }}
        >
          <div className="flex items-start justify-between gap-2">
            <button
              onClick={() => a.territoryId !== 0 && onAlertClick(a.territoryId)}
              className="text-left font-ui text-[11px] leading-snug text-text-primary"
            >
              {a.notification}
            </button>
            <button
              onClick={() => onDismiss(a.id)}
              className="font-ui text-[14px] text-text-secondary hover:text-text-primary"
              aria-label="Dismiss"
            >
              ×
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
