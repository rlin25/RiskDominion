import { useEffect, useRef, useState } from "react";
import { EVENT_TYPE_COLORS } from "../constants";
import type { EventFeedRow } from "../types";

interface Props {
  events: EventFeedRow[];
  showRecentToken: number;
}

interface Card {
  key: string;
  text: string;
  eventType: string;
}

const MAX_VISIBLE = 3;
const DISMISS_MS = 4000;

// Transient event notifications (top-center). New events appear as stacked
// cards that auto-dismiss after 4s. Incrementing showRecentToken re-shows the
// last up-to-3 events.
export function EventNotifications({ events, showRecentToken }: Props) {
  const [cards, setCards] = useState<Card[]>([]);
  const lastSeenId = useRef<bigint | null>(null);
  const lastToken = useRef(showRecentToken);
  const seq = useRef(0);
  const timers = useRef<number[]>([]);

  const pushCards = (rows: EventFeedRow[]) => {
    if (rows.length === 0) return;
    const newCards: Card[] = rows.map((e) => {
      seq.current += 1;
      const key = `n-${seq.current}`;
      const id = window.setTimeout(() => {
        setCards((prev) => prev.filter((c) => c.key !== key));
      }, DISMISS_MS);
      timers.current.push(id);
      return { key, text: e.eventText, eventType: e.eventType };
    });
    setCards((prev) => [...prev, ...newCards].slice(-MAX_VISIBLE));
  };

  // Detect new events by tracking the max id seen so far.
  useEffect(() => {
    if (events.length === 0) return;
    const sorted = [...events].sort((a, b) => Number(a.id) - Number(b.id));
    const maxId = sorted[sorted.length - 1].id;

    if (lastSeenId.current === null) {
      // First load: don't flood with the backlog; just record where we are.
      lastSeenId.current = maxId;
      return;
    }

    const fresh = sorted.filter((e) => e.id > (lastSeenId.current as bigint));
    if (fresh.length > 0) {
      lastSeenId.current = maxId;
      pushCards(fresh.slice(-MAX_VISIBLE));
    }
  }, [events]);

  // Re-show the most recent events when the token changes.
  useEffect(() => {
    if (showRecentToken === lastToken.current) return;
    lastToken.current = showRecentToken;
    const sorted = [...events].sort((a, b) => Number(a.id) - Number(b.id));
    pushCards(sorted.slice(-MAX_VISIBLE));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showRecentToken]);

  // Cleanup all pending timers on unmount.
  useEffect(() => {
    return () => {
      timers.current.forEach((t) => window.clearTimeout(t));
    };
  }, []);

  if (cards.length === 0) return null;

  return (
    <div
      className="fixed left-1/2 z-50 flex -translate-x-1/2 flex-col gap-2"
      style={{ top: 60 }}
    >
      {cards.map((c) => (
        <div
          key={c.key}
          className="animate-notify-in"
          style={{
            maxWidth: 300,
            background: "rgba(30,33,32,0.85)",
            borderLeft: `3px solid ${EVENT_TYPE_COLORS[c.eventType] ?? "#d4a843"}`,
            borderRadius: 4,
            padding: "6px 10px",
            fontFamily: "JetBrains Mono, monospace",
            fontSize: 11,
            color: "#c5c9c6",
          }}
        >
          {c.text}
        </div>
      ))}
    </div>
  );
}
