// Re-export the SpacetimeDB-generated row/return types (camelCase fields) under
// stable names, plus the derived view-models the UI works with.

export type {
  Military as MilitaryRow,
  Economic as EconomicRow,
  Covert as CovertRow,
  Player as PlayerRow,
  GameState as GameStateRow,
  AiState as AIStateRow,
  AiReasoningLog as AIReasoningLogRow,
  IntelResult,
} from "./module_bindings/types";

export type CardType = "military" | "economic" | "covert";

// A territory's combined state across all dimensions, assembled for rendering.
export interface TerritoryState {
  territoryId: number;
  militaryOwner: number;
  troopCount: number;
  economicOwner: number;
  capital: number;
  covertOwner: number;
  agentCount: number;
}
