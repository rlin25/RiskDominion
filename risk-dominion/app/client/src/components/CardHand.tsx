import { ActionCard } from "./ActionCard";
import type { CardType } from "../types";

interface Props {
  actionPoints: number;
  gameEnded: boolean;
}

export function CardHand({ actionPoints, gameEnded }: Props) {
  const count = gameEnded ? 0 : Math.max(0, actionPoints);
  const cycle: CardType[] = ["military", "economic", "covert"];
  const cards: CardType[] = Array.from({ length: count }, (_, i) => cycle[i % 3]);

  return (
    <div
      className="flex w-full items-end justify-center gap-0 pb-3 pt-2"
      style={{
        minHeight: 96,
        borderTop: "1px solid #3d3525",
        background: "linear-gradient(0deg, #0d0a06 0%, #1a1610 100%)",
        boxShadow: "inset 0 8px 24px rgba(0,0,0,0.4)",
      }}
    >
      {cards.length === 0 ? (
        <div className="flex flex-col items-center gap-1 pb-2">
          <span
            className="text-[11px] tracking-widest uppercase"
            style={{ fontFamily: "Rajdhani, sans-serif", fontWeight: 500, color: "#4a4030" }}
          >
            {gameEnded ? "Campaign Ended" : "Awaiting Orders"}
          </span>
          <div className="h-px w-24" style={{ background: "linear-gradient(90deg, transparent, #3d3525, transparent)" }} />
        </div>
      ) : (
        <div className="relative flex items-end" style={{ height: 120 }}>
          {cards.map((cardType, i) => {
            const total = cards.length;
            const mid = (total - 1) / 2;
            const angle = (i - mid) * 5.5;
            const yLift = Math.abs(i - mid) * 3;
            return (
              <div
                key={i}
                className="animate-float-up"
                style={{
                  transform: `rotate(${angle}deg) translateY(${yLift}px)`,
                  transformOrigin: "center bottom 120px",
                  marginLeft: i === 0 ? 0 : -10,
                  animationDelay: `${i * 0.04}s`,
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
      )}
    </div>
  );
}
