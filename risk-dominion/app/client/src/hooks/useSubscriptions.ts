import { useTable } from "spacetimedb/react";
import { tables } from "../module_bindings";
import type { MilitaryRow, EconomicRow, PlayerRow, GameStateRow } from "../types";

// Subscribes to all four Slice 1 tables and returns live rows. The SDK delivers
// the full table on first load and merges incremental updates automatically.
export function useSubscriptions() {
  const [military, militaryReady] = useTable(tables.military);
  const [economic, economicReady] = useTable(tables.economic);
  const [players, playersReady] = useTable(tables.players);
  const [gameState, gameStateReady] = useTable(tables.game_state);

  const isReady = militaryReady && economicReady && playersReady && gameStateReady;

  return {
    military: military as readonly MilitaryRow[],
    economic: economic as readonly EconomicRow[],
    players: players as readonly PlayerRow[],
    gameState: gameState as readonly GameStateRow[],
    isReady,
  };
}
