# RISK: DOMINION — SLICE 1 MASTERPLAN

## Version 1.0
## Scope: Two Players, Two Dimensions, Core Gameplay
## Target: Claude Code Generation — SpacetimeDB Server + React Frontend

---

## 0. DOCUMENT PURPOSE

This document is the single source of truth for generating Slice 1 of Risk: Dominion. Read this document. Generate the complete application as specified. Do not read any other documents.

Slice 1 is a complete, playable two-player real-time strategy game. Two human players share a SpacetimeDB instance. They compete to unify territories across two dimensions — Military and Economic — using drag-and-drop action cards. Victory goes to the first player to unify 3 territories.

After generation, validate against the success criteria in Section 11. Do not proceed to future slices until Slice 1 passes all criteria.

---

## 1. APPLICATION SUMMARY

**Name:** Risk: Dominion
**Slice:** 1 of 4 — Core Gameplay
**Players:** 2 humans (shared SpacetimeDB instance, two browser tabs)
**Dimensions:** Military, Economic
**Win condition:** First to unify 3 territories (both dimensions owned by same player)
**Core loop:** Drag action cards onto territories → reducer mutates database → subscription updates all clients → map re-renders in real time

---

## 2. TECH STACK

| Layer | Technology | Version/Notes |
|-------|-----------|---------------|
| Server | Rust with SpacetimeDB SDK | Latest stable |
| Frontend framework | React with TypeScript | 18.x, 5.3+ |
| Bundler | Vite | Latest stable |
| Drag-and-drop | dnd-kit | @dnd-kit/core (latest) |
| Map rendering | Hexagonal SVG grid per `../AESTHETIC.md` Section 4 |
| Styling | Tailwind CSS | Latest stable. No custom CSS files. All styles inline via utility classes. |
| Visual design | See `../AESTHETIC.md` for color palette, typography, territory hexagon design, card styling, animations, and icon specifications |
| Environment setup | See `../SETUP.md` and run `bash setup.sh` to install all dependencies |
| LLM | None in Slice 1 | No AI opponents, no queries. LLM integration begins in Slice 2. |

---

## 3. FILE TREE

Generate every file listed below. Each file's path and purpose is specified.

### 3.1 Server

```
/server
├── Cargo.toml                    # Rust package config, SpacetimeDB SDK dependency
└── src
    └── lib.rs                    # All tables, reducers, scheduled reducers, constants
```

`lib.rs` is a single file organized with section comments:

```
// ---- CONSTANTS ----
// ---- TABLES ----
// ---- REDUCERS: START GAME ----
// ---- REDUCERS: PLAYER ACTIONS ----
// ---- INTERNAL FUNCTIONS ----
// ---- SCHEDULED REDUCERS ----
```

### 3.2 Client

```
/client
├── package.json                  # Dependencies: react, react-dom, typescript, vite, @dnd-kit/core, tailwindcss
├── tsconfig.json                 # TypeScript strict mode, JSX support
├── vite.config.ts                # Vite with React plugin
├── tailwind.config.js            # Tailwind with content paths
├── index.html                    # HTML entry point, root div, title "Risk: Dominion"
└── src
    ├── main.tsx                  # React entry point, renders App
    ├── App.tsx                   # Top-level component, subscription wiring, layout, state management
    ├── constants.ts              # All client-side constants
    ├── types.ts                  # TypeScript interfaces for all table rows
    ├── hooks
    │   └── useSubscriptions.ts   # All 4 table subscriptions, state management
    ├── components
    │   ├── Map.tsx               # 12-territory map container
    │   ├── Territory.tsx         # Single territory with 2 colored halves
    │   ├── CardHand.tsx          # dnd-kit DndContext, renders ActionCards
    │   ├── ActionCard.tsx        # Individual draggable card
    │   ├── ActionBar.tsx         # Action point bar display
    │   ├── VictoryScreen.tsx     # Win/loss overlay
    │   └── PlayerIndicator.tsx   # Shows "You are Player X" with color
    └── utils
        └── territoryHelpers.ts   # Adjacency lookups, unified count, valid target computation
```

---

## 4. GENERATION ORDER

Generate files in the following sequence. Each file must only import from files generated before it. No forward references.

### Pass 1: Foundation (no dependencies)

1. `server/Cargo.toml`
2. `server/src/lib.rs` — Sections: CONSTANTS and TABLES only
3. `client/package.json`
4. `client/tsconfig.json`
5. `client/vite.config.ts`
6. `client/tailwind.config.js`
7. `client/index.html`
8. `client/src/constants.ts`
9. `client/src/types.ts`
10. `client/src/utils/territoryHelpers.ts`

### Pass 2: Server Logic (depends on Pass 1)

11. `server/src/lib.rs` — Sections: REDUCERS, INTERNAL FUNCTIONS, SCHEDULED REDUCERS

### Pass 3: Frontend Infrastructure (depends on Passes 1–2)

12. `client/src/main.tsx`
13. `client/src/hooks/useSubscriptions.ts`

### Pass 4: Leaf Components (depends on Pass 3)

14. `client/src/components/Territory.tsx`
15. `client/src/components/ActionCard.tsx`
16. `client/src/components/ActionBar.tsx`
17. `client/src/components/PlayerIndicator.tsx`
18. `client/src/components/VictoryScreen.tsx`

### Pass 5: Container Components + App (depends on Pass 4)

19. `client/src/components/Map.tsx`
20. `client/src/components/CardHand.tsx`
21. `client/src/App.tsx`

---

## 5. SERVER SPECIFICATION

### 5.1 Constants

```rust
const MAX_ACTION_POINTS: i32 = 10;
const ACTION_REGEN_SECONDS: u64 = 8;
const STARTING_ACTION_POINTS: i32 = 5;
const ECONOMIC_INVEST_AMOUNT: i32 = 5;
const WIN_UNIFIED_TERRITORIES: i32 = 3;
const TOTAL_TERRITORIES: i32 = 12;
const MIN_TROOPS: i32 = 1;
```

### 5.2 Tables

**`military`**
| Column | Type | Constraints |
|--------|------|-------------|
| territory_id | INT | PRIMARY KEY |
| owner_id | INT | NOT NULL |
| troop_count | INT | NOT NULL DEFAULT 0 |

**`economic`**
| Column | Type | Constraints |
|--------|------|-------------|
| territory_id | INT | PRIMARY KEY |
| owner_id | INT | NOT NULL |
| capital | INT | NOT NULL DEFAULT 0 |

**`players`**
| Column | Type | Constraints |
|--------|------|-------------|
| player_id | INT | PRIMARY KEY |
| player_name | STRING | NOT NULL |
| color | STRING | NOT NULL |
| action_points | INT | NOT NULL DEFAULT 5 |
| last_regen_at | BIGINT | NOT NULL |

**`game_state`**
| Column | Type | Constraints |
|--------|------|-------------|
| key | STRING | PRIMARY KEY |
| value | STRING | NOT NULL |

Use `#[spacetimedb(table)]` macro for each table definition.

### 5.3 Seed Data

`start_game` inserts the following data. The reducer must be idempotent — if `game_state` already has a row where `key = 'status'`, return immediately.

**Territories (insert into military and economic):**

| territory_id | name | mil_owner | mil_troops | eco_owner | eco_capital |
|-------------|------|-----------|------------|-----------|-------------|
| 1 | North America | 1 | 10 | 1 | 20 |
| 2 | Central America | 1 | 5 | 2 | 8 |
| 3 | Caribbean | 1 | 4 | 1 | 6 |
| 4 | South America | 2 | 6 | 1 | 10 |
| 5 | Western Europe | 2 | 10 | 2 | 20 |
| 6 | North Africa | 2 | 5 | 1 | 8 |
| 7 | Southern Africa | 2 | 4 | 2 | 7 |
| 8 | Eastern Europe | 1 | 5 | 2 | 9 |
| 9 | Middle East | 2 | 6 | 1 | 8 |
| 10 | South Asia | 1 | 5 | 2 | 10 |
| 11 | East Asia | 2 | 8 | 2 | 15 |
| 12 | Oceania | 1 | 4 | 1 | 7 |

**Players:**

| player_id | player_name | color | action_points | last_regen_at |
|-----------|-------------|-------|---------------|---------------|
| 1 | Player 1 | #4488FF | 5 | (current server timestamp) |
| 2 | Player 2 | #FF4444 | 5 | (current server timestamp) |

**Game state:**

| key | value |
|-----|-------|
| status | active |
| winner | (empty string) |
| started_at | (current server timestamp) |

Use `std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap().as_millis() as i64` for timestamps, or the SpacetimeDB equivalent.

### 5.4 Adjacency Map

Define as a function in `lib.rs`:

```rust
fn get_adjacent(territory_id: i32) -> Vec<i32> {
    match territory_id {
        1 => vec![2, 3, 5],
        2 => vec![1, 3, 4],
        3 => vec![1, 2, 4, 6],
        4 => vec![2, 3, 6, 7],
        5 => vec![1, 6, 8],
        6 => vec![3, 4, 5, 7, 9],
        7 => vec![4, 6],
        8 => vec![5, 9, 10],
        9 => vec![6, 8, 10, 11],
        10 => vec![8, 9, 11, 12],
        11 => vec![9, 10, 12],
        12 => vec![10, 11],
        _ => vec![]
    }
}
```

### 5.5 Reducers

All client-callable reducers use `#[spacetimedb(reducer)]` macro and return JSON.

#### `start_game()`

Idempotent. If game_state has 'status' key, return `{ "success": true }`. Otherwise insert all seed data and start the regeneration timer.

Returns: `{ "success": true }`

#### `military_attack(territory_id: INT, player_id: INT)`

Validation (return first failure):
1. game_state.status == "active" → else `{ "success": false, "error": "Game has ended." }`
2. player_id is 1 or 2
3. territory_id is 1–12 → else `{ "success": false, "error": "Invalid territory." }`
4. player.action_points >= 1 → else `{ "success": false, "error": "Insufficient action points." }`
5. Player owns military in at least one adjacent territory → else `{ "success": false, "error": "No adjacent territory controlled." }`

On success:
1. Decrement player.action_points by 1.
2. Find adjacent territory where player owns military with highest troop_count. Let `attacker_troops` = that value.
3. Let `defender_troops` = military.troop_count for target territory.
4. If `attacker_troops > defender_troops`:
   - Set military.owner_id = player_id.
   - Set military.troop_count = max(attacker_troops - defender_troops, 1).
   - Call `dimension_owner_change(territory_id, 'military', player_id)`.
5. If `attacker_troops <= defender_troops`:
   - Set military.troop_count = max(defender_troops - (attacker_troops / 2), 1). Integer division.
   - Ownership does not change.

Returns: `{ "success": true }`

#### `economic_invest(territory_id: INT, player_id: INT)`

Validation:
1. game_state.status == "active" → else `{ "success": false, "error": "Game has ended." }`
2. player_id is 1 or 2
3. territory_id is 1–12 → else `{ "success": false, "error": "Invalid territory." }`
4. player.action_points >= 1 → else `{ "success": false, "error": "Insufficient action points." }`

On success:
1. Decrement player.action_points by 1.
2. Let `current_owner` = economic.owner_id for target territory.
3. Let `current_capital` = economic.capital for target territory.
4. Set economic.capital = current_capital + 5.
5. If `player_id != current_owner`:
   - The new capital (current_capital + 5) is compared against the capital before investment. Since you added 5 to a value that belonged to someone else, your total is now strictly greater than what the previous owner had. Set economic.owner_id = player_id. Call `dimension_owner_change(territory_id, 'economic', player_id)`.
6. If `player_id == current_owner`: no ownership change. Capital increased.

Returns: `{ "success": true }`

### 5.6 Internal Function

#### `dimension_owner_change(territory_id: INT, dimension: STRING, new_owner: INT)`

**Not a reducer.** Regular Rust function called internally.

1. Count territories where military.owner_id = new_owner AND economic.owner_id = new_owner.
2. If count >= 3:
   - Set game_state where key='status' to 'ended'.
   - Set game_state where key='winner' to players[new_owner].player_name.

No return value.

### 5.7 Scheduled Reducer

#### `regenerate_action_points()`

Schedule: every 8 seconds. Use `#[spacetimedb(scheduled)]` with the interval specified in milliseconds (8000).

For each row in players where action_points < 10:
- Increment action_points by 1.
- Set last_regen_at = current server timestamp.

No return value.

---

## 6. CLIENT CONSTANTS

```typescript
// client/src/constants.ts

export const MAX_ACTION_POINTS = 10;
export const ACTION_REGEN_SECONDS = 8;
export const STARTING_ACTION_POINTS = 5;
export const ECONOMIC_INVEST_AMOUNT = 5;
export const WIN_UNIFIED_TERRITORIES = 3;
export const TOTAL_TERRITORIES = 12;

export const TERRITORY_NAMES: Record<number, string> = {
  1: "North America", 2: "Central America", 3: "Caribbean",
  4: "South America", 5: "Western Europe", 6: "North Africa",
  7: "Southern Africa", 8: "Eastern Europe", 9: "Middle East",
  10: "South Asia", 11: "East Asia", 12: "Oceania"
};

export const ADJACENCY: Record<number, number[]> = {
  1: [2, 3, 5], 2: [1, 3, 4], 3: [1, 2, 4, 6],
  4: [2, 3, 6, 7], 5: [1, 6, 8], 6: [3, 4, 5, 7, 9],
  7: [4, 6], 8: [5, 9, 10], 9: [6, 8, 10, 11],
  10: [8, 9, 11, 12], 11: [9, 10, 12], 12: [10, 11]
};

export const PLAYER_COLORS: Record<number, string> = {
  1: "#4488FF",
  2: "#FF4444"
};
```

---

## 7. CLIENT TYPES

```typescript
// client/src/types.ts

export interface MilitaryRow {
  territory_id: number;
  owner_id: number;
  troop_count: number;
}

export interface EconomicRow {
  territory_id: number;
  owner_id: number;
  capital: number;
}

export interface PlayerRow {
  player_id: number;
  player_name: string;
  color: string;
  action_points: number;
  last_regen_at: number;
}

export interface GameStateRow {
  key: string;
  value: string;
}

export interface TerritoryState {
  territory_id: number;
  military_owner: number;
  troop_count: number;
  economic_owner: number;
  capital: number;
}
```

---

## 8. CLIENT UTILITIES

```typescript
// client/src/utils/territoryHelpers.ts

import { ADJACENCY, TERRITORY_NAMES } from '../constants';
import { MilitaryRow, EconomicRow } from '../types';

export function getAdjacentTerritories(territoryId: number): number[] {
  return ADJACENCY[territoryId] || [];
}

export function isAdjacent(territoryId: number, targetId: number): boolean {
  return getAdjacentTerritories(territoryId).includes(targetId);
}

export function countUnifiedTerritories(
  military: MilitaryRow[],
  economic: EconomicRow[],
  playerId: number
): number {
  let count = 0;
  for (const m of military) {
    if (m.owner_id === playerId) {
      const e = economic.find(row => row.territory_id === m.territory_id);
      if (e && e.owner_id === playerId) {
        count++;
      }
    }
  }
  return count;
}

export function getValidMilitaryTargets(
  military: MilitaryRow[],
  playerId: number
): number[] {
  const ownedTerritories = military
    .filter(row => row.owner_id === playerId)
    .map(row => row.territory_id);
  
  const adjacentToOwned = new Set<number>();
  for (const t of ownedTerritories) {
    for (const adj of getAdjacentTerritories(t)) {
      adjacentToOwned.add(adj);
    }
  }
  
  return Array.from(adjacentToOwned).filter(t => {
    const m = military.find(row => row.territory_id === t);
    return m && m.owner_id !== playerId;
  });
}

export function getTerritoryName(territoryId: number): string {
  return TERRITORY_NAMES[territoryId] || `Territory ${territoryId}`;
}
```

---

## 9. COMPONENT SPECIFICATIONS

### 9.1 `useSubscriptions.ts`

Custom hook that manages all SpacetimeDB subscriptions.

- Subscribes to all 4 tables: military, economic, players, game_state.
- On initial load: receives full table contents. Stores in React state via `useState`.
- On incremental updates: merges changed rows into state. Finds row by primary key and replaces, or adds if new.
- Returns: `{ military: MilitaryRow[], economic: EconomicRow[], players: PlayerRow[], gameState: GameStateRow[] }`.
- Uses SpacetimeDB client SDK. The exact subscription API depends on the SDK version — use the idiomatic pattern for table subscriptions.
- Handles connection errors gracefully (log to console, retry).

### 9.2 `App.tsx`

Top-level component.

- Reads player_id from URL parameter: `const params = new URLSearchParams(window.location.search); const playerId = parseInt(params.get('player') || '1');`
- Calls `useSubscriptions()` to get live table data.
- Derives state: current player's data, unified counts per player, game status.
- Calls `start_game()` once on mount if gameState has no 'status' key with value 'active' or 'ended'.
- Manages highlight state for drag-and-drop: `highlightedTerritories` array of territory IDs.
- Layout (top to bottom, left to right):
  - Top-left: PlayerIndicator
  - Top-right: ActionBar
  - Center: Map (fills remaining space)
  - Bottom: CardHand (fixed bar)
  - Overlay: VictoryScreen (when game ended)
- Passes data as props to all children.

### 9.3 `Map.tsx`

- Receives: military, economic, players, highlightedTerritories, currentPlayerId.
- Renders 12 hexagon Territory components arranged in a honeycomb grid.
- Three continent groups: Americas (left, 4 hexes), Europe-Africa (center, 4 hexes), Asia-Oceania (right, 4 hexes).
- Each continent group has a subtle background tint ellipse behind its hexes.
- Cross-continent adjacency lines (1px, #334455) connect hexes where adjacency exists but no shared edge.
- All styling per `../AESTHETIC.md` Section 4.

### 9.4 `Territory.tsx`

- Receives: territory_id, military_owner, troop_count, economic_owner, capital, isHighlighted, currentPlayerId.
- Renders a hexagon (70px flat-to-flat, ~80px wide) with X-split internal quadrants.
- Four triangular quadrants meet at center. Top-left and bottom-right = Military and Economic (Slice 1). Top-right and bottom-left = neutral (#2A2A3E).
- Quadrant fill = owning player's color. Neutral if no owner.
- Internal divider lines: 0.5px, #334455.
- Territory name below: Orbitron, 10px, text-primary.
- States: default, owned (brighter border), highlighted (gold glow), hover (scale 1.08).
- All styling per `../AESTHETIC.md` Section 4.

### 9.5 `CardHand.tsx`

- Receives: actionPoints, currentPlayerId.
- Wraps the card area with dnd-kit's `<DndContext>`.
- Handles `onDragStart`: determines card type being dragged. Computes valid targets using `getValidMilitaryTargets` (for Military cards) or all territory IDs (for Economic cards). Sets highlightedTerritories in parent via callback.
- Handles `onDragEnd`: determines which territory the card was dropped on. If valid, calls the appropriate reducer via SpacetimeDB client SDK. Clears highlights.
- Renders ActionCard components in a horizontal row at the bottom of the screen.
- Number of cards = actionPoints. Cards are a mix of Military and Economic types, alternating. First card Military, second Economic, third Military, etc.
- Fixed position at bottom of viewport. Background: dark semi-transparent.

### 9.6 `ActionCard.tsx`

- Receives: cardType ('military' | 'economic'), isDisabled, playerColor.
- Uses dnd-kit's `useDraggable` hook. The draggable ID is the card's index in the hand.
- Military card: red background (#DC2626 or similar), white text "ATTACK" or a sword icon (use text "ATTACK").
- Economic card: gold background (#D97706 or similar), white text "INVEST" or a coin icon (use text "INVEST").
- If isDisabled (actionPoints === 0): grey background, not draggable, cursor not-allowed.
- Card dimensions: approximately 80x50 pixels. Rounded corners. Shadow when draggable.
- While being dragged: card follows cursor with slight transparency.

### 9.7 `ActionBar.tsx`

- Receives: actionPoints, maxActionPoints, playerColor.
- Renders a horizontal bar showing action point status.
- Bar fill: width = (actionPoints / maxActionPoints) * 100%. Background color = playerColor.
- Text overlay: "{actionPoints}/{maxActionPoints}".
- Position: top-right corner of screen.

### 9.8 `PlayerIndicator.tsx`

- Receives: playerId, playerName, playerColor.
- Renders: colored dot (inline circle) + "You are {playerName}".
- Position: top-left corner.
- Small, unobtrusive.

### 9.9 `VictoryScreen.tsx`

- Receives: gameStatus, winner, currentPlayerId, playerNames.
- Renders only when gameStatus === 'ended'.
- Full-screen overlay with semi-transparent dark backdrop (bg-black bg-opacity-70).
- Centered content:
  - Large text: "{winner} wins!"
  - Subtitle: "You win!" (if winner === currentPlayerId) or "You lose." (if not).
  - The winning player's color as an accent.
- No restart button (added in manual polish if time permits). Game state is final.

---

## 10. DRAG-AND-DROP LOGIC

1. Player picks up a card from the hand.
2. `onDragStart` fires:
   - If Military card: compute valid targets via `getValidMilitaryTargets()`. Valid territories are those adjacent to the player's military-owned territories where the player does NOT already own Military.
   - If Economic card: all 12 territories are valid targets.
   - Set highlightedTerritories to the valid target IDs.
3. Valid territories render with a yellow glow. Invalid territories render normally.
4. Player drops the card on a territory.
5. `onDragEnd` fires:
   - If the drop target is a valid territory: call the appropriate reducer with `territory_id` and `player_id`.
   - If the drop target is invalid or the card is dropped outside any territory: card returns to hand. No reducer call.
   - Clear highlightedTerritories.
6. Subscription delivers updated state. Map re-renders. Card hand updates (action points decreased).

---

## 11. PLAYER ASSIGNMENT

- Player 1 opens: `http://localhost:5173/?player=1`
- Player 2 opens: `http://localhost:5173/?player=2`
- Both connect to the same SpacetimeDB instance (configured via environment variable).
- `start_game()` is called by whichever player loads first. It is idempotent — subsequent calls detect existing game state and return immediately.
- Each player sees their own action points and card hand. The map is shared state.
- Player 1 color: #4488FF (blue). Player 2 color: #FF4444 (red).

---

## 12. GENERATION RULES

1. **All arithmetic is integer arithmetic.** No floats in Rust. Use `/` for truncating division.
2. **SpacetimeDB macros:** `#[spacetimedb(table)]` for tables, `#[spacetimedb(reducer)]` for client-callable reducers, `#[spacetimedb(scheduled)]` for the regeneration timer. The scheduled interval is specified in milliseconds.
3. **Single `lib.rs`** for all server code with clear section comments as shown in Section 3.1.
4. **Tailwind CSS for all styling.** No custom CSS files. Use utility classes directly in JSX.
5. **TypeScript strict mode.** All types defined in `types.ts`.
6. **Functional components with hooks.** No class components.
7. **dnd-kit imports:** `import { DndContext, useDraggable } from '@dnd-kit/core'`. Do not use deprecated react-dnd.
8. **Map rendering:** Use React Simple Maps if it simplifies territory positioning. Otherwise use plain SVG `<rect>` elements positioned absolutely. Territories do not need to be real geographic shapes — rounded rectangles are sufficient.
9. **No mock data, no test stubs.** All data comes from SpacetimeDB subscriptions.
10. **Error handling:** Wrap reducer calls in try/catch. Log errors to console. Display user-friendly messages for common failures (insufficient action points).
11. **The frontend must compile** with `npm run build` without errors. The server must compile with `cargo build` without errors.
12. **Visual consistency:** All colors, fonts, spacing, and animations must use the design tokens defined in `../AESTHETIC.md`. Use the Tailwind config from that document. Territory hexagons use the X-split quadrant pattern. Card icons are geometric SVGs. No emojis. No em dashes. No custom CSS files.

---

## 13. WHAT NOT TO GENERATE

Do NOT generate:
- AI opponents, AI-related tables, LLM integration
- Cultural or Covert dimension tables
- Cross-dimension bonuses
- Query bar, query reducers, canned queries
- Event feed table, event ticker
- Intel panel
- Debug panel
- Any features from Slices 2, 3, or 4
- Any files not listed in Section 3

This is a two-player, two-dimension game. Nothing more.

---

## 14. SUCCESS CRITERIA

After generation, the application must:

1. **Compile** — `cargo build` for server, `npm run build` for client. Zero errors.
2. **Start** — Server runs, frontend loads in browser at `localhost:5173`.
3. **Render map** — 12 territories visible with two-color quadrants matching seed data. North America is all blue. Western Europe is all red. Caribbean is all blue.
4. **Accept actions** — Dragging a card onto a valid territory calls the reducer. Action points decrement. Territory ownership changes on successful attack/invest.
5. **Sync in real time** — Changes in one browser tab appear in the other tab within 1 second.
6. **Regenerate points** — Action points increment by 1 every 8 seconds, cap at 10.
7. **Trigger victory** — When a player unifies 3 territories, victory overlay appears on both tabs. Actions are blocked.

---

## End of Slice 1 Masterplan

Generate the complete Slice 1 application as specified. Output every file in the file tree (Section 3) in the generation order (Section 4). Follow the server specification (Section 5), client specifications (Sections 6–9), and generation rules (Section 12). Do not generate anything from Sections 13 or anything outside the scope of this document.