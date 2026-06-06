# RISK: DOMINION — SLICE 1 INTERFACE CONTRACT

## Version 1.0
## Scope: Two Players, Two Dimensions, Core Gameplay
## Target: Claude Code Generation — SpacetimeDB Server + React Frontend

---

## 1. TABLE SCHEMAS

### 1.1 `military`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `territory_id` | INT | PRIMARY KEY | Territory identifier (1–12) |
| `owner_id` | INT | NOT NULL | Player who controls this dimension (1 or 2) |
| `troop_count` | INT | NOT NULL DEFAULT 0 | Number of troops stationed |

**Combat resolution:** `attacker_troops > defender_troops` flips `owner_id` to attacker. Ties go to defender.

---

### 1.2 `economic`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `territory_id` | INT | PRIMARY KEY | Territory identifier (1–12) |
| `owner_id` | INT | NOT NULL | Player who controls this dimension (1 or 2) |
| `capital` | INT | NOT NULL DEFAULT 0 | Accumulated capital investment |

**Ownership flip:** When a player's `capital` exceeds the current `owner_id`'s `capital`, `owner_id` flips to that player.

---

### 1.3 `players`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `player_id` | INT | PRIMARY KEY | Player identifier (1 or 2) |
| `player_name` | STRING | NOT NULL | Display name |
| `color` | STRING | NOT NULL | Hex color code for map and UI |
| `action_points` | INT | NOT NULL DEFAULT 5 | Current action points (0–10) |
| `last_regen_at` | BIGINT | NOT NULL | Unix timestamp (milliseconds) of last regeneration |

---

### 1.4 `game_state`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `key` | STRING | PRIMARY KEY | State key name |
| `value` | STRING | NOT NULL | State value |

**Required keys:**

| key | Initial value | Description |
|-----|---------------|-------------|
| `status` | `active` | Game status: `active` or `ended` |
| `winner` | (empty string) | Winning player_name when status is `ended` |
| `started_at` | (server timestamp) | Unix timestamp (ms) of game start |

---

## 2. TERRITORY DEFINITIONS

### 2.1 Territory List

| territory_id | name | continent |
|-------------|------|-----------|
| 1 | North America | Americas |
| 2 | Central America | Americas |
| 3 | Caribbean | Americas |
| 4 | South America | Americas |
| 5 | Western Europe | Europe-Africa |
| 6 | North Africa | Europe-Africa |
| 7 | Southern Africa | Europe-Africa |
| 8 | Eastern Europe | Europe-Africa |
| 9 | Middle East | Asia-Oceania |
| 10 | South Asia | Asia-Oceania |
| 11 | East Asia | Asia-Oceania |
| 12 | Oceania | Asia-Oceania |

### 2.2 Adjacency Map

| territory_id | adjacent_territory_ids |
|-------------|------------------------|
| 1 | [2, 3, 5] |
| 2 | [1, 3, 4] |
| 3 | [1, 2, 4, 6] |
| 4 | [2, 3, 6, 7] |
| 5 | [1, 6, 8] |
| 6 | [3, 4, 5, 7, 9] |
| 7 | [4, 6] |
| 8 | [5, 9, 10] |
| 9 | [6, 8, 10, 11] |
| 10 | [8, 9, 11, 12] |
| 11 | [9, 10, 12] |
| 12 | [10, 11] |

---

## 3. INITIAL BOARD STATE (SEED DATA)

### 3.1 Players

| player_id | player_name | color | action_points | last_regen_at |
|-----------|-------------|-------|---------------|---------------|
| 1 | Player 1 | #4488FF | 5 | (server timestamp at insert) |
| 2 | Player 2 | #FF4444 | 5 | (server timestamp at insert) |

### 3.2 Game State

| key | value |
|-----|-------|
| status | active |
| winner | |
| started_at | (server timestamp at insert) |

### 3.3 Dimension Tables

| Territory | mil_owner | mil_troops | eco_owner | eco_capital |
|-----------|-----------|------------|-----------|-------------|
| 1 (N America) | 1 | 10 | 1 | 20 |
| 2 (C America) | 1 | 5 | 2 | 8 |
| 3 (Caribbean) | 1 | 4 | 1 | 6 |
| 4 (S America) | 2 | 6 | 1 | 10 |
| 5 (W Europe) | 2 | 10 | 2 | 20 |
| 6 (N Africa) | 2 | 5 | 1 | 8 |
| 7 (S Africa) | 2 | 4 | 2 | 7 |
| 8 (E Europe) | 1 | 5 | 2 | 9 |
| 9 (Mid East) | 2 | 6 | 1 | 8 |
| 10 (S Asia) | 1 | 5 | 2 | 10 |
| 11 (E Asia) | 2 | 8 | 2 | 15 |
| 12 (Oceania) | 1 | 4 | 1 | 7 |

**Player 1 home:** North America (territory 1) — unified (both dimensions owned by Player 1).
**Player 2 home:** Western Europe (territory 5) — unified (both dimensions owned by Player 2).

---

## 4. REDUCER SIGNATURES

### 4.1 Client-Facing Reducers

#### 4.1.1 `start_game()`

**Called by:** Frontend on first load (by whichever player connects first).

**Returns:**
```json
{
    "success": true
}
```

**Behavior:**
1. If `game_state` table already has a row where `key = 'status'`, return `{ success: true }` immediately (game already started — idempotent).
2. Insert 2 player rows into `players` (see Section 3.1).
3. Insert 3 rows into `game_state` (see Section 3.2).
4. Insert 12 rows into `military` (see Section 3.3).
5. Insert 12 rows into `economic` (see Section 3.3).
6. Start the `regenerate_action_points` scheduled reducer (8-second interval).

---

#### 4.1.2 `military_attack(territory_id: INT, player_id: INT)`

**Called by:** Frontend when a player drops a Military card onto a territory.

**Validation (in order, return first failure):**
1. `game_state.status` must be `active`. Else return `{ success: false, error: "Game has ended." }`.
2. `player_id` must be 1 or 2.
3. `territory_id` must be 1–12. Else return `{ success: false, error: "Invalid territory." }`.
4. Player must have `action_points >= 1`. Else return `{ success: false, error: "Insufficient action points." }`.
5. Player must own Military in at least one territory adjacent to `territory_id`. Else return `{ success: false, error: "No adjacent territory controlled." }`.

**Behavior on success:**
1. Decrement player's `action_points` by 1.
2. Find the adjacent territory where the player owns Military with the highest `troop_count`. Let `attacker_troops` = that troop count.
3. Let `defender_troops` = `military.troop_count` for `territory_id`.
4. If `attacker_troops > defender_troops`:
   - `old_owner` = `military.owner_id` for this territory.
   - Set `military.owner_id` = `player_id`.
   - Set `military.troop_count` = `attacker_troops - defender_troops`. If result < 1, set to 1.
   - Call `dimension_owner_change(territory_id, 'military', player_id)`.
5. If `attacker_troops <= defender_troops`:
   - Set `military.troop_count` = `defender_troops - (attacker_troops / 2)`. Integer division. If result < 1, set to 1.
   - (Ownership does not change.)

**Returns on success:**
```json
{
    "success": true
}
```

---

#### 4.1.3 `economic_invest(territory_id: INT, player_id: INT)`

**Called by:** Frontend when a player drops an Economic card onto a territory.

**Validation (in order, return first failure):**
1. `game_state.status` must be `active`. Else return `{ success: false, error: "Game has ended." }`.
2. `player_id` must be 1 or 2.
3. `territory_id` must be 1–12. Else return `{ success: false, error: "Invalid territory." }`.
4. Player must have `action_points >= 1`. Else return `{ success: false, error: "Insufficient action points." }`.

**Behavior on success:**
1. Decrement player's `action_points` by 1.
2. Let `current_capital` = `economic.capital` for `territory_id`.
3. Let `current_owner` = `economic.owner_id` for `territory_id`.
4. Set `economic.capital` = `current_capital + 5`.
5. If `player_id != current_owner` AND `(current_capital + 5) > current_capital`:
   - This is always true when investing in a territory you don't own (you just added 5, which exceeds the previous capital that you didn't own). Clarified logic:
   - If `player_id != current_owner` AND `economic.capital > (the capital value before your investment)`:
     - `old_owner` = `current_owner`.
     - Set `economic.owner_id` = `player_id`.
     - Call `dimension_owner_change(territory_id, 'economic', player_id)`.
   - Simplified: If `player_id != current_owner`: after adding 5, if `economic.capital` is strictly greater than what `current_owner` had before (which is always true since you just added 5 to a value that wasn't yours), flip ownership. **Implementation note:** Compare `economic.capital` (after adding 5) against the capital value that existed before the invest. Since the previous owner's capital is unchanged and you just added 5 to it, your total now exceeds theirs. Flip ownership.
6. If `player_id == current_owner`: no ownership change. Capital increases by 5.

**Returns on success:**
```json
{
    "success": true
}
```

---

### 4.2 Internal Function

#### 4.2.1 `dimension_owner_change(territory_id: INT, dimension: STRING, new_owner: INT)`

**Called by:** `military_attack` and `economic_invest` after an ownership flip.

**Not a reducer.** This is a regular Rust function called internally within the same transaction.

**Behavior:**
1. Count territories where `military.owner_id = new_owner` AND `economic.owner_id = new_owner`.
2. If count >= 3:
   - Set `game_state` row where `key = 'status'` to `'ended'`.
   - Set `game_state` row where `key = 'winner'` to `players[new_owner].player_name`.

**No return value.**

---

### 4.3 Scheduled Reducer

#### 4.3.1 `regenerate_action_points()`

**Schedule:** Every 8 seconds.

**Behavior:**
1. For each row in `players` where `action_points < 10`:
   - Increment `action_points` by 1.
   - Set `last_regen_at` = current server timestamp (milliseconds).

**No return value.** Clients receive updated `players` table via subscription.

---

## 5. SUBSCRIPTIONS

The frontend subscribes to the following tables in full. No server-side filters.

| Subscription | Table | Client Usage |
|-------------|-------|--------------|
| `subscribe_military` | `military` | Render Military (left) quadrant on each territory, show troop count on hover |
| `subscribe_economic` | `economic` | Render Economic (right) quadrant on each territory, show capital on hover |
| `subscribe_players` | `players` | Render action point bar for current player, display player colors |
| `subscribe_game_state` | `game_state` | Show victory overlay when status is `ended`, display winner name |

**Subscription semantics:**
- On initial subscribe: client receives all rows in the table.
- On subsequent updates: client receives only changed rows.
- Client merges updates into local state.

---

## 6. CONSTANTS

### 6.1 Server Constants (`lib.rs`)

```rust
const MAX_ACTION_POINTS: i32 = 10;
const ACTION_REGEN_SECONDS: u64 = 8;
const STARTING_ACTION_POINTS: i32 = 5;
const ECONOMIC_INVEST_AMOUNT: i32 = 5;
const WIN_UNIFIED_TERRITORIES: i32 = 3;
const TOTAL_TERRITORIES: i32 = 12;
const MIN_TROOPS: i32 = 1;
```

### 6.2 Client Constants (`constants.ts`)

```typescript
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

## 7. WIRE FORMATS

### 7.1 Reducer Returns

All client-callable reducers return JSON with the following shapes:

**Success:**
```json
{
    "success": true
}
```

**Failure:**
```json
{
    "success": false,
    "error": "Insufficient action points."
}
```

Possible error strings:
- `"Game has ended."`
- `"Invalid territory."`
- `"Insufficient action points."`
- `"No adjacent territory controlled."`

### 7.2 Subscription Data

Subscriptions deliver arrays of rows matching the table schemas in Section 1. Example:

```json
// subscribe_military initial payload
[
    { "territory_id": 1, "owner_id": 1, "troop_count": 10 },
    { "territory_id": 2, "owner_id": 1, "troop_count": 5 },
    ...
]
```

---

## 8. IMPLEMENTATION NOTES FOR CLAUDE CODE

### 8.1 Server (`/server/src/lib.rs`)

- Single file. All tables, reducers, scheduled reducers, and constants.
- Use `#[spacetimedb(table)]` macro for each table definition.
- Use `#[spacetimedb(reducer)]` for client-callable reducers.
- Use `#[spacetimedb(scheduled)]` for the regeneration timer.
- `dimension_owner_change` is a regular `fn`, not a reducer.
- All arithmetic is integer arithmetic. Use `/` for truncating division.
- The adjacency map should be defined as a constant lookup: `fn get_adjacent(territory_id: i32) -> Vec<i32>`.
- The `start_game` reducer must be idempotent — check if game_state already has a 'status' key.
- `last_regen_at` must be set to the current server timestamp on insert and on each regeneration tick. Use `std::time::SystemTime` or SpacetimeDB's timestamp function.

### 8.2 Client

- React 18 + TypeScript 5.3 + Vite.
- dnd-kit for drag-and-drop (`@dnd-kit/core`).
- Plain SVG for the map. Hexagonal territories per `../AESTHETIC.md` Section 4.
- Tailwind CSS for all styling. No custom CSS files.
- Player ID from URL parameter: `?player=1` or `?player=2`. Default to 1 if absent.
- `useSubscriptions` hook manages all four table subscriptions.
- Card hand renders one card per available action point. Cards are draggable only when action_points > 0.
- Military card: red background, sword icon (or text "ATTACK"), draggable only onto adjacent military-controlled territories.
- Economic card: gold background, coin icon (or text "INVEST"), draggable onto any territory.
- On drag start: compute valid targets. Valid territories glow. Invalid territories reject drop.
- Territory component: two colored halves (left = military owner color, right = economic owner color). White border on territories the current player owns in either dimension.
- Victory screen: full-screen overlay when `game_state.status === 'ended'`. Shows "{winner} wins!" with "You win!" or "You lose." based on player_id.
- Territory hexagons: X-split quadrant pattern per `../AESTHETIC.md` Section 4.2.
- Card icons: geometric SVGs per `../AESTHETIC.md` Section 13. No emojis.
- All colors and fonts: use Tailwind tokens from `../AESTHETIC.md` Section 15.

---

## End of Slice 1 Interface Contract

This document specifies every table column type, reducer signature, subscription shape, seed data value, constant, wire format, and implementation note required to generate the complete Slice 1 SpacetimeDB server module and React frontend. No design decisions remain. No ambiguity remains. Ready for generation.