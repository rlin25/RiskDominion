# RISK: DOMINION — SLICE 2 INTERFACE CONTRACT

## Version 2.0
## Scope: AI Opponents, Covert Dimension, Intel System
## Target: Claude Code Generation — Slice 2 of 7
## Platform: SpacetimeDB 2.4.1

---

## 0. HOW TO READ THIS DOCUMENT

This document specifies every table, reducer, procedure, subscription, seed data value, and constant that is **new or modified** in Slice 2. It does not repeat Slice 1 specifications. The canonical code is the single `risk-dominion/app/{server,client}` codebase (tagged `slice-1-complete`), grown in place.

**All Slice 1 tables, reducers, procedures, subscriptions, and constants remain in effect unless this document explicitly modifies them.** If a component is not mentioned here, it is unchanged from Slice 1.

SpacetimeDB has three server function types: **reducers** (deterministic, return `Result<(), String>`, cannot return data to clients, cannot make HTTP calls), **procedures** (return data to the caller and/or make HTTP calls via `ctx.http`), and views. Slice 2 introduces both procedures.

---

## 1. MODIFIED TABLES

### 1.1 `players`

Add one column to the existing `players` table:

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `is_ai` | bool | | True for AI opponents, false for human |

All other columns (`player_id`, `player_name`, `color`, `action_points`, `last_regen_at`) remain unchanged. The table stays `public`.

---

## 2. NEW TABLES

Tables are `pub struct`s with `#[spacetimedb::table(accessor = name, public)]`. Column constraints use attributes (`#[primary_key]`, `#[auto_inc]`). The `module_config` table (Section 2.4) is NOT `public`. Generated TS field names are camelCase (`territory_id` becomes `territoryId`).

### 2.1 `covert`

| Column | Type | Attribute | Description |
|--------|------|-----------|-------------|
| `territory_id` | i32 | `#[primary_key]` | Territory identifier (1-12) |
| `owner_id` | i32 | | Player who controls this dimension (1-4, or 0 if no agents) |
| `agent_count` | i32 | | Number of agents deployed |

Accessor `covert`, `public`.

### 2.2 `ai_state`

| Column | Type | Attribute | Description |
|--------|------|-----------|-------------|
| `ai_player_id` | i32 | `#[primary_key]` | References `players.player_id` (2, 3, or 4) |
| `cycle_status` | String | | "idle" or "pending" |
| `last_cycle_at` | i64 | | Unix timestamp (ms) of last completed cycle; 0 if never |
| `next_cycle_at` | i64 | | Unix timestamp (ms) of next scheduled cycle |

Accessor `ai_state`, `public`. `last_cycle_at` is a plain `i64` initialized to `0` (not nullable).

### 2.3 `ai_reasoning_log`

| Column | Type | Attribute | Description |
|--------|------|-----------|-------------|
| `id` | u64 | `#[primary_key] #[auto_inc]` | Unique log entry ID (insert with 0) |
| `ai_player_id` | i32 | | Which AI produced this reasoning |
| `cycle_at` | i64 | | Unix timestamp (ms) when cycle fired |
| `reasoning_text` | String | | Full LLM reasoning output |
| `actions_taken` | String | | JSON array of action objects with acceptance status |

Accessor `ai_reasoning_log`, `public`.

### 2.4 `module_config` (private)

Holds the Anthropic API key and optional model override. NEVER marked `public`, so clients cannot read it via subscription and the key never appears in source.

| Column | Type | Attribute | Description |
|--------|------|-----------|-------------|
| `key` | String | `#[primary_key]` | Config key (e.g. "anthropic_api_key", "anthropic_model") |
| `value` | String | | Config value |

Accessor `module_config`. NOT `public`.

`actions_taken` JSON format:
```json
[
    {"action_type": "military_attack", "territory_id": 3, "accepted": true},
    {"action_type": "economic_invest", "territory_id": 7, "accepted": true},
    {"action_type": "deploy_agent", "territory_id": 5, "accepted": false, "reason": "Insufficient action points"}
]
```

### 2.5 `ai_cycle_schedule` (scheduled table)

Drives the `ai_reasoning_cycle` procedure. A scheduled table targets a function via `scheduled(target_fn)`; that target receives the row. One in-flight row per AI; each cycle re-arms the next via a one-shot `ScheduleAt::Time`.

| Column | Type | Attribute | Description |
|--------|------|-----------|-------------|
| `scheduled_id` | u64 | `#[primary_key] #[auto_inc]` | Schedule row id (insert with 0) |
| `ai_player_id` | i32 | | Which AI this cycle is for (2, 3, 4) |
| `scheduled_at` | ScheduleAt | | When the cycle fires |

Definition: `#[spacetimedb::table(accessor = ai_cycle_schedule, scheduled(ai_reasoning_cycle))]`.

---

## 3. UPDATED SEED DATA

### 3.1 Players

Modify `start_game` to insert 4 players instead of 2:

| player_id | player_name | color | is_ai | action_points | last_regen_at |
|-----------|-------------|-------|-------|---------------|---------------|
| 1 | Player | #4488FF | false | 5 | (server timestamp) |
| 2 | Zhao | #FF4444 | true | 5 | (server timestamp) |
| 3 | Consortium | #FFAA00 | true | 5 | (server timestamp) |
| 4 | Prophet | #AA44FF | true | 5 | (server timestamp) |

### 3.2 AI State + Cycle Schedule

Insert after players. `last_cycle_at` is `0` (never run). Timestamps come from `ctx.timestamp` (deterministic), converted to `i64` millis. The stagger offset is `AI_STAGGER_SECONDS * (ai_id - 2)`.

| ai_player_id | cycle_status | last_cycle_at | next_cycle_at |
|-------------|-------------|---------------|---------------|
| 2 | idle | 0 | (ctx.timestamp) |
| 3 | idle | 0 | (ctx.timestamp + 20s) |
| 4 | idle | 0 | (ctx.timestamp + 40s) |

For each AI also insert one `ai_cycle_schedule` row with `scheduled_id: 0`, the `ai_player_id`, and `scheduled_at: ScheduleAt::Time(ctx.timestamp + Duration::from_secs(offset))`. Each cycle re-arms the next, so only the first fire is seeded here.

### 3.3 Territory Dimensions

Replace the existing seed data inserts for `military` and `economic`. Add inserts for `covert`.

| Territory | mil_owner | mil_troops | eco_owner | eco_capital | cov_owner | cov_agents |
|-----------|-----------|------------|-----------|-------------|-----------|------------|
| 1 (N America) | 1 | 10 | 1 | 20 | 1 | 1 |
| 2 (C America) | 1 | 5 | 3 | 8 | 0 | 0 |
| 3 (Caribbean) | 1 | 4 | 1 | 6 | 0 | 0 |
| 4 (S America) | 2 | 6 | 1 | 10 | 0 | 0 |
| 5 (W Europe) | 3 | 10 | 3 | 20 | 3 | 1 |
| 6 (N Africa) | 3 | 5 | 1 | 8 | 0 | 0 |
| 7 (S Africa) | 3 | 4 | 3 | 7 | 0 | 0 |
| 8 (E Europe) | 2 | 5 | 3 | 9 | 0 | 0 |
| 9 (Mid East) | 4 | 10 | 4 | 20 | 4 | 1 |
| 10 (S Asia) | 2 | 5 | 4 | 8 | 0 | 0 |
| 11 (E Asia) | 2 | 10 | 2 | 20 | 2 | 1 |
| 12 (Oceania) | 4 | 4 | 4 | 7 | 0 | 0 |

`cov_owner = 0` means no agents present. The territory has no Covert owner.

### 3.4 Game State

Unchanged from Slice 1:
| key | value |
|-----|-------|
| status | active |
| winner | (empty string) |
| started_at | (server timestamp) |

---

## 4. CONFIG REDUCER

### 4.1 `set_config(key: String, value: String)`

`#[spacetimedb::reducer] fn set_config(ctx: &ReducerContext, key: String, value: String)`. Upserts a row into the private `module_config` table. Used once after publish to install the Anthropic API key:

```bash
spacetime call risk-dominion set_config '"anthropic_api_key"' '"sk-ant-..."'
```

Optionally set `anthropic_model` to override the default `claude-sonnet-4-6`. The key never appears in source and is never exposed to clients.

---

## 5. NEW CLIENT-FACING ENDPOINTS

Slice 2 adds one reducer and one procedure callable from the client.

### 5.1 `deploy_agent(territory_id: i32, player_id: i32)` (reducer)

`#[spacetimedb::reducer] fn deploy_agent(ctx: &ReducerContext, territory_id: i32, player_id: i32) -> Result<(), String>`. A thin wrapper over the shared `do_deploy_agent` fn (also used by the AI cycle). Reducers cannot return data; the client observes the outcome via the covert subscription. Called from the frontend as `deployAgent({ territoryId, playerId: 1 })`.

**Validation (in order, return the first `Err`):**
1. `game_state.status` must be `active`. Else `Err("Game has ended.")`.
2. `player_id` must be 1-4. Else `Err("Invalid player.")`.
3. `territory_id` must be 1-12. Else `Err("Invalid territory.")`.
4. Player must have `action_points >= 1`. Else `Err("Insufficient action points.")`.

**Behavior on success (returns `Ok(())`):**
1. Decrement player's `action_points` by 1.
2. `agent_count += 1`.
3. If `owner_id != player_id` (including 0):
   - Set `owner_id = player_id` (new owner inherits existing agents plus the new one).
   - Call `dimension_owner_change(ctx, player_id)`.

### 5.2 `get_intel(ai_player_id: i32) -> IntelResult` (procedure)

`get_intel` RETURNS structured data, so it is a **procedure**, not a reducer: `#[spacetimedb::procedure] fn get_intel(ctx: &mut ProcedureContext, ai_player_id: i32) -> IntelResult`. It makes no HTTP call; all DB access is inside `ctx.with_tx(|tx| { ... })`. Called from the frontend as `await getIntel({ aiPlayerId })`, which resolves to the `IntelResult`.

`IntelResult` is a `#[derive(SpacetimeType)]` struct: `{ status: String, intel_text: String, ai_player_name: String, cycle_timestamp: i64, territories_referenced: Vec<i32> }`.

**Behavior:**
1. If `ai_player_id` is not 2-4, return status `"insufficient_intel"` with intel_text "Unknown AI."
2. Find the most recent row in `ai_reasoning_log` for this AI (max by `cycle_at`). If none, return:
```json
{
    "status": "no_recent_reasoning",
    "intel_text": "No intelligence available yet. {ai_name} has not completed its first planning cycle.",
    "ai_player_name": "{ai_name}",
    "cycle_timestamp": 0,
    "territories_referenced": []
}
```

3. Determine the player's maximum agent count across all territories where this AI has dimension ownership: for each territory where `military.owner_id == ai_player_id` OR `economic.owner_id == ai_player_id`, read `covert.agent_count` where `covert.owner_id == 1` (the human). Take the maximum.

4. If `max_agent_count >= INTEL_THRESHOLD` (3):
```json
{
    "status": "success",
    "intel_text": "{reasoning_text}",
    "ai_player_name": "{ai_name}",
    "cycle_timestamp": {cycle_at},
    "territories_referenced": [3, 7, 11]
}
```
Extract `territories_referenced` by parsing the latest `actions_taken` JSON and collecting all `territory_id` values.

5. If `max_agent_count < 3`:
```json
{
    "status": "insufficient_intel",
    "intel_text": "Insufficient intel. Deploy agents in territories where {ai_name} is active.",
    "ai_player_name": "{ai_name}",
    "cycle_timestamp": 0,
    "territories_referenced": []
}
```

---

## 6. AI REASONING CYCLE (scheduled procedure)

### 6.1 `ai_reasoning_cycle(row: AiCycleSchedule)`

`#[spacetimedb::procedure] fn ai_reasoning_cycle(ctx: &mut ProcedureContext, row: AiCycleSchedule)`. This is a **procedure**, not a reducer, because it calls Claude over HTTP and only procedures have `ctx.http`. It is the target of the `ai_cycle_schedule` scheduled table, which passes the row (carrying `ai_player_id`).

There is no `ai_submit_actions` reducer, no `std::thread::spawn`, no `reqwest`, and no queue table. A scheduled procedure makes the HTTP call directly, then writes results in `ctx.with_tx`.

**Schedule:** Self-pacing. `start_game` seeds the first fire per AI staggered by 20s (Zhao +0s, Consortium +20s, Prophet +40s). Each cycle re-arms the next one ~60s later, so effective cadence is ~60s per AI.

**Three-phase pattern:**

1. **tx1 (snapshot + reschedule under a pending guard):** in a single `ctx.with_tx`:
   - Insert the next `ai_cycle_schedule` row (`ScheduleAt::Time(now + 60s)`) so the chain stays alive regardless of what follows.
   - If `game_state.status != "active"`, stop (return `None` from the tx).
   - Look up `ai_state` for this AI. If `cycle_status == "pending"` (previous cycle still in flight), skip this cycle (return `None`).
   - Read the API key from `module_config` via `config_value(ctx, "anthropic_api_key")`. If missing, skip (return `None`). Read the model (default `claude-sonnet-4-6`).
   - Set `cycle_status = "pending"`, update `next_cycle_at`.
   - Build the system prompt from a live board snapshot (Section 7). Return `(system_prompt, api_key, model)`.

2. **HTTP call (no transaction held open):** call the shared `anthropic_call` helper with `ctx.http`, the system prompt, the fixed user message, `max_tokens = 1500`, and a 30s timeout.

3. **tx2 (apply + log + idle):** in a second `ctx.with_tx`:
   - On success: `parse_actions(text)` extracts the trailing JSON array into `(action_type, territory_id)` pairs; `apply_ai_actions(tx, ai_id, &actions, text)` applies each via the shared `do_*` fns, records per-action acceptance, sets `cycle_status = "idle"`, `last_cycle_at = now`, and inserts the `ai_reasoning_log` row.
   - On error (timeout/network/parse): log it and reset `cycle_status = "idle"`. The AI misses this turn; it does not bank actions. The next cycle proceeds normally.

**The Anthropic call helper (`anthropic_call`):** the single place that builds and sends the Messages request via `ctx.http`, then extracts `content[0].text`. Endpoint `https://api.anthropic.com/v1/messages`. Headers: `x-api-key`, `anthropic-version: 2023-06-01`, `content-type: application/json`. Timeout via `spacetimedb::http::Timeout(TimeDuration::from_micros(...))`. Request body:
```json
{
    "model": "claude-sonnet-4-6",
    "max_tokens": 1500,
    "system": "{system_prompt}",
    "messages": [{ "role": "user", "content": "Decide your moves for this turn. End with the JSON action array." }]
}
```
Returns `content[0].text` on a 2xx response, else an `Err` string.

**Applying actions (`apply_ai_actions`, private fn inside tx2):** runs each action through the SAME shared `do_military_attack` / `do_economic_invest` / `do_deploy_agent` fns the human uses, so the AI is validated identically (adjacency, action points, ownership). Each `do_*` checks `action_points >= 1` and decrements before acting, so the AI can never overspend or bank actions. Per-action results are recorded as the `actions_taken` JSON.

---

## 7. LLM PROMPT TEMPLATE

For each AI, the cycle builds the system prompt from a live board snapshot. Replace `{placeholders}` with actual values. The prompt asks for a short natural-language strategy followed by a trailing JSON action array, so the intel system can show readable reasoning and `parse_actions` can extract the array.

```
You are {ai_name}, an AI opponent in the game Risk: Dominion.
Your persona: {persona_description}

Current game state:
- Your action points: {action_points}
- Territories:
{territory_list}
- Your controlled territories: {controlled_list}
- Adjacency map:
{adjacency_map}
- Unified territory counts: Player: {player_count}, Zhao: {zhao_count}, Consortium: {consortium_count}, Prophet: {prophet_count}
- Win condition: First to unify 3 territories (control both Military and Economic in the same territory)

Available actions:
- military_attack: Attack a territory adjacent to one you control militarily. Requires 1 action point. Attacker troops must exceed defender troops to succeed.
- economic_invest: Add 5 capital to a territory. Flips economic ownership if your capital exceeds the current owner. Requires 1 action point.
- deploy_agent: Deploy an agent in a territory. Agents gather intel on opponents' plans. Requires 1 action point.

Explain your strategy in at most 3 short sentences. Do NOT use markdown headers, bullet lists, or numbered plans. Then end your reply with a JSON array of actions as the LAST thing in your response (nothing after it). Each action must have "action_type" and "territory_id". Example ending:
[{"action_type": "military_attack", "territory_id": 3}, {"action_type": "economic_invest", "territory_id": 7}]

Do not exceed your available action points ({action_points}).
Prioritize actions consistent with your persona.
```

The paired user message is the fixed string "Decide your moves for this turn. End with the JSON action array."

**Persona descriptions:**

- **Zhao:** "You are an aggressive military commander. Prioritize military attacks on adjacent territories where you have troop advantage. Invest economically only when no attack targets are available. Deploy agents sparingly, mainly in territories you plan to attack."

- **Consortium:** "You are a calculating economic power. Prioritize economic investments in territories where you already have military presence. Build capital, then unify. Attack only to defend critical positions. Deploy agents for intel on the human player's economic moves."

- **Prophet:** "You are an enigmatic strategist who values information above all. Prioritize deploying agents in territories controlled by other players to gather intelligence. Attack and invest opportunistically based on where opponents are weakest. You are unpredictable."

**Territory list format:**
```
Territory {id} ({name}): Military owner={mil_owner_name}({troops}), Economic owner={eco_owner_name}({capital}), Covert owner={cov_owner_name}({agents})
```

**Adjacency map format:**
```
{territory_id} ({name}): adjacent to [{neighbor_ids}]
```

---

## 8. MODIFIED EXISTING FUNCTIONS

Before adding the AI cycle, extract each action's body into a shared `do_*` fn taking `&ReducerContext` and returning `Result<(), String>`; the reducers become thin wrappers and the AI cycle reuses the same fns.

### 8.1 `military_attack(ctx, territory_id, player_id)` (reducer)

**Change:** Thin wrapper over `do_military_attack`, which validates `player_id` in 1..=4 (was 1 or 2). Combat logic identical to Slice 1.

### 8.2 `economic_invest(ctx, territory_id, player_id)` (reducer)

**Change:** Thin wrapper over `do_economic_invest`, which validates `player_id` in 1..=4 (was 1 or 2). Invest logic identical to Slice 1.

### 8.3 `start_game(ctx)` (reducer)

**Changes:**
- Insert 4 players instead of 2 (Section 3.1), each with `is_ai` set.
- Insert 3 `ai_state` rows + 3 `ai_cycle_schedule` rows with staggered first-fire (Section 3.2).
- Insert 12 `covert` rows alongside `military` and `economic` (Section 3.3).
- The `regen_timer` (drives `regenerate_action_points`) is already armed in Slice 1.

### 8.4 `regenerate_action_points(ctx, timer)` (scheduled reducer)

**Change:** Iterate over all 4 players instead of 2. Logic unchanged: +1 per player, cap 10, every 8 seconds. Uses `ctx.timestamp`.

### 8.5 `dimension_owner_change(ctx, new_owner)` (private fn, runs in caller's tx)

**Change:** The win check ignores the `covert` dimension. Count unified territories where `military.owner_id == new_owner AND economic.owner_id == new_owner`. Covert ownership does not count toward unification.

Win threshold remains 3 unified territories across the 2 victory dimensions (Military + Economic).

---

## 9. NEW SUBSCRIPTIONS

Subscriptions use the generated table accessors via the React `useTable(tables.x)` hook, which returns `[rows, isReady]`.

### 9.1 `covert` table

| Table | Client Usage |
|-------|--------------|
| `covert` | Render Covert quadrant on territory hexes, show agent count on hover |

**Existing table subscriptions** (`military`, `economic`, `players`, `game_state`) remain unchanged from Slice 1. The new `ai_state` and `ai_reasoning_log` tables are public and may be subscribed if a component needs them, but the intel feature reads reasoning through the `getIntel` procedure, not a subscription. The `module_config` table is NOT public and cannot be subscribed.

---

## 10. NEW CONSTANTS

### 10.1 Server Constants (add to `lib.rs`)

```rust
const AI_CYCLE_SECONDS: u64 = 60;
const AI_STAGGER_SECONDS: u64 = 20;
const AI_LLM_TIMEOUT_SECONDS: u64 = 30;
const AI_MAX_TOKENS: u32 = 1500;
const INTEL_THRESHOLD: i32 = 3;
const TOTAL_PLAYERS: i32 = 4;

const ANTHROPIC_URL: &str = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION: &str = "2023-06-01";
const DEFAULT_MODEL: &str = "claude-sonnet-4-6";
```

### 10.2 Client Constants (add to `constants.ts`)

```typescript
export const INTEL_THRESHOLD = 3;
export const AI_CYCLE_SECONDS = 60;
export const AI_STAGGER_SECONDS = 20;
export const AI_LLM_TIMEOUT_SECONDS = 30;
export const TOTAL_PLAYERS = 4;

export const AI_PLAYERS: Record<number, { name: string; color: string }> = {
  2: { name: "Zhao", color: "#FF4444" },
  3: { name: "Consortium", color: "#FFAA00" },
  4: { name: "Prophet", color: "#AA44FF" }
};
```

---

## 11. NEW TYPES (add to `types.ts`)

```typescript
export interface CovertRow {
  territory_id: number;
  owner_id: number;
  agent_count: number;
}

export interface AIStateRow {
  ai_player_id: number;
  cycle_status: 'idle' | 'pending';
  last_cycle_at: number | null;
  next_cycle_at: number;
}

export interface AIReasoningLogRow {
  id: number;
  ai_player_id: number;
  cycle_at: number;
  reasoning_text: string;
  actions_taken: string;
}

export interface IntelResult {
  status: 'success' | 'insufficient_intel' | 'no_recent_reasoning';
  intel_text: string;
  ai_player_name: string;
  cycle_timestamp: number;
  territories_referenced: number[];
}
```

---

## 12. IMPLEMENTATION NOTES FOR CLAUDE CODE

### 12.1 Server

- Modify the existing `app/server/src/lib.rs`. Do not create a new file. `Cargo.toml` is unchanged (no new crates).
- Add new tables alongside existing ones in the TABLES section; add the scheduled table in the SCHEDULED TABLES section.
- The AI cycle and `get_intel` are **procedures** (`#[spacetimedb::procedure]`, `ctx: &mut ProcedureContext`), not reducers. Only procedures can return data or make HTTP calls.
- The LLM call uses `ctx.http` inside the procedure. Do NOT use `reqwest`, `tokio`, async Rust, `std::thread::spawn`, or a queue table. Build the request with `spacetimedb::http::Request::builder()` and send via `ctx.http.send(request)`.
- DB access inside a procedure is only via `ctx.with_tx(|tx| { tx.db.<table>()... })`. Snapshot in one tx, make the HTTP call with no tx held open, commit results in a second tx.
- Read the API key from the private `module_config` table (`config_value(ctx, "anthropic_api_key")`), never from environment variables. Model defaults to `claude-sonnet-4-6`.
- Use `ctx.timestamp` for all time. Store `*_at` fields as `i64` millis via `ctx.timestamp.to_micros_since_unix_epoch() / 1000`.
- There is no `ai_submit_actions` reducer. The AI's actions are applied by a private `apply_ai_actions` fn inside the cycle procedure's second `ctx.with_tx`, reusing the shared `do_*` fns.

### 12.2 Client

- Modify the existing `app/client` codebase. Do not regenerate from scratch.
- After server changes, regenerate bindings: `spacetime generate --lang typescript --out-dir client/src/module_bindings --module-path server`. Field names are camelCase.
- Add the `covert` table subscription to `useSubscriptions.ts` via `useTable(tables.covert)`.
- Modify `Territory.tsx` to render three quadrants (X-split hex pattern: three of four triangular wedges). The Covert wedge uses purple (#AA44FF) for player's agents, gray for AI agents, empty/transparent if no agents.
- Modify `CardHand.tsx` to include the Covert card type (purple left border, geometric SVG icon per AESTHETIC.md Section 13.3, label "DEPLOY"). Three card types total. Deploy calls `deployAgent({ territoryId, playerId: 1 })` via `useReducer(reducers.deployAgent)`.
- Add `IntelPanel.tsx` component:
  - Three buttons: "What is Zhao planning?", "What is Consortium planning?", "What is Prophet planning?"
  - Each calls the procedure: `const getIntel = useProcedure(procedures.getIntel); const result = await getIntel({ aiPlayerId });`. The returned `IntelResult` is stored in state.
  - Displays the returned `intelText` in a panel.
  - Highlights `territoriesReferenced` on the map.
  - Shows status messages for "insufficient_intel" and "no_recent_reasoning".
- Modify `App.tsx`:
  - Remove `?player=` URL parameter logic. Player is always player_id 1.
  - Remove `PlayerIndicator` component.
  - Add `IntelPanel` to the layout (left sidebar or collapsible panel).
  - Pass covert subscription data to `Map` and `Territory` components.

---

## 13. WHAT NOT TO GENERATE

Do NOT add:
- Cultural dimension table or `cultural_spread_tick` reducer
- Cross-dimension bonuses (Military to Economic, etc.)
- Query bar, query procedures, canned queries
- Event feed table or event ticker
- Any features from Slices 3 through 7

---

## End of Slice 2 Interface Contract

Modify the `risk-dominion/app/` codebase as specified. Output every new and modified file. Indicate NEW or MODIFIED at the top of each file. This is Slice 2 of 7.