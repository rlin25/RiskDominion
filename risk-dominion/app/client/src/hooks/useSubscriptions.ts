import { useTable } from "spacetimedb/react";
import { tables } from "../module_bindings";
import type {
  MilitaryRow,
  EconomicRow,
  CovertRow,
  CulturalRow,
  PlayerRow,
  GameStateRow,
  EventFeedRow,
  StrategistLogRow,
} from "../types";

// Subscribes to the public game tables and returns live rows. The SDK delivers
// the full table on first load and merges incremental updates automatically.
export function useSubscriptions() {
  const [military, militaryReady] = useTable(tables.military);
  const [economic, economicReady] = useTable(tables.economic);
  const [covert, covertReady] = useTable(tables.covert);
  const [cultural, culturalReady] = useTable(tables.cultural);
  const [players, playersReady] = useTable(tables.players);
  const [gameState, gameStateReady] = useTable(tables.game_state);
  const [eventFeed, eventFeedReady] = useTable(tables.event_feed);
  const [strategistLog, strategistReady] = useTable(tables.strategist_log);

  const isReady =
    militaryReady &&
    economicReady &&
    covertReady &&
    culturalReady &&
    playersReady &&
    gameStateReady &&
    eventFeedReady &&
    strategistReady;

  return {
    military: military as readonly MilitaryRow[],
    economic: economic as readonly EconomicRow[],
    covert: covert as readonly CovertRow[],
    cultural: cultural as readonly CulturalRow[],
    players: players as readonly PlayerRow[],
    gameState: gameState as readonly GameStateRow[],
    eventFeed: eventFeed as readonly EventFeedRow[],
    strategistLog: strategistLog as readonly StrategistLogRow[],
    isReady,
  };
}
