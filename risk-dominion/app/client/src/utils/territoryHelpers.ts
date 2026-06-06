import { ADJACENCY, TERRITORY_NAMES } from "../constants";
import type { MilitaryRow, EconomicRow, TerritoryState } from "../types";

export function getAdjacentTerritories(territoryId: number): number[] {
  return ADJACENCY[territoryId] ?? [];
}

export function isAdjacent(territoryId: number, targetId: number): boolean {
  return getAdjacentTerritories(territoryId).includes(targetId);
}

export function getTerritoryName(territoryId: number): string {
  return TERRITORY_NAMES[territoryId] ?? `Territory ${territoryId}`;
}

// Combine the per-dimension rows into a single view-model per territory.
export function buildTerritoryStates(
  military: readonly MilitaryRow[],
  economic: readonly EconomicRow[],
): TerritoryState[] {
  return military.map((m) => {
    const e = economic.find((row) => row.territoryId === m.territoryId);
    return {
      territoryId: m.territoryId,
      militaryOwner: m.ownerId,
      troopCount: m.troopCount,
      economicOwner: e?.ownerId ?? 0,
      capital: e?.capital ?? 0,
    };
  });
}

export function countUnifiedTerritories(
  military: readonly MilitaryRow[],
  economic: readonly EconomicRow[],
  playerId: number,
): number {
  let count = 0;
  for (const m of military) {
    if (m.ownerId !== playerId) continue;
    const e = economic.find((row) => row.territoryId === m.territoryId);
    if (e && e.ownerId === playerId) count++;
  }
  return count;
}

// Valid Military targets: territories adjacent to a player's military holdings
// that the player does not already own militarily.
export function getValidMilitaryTargets(
  military: readonly MilitaryRow[],
  playerId: number,
): number[] {
  const owned = military.filter((m) => m.ownerId === playerId).map((m) => m.territoryId);
  const adjacent = new Set<number>();
  for (const t of owned) {
    for (const adj of getAdjacentTerritories(t)) adjacent.add(adj);
  }
  return Array.from(adjacent).filter((t) => {
    const m = military.find((row) => row.territoryId === t);
    return m !== undefined && m.ownerId !== playerId;
  });
}
