// Client-side constants. Mirrors the server module's gameplay constants and the
// AESTHETIC.md v2.0 visual system.

export const MAX_ACTION_POINTS = 10;
export const ACTION_REGEN_SECONDS = 4; // AESTHETIC/DECISIONS v2.0: faster pace
export const STARTING_ACTION_POINTS = 5;
export const ECONOMIC_INVEST_AMOUNT = 5;
export const WIN_UNIFIED_TERRITORIES = 5;
export const TOTAL_TERRITORIES = 12;
export const CULTURAL_TICK_SECONDS = 30;
export const INFLUENCE_FLIP_THRESHOLD = 50;

export const TERRITORY_NAMES: Record<number, string> = {
  1: "North America",
  2: "Central America",
  3: "Caribbean",
  4: "South America",
  5: "Western Europe",
  6: "North Africa",
  7: "Southern Africa",
  8: "Eastern Europe",
  9: "Middle East",
  10: "South Asia",
  11: "East Asia",
  12: "Oceania",
};

export const ADJACENCY: Record<number, number[]> = {
  1: [2, 3, 5],
  2: [1, 3, 4],
  3: [1, 2, 4, 6],
  4: [2, 3, 6, 7],
  5: [1, 6, 8],
  6: [3, 4, 5, 7, 9],
  7: [4, 6],
  8: [5, 9, 10],
  9: [6, 8, 10, 11],
  10: [8, 9, 11, 12],
  11: [9, 10, 12],
  12: [10, 11],
};

// AESTHETIC.md v2.0 player colors (muted, satellite-intelligence tones).
export const PLAYER_COLORS: Record<number, string> = {
  1: "#5b8cbe", // You (human)
  2: "#c4554d", // Zhao
  3: "#c4944d", // Consortium
  4: "#8b6bae", // Prophet
};

export const TOTAL_PLAYERS = 4;
export const INTEL_THRESHOLD = 3;
export const HUMAN_PLAYER_ID = 1;

export const AI_PLAYERS: { id: number; name: string; color: string }[] = [
  { id: 2, name: "Zhao", color: PLAYER_COLORS[2] },
  { id: 3, name: "Consortium", color: PLAYER_COLORS[3] },
  { id: 4, name: "Prophet", color: PLAYER_COLORS[4] },
];

// Color legend (bottom-left of the map). AESTHETIC v2.0 §3.6.
export const LEGEND: { id: number; name: string; color: string }[] = [
  { id: 1, name: "You", color: PLAYER_COLORS[1] },
  { id: 2, name: "Zhao", color: PLAYER_COLORS[2] },
  { id: 3, name: "Consortium", color: PLAYER_COLORS[3] },
  { id: 4, name: "Prophet", color: PLAYER_COLORS[4] },
];

export const EVENT_FEED_MAX_DISPLAY = 50;
export const MAX_CHAT_MESSAGE_LENGTH = 500;

// Dimension accent colors for cards + tooltip dimension icons (AESTHETIC §4.1).
// Cultural has no card; it spreads passively. Its accent is used only for the
// hover-callout icon and event-notification stripe.
export const DIMENSION_COLORS = {
  military: "#c4554d",
  economic: "#c4944d",
  cultural: "#8b6bae",
  covert: "#8b6bae",
} as const;

// Event-notification left-border colors (AESTHETIC §9, INTERFACE_CONTRACT §8.2).
export const EVENT_TYPE_COLORS: Record<string, string> = {
  military: "#c4554d",
  economic: "#c4944d",
  cultural: "#8b6bae",
  covert: "#8b6bae",
  victory: "#d4a843",
  system: "#d4a843",
};

// Three continent groups (used by the GeoJSON authoring + any grouping logic).
export const CONTINENTS: { name: string; territories: number[] }[] = [
  { name: "Americas", territories: [1, 2, 3, 4] },
  { name: "Europe-Africa", territories: [5, 6, 7, 8] },
  { name: "Asia-Oceania", territories: [9, 10, 11, 12] },
];

// ---- COMMAND BAR ----
// Dropdown sections (INTERFACE_CONTRACT §3.4 / AESTHETIC §5.3). The label text is
// fed back through the same command parser as free typed input.
export interface CommandOption {
  label: string;
}
export interface CommandSection {
  title: string;
  options: CommandOption[];
}

export const COMMAND_SECTIONS: CommandSection[] = [
  {
    title: "INTEL",
    options: [
      { label: "Show me Zhao's plans" },
      { label: "Show me Consortium's plans" },
      { label: "Show me Prophet's plans" },
    ],
  },
  {
    title: "CHAT",
    options: [
      { label: "Chat with Zhao" },
      { label: "Chat with Consortium" },
      { label: "Chat with Prophet" },
    ],
  },
  {
    title: "EVENTS",
    options: [{ label: "What's happening?" }],
  },
  {
    title: "ADVICE",
    options: [{ label: "How am I doing?" }, { label: "Where should I attack?" }],
  },
];
