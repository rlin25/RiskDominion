import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import type { StrategistLogRow } from "../types";

interface Props {
  alerts: StrategistLogRow[];
  requested: string | null;
  onDismissRequested: () => void;
}

interface ProactiveCard {
  id: string;
  text: string;
}

const DISMISS_MS = 8000;
const GOLD = "#d4a843";

const CARD_STYLE: CSSProperties = {
  maxWidth: 300,
  background: "rgba(30,33,32,0.85)",
  borderLeft: `3px solid ${GOLD}`,
  borderRadius: 4,
  padding: "6px 10px",
};

// The human's Strategist advisor (top-left). Only ONE alert is active at a time:
// a newer proactive strategist_log entry replaces any current one, and a
// user-requested advice card takes the single slot with priority. Proactive
// alerts auto-dismiss after 8s; requested advice persists until dismissed.
export function StrategistAdvice({ alerts, requested, onDismissRequested }: Props) {
  const [card, setCard] = useState<ProactiveCard | null>(null);
  const seen = useRef<Set<string>>(new Set());
  const timer = useRef<number | null>(null);
  const baselined = useRef(false);

  useEffect(() => {
    // On first render, treat the entire existing backlog as already-seen so the
    // advisor only surfaces advice generated after the player arrives (UIUX 7.2).
    if (!baselined.current) {
      baselined.current = true;
      for (const a of alerts) seen.current.add(String(a.id));
      return;
    }
    const fresh = alerts.filter((a) => !a.dismissed && !seen.current.has(String(a.id)));
    if (fresh.length === 0) return;
    for (const a of fresh) seen.current.add(String(a.id));

    // Keep only the newest fresh alert (one active at a time).
    const newest = fresh.reduce((a, b) => (Number(b.createdAt) >= Number(a.createdAt) ? b : a));
    if (timer.current !== null) window.clearTimeout(timer.current);
    setCard({ id: String(newest.id), text: newest.notification });
    timer.current = window.setTimeout(() => setCard(null), DISMISS_MS);
  }, [alerts]);

  useEffect(() => {
    return () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    };
  }, []);

  // Requested advice (user-initiated) takes the single slot with priority.
  if (requested !== null) {
    return (
      <div className="fixed z-50" style={{ top: 16, left: 16 }}>
        <div className="animate-notify-in flex items-start gap-2" style={CARD_STYLE}>
          <span
            className="flex-1"
            style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: "#c5c9c6" }}
          >
            {requested}
          </span>
          <button
            type="button"
            onClick={onDismissRequested}
            className="leading-none hover:text-text-primary"
            style={{ fontFamily: "Inter, sans-serif", fontSize: 14, color: "#7d827e" }}
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>
      </div>
    );
  }

  if (!card) return null;

  return (
    <div className="fixed z-50" style={{ top: 16, left: 16 }}>
      <div className="animate-notify-in" style={CARD_STYLE}>
        <span style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: "#c5c9c6" }}>
          {card.text}
        </span>
      </div>
    </div>
  );
}
