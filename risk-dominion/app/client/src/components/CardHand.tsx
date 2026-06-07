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
            className={`pointer-events-none mb-1 font-data text-[12px] ${flash ? "animate-gold-flash" : ""}`}
            style={{ color: flash ? "#d4a843" : "#7d827e" }}
          >
            {count} AP
          </div>
          <div className="pointer-events-auto relative mb-3 flex items-end" style={{ height: 104 }}>
            {cards.map((cardType, i) => {
              const total = cards.length;
              const mid = (total - 1) / 2;
              const angle = (i - mid) * 5.5;
              const yLift = Math.pow(Math.abs(i - mid), 1.4) * 5;
              return (
                <div
                  key={i}
                  className="animate-float-up"
                  style={{
                    transform: `rotate(${angle}deg) translateY(${yLift}px)`,
                    transformOrigin: "bottom center",
                    marginLeft: i === 0 ? 0 : -14,
                    animationDelay: `${i * 0.05}s`,
                    animationFillMode: "both",
                    position: "relative",
                    zIndex: i,
                  }}
                >
                  <ActionCard id={`card-${i}`} cardType={cardType} disabled={false} />
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
