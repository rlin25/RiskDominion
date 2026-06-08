import { useEffect, useRef, useState } from "react";
import { ActionCard } from "./ActionCard";
import type { CardType } from "../types";

export interface HandCard {
  id: number;
  type: CardType;
}

interface Props {
  hand: HandCard[];
  actionPoints: number;
  gameEnded: boolean;
}

// The card hand is the retained fan-out arc. It renders a stable list of cards
// (each with its own id) so that playing a card removes exactly that card, not
// whichever happens to be last. Layout: each card tilts about its own bottom
// center with uniform horizontal spacing and a gentle upward arc; the card under
// the cursor is brought fully to the front so every card stays grabbable.
export function CardHand({ hand, actionPoints, gameEnded }: Props) {
  const count = hand.length;

  // Gold count flash when the hand grows (an action point regenerated).
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

  // Bring the card under the cursor (or being pressed) fully to the front.
  const [hovered, setHovered] = useState<number | null>(null);
  const [pressed, setPressed] = useState<number | null>(null);
  useEffect(() => {
    const clear = () => setPressed(null);
    window.addEventListener("mouseup", clear);
    window.addEventListener("pointerup", clear);
    window.addEventListener("pointercancel", clear);
    return () => {
      window.removeEventListener("mouseup", clear);
      window.removeEventListener("pointerup", clear);
      window.removeEventListener("pointercancel", clear);
    };
  }, []);

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
            <span className="font-data text-[13px] font-medium" style={{ color: flash ? "#d4a843" : "#c5c9c6" }}>
              {actionPoints}
            </span>
            <span className="font-ui text-[9px] uppercase tracking-widest" style={{ color: "#7d827e" }}>
              Action Points
            </span>
          </div>
          <div className="pointer-events-auto relative mb-3" style={{ width: 80, height: 188 }}>
            {(() => {
              const total = hand.length;
              const mid = (total - 1) / 2;
              // Per-card tilt (about each card's own bottom center) for the fan.
              const step = Math.min(6, 48 / Math.max(1, total - 1));
              // Uniform horizontal spacing so EVERY card keeps an exposed,
              // grabbable strip even in the middle of the hand.
              const spacing = Math.min(34, 300 / Math.max(1, total - 1));
              return hand.map((card, i) => {
                const o = i - mid;
                const angle = o * step;
                const offsetX = o * spacing;
                // Gentle upward arc: edge cards sit a little higher.
                const liftY = -Math.pow(Math.abs(o), 1.5) * 3.5;
                const raised = hovered === card.id || pressed === card.id;
                const ty = liftY - (raised ? 16 : 0);
                return (
                  <div
                    key={card.id}
                    className="absolute animate-fade-in"
                    style={{
                      left: "50%",
                      bottom: 0,
                      zIndex: raised ? 1000 : i,
                      transform: `translateX(calc(-50% + ${offsetX}px)) translateY(${ty}px)`,
                      transition: "transform 0.15s ease",
                      animationFillMode: "both",
                    }}
                    onMouseEnter={() => setHovered(card.id)}
                    onMouseLeave={() => setHovered((h) => (h === card.id ? null : h))}
                    onMouseDown={() => setPressed(card.id)}
                  >
                    <ActionCard
                      id={`card-${card.id}`}
                      cardId={card.id}
                      cardType={card.type}
                      disabled={false}
                      fanAngle={angle}
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
