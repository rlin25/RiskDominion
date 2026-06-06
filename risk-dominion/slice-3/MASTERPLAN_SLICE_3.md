# RISK: DOMINION — SLICE 3 MASTERPLAN

## Version 2.0 (SpacetimeDB 2.4.1)
## Scope: Cultural Dimension, Cross-Dimension Bonuses, Four-Dimension Game
## Target: Claude Code Generation — Extending the app/ Codebase (Slice 3 of 7)

---

## 0. DOCUMENT PURPOSE

This document specifies how to extend the single evolving codebase at `risk-dominion/app/` to add the Cultural dimension, cross-dimension bonuses, and the expanded four-dimension win condition. The Slice 2 work is already committed (tagged `slice-2-complete`). Read this document in full. Read the existing `app/` codebase. Apply the changes specified here.

Slice 3 is not the final slice. The project is 7 slices; only Slice 7 is final. Do not regenerate prior slices. Do not create a new project. Modify the existing files in place.

This masterplan is self-contained: the macros, reducer/procedure idioms, and version targets below are the authoritative ones for this slice. Target SpacetimeDB 2.4.1 throughout.

---

## 1. BEFORE YOU BEGIN

Read every relevant file in the existing `app/` codebase:
- `app/server/Cargo.toml`
- `app/server/src/lib.rs`
- `app/client/src/App.tsx`
- `app/client/src/constants.ts`
- `app/client/src/types.ts`
- `app/client/src/connection.ts`
- `app/client/src/hooks/useSubscriptions.ts`
- `app/client/src/utils/territoryHelpers.ts`
- `app/client/src/components/Map.tsx`
- `app/client/src/components/Territory.tsx`
- `app/client/src/components/CardHand.tsx`
- `app/client/src/components/ActionCard.tsx`
- `app/client/src/components/IntelPanel.tsx`
- `app/client/src/components/ActionBar.tsx`
- `app/client/src/components/PlayerIndicator.tsx`
- `app/client/src/components/VictoryScreen.tsx`

Understand the current code before making any changes. Then apply the modifications in this document in the order specified.

---

## 2. FILE LIST

These existing files in `app/` are modified in the order specified in Section 3.

1. `app/server/src/lib.rs` (modified)
2. `app/client/src/constants.ts` (modified)
3. `app/client/src/types.ts` (modified)
4. `app/client/src/utils/territoryHelpers.ts` (modified)
5. `app/client/src/hooks/useSubscriptions.ts` (modified)
6. `app/client/src/components/Territory.tsx` (modified)
7. `app/client/src/components/Map.tsx` (modified)
8. `app/client/src/App.tsx` (modified)

No new files. No removed files. The client subscribes to the new `cultural` table through the generated bindings; regenerate bindings with `spacetime generate --lang typescript --out-dir client/src/module_bindings --module-path server` after the server change.

---

## 3. GENERATION ORDER

Apply changes in this sequence. Each file must only reference types and components that already exist in the `app/` codebase or were modified earlier in this sequence.

1. `app/server/src/lib.rs`
2. `app/client/src/constants.ts`
3. `app/client/src/types.ts`
4. `app/client/src/utils/territoryHelpers.ts`
5. `app/client/src/hooks/useSubscriptions.ts`
6. `app/client/src/components/Territory.tsx`
7. `app/client/src/components/Map.tsx`
8. `app/client/src/App.tsx`

---

## 4. SERVER MODIFICATIONS

### 4.1 New Constants

Add to the CONSTANTS section:

```rust
const CULTURAL_TICK_SECONDS: u64 = 30;
const INFLUENCE_FLIP_THRESHOLD: i32 = 50;
const CULTURAL_PRESSURE_DIVISOR: i32 = 10;
```

Update existing constant:

```rust
const WIN_UNIFIED_TERRITORIES: i32 = 5; // Changed from 3 (Slices 1-2)
```

### 4.2 New Table

Add to the TABLES section, following the exact shape of the existing `military`, `economic`, and `covert` tables (modern macro on a `pub struct`, column attributes for keys):

```rust
#[spacetimedb::table(accessor = cultural, public)]
pub struct Cultural {
    #[primary_key]
    pub territory_id: i32,
    pub owner_id: i32,
    pub influence_pct: i32,
}
```

The table is `public` so the client can subscribe to it. After publishing, regenerate the TypeScript bindings so `tables.cultural` and the `Cultural` row type (camelCase fields: `territoryId`, `ownerId`, `influencePct`) become available.

Constraint: `influence_pct` must stay between 0 and 100 inclusive. SpacetimeDB has no CHECK constraints; enforce the clamp in the reducer logic (Section 4.7).

### 4.3 Modified `start_game` Reducer

Add Cultural table inserts alongside the existing military, economic, and covert inserts. Insert 12 rows:

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

Arm the new scheduled reducer the same way `regen_timer` is armed in `start_game`: insert a row into the `cultural_timer` scheduled table with a repeating interval. See Section 4.7 for the scheduled-table declaration.

```rust
ctx.db.cultural_timer().insert(CulturalTimer {
    scheduled_id: 0,
    scheduled_at: ScheduleAt::Interval(
        std::time::Duration::from_secs(CULTURAL_TICK_SECONDS).into(),
    ),
});
```

### 4.4 Modified `economic_invest` Logic

The player action lives in `do_economic_invest` (the shared logic fn that both the `economic_invest` reducer and the AI cycle call). Add the Military to Economic bonus there. After decrementing action points and before adding capital:

```rust
let mut invest_amount = ECONOMIC_INVEST_AMOUNT; // 5

// Military->Economic bonus: +1 flat if player owns Military in the target territory.
if let Some(m) = ctx.db.military().territory_id().find(territory_id) {
    if m.owner_id == player_id {
        invest_amount += 1;
    }
}

target.capital += invest_amount;
```

All other logic (the ownership flip check and the `dimension_owner_change` call) remains unchanged.

### 4.5 Modified `get_intel` Procedure

`get_intel` is a procedure (it returns an `IntelResult` to the caller). Its DB reads happen inside `ctx.with_tx(|tx| { ... })`. Add the Cultural to Covert bonus where it computes effective agent count against the intel threshold:

```rust
let mut effective_agents = agent_count;

// Cultural->Covert bonus: +10% if the player owns Cultural in this territory.
if let Some(cul) = tx.db.cultural().territory_id().find(id) {
    if cul.owner_id == 1 { // the human player is always id 1
        effective_agents = agent_count + (agent_count * 10 / 100);
    }
}

// Compare effective_agents against INTEL_THRESHOLD (3).
```

All other logic (finding the max agent count across this AI's territories, returning intel or insufficient) remains unchanged. Reducers and procedures never return ad-hoc success JSON to clients; `get_intel` returns its typed `IntelResult`, and all other observable state reaches the client through subscriptions.

### 4.6 Modified `dimension_owner_change` Function

`dimension_owner_change` stays a private fn invoked inside the calling reducer's transaction (it takes `ctx: &ReducerContext`). Update the win check to require the same owner across all four dimensions:

```rust
fn dimension_owner_change(ctx: &ReducerContext, new_owner: i32) {
    let unified = ctx
        .db
        .military()
        .iter()
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

    if unified >= WIN_UNIFIED_TERRITORIES { // now 5
        let winner_name = player_display_name(ctx, new_owner);
        set_game_value(ctx, "status", "ended");
        set_game_value(ctx, "winner", &winner_name);
    }
}
```

Threshold changes from 3 to 5, and all four dimensions now count toward unification. `cultural_spread_tick` calls `dimension_owner_change` after a cultural flip, so a passive flip can complete a unification and end the game.

### 4.7 New Scheduled Reducer: `cultural_spread_tick`

`cultural_spread_tick` is a deterministic **scheduled reducer** with no external I/O. It is driven by a scheduled table, exactly like `regenerate_action_points` is driven by `regen_timer`. It is a pure state tick, so it is a reducer (not a procedure): it makes no HTTP calls and returns nothing to clients.

Declare the scheduled table in the SCHEDULED TABLES section:

```rust
/// Drives `cultural_spread_tick` on a fixed interval (deterministic reducer, no HTTP).
#[spacetimedb::table(accessor = cultural_timer, scheduled(cultural_spread_tick))]
pub struct CulturalTimer {
    #[primary_key]
    #[auto_inc]
    pub scheduled_id: u64,
    pub scheduled_at: ScheduleAt,
}
```

Declare the reducer in the SCHEDULED REDUCERS section. The target fn takes the scheduled row:

```rust
#[spacetimedb::reducer]
pub fn cultural_spread_tick(ctx: &ReducerContext, _timer: CulturalTimer) {
    // ... per-territory logic below ...
}
```

Use `ctx.timestamp` for any timing; never wall-clock. The reducer is armed once in `start_game` via `ScheduleAt::Interval` (Section 4.3).

**Transactional safety:** This reducer runs in its own transaction. SpacetimeDB serializes concurrent transactions. If a cultural tick and a player action target the same territory simultaneously, one executes first. No special handling required.

**Logic for each territory T (1 through 12):**

1. Create an empty map: `pressure_by_player: HashMap<i32, i32>` (player_id → accumulated pressure).

2. For each adjacent territory A (from adjacency map):
   - Let `cul_owner_A` = cultural.owner_id for territory A.
   - Let `cul_owner_T` = cultural.owner_id for territory T.
   - If `cul_owner_A == cul_owner_T`: **skip.** Same owner, no pressure.
   - If different:
     - `base_pressure = economic.capital of A / CULTURAL_PRESSURE_DIVISOR` (integer division, divisor = 10).
     - Apply Economic→Cultural bonus: if `economic.owner_id of A == cul_owner_A` (influencing player owns both dimensions in source), then `base_pressure = base_pressure + (base_pressure * 15 / 100)`.
     - Add `base_pressure` to `pressure_by_player[cul_owner_A]`.

3. If `pressure_by_player` is empty: **skip T.**

4. Find the player with the highest total pressure. If tie, pick the first one found.

5. Let `highest_player` = that player, `highest_pressure` = their pressure value.

6. If `highest_player == cul_owner_T`: **do nothing.** Current owner maintains control.

7. If `highest_player != cul_owner_T`:
   - `cultural.influence_pct += highest_pressure`.
   - Clamp `influence_pct` to maximum 100.
   - If `cultural.influence_pct > INFLUENCE_FLIP_THRESHOLD` (50):
     - Set `cultural.owner_id = highest_player`.
     - Set `cultural.influence_pct = 0`.
     - Update the `cultural` row, then call `dimension_owner_change(ctx, highest_player)` (the modern 2-arg signature; the win check itself reads all four dimension tables).

Read and write rows with the typed accessors, e.g. `ctx.db.cultural().territory_id().find(t)` to read and `ctx.db.cultural().territory_id().update(row)` to write, matching the existing dimension reducers.

**No return value.** The reducer returns nothing; clients receive the updated `cultural` table via subscription.

### 4.8 Updated AI Prompt Construction

The AI system prompt is assembled in `build_system_prompt` (called from the `ai_reasoning_cycle` scheduled procedure, which is the only function type allowed to call Claude over `ctx.http`). Update the board snapshot it builds to include Cultural data. Update the territory list format:

```
Territory {id} ({name}): Military owner={mil_owner}({troops}), Economic owner={eco_owner}({capital}), Cultural owner={cul_owner}({influence}%), Covert owner={cov_owner}({agents})
```

Add a new section after the adjacency map:

```
Cross-dimension bonuses:
- Military→Economic: +1 to invest amount in territories where you own Military.
- Economic→Cultural: +15% to cultural pressure from territories where you own both Economic and Cultural.
- Cultural→Covert: +10% to effective agent count for intel in territories where you own Cultural.
- Covert→Military: Your agent count is added to your troop count when attacking.

Cultural influence spreads passively every 30 seconds based on adjacent economic strength. You cannot directly affect Cultural, but your economic investments in border territories accelerate its spread. When a territory's foreign influence exceeds 50%, Cultural ownership flips.
```

Add to available actions context:

```
Note: There is no direct Cultural action. Cultural ownership changes passively through economic pressure. Invest economically in border territories to spread your culture.
```

**Updated persona descriptions:**

- **Zhao:** "You are an aggressive military commander. Priority order: Military > Covert > Economic > Cultural. Deploy agents for combat bonuses. Invest economically only to fund military expansion. Cultural influence is your lowest priority — you prefer direct conquest. However, if you control a territory economically, understand that cultural pressure will follow."

- **Consortium:** "You are a calculating economic power. Priority order: Economic > Cultural > Military > Covert. Build capital in territories you control militarily. Let economic strength generate cultural pressure on neighbors. Use military to defend holdings. Your path to victory is economic dominance followed by cultural spread."

- **Prophet:** "You are an enigmatic strategist who wins through cultural dominance. Priority order: Cultural > Covert > Economic > Military. Invest economically in border territories to accelerate cultural pressure. Deploy agents in culturally contested territories. Attack only when a territory is already culturally aligned. You conquer minds before land."

---

## 5. CLIENT MODIFICATIONS

### 5.1 `constants.ts` (MODIFIED)

Add:

```typescript
export const CULTURAL_TICK_SECONDS = 30;
export const INFLUENCE_FLIP_THRESHOLD = 50;
export const CULTURAL_PRESSURE_DIVISOR = 10;
```

Update:

```typescript
export const WIN_UNIFIED_TERRITORIES = 5; // Changed from 3
```

### 5.2 `types.ts` (MODIFIED)

Re-export the generated `Cultural` row type under the stable `CulturalRow` name, alongside the existing `MilitaryRow` / `EconomicRow` / `CovertRow` re-exports. The generated row uses camelCase fields (`territoryId`, `ownerId`, `influencePct`):

```typescript
export type {
  // ...existing dimension re-exports...
  Cultural as CulturalRow,
} from "./module_bindings/types";
```

### 5.3 `territoryHelpers.ts` (MODIFIED)

Update `countUnifiedTerritories` to check all four dimensions. Field names are camelCase, matching the generated bindings:

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

### 5.4 `useSubscriptions.ts` (MODIFIED)

Subscribe to the new `cultural` table with the React hook, exactly like the existing dimension subscriptions:

```typescript
const [cultural, culturalReady] = useTable(tables.cultural);
```

Include `cultural` (cast to `readonly CulturalRow[]`) in the returned object and add `culturalReady` to the `isReady` conjunction.

### 5.5 `Territory.tsx` (MODIFIED)

**Props:** Add `culturalOwner: number`, `influencePct: number`.

**Rendering:** Activate the fourth X-split quadrant (bottom-right wedge). This wedge was neutral (#2A2A3E) in Slice 2.

- Bottom-right wedge: fill with Cultural owner's color. If `culturalOwner` is 0, use neutral (#2A2A3E).
- When `influencePct > 0` and the Cultural owner is different from the territory's Military or Economic owner, show a partial fill. The wedge fills from the outer edge toward the center proportional to `influencePct / 100`. This visually indicates accumulating foreign influence.
- Implementation: use a CSS gradient or SVG clip-path that reveals the influencing player's color from the outer edge inward based on the percentage.
- Hover tooltip: show "Cultural: {owner name} ({influencePct}%)".

**Existing quadrants:** Top-left (Military), top-right (Economic), bottom-left (Covert) remain unchanged from Slice 2.

### 5.6 `Map.tsx` (MODIFIED)

**Props:** Add `cultural: readonly CulturalRow[]`.

**Pass to each Territory:**
- `culturalOwner={getCulturalOwner(cultural, territoryId)}`
- `influencePct={getInfluencePct(cultural, territoryId)}`

### 5.7 `App.tsx` (MODIFIED)

- Add `cultural` from the `useSubscriptions` hook return.
- Pass `cultural` to `Map` component.
- Update the call to `countUnifiedTerritories` to pass all four dimension arrays: `military`, `economic`, `cultural`, `covert`.
- The victory tracker now shows unified count across all four dimensions (was two dimensions in Slice 2).

---

## 6. GENERATION RULES

1. **Modify existing `app/` files in place.** Read each file before modifying. Preserve all prior-slice functionality not explicitly changed.
2. **Match the existing idioms** already present in `app/server/src/lib.rs` and `app/client/src/`.
3. **All arithmetic is integer arithmetic.** No floats. Use `/` for truncating division.
4. **SpacetimeDB 2.4.1 macros (server):** tables use `#[spacetimedb::table(accessor = name, public)]` on a `pub struct` with column attributes `#[primary_key]`, `#[auto_inc]`; reducers use `#[spacetimedb::reducer] fn f(ctx: &ReducerContext, ...) -> Result<(), String>` (success = `Ok(())`, validation failure = `Err("msg".into())`); a scheduled reducer is driven by a scheduled table declared with `scheduled(target_fn)` and armed via `ScheduleAt::Interval(...)`. `cultural_spread_tick` is a scheduled reducer (deterministic, no HTTP), not a procedure.
5. **Client SDK idioms:** npm package `spacetimedb` with the `spacetimedb/react` subpath; subscribe with `useTable(tables.cultural)` returning `[rows, isReady]`; generated row fields are camelCase. There are no client-side cultural actions (Cultural is passive).
6. **Tailwind CSS for all styling.** Use design tokens from `../AESTHETIC.md`.
7. **No emojis. No em dashes. No custom CSS files.**
8. **The cultural tick uses integer division.** `capital / 10`, `pressure * 15 / 100`, `agents * 10 / 100`. All truncate toward zero.
9. **The fourth X-split quadrant** activates the bottom-right wedge. See AESTHETIC.md Section 4 for hex rendering details.
10. **Regenerate bindings** after the server change so `tables.cultural` and the `Cultural` row type exist before building the client.

---

## 7. WHAT NOT TO GENERATE

Do NOT add:
- Query bar, `query_database`, `get_canned_query` reducers
- Event feed table or event ticker
- Any features from Slice 4

---

## 8. SUCCESS CRITERIA

After applying all modifications, the Slice 3 application must:

1. **Compile** — `cargo build` for server, `npm run build` for client. Zero errors.
2. **Render 4 X-split quadrants** — Territories show Military, Economic, Cultural, and Covert quadrants. Cultural quadrant shows influence fill.
3. **Run cultural spread** — Influence changes after 30 seconds. Territories with adjacent economic pressure accumulate influence.
4. **Flip culture at >50%** — When influence exceeds 50, Cultural ownership flips and influence resets.
5. **Apply Military→Economic bonus** — +6 capital when investing where player owns Military.
6. **Apply Cultural→Covert bonus** — Effective agents = agents + 10% for intel threshold.
7. **Trigger victory at 5 unified** — Win check counts all four dimensions. Threshold is 5.
8. **AI reasons about Culture** — AI prompt includes Cultural data and bonus descriptions.

---

## End of Slice 3 Masterplan

Read the existing `app/` codebase. Apply every modification specified above in the order specified, editing the files in place. Do not regenerate unchanged files. Do not add features from Slice 4. Slice 3 is one of 7 slices; only Slice 7 is final.