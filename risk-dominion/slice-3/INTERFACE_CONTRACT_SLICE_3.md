# RISK: DOMINION — SLICE 3 INTERFACE CONTRACT

## Version 2.0 (SpacetimeDB 2.4.1)
## Scope: Cultural Dimension, Cross-Dimension Bonuses, Four-Dimension Game
## Target: Claude Code Generation — Extending the app/ Codebase (Slice 3 of 7)

---

## 0. HOW TO READ THIS DOCUMENT

This document specifies every table, reducer, subscription, seed data value, and constant that is **new or modified** in Slice 3. It does not repeat Slice 1 or Slice 2 specifications.

**All Slice 1 and Slice 2 tables, reducers, subscriptions, and constants remain in effect unless this document explicitly modifies them.** If a component is not mentioned here, it is unchanged from Slice 2.

---

## 1. NEW TABLES

### 1.1 `cultural`

| Field | Type | Attributes | Description |
|--------|------|-------------|-------------|
| `territory_id` | `i32` | `#[primary_key]` | Territory identifier (1-12) |
| `owner_id` | `i32` | | Player who controls this dimension (1-4) |
| `influence_pct` | `i32` | | Accumulated foreign influence (0-100) |

Declare with the modern table macro, following the same shape as the existing `military` / `economic` / `covert` tables:

```rust
#[spacetimedb::table(accessor = cultural, public)]
pub struct Cultural {
    #[primary_key]
    pub territory_id: i32,
    pub owner_id: i32,
    pub influence_pct: i32,
}
```

The table is `public` so clients can subscribe. Generated TypeScript bindings expose `tables.cultural` and a `Cultural` row type with camelCase fields (`territoryId`, `ownerId`, `influencePct`).

**Constraint:** `influence_pct` must stay in [0, 100]. SpacetimeDB has no CHECK constraints; clamp it in reducer logic.

**Ownership flip:** When `influence_pct > 50`, `owner_id` flips to the player with the highest accumulated pressure, and `influence_pct` resets to 0.

---

## 2. MODIFIED EXISTING FUNCTIONS

### 2.1 `economic_invest` (reducer; shared logic in `do_economic_invest`)

`economic_invest` stays a `#[spacetimedb::reducer] fn economic_invest(ctx: &ReducerContext, territory_id: i32, player_id: i32) -> Result<(), String>` whose body delegates to the shared `do_economic_invest` fn (also used by the AI cycle). **Add the Military to Economic bonus in `do_economic_invest`.** After decrementing action points and before adding capital:

```rust
let mut invest_amount = ECONOMIC_INVEST_AMOUNT; // 5

// Military->Economic bonus: +1 flat if the player owns Military in the target territory.
if let Some(m) = ctx.db.military().territory_id().find(territory_id) {
    if m.owner_id == player_id {
        invest_amount += 1;
    }
}

target.capital += invest_amount;
```

All other logic (the ownership flip when capital exceeds the current owner, the `dimension_owner_change` call on flip) remains unchanged.

### 2.2 `get_intel` (procedure)

`get_intel` is a `#[spacetimedb::procedure] fn get_intel(ctx: &mut ProcedureContext, ai_player_id: i32) -> IntelResult`. It returns a typed `IntelResult` to the caller (procedures, unlike reducers, return data to clients). Its DB reads run inside `ctx.with_tx(|tx| { ... })`. **Add the Cultural to Covert bonus** where it computes the effective agent count against the intel threshold:

```rust
let mut effective_agents = agent_count;

// Cultural->Covert bonus: +10% if the player owns Cultural in this territory.
if let Some(cul) = tx.db.cultural().territory_id().find(id) {
    if cul.owner_id == 1 { // the human player is always id 1
        effective_agents = agent_count + (agent_count * 10 / 100);
    }
}

if effective_agents >= INTEL_THRESHOLD { // 3
    // build the success IntelResult
}
```

All other logic (finding the max agent count across this AI's territories, returning intel or insufficient via `IntelResult`) remains unchanged.

### 2.3 `dimension_owner_change(ctx: &ReducerContext, new_owner: i32)`

`dimension_owner_change` is a private fn invoked inside the calling reducer's transaction (it is not a reducer or procedure itself). **Update the win check** to require the same owner across ALL FOUR dimensions:

```rust
let unified = ctx.db.military().iter()
    .filter(|m| m.owner_id == new_owner)
    .filter(|m| {
        let eco = ctx.db.economic().territory_id().find(m.territory_id)
            .map(|e| e.owner_id == new_owner).unwrap_or(false);
        let cul = ctx.db.cultural().territory_id().find(m.territory_id)
            .map(|c| c.owner_id == new_owner).unwrap_or(false);
        let cov = ctx.db.covert().territory_id().find(m.territory_id)
            .map(|c| c.owner_id == new_owner).unwrap_or(false);
        eco && cul && cov
    })
    .count() as i32;

if unified >= WIN_UNIFIED_TERRITORIES { // 5
    // set game_state status = "ended", winner = player name
}
```

Threshold changes from 3 to 5. Cultural and Covert now count toward unification (Slices 1-2 counted only Military + Economic). `cultural_spread_tick` calls this fn after a flip, so a passive cultural flip can complete a unification.

### 2.4 `start_game` (reducer)

**Changes:**
- Insert 12 rows into the new `cultural` table (see Section 3).
- Arm the new `cultural_spread_tick` scheduled reducer by inserting one row into the `cultural_timer` scheduled table with `ScheduleAt::Interval(Duration::from_secs(CULTURAL_TICK_SECONDS).into())`, exactly like the existing `regen_timer` is armed.
- All other seed data (players, ai_state, military, covert, game_state, and the existing scheduled-table arming) remains unchanged. Economic seed data for territory 6 (N Africa) changes per the design intent in DECISIONS_SLICE_3.md (eco_owner 1 to 3, eco_capital 8 to 10); see the full reference table in Section 3 for all values.

---

## 3. UPDATED SEED DATA

### 3.1 Cultural Table

Insert 12 rows alongside the existing dimension table inserts:

| territory_id | owner_id | influence_pct |
|-------------|----------|---------------|
| 1 (N America) | 1 | 0 |
| 2 (C America) | 1 | 30 |
| 3 (Caribbean) | 4 | 25 |
| 4 (S America) | 1 | 35 |
| 5 (W Europe) | 3 | 0 |
| 6 (N Africa) | 4 | 40 |
| 7 (S Africa) | 4 | 20 |
| 8 (E Europe) | 4 | 30 |
| 9 (Mid East) | 4 | 0 |
| 10 (S Asia) | 2 | 35 |
| 11 (E Asia) | 2 | 0 |
| 12 (Oceania) | 2 | 25 |

**Home territories** (1, 5, 9, 11): owner = home player, influence = 0. Culturally stable.
**Fractured territories**: influence between 20–40, often owned by a player who doesn't hold Military or Economic there. These territories are close to cultural flips.

Full four-dimension seed data for reference (military, economic, covert unchanged from Slice 2):

| Territory | mil | mil_val | eco | eco_val | cul | cul_val | cov | cov_val |
|-----------|-----|---------|-----|---------|-----|---------|-----|---------|
| 1 (N America) | 1 | 10 | 1 | 20 | 1 | 0 | 1 | 1 |
| 2 (C America) | 1 | 5 | 3 | 8 | 1 | 30 | 0 | 0 |
| 3 (Caribbean) | 1 | 4 | 1 | 6 | 4 | 25 | 0 | 0 |
| 4 (S America) | 2 | 6 | 1 | 10 | 1 | 35 | 0 | 0 |
| 5 (W Europe) | 3 | 10 | 3 | 20 | 3 | 0 | 3 | 1 |
| 6 (N Africa) | 3 | 5 | 3 | 10 | 4 | 40 | 0 | 0 |
| 7 (S Africa) | 3 | 4 | 3 | 7 | 4 | 20 | 0 | 0 |
| 8 (E Europe) | 2 | 5 | 3 | 9 | 4 | 30 | 0 | 0 |
| 9 (Mid East) | 4 | 10 | 4 | 20 | 4 | 0 | 4 | 1 |
| 10 (S Asia) | 2 | 5 | 4 | 8 | 2 | 35 | 0 | 0 |
| 11 (E Asia) | 2 | 10 | 2 | 20 | 2 | 0 | 2 | 1 |
| 12 (Oceania) | 4 | 4 | 4 | 7 | 2 | 25 | 0 | 0 |

---

## 4. NEW SCHEDULED REDUCER

### 4.1 `cultural_spread_tick`

`cultural_spread_tick` is a deterministic **scheduled reducer** with no external I/O (no HTTP). It is a pure state tick, so it is a reducer, not a procedure. It is driven by a scheduled table, exactly like `regenerate_action_points` is driven by `regen_timer`.

**Scheduled table (add to the SCHEDULED TABLES section):**

```rust
#[spacetimedb::table(accessor = cultural_timer, scheduled(cultural_spread_tick))]
pub struct CulturalTimer {
    #[primary_key]
    #[auto_inc]
    pub scheduled_id: u64,
    pub scheduled_at: ScheduleAt,
}
```

**Reducer signature:**

```rust
#[spacetimedb::reducer]
pub fn cultural_spread_tick(ctx: &ReducerContext, _timer: CulturalTimer) {
    // per-territory logic below
}
```

**Schedule:** Every 30 seconds. Armed once in `start_game` via `ScheduleAt::Interval(Duration::from_secs(CULTURAL_TICK_SECONDS).into())`. Use `ctx.timestamp` for any timing, never wall-clock.

**Transactional safety:** This reducer runs in its own transaction. If a cultural flip and a player action target the same territory simultaneously, SpacetimeDB serializes the transactions. No special handling is required.

**Logic:**

For each territory T (territory_id 1 through 12):

1. Initialize an empty map: `pressure_by_player: HashMap<i32, i32>` (player_id → total pressure).

2. For each adjacent territory A (from the adjacency map):
   - Let `cultural_owner_A` = `cultural.owner_id` for territory A.
   - Let `cultural_owner_T` = `cultural.owner_id` for territory T.
   - If `cultural_owner_A == cultural_owner_T`: **skip.** Same cultural owner exerts no pressure.
   - If different:
     - `base_pressure = economic.capital of A / CULTURAL_PRESSURE_DIVISOR` (integer division). Divisor is 10.
     - Apply Economic→Cultural bonus: if `economic.owner_id of A == cultural_owner_A` (the influencing player owns both Economic and Cultural in the source territory), then `base_pressure = base_pressure + (base_pressure * 15 / 100)`.
     - Add `base_pressure` to `pressure_by_player[cultural_owner_A]`.

3. If `pressure_by_player` is empty: **skip this territory.** No foreign cultural pressure.

4. Find the player with the highest total pressure. If there's a tie, pick the first one (or the one with the highest economic capital total — either is acceptable).

5. Let `highest_pressure_player` = that player. Let `highest_pressure_value` = their total pressure.

6. If `highest_pressure_player == cultural_owner_T`: **do nothing.** The current owner maintains control. Influence does not change.

7. If `highest_pressure_player != cultural_owner_T`:
   - `cultural.influence_pct += highest_pressure_value` (clamp to a max of 100).
   - If `cultural.influence_pct > 50`:
     - Set `cultural.owner_id = highest_pressure_player`.
     - Set `cultural.influence_pct = 0`.
     - Update the `cultural` row via `ctx.db.cultural().territory_id().update(row)`, then call `dimension_owner_change(ctx, highest_pressure_player)` (the modern 2-arg signature; the win check reads all four dimension tables).
   - If `cultural.influence_pct <= 50`: no flip. Influence accumulates for future ticks.

**No return value.** Reducers do not return data to clients; clients receive the updated `cultural` table via subscription.

---

## 5. UPDATED AI PROMPT TEMPLATE

Expand the system prompt built in `build_system_prompt` (used by the `ai_reasoning_cycle` scheduled procedure, the only function type allowed to call Claude over `ctx.http`) to include Cultural data and cross-dimension bonus descriptions. Replace `{placeholders}` as in Slice 2. The Anthropic model pin and `anthropic-version` header are unchanged; only the prompt content changes here.

Add to the territory list format:
```
Territory {id} ({name}): Military owner={mil_owner}({troops}), Economic owner={eco_owner}({capital}), Cultural owner={cul_owner}({influence}%), Covert owner={cov_owner}({agents})
```

Add after the adjacency map section:
```
Cross-dimension bonuses:
- Military→Economic: +1 to invest amount in territories where you own Military.
- Economic→Cultural: +15% to cultural pressure from territories where you own both Economic and Cultural.
- Cultural→Covert: +10% to effective agent count for intel in territories where you own Cultural.
- Covert→Military: Your agent count is added to your troop count when attacking a territory where you have agents.

Cultural influence spreads passively every 30 seconds based on adjacent economic strength. You cannot directly affect Cultural, but your economic investments in border territories accelerate its spread. When a territory's foreign influence exceeds 50%, Cultural ownership flips to the influencing player.
```

Add to available actions (no new action types, just context):
```
Note: There is no direct Cultural action. Cultural ownership changes passively through economic pressure. Invest economically in border territories to spread your culture. Defend your economy to prevent enemy culture from spreading into your territory.
```

**Updated persona descriptions (4 dimensions):**

- **Zhao:** "You are an aggressive military commander. Priority order: Military > Covert > Economic > Cultural. Deploy agents in territories you plan to attack for the combat bonus. Invest economically only to fund military expansion. Cultural influence is your lowest priority — you prefer direct conquest. However, do not ignore Cultural entirely: if you control a territory economically, understand that cultural pressure will follow and may help you unify."

- **Consortium:** "You are a calculating economic power. Priority order: Economic > Cultural > Military > Covert. Build capital in territories you control militarily. Let your economic strength generate cultural pressure on neighbors. Use military only to defend your economic holdings. Deploy agents sparingly, mainly to monitor threats. Your path to victory is economic dominance followed by cultural spread — you unify territories through wealth and influence, not force."

- **Prophet:** "You are an enigmatic strategist who wins through cultural dominance. Priority order: Cultural > Covert > Economic > Military. Invest economically in border territories to accelerate cultural pressure on neighbors. Deploy agents in culturally contested territories to monitor flip progress. Attack only when a territory is already culturally aligned with you. You conquer minds before you conquer land. Your strength is indirect — opponents lose territories to you without realizing they were contested."

---

## 6. CROSS-DIMENSION BONUS REFERENCE

Applied at point of use, not stored in a table.

| Source | Target | Bonus | Applied In | Formula |
|--------|--------|-------|------------|---------|
| Military owner | Economic | +1 flat | `do_economic_invest` (reducer logic) | `invest_amount = 5 + 1` |
| Economic owner | Cultural | +15% | `cultural_spread_tick` (scheduled reducer) | `pressure += pressure * 15 / 100` |
| Cultural owner | Covert | +10% | `get_intel` (procedure) | `effective = agents + agents * 10 / 100` |
| Covert owner | Military | +agent_count | `do_military_attack` (reducer logic) | `effective = troops + agents` |

All math is integer arithmetic with truncation.

---

## 7. NEW CONSTANTS

### 7.1 Server Constants (add to `lib.rs`)

```rust
const CULTURAL_TICK_SECONDS: u64 = 30;
const INFLUENCE_FLIP_THRESHOLD: i32 = 50;
const CULTURAL_PRESSURE_DIVISOR: i32 = 10;
```

**Update existing constant:**
```rust
const WIN_UNIFIED_TERRITORIES: i32 = 5; // Changed from 3
```

### 7.2 Client Constants (add to `constants.ts`)

```typescript
export const CULTURAL_TICK_SECONDS = 30;
export const INFLUENCE_FLIP_THRESHOLD = 50;
export const CULTURAL_PRESSURE_DIVISOR = 10;
export const WIN_UNIFIED_TERRITORIES = 5; // Update existing from 3
```

---

## 8. NEW SUBSCRIPTIONS

### 8.1 `cultural` table subscription

| Hook | Table | Client Usage |
|-------------|-------|--------------|
| `useTable(tables.cultural)` | `cultural` | Render Cultural quadrant on territory hexes, show influence fill percentage |

Subscriptions are table-driven through the generated bindings (there is no separate `subscribe_*` reducer). Add `const [cultural, culturalReady] = useTable(tables.cultural);` to `useSubscriptions.ts` alongside the existing dimension subscriptions (military, economic, covert, players, game_state). Return `cultural` cast to `readonly CulturalRow[]` and fold `culturalReady` into `isReady`.

---

## 9. CLIENT MODIFICATIONS

### 9.1 `Territory.tsx` (MODIFIED)

**Activate the fourth X-split quadrant.** In Slice 2, the bottom-right wedge was neutral (#2A2A3E). In Slice 3, it becomes the Cultural quadrant.

- Bottom-right wedge: fill with Cultural owner's color. If no owner, use neutral (#2A2A3E).
- When `influencePct > 0` and the Cultural owner is different from the territory's other owners, show a partial fill: the wedge fills from the outer edge toward the center proportional to `influencePct / 100`. This visually indicates accumulating foreign influence.
- Hover tooltip: show Cultural owner name and influence percentage.

**Props:** Add `culturalOwner: number`, `influencePct: number`.

### 9.2 `Map.tsx` (MODIFIED)

**Props:** Add `cultural: readonly CulturalRow[]`.

**Pass to Territory:** `culturalOwner={getCulturalOwner(cultural, id)}` and `influencePct={getInfluencePct(cultural, id)}`.

### 9.3 `App.tsx` (MODIFIED)

- Add `cultural` data from `useSubscriptions`.
- Pass cultural data to `Map`.

### 9.4 `types.ts` (MODIFIED)

Re-export the generated `Cultural` row type under the stable `CulturalRow` name, alongside the existing dimension re-exports. Generated fields are camelCase:
```typescript
export type {
  // ...existing dimension re-exports...
  Cultural as CulturalRow,
} from "./module_bindings/types";
```

### 9.5 `territoryHelpers.ts` (MODIFIED)

Update `countUnifiedTerritories` to check all four dimensions (camelCase fields):
```typescript
export function countUnifiedTerritories(
  military: readonly MilitaryRow[],
  economic: readonly EconomicRow[],
  cultural: readonly CulturalRow[],
  covert: readonly CovertRow[],
  playerId: number,
): number {
  let count = 0;
  for (const m of military) {
    if (m.ownerId !== playerId) continue;
    const e = economic.find((r) => r.territoryId === m.territoryId);
    const c = cultural.find((r) => r.territoryId === m.territoryId);
    const v = covert.find((r) => r.territoryId === m.territoryId);
    if (e && c && v && e.ownerId === playerId && c.ownerId === playerId && v.ownerId === playerId) {
      count++;
    }
  }
  return count;
}
```

Add helpers:
```typescript
export function getCulturalOwner(cultural: readonly CulturalRow[], territoryId: number): number {
  return cultural.find((c) => c.territoryId === territoryId)?.ownerId ?? 0;
}

export function getInfluencePct(cultural: readonly CulturalRow[], territoryId: number): number {
  return cultural.find((c) => c.territoryId === territoryId)?.influencePct ?? 0;
}
```

---

## 10. IMPLEMENTATION NOTES FOR CLAUDE CODE

### 10.1 Server

- Modify the existing `app/server/src/lib.rs` in place. Do not create a new file.
- Add the `cultural` table in the TABLES section (modern `#[spacetimedb::table(accessor = cultural, public)]` macro).
- Add the `cultural_timer` scheduled table and the `cultural_spread_tick` scheduled reducer (deterministic, no HTTP) in the SCHEDULED TABLES / SCHEDULED REDUCERS sections.
- Modify `do_economic_invest`: add the +1 bonus check before adding capital.
- Modify `get_intel` (procedure): add the +10% effective agents check before the threshold comparison, inside `ctx.with_tx`.
- Modify `dimension_owner_change` (private fn): update the win check to require all four dimensions. Change threshold to 5.
- Modify `start_game`: add the 12 Cultural inserts and arm `cultural_timer` via `ScheduleAt::Interval`.
- Update `build_system_prompt` (used by the `ai_reasoning_cycle` scheduled procedure) to include Cultural data and bonus descriptions.
- The adjacency helper remains unchanged.
- After publishing, regenerate the TypeScript bindings: `spacetime generate --lang typescript --out-dir client/src/module_bindings --module-path server`.

### 10.2 Client

- Modify the existing `app/client/` codebase in place. Do not regenerate from scratch.
- Add `useTable(tables.cultural)` to `useSubscriptions.ts`.
- Modify `Territory.tsx` to render the fourth quadrant with influence fill.
- Modify `Map.tsx` to pass cultural data to Territory.
- Modify `App.tsx` to include cultural data.
- Modify `types.ts` to re-export `Cultural as CulturalRow`.
- Modify `territoryHelpers.ts` to update `countUnifiedTerritories` and add cultural helpers.
- Update `WIN_UNIFIED_TERRITORIES` in `constants.ts` from 3 to 5.

---

## 11. WHAT NOT TO GENERATE

Do NOT add:
- Query bar, `query_database`, `get_canned_query` reducers
- Event feed table or event ticker
- Any features from Slice 4

---

## End of Slice 3 Interface Contract

Modify the `app/` codebase in place as specified. Regenerate the TypeScript bindings after the server change so the new `cultural` table is available to the client. Slice 3 is one of 7 slices; only Slice 7 is final.