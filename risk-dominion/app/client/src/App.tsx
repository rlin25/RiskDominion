import { useEffect, useMemo, useRef, useState } from "react";
import { DndContext, type DragEndEvent, type DragStartEvent } from "@dnd-kit/core";
import { useReducer } from "spacetimedb/react";
import { reducers } from "./module_bindings";
import { useSubscriptions } from "./hooks/useSubscriptions";
import { buildTerritoryStates, getValidMilitaryTargets } from "./utils/territoryHelpers";
import { PLAYER_COLORS, TOTAL_TERRITORIES, HUMAN_PLAYER_ID } from "./constants";
import type { CardType } from "./types";
import { Map } from "./components/Map";
import { CardHand } from "./components/CardHand";
import { ActionBar } from "./components/ActionBar";
import { IntelPanel } from "./components/IntelPanel";
import { QueryBar } from "./components/QueryBar";
import { ResultsPanel } from "./components/ResultsPanel";
import { EventTicker } from "./components/EventTicker";
import { VictoryScreen } from "./components/VictoryScreen";
import type { QueryResult } from "./types";

const PLAYER_ID = HUMAN_PLAYER_ID;

export default function App() {
  const { military, economic, covert, cultural, players, gameState, eventFeed, isReady } =
    useSubscriptions();

  const startGame = useReducer(reducers.startGame);
  const militaryAttack = useReducer(reducers.militaryAttack);
  const economicInvest = useReducer(reducers.economicInvest);
  const deployAgent = useReducer(reducers.deployAgent);

  const [highlighted, setHighlighted] = useState<Set<number>>(new Set());
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null);
  const [queryHighlights, setQueryHighlights] = useState<number[]>([]);
  const [tickerHighlight, setTickerHighlight] = useState<number | null>(null);
  const seedAttempted = useRef(false);

  function handleEventClick(territoryId: number) {
    setTickerHighlight(territoryId);
    window.setTimeout(() => setTickerHighlight(null), 3000);
  }

  useEffect(() => {
    if (!isReady || seedAttempted.current) return;
    const hasStatus = gameState.some((row) => row.key === "status");
    if (!hasStatus) {
      seedAttempted.current = true;
      startGame().catch((e) => console.warn("start_game failed:", e));
    }
  }, [isReady, gameState, startGame]);

  const territories = useMemo(
    () => buildTerritoryStates(military, economic, covert, cultural),
    [military, economic, covert, cultural],
  );

  const me = players.find((p) => p.playerId === PLAYER_ID);
  const actionPoints = me?.actionPoints ?? 0;
  const playerColor = PLAYER_COLORS[PLAYER_ID] ?? "#4488FF";

  const status = gameState.find((r) => r.key === "status")?.value ?? "active";
  const winner = gameState.find((r) => r.key === "winner")?.value ?? "";
  const gameEnded = status === "ended";
  const winnerPlayer = players.find((p) => p.playerName === winner);
  const didWin = winnerPlayer?.playerId === PLAYER_ID;

  function handleDragStart(event: DragStartEvent) {
    const cardType = event.active.data.current?.cardType as CardType | undefined;
    if (!cardType) return;
    if (cardType === "military") {
      setHighlighted(new Set(getValidMilitaryTargets(military, PLAYER_ID)));
    } else {
      // Economic and Covert may target any territory.
      setHighlighted(new Set(Array.from({ length: TOTAL_TERRITORIES }, (_, i) => i + 1)));
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    const cardType = event.active.data.current?.cardType as CardType | undefined;
    const territoryId = event.over?.id as number | undefined;
    setHighlighted(new Set());
    if (!cardType || territoryId === undefined) return;

    if (cardType === "military") {
      if (!getValidMilitaryTargets(military, PLAYER_ID).includes(territoryId)) return;
      militaryAttack({ territoryId, playerId: PLAYER_ID }).catch((e) => console.warn("military_attack:", e));
    } else if (cardType === "economic") {
      economicInvest({ territoryId, playerId: PLAYER_ID }).catch((e) => console.warn("economic_invest:", e));
    } else {
      deployAgent({ territoryId, playerId: PLAYER_ID }).catch((e) => console.warn("deploy_agent:", e));
    }
  }

  if (!isReady) {
    return (
      <div className="flex h-full items-center justify-center font-data text-text-secondary">
        Connecting to SpacetimeDB...
      </div>
    );
  }

  const mapHighlights = new Set<number>([
    ...highlighted,
    ...queryHighlights,
    ...(tickerHighlight != null ? [tickerHighlight] : []),
  ]);

  return (
    <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="relative flex h-full flex-col">
        <QueryBar
          onResult={(r) => setQueryResult(r)}
          onHighlight={(ids) => setQueryHighlights(ids)}
        />

        <div className="flex items-center justify-between px-4 py-2">
          <span className="font-ui text-[12px] text-text-secondary">Risk: Dominion</span>
          <ActionBar actionPoints={actionPoints} playerColor={playerColor} />
        </div>

        {queryResult && (
          <ResultsPanel
            result={queryResult}
            onClose={() => {
              setQueryResult(null);
              setQueryHighlights([]);
            }}
          />
        )}

        <div className="flex flex-1 overflow-hidden">
          <IntelPanel onHighlight={(ids) => setQueryHighlights(ids)} />
          <Map territories={territories} highlighted={mapHighlights} currentPlayerId={PLAYER_ID} />
        </div>

        <CardHand actionPoints={actionPoints} gameEnded={gameEnded} />

        <EventTicker events={eventFeed} onEventClick={handleEventClick} />

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
