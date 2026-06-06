# RISK: DOMINION — SLICE 4 MASTERPLAN

## Version 1.0
## Scope: Query System, Event Ticker, Autocomplete
## Target: Claude Code Generation — Evolving the `app/` Codebase (Slice 4 of 7)

---

## 0. DOCUMENT PURPOSE

This document specifies how to evolve the working `risk-dominion/app/` codebase (as it stands after Slice 3, tagged `slice-3-complete`) to add the query system, event ticker, and Tab autocomplete. Read this document in full. Read the existing `app/` codebase. Apply the changes specified here.

Do not regenerate prior slices. Do not create a new project. Modify the existing files in place under `risk-dominion/app/`. Mark each output file as MODIFIED or NEW.

This is Slice 4 of 7. After this slice the game gains its query and narrative layer; Slices 5 through 7 still follow.

---

## 1. BEFORE YOU BEGIN

Read every existing file in the `app/` codebase:
- `app/server/Cargo.toml`
- `app/server/src/lib.rs`
- `app/client/src/App.tsx`
- `app/client/src/constants.ts`
- `app/client/src/types.ts`
- `app/client/src/hooks/useSubscriptions.ts`
- `app/client/src/utils/territoryHelpers.ts`
- `app/client/src/components/Map.tsx`
- `app/client/src/components/Territory.tsx`
- `app/client/src/components/CardHand.tsx`
- `app/client/src/components/ActionCard.tsx`
- `app/client/src/components/IntelPanel.tsx`
- `app/client/src/components/ActionBar.tsx`
- `app/client/src/components/VictoryScreen.tsx`

Understand the current code before making any changes. Then apply the modifications in this document in the order specified.

---

## 2. FILE LIST

Output each file in the order specified in Section 3. Mark every file as MODIFIED or NEW.

**MODIFIED:**
1. `server/src/lib.rs`
2. `client/src/constants.ts`
3. `client/src/types.ts`
4. `client/src/hooks/useSubscriptions.ts`
5. `client/src/components/Map.tsx`
6. `client/src/App.tsx`

**NEW:**
7. `client/src/components/EventTicker.tsx`
8. `client/src/components/QueryBar.tsx`
9. `client/src/components/ResultsPanel.tsx`

---

## 3. GENERATION ORDER

Generate changes in this sequence. Each file must only reference types and components that already exist in the `app/` codebase (as of `slice-3-complete`) or were generated earlier in this sequence.

1. `server/src/lib.rs` (MODIFIED)
2. `client/src/constants.ts` (MODIFIED)
3. `client/src/types.ts` (MODIFIED)
4. `client/src/hooks/useSubscriptions.ts` (MODIFIED)
5. `client/src/components/EventTicker.tsx` (NEW)
6. `client/src/components/QueryBar.tsx` (NEW)
7. `client/src/components/ResultsPanel.tsx` (NEW)
8. `client/src/components/Map.tsx` (MODIFIED)
9. `client/src/App.tsx` (MODIFIED)

---

## 4. SERVER MODIFICATIONS

### 4.1 New Table

Add to the TABLES section. `event_feed` is a public event/log table: reducers append rows to it as a side effect, and clients subscribe to render the ticker.

```rust
#[spacetimedb::table(accessor = event_feed, public)]
pub struct EventFeed {
    #[primary_key]
    #[auto_inc]
    pub id: u64,
    pub event_at: i64,            // ms since epoch, from ctx.timestamp
    pub event_text: String,
    pub territory_id: Option<i32>,
    pub player_id: Option<i32>,
    pub event_type: String,       // 'military' | 'economic' | 'cultural' | 'covert' | 'victory' | 'system'
}
```

`id` is `#[primary_key] #[auto_inc]` (insert with `id: 0` and the database assigns it). `event_at` is `i64` milliseconds derived from `ctx.timestamp` (use the module's `now_millis(ctx)` helper), never wall-clock time. `territory_id` and `player_id` are nullable (`Option<i32>`).

### 4.2 Event Writes in Existing Reducers

Every reducer that changes game state appends an `EventFeed` row as its **last operation**, after the primary state change has succeeded. Because reducers run inside a single transaction, the insert participates in the same tx as the state change; there is no separate "result handler" to manage. The event is a pure side effect of the reducer, written via `ctx.db.event_feed().insert(...)`.

The AI action helpers (`do_military_attack`, `do_economic_invest`, `do_deploy_agent`) are shared by both player reducers and the AI reasoning cycle, so writing the event inside those helpers means AI actions are narrated automatically. Use the module's existing name helpers (`player_display_name`, `territory_name`) to render names from IDs.

#### `start_game`

After all seed data is inserted:

```rust
ctx.db.event_feed().insert(EventFeed {
    id: 0, // auto-increment
    event_at: now_millis(ctx),
    event_text: "Game started. Four factions vie for control.".to_string(),
    territory_id: None,
    player_id: None,
    event_type: "system".to_string(),
});
```

#### `military_attack` (write inside `do_military_attack`)

After a successful flip (ownership changed):

```rust
ctx.db.event_feed().insert(EventFeed {
    id: 0,
    event_at: now_millis(ctx),
    event_text: format!("{} seized military control of {} from {}.", attacker_name, territory_name(territory_id), defender_name),
    territory_id: Some(territory_id),
    player_id: Some(attacker_id),
    event_type: "military".to_string(),
});
```

After a repelled attack (ownership unchanged):

```rust
ctx.db.event_feed().insert(EventFeed {
    id: 0,
    event_at: now_millis(ctx),
    event_text: format!("{}'s attack on {} was repelled by {}.", attacker_name, territory_name(territory_id), defender_name),
    territory_id: Some(territory_id),
    player_id: Some(defender_id),
    event_type: "military".to_string(),
});
```

Use `player_display_name(ctx, id)` to get names from IDs. Use `territory_name(id)` for territory names.

#### `economic_invest` (write inside `do_economic_invest`)

After an ownership flip:

```rust
ctx.db.event_feed().insert(EventFeed {
    id: 0,
    event_at: now_millis(ctx),
    event_text: format!("{} gained economic control of {} from {}.", player_name, territory_name(territory_id), old_owner_name),
    territory_id: Some(territory_id),
    player_id: Some(player_id),
    event_type: "economic".to_string(),
});
```

After investment with no flip:

```rust
ctx.db.event_feed().insert(EventFeed {
    id: 0,
    event_at: now_millis(ctx),
    event_text: format!("{} invested in {}. Capital now {}.", player_name, territory_name(territory_id), new_capital),
    territory_id: Some(territory_id),
    player_id: Some(player_id),
    event_type: "economic".to_string(),
});
```

#### `deploy_agent` (write inside `do_deploy_agent`)

After agent deployment:

```rust
ctx.db.event_feed().insert(EventFeed {
    id: 0,
    event_at: now_millis(ctx),
    event_text: format!("{} deployed an agent in {}.", player_name, territory_name(territory_id)),
    territory_id: Some(territory_id),
    player_id: Some(player_id),
    event_type: "covert".to_string(),
});
```

#### `cultural_spread_tick`

Inside the loop, after a cultural flip (ownership changed):

```rust
ctx.db.event_feed().insert(EventFeed {
    id: 0,
    event_at: now_millis(ctx),
    event_text: format!("{}'s cultural influence spread to {}, displacing {}.", new_owner_name, territory_name(territory_id), old_owner_name),
    territory_id: Some(territory_id),
    player_id: Some(new_owner_id),
    event_type: "cultural".to_string(),
});
```

#### `dimension_owner_change`

After the win check, if the territory became newly unified (all four dimensions same owner):

```rust
ctx.db.event_feed().insert(EventFeed {
    id: 0,
    event_at: now_millis(ctx),
    event_text: format!("{} unified {} — {} of 5 toward victory.", player_name, territory_name(territory_id), unified_count),
    territory_id: Some(territory_id),
    player_id: Some(player_id),
    event_type: "victory".to_string(),
});
```

If the win check returns true (game over):

```rust
ctx.db.event_feed().insert(EventFeed {
    id: 0,
    event_at: now_millis(ctx),
    event_text: format!("{} wins! All five territories unified.", winner_name),
    territory_id: None,
    player_id: Some(winner_id),
    event_type: "victory".to_string(),
});
```

#### `ai_reasoning_cycle` (the scheduled procedure)

The AI reasoning cycle is a scheduled procedure. Its action-application step runs inside `do_military_attack` / `do_economic_invest` / `do_deploy_agent`, so AI moves are narrated automatically by the event writes added to those helpers. For the failure case (the Claude call errors or times out), write a system event inside the cycle's commit transaction (`ctx.with_tx`):

```rust
tx.db.event_feed().insert(EventFeed {
    id: 0,
    event_at: now_millis(tx),
    event_text: format!("{}'s command appears to be in disarray.", ai_name),
    territory_id: None,
    player_id: Some(ai_player_id),
    event_type: "system".to_string(),
});
```

### 4.3 New Procedures

All three new query functions are **procedures**, not reducers. They both (a) call Claude over `ctx.http` and (b) return structured data to the caller. Reducers can do neither: reducers are sandboxed (no HTTP) and cannot return values to clients. Each procedure follows the module's established pattern: snapshot the board inside a `ctx.with_tx(|tx| ...)`, drop the tx, call Claude via the shared `anthropic_call(ctx, ...)` helper, parse the response, and return a `#[derive(SpacetimeType)]` struct. On any error, return the struct's defined error fallback (never panic).

Define the procedure return types alongside the other PROCEDURE RETURN TYPES:

```rust
#[derive(SpacetimeType)]
pub struct DataTable {
    pub columns: Vec<String>,
    pub rows: Vec<Vec<String>>,
}

#[derive(SpacetimeType)]
pub struct QueryResult {
    pub summary: String,
    pub highlighted_territories: Vec<i32>,
    pub data_table: DataTable,
}

#[derive(SpacetimeType)]
pub struct AutocompleteResult {
    pub suggestions: Vec<String>,
}
```

Reuse `anthropic_call(ctx, &api_key, &model, &system, &user, max_tokens, timeout_secs)` for the HTTP call (the same helper the AI reasoning cycle uses). Read `anthropic_api_key` and `anthropic_model` from the private `module_config` table (via `config_value`), never from environment variables.

#### `query_database(query: String) -> QueryResult`

1. Build game state snapshot: all rows from military, economic, cultural, covert, players. Include adjacency map, territory names, unified counts. (Snapshot inside `ctx.with_tx`.)
2. Construct prompt:

```
You are a database query translator for the game Risk: Dominion. The game has 12 territories, 4 players (Player, Zhao, Consortium, Prophet), and 4 dimensions (Military, Economic, Cultural, Covert).

Current game state:
{full game state snapshot}

A player asks: "{query}"

Translate this into a structured response. Return ONLY valid JSON with this exact shape:
{
  "summary": "A clear one-sentence answer to the question.",
  "highlighted_territories": [territory_id, ...],
  "data_table": {
    "columns": ["Column Name", ...],
    "rows": [["value", ...], ...]
  }
}

Rules:
- summary: concise, informative. Use player names and territory names, not IDs.
- highlighted_territories: array of territory_ids most relevant. Empty array [] if none.
- data_table: use territory and player names in rows. Numbers can be raw. If no data, return empty columns and rows.
- If the query is unanswerable, set summary to "I couldn't understand that question. Try asking about territory ownership, player strength, or strategic positioning." and return empty arrays.
```

3. Drop the snapshot tx, then call `anthropic_call` with this prompt as the user message (and a short system message describing the JSON contract). Max tokens: 500. Timeout: 10s.
4. Parse the returned JSON text into `QueryResult` and return it.
5. On any error (HTTP failure, timeout, unparseable JSON): return the fallback `QueryResult { summary: "Query processing failed. Try a canned query or rephrase your question.".to_string(), highlighted_territories: vec![], data_table: DataTable { columns: vec![], rows: vec![] } }`.

#### `get_canned_query(query_id: i32) -> QueryResult`

1. Validate query_id is 0–9. If out of range, return the error-fallback `QueryResult`.
2. Build same game state snapshot as `query_database`.
3. Select the pre-formulated prompt for this query_id (see Section 5).
4. Call `anthropic_call`. Max tokens: 500. Timeout: 10s.
5. Parse and return a `QueryResult`, same shape as `query_database`.
6. Same error fallback.

#### `autocomplete_query(partial: String) -> AutocompleteResult`

1. Build same game state snapshot.
2. Construct prompt:

```
The player has typed "{partial}" in the query bar of Risk: Dominion. The current game state is:

{full game state snapshot}

Suggest up to 3 intelligent completions for what the player might want to ask, based on the current game state. Consider the player's strategic position, which opponents are strongest, contested territories, and common strategic questions.

Return ONLY a JSON array of strings. Example: ["Where is Zhao strongest?", "Where is Zhao about to attack?", "Where is Zhao's cultural influence?"]

If the partial text is fewer than 3 characters, return an empty array [].
```

3. Call `anthropic_call`. Max tokens: 150. Timeout: 5s.
4. Parse the JSON array of strings into `AutocompleteResult { suggestions }`.
5. On error: return `AutocompleteResult { suggestions: vec![] }`.

---

## 5. CANNED QUERY PROMPTS

Store these as constants in `lib.rs`. Each is a pre-formulated prompt string. The game state snapshot is appended to every prompt by the `get_canned_query` procedure.

**query_id 0:**
```
The player asks: "Where am I weakest?" Analyze the game state. For each territory, count how many of the four dimensions (military, economic, cultural, covert) are owned by the Player (player_id 1). Return territories where the Player owns the fewest dimensions, sorted with the weakest first. Return a summary sentence, an array of highlighted territory_ids, and a data_table with columns: Territory, Dimensions Controlled, Dimensions Lost, Strongest Opponent.
```

**query_id 1:**
```
The player asks: "Show contested territories." Analyze the game state. For each territory, count how many distinct players own at least one dimension there. Return territories with 3 or more distinct owners. Return a summary sentence, an array of highlighted territory_ids, and a data_table with columns: Territory, Number of Factions, Owners.
```

**query_id 2:**
```
The player asks: "Where is Zhao about to attack?" Zhao is player_id 2. Find territories adjacent to Zhao's military-controlled territories where Zhao does NOT already own the Military dimension. Return a summary sentence, an array of highlighted territory_ids, and a data_table with columns: Territory, Current Military Owner, Zhao's Adjacent Troops.
```

**query_id 3:**
```
The player asks: "Which territories are closest to unification?" For each player, count how many dimensions they own in each territory. Return territories where any player owns exactly 3 dimensions (one away from unifying all 4). Return a summary sentence, an array of highlighted territory_ids, and a data_table with columns: Territory, Player, Missing Dimension, Current Owner of Missing Dimension.
```

**query_id 4:**
```
The player asks: "Show my economic dominance." Return all territories where the Player (player_id 1) owns the Economic dimension. Sort by capital descending. Return a summary sentence including total capital across all owned territories, an array of highlighted territory_ids, and a data_table with columns: Territory, Your Capital, Runner-Up Capital, Margin.
```

**query_id 5:**
```
The player asks: "Where is my covert presence too thin?" Find territories where the Player has 0 agents (covert.owner_id != 1 or agent_count = 0) but where AI opponents have military or economic presence. Return a summary sentence, an array of highlighted territory_ids, and a data_table with columns: Territory, Dominant Opponent, Opponent Military, Opponent Economic.
```

**query_id 6:**
```
The player asks: "What is the Consortium's strongest dimension?" The Consortium is player_id 3. Count how many territories the Consortium owns for each of the four dimensions. Return the dimension with the highest count. Return a summary sentence naming the dimension and count, an array of highlighted territory_ids where the Consortium owns that dimension, and a data_table with columns: Dimension, Territories Controlled, Percentage of Map.
```

**query_id 7:**
```
The player asks: "Where is cultural influence spreading fastest?" Find territories where the Cultural owner is different from the territory's Military or Economic owner, sorted by influence_pct descending. Return a summary sentence, an array of highlighted territory_ids (top 5), and a data_table with columns: Territory, Cultural Owner, Influence %, Territory Military Owner.
```

**query_id 8:**
```
The player asks: "Show me territories with cross-dimension bonuses." For the Player (player_id 1), find territories where the Player owns at least 2 of the 4 dimensions. For each, list which dimensions the Player owns and which bonuses are active (Military->Economic +1 invest, Economic->Cultural +15% pressure, Cultural->Covert +10% effective agents, Covert->Military +agent_count to attack). Return a summary sentence, an array of highlighted territory_ids, and a data_table with columns: Territory, Dimensions Owned, Active Bonuses.
```

**query_id 9:**
```
The player asks: "Who is winning?" Count unified territories (all 4 dimensions owned by the same player) for each player. A territory is unified when military.owner_id, economic.owner_id, cultural.owner_id, and covert.owner_id are all the same player. Return a summary sentence naming the leader and their count, an array of highlighted territory_ids for all unified territories, and a data_table with columns: Player, Unified Territories, Territory Names, Progress (X/5).
```

---

## 6. CLIENT MODIFICATIONS

### 6.1 `constants.ts` (MODIFIED)

Add:

```typescript
export const QUERY_LLM_TIMEOUT_SECONDS = 10;
export const AUTOCOMPLETE_LLM_TIMEOUT_SECONDS = 5;
export const EVENT_FEED_MAX_DISPLAY = 50;

export const CANNED_QUERY_LABELS: Record<number, string> = {
  0: "Weaknesses",
  1: "Contested",
  2: "Zhao's Targets",
  3: "Near Unification",
  4: "My Economy",
  5: "Thin Covert",
  6: "Consortium",
  7: "Culture Spread",
  8: "My Bonuses",
  9: "Winning"
};
```

### 6.2 `types.ts` (MODIFIED)

Generated bindings (from `spacetime generate`) already supply the `EventFeed` row type, the procedure argument types, and the procedure return types (`QueryResult`, `DataTable`, `AutocompleteResult`) in camelCase. The hand-written `types.ts` only needs any local UI helper aliases that are not covered by generated bindings. If you add aliases, mirror the generated camelCase field names:

```typescript
// EventFeed rows arrive from generated bindings with camelCase fields:
//   { id, eventAt, eventText, territoryId, playerId, eventType }
// QueryResult arrives as: { summary, highlightedTerritories, dataTable: { columns, rows } }
// AutocompleteResult arrives as: { suggestions }
```

Do not redeclare snake_case interfaces; consume the generated types directly where possible.

### 6.3 `useSubscriptions.ts` (MODIFIED)

Add a subscription to the `event_feed` table using the modern `useTable` hook:

```typescript
const [eventFeed, eventFeedReady] = useTable(tables.eventFeed);
```

Include `eventFeed` (and its ready flag, if your hook surfaces them) in the returned object. `useTable` returns `[rows, isReady]`; rows are the `EventFeed` rows in camelCase.

### 6.4 `EventTicker.tsx` (NEW)

**Position:** Fixed bar at the very bottom of the viewport, below the card hand. Height: 28px. Background: `#0D0D1A`. Top border: 1px solid `#334455`.

**Props:** `events: EventFeed[]` (the generated row type), `onEventClick: (territoryId: number | null) => void`, `playerColors: Record<number, string>`.

**Rendering:**
- Take the last 50 events from the `events` array. Slice client-side: `events.slice(-50)`. (Generated row fields are camelCase: `eventText`, `eventType`, `territoryId`, `playerId`.)
- Render them as a single scrolling line. Events scroll from right to left continuously. Linear CSS animation, approximately 30px per second.
- Each event in the line consists of:
  - An icon: a small geometric SVG shape (12x12px) based on `event_type`:
    - `military`: upward-pointing triangle (same as the Military card icon, scaled down).
    - `economic`: circle with vertical line (same as Economic card icon, scaled down).
    - `cultural`: a diamond shape (rotated square).
    - `covert`: concentric circles (same as Covert card icon, scaled down).
    - `victory`: a small hexagon outline.
    - `system`: a small dash or horizontal line.
    All icons are monochrome, colored `text-secondary` (#8899AA).
  - A colored square indicator (8×8px, 2px border radius) filled with the player's color from `playerColors`. If `player_id` is null, use gray (`#555555`).
  - The `eventText` string in JetBrains Mono, 11px, `text-primary` (#E0E0E0).
- Events are separated by a middot character (·) in `text-secondary` with 8px spacing on each side.

**Interaction:**
- CSS `animation-play-state: paused` on hover.
- `onClick` on each event: calls `onEventClick(event.territoryId)`.
- Cursor pointer on hover.

**Implementation:** Use a container with `overflow: hidden` and an inner container that translates horizontally. The inner container's width is determined by the total length of all event texts. CSS `@keyframes scroll` with `transform: translateX(-100%)` over a duration proportional to the content width.

### 6.5 `QueryBar.tsx` (NEW)

**Position:** Top of the screen, full width. Background: `bg-surface` (#1A1A2E). Bottom border: 1px `#334455`. Height: auto (expands with content).

**Props:** `onQuerySubmit: (query: string) => void`, `onCannedQuery: (queryId: number) => void`, `onAutocomplete: (partial: string) => void`, `autocompleteSuggestions: string[]`, `isLoading: boolean`.

**Layout:**
- Top row: a gold `>` prompt character in JetBrains Mono, 14px, `#FFD700`, followed by a text input field. The input has no border, no outline, transparent background, JetBrains Mono 13px, `text-primary`. Placeholder: "Ask anything about the game state..." in `text-secondary` (#8899AA). Full remaining width.
- Second row: 10 pill-shaped buttons in two rows of five. Each pill: height 24px, padding 6px 12px, border-radius 12px, background `bg-surface-alt` (#222240), text Orbitron 11px `text-secondary`. Hover: border 1px `#FFD700`, text becomes `text-primary`. Labels from `CANNED_QUERY_LABELS`.

**Tab Autocomplete:**
- On `onKeyDown`, if key is Tab:
  - `event.preventDefault()`.
  - Call `onAutocomplete(currentInputValue)`.
- When `autocompleteSuggestions` is non-empty, render a dropdown directly below the input:
  - Dark background `bg-surface`, border 1px `#334455`, border-radius 4px.
  - Each suggestion is a row: JetBrains Mono, 12px, `text-primary`, padding 6px 12px.
  - Hovered row: background `bg-surface-alt`.
  - Clicking a suggestion fills the input and closes the dropdown.
  - Pressing Escape closes the dropdown.
  - Pressing Tab while dropdown is open cycles through suggestions.

**Query Submission:**
- On Enter key: call `onQuerySubmit(currentInputValue)`. Clear the input.
- While `isLoading` is true: show a subtle loading indicator (a thin pulsing progress bar at the bottom of the input, or three pulsing dots to the right of the input).

**Canned Query Click:**
- Each pill button calls `onCannedQuery(queryId)` on click.

### 6.6 `ResultsPanel.tsx` (NEW)

**Position:** Between the query bar and the map. Slides down with a 250ms ease-out transition.

**Props:** `result: QueryResult | null`, `onClose: () => void`.

**Rendering (when `result` is not null):**
- Container: `bg-surface` (#1A1A2E) at 95% opacity. Border: 1px `#334455`. Border-radius: 4px. Margin: 8px.
- Close button: small "×" in top-right corner. Orbitron, 16px, `text-secondary`. Hover: `text-primary`. onClick calls `onClose`.
- Summary row: `result.summary` in Orbitron, 14px, `text-primary`. Padding: 8px 12px. Bottom border: 1px `#334455`.
- Data table:
  - Column headers from `result.dataTable.columns`: Orbitron, 11px, `text-accent` (#FFD700). Padding: 6px 12px.
  - Rows from `result.dataTable.rows`: JetBrains Mono, 12px, `text-primary`. Alternating backgrounds: `bg-surface` and `bg-surface-alt` (#222240). Cell padding: 6px 12px.
  - Row bottom border: 0.5px `#334455`.
  - Clicking a column header sorts the table by that column client-side (toggle ascending/descending). Indicate sort direction with a small arrow.

**Empty state:** If `result.dataTable.rows` is empty, show only the summary text with extra padding. No empty table grid.

**When `result` is null:** Component renders nothing (hidden).

### 6.7 `Map.tsx` (MODIFIED)

**Props:** Add `tickerHighlight: number | null`.

**Highlight rendering:**
- `highlightedTerritories` (from queries): existing gold glow behavior from prior slices. Persistent until cleared.
- `tickerHighlight` (from event click): white or light gold pulse. Use a CSS animation: `@keyframes pulse-highlight { 0%, 100% { box-shadow: 0 0 0px rgba(255,255,255,0); } 50% { box-shadow: 0 0 12px 4px rgba(255,255,255,0.4); } }`. Duration 3s, then removed.
- If both apply to the same territory, render both effects (gold glow + white pulse).

Pass `tickerHighlight` to each `Territory` as `isTickerHighlighted={territory_id === tickerHighlight}`.

### 6.8 `App.tsx` (MODIFIED)

**Layout changes:**
- Import and render `QueryBar` at the top of the screen.
- Import and render `ResultsPanel` between `QueryBar` and `Map` (conditional on `queryResult` not null).
- Import and render `EventTicker` at the very bottom, below `CardHand`.
- Layout order (top to bottom): QueryBar, ResultsPanel (conditional), Map, CardHand, EventTicker.
- IntelPanel remains on the left side. ActionBar remains top-right.

**New state:**
```typescript
const [queryResult, setQueryResult] = useState<QueryResult | null>(null);
const [highlightedTerritories, setHighlightedTerritories] = useState<number[]>([]);
const [tickerHighlight, setTickerHighlight] = useState<number | null>(null);
const [autocompleteSuggestions, setAutocompleteSuggestions] = useState<string[]>([]);
const [isQueryLoading, setIsQueryLoading] = useState(false);
```

**Procedure hooks:** Obtain callable procedures via the React hooks. `useProcedure(procedures.x)` returns an async function `(args) => Promise<Ret>`. Procedure calls take a single named-args object.

```typescript
const queryDatabase = useProcedure(procedures.queryDatabase);
const getCannedQuery = useProcedure(procedures.getCannedQuery);
const autocompleteQuery = useProcedure(procedures.autocompleteQuery);
```

**Query handlers (procedures return their result via the awaited promise):**
- `handleQuerySubmit(query: string)`: set `isQueryLoading = true`. `const result = await queryDatabase({ query });`. Set `queryResult`, set `highlightedTerritories` from `result.highlightedTerritories`, set `isQueryLoading = false`.
- `handleCannedQuery(queryId: number)`: same pattern, `await getCannedQuery({ queryId })`.
- `handleAutocomplete(partial: string)`: `const res = await autocompleteQuery({ partial });` then `setAutocompleteSuggestions(res.suggestions)`.
- `handleCloseResults()`: set `queryResult = null`, set `highlightedTerritories = []`.

**Ticker handler:**
- `handleEventClick(territoryId: number | null)`: if `territoryId` is not null, set `tickerHighlight = territoryId`. Start a 3-second timer: `setTimeout(() => setTickerHighlight(null), 3000)`.

**Subscriptions:**
- `eventFeed` from `useSubscriptions`.

**Pass to components:**
- `QueryBar`: `onQuerySubmit`, `onCannedQuery`, `onAutocomplete`, `autocompleteSuggestions`, `isQueryLoading`.
- `ResultsPanel`: `result={queryResult}`, `onClose={handleCloseResults}`.
- `Map`: `highlightedTerritories`, `tickerHighlight`.
- `EventTicker`: `events={eventFeed}`, `onEventClick={handleEventClick}`, `playerColors={PLAYER_COLORS}`.

---

## 7. GENERATION RULES

1. **Modify existing files in place under `app/`.** Read each file before modifying. Preserve all prior-slice functionality not explicitly changed.
2. **Mark every output file** as MODIFIED or NEW at the top.
3. **All gameplay arithmetic is integer arithmetic.** No floats in game logic.
4. **SpacetimeDB macros (2.4.1):** `#[spacetimedb::table(accessor = name, public)]` with column attrs `#[primary_key]`, `#[auto_inc]`; `#[spacetimedb::reducer]`; `#[spacetimedb::procedure]`. Scheduled tables use `scheduled(target_fn)`.
5. **Tailwind CSS for all styling.** Use design tokens from `../AESTHETIC.md`.
6. **No emojis. No em dashes. No custom CSS files.**
7. **Event ticker icons are geometric SVGs.** See AESTHETIC.md Section 13 for the icon design language.
8. **The three query functions are procedures, not reducers.** They call Claude via `ctx.http` (the shared `anthropic_call` helper) and return `#[derive(SpacetimeType)]` structs. There is no `reqwest`, no `std::thread::spawn`, no `tokio`. Reducers cannot make HTTP calls or return data; procedures do both.
9. **Event writes are a side effect of each reducer's transaction.** Append the `event_feed` row as the last operation, after the primary state change. Because it shares the reducer's tx, it succeeds or rolls back atomically with the action.
10. **This is Slice 4 of 7.** Generate everything specified for this slice. No stubs or placeholders, but leave room for Slices 5 through 7 (do not add their features here).

---

## 8. WHAT NOT TO GENERATE

Slices 5 through 7 still follow this one. Generate only what this slice specifies. Do not add:
- New dimensions
- New AI opponents
- New card types
- New gameplay mechanics
- Multi-agent orchestration, the human Strategist, chat, or spectator/replay (later slices)
- Any system not specified in this document

---

## 9. SUCCESS CRITERIA

After applying all modifications, the Slice 4 application must:

1. **Compile** — `spacetime build` (or `cargo build`) for the server module, `npm run build` for the client. Zero errors. Regenerate bindings with `spacetime generate --lang typescript --out-dir client/src/module_bindings --module-path server`.
2. **Show event ticker** — Scrolling bar at screen bottom. "Game started" event visible on load. New events appear for all action types with correct colors and icons.
3. **Respond to canned queries** — All 10 buttons call the `get_canned_query` procedure and return summary, data table, and map highlights.
4. **Respond to natural language** — Freeform queries call the `query_database` procedure and return structured results with graceful error handling.
5. **Autocomplete on Tab** — The `autocomplete_query` procedure returns up to 3 context-aware suggestions.
6. **Highlight on ticker click** — Clicking an event highlights the referenced territory.
7. **Results panel lifecycle** — Opens on query, closes with × button, clears highlights.
8. **All prior-slice gameplay preserved** — Actions, AI, cultural spread, victory unchanged. Events are additive.

---

## End of Slice 4 Masterplan

Read the existing `app/` codebase (as of `slice-3-complete`). Apply every modification specified above in the order specified. Output every changed file with MODIFIED or NEW at the top. This is Slice 4 of 7; Slices 5 through 7 still follow. Generate now.