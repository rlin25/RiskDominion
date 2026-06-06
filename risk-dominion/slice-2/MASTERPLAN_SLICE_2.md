# RISK: DOMINION — SLICE 2 MASTERPLAN

## Version 2.0
## Scope: AI Opponents, Covert Dimension, Intel System
## Target: Claude Code Generation — Slice 2 of 7
## Platform: SpacetimeDB 2.4.1

---

## 0. DOCUMENT PURPOSE

This document specifies how to grow the working `risk-dominion/app/` codebase from Slice 1 into Slice 2: AI opponents, the Covert dimension, and the intel system. Read this document in full. It is self-contained. Read the existing `app/` codebase. Apply the changes specified here in place.

The canonical code is ONE evolving application at `risk-dominion/app/{server,client}`. Each completed slice is tagged `slice-N-complete` in git. Slice 1 is tagged `slice-1-complete`. You are modifying that codebase in place, not copying it.

Do not regenerate Slice 1. Do not create a new project. Modify the existing files in place. Mark each output file as MODIFIED, NEW, or REMOVED.

This is Slice 2 of 7. Add ONLY what is specified here.

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
- `app/client/src/components/ActionBar.tsx`
- `app/client/src/components/VictoryScreen.tsx`
- `app/client/src/components/PlayerIndicator.tsx`

Understand the current code before making any changes. Then apply the modifications in this document in the order specified.

---

## 2. TECH STACK NOTES

Slice 2 introduces Claude. The AI reasoning cycle and the intel system are SpacetimeDB **procedures**, not reducers. Reducers are sandboxed and CANNOT make HTTP calls; only procedures can, via `ctx.http`. The Anthropic call therefore lives in a scheduled procedure.

No new HTTP-client crate is needed. SpacetimeDB's `unstable` feature provides `ctx.http` for procedures. Do NOT add `reqwest`, `tokio`, or any async runtime. Do NOT use `std::thread::spawn`.

Server `Cargo.toml` already declares (from Slice 1):
```toml
[dependencies]
spacetimedb = { version = "2.4.1", features = ["unstable"] }
log = "0.4"
serde = { version = "1", features = ["derive"] }
serde_json = "1"
```
Slice 2 adds no new crates. (`serde_json` is used to build the request body and parse Claude's reply.) The `unstable` feature is REQUIRED for procedures and `ctx.http`.

---

## 3. FILE LIST

Output each file in the order specified in Section 4. Mark every file as MODIFIED, NEW, or REMOVED at the top.

### MODIFIED Files
1. `server/src/lib.rs` — new tables, new reducers, new procedures, the AI cycle scheduled procedure, modified reducers, new constants
2. `client/src/constants.ts` — add AI and intel constants
3. `client/src/types.ts` — add new interfaces
4. `client/src/utils/territoryHelpers.ts` — update for 3 dimensions (Covert excluded from unification)
5. `client/src/hooks/useSubscriptions.ts` — add covert table subscription
6. `client/src/components/Territory.tsx` — render 3 X-split quadrants
7. `client/src/components/ActionCard.tsx` — add Covert card type
8. `client/src/components/CardHand.tsx` — three card types in rotation
9. `client/src/components/Map.tsx` — pass covert data to Territory
10. `client/src/App.tsx` — single player, IntelPanel, remove PlayerIndicator

`server/Cargo.toml` is unchanged in Slice 2 (no new crates).

### NEW Files
11. `client/src/components/IntelPanel.tsx` — intel query UI (uses `useProcedure(procedures.getIntel)`)

### REMOVED Files
- `client/src/components/PlayerIndicator.tsx` — delete this file. No other file imports it.

---

## 4. GENERATION ORDER

Generate changes in this sequence. Each file must only reference types and components that already exist in the `app/` codebase or were generated earlier in this sequence. After the server changes, regenerate the TypeScript bindings (see Section 4.1) so the client's new tables and the `getIntel` procedure are available.

1. `server/src/lib.rs` (MODIFIED)
2. `client/src/constants.ts` (MODIFIED)
3. `client/src/types.ts` (MODIFIED)
4. `client/src/utils/territoryHelpers.ts` (MODIFIED)
5. `client/src/hooks/useSubscriptions.ts` (MODIFIED)
6. `client/src/components/Territory.tsx` (MODIFIED)
7. `client/src/components/ActionCard.tsx` (MODIFIED)
8. `client/src/components/IntelPanel.tsx` (NEW)
9. `client/src/components/CardHand.tsx` (MODIFIED)
10. `client/src/components/Map.tsx` (MODIFIED)
11. `client/src/App.tsx` (MODIFIED)

### 4.1 Regenerate bindings

After modifying `server/src/lib.rs`, regenerate the client bindings so the new `covert`, `ai_state`, and `ai_reasoning_log` tables and the `getIntel` / `deployAgent` functions appear:

```bash
spacetime generate --lang typescript --out-dir client/src/module_bindings --module-path server
```

Generated row and field names are camelCase (Rust `territory_id` becomes TS `territoryId`, `agent_count` becomes `agentCount`). The non-public `module_config` table is NOT exposed to clients and will not appear in the bindings as subscribable.

---

## 5. SERVER MODIFICATIONS

### 5.1 New Constants (add to CONSTANTS section)

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

Add `ProcedureContext`, `ScheduleAt`, `SpacetimeType`, and `TimeDuration` to the `use spacetimedb::{...}` import alongside the Slice 1 items.

### 5.2 Modified Tables

**`players` table** — add column:
```rust
pub is_ai: bool,
```

### 5.3 New Tables (add to TABLES section)

Tables are `pub struct`s with the `#[spacetimedb::table(accessor = ..., public)]` attribute. Public tables are subscribable by clients; the config table is NOT public.

**`covert`:**
```rust
#[spacetimedb::table(accessor = covert, public)]
pub struct Covert {
    #[primary_key]
    pub territory_id: i32,
    /// 0 means no agents present (no Covert owner).
    pub owner_id: i32,
    pub agent_count: i32,
}
```

**`ai_state`:**
```rust
#[spacetimedb::table(accessor = ai_state, public)]
pub struct AiState {
    #[primary_key]
    pub ai_player_id: i32,
    pub cycle_status: String, // "idle" | "pending"
    pub last_cycle_at: i64,   // 0 if never
    pub next_cycle_at: i64,
}
```

**`ai_reasoning_log`:**
```rust
#[spacetimedb::table(accessor = ai_reasoning_log, public)]
pub struct AiReasoningLog {
    #[primary_key]
    #[auto_inc]
    pub id: u64,
    pub ai_player_id: i32,
    pub cycle_at: i64,
    pub reasoning_text: String,
    pub actions_taken: String, // JSON array
}
```
The `#[auto_inc]` attribute auto-assigns `id`; insert with `id: 0`.

**`module_config` (private — NOT public):** Holds the Anthropic API key and optional model override. Never marked `public`, so clients cannot read it via subscription and the key never appears in source.
```rust
#[spacetimedb::table(accessor = module_config)]
pub struct ModuleConfig {
    #[primary_key]
    pub key: String,
    pub value: String,
}
```

### 5.4 New Scheduled Tables (add to SCHEDULED TABLES section)

A scheduled table drives a target function. The `regen_timer` from Slice 1 already drives `regenerate_action_points`. Add one that drives the AI cycle procedure:

```rust
/// Drives the `ai_reasoning_cycle` procedure. One in-flight row per AI; each
/// cycle re-schedules the next via a one-shot `ScheduleAt::Time` (self-pacing,
/// allowing staggered starts).
#[spacetimedb::table(accessor = ai_cycle_schedule, scheduled(ai_reasoning_cycle))]
pub struct AiCycleSchedule {
    #[primary_key]
    #[auto_inc]
    pub scheduled_id: u64,
    pub ai_player_id: i32,
    pub scheduled_at: ScheduleAt,
}
```

The target of a `scheduled(...)` table receives the row as its argument. Here the target is a **procedure** (it makes an HTTP call), which is allowed.

### 5.5 New Procedure Return Type (add to PROCEDURE RETURN TYPES section)

The intel system returns structured data to the client. Custom return types derive `SpacetimeType`:

```rust
#[derive(SpacetimeType)]
pub struct IntelResult {
    pub status: String, // "success" | "insufficient_intel" | "no_recent_reasoning"
    pub intel_text: String,
    pub ai_player_name: String,
    pub cycle_timestamp: i64,
    pub territories_referenced: Vec<i32>,
}
```

### 5.6 Config Reducer + Helper

The API key is seeded after publish via a `set_config` reducer, never via environment variables. Add:

```rust
/// Set a private config value (e.g. the Anthropic API key). Operator-only in
/// practice; values live in the non-public `module_config` table.
#[spacetimedb::reducer]
pub fn set_config(ctx: &ReducerContext, key: String, value: String) {
    if let Some(mut row) = ctx.db.module_config().key().find(key.clone()) {
        row.value = value;
        ctx.db.module_config().key().update(row);
    } else {
        ctx.db.module_config().insert(ModuleConfig { key, value });
    }
}

fn config_value(ctx: &ReducerContext, key: &str) -> Option<String> {
    ctx.db.module_config().key().find(key.to_string()).map(|r| r.value)
}
```

After publishing, seed the key once:
```bash
spacetime call risk-dominion set_config '"anthropic_api_key"' '"sk-ant-..."'
```
The model defaults to `claude-sonnet-4-6`; override it with an optional `anthropic_model` config row.

### 5.7 Modified `start_game` Reducer

**Idempotency:** Same as Slice 1. If `game_state` has 'status' key, return immediately.

**Players:** Insert 4 rows instead of 2:
| player_id | player_name | color | is_ai | action_points | last_regen_at |
|-----------|-------------|-------|-------|---------------|---------------|
| 1 | Player | #4488FF | false | 5 | now |
| 2 | Zhao | #FF4444 | true | 5 | now |
| 3 | Consortium | #FFAA00 | true | 5 | now |
| 4 | Prophet | #AA44FF | true | 5 | now |

`last_regen_at` and all `*_at` timestamps are `i64` millis derived from `ctx.timestamp` via `ctx.timestamp.to_micros_since_unix_epoch() / 1000`. Do NOT use `SystemTime::now()` or any wall clock.

**AI State + cycle schedule:** Insert 3 `ai_state` rows and arm one staggered cycle per AI. `last_cycle_at` is `0` (never run yet). The stagger offset is `AI_STAGGER_SECONDS * (ai_id - 2)`, so Zhao starts at +0s, Consortium at +20s, Prophet at +40s:

| ai_player_id | cycle_status | last_cycle_at | next_cycle_at |
|-------------|-------------|---------------|---------------|
| 2 | idle | 0 | now |
| 3 | idle | 0 | now + 20s |
| 4 | idle | 0 | now + 40s |

For each AI, also insert an `ai_cycle_schedule` row with a one-shot `ScheduleAt::Time(ctx.timestamp + Duration::from_secs(offset))`. Each cycle re-arms the next one (self-pacing chain), so only the first cycle is scheduled here:

```rust
for ai_id in [2, 3, 4] {
    let offset = AI_STAGGER_SECONDS * (ai_id - 2) as u64;
    let next_at = ctx.timestamp + std::time::Duration::from_secs(offset);
    ctx.db.ai_state().insert(AiState {
        ai_player_id: ai_id,
        cycle_status: "idle".to_string(),
        last_cycle_at: 0,
        next_cycle_at: now_millis_ts(next_at),
    });
    ctx.db.ai_cycle_schedule().insert(AiCycleSchedule {
        scheduled_id: 0,
        ai_player_id: ai_id,
        scheduled_at: ScheduleAt::Time(next_at),
    });
}
```

**Territories:** Insert 12 rows into `military`, `economic`, and `covert`. Full seed data:

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

`cov_owner = 0` means no agents present.

**Scheduled functions:** The `regen_timer` (drives `regenerate_action_points`, unchanged, now runs for 4 players) is already armed in Slice 1's `start_game`. Slice 2 additionally arms the three `ai_cycle_schedule` rows shown above, which drive the `ai_reasoning_cycle` procedure.

### 5.8 Shared Action Logic (refactor before adding the AI cycle)

Both the player-facing reducers and the AI cycle need the same action logic. Extract the body of each action into a private `do_*` fn that takes `&ReducerContext` and returns `Result<(), String>`, then make the reducers thin wrappers. The AI cycle calls these same fns inside its transaction. (Inside a procedure, `tx` from `ctx.with_tx` is a `&ReducerContext`, so the same fns work.)

```rust
fn do_military_attack(ctx: &ReducerContext, territory_id: i32, player_id: i32) -> Result<(), String> { /* ... */ }
fn do_economic_invest(ctx: &ReducerContext, territory_id: i32, player_id: i32) -> Result<(), String> { /* ... */ }
fn do_deploy_agent(ctx: &ReducerContext, territory_id: i32, player_id: i32) -> Result<(), String> { /* ... */ }
```

### 5.9 Modified Existing Reducers

Reducers take `ctx: &ReducerContext` and return `Result<(), String>`. Success is `Ok(())`; a validation failure is `Err("message".into())`. Reducers CANNOT return data to clients; the client observes outcomes via its subscriptions.

**`military_attack(ctx, territory_id, player_id)`:**
- Thin wrapper: `do_military_attack(ctx, territory_id, player_id)`.
- The shared fn validates `player_id` in 1..=4 (was 1 or 2). Combat logic unchanged.

**`economic_invest(ctx, territory_id, player_id)`:**
- Thin wrapper: `do_economic_invest(ctx, territory_id, player_id)`.
- The shared fn validates `player_id` in 1..=4 (was 1 or 2). Invest logic unchanged.

**`dimension_owner_change(ctx, new_owner)` (private fn, runs in caller's tx):**
- Win check: count territories where `military.owner_id == new_owner AND economic.owner_id == new_owner`.
- Covert ownership is NOT included in unification.
- Threshold remains `WIN_UNIFIED_TERRITORIES = 3`.

**`regenerate_action_points(ctx, timer)` (scheduled reducer):**
- Iterate over all 4 players. Logic unchanged: +1 per player, cap 10, every 8 seconds. Use `ctx.timestamp`, not wall clock.

### 5.10 New Reducer: `deploy_agent`

A reducer (the player drops a Covert card). Thin wrapper over the shared fn:

```rust
#[spacetimedb::reducer]
pub fn deploy_agent(ctx: &ReducerContext, territory_id: i32, player_id: i32) -> Result<(), String> {
    do_deploy_agent(ctx, territory_id, player_id)
}
```

`do_deploy_agent` logic:
- Validate game active, valid player (1..=4), valid territory (1..=12), `action_points >= 1`. On failure return `Err("...".into())`.
- Decrement action points by 1.
- `agent_count += 1`. If `owner_id != player_id` (including 0), set `owner_id = player_id` (new owner inherits the existing agents plus the new one) and call `dimension_owner_change(ctx, player_id)`.

### 5.11 New Procedure: `get_intel`

`get_intel` RETURNS structured data to the caller, so it is a **procedure**, not a reducer (reducers cannot return data). It makes no HTTP call. All DB access inside a procedure goes through `ctx.with_tx(|tx| { ... })`.

```rust
#[spacetimedb::procedure]
pub fn get_intel(ctx: &mut ProcedureContext, ai_player_id: i32) -> IntelResult {
    ctx.with_tx(|tx| {
        // 1. If ai_player_id is not 2..=4: return status "insufficient_intel" ("Unknown AI").
        // 2. Find most recent ai_reasoning_log row for this AI (max by cycle_at).
        //    If none: return status "no_recent_reasoning".
        // 3. Compute the human player's (owner_id == 1) max agent_count across
        //    territories where the AI owns military OR economic.
        // 4. If max < INTEL_THRESHOLD (3): return status "insufficient_intel".
        // 5. Else: parse territory_id values out of the latest actions_taken JSON
        //    and return status "success" with reasoning_text, ai name, cycle_at,
        //    and territories_referenced.
    })
}
```

Returned `IntelResult` shapes:
```json
// success
{"status":"success","intel_text":"{reasoning_text}","ai_player_name":"Zhao","cycle_timestamp":1234,"territories_referenced":[3,7,11]}
// not enough agents
{"status":"insufficient_intel","intel_text":"Insufficient intel. Deploy agents in territories where Zhao is active.","ai_player_name":"Zhao","cycle_timestamp":0,"territories_referenced":[]}
// AI has not run a cycle yet
{"status":"no_recent_reasoning","intel_text":"No intelligence available yet. Zhao has not completed its first planning cycle.","ai_player_name":"Zhao","cycle_timestamp":0,"territories_referenced":[]}
```

### 5.12 New Scheduled Procedure: `ai_reasoning_cycle`

This is the heart of Slice 2. It is a scheduled **procedure** (not a reducer) because it calls Claude over HTTP, and only procedures have `ctx.http`. The scheduled `ai_cycle_schedule` table drives it; the row is passed in.

The cycle uses the pattern: snapshot state + reschedule in one transaction, do the HTTP call with no transaction held open, then apply results in a second transaction. A `pending` guard prevents overlapping cycles. Each cycle re-arms the next one (self-pacing chain) regardless of whether it runs, keeping the chain alive.

```rust
#[spacetimedb::procedure]
pub fn ai_reasoning_cycle(ctx: &mut ProcedureContext, row: AiCycleSchedule) {
    let ai_id = row.ai_player_id;
    let now = ctx.timestamp;
    let next_at = now + std::time::Duration::from_secs(AI_CYCLE_SECONDS);

    // tx1: always re-arm the next cycle, then decide whether to run.
    // Returns (system_prompt, api_key, model) only when we should call Claude.
    let plan: Option<(String, String, String)> = ctx.with_tx(|tx| {
        tx.db.ai_cycle_schedule().insert(AiCycleSchedule {
            scheduled_id: 0,
            ai_player_id: ai_id,
            scheduled_at: ScheduleAt::Time(next_at),
        });

        if !game_is_active(tx) { return None; }
        let state = tx.db.ai_state().ai_player_id().find(ai_id)?;
        if state.cycle_status == "pending" { return None; } // previous cycle in flight

        let api_key = config_value(tx, "anthropic_api_key")?; // no key -> skip
        let model = config_value(tx, "anthropic_model")
            .unwrap_or_else(|| DEFAULT_MODEL.to_string());

        let mut st = state;
        st.cycle_status = "pending".to_string();
        st.next_cycle_at = now_millis_ts(next_at);
        tx.db.ai_state().ai_player_id().update(st);

        Some((build_system_prompt(tx, ai_id), api_key, model))
    });

    let (system_prompt, api_key, model) = match plan {
        Some(p) => p,
        None => return,
    };

    // HTTP call to Claude (no tx held open).
    let result = anthropic_call(
        ctx, &api_key, &model, &system_prompt,
        "Decide your moves for this turn. End with the JSON action array.",
        AI_MAX_TOKENS, AI_LLM_TIMEOUT_SECONDS,
    );

    // tx2: apply actions + log + return to idle.
    ctx.with_tx(|tx| {
        match &result {
            Ok(text) => {
                let actions = parse_actions(text);
                apply_ai_actions(tx, ai_id, &actions, text);
            }
            Err(err) => {
                log::error!("AI {ai_id} Claude call failed: {err}");
                if let Some(mut st) = tx.db.ai_state().ai_player_id().find(ai_id) {
                    st.cycle_status = "idle".to_string();
                    tx.db.ai_state().ai_player_id().update(st);
                }
            }
        }
    });
}
```

The self-pacing chain replaces the old fixed schedule. Effective cadence is still ~60s per AI, with the staggered first-fire from `start_game` (Zhao +0s, Consortium +20s, Prophet +40s). A 30s LLM timeout means a slow turn is dropped, not banked; the `pending` guard skips any cycle that fires while one is still in flight.

### 5.13 The Anthropic call helper

A single helper builds and sends the Messages request via `ctx.http` (the only function type with HTTP), then extracts `content[0].text`. Every Claude-using procedure goes through it. Note: the model pin is `claude-sonnet-4-6` and the header is `anthropic-version: 2023-06-01` — do not change these.

```rust
fn anthropic_call(
    ctx: &mut ProcedureContext,
    api_key: &str, model: &str, system: &str, user: &str,
    max_tokens: u32, timeout_secs: u64,
) -> Result<String, String> {
    let body = serde_json::json!({
        "model": model,
        "max_tokens": max_tokens,
        "system": system,
        "messages": [{ "role": "user", "content": user }],
    }).to_string();

    let request = spacetimedb::http::Request::builder()
        .method("POST")
        .uri(ANTHROPIC_URL)
        .header("x-api-key", api_key)
        .header("anthropic-version", ANTHROPIC_VERSION)
        .header("content-type", "application/json")
        .extension(spacetimedb::http::Timeout(TimeDuration::from_micros(
            (timeout_secs * 1_000_000) as i64,
        )))
        .body(body)
        .map_err(|e| format!("build request: {e}"))?;

    let response = ctx.http.send(request).map_err(|e| format!("http: {e}"))?;
    let (parts, body) = response.into_parts();
    let text = body.into_string_lossy();
    if !parts.status.is_success() {
        return Err(format!("anthropic status {}: {text}", parts.status));
    }
    let value: serde_json::Value =
        serde_json::from_str(&text).map_err(|e| format!("parse: {e}"))?;
    value.get("content").and_then(|c| c.get(0))
        .and_then(|c| c.get("text")).and_then(|t| t.as_str())
        .map(|s| s.to_string())
        .ok_or_else(|| "no content in response".to_string())
}
```

### 5.14 Applying AI actions (private fn inside tx2)

There is no `ai_submit_actions` reducer and no cross-thread/queue mechanism. The AI's actions are applied by a private fn, `apply_ai_actions`, called inside the cycle's second transaction. It runs each action through the same shared `do_*` fns the human uses (so the AI is validated identically — no cheating), records per-action acceptance, returns the AI to `idle`, and writes the reasoning log.

```rust
fn apply_ai_actions(ctx: &ReducerContext, ai_id: i32, actions: &[(String, i32)], reasoning: &str) {
    let mut results: Vec<serde_json::Value> = Vec::new();
    for (action_type, territory_id) in actions {
        let outcome = match action_type.as_str() {
            "military_attack" => do_military_attack(ctx, *territory_id, ai_id),
            "economic_invest" => do_economic_invest(ctx, *territory_id, ai_id),
            "deploy_agent"    => do_deploy_agent(ctx, *territory_id, ai_id),
            other => Err(format!("Unknown action type: {other}")),
        };
        match outcome {
            Ok(()) => results.push(serde_json::json!({
                "action_type": action_type, "territory_id": territory_id, "accepted": true })),
            Err(reason) => results.push(serde_json::json!({
                "action_type": action_type, "territory_id": territory_id, "accepted": false, "reason": reason })),
        }
    }

    let ts = now_millis(ctx);
    if let Some(mut st) = ctx.db.ai_state().ai_player_id().find(ai_id) {
        st.cycle_status = "idle".to_string();
        st.last_cycle_at = ts;
        ctx.db.ai_state().ai_player_id().update(st);
    }
    ctx.db.ai_reasoning_log().insert(AiReasoningLog {
        id: 0,
        ai_player_id: ai_id,
        cycle_at: ts,
        reasoning_text: reasoning.to_string(),
        actions_taken: serde_json::Value::Array(results).to_string(),
    });
}
```

Each action point is consumed inside the per-action `do_*` call (which checks `action_points >= 1` first), so the AI can never spend more points than it has and cannot bank actions across cycles.

`parse_actions` tolerantly extracts the LAST balanced `[ ... ]` block from Claude's reply (reasoning prose precedes the JSON array) and parses out `(action_type, territory_id)` pairs.

---

## 6. LLM PROMPT TEMPLATES

`build_system_prompt(ctx, ai_id)` constructs the system prompt from a live board snapshot read inside the cycle's first transaction. Replace `{placeholders}` with actual values. The prompt asks for a short natural-language strategy followed by a JSON action array as the final element (so the intel system can show readable reasoning and `parse_actions` can extract the trailing array).

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

The user message paired with this system prompt is a fixed string: "Decide your moves for this turn. End with the JSON action array."

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

## 7. CLIENT MODIFICATIONS

### 7.1 `constants.ts` (MODIFIED)

Add to existing constants:

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

Update `PLAYER_COLORS` to include AI players:
```typescript
export const PLAYER_COLORS: Record<number, string> = {
  1: "#4488FF",
  2: "#FF4444",
  3: "#FFAA00",
  4: "#AA44FF"
};
```

### 7.2 `types.ts` (MODIFIED)

Add new interfaces:

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

Update `PlayerRow` to include:
```typescript
is_ai: boolean;
```

### 7.3 `territoryHelpers.ts` (MODIFIED)

**`countUnifiedTerritories`:** This function continues to check only Military AND Economic. Covert ownership is NOT included in unification calculations. Victory remains at 3 territories with both Military and Economic owned by the same player. Do not change the unification logic.

**Add `getCovertOwner` helper:**
```typescript
export function getCovertOwner(covert: CovertRow[], territoryId: number): number {
  const row = covert.find(c => c.territory_id === territoryId);
  return row ? row.owner_id : 0;
}

export function getAgentCount(covert: CovertRow[], territoryId: number): number {
  const row = covert.find(c => c.territory_id === territoryId);
  return row ? row.agent_count : 0;
}
```

### 7.4 `useSubscriptions.ts` (MODIFIED)

Subscriptions use the generated table accessors via the React hook `useTable(tables.x)`, which returns `[rows, isReady]`. Add the covert table:
```typescript
const [covert] = useTable(tables.covert);
```

Include `covert` in the returned object alongside military, economic, players, gameState. (The `ai_state` and `ai_reasoning_log` tables are also public; subscribe to them here only if a component needs them. The intel system reads reasoning through the `getIntel` procedure, not a subscription.)

### 7.5 `Territory.tsx` (MODIFIED)

**Props:** Add `covertOwner: number`, `agentCount: number`.

**Rendering:** The hexagon now shows 3 of 4 X-split quadrants:
- Top-left wedge: Military owner color
- Top-right wedge: Economic owner color
- Bottom-left wedge: Covert owner color (purple for player, gray for AI, neutral #2A2A3E if no agents)
- Bottom-right wedge: neutral #2A2A3E (reserved for Cultural in Slice 3)

**Hover:** Show all three values. Add agent count to tooltip.

**Highlight/owned states:** Same as Slice 1. Player's ownership in any dimension adds white border.

### 7.6 `ActionCard.tsx` (MODIFIED)

Add Covert card type:
- Card type: `'covert'`
- Left border color: `#AA44FF` (dim-covert)
- Icon: concentric circles SVG per AESTHETIC.md Section 13.3
- Label: "DEPLOY"

The existing Military and Economic card types remain unchanged.

### 7.7 `IntelPanel.tsx` (NEW)

**Position:** Left side of screen or collapsible sidebar.

**Content:**
- Header: "INTELLIGENCE" in Orbitron, 14px, text-secondary.
- Three buttons, one per AI:
  - "What is Zhao planning?" — red accent
  - "What is Consortium planning?" — orange accent
  - "What is Prophet planning?" — purple accent
- `getIntel` is a procedure, so call it via the React hook: `const getIntel = useProcedure(procedures.getIntel);`. Each button does `const result = await getIntel({ aiPlayerId });` and stores the returned `IntelResult` in component state. (Procedures return their value to the caller; reducers do not.)
- Results area below buttons:
  - On success: show AI name, timestamp (formatted), reasoning text in JetBrains Mono, 12px.
  - On insufficient_intel: show guidance text in text-secondary, italic.
  - On no_recent_reasoning: show waiting message.
  - While loading: show subtle pulse animation on the button.
- When territories_referenced is non-empty, pass those IDs to App for map highlighting.

### 7.8 `CardHand.tsx` (MODIFIED)

**Card rotation:** Include Covert cards in the hand. Rotation pattern: Military, Economic, Covert, Military, Economic, Covert... (cycling through all three types). Cards present only when action points available.

**Drag logic for Covert:** All 12 territories are valid targets. No adjacency restriction. On drop, call the reducer via the hook: `const deployAgent = useReducer(reducers.deployAgent);` then `await deployAgent({ territoryId, playerId: 1 });`. The reducer returns no data; the map updates through the covert subscription.

### 7.9 `Map.tsx` (MODIFIED)

**Props:** Add `covert: CovertRow[]`.

**Pass to Territory:** `covertOwner={getCovertOwner(covert, id)}` and `agentCount={getAgentCount(covert, id)}`.

### 7.10 `App.tsx` (MODIFIED)

**Remove:**
- `?player=` URL parameter parsing. Player is always player_id 1.
- Import and render of `PlayerIndicator`.

**Add:**
- Import and render `IntelPanel`.
- `covert` data from `useSubscriptions`.
- Pass covert data to `Map`.
- `highlightedTerritories` state (shared between IntelPanel and Map for intel-based highlighting).

**Layout update:**
- Top-left: IntelPanel (collapsible)
- Top-right: ActionBar
- Center: Map
- Bottom: CardHand
- Overlay: VictoryScreen

**Delete file:** `client/src/components/PlayerIndicator.tsx` — no other file imports it.

---

## 8. GENERATION RULES

1. **Modify existing files in place** under `risk-dominion/app/`. Read each file before modifying. Preserve all Slice 1 functionality not explicitly changed.
2. **Mark every output file** as MODIFIED, NEW, or REMOVED at the top.
3. **All arithmetic is integer arithmetic.** No floats.
4. **SpacetimeDB 2.4.1 idioms:**
   - Tables: `#[spacetimedb::table(accessor = name, public)]` on a `pub struct`; column attrs `#[primary_key]`, `#[auto_inc]`, `#[unique]`, `#[index(btree)]`. The config table is NOT `public`.
   - Reducers: `#[spacetimedb::reducer] fn f(ctx: &ReducerContext, ...) -> Result<(), String>`. Success `Ok(())`, failure `Err("msg".into())`. Reducers cannot return data.
   - Procedures (return data and/or do HTTP): `#[spacetimedb::procedure] fn f(ctx: &mut ProcedureContext, ...) -> Ret`. DB access via `ctx.with_tx(|tx| ...)`. HTTP via `ctx.http`.
   - Scheduled tables: `#[spacetimedb::table(accessor = t, scheduled(target_fn))]` with `#[primary_key] #[auto_inc] scheduled_id: u64` + `scheduled_at: ScheduleAt`. Arm with `ScheduleAt::Interval(...)` (repeating) or `ScheduleAt::Time(ctx.timestamp + ...)` (one-shot).
5. **Tailwind CSS for all styling.** Use design tokens from `../AESTHETIC.md`.
6. **No emojis. No em dashes. No custom CSS files.**
7. **LLM calls happen ONLY in a procedure, via `ctx.http`.** Reducers are sandboxed and cannot make HTTP calls. Do NOT use `reqwest`, `tokio`, async Rust, or `std::thread::spawn`. Do NOT use a queue table or cross-thread reducer calls.
8. **Anthropic API only.** Read the API key from the private `module_config` table (`config_value(ctx, "anthropic_api_key")`), never from environment variables. Model defaults to `claude-sonnet-4-6`. Header `anthropic-version: 2023-06-01`.
9. **Time comes from `ctx.timestamp`** (deterministic), never `SystemTime::now()`. Store `*_at` fields as `i64` millis via `ctx.timestamp.to_micros_since_unix_epoch() / 1000`.
10. **The human player is always player_id 1.** AI opponents are 2, 3, 4.

---

## 9. WHAT NOT TO GENERATE

Do NOT add:
- Cultural dimension table or `cultural_spread_tick` reducer
- Cross-dimension bonuses (Military to Economic, Economic to Cultural, etc.)
- Query bar, `query_database`, `get_canned_query` procedures
- Event feed table or event ticker
- Any features from Slices 3 through 7

---

## 10. SUCCESS CRITERIA

After applying all modifications, the Slice 2 application must:

1. **Compile** — `spacetime build` (or `cargo build`) for the server module, `npm run build` for the client. Zero errors. The `unstable` feature must be enabled for procedures + `ctx.http`.
2. **Load as single-player** — No URL parameter needed. Player is blue. Action bar shows Player color.
3. **Render 3-quadrant hexes** — Territories show Military, Economic, and Covert quadrants matching seed data. Home territories show agents.
4. **Offer three card types** — Military (red), Economic (gold), Covert (purple) all in hand rotation.
5. **Deploy agents** — Dragging Covert card onto a territory increments agent count. Inherits on flip.
6. **Run AI cycles** — All three AIs execute actions within 60 seconds of game start. Staggered timing.
7. **Return intel** — Player with 3+ agents in AI territory sees reasoning text and territory highlights.
8. **Show insufficient intel** — Player without agents sees "Insufficient intel" message.

---

## End of Slice 2 Masterplan

Read the existing `risk-dominion/app/` codebase (tagged `slice-1-complete`). Apply every modification specified above in the order specified. Output every changed file with MODIFIED, NEW, or REMOVED at the top. Do not regenerate unchanged files. Do not add features from later slices. This is Slice 2 of 7.