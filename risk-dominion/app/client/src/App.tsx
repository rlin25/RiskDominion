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
import { StrategistAlerts } from "./components/StrategistAlerts";
import { ChatPanel } from "./components/ChatPanel";
import { SpectatorOverlay } from "./components/SpectatorOverlay";
import { ReplayControls } from "./components/ReplayControls";
import { QueryBar } from "./components/QueryBar";
import { ResultsPanel } from "./components/ResultsPanel";
import { EventTicker } from "./components/EventTicker";
import { VictoryScreen } from "./components/VictoryScreen";
import type { QueryResult } from "./types";

const PLAYER_ID = HUMAN_PLAYER_ID;

type Mode = "player" | "spectator" | "replay";

function readMode(): Mode {
  const p = new URLSearchParams(window.location.search);
  if (p.get("replay") === "true") return "replay";
  if (p.get("spectator") === "true") return "spectator";
  return "player";
}

export default function App() {
  const mode = useMemo(readMode, []);
  const { military, economic, covert, cultural, players, gameState, eventFeed, strategistLog, chatLog, aiState, aiTrust, isReady } =
    useSubscriptions();

  const startGame = useReducer(reducers.startGame);
  const militaryAttack = useReducer(reducers.militaryAttack);
  const economicInvest = useReducer(reducers.economicInvest);
  const deployAgent = useReducer(reducers.deployAgent);
  const dismissAlert = useReducer(reducers.dismissStrategistAlert);
  const sendChat = useReducer(reducers.sendChatMessage);

  function handleSendMessage(text: string, recipientId: number) {
    sendChat({
      senderId: PLAYER_ID,
      messageText: text,
      recipientId,
      isDeception: false,
      claimedFact: "",
    }).catch((e) => console.warn("send_chat_message:", e));
  }

  const [highlighted, setHighlighted] = useState<Set<number>>(new Set());
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null);
  const [queryHighlights, setQueryHighlights] = useState<number[]>([]);
  const [tickerHighlight, setTickerHighlight] = useState<number | null>(null);
  const [ownedHighlight, setOwnedHighlight] = useState(false);
  const [intelOpen, setIntelOpen] = useState(true);
  const [currentTimestamp, setCurrentTimestamp] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const seedAttempted = useRef(false);

  const startedAt = Number(gameState.find((r) => r.key === "started_at")?.value ?? 0);
  const endedAt = Number(gameState.find((r) => r.key === "ended_at")?.value ?? 0);

  // Replay: initialize the playhead at game start once data is ready.
  useEffect(() => {
    if (mode === "replay" && currentTimestamp === 0 && startedAt > 0) {
      setCurrentTimestamp(startedAt);
    }
  }, [mode, currentTimestamp, startedAt]);

  // Replay playback loop: advance the playhead while playing.
  useEffect(() => {
    if (mode !== "replay" || !isPlaying || endedAt <= startedAt) return;
    const stepMs = 200;
    const timer = window.setInterval(() => {
      setCurrentTimestamp((t) => {
        const next = t + stepMs * playbackSpeed;
        if (next >= endedAt) {
          setIsPlaying(false);
          return endedAt;
        }
        return next;
      });
    }, stepMs);
    return () => window.clearInterval(timer);
  }, [mode, isPlaying, playbackSpeed, startedAt, endedAt]);

  function handleEventClick(territoryId: number) {
    setTickerHighlight(territoryId);
    window.setTimeout(() => setTickerHighlight(null), 3000);
  }

  // Hotkeys: H toggle owned highlight, Q focus query, I toggle intel, Escape clear.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const inInput = document.activeElement?.tagName === "INPUT";
      if (inInput && e.key !== "Escape") return;
      switch (e.key) {
        case "h":
        case "H":
          setOwnedHighlight((v) => !v);
          break;
        case "i":
        case "I":
          setIntelOpen((v) => !v);
          break;
        case "q":
        case "Q":
          e.preventDefault();
          document.querySelector<HTMLInputElement>("input")?.focus();
          break;
        case "Escape":
          setQueryResult(null);
          setQueryHighlights([]);
          setOwnedHighlight(false);
          (document.activeElement as HTMLElement | null)?.blur();
          break;
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (mode !== "player" || !isReady || seedAttempted.current) return;
    const hasStatus = gameState.some((row) => row.key === "status");
    if (!hasStatus) {
      seedAttempted.current = true;
      startGame().catch((e) => console.warn("start_game failed:", e));
    }
  }, [mode, isReady, gameState, startGame]);

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

  if (mode === "replay" && status !== "ended") {
    return (
      <div className="flex h-full items-center justify-center font-ui text-text-secondary">
        Replay will be available after the game ends.
      </div>
    );
  }

  const ownedIds = ownedHighlight
    ? territories
        .filter(
          (t) =>
            t.militaryOwner === PLAYER_ID ||
            t.economicOwner === PLAYER_ID ||
            t.culturalOwner === PLAYER_ID ||
            t.covertOwner === PLAYER_ID,
        )
        .map((t) => t.territoryId)
    : [];

  const mapHighlights = new Set<number>([
    ...highlighted,
    ...queryHighlights,
    ...ownedIds,
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

        <StrategistAlerts
          alerts={strategistLog}
          onDismiss={(id) => dismissAlert({ notificationId: id }).catch(() => {})}
          onAlertClick={handleEventClick}
        />

        <div className="flex flex-1 overflow-hidden">
          {intelOpen && <IntelPanel onHighlight={(ids) => setQueryHighlights(ids)} />}
          <Map territories={territories} highlighted={mapHighlights} currentPlayerId={PLAYER_ID} />
          <ChatPanel
            messages={chatLog}
            currentPlayerId={PLAYER_ID}
            onSendMessage={handleSendMessage}
            onTerritoryClick={handleEventClick}
            mode={mode}
            currentTimestamp={mode === "replay" ? currentTimestamp : null}
          />
          {mode !== "player" && (
            <SpectatorOverlay
              territories={territories}
              players={players}
              aiState={aiState}
              aiTrust={aiTrust}
              eventFeed={eventFeed}
            />
          )}
        </div>

        {mode === "player" && <CardHand actionPoints={actionPoints} gameEnded={gameEnded} />}

        {mode === "replay" ? (
          <ReplayControls
            events={eventFeed}
            startedAt={startedAt}
            endedAt={endedAt > startedAt ? endedAt : startedAt + 1}
            currentTimestamp={currentTimestamp}
            onSeek={(t) => setCurrentTimestamp(t)}
            isPlaying={isPlaying}
            onPlayPause={() => setIsPlaying((p) => !p)}
            speed={playbackSpeed}
            onSpeedChange={setPlaybackSpeed}
          />
        ) : (
          <EventTicker
            events={eventFeed}
            onEventClick={handleEventClick}
          />
        )}

        {gameEnded && mode === "player" && (
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
