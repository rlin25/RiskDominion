import { ActionCard } from "./ActionCard";
import type { CardType } from "../types";

interface Props {
  actionPoints: number;
  gameEnded: boolean;
}

// One card per available action point, alternating Military / Economic starting
// with Military. Cards are disabled (and the hand empty) when out of points.
export function CardHand({ actionPoints, gameEnded }: Props) {
  const count = gameEnded ? 0 : Math.max(0, actionPoints);
  const cards: CardType[] = Array.from({ length: count }, (_, i) =>
    i % 2 === 0 ? "military" : "economic",
  );

  return (
    <div className="flex h-[80px] w-full items-center justify-center gap-3 border-t border-[#334455] bg-bg-surface/90">
      {cards.length === 0 ? (
        <span className="font-data text-[11px] text-text-secondary">
          {gameEnded ? "Game over" : "No action points"}
        </span>
      ) : (
        cards.map((cardType, i) => (
          <ActionCard key={i} id={`card-${i}`} cardType={cardType} disabled={false} />
        ))
      )}
    </div>
  );
}
