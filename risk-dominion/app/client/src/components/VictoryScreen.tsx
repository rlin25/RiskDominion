import { useEffect, useState } from "react";
import { PLAYER_COLORS, TERRITORY_NAMES } from "../constants";
import type { EndGameState } from "../types";

interface Props {
  endGame: EndGameState;
  currentPlayerId: number;
}

// Centered overlay card for the end of the game. The on-map shockwave/pulse is
// handled in Map.tsx. App triggers the victory/defeat sounds; this renders only
// the card, after a short delay. (No sound here.)
export function VictoryScreen({ endGame, currentPlayerId }: Props) {
  const isVictory = endGame.outcome === "victory";
  const delay = isVictory ? 1000 : 2000;
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const t = window.setTimeout(() => setShown(true), delay);
    return () => window.clearTimeout(t);
  }, [delay]);

  if (!shown) return null;

  const winnerColor = PLAYER_COLORS[endGame.winnerId] ?? "#d4a843";
  // From the human's perspective: did they win?
  const didWin = endGame.winnerId === currentPlayerId;
  const heading = didWin ? "Victory" : "Defeat";

  return (
    <div className="fixed inset-0 z-[9000] flex items-center justify-center">
      <div
        className="animate-fade-in flex flex-col items-center"
        style={{
          width: 300,
          padding: 24,
          background: "rgba(30,33,32,0.95)",
          border: `2px solid ${winnerColor}`,
          borderRadius: 8,
        }}
      >
        <h1
          className="text-center"
          style={{ fontFamily: "Inter, sans-serif", fontSize: 28, color: "#d4a843" }}
        >
          {heading}
        </h1>
        {!didWin && (
          <p
            className="text-center"
            style={{
              fontFamily: "Inter, sans-serif",
              fontSize: 16,
              color: "#7d827e",
              marginTop: 6,
            }}
          >
            {TERRITORY_NAMES[endGame.territoryId] ?? ""}
          </p>
        )}
      </div>
    </div>
  );
}
