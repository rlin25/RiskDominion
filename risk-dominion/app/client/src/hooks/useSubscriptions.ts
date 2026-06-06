import { useTable } from "spacetimedb/react";
import { tables } from "../module_bindings";
import type {
  MilitaryRow,
  EconomicRow,
  CovertRow,
  PlayerRow,
  GameStateRow,
} from "../types";

// Subscribes to the public game tables and returns live rows. The SDK delivers
// the full table on first load and merges incremental updates automatically.
export function useSubscriptions() {
  const [military, militaryReady] = useTable(tables.military);
  const [economic, economicReady] = useTable(tables.economic);
  const [covert, covertReady] = useTable(tables.covert);
  const [players, playersReady] = useTable(tables.players);
  const [gameState, gameStateReady] = useTable(tables.game_state);

  const isReady =
    militaryReady && economicReady && covertReady && playersReady && gameStateReady;

  return {
    military: military as readonly MilitaryRow[],
    economic: economic as readonly EconomicRow[],
    covert: covert as readonly CovertRow[],
    players: players as readonly PlayerRow[],
    gameState: gameState as readonly GameStateRow[],
    isReady,
  };
}
