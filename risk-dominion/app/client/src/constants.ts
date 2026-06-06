// Client-side constants. Mirrors the server module's gameplay constants.

export const MAX_ACTION_POINTS = 10;
export const ACTION_REGEN_SECONDS = 8;
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

export const PLAYER_COLORS: Record<number, string> = {
  1: "#4488FF",
  2: "#FF4444",
  3: "#FFAA00",
  4: "#AA44FF",
};

export const TOTAL_PLAYERS = 4;
export const INTEL_THRESHOLD = 3;
export const HUMAN_PLAYER_ID = 1;

export const AI_PLAYERS: { id: number; name: string; color: string }[] = [
  { id: 2, name: "Zhao", color: "#FF4444" },
  { id: 3, name: "Consortium", color: "#FFAA00" },
  { id: 4, name: "Prophet", color: "#AA44FF" },
];

export const EVENT_FEED_MAX_DISPLAY = 50;
export const MAX_CHAT_MESSAGE_LENGTH = 500;

export const CANNED_QUERIES: { id: number; label: string }[] = [
  { id: 0, label: "Weaknesses" },
  { id: 1, label: "Contested" },
  { id: 2, label: "Zhao's Targets" },
  { id: 3, label: "Near Unification" },
  { id: 4, label: "My Economy" },
  { id: 5, label: "Thin Covert" },
  { id: 6, label: "Consortium" },
  { id: 7, label: "Culture Spread" },
  { id: 8, label: "My Bonuses" },
  { id: 9, label: "Winning" },
];

export const EVENT_TYPE_COLORS: Record<string, string> = {
  military: "#FF6666",
  economic: "#FFCC44",
  cultural: "#44DDAA",
  covert: "#AA44FF",
  victory: "#FFD700",
  system: "#8899AA",
};

// Three continent groups for map layout (Americas, Europe-Africa, Asia-Oceania).
export const CONTINENTS: { name: string; territories: number[] }[] = [
  { name: "Americas", territories: [1, 2, 3, 4] },
  { name: "Europe-Africa", territories: [5, 6, 7, 8] },
  { name: "Asia-Oceania", territories: [9, 10, 11, 12] },
];
