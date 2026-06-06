# RISK: DOMINION — SLICE 3 IMPLEMENTATION STRATEGY

## Version 2.0 (SpacetimeDB 2.4.1)
## Scope: Cultural Dimension, Cross-Dimension Bonuses, Four-Dimension Game
## Target: Human Team — After Claude Code Generation (Slice 3 of 7)

---

## Principle 0: Validate Before You Build On It

Slice 3 completes the dimensional picture. It adds the Cultural dimension (passive spread), cross-dimension bonuses (Military to Economic, Economic to Cultural, Cultural to Covert, Covert to Military), and expands the win condition to 5 unified territories across all four dimensions. It modifies critical server functions from Slice 2: the `economic_invest` reducer (via shared `do_economic_invest` logic), the `get_intel` procedure, and the private `dimension_owner_change` win-check fn.

If Slice 3 has a bug — a broken cultural tick, a miscalculated bonus, a win condition that doesn't fire — Slice 4 (query system and event ticker) will be debugging passive spread mechanics on top of LLM query translation. That is a nightmare. (Slice 4 is not the final slice either; the project runs through Slice 7.)

The rule: Slice 3 must pass every regression check and every new feature test before Slice 4 generation begins. No exceptions.

This document tells you how to validate Slice 3, how to debug it when validation fails, and what to fix before moving on.

---

## 1. VALIDATION STRUCTURE

Slice 3 validation has two parts:

**Part A: Regression Check** — Condensed Slice 2 tests to confirm the codebase modifications didn't break AI, intel, or core gameplay. Approximately 5 minutes.

**Part B: New Feature Test** — Tests for cultural spread, cross-dimension bonuses, and the updated win condition. Approximately 15–20 minutes (includes waiting for cultural ticks).

Execute Part A first. If any step fails, stop and fix before proceeding to Part B.

---

## 2. PART A: REGRESSION CHECK

### Prerequisites

- The SpacetimeDB module is published and running (`spacetime publish` from `app/server`, plus `spacetime version` reporting 2.4.1).
- Frontend dev server is running (`npm run dev` in `app/client`).
- One browser tab open to `http://localhost:5173`.
- Anthropic API key seeded into the private `module_config` table via `spacetime call risk-dominion set_config '"anthropic_api_key"' '"sk-ant-..."'` (the key is never in source, never `public`, never exposed to clients).

---

### Step A1: Map Renders with Four Quadrants

**Action:** Load the game. Inspect the hex map.

**Expected Result:** All 12 territories show four X-split quadrants. The bottom-right wedge (previously neutral in Slice 2) now shows Cultural ownership colors:
- North America (1): all four quadrants blue (Player).
- Western Europe (5): all four quadrants orange (Consortium).
- East Asia (11): all four quadrants red (Zhao).
- Middle East (9): all four quadrants purple (Prophet).
- North Africa (6): Cultural quadrant shows purple (Prophet) with partial fill indicating 40% influence. Military and Economic show orange (Consortium).

**If this fails:** Cultural table not seeded or subscription not connected. Check the `start_game` reducer, check `useTable(tables.cultural)` in `useSubscriptions.ts`, and confirm the bindings were regenerated after the server change.

---

### Step A2: Core Actions Still Work

**Action:** Drag a Military card onto an adjacent territory. Drag an Economic card onto any territory. Drag a Covert card onto any territory.

**Expected Result:** All three actions execute successfully. Action points decrement. Territory ownership changes reflect on the map.

**If this fails:** Check modified reducers (`economic_invest` with bonus logic, `military_attack`, `deploy_agent`). The bonus additions may have introduced errors.

---

### Step A3: AI Cycles Still Fire

**Action:** Observe the map over at least one full stagger window (60 seconds). Watch for AI actions.

**Expected Result:**
- Zhao executes actions near 0s or 60s from game start.
- Consortium executes actions near 20s or 80s.
- Prophet executes actions near 40s or 100s.
- Timing doesn't need to be exact, but cycles should not be delayed by more than 5 seconds.
- No server crashes during AI cycles.

**Note:** The cultural tick fires every 30 seconds. Every 60 seconds, a cultural tick and an AI cycle could fire simultaneously. SpacetimeDB serializes transactions — one will execute first. This is expected behavior, not a bug. If an AI cycle appears delayed by exactly one cultural tick duration, that's the serializer at work.

**If this fails:** Check that the expanded AI prompt (with Cultural data) doesn't exceed token limits. Check that `ai_reasoning_cycle` scheduled reducer wasn't accidentally modified.

---

### Step A4: Intel Still Works

**Action:** Deploy agents in East Asia (Zhao's home) until you have 3. Click "What is Zhao planning?"

**Expected Result:** Intel panel shows Zhao's reasoning text. Territories referenced are highlighted.

**If this fails:** Check the `get_intel` procedure — the Cultural to Covert bonus addition may have broken the threshold check. Verify agent count is still 3+ and the effective agent calculation includes the bonus correctly.

---

**All 4 regression steps pass?** Proceed to Part B.

---

## 3. PART B: NEW FEATURE TEST

### Prerequisites

- Part A complete and passing.
- Game is in a fresh or early state where cultural influence hasn't already flipped multiple territories.

---

### Step B1: Four X-Split Quadrants Render Correctly

**Action:** Inspect several fractured territories closely. Hover over them.

**Expected Result:**
- Four distinct colored wedges per territory.
- Bottom-right wedge (Cultural) shows the correct owner color from seed data.
- Hover tooltip shows Cultural owner name and influence percentage.
- Territories with influence > 0 show a partial fill on the Cultural wedge (filled from outer edge toward center proportional to influence/100).

**If this fails:** Check `Territory.tsx` rendering logic for the fourth quadrant. Check that `culturalOwner` and `influencePct` props are passed correctly from `Map.tsx`.

---

### Step B2: Cultural Influence Changes on Tick

**Action:** Note the influence percentage on a fractured territory with 20–40% influence (e.g., North Africa at 40%, owned by Prophet). Wait 30 seconds for the first cultural tick.

**Expected Result:** After 30 seconds, the influence percentage on that territory has increased. The increase is visible both in the hover tooltip and in the partial fill on the Cultural wedge.

**If nothing changes after 30 seconds:** Check that `cultural_timer` is armed in `start_game` (one `ScheduleAt::Interval` row at `CULTURAL_TICK_SECONDS`). Check that the `cultural_spread_tick` scheduled reducer is wired to that table via `scheduled(cultural_spread_tick)`. Check server logs for errors during tick execution.

---

### Step B3: Cultural Flip Occurs

**Action:** Continue observing a territory with high influence (40%+). Wait for additional ticks until influence exceeds 50%.

**Expected Result:**
- When influence passes 50%, the Cultural quadrant changes color to the influencing player.
- Influence percentage resets to 0.
- The event is visible (no event ticker yet, but the color change is immediate).

**If influence accumulates past 50 but no flip:** Check the flip condition in `cultural_spread_tick` — must be `>` not `>=`. Check that `dimension_owner_change` is called after the flip.

---

### Step B4: Military→Economic Bonus

**Action:** Find a territory where the player owns Military. Note the current capital. Drag an Economic card onto that territory. Note the new capital.

**Expected Result:** Capital increases by 6 (base 5 + 1 bonus) instead of 5. Verify by comparing before and after values.

**Now test without the bonus:** Find a territory where the player does NOT own Military. Drag an Economic card there. Capital should increase by exactly 5.

**If bonus not applied:** Check `economic_invest` reducer — the `military_owner == player_id` conditional and the `invest_amount += 1` line.

---

### Step B5: Covert→Military Bonus

**Action:** This bonus existed in Slice 2. Confirm it still works. Deploy agents in a territory owned by another player. Note the defender's troop count and your agent count. Attack from an adjacent territory with more troops than the defender (after adding your agent count).

**Expected Result:** Attack succeeds. Your effective troop count = your troops + your agents in the target territory.

**If this fails:** Check `military_attack` reducer — the Covert→Military bonus logic should be unchanged from Slice 2.

---

### Step B6: Cultural→Covert Bonus

**Action:** Find a territory where the player owns Cultural. Deploy exactly 2 agents there. Query intel on an AI that has military or economic presence in that territory.

**Expected Result:** Intel shows "Insufficient intel." Effective agents = 2 + (2 * 10 / 100) = 2 + 0 = 2. Still below threshold of 3.

**Now deploy a 3rd agent in the same territory.** Query intel again.

**Expected Result:** Intel now shows the AI's reasoning. Effective agents = 3 + (3 * 10 / 100) = 3 + 0 = 3. Meets threshold.

**If the bonus changes the threshold unexpectedly:** Check the `get_intel` procedure — the `effective_agents` calculation with integer truncation. Verify the formula is `agent_count + (agent_count * 10 / 100)`.

---

### Step B7: Economic→Cultural Bonus

**Action:** Find two adjacent territories where the same player owns both Economic and Cultural in the source territory. Observe the cultural pressure on the neighbor after a tick. Compare to a different border where the source territory owner doesn't own both dimensions.

**Expected Result:** The territory with the Economic→Cultural bonus active should accumulate influence faster (15% more pressure per tick). This may take multiple ticks to observe clearly. The exact math: if base pressure is 2 (from capital 20/10), bonus pressure is 2 + (2 * 15 / 100) = 2. If base pressure is 5 (from capital 50/10), bonus pressure is 5 + (5 * 15 / 100) = 5.

**Note:** This bonus is subtle at low capital values. It becomes more pronounced as economies grow. For immediate verification, check the server logs or add temporary debug output to `cultural_spread_tick`.

**If unsure:** The bonus math can be verified by code review of `cultural_spread_tick` rather than observation.

---

### Step B8: Four-Dimension Victory

**Action:** This is the hardest test to execute naturally. You may need to coordinate actions (or use debug commands) to set up a win state. Alternatively, play a full game and observe the victory tracker.

**Expected Result:**
- Victory tracker shows unified count for each player (territories where one player owns all four dimensions).
- At 5 unified territories, the victory overlay appears.
- Actions are blocked after victory.

**Faster verification:** Temporarily lower `WIN_UNIFIED_TERRITORIES` to 2 for testing. Unify two territories across all four dimensions. Verify victory triggers. Restore to 5 after testing.

**If victory doesn't trigger:** Check `dimension_owner_change` — the win query must check all four dimension tables. Check that `WIN_UNIFIED_TERRITORIES` constant is 5.

---

**All 8 feature test steps pass?** Slice 3 is validated.

---

## 4. TRIAGE TABLE — SLICE 3 SPECIFIC

| Step | Symptom | Most Likely Cause | Check |
|------|---------|-------------------|-------|
| A1 | Cultural quadrant shows neutral on all territories | Cultural subscription not connected | `useSubscriptions.ts` — add `useTable(tables.cultural)`; regenerate bindings |
| A1 | Cultural quadrant colors wrong | Seed data mismatch | `start_game` reducer — compare cultural inserts against Interface Contract Section 3 |
| A1 | Only 3 quadrants visible | Territory component not updated | `Territory.tsx` — activate bottom-right wedge |
| B2 | No influence change after 30s | Cultural tick not firing | Server logs — check that `cultural_timer` is armed in `start_game` (`ScheduleAt::Interval` at `CULTURAL_TICK_SECONDS`) and wired via `scheduled(cultural_spread_tick)`. |
| B2 | Influence changes on wrong territories | Adjacency map error | `cultural_spread_tick` — check adjacency lookup |
| B3 | Influence exceeds 50 but no flip | Flip condition uses >= instead of > | `cultural_spread_tick` — change to `>` |
| B3 | Flip occurs but influence doesn't reset | Reset logic missing | `cultural_spread_tick` — add `influence_pct = 0` after flip |
| B3 | Flip occurs but wrong player | Pressure accumulation error | Check per-player pressure map — verify highest pressure player is identified correctly |
| B4 | Invest adds 5 instead of 6 | Bonus conditional not met | `economic_invest` — check `military_owner == player_id` before adding bonus |
| B4 | Invest adds wrong amount | Bonus math error | `economic_invest` — should be `invest_amount = 5 + 1` |
| B6 | 2 agents + Cultural still shows intel | Effective agent formula wrong | `get_intel` — check integer truncation: `2 * 10 / 100 = 0` |
| B6 | 3 agents + Cultural shows insufficient | Effective agent formula wrong | `get_intel` — check formula order: add bonus before comparison |
| B7 | Bonus pressure is 0 at low capital | Integer division truncation | Expected behavior — capital/10 rounds down. At 20 capital, pressure=2, bonus=0. At 70 capital, pressure=7, bonus=1. |
| B8 | Victory doesn't trigger at 5 | Win check missing Cultural or Covert | `dimension_owner_change` — query must include all four tables |
| B8 | Victory triggers at wrong count | Threshold constant not updated | Check `WIN_UNIFIED_TERRITORIES = 5` |

---

## 5. POST-VALIDATION FIX PRIORITIES

### Priority 1: Showstopper Bugs

- Cultural tick crashes server.
- Cultural tick blocks AI cycles (scheduler contention).
- Win condition broken (never fires or fires at wrong count).
- Cross-dimension bonuses corrupt game state.
- Any regression that breaks Slice 2 functionality.

### Priority 2: Cultural Balance

- Cultural spread speed: does influence accumulate too fast (flips every 2–3 ticks) or too slow (flips take 10+ ticks)?
- Tuning levers: `CULTURAL_TICK_SECONDS` (30s), `CULTURAL_PRESSURE_DIVISOR` (10), `INFLUENCE_FLIP_THRESHOLD` (50).
- If flips are too fast: increase divisor or threshold. If too slow: decrease divisor or threshold.
- The goal: a cultural flip should feel like an event — noticeable, impactful, but not constant.

### Priority 3: AI Cultural Behavior

- AI should reason about Cultural dimension in its actions.
- Zhao should occasionally invest economically to slow enemy cultural spread.
- Consortium should intentionally build economic clusters to generate cultural pressure.
- Prophet should invest in border territories specifically to accelerate cultural spread.
- If AI ignores Cultural entirely, tune the prompt to emphasize its role.

### Priority 4: Bonus Balance

- Military→Economic (+1 flat): should feel like a meaningful bonus. If +6 vs +5 doesn't feel different, consider +2.
- Economic→Cultural (+15%): check that this creates visible pressure differences at mid-game capital levels (30–50 capital).
- Cultural→Covert (+10%): the 2 vs 3 agent threshold should feel like a meaningful breakpoint. With the bonus, 3 agents is still the magic number in most cases.

### Priority 5: Visual Polish

- Cultural quadrant influence fill animation (smooth transition as influence changes).
- Cultural flip animation (brief flash or pulse when ownership changes).
- Victory tracker shows all four dimension icons for unified territories.

---

## 6. SLICE 4 READINESS GATE

Before generating Slice 4, all of the following must be true:

1. **All 4 regression steps pass** with no errors.
2. **All 8 feature test steps pass** with no workarounds.
3. **Cultural tick fires reliably.** No missed ticks over 5 minutes of observation (10 consecutive ticks).
4. **At least one cultural flip observed** during testing.
5. **All four cross-dimension bonuses verified** mathematically or through observation.
6. **Win condition triggers at 5 unified territories.**
7. **AI cycles fire on their staggered schedule** without being delayed by cultural ticks.
8. **Server compiles** with `cargo build` — zero errors.
9. **Client compiles** with `npm run build` — zero errors.
10. **No known showstopper bugs.** Any discovered bug is fixed or documented.
11. **The Slice 3 codebase is committed and tagged `slice-3-complete`.** Slice 4 generation modifies this same `app/` codebase.

If any condition is not met, do not proceed to Slice 4.

---

## 7. MANUAL ITERATION NOTES

- **Cultural tick timing for testing:** 30 seconds is long for validation. You may temporarily lower `CULTURAL_TICK_SECONDS` to 10 seconds to observe multiple ticks quickly. Restore to 30 before Slice 4.
- **Forcing a tick (temporary):** To trigger a cultural tick on demand without waiting, add a temporary operator-only reducer that inserts a one-shot `cultural_timer` row with `ScheduleAt::Time(ctx.timestamp + Duration::from_secs(1))`; the scheduler then fires `cultural_spread_tick` almost immediately. Invoke it with `spacetime call`. A scheduled reducer is driven by its scheduled table, so it cannot be called directly from the client. Remove the temporary reducer before Slice 4.
- **Pressure visibility:** Consider adding temporary console logs to `cultural_spread_tick` during validation to see per-territory pressure values. Remove before Slice 4.
- **Win condition testing:** Lower `WIN_UNIFIED_TERRITORIES` to 2 temporarily to verify the four-dimension win check. Restore to 5 after validation.
- **Scheduler overlap:** Every 60 seconds, the cultural tick (30s) and an AI cycle (60s) may fire simultaneously. SpacetimeDB serializes these. If you observe an AI cycle delayed by a few seconds every 60s, this is expected.

---

## End of Slice 3 Implementation Strategy

Validate. Debug. Fix. Commit (tag `slice-3-complete`). Then Slice 4 — the query system and event ticker. The final slice is Slice 7.