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

// The human's Strategist advisor (top-left). Shows proactive non-dismissed
// strategist_log entries (auto-dismiss after 8s) plus an optional persistent
// requested advice card with a close button.
export function StrategistAdvice({ alerts, requested, onDismissRequested }: Props) {
  const [cards, setCards] = useState<ProactiveCard[]>([]);
  const seen = useRef<Set<string>>(new Set());
  const timers = useRef<number[]>([]);
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

    const newCards: ProactiveCard[] = fresh.map((a) => {
      const id = String(a.id);
      seen.current.add(id);
      const timer = window.setTimeout(() => {
        setCards((prev) => prev.filter((c) => c.id !== id));
      }, DISMISS_MS);
      timers.current.push(timer);
      return { id, text: a.notification };
    });
    setCards((prev) => [...prev, ...newCards]);
  }, [alerts]);

  useEffect(() => {
    return () => {
      timers.current.forEach((t) => window.clearTimeout(t));
    };
  }, []);

  if (cards.length === 0 && requested === null) return null;

  return (
    <div className="fixed z-50 flex flex-col gap-2" style={{ top: 16, left: 16 }}>
      {cards.map((c) => (
        <div
          key={c.id}
          className="animate-notify-in"
          style={CARD_STYLE}
        >
          <span style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: "#c5c9c6" }}>
            {c.text}
          </span>
        </div>
      ))}

      {requested !== null && (
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
      )}
    </div>
  );
}
