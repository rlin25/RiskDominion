import { useEffect, useState } from "react";
import type { StrategistLogRow } from "../types";

const PRIORITY_COLOR: Record<string, string> = {
  critical: "#FF4444",
  warning: "#FF8844",
  info: "#8899AA",
};

// How long a new alert stays in the floating view before being tucked away into
// the Alerts history.
const ALERT_VISIBLE_MS = 20000;

interface Props {
  alerts: readonly StrategistLogRow[];
  onDismiss: (id: bigint) => void;
  onAlertClick: (territoryId: number) => void;
}

// The human's Strategist advisor notifications. Each alert shows for ~20s, then
// moves into the "Alerts" history (toggled by a button) where all messages are
// kept.
export function StrategistAlerts({ alerts, onDismiss, onAlertClick }: Props) {
  const [expired, setExpired] = useState<Set<string>>(new Set());
  const [showHistory, setShowHistory] = useState(false);

  // Auto-expire each alert from the floating view 20s after it was created.
  useEffect(() => {
    const timers: number[] = [];
    for (const a of alerts) {
      const id = String(a.id);
      if (a.dismissed || expired.has(id)) continue;
      const remaining = ALERT_VISIBLE_MS - (Date.now() - Number(a.createdAt));
      if (remaining <= 0) {
        setExpired((s) => new Set(s).add(id));
      } else {
        timers.push(window.setTimeout(() => setExpired((s) => new Set(s).add(id)), remaining));
      }
    }
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [alerts, expired]);

  const floating = [...alerts]
    .filter((a) => !a.dismissed && !expired.has(String(a.id)))
    .sort((a, b) => Number(b.createdAt) - Number(a.createdAt))
    .slice(0, 3);

  const history = [...alerts].sort((a, b) => Number(b.createdAt) - Number(a.createdAt));

  const card = (a: StrategistLogRow, dismissable: boolean) => (
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
        {dismissable && (
          <button
            onClick={() => onDismiss(a.id)}
            className="font-ui text-[14px] text-text-secondary hover:text-text-primary"
            aria-label="Dismiss"
          >
            ×
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="absolute right-4 top-16 z-30 flex w-[280px] flex-col gap-1">
      <button
        onClick={() => setShowHistory((v) => !v)}
        className="self-end rounded border border-[#334455] bg-bg-surface px-2 py-1 font-ui text-[10px] text-text-secondary hover:text-text-primary"
      >
        {showHistory ? "Close Alerts" : `Alerts (${history.length})`}
      </button>

      {showHistory ? (
        <div className="flex max-h-[60vh] flex-col gap-1 overflow-y-auto rounded border border-[#334455] bg-bg-surface/95 p-1">
          <div className="px-1 font-ui text-[10px] text-text-accent">Alert history</div>
          {history.length === 0 ? (
            <span className="px-1 font-data text-[10px] text-text-secondary">No alerts yet.</span>
          ) : (
            history.map((a) => card(a, !a.dismissed))
          )}
        </div>
      ) : (
        floating.map((a) => card(a, true))
      )}
    </div>
  );
}
