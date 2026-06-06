import { useEffect, useMemo, useRef, useState } from "react";
import { DndContext, type DragEndEvent, type DragStartEvent } from "@dnd-kit/core";
import { useReducer } from "spacetimedb/react";
import { reducers } from "./module_bindings";
import { useSubscriptions } from "./hooks/useSubscriptions";
import {
  buildTerritoryStates,
  getValidMilitaryTargets,
} from "./utils/territoryHelpers";
import { PLAYER_COLORS, TOTAL_TERRITORIES } from "./constants";
import type { CardType } from "./types";
import { Map } from "./components/Map";
import { CardHand } from "./components/CardHand";
import { ActionBar } from "./components/ActionBar";
import { PlayerIndicator } from "./components/PlayerIndicator";
import { VictoryScreen } from "./components/VictoryScreen";

function readPlayerId(): number {
  const raw = new URLSearchParams(window.location.search).get("player");
  const id = parseInt(raw ?? "1", 10);
  return id === 2 ? 2 : 1;
}

export default function App() {
  const playerId = useMemo(readPlayerId, []);
  const { military, economic, players, gameState, isReady } = useSubscriptions();

  const startGame = useReducer(reducers.startGame);
  const militaryAttack = useReducer(reducers.militaryAttack);
  const economicInvest = useReducer(reducers.economicInvest);

  const [highlighted, setHighlighted] = useState<Set<number>>(new Set());
  const seedAttempted = useRef(false);

  // Seed the game once if no game exists yet (idempotent server-side).
  useEffect(() => {
    if (!isReady || seedAttempted.current) return;
    const hasStatus = gameState.some((row) => row.key === "status");
    if (!hasStatus) {
      seedAttempted.current = true;
      startGame().catch((e) => console.warn("start_game failed:", e));
    }
  }, [isReady, gameState, startGame]);

  const territories = useMemo(
    () => buildTerritoryStates(military, economic),
    [military, economic],
  );

  const me = players.find((p) => p.playerId === playerId);
  const actionPoints = me?.actionPoints ?? 0;
  const playerColor = PLAYER_COLORS[playerId] ?? "#4488FF";

  const status = gameState.find((r) => r.key === "status")?.value ?? "active";
  const winner = gameState.find((r) => r.key === "winner")?.value ?? "";
  const gameEnded = status === "ended";
  const winnerPlayer = players.find((p) => p.playerName === winner);
  const didWin = winnerPlayer?.playerId === playerId;

  function handleDragStart(event: DragStartEvent) {
    const cardType = event.active.data.current?.cardType as CardType | undefined;
    if (!cardType) return;
    if (cardType === "military") {
      setHighlighted(new Set(getValidMilitaryTargets(military, playerId)));
    } else {
      setHighlighted(new Set(Array.from({ length: TOTAL_TERRITORIES }, (_, i) => i + 1)));
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    const cardType = event.active.data.current?.cardType as CardType | undefined;
    const territoryId = event.over?.id as number | undefined;
    setHighlighted(new Set());
    if (!cardType || territoryId === undefined) return;

    if (cardType === "military") {
      if (!getValidMilitaryTargets(military, playerId).includes(territoryId)) return;
      militaryAttack({ territoryId, playerId }).catch((e) =>
        console.warn("military_attack:", e),
      );
    } else {
      economicInvest({ territoryId, playerId }).catch((e) =>
        console.warn("economic_invest:", e),
      );
    }
  }

  if (!isReady) {
    return (
      <div className="flex h-full items-center justify-center font-data text-text-secondary">
        Connecting to SpacetimeDB...
      </div>
    );
  }

  return (
    <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="relative flex h-full flex-col">
        <div className="flex items-center justify-between px-4 py-3">
          <PlayerIndicator
            playerName={me?.playerName ?? `Player ${playerId}`}
            playerColor={playerColor}
          />
          <ActionBar actionPoints={actionPoints} playerColor={playerColor} />
        </div>

        <Map territories={territories} highlighted={highlighted} currentPlayerId={playerId} />

        <CardHand actionPoints={actionPoints} gameEnded={gameEnded} />

        {gameEnded && (
          <VictoryScreen
            winner={winner}
            didWin={didWin}
            winnerColor={PLAYER_COLORS[winnerPlayer?.playerId ?? 1] ?? "#FFD700"}
          />
        )}
      </div>
    </DndContext>
  );
}
