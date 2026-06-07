import { useEffect, useRef, useState } from "react";
import { ActionCard } from "./ActionCard";
import type { CardType } from "../types";

interface Props {
  actionPoints: number;
  gameEnded: boolean;
}

// The card hand is the retained fan-out arc: one card per available action point,
// cycling through the three playable dimensions. Restyled to AESTHETIC v2.0 but the
// fanned presentation (per-card rotation and lift) is preserved by design.
export function CardHand({ actionPoints, gameEnded }: Props) {
  const count = gameEnded ? 0 : Math.max(0, actionPoints);
  const cycle: CardType[] = ["military", "economic", "covert"];
  const cards: CardType[] = Array.from({ length: count }, (_, i) => cycle[i % 3]);

  // Gold count flash when a point regenerates (count increases).
  const prev = useRef(count);
  const [flash, setFlash] = useState(false);
  useEffect(() => {
    if (count > prev.current) {
      setFlash(true);
      const t = window.setTimeout(() => setFlash(false), 300);
      prev.current = count;
      return () => window.clearTimeout(t);
    }
    prev.current = count;
  }, [count]);

  return (
    <div
      className="pointer-events-none fixed bottom-0 left-1/2 flex -translate-x-1/2 flex-col items-center"
      style={{ zIndex: 20 }}
    >
      {count === 0 ? (
        <div className="pointer-events-auto mb-6 flex flex-col items-center gap-1 animate-empty-pulse">
          <span className="font-ui text-[11px] uppercase tracking-widest text-text-secondary">
            {gameEnded ? "Campaign Ended" : "Awaiting Orders"}
          </span>
          <div
            className="h-px w-24"
            style={{ background: "linear-gradient(90deg, transparent, #3a3f3c, transparent)" }}
          />
        </div>
      ) : (
        <>
          <div
            className={`pointer-events-none mb-1 flex items-center gap-1.5 rounded-full px-3 py-0.5 ${flash ? "animate-gold-flash" : ""}`}
            style={{
              background: "rgba(30,33,32,0.7)",
              border: `1px solid ${flash ? "#d4a843" : "#3a3f3c"}`,
              boxShadow: flash ? "0 0 10px rgba(212,168,67,0.5)" : undefined,
            }}
          >
            <span
              className="font-data text-[13px] font-medium"
              style={{ color: flash ? "#d4a843" : "#c5c9c6" }}
            >
              {count}
            </span>
            <span className="font-ui text-[9px] uppercase tracking-widest" style={{ color: "#7d827e" }}>
              Action Points
            </span>
          </div>
          <div className="pointer-events-auto relative mb-3" style={{ width: 80, height: 168 }}>
            {(() => {
              const total = cards.length;
              const mid = (total - 1) / 2;
              // Degrees between adjacent cards; tighten as the hand grows so the
              // total spread stays a comfortable arc.
              const step = Math.min(7, 56 / Math.max(1, total - 1));
              const pivot = 300; // px below the card to the shared fan pivot
              return cards.map((cardType, i) => {
                const angle = (i - mid) * step;
                return (
                  <div
                    key={i}
                    className="absolute animate-fade-in"
                    style={{
                      left: "50%",
                      bottom: 0,
                      transform: "translateX(-50%)",
                      animationDelay: `${i * 0.04}s`,
                      animationFillMode: "both",
                    }}
                  >
                    <ActionCard
                      id={`card-${i}`}
                      cardType={cardType}
                      disabled={false}
                      fanAngle={angle}
                      pivotPx={pivot}
                    />
                  </div>
                );
              });
            })()}
          </div>
        </>
      )}
    </div>
  );
}
