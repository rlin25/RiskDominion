# RISK: DOMINION — SLICE 5 INTERFACE CONTRACT

## Version 2.0 (SpacetimeDB 2.4.1)
## Scope: Subagent Orchestration, Hotkeys, Human Strategist
## Target: Claude Code Generation — Evolving the `risk-dominion/app/` Codebase

---

## 0. HOW TO READ THIS DOCUMENT

This document specifies every table, reducer, procedure, subscription, component, prompt, and hotkey binding that is **new or modified** in Slice 5. It does not repeat the Slice 1 through 4 specifications.

**All prior tables, reducers, procedures, subscriptions, and constants remain in effect unless this document explicitly modifies them.** If a component is not mentioned here, it is unchanged from the state after Slice 4 (tagged `slice-4-complete` in the single `risk-dominion/app/` codebase).

Server function types in SpacetimeDB 2.4.1: **reducers** (deterministic, mutate state, return `Result<(), String>`, cannot make HTTP calls), **procedures** (can return data to the caller and are the only function type allowed to make HTTP calls via `ctx.http`), and **views**. Generated client bindings use camelCase field names (Rust `territory_id` -> TS `territoryId`).

---

## 1. MODIFIED TABLES

### 1.1 `ai_reasoning_log`

Add one column to the existing table (a plain `String` field on the `pub struct`; generated as `subordinateId` in client bindings):

| Column | Rust type | Notes | Description |
|--------|-----------|-------|-------------|
| `subordinate_id` | `String` | always written by the module | Which agent produced this reasoning ("commander" for the commander row) |

Values: `"commander"`, `"vanguard"`, `"paymaster"`, `"scout"`, `"adjutant"` (Zhao), `"auditor"`, `"actuary"`, `"courier"`, `"appraiser"` (Consortium), `"whisper"`, `"oracle"`, `"seer"`, `"warden"` (Prophet). (The human Strategist writes to its own `strategist_log` table, not here.)

There is no SQL `DEFAULT`; the value is set on every insert. Pre-Slice-5 rows that carry an empty `subordinate_id` are treated as `"commander"` by `get_intel`. All other columns (`id`, `ai_player_id`, `cycle_at`, `reasoning_text`, `actions_taken`) remain unchanged.

---

## 2. NEW TABLES

### 2.1 `strategist_log`

| Column | Rust type | Notes | Description |
|--------|-----------|-------|-------------|
| `id` | `u64` | `#[primary_key] #[auto_inc]` | Unique notification ID |
| `created_at` | `i64` | ms since epoch (`ctx.timestamp`) | When the notification was generated |
| `notification` | `String` | | Advisor message text |
| `priority` | `String` | written on insert | "critical", "warning", or "info" |
| `territory_id` | `i32` | `0` means none | Territory referenced, for map highlight on click |
| `player_id` | `i32` | `1` for the human | Player the advice is for |
| `dismissed` | `bool` | `false` on insert | Whether the player has dismissed this alert |

Declare with `#[spacetimedb::table(accessor = strategist_log, public)]` on a `pub struct`. The table is `public` so the client can subscribe. We model the optional territory as `i32` with `0` = none (rather than `Option<i32>`) to keep the generated client binding flat; the client treats `territoryId === 0` as "no territory".

---

## 3. MODIFIED PROCEDURES AND REDUCERS

`ai_reasoning_cycle` and `get_intel` are **procedures** (the former makes HTTP calls; the latter returns data). `dismiss_strategist_alert` is a **reducer**. `apply_ai_actions` is a **private fn** invoked inside the cycle procedure's transaction (not a reducer, not cross-thread, and there is no queue table).

### 3.1 Procedure `ai_reasoning_cycle(row: AiCycleSchedule)`

**Schedule:** Unchanged from Slice 2 — driven by the `ai_cycle_schedule` table, three AIs, 60s cadence, staggered 20s apart (Zhao at 0s, Consortium at 20s, Prophet at 40s). Each cycle self-re-schedules with a one-shot `ScheduleAt::Time`.

**New logic: sequential orchestration (no threads).** SpacetimeDB has no `std::thread`, no `join()`, no `reqwest`, and no `tokio`. The four specialist calls and the one commander call are made **sequentially** inside this single procedure via the existing `anthropic_call` helper (`ctx.http`). DB access is only inside `ctx.with_tx`.

1. **tx1:** Re-arm this AI's next cycle (`ScheduleAt::Time(now + 60s)`). If the game is not active, stop. If `ai_state.cycle_status == "pending"`, stop (previous cycle still in flight). Read `anthropic_api_key` and `anthropic_model` from the non-public `module_config` (stop if no key). Set `cycle_status = "pending"`. Capture `cycle_at` from `ctx.timestamp`. Build the four domain snapshots and the full game state snapshot, plus action points and persona. Return them out of the tx.
   - **Military snapshot:** military table (all rows), adjacency map, covert table (for combat bonus), players table.
   - **Economic snapshot:** economic table (all rows), military table (for invest bonus), adjacency map, players table.
   - **Cultural snapshot:** cultural table (all rows), economic table (for pressure bonus), adjacency map, players table.
   - **Covert snapshot:** covert table (all rows), cultural table (for intel bonus), players table.
2. **HTTP, specialists (no tx held open):** Select the four specialist prompts by `ai_player_id` (Section 5). For each specialist in fixed order (military, economic, cultural, covert), call `anthropic_call(ctx, &api_key, &model, prompt, snapshot, 150, 15)` (max_tokens 150, timeout 15s). On success, parse the JSON recommendation array. On error or timeout, record an empty `SubordinateResult` (do not abort).
3. **HTTP, commander (no tx held open):** Build the commander prompt (Section 4) with the full game state, the AI persona, and the four specialists' recommendations (or the "specialist unavailable this cycle" placeholder from Section 4 for any that failed). Call `anthropic_call(ctx, &api_key, &model, commander_prompt, "Synthesize and decide. End with the JSON action array.", 500, 30)` (max_tokens 500, timeout 30s).
4. **tx2:** On commander success, parse the action array (reuse `parse_actions`) and call the private `apply_ai_actions` fn (Section 3.2). On commander failure, log the error and set `cycle_status = "idle"`.

**Latency trade-off:** the five Claude calls run sequentially, so a cycle's wall-clock time is roughly the sum of the five call latencies (first cycle up to ~120s). This is acceptable given the 20s stagger and self-re-scheduling. **Fallback only if needed:** fan the specialists out across separate scheduled-procedure rows that each write a `SubordinateResult` to a scratch table, with a follow-up commander row reading them back. Not implemented in Slice 5.

### 3.2 Private fn `apply_ai_actions` (runs inside the cycle's tx2)

This replaces the Slice 2 `apply_ai_actions`. It is a private Rust fn called inside `ctx.with_tx` from `ai_reasoning_cycle`: not a reducer, and not invoked across threads or via a queue table.

```rust
fn apply_ai_actions(
    ctx: &ReducerContext,            // tx handle inside ctx.with_tx
    ai_player_id: i32,
    actions: &[(String, i32)],       // (action_type, territory_id) from the commander reply
    commander_reasoning: &str,
    subordinates: &[SubordinateResult],
    cycle_at: i64,
)
```

Where `SubordinateResult` is:
```rust
struct SubordinateResult {
    subordinate_id: String,
    reasoning_text: String, // "" on failure
    actions_json: String,   // JSON array of recommended actions, or "[]"
}
```

**Behavior:**
1. Validate and execute each action via the shared `do_military_attack` / `do_economic_invest` / `do_deploy_agent` logic (unchanged from Slice 2 through Slice 4), building the `actions_taken` JSON of outcomes.
2. Set `ai_state.cycle_status = "idle"` and `last_cycle_at = cycle_at`.
3. Insert one `ai_reasoning_log` row per subordinate (including timed-out ones with empty reasoning), then the commander row last with the final `actions_taken` JSON. All rows share the same `cycle_at` and `ai_player_id`; each carries its own `subordinate_id` ("commander" for the commander row).

### 3.3 Procedure `get_intel(ai_player_id: INT)`

`get_intel` remains a **procedure** (it returns structured data). Its `IntelResult` and the new `DeliberationEntry` are `#[derive(SpacetimeType)]` structs; `deliberation` is a `Vec<DeliberationEntry>`. All DB access is inside `ctx.with_tx`.

**Modified return structure.** Instead of a single `intel_text` string, return a deliberation chain (shown as JSON for readability):

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
            "reasoning": "Brazil is vulnerable. Player has only 4 troops there. We have 8 troops adjacent. Recommend attack.",
            "recommendations": [{"action_type": "military_attack", "territory_id": 4}]
        },
        {
            "subordinate_id": "scout",
            "subordinate_name": "Scout",
            "role": "Covert Specialist",
            "reasoning": "Confirmed. We have 3 agents in Brazil. Attack bonus applies.",
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

- Query `ai_reasoning_log` for the most recent `cycle_at` for this AI, then return all rows with that `cycle_at`, ordered by subordinate (specialists first, "commander" last).
- `deliberation` is a `Vec<DeliberationEntry>`; each entry carries `subordinate_id`, `subordinate_name`, `role`, `reasoning`, and `actions_json` (the recommended-actions JSON). Map `subordinate_id` to display name and role.
- `territories_referenced` aggregates all territory IDs from all subordinates' and commander's `actions_taken` JSON.
- Rows with an empty `subordinate_id` (pre-Slice-5 data) are treated as "commander".
- The intel threshold check (3 effective agents) remains unchanged from Slice 3.
- `insufficient_intel` and `no_recent_reasoning` statuses remain unchanged.

### 3.4 Reducer `dismiss_strategist_alert(notification_id: u64)`

A plain client-callable **reducer** (mutates state, returns no data; the client observes the change via its `strategist_log` subscription).

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

---

## 4. COMMANDER PROMPT TEMPLATE

The commander receives all four specialist recommendations and synthesizes them.

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

---

## 5. SPECIALIST PROMPTS

Each specialist prompt includes: role introduction, AI persona context, domain-specific data, and output format instructions. All specialists return a JSON array of up to 3 recommended actions with one-sentence reasoning.

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

## 6. STRATEGIST CYCLE

### 6.1 Scheduled Procedure: `strategist_cycle(row: StrategistSchedule)`

The Strategist calls Claude over HTTP, so it is a **scheduled procedure**, not a reducer (reducers cannot make HTTP calls). It is driven by its own scheduled table:

```rust
#[spacetimedb::table(accessor = strategist_schedule, scheduled(strategist_cycle))]
pub struct StrategistSchedule {
    #[primary_key]
    #[auto_inc]
    pub scheduled_id: u64,
    pub scheduled_at: ScheduleAt,
}
```

**Schedule:** `start_game` seeds one row with `ScheduleAt::Time(ctx.timestamp + 50s)` so the first cycle fires at 50s. Each cycle re-arms the next with `ScheduleAt::Time(now + 60s)`, giving fires at 50s, 110s, 170s, and so on.

**Logic (tx1 -> HTTP -> tx2):**
1. **tx1:** Re-arm the next cycle (`now + 60s`). If the game is not active, stop. Read `anthropic_api_key` and `anthropic_model` from `module_config` (stop if no key). Build the full game state snapshot (same content as `query_database`). Return it out of the tx.
2. **HTTP (no tx held open):** Call `anthropic_call(ctx, &api_key, &model, strategist_prompt, "Return the JSON notifications array.", 300, 15)` (max_tokens 300, timeout 15s). The prompt:

```
You are the Strategist, an AI advisor for the human player in Risk: Dominion. The player is player_id 1. You are on their side. Analyze the current game state and identify:

1. THREATS — What should the player be worried about? (Opponents close to victory, troop buildups on borders, economic takeovers in progress)
2. OPPORTUNITIES — Where can the player gain an advantage? (Territories close to unification, vulnerable opponent positions, cultural flips about to occur)
3. WEAKNESSES — Where is the player vulnerable? (No agent coverage, losing cultural influence, economic holdings at risk)

Return ONLY a JSON array of notifications. Each notification: {"notification": "Your advice here. Be concise and actionable.", "priority": "critical|warning|info", "territory_id": N or null}. Limit to 3 notifications total. Prioritize critical threats first.

Current game state:
{full_game_state_snapshot}
```

3. **tx2:** Parse the JSON array (reuse `last_balanced_array`). For each of up to 3 notifications, insert a `strategist_log` row with the current timestamp (`ctx.timestamp`), notification text, priority, `territory_id` (0 if null), `player_id = 1`, `dismissed = false`. On timeout or error, do nothing: the Strategist silently skips a cycle (the next is already armed).

### 6.2 Strategist Query Integration

The existing `query_database` procedure (added in Slice 4; it returns data and calls Claude over HTTP) recognizes when the player asks for strategic advice. Add a prompt instruction: "If the player's question is asking for strategic advice (e.g., 'What should I do?', 'How can I win?', 'Where should I focus?'), respond as the Strategist, a helpful advisor on the player's side. Provide actionable, specific advice based on the current game state."

---

## 7. HOTKEY IMPLEMENTATION

### 7.1 Hotkey Map

| Key | Action | Implementation |
|-----|--------|---------------|
| `1` | Select Military card | Focus the first Military card in the hand. If already focused, cycle to next Military card. |
| `2` | Select Economic card | Focus the first Economic card in the hand. |
| `3` | Select Covert card | Focus the first Covert card in the hand. |
| `W` / `↑` | Move cursor up | Move `selectedTerritory` to the nearest territory above on the hex grid. |
| `A` / `←` | Move cursor left | Move `selectedTerritory` to the nearest territory to the left. |
| `S` / `↓` | Move cursor down | Move `selectedTerritory` to the nearest territory below. |
| `D` / `→` | Move cursor right | Move `selectedTerritory` to the nearest territory to the right. |
| `Enter` | Confirm action | Deploy the focused card to the selected territory. |
| `Space` | Confirm action | Same as Enter. |
| `Escape` | Cancel / close | Deselect card, clear cursor, close any open panel or dropdown. |
| `Q` | Focus query bar | Set focus to the query input field. |
| `I` | Toggle Intel panel | Open or close the IntelPanel. |
| `C` | Cycle AI intel | Cycle through AI targets: Zhao → Consortium → Prophet → close. |
| `H` | Toggle highlight | Toggle gold highlight on all territories the player owns in any dimension. |
| `Tab` | Autocomplete | Already exists in QueryBar from Slice 4. |

### 7.2 Implementation Notes

- Add a `keydown` event listener to `App.tsx` (on the document or a root div with tabIndex).
- The listener checks if focus is in the query bar — if so, only Tab, Escape, and Enter are processed. Other hotkeys are suppressed to allow typing.
- `selectedTerritory` and `focusedCard` are new state variables in `App.tsx`.
- WASD navigation computes the nearest territory in the pressed direction based on hex grid coordinates. Define a `HEX_GRID_COORDINATES` constant mapping territory_id to {x, y} positions that reflect the honeycomb layout.
- `Enter`/`Space` checks: if a card is focused AND a territory is selected AND the territory is a valid target for that card type, call the appropriate reducer.

### 7.3 Hotkey Hints

Add small visual hints to UI elements:

- **ActionCard:** In the bottom-right corner, render a small rounded square (16×16px) with the card number. Style: JetBrains Mono, 9px, `text-secondary` (#8899AA), border 1px `text-secondary` at 30% opacity, border-radius 3px, background transparent. Military card shows "1", Economic shows "2", Covert shows "3".
- **QueryBar:** To the left of the `>` prompt, a similar hint showing "Q".
- **IntelPanel:** In the header, next to "INTELLIGENCE", a hint showing "I".

---

## 8. NEW SUBSCRIPTIONS

### 8.1 `strategist_log`

| Table | Client hook | Client Usage |
|-------|-------------|--------------|
| `strategist_log` | `useTable(tables.strategistLog)` -> `[rows, isReady]` | Render Strategist alert notifications |

The `strategist_log` table is `public`, so the client subscribes to it with the SpacetimeDB React `useTable` hook (no custom subscription endpoint). The client filters for `dismissed === false` and renders as notification cards. It calls the `dismissStrategistAlert({ notificationId: id })` reducer (via `useReducer`) when the player clicks dismiss.

---

## 9. CLIENT MODIFICATIONS

### 9.1 `StrategistAlerts.tsx` (NEW)

**Position:** Top-right area of the screen, below the ActionBar. Stacked vertically.

**Props:** `alerts: StrategistLog[]` (the generated row type), `onDismiss: (id: bigint) => void`, `onAlertClick: (territoryId: number) => void`, `playerColors: Record<number, string>`.

**Rendering:**
- Filter: only show alerts where `dismissed === false`. Show the most recent 3.
- Each alert is a card: background `bg-surface` (#1A1A2E), border-left 3px solid based on priority:
  - `critical`: `#FF4444` (red), subtle pulse animation on the border.
  - `warning`: `#FF8844` (orange).
  - `info`: `#8899AA` (muted).
- Card content:
  - Notification text: Orbitron, 12px, `text-primary`. Padding: 8px 12px.
  - Dismiss button: small "×" in top-right corner. onClick calls `onDismiss(alert.id)`.
  - If `territoryId` is non-zero, clicking the card body calls `onAlertClick(alert.territoryId)` and highlights that territory.
- Cards stack vertically with 4px gaps. Newest at the top.
- Cards animate in: slide in from the right over 200ms ease-out.

### 9.2 `App.tsx` (MODIFIED)

**New state:**
```typescript
const [selectedTerritory, setSelectedTerritory] = useState<number | null>(null);
const [focusedCardType, setFocusedCardType] = useState<'military' | 'economic' | 'covert' | null>(null);
const [ownedTerritoriesHighlighted, setOwnedTerritoriesHighlighted] = useState(false);
// strategist alerts come from useTable(tables.strategistLog), not local state.
```

**Keyboard event handler:**
```typescript
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    // If query bar is focused, only allow Tab, Escape, Enter
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
}, [selectedTerritory, focusedCardType, /* other dependencies */]);
```

**`moveCursor` function:** Compute the nearest territory in the pressed direction based on `HEX_GRID_COORDINATES`. If no territory is selected, select territory 1 (North America) as default.

**`confirmAction` function:** If `focusedCardType` and `selectedTerritory` are both set, and the territory is a valid target for that card type, call the appropriate reducer via its `useReducer` hook with a single named-args object (e.g. `militaryAttack({ territoryId, playerId: 1 })`). Clear selection after.

**`clearSelection` function:** Set `focusedCardType = null`, `selectedTerritory = null`, close any open panels.

**Layout changes:** Add `StrategistAlerts` component in the top-right area.

**Subscriptions:** Add `strategistLog` from `useSubscriptions` (backed by `useTable(tables.strategistLog)`). Wire dismiss to `dismissStrategistAlert({ notificationId: id })`.

### 9.3 `Map.tsx` (MODIFIED)

**Props:** Add `selectedTerritory: number | null`, `ownedTerritoriesHighlighted: boolean`, `playerId: number`.

**Rendering:**
- `selectedTerritory`: render a bright white or gold outline (2px, `#FFFFFF` or `#FFD700`) around the selected territory hex. Distinct from query highlights and ticker highlights.
- `ownedTerritoriesHighlighted`: when true, apply a subtle gold glow to all territories where the player owns at least one dimension. When false, normal rendering.

### 9.4 `IntelPanel.tsx` (MODIFIED)

**Props:** Add `hotkeyHint: boolean` (always true).

**Rendering:**
- Header: add a hotkey hint square showing "I" next to "INTELLIGENCE".
- Deliberation chain display: when `get_intel` returns `status: "success"`, render the `deliberation` array:
  - Each entry shows `subordinateName` and `role` as a header (Orbitron, 11px, player color).
  - Reasoning text below (JetBrains Mono, 11px, `text-primary`).
  - Commander entry is rendered last with a slightly larger font or bold weight.
  - Entries are separated by a thin divider line (0.5px, `#334455`).
  - The full chain is scrollable if it exceeds the panel height.
  - Fallback: if `deliberation` is empty (pre-Slice-5 data), display `intelText` as before.

### 9.5 `ActionCard.tsx` (MODIFIED)

**Props:** Add `hotkeyNumber: string | null` ('1', '2', or '3').

**Rendering:** In the bottom-right corner, render the hotkey hint square as specified in Section 7.3.

### 9.6 `QueryBar.tsx` (MODIFIED)

**Rendering:** To the left of the `>` prompt, add a hotkey hint square showing "Q".

### 9.7 `constants.ts` (MODIFIED)

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

### 9.8 `types.ts` (MODIFIED)

The `StrategistLog` row type and the `IntelResult` / `DeliberationEntry` return types are produced by `spacetime generate` from the server's table and `#[derive(SpacetimeType)]` definitions, with camelCase fields. Local helper interfaces should match those generated names:

```typescript
// Generated from the StrategistLog table.
interface StrategistLog {
  id: bigint;            // u64
  createdAt: bigint;     // i64 ms
  notification: string;
  priority: string;      // "critical" | "warning" | "info"
  territoryId: number;   // 0 means "no specific territory"
  playerId: number;
  dismissed: boolean;
}

// Generated from get_intel's return types.
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

---

## 10. IMPLEMENTATION NOTES FOR CLAUDE CODE

### 10.1 Server

- Modify `app/server/src/lib.rs` (state after Slice 4).
- Add `subordinate_id` column to the `ai_reasoning_log` table.
- Add `strategist_log` table (`public`) and `strategist_schedule` scheduled table.
- Restructure the `ai_reasoning_cycle` **procedure**: sequential `ctx.http` calls (4 specialists, then 1 commander) via `anthropic_call`, committed in `ctx.with_tx`. No threads, no `join()`, no `reqwest`.
- Replace the private `apply_ai_actions` fn (called inside the cycle's tx2): accept subordinate results, log one `ai_reasoning_log` row per subordinate plus the commander row per cycle, all sharing `cycle_at`.
- Modify the `get_intel` **procedure**: return a `deliberation` chain (`Vec<DeliberationEntry>`) instead of single text.
- Add the `dismiss_strategist_alert` **reducer**.
- Add the `strategist_cycle` **scheduled procedure** (Claude via `ctx.http`).
- Store the 12 specialist prompts as `&str` constants in `lib.rs`. Use the AI's `player_id` to select the correct set.

### 10.2 Client

- Add `StrategistAlerts.tsx` as NEW.
- Modify `App.tsx`: add keyboard event listener, cursor state, confirmation logic, layout changes.
- Modify `Map.tsx`: selection cursor, owned territory highlight.
- Modify `IntelPanel.tsx`: deliberation chain display, hotkey hint.
- Modify `ActionCard.tsx`: hotkey hint.
- Modify `QueryBar.tsx`: hotkey hint.
- Modify `constants.ts`: hex grid coordinates, Strategist constants.
- Modify `types.ts`: new interfaces, updated IntelResult.

---

## 11. WHAT NOT TO GENERATE

This is Slice 5 of 7. Generate everything specified for Slice 5. Do not add:
- New dimensions
- New AI opponents
- New card types
- New gameplay mechanics beyond orchestration and hotkeys
- Slice 6 (global chat + AI deception) or Slice 7 (spectator mode + replay) features

---

## End of Slice 5 Interface Contract

Modify the `risk-dominion/app/` codebase (state after Slice 4) as specified. Output every new and modified file. Indicate NEW or MODIFIED at the top of each file.