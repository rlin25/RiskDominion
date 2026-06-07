import { useEffect, useMemo, useRef, useState } from "react";
import {
  DndContext,
  PointerSensor,
  pointerWithin,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { useProcedure, useReducer } from "spacetimedb/react";
import { procedures, reducers } from "./module_bindings";
import { useSubscriptions } from "./hooks/useSubscriptions";
import { buildTerritoryStates, getValidMilitaryTargets } from "./utils/territoryHelpers";
import { HUMAN_PLAYER_ID } from "./constants";
import type { CardType, EndGameState, VizSpec, ChatLogRow, EventFeedRow, StrategistLogRow } from "./types";
import { Map as GameMap } from "./components/Map";
import { CardHand } from "./components/CardHand";
import { ColorLegend } from "./components/ColorLegend";
import { TitleScreen } from "./components/TitleScreen";
import { CommandBar } from "./components/CommandBar";
import { ChatWindow } from "./components/ChatWindow";
import { IntelPanel } from "./components/IntelPanel";
import { QueryViz } from "./components/QueryViz";
import { VictoryScreen } from "./components/VictoryScreen";
import { EventNotifications } from "./components/EventTicker";
import { StrategistAdvice } from "./components/StrategistAlerts";
import {
  playCardSound,
  playCulturalPressureSound,
  playDefeatSound,
  playTerritoryFlipSound,
  playVictorySound,
} from "./utils/soundEngine";

const PLAYER_ID = HUMAN_PLAYER_ID;
const MAX_CHATS = 3;

export default function App() {
  const { military, economic, covert, cultural, players, gameState, eventFeed, strategistLog, chatLog, isReady } =
    useSubscriptions();

  const startGame = useReducer(reducers.startGame);
  const militaryAttack = useReducer(reducers.militaryAttack);
  const economicInvest = useReducer(reducers.economicInvest);
  const deployAgent = useReducer(reducers.deployAgent);
  const sendChat = useReducer(reducers.sendChatMessage);
  const chatReply = useProcedure(procedures.chatReply);

  // ---- UI state (UIUX.md section 10) ----
  const [commandBarVisible, setCommandBarVisible] = useState(false);
  const [activeChats, setActiveChats] = useState<number[]>([]);
  const [showIntel, setShowIntel] = useState<number | null>(null);
  const [titleScreenDone, setTitleScreenDone] = useState(false);
  const [queryViz, setQueryViz] = useState<VizSpec | null>(null);
  const [requestedAdvice, setRequestedAdvice] = useState<string | null>(null);
  const [showRecentToken, setShowRecentToken] = useState(0);
  const [chatNotif, setChatNotif] = useState(false);

  // ---- drag state ----
  const [attackMode, setAttackMode] = useState(false);
  const [validTargets, setValidTargets] = useState<number[]>([]);
  const [isCardDragging, setIsCardDragging] = useState(false);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const seedAttempted = useRef(false);

  // Seed a game on first connect if none is running.
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

  const status = gameState.find((r) => r.key === "status")?.value ?? "active";
  const winnerName = gameState.find((r) => r.key === "winner")?.value ?? "";
  const gameEnded = status === "ended";
  const winnerPlayer = players.find((p) => p.playerName === winnerName);
  const winnerId = winnerPlayer?.playerId ?? 0;

  const endGame: EndGameState | null = useMemo(() => {
    if (!gameEnded || winnerId <= 0) return null;
    const victoryEvents = [...eventFeed]
      .filter((e) => e.eventType === "victory" && e.territoryId != null)
      .sort((a, b) => Number(a.eventAt) - Number(b.eventAt));
    const lastVictoryEvent = victoryEvents[victoryEvents.length - 1];
    const unifiedByWinner = territories.find(
      (t) =>
        t.militaryOwner === winnerId &&
        t.economicOwner === winnerId &&
        t.covertOwner === winnerId &&
        t.culturalOwner === winnerId,
    );
    return {
      outcome: winnerId === PLAYER_ID ? "victory" : "defeat",
      winnerId,
      territoryId: lastVictoryEvent?.territoryId ?? unifiedByWinner?.territoryId ?? 0,
    };
  }, [gameEnded, winnerId, eventFeed, territories]);

  // ---- Sound: territory flips + cultural pressure thresholds ----
  const prevOwners = useRef<Map<number, string> | null>(null);
  const prevInfluence = useRef<Map<number, number> | null>(null);
  useEffect(() => {
    if (!isReady) return;
    const owners = new Map<number, string>();
    const influence = new Map<number, number>();
    let flip = false;
    let pressure: 0 | 1 | 2 = 0;
    for (const t of territories) {
      const key = `${t.militaryOwner}.${t.economicOwner}.${t.covertOwner}.${t.culturalOwner}`;
      owners.set(t.territoryId, key);
      influence.set(t.territoryId, t.influencePct);
      const prevKey = prevOwners.current?.get(t.territoryId);
      if (prevKey !== undefined && prevKey !== key) flip = true;
      const prevInf = prevInfluence.current?.get(t.territoryId);
      if (prevInf !== undefined) {
        if (prevInf < 40 && t.influencePct >= 40) pressure = 2;
        else if (prevInf < 30 && t.influencePct >= 30 && pressure === 0) pressure = 1;
      }
    }
    if (prevOwners.current) {
      if (flip) playTerritoryFlipSound();
      if (pressure) playCulturalPressureSound(pressure);
    }
    prevOwners.current = owners;
    prevInfluence.current = influence;
  }, [territories, isReady]);

  // ---- Sound: victory / defeat (once) ----
  const endSoundPlayed = useRef(false);
  useEffect(() => {
    if (endGame && !endSoundPlayed.current) {
      endSoundPlayed.current = true;
      if (endGame.outcome === "victory") playVictorySound();
      else playDefeatSound();
      // End game dismisses open overlays (UIUX 8.1/8.2).
      setCommandBarVisible(false);
      setActiveChats([]);
      setShowIntel(null);
    }
  }, [endGame]);

  // ---- Chat notification dot: new AI message to a non-open window ----
  const lastChatId = useRef<bigint | null>(null);
  useEffect(() => {
    if (chatLog.length === 0) return;
    let maxId = chatLog[0].id;
    let newest = chatLog[0];
    for (const m of chatLog) {
      if (m.id > maxId) {
        maxId = m.id;
        newest = m;
      }
    }
    if (lastChatId.current !== null && maxId > lastChatId.current) {
      const fromAi = newest.senderId >= 2 && newest.recipientId === PLAYER_ID;
      if (fromAi && !activeChats.includes(newest.senderId)) setChatNotif(true);
    }
    lastChatId.current = maxId;
  }, [chatLog, activeChats]);

  // ---- Query visualization auto-dismiss after 10s ----
  useEffect(() => {
    if (!queryViz) return;
    const t = window.setTimeout(() => setQueryViz(null), 10000);
    return () => window.clearTimeout(t);
  }, [queryViz]);

  // ---- Global keyboard: summon command bar (Enter/T), Escape dismiss all ----
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const inInput =
        document.activeElement?.tagName === "INPUT" || document.activeElement?.tagName === "TEXTAREA";
      if (e.key === "Escape") {
        setCommandBarVisible(false);
        setActiveChats([]);
        setShowIntel(null);
        setQueryViz(null);
        setRequestedAdvice(null);
        return;
      }
      if (inInput) return;
      if (!titleScreenDone) return;
      if ((e.key === "Enter" || e.key === "t" || e.key === "T") && !commandBarVisible) {
        e.preventDefault();
        setCommandBarVisible(true);
        setChatNotif(false);
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [titleScreenDone, commandBarVisible]);

  // ---- Drag (cards) ----
  function handleDragStart(event: DragStartEvent) {
    const cardType = event.active.data.current?.cardType as CardType | undefined;
    setIsCardDragging(true);
    if (commandBarVisible) setCommandBarVisible(false);
    setQueryViz(null);
    if (cardType === "military") {
      setAttackMode(true);
      setValidTargets(getValidMilitaryTargets(military, PLAYER_ID));
    } else {
      setAttackMode(false);
      setValidTargets([]);
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    const cardType = event.active.data.current?.cardType as CardType | undefined;
    const territoryId = event.over?.id as number | undefined;
    setAttackMode(false);
    setValidTargets([]);
    setIsCardDragging(false);
    if (!cardType || territoryId === undefined) return;

    if (cardType === "military") {
      if (!getValidMilitaryTargets(military, PLAYER_ID).includes(territoryId)) return;
      militaryAttack({ territoryId, playerId: PLAYER_ID })
        .then(() => playCardSound())
        .catch((e) => console.warn("military_attack:", e));
    } else if (cardType === "economic") {
      economicInvest({ territoryId, playerId: PLAYER_ID })
        .then(() => playCardSound())
        .catch((e) => console.warn("economic_invest:", e));
    } else {
      deployAgent({ territoryId, playerId: PLAYER_ID })
        .then(() => playCardSound())
        .catch((e) => console.warn("deploy_agent:", e));
    }
  }

  // ---- Chat send: human message then trigger the AI's real-time reply ----
  function handleSend(aiId: number, text: string) {
    sendChat({ senderId: PLAYER_ID, messageText: text, recipientId: aiId, isDeception: false, claimedFact: "" })
      .then(() => chatReply({ aiPlayerId: aiId }))
      .catch((e) => console.warn("chat send/reply:", e));
  }

  function openChat(aiId: number) {
    setChatNotif(false);
    setActiveChats((prev) => {
      if (prev.includes(aiId)) return prev;
      const next = [...prev, aiId];
      return next.length > MAX_CHATS ? next.slice(next.length - MAX_CHATS) : next;
    });
  }

  if (!isReady) {
    return (
      <div className="map-bg flex h-full flex-col items-center justify-center gap-3">
        <span className="font-ui text-[13px] tracking-widest text-text-secondary">
          ESTABLISHING COMMAND LINK...
        </span>
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      {/* Persistent: the map */}
      <GameMap
        territories={territories}
        currentPlayerId={PLAYER_ID}
        attackMode={attackMode}
        validTargets={validTargets}
        isCardDragging={isCardDragging}
        endGame={endGame}
        queryViz={queryViz}
      />

      <ColorLegend />

      {/* Persistent: the card hand (fan-out arc) */}
      <CardHand actionPoints={actionPoints} gameEnded={gameEnded} />

      {/* Temporary overlays */}
      {!titleScreenDone && <TitleScreen onDone={() => setTitleScreenDone(true)} />}

      <CommandBar
        visible={commandBarVisible}
        notificationDot={chatNotif}
        onDismiss={() => setCommandBarVisible(false)}
        onOpenChat={openChat}
        onOpenIntel={(aiId) => setShowIntel(aiId)}
        onShowEvents={() => setShowRecentToken((t) => t + 1)}
        onAdvice={(text) => setRequestedAdvice(text)}
        onQueryViz={(viz) => setQueryViz(viz)}
      />

      {activeChats.map((aiId, i) => (
        <ChatWindow
          key={aiId}
          aiId={aiId}
          index={i}
          messages={chatLog as ChatLogRow[]}
          onClose={(id) => setActiveChats((prev) => prev.filter((x) => x !== id))}
          onSend={handleSend}
        />
      ))}

      {showIntel !== null && <IntelPanel aiId={showIntel} onClose={() => setShowIntel(null)} />}

      {queryViz && <QueryViz viz={queryViz} onDismiss={() => setQueryViz(null)} />}

      <EventNotifications events={eventFeed as EventFeedRow[]} showRecentToken={showRecentToken} />

      <StrategistAdvice
        alerts={strategistLog as StrategistLogRow[]}
        requested={requestedAdvice}
        onDismissRequested={() => setRequestedAdvice(null)}
      />

      {endGame && <VictoryScreen endGame={endGame} currentPlayerId={PLAYER_ID} />}
    </DndContext>
  );
}
