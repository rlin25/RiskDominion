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

// ---- COMMAND BAR PARSING ----
// A parsed command from the unified command bar (UIUX.md §3.4). The command bar
// reports what the player wants; App.tsx dispatches the matching overlay/action.
export type ParsedCommand =
  | { kind: "intel"; aiId: number }
  | { kind: "chat"; aiId: number }
  | { kind: "events" }
  | { kind: "advice"; topic: string }
  | { kind: "query"; text: string };

// ---- END GAME ----
// Drives both the on-map endgame animation (Map: shockwave/pulse/dim/highlight)
// and the centered overlay card (VictoryScreen).
export interface EndGameState {
  outcome: "victory" | "defeat";
  winnerId: number; // player id of the winner
  territoryId: number; // territory whose unification ended the game (0 if unknown)
}

// ---- QUERY VISUALIZATIONS ----
// The server query procedure returns { summary, highlightedTerritories, dataTable }.
// The frontend infers a visualization type from that shape (DECISIONS reconciliation:
// no `visualization` field exists server-side) and renders it on the map.
export type VizType = "heatmap" | "symbols" | "bar" | "table";

export interface VizSpec {
  type: VizType;
  caption: string;
  // For heatmap/symbols: territory id -> intensity (0..1 normalized for heatmap,
  // raw value for symbol radius scaling).
  territories: { id: number; value: number }[];
  // For bar/table.
  columns: string[];
  rows: string[][];
}

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
