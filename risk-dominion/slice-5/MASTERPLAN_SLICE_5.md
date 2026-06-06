# RISK: DOMINION — SLICE 5 MASTERPLAN

## Version 2.0 (SpacetimeDB 2.4.1)
## Scope: Subagent Orchestration, Hotkeys, Human Strategist
## Target: Claude Code Generation — Evolving the `risk-dominion/app/` Codebase

---

## 0. DOCUMENT PURPOSE

This document specifies how to evolve the working `risk-dominion/app/` codebase to add subagent orchestration, keyboard controls, and the human Strategist advisor. Read this document in full. Read the existing codebase. Apply the changes specified here.

The canonical code is one evolving application at `risk-dominion/app/{server,client}`. Each slice grows it in place; the state after Slice 4 is tagged `slice-4-complete` in git. Do not regenerate prior slices. Do not create a new project. Modify the existing files in place. Mark each output file as MODIFIED or NEW.

This is Slice 5 of 7. The Covert dimension and intel system arrived in Slice 2; the Cultural dimension and four-dimension victory in Slice 3; the natural language query system and event ticker in Slice 4. Slices 6 and 7 (global chat with AI deception, then spectator mode and replay) come later.

---

## 1. BEFORE YOU BEGIN

Read every existing file in the codebase under `risk-dominion/app/`:
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
- `app/client/src/components/QueryBar.tsx`
- `app/client/src/components/ResultsPanel.tsx`
- `app/client/src/components/EventTicker.tsx`
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
5. `client/src/components/ActionCard.tsx`
6. `client/src/components/QueryBar.tsx`
7. `client/src/components/IntelPanel.tsx`
8. `client/src/components/Map.tsx`
9. `client/src/App.tsx`

**NEW:**
10. `client/src/components/StrategistAlerts.tsx`

---

## 3. GENERATION ORDER

Generate changes in this sequence. Each file must only reference types and components that already exist in the codebase (state after Slice 4) or were generated earlier in this sequence.

1. `server/src/lib.rs` (MODIFIED)
2. `client/src/constants.ts` (MODIFIED)
3. `client/src/types.ts` (MODIFIED)
4. `client/src/hooks/useSubscriptions.ts` (MODIFIED)
5. `client/src/components/StrategistAlerts.tsx` (NEW)
6. `client/src/components/ActionCard.tsx` (MODIFIED)
7. `client/src/components/QueryBar.tsx` (MODIFIED)
8. `client/src/components/IntelPanel.tsx` (MODIFIED)
9. `client/src/components/Map.tsx` (MODIFIED)
10. `client/src/App.tsx` (MODIFIED)

---

## 4. SERVER MODIFICATIONS

### 4.1 Modified Table: `ai_reasoning_log`

Add a `subordinate_id` column (camelCase `subordinateId` in generated client bindings):

```rust
#[spacetimedb::table(accessor = ai_reasoning_log, public)]
pub struct AiReasoningLog {
    #[primary_key]
    #[auto_inc]
    pub id: u64,
    pub ai_player_id: i32,
    pub cycle_at: i64,
    pub subordinate_id: String, // NEW: "commander" for the commander row
    pub reasoning_text: String,
    pub actions_taken: String,  // JSON array
}
```

**Schema note:** SpacetimeDB applies the new schema on `spacetime publish`. New rows written by the orchestrated cycle always set `subordinate_id` explicitly. Any pre-existing rows from earlier slices that lack a meaningful value are treated as `"commander"` by `get_intel` (Section 4.5). There is no nullable column and no SQL `DEFAULT`; the value is always written by the module.

### 4.2 New Table: `strategist_log`

```rust
#[spacetimedb::table(accessor = strategist_log, public)]
pub struct StrategistLog {
    #[primary_key]
    #[auto_inc]
    pub id: u64,
    pub created_at: i64,            // ms since epoch (ctx.timestamp)
    pub notification: String,
    pub priority: String,          // "critical" | "warning" | "info"
    pub territory_id: i32,         // 0 means "no specific territory"
    pub player_id: i32,            // 1 (the human) for now
    pub dismissed: bool,
}
```

New rows set `dismissed = false`. `id` uses `#[primary_key] #[auto_inc]`. The table is `public` so the client can subscribe. (We model the optional territory as `i32` with `0` = none rather than `Option<i32>`, to keep the generated client binding flat; the client treats `0` as null.)

### 4.3 New Scheduled Table for the AI cycle (carried over from Slice 2)

The AI cycle is driven by a scheduled table, exactly as established in Slice 2. It is unchanged in Slice 5 except that the procedure it targets now performs orchestration:

```rust
/// Drives the `ai_reasoning_cycle` *procedure*. One in-flight row per AI; each
/// cycle re-schedules the next via a one-shot `ScheduleAt::Time` (self-pacing,
/// staggered starts).
#[spacetimedb::table(accessor = ai_cycle_schedule, scheduled(ai_reasoning_cycle))]
pub struct AiCycleSchedule {
    #[primary_key]
    #[auto_inc]
    pub scheduled_id: u64,
    pub ai_player_id: i32,
    pub scheduled_at: ScheduleAt,
}
```

Schedule and stagger are unchanged from Slice 2: 60s cadence per AI, started 20s apart (Zhao at 0s, Consortium at 20s, Prophet at 40s) via one-shot `ScheduleAt::Time` rows seeded in `start_game`.

### 4.4 Restructured Procedure: `ai_reasoning_cycle(row: AiCycleSchedule)`

**This is the central change of Slice 5, and it is a redesign for SpacetimeDB 2.4.1.**

`ai_reasoning_cycle` is a **scheduled procedure**, not a reducer. Only procedures may make HTTP calls (`ctx.http`); reducers are sandboxed and cannot. There are **no threads**. SpacetimeDB has no `std::thread`, no `join()`, no `reqwest`, and no `tokio`. The four specialist Claude calls and the one commander Claude call are made **sequentially**, one after another, inside this single procedure invocation, using the `anthropic_call` helper (`ctx.http`).

**Replace the entire body of this procedure.** Do not preserve the old single-call logic.

**Structure (the same tx1 -> HTTP -> tx2 shape established in Slice 2):**

1. **tx1 (snapshot under a pending guard, re-arm the next cycle).** In `ctx.with_tx`:
   - Re-schedule this AI's next cycle by inserting a fresh `AiCycleSchedule` row with `ScheduleAt::Time(now + 60s)`. This keeps the chain alive regardless of what follows.
   - If the game is not active, return `None` (skip the rest).
   - Look up `ai_state` for this AI. If `cycle_status == "pending"`, return `None` (previous cycle still in flight).
   - Read `anthropic_api_key` and `anthropic_model` from the non-public `module_config` table. If no key, return `None`.
   - Set `cycle_status = "pending"`, update `next_cycle_at`.
   - Build the four domain-specific snapshots and the full game state snapshot from the live board, plus this AI's action points and persona. Return them out of the tx (a plain struct of `String`s + the api key + model).

   The four domain snapshots:
   - **Military:** military table, adjacency map, covert table (for combat bonus), players table.
   - **Economic:** economic table, military table (for invest bonus), adjacency map, players table.
   - **Cultural:** cultural table, economic table (for pressure bonus), adjacency map, players table.
   - **Covert:** covert table, cultural table (for intel bonus), players table.

2. **HTTP, specialists, sequentially (no tx held open).** Select the four specialist prompts for this AI (see Section 5). For each of the four specialists, call:

   ```rust
   anthropic_call(ctx, &api_key, &model, specialist_prompt, domain_snapshot, 150, 15)
   ```

   (`max_tokens = 150`, `timeout_secs = 15`.) On `Ok(text)`, parse the JSON recommendation array. On `Err(_)` or a timeout, record an empty `SubordinateResult` for that specialist (do not abort the cycle). Collect a `Vec<SubordinateResult>` of four entries, in fixed order: military, economic, cultural, covert.

   ```rust
   struct SubordinateResult {
       subordinate_id: String,      // e.g. "vanguard"
       reasoning_text: String,      // the specialist's prose (or "" on failure)
       actions_json: String,        // JSON array of recommended actions (or "[]")
   }
   ```

3. **HTTP, commander, last (no tx held open).** Build the commander prompt (Section 6), embedding the full game state and the four specialists' recommendations (or the "specialist unavailable this cycle" placeholder from Section 6 for any that failed). Then:

   ```rust
   anthropic_call(ctx, &api_key, &model, commander_prompt, "Synthesize and decide. End with the JSON action array.", 500, 30)
   ```

   (`max_tokens = 500`, `timeout_secs = 30`.)

4. **tx2 (apply + log + return to idle).** In a second `ctx.with_tx`:
   - On commander success: parse the JSON action array (reuse the existing `parse_actions` / `last_balanced_array` helpers from Slice 2), then call the private `apply_ai_actions` fn (Section 4.5) with the AI id, the parsed actions, the commander reasoning text, the four `SubordinateResult`s, and `cycle_at`.
   - On commander failure: log the error, set `cycle_status = "idle"` (so the next scheduled cycle can run).

**Latency trade-off (note this explicitly in a code comment).** Because the five Claude calls run sequentially within one procedure, the cycle's wall-clock time is the sum of the call latencies (roughly four specialist calls plus one commander call). The first orchestrated cycle for an AI can therefore take up to ~120 seconds. This is acceptable: cycles are staggered 20s apart and self-re-schedule, so the AIs simply pace themselves. **Fallback only if latency becomes a problem:** fan the specialists out across separate scheduled-procedure rows (one row per specialist that writes its `SubordinateResult` to a scratch table, plus a follow-up commander row that reads them back). That trades simplicity for concurrency and is not implemented in Slice 5; the sequential single-procedure design is the chosen approach.

### 4.5 Private fn: `apply_ai_actions` (runs inside tx2)

This is a private Rust fn invoked inside the cycle procedure's second transaction (it is **not** a reducer and **not** cross-thread; there is no queue table). It replaces the Slice 2 `apply_ai_actions` with subordinate-aware logging.

```rust
fn apply_ai_actions(
    ctx: &ReducerContext,            // the tx handle inside ctx.with_tx
    ai_player_id: i32,
    actions: &[(String, i32)],       // (action_type, territory_id) parsed from the commander reply
    commander_reasoning: &str,
    subordinates: &[SubordinateResult],
    cycle_at: i64,
)
```

**Behavior:**
1. Validate and execute each action via the shared `do_military_attack` / `do_economic_invest` / `do_deploy_agent` logic (unchanged from Slice 2 through Slice 4), building the `actions_taken` JSON of accepted/rejected outcomes.
2. Set `ai_state.cycle_status = "idle"` and `last_cycle_at = cycle_at`.
3. Insert one `ai_reasoning_log` row per subordinate (including timed-out ones, which carry empty reasoning and `actions_taken = "[]"`), then insert the commander row last with the final `actions_taken` JSON.
   - All rows share the same `cycle_at` and `ai_player_id`.
   - Each row carries its own `subordinate_id` ("commander" for the commander row).

### 4.6 Modified Procedure: `get_intel(ai_player_id: INT)`

`get_intel` remains a **procedure** (it returns structured data to the caller). Its `IntelResult` return type is a `#[derive(SpacetimeType)]` struct, evolved to carry a deliberation chain. Rather than nesting a serialized JSON blob, model `deliberation` as a `Vec<DeliberationEntry>` where `DeliberationEntry` is its own `#[derive(SpacetimeType)]` struct (`subordinate_id`, `subordinate_name`, `role`, `reasoning`, `actions_json`). The shape below is the conceptual return value (shown as JSON for readability):

```json
{
    "status": "success",
    "ai_player_name": "Zhao",
    "cycle_timestamp": 1717628400,
    "deliberation": [
        {
            "subordinate_id": "vanguard",
            "subordinate_name": "Vanguard",
            "role": "Military Specialist",
            "reasoning": "Brazil is vulnerable. Player has only 4 troops. We have 8 troops adjacent. Recommend attack.",
            "recommendations": [{"action_type": "military_attack", "territory_id": 4}]
        },
        {
            "subordinate_id": "commander",
            "subordinate_name": "Zhao",
            "role": "Commander",
            "reasoning": "All subordinates concur. Executing military strike on Brazil.",
            "recommendations": [{"action_type": "military_attack", "territory_id": 4}]
        }
    ],
    "territories_referenced": [4]
}
```

- All DB access is inside `ctx.with_tx`. Query `ai_reasoning_log` for the most recent `cycle_at` for this AI (max `cycle_at` over rows matching `ai_player_id`). Return all rows with that `cycle_at`, ordered by `subordinate_id` (specialists first, "commander" last).
- Map `subordinate_id` to display names: "vanguard" -> "Vanguard", "scout" -> "Scout", etc.
- Map `subordinate_id` to role descriptions: "vanguard" -> "Military Specialist", etc.
- `territories_referenced` aggregates all territory IDs from all subordinates' and commander's `actions_taken` JSON.
- If a row's `subordinate_id` is empty (pre-Slice-5 data), treat it as "commander".
- Intel threshold check (3 effective agents) remains unchanged from Slice 3.
- `insufficient_intel` and `no_recent_reasoning` statuses remain unchanged from Slice 2.

### 4.7 New Reducer: `dismiss_strategist_alert(notification_id: u64)`

This is a plain **reducer** (it mutates state and returns no data to the caller; the client observes the change via its `strategist_log` subscription).

```rust
#[spacetimedb::reducer]
pub fn dismiss_strategist_alert(ctx: &ReducerContext, notification_id: u64) -> Result<(), String> {
    let mut row = ctx
        .db
        .strategist_log()
        .id()
        .find(notification_id)
        .ok_or("No such notification.".to_string())?;
    row.dismissed = true;
    ctx.db.strategist_log().id().update(row);
    Ok(())
}
```

### 4.8 New Scheduled Procedure: `strategist_cycle(row: StrategistSchedule)`

The Strategist runs Claude over HTTP, so it is a **scheduled procedure**, not a reducer (same reason as `ai_reasoning_cycle`). It is driven by its own scheduled table:

```rust
#[spacetimedb::table(accessor = strategist_schedule, scheduled(strategist_cycle))]
pub struct StrategistSchedule {
    #[primary_key]
    #[auto_inc]
    pub scheduled_id: u64,
    pub scheduled_at: ScheduleAt,
}
```

**Schedule:** `start_game` seeds one `StrategistSchedule` row with a one-shot `ScheduleAt::Time(ctx.timestamp + 50s)` so the first cycle fires at 50s. Each cycle re-arms the next with `ScheduleAt::Time(now + 60s)`, giving fires at 50s, 110s, 170s, and so on.

**Logic (tx1 -> HTTP -> tx2, same shape as the AI cycle):**
1. **tx1:** Re-arm the next cycle (`now + 60s`). If the game is not active, stop. Read `anthropic_api_key` and `anthropic_model` from `module_config` (stop if no key). Build the full game state snapshot. Return the snapshot + api key + model.
2. **HTTP:** Call `anthropic_call(ctx, &api_key, &model, strategist_prompt, "Return the JSON notifications array.", 300, 15)` with the prompt below.

```
You are the Strategist, an AI advisor for the human player in Risk: Dominion. The player is player_id 1. You are on their side. Analyze the current game state and identify:

1. THREATS - What should the player be worried about?
2. OPPORTUNITIES - Where can the player gain an advantage?
3. WEAKNESSES - Where is the player vulnerable?

Return ONLY a JSON array of notifications. Each notification: {"notification": "Your advice here. Be concise and actionable.", "priority": "critical|warning|info", "territory_id": N or null}. Limit to 3 notifications total. Prioritize critical threats first.

Current game state:
{full_game_state_snapshot}
```

3. **tx2:** On success, parse the JSON array (reuse `last_balanced_array`). For each of up to 3 notifications, insert a `strategist_log` row with the current timestamp (`ctx.timestamp`), notification text, priority, `territory_id` (0 if null), `player_id = 1`, `dismissed = false`. On timeout or error: do nothing (the Strategist silently skips a cycle; the next is already armed).

---

## 5. SPECIALIST PROMPTS

Store all 12 prompts as constants in `lib.rs`. Each prompt includes: role introduction, AI persona context, domain-specific data placeholder, and output format instructions. All specialists return a JSON array of up to 3 recommended actions with one-sentence reasoning.

### 5.1 Zhao's Specialists

**Vanguard (Military):**
```
You are Vanguard, military specialist for General Zhao. Zhao is an aggressive commander who prioritizes direct conquest and overwhelming force. Analyze the military data below and recommend up to 3 attack targets. Prioritize territories where Zhao has clear troop advantage and adjacency. Consider covert agent bonuses where applicable. For each recommendation, include a one-sentence tactical justification. Return ONLY a JSON array: [{"action_type": "military_attack", "territory_id": N, "reasoning": "..."}]. Current military data: {military_snapshot}
```

**Paymaster (Economic):**
```
You are Paymaster, economic specialist for General Zhao. Zhao views economic investment as a means to fund military expansion. Analyze the economic data below and recommend up to 2 investments. Prioritize territories that will generate capital for troop buildup or territories that Zhao already controls militarily. For each, include a one-sentence justification. Return ONLY a JSON array: [{"action_type": "economic_invest", "territory_id": N, "reasoning": "..."}]. Current economic data: {economic_snapshot}
```

**Scout (Covert):**
```
You are Scout, covert specialist for General Zhao. Your role is to identify intel gaps and recommend agent placement for combat bonuses. Analyze the covert data below and recommend up to 2 agent deployments. Prioritize territories Zhao plans to attack or territories where enemy agent presence threatens Zhao's operations. For each, include a one-sentence justification. Return ONLY a JSON array: [{"action_type": "deploy_agent", "territory_id": N, "reasoning": "..."}]. Current covert data: {covert_snapshot}
```

**Adjutant (Cultural):**
```
You are Adjutant, cultural specialist for General Zhao. Zhao views cultural influence as a secondary concern — useful only if it enables military conquest. Analyze the cultural data below. If any territory is close to a cultural flip (influence > 40%) that would benefit Zhao militarily, recommend up to 1 economic investment in the source territory to accelerate pressure. If no such opportunity exists, return an empty array. Return ONLY a JSON array: [{"action_type": "economic_invest", "territory_id": N, "reasoning": "..."}]. Current cultural data: {cultural_snapshot}
```

### 5.2 Consortium's Specialists

**Auditor (Economic):**
```
You are Auditor, economic specialist for the Consortium. The Consortium is a calculating economic power that builds wealth quietly, then converts it into territorial control. Analyze the economic data below and recommend up to 3 investment targets. Prioritize territories where the Consortium already has military presence and territories with high return potential. For each, include a one-sentence financial justification. Return ONLY a JSON array: [{"action_type": "economic_invest", "territory_id": N, "reasoning": "..."}]. Current economic data: {economic_snapshot}
```

**Actuary (Military):**
```
You are Actuary, military specialist for the Consortium. The Consortium uses military force only to defend economic holdings — risk assessment is paramount. Analyze the military data below and recommend up to 1 attack target. Only recommend an attack if it defends a critical economic position or if the probability of success exceeds 80%. If no such target exists, return an empty array. For any recommendation, include a risk assessment. Return ONLY a JSON array: [{"action_type": "military_attack", "territory_id": N, "reasoning": "..."}]. Current military data: {military_snapshot}
```

**Courier (Covert):**
```
You are Courier, covert specialist for the Consortium. Your role is to monitor competitor agent movements and protect the Consortium's economic interests. Analyze the covert data below and recommend up to 2 agent deployments. Prioritize territories where competitors have deployed agents near Consortium economic holdings. For each, include a one-sentence justification. Return ONLY a JSON array: [{"action_type": "deploy_agent", "territory_id": N, "reasoning": "..."}]. Current covert data: {covert_snapshot}
```

**Appraiser (Cultural):**
```
You are Appraiser, cultural specialist for the Consortium. You evaluate cultural influence as a long-term asset — it appreciates slowly but compounds reliably. Analyze the cultural data below and recommend up to 2 economic investments that would accelerate cultural pressure on neighboring territories. Prioritize territories where cultural influence will create economic opportunities. For each, include a one-sentence projection. Return ONLY a JSON array: [{"action_type": "economic_invest", "territory_id": N, "reasoning": "..."}]. Current cultural data: {cultural_snapshot}
```

### 5.3 Prophet's Specialists

**Whisper (Cultural):**
```
You are Whisper, cultural specialist for the Prophet. The Prophet wins through cultural dominance — you are the architect of that victory. Analyze the cultural data below and recommend up to 3 economic investments that will accelerate cultural pressure on neighboring territories. Identify the next likely cultural flip. Prioritize territories where influence is above 30% and the target is strategically valuable. For each, include a one-sentence prediction. Return ONLY a JSON array: [{"action_type": "economic_invest", "territory_id": N, "reasoning": "..."}]. Current cultural data: {cultural_snapshot}
```

**Oracle (Covert):**
```
You are Oracle, covert specialist for the Prophet. You synthesize intelligence to predict opponent strategies before they unfold. Analyze the covert data below and recommend up to 2 agent deployments. Prioritize territories where opponents are gathering for an attack or where cultural influence is about to flip. For each, include a one-sentence prediction of what the opponent will do. Return ONLY a JSON array: [{"action_type": "deploy_agent", "territory_id": N, "reasoning": "..."}]. Current covert data: {covert_snapshot}
```

**Seer (Economic):**
```
You are Seer, economic specialist for the Prophet. Your investments are not about wealth — they are about influence. Identify territories where economic investment will create cascading cultural pressure on multiple neighbors. Recommend up to 2 investments. For each, include a one-sentence vision of the cultural ripple effect. Return ONLY a JSON array: [{"action_type": "economic_invest", "territory_id": N, "reasoning": "..."}]. Current economic data: {economic_snapshot}
```

**Warden (Military):**
```
You are Warden, military specialist for the Prophet. You strike only when culture has already won the territory. Analyze the military data below and identify territories that are culturally aligned with the Prophet but not yet militarily unified. Recommend up to 1 attack on a territory where the Prophet already owns the Cultural dimension. If no such target exists, return an empty array. For any recommendation, note that cultural preparation is complete. Return ONLY a JSON array: [{"action_type": "military_attack", "territory_id": N, "reasoning": "..."}]. Current military data: {military_snapshot}
```

---

## 6. COMMANDER PROMPT TEMPLATE

```
You are {ai_name}, commander of the {faction_name} faction in Risk: Dominion.
Your persona: {persona_description}

Current full game state:
{full_game_state_snapshot}

Your specialist team has analyzed the situation:

MILITARY SPECIALIST ({military_subordinate_name}):
{military_recommendations_or_timeout}

ECONOMIC SPECIALIST ({economic_subordinate_name}):
{economic_recommendations_or_timeout}

CULTURAL SPECIALIST ({cultural_subordinate_name}):
{cultural_recommendations_or_timeout}

COVERT SPECIALIST ({covert_subordinate_name}):
{covert_recommendations_or_timeout}

Your available action points: {action_points}
Win condition: First to unify 5 territories (all 4 dimensions).

Synthesize your team's recommendations. Resolve any conflicts according to your persona's priorities. Output a JSON array of final actions. Each action: {"action_type": "...", "territory_id": N}.

Do not exceed your available action points ({action_points}).
```

If a specialist timed out, replace their section with: "No recommendation received — specialist unavailable this cycle."

Persona descriptions are the same as Slice 3:
- **Zhao:** Military > Covert > Economic > Cultural
- **Consortium:** Economic > Cultural > Military > Covert
- **Prophet:** Cultural > Covert > Economic > Military

---

## 7. CLIENT MODIFICATIONS

### 7.1 `constants.ts` (MODIFIED)

Add:

```typescript
export const HEX_GRID_COORDINATES: Record<number, { x: number; y: number }> = {
  1: { x: 1, y: 0 },  // North America
  2: { x: 1, y: 1 },  // Central America
  3: { x: 2, y: 1 },  // Caribbean
  4: { x: 2, y: 2 },  // South America
  5: { x: 3, y: 0 },  // Western Europe
  6: { x: 3, y: 1 },  // North Africa
  7: { x: 3, y: 2 },  // Southern Africa
  8: { x: 4, y: 1 },  // Eastern Europe
  9: { x: 5, y: 0 },  // Middle East
  10: { x: 5, y: 1 }, // South Asia
  11: { x: 6, y: 0 }, // East Asia
  12: { x: 6, y: 1 }, // Oceania
};

export const STRATEGIST_CYCLE_SECONDS = 60;
export const STRATEGIST_CYCLE_OFFSET_SECONDS = 50;
export const SPECIALIST_LLM_TIMEOUT_SECONDS = 15;
```

### 7.2 `types.ts` (MODIFIED)

The `StrategistLog` row type and `IntelResult` / `DeliberationEntry` return types are produced by `spacetime generate` from the server's table and `#[derive(SpacetimeType)]` definitions. Generated field names are camelCase (Rust `territory_id` -> TS `territoryId`, `created_at` -> `createdAt`, `actions_json` -> `actionsJson`). Any local helper interfaces you add should match those generated names. For reference, the shapes are:

```typescript
// Generated from the StrategistLog table (camelCase fields).
interface StrategistLog {
  id: bigint;            // u64
  createdAt: bigint;     // i64 ms
  notification: string;
  priority: string;      // "critical" | "warning" | "info"
  territoryId: number;   // 0 means "no specific territory"
  playerId: number;
  dismissed: boolean;
}

// Generated from the get_intel procedure's return types.
interface DeliberationEntry {
  subordinateId: string;
  subordinateName: string;
  role: string;
  reasoning: string;
  actionsJson: string;   // JSON array of recommended actions
}

interface IntelResult {
  status: string;        // "success" | "insufficient_intel" | "no_recent_reasoning"
  aiPlayerName: string;
  cycleTimestamp: bigint;
  deliberation: DeliberationEntry[]; // empty unless status === "success"
  intelText: string;                 // set on insufficient_intel / no_recent_reasoning
  territoriesReferenced: number[];
}
```

### 7.3 `useSubscriptions.ts` (MODIFIED)

Subscribe to the new `strategist_log` table with the SpacetimeDB React hook (the same pattern used for every other table since Slice 1):

```typescript
const [strategistLog, strategistReady] = useTable(tables.strategistLog);
```

Include `strategistLog` in the returned object.

### 7.4 `StrategistAlerts.tsx` (NEW)

**Position:** Top-right area of the screen, below ActionBar. Stacked vertically.

**Props:** `alerts: StrategistLog[]` (the generated row type), `onDismiss: (id: bigint) => void`, `onAlertClick: (territoryId: number) => void`.

**Rendering:**
- Filter: only alerts where `dismissed === false`. Show most recent 3.
- Each alert is a card with `bg-surface` (#1A1A2E), border-left 3px solid:
  - `critical`: `#FF4444` with subtle CSS pulse animation on the border.
  - `warning`: `#FF8844`.
  - `info`: `#8899AA`.
- Card content: notification text in Orbitron, 12px, `text-primary`. Padding: 8px 12px.
- Dismiss button: "×" in top-right corner. onClick calls `onDismiss(alert.id)`.
- If `territoryId` is non-zero, clicking the card body calls `onAlertClick(alert.territoryId)`.
- Cards stack vertically with 4px gaps. Newest at top.
- Animate in: slide from right over 200ms ease-out.

### 7.5 `ActionCard.tsx` (MODIFIED)

**Props:** Add `hotkeyNumber: string | null` ('1', '2', or '3' for Military, Economic, Covert).

**Rendering:** In the bottom-right corner, render a small rounded square (16×16px) with the hotkey number. Style: JetBrains Mono, 9px, `text-secondary` (#8899AA), border 1px `text-secondary` at 30% opacity, border-radius 3px, background transparent.

### 7.6 `QueryBar.tsx` (MODIFIED)

**Rendering:** To the left of the `>` prompt, add a hotkey hint square (same style as ActionCard) showing "Q".

### 7.7 `IntelPanel.tsx` (MODIFIED)

**Props:** Add `hotkeyHint: boolean` (always true).

**Rendering:**
- Header: add hotkey hint square showing "I" next to "INTELLIGENCE".
- Deliberation chain: when `intelResult.status === 'success'` and `intelResult.deliberation` is non-empty:
  - Render each deliberation entry as a section:
    - Header: `subordinateName` + role in Orbitron, 11px, player color.
    - Body: reasoning text in JetBrains Mono, 11px, `text-primary`.
  - Entries separated by 0.5px divider in `#334455`.
  - Commander entry rendered last, with slightly larger font or bold weight.
  - Scrollable if content exceeds panel height.
- Fallback: if `deliberation` is empty (e.g. pre-Slice-5 data), display `intelText` as before.

### 7.8 `Map.tsx` (MODIFIED)

**Props:** Add `selectedTerritory: number | null`, `ownedTerritoriesHighlighted: boolean`, `playerId: number`.

**Rendering:**
- `selectedTerritory`: render a bright white or gold outline (2px, `#FFFFFF` or `#FFD700`) around the selected territory hex. Distinct from query highlights and ticker highlights.
- `ownedTerritoriesHighlighted`: when true, apply subtle gold glow to all territories where the player owns at least one dimension. When false, normal rendering.

### 7.9 `App.tsx` (MODIFIED)

**New state:**
```typescript
const [selectedTerritory, setSelectedTerritory] = useState<number | null>(null);
const [focusedCardType, setFocusedCardType] = useState<'military' | 'economic' | 'covert' | null>(null);
const [ownedTerritoriesHighlighted, setOwnedTerritoriesHighlighted] = useState(false);
```

**Keyboard event handler:**
```typescript
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    // Suppress hotkeys when query bar is focused (except Tab, Escape, Enter)
    if (document.activeElement?.tagName === 'INPUT') {
      if (!['Tab', 'Escape', 'Enter'].includes(e.key)) return;
    }
    
    switch (e.key) {
      case '1': setFocusedCardType('military'); break;
      case '2': setFocusedCardType('economic'); break;
      case '3': setFocusedCardType('covert'); break;
      case 'w': case 'W': case 'ArrowUp': moveCursor('up'); break;
      case 'a': case 'A': case 'ArrowLeft': moveCursor('left'); break;
      case 's': case 'S': case 'ArrowDown': moveCursor('down'); break;
      case 'd': case 'D': case 'ArrowRight': moveCursor('right'); break;
      case 'Enter': case ' ': confirmAction(); e.preventDefault(); break;
      case 'Escape': clearSelection(); break;
      case 'q': case 'Q': focusQueryBar(); break;
      case 'i': case 'I': toggleIntelPanel(); break;
      case 'c': case 'C': cycleIntelTarget(); break;
      case 'h': case 'H': setOwnedTerritoriesHighlighted(prev => !prev); break;
    }
  };
  document.addEventListener('keydown', handleKeyDown);
  return () => document.removeEventListener('keydown', handleKeyDown);
}, [selectedTerritory, focusedCardType, /* other deps */]);
```

**`moveCursor` function:** Compute the nearest territory in the pressed direction using `HEX_GRID_COORDINATES`. Find the territory with the closest Euclidean distance that is in the correct direction (higher y for down, lower y for up, lower x for left, higher x for right). If no territory is selected, default to territory 1.

**`confirmAction` function:** If `focusedCardType` and `selectedTerritory` are both set, validate that the territory is a valid target for the card type (adjacency for Military, any for Economic and Covert). Call the appropriate reducer via its `useReducer` hook with a single named-args object, e.g. `militaryAttack({ territoryId: selectedTerritory, playerId: 1 })`. Clear selection after.

**`clearSelection` function:** Set `focusedCardType = null`, `selectedTerritory = null`, close any open panels.

**`focusQueryBar` function:** Call `.focus()` on the query input element (use a ref).

**`toggleIntelPanel` function:** Toggle intel panel open/closed state.

**`cycleIntelTarget` function:** Cycle through AI player IDs: 2 → 3 → 4 → null (close).

**Layout changes:** Add `StrategistAlerts` component in top-right area, below ActionBar.

**Dismiss + click handlers:** wire `onDismiss` to the `dismissStrategistAlert` reducer (`useReducer(reducers.dismissStrategistAlert)`), called as `dismissStrategistAlert({ notificationId: id })`. Wire `onAlertClick` to set the highlighted territory.

**Pass props:**
- `StrategistAlerts`: `alerts={strategistLog}`, `onDismiss`, `onAlertClick`.
- `Map`: `selectedTerritory`, `ownedTerritoriesHighlighted`, `playerId`.
- `ActionCard`: `hotkeyNumber` based on card type.
- `IntelPanel`: `hotkeyHint={true}`.

---

## 8. GENERATION RULES

1. **Modify the `risk-dominion/app/` files in place.** Read each file before modifying. Preserve all functionality from Slices 1 through 4 not explicitly changed.
2. **Mark every output file** as MODIFIED or NEW at the top.
3. **Replace `ai_reasoning_cycle` body entirely.** Do not preserve old single-call logic.
4. **All arithmetic is integer arithmetic.** No floats.
5. **SpacetimeDB 2.4.1 idioms:** tables are `#[spacetimedb::table(accessor = name, public)]` on a `pub struct` with column attrs (`#[primary_key]`, `#[auto_inc]`); reducers are `#[spacetimedb::reducer] fn f(ctx: &ReducerContext, ...) -> Result<(), String>`; procedures are `#[spacetimedb::procedure] fn f(ctx: &mut ProcedureContext, ...) -> Ret`; scheduling uses a `scheduled(target_fn)` table with `ScheduleAt`. The `unstable` feature is required for procedures + HTTP. Match the idioms already in `app/server/src/lib.rs`.
6. **Tailwind CSS for all styling.** Use design tokens from `../AESTHETIC.md`.
7. **No emojis. No em dashes. No custom CSS files.**
8. **No threads.** The orchestration is sequential `ctx.http` calls inside one procedure (4 specialists, then 1 commander), committed via `ctx.with_tx`. There is no `std::thread`, no `join()`, no `reqwest`, no `tokio`. All Claude calls go through the existing `anthropic_call` helper. Reducers cannot make HTTP calls; only procedures can.
9. **Handle empty `subordinate_id`** on any pre-Slice-5 `ai_reasoning_log` rows by treating them as `"commander"`.
10. **This is Slice 5 of 7.** Generate everything specified for this slice. No placeholders. Do not implement Slice 6 or 7 features.

---

## 9. WHAT NOT TO GENERATE

Slices 6 (global chat + AI deception) and 7 (spectator mode + replay) come later. Generate everything specified for Slice 5 only. Do not add:
- New dimensions
- New AI opponents
- New card types
- New gameplay mechanics beyond orchestration and hotkeys
- Anything belonging to Slice 6 or Slice 7

---

## 10. SUCCESS CRITERIA

After applying all modifications, the Slice 5 application must:

1. **Compile** — `spacetime build` (or `cargo build`) for the server module, `npm run build` for the client. Zero errors. Regenerate bindings with `spacetime generate --lang typescript --out-dir client/src/module_bindings --module-path server`.
2. **Run orchestrated AI cycles** — All three AIs complete cycles with commander + 4 specialists, all five Claude calls made sequentially within the single `ai_reasoning_cycle` procedure. First cycle up to ~120s, subsequent cycles similar.
3. **Show deliberation chain in intel** — Full subordinate reasoning visible. Commander synthesis last.
4. **Display Strategist alerts** — Notifications appear at 50s and every 60s. Color-coded by priority. Dismissable.
5. **Respond to all hotkeys** — 1/2/3 for cards, WASD/arrows for cursor, Enter/Space to confirm, Escape to clear, Q/I/C/H for panels.
6. **Suppress hotkeys in query bar** — Typing works normally. Escape exits. Hotkeys resume.
7. **Render selection cursor** — White/gold outline on selected territory. Distinct from other highlights.
8. **Show hotkey hints** — Small squares on cards (1,2,3), query bar (Q), Intel panel (I).
9. **Preserve all Slice 4 functionality** — Gameplay, queries, ticker unchanged.

---

## End of Slice 5 Masterplan

Read the existing `risk-dominion/app/` codebase (state after Slice 4). Apply every modification specified above in the order specified. Output every changed file with MODIFIED or NEW at the top. This is Slice 5 of 7. After generation, tag `slice-5-complete`; Slices 6 and 7 follow. Generate now.