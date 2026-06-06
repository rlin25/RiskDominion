// Re-export the SpacetimeDB-generated row types (camelCase fields) under stable
// names, plus the derived view-models the UI works with.

export type {
  Military as MilitaryRow,
  Economic as EconomicRow,
  Player as PlayerRow,
  GameState as GameStateRow,
} from "./module_bindings/types";

export type CardType = "military" | "economic";

// A territory's combined state across both dimensions, assembled for rendering.
export interface TerritoryState {
  territoryId: number;
  militaryOwner: number;
  troopCount: number;
  economicOwner: number;
  capital: number;
}
