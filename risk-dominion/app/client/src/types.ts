// Re-export the SpacetimeDB-generated row/return types (camelCase fields) under
// stable names, plus the derived view-models the UI works with.

export type {
  Military as MilitaryRow,
  Economic as EconomicRow,
  Covert as CovertRow,
  Cultural as CulturalRow,
  Player as PlayerRow,
  GameState as GameStateRow,
  AiState as AIStateRow,
  AiReasoningLog as AIReasoningLogRow,
  EventFeed as EventFeedRow,
  StrategistLog as StrategistLogRow,
  ChatLog as ChatLogRow,
  AiTrust as AiTrustRow,
  IntelResult,
  DeliberationEntry,
  QueryResult,
  AutocompleteResult,
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
  culturalOwner: number;
  influencePct: number;
}
