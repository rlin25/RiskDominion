# RISK: DOMINION — SLICE 1 IMPLEMENTATION STRATEGY

## Version 1.0
## Scope: Validation and Debugging for Two-Player, Two-Dimension Game
## Target: Human Team — After Claude Code Generation

---

## Principle 0: Validate Before You Build On It

Slice 1 is the foundation for Slices 2 through 7. Every subsequent slice grows this same codebase in place (the single `risk-dominion/app/` application). If Slice 1 has a bug, a miswired subscription, a reducer that returns the wrong `Err`, a territory that renders the wrong color, that bug will compound. A broken military attack in Slice 1 becomes a broken AI opponent in Slice 2 becomes a broken query system in Slice 4.

The rule: Slice 1 must pass every test step, compile cleanly, and have zero known showstopper bugs before Slice 2 generation begins. No exceptions.

This document tells you how to validate Slice 1, how to debug it when validation fails, and what to fix before moving on.

---

## 1. VALIDATION STRUCTURE

Slice 1 uses a single end-to-end test script. One tester executes the steps in order. Each step specifies an action and an exact expected result. If the observed result matches, the step passes. If it does not, stop. Debug that step. Do not continue until it passes.

The full script takes approximately 10 minutes to execute.

---

## 2. TEST SCRIPT

### Prerequisites

- SpacetimeDB server is running.
- Frontend dev server is running (`npm run dev`).
- Two browser windows are open, pointed at the frontend URL.

---

### Step 1: Server and Client Start

**Action:** Start the SpacetimeDB server. Start the frontend dev server. Open a browser tab to `http://localhost:5173/?player=1`.

**Expected Result:** No errors in server console. No errors in browser console. A map is visible with 12 territories. Each territory shows two colored halves.

**If this fails:** The application didn't load. Check server compilation, frontend build, and WebSocket connection. See Triage Section 3, Row 1.

---

### Step 2: Map Renders Correct Seed Data

**Action:** With Player 1 tab open, inspect the map.

**Expected Result:**
- North America (top-left territory): both halves blue (#4488FF). This is Player 1's home territory.
- Western Europe (territory in the Europe cluster): both halves red (#FF4444). This is Player 2's home territory.
- Central America: left half blue (Player 1 military), right half red (Player 2 economic).
- Caribbean: both halves blue (Player 1 owns both).
- South America: left half red (Player 2 military), right half blue (Player 1 economic).
- East Asia: both halves red (Player 2 owns both).
- A victory tracker shows "Player 1: 1/3" and "Player 2: 1/3" (North America and Western Europe are unified).
- Action point bar for Player 1 shows 5/10.
- Card hand shows 5 cards (mix of red Military and gold Economic).

**If this fails:** Colors don't match seed data. Check seed data in `start_game` reducer against Interface Contract Section 3. See Triage Section 3, Row 2.

---

### Step 3: Player 2 Connects and Sees Same State

**Action:** Open a second browser tab to `http://localhost:5173/?player=2`.

**Expected Result:**
- Map shows identical territory colors as Player 1's tab.
- Victory tracker shows "Player 1: 1/3" and "Player 2: 1/3".
- Action point bar for Player 2 shows 5/10.
- Card hand shows 5 cards.
- Top of screen shows "You are Player 2" or a red indicator.

**If this fails:** Second tab shows different state or no state. Check that both tabs connect to the same SpacetimeDB instance. Check that `start_game` is idempotent (not re-seeding when Player 2 connects). See Triage Section 3, Row 3.

---

### Step 4: Player 1 Executes a Successful Military Attack

**Action:** In Player 1's tab, drag a red Military card from the hand onto Central America (territory 2). Player 1 owns Military in North America (territory 1), which is adjacent to Central America. North America has 10 troops. Central America currently has 5 troops (owned by Player 2).

**Expected Result:**
- Central America's left (military) half changes from blue to... blue (Player 1 already owned it — wait). **Correction:** Central America's military is already owned by Player 1 (seed data: mil_owner=1, troops=5). The attack should target a territory Player 1 does NOT own militarily.

**Revised Action:** Drag a Military card onto South America (territory 4). Player 1 owns Military in Central America (adjacent, 5 troops) and Caribbean (adjacent, 4 troops). South America is owned by Player 2 with 6 troops. The attack uses the highest adjacent troop count: Central America with 5 troops vs South America's 6 troops. **5 is not > 6. Attack fails.**

**Revised Revised Action:** First, Player 1 invests economically in Central America to build up, or... let's pick a guaranteed successful attack.

**Final Action for Step 4:** Drag a Military card onto North Africa (territory 6). Player 1 owns Military in Caribbean (territory 3, 4 troops, adjacent to North Africa). North Africa has 5 troops owned by Player 2. 4 is not > 5. Attack fails.

**Actual Guaranteed Success:** Player 1 drags Military onto Caribbean (territory 3) — wait, Player 1 already owns it.

**Correct Test Action:** Player 2 drags a Military card onto Central America (territory 2). Player 2 owns Military in South America (territory 4, 6 troops, adjacent to Central America). Central America has 5 troops owned by Player 1. 6 > 5. Attack succeeds.

**Expected Result for Step 4 (revised):**
- In Player 2's tab: action points decrement from 5 to 4. One card leaves the hand.
- Central America's left (military) half changes from blue to red.
- In Player 1's tab: the same change is visible within 1 second.
- Central America now shows red (military) and red (economic) — Player 2 unified Central America. Victory tracker updates to "Player 2: 2/3".

**If this fails:** Attack didn't change territory or didn't sync. See Triage Section 3, Row 4.

---

### Step 5: Player 1 Executes an Economic Invest

**Action:** In Player 1's tab, drag a gold Economic card onto South America (territory 4). Player 1 currently has 10 capital in South America. Player 2 has 6 military there.

**Expected Result:**
- Player 1's action points decrement from 5 to 4.
- South America's economic capital increases from 10 to 15. (Ownership remains with Player 1 — no flip, since Player 1 already owns Economic there.)
- In Player 2's tab: the capital increase is reflected (visible on hover or in a tooltip).

**Alternative Action (ownership flip):** Drag Economic card onto Eastern Europe (territory 8). Player 1 has 0 capital there. Player 2 has 9 capital. After invest: Player 1 has 5 capital. 5 is not > 9. No flip. Invest again: 10 > 9. Flip.

**Simpler Test:** Just verify the action point decrement and capital increase. Ownership flips are tested implicitly during gameplay.

**Expected Result for Step 5 (simplified):**
- Action points decrement.
- Capital increases by 5 in the target territory.
- Change visible in both tabs.

**If this fails:** Invest didn't change capital or didn't sync. See Triage Section 3, Row 5.

---

### Step 6: Action Points Regenerate

**Action:** Wait 8 seconds. Watch the action point bar for Player 1.

**Expected Result:**
- Player 1's action points increment from 4 to 5 (assuming one action was taken in Step 5).
- A new card slides into the hand.
- After another 8 seconds: points go to 6.
- Regeneration continues until cap at 10. At 10, no more cards appear, bar is full.

**If this fails:** Points don't regenerate or regenerate too fast/slow. See Triage Section 3, Row 6.

---

### Step 7: Victory Condition Triggers

**Action:** Play the game (either player) until one player unifies 3 territories. A territory is unified when the same player owns both Military and Economic.

To accelerate testing: Player 2 already has 2 unified territories (Western Europe from seed data, plus Central America from Step 4). Player 2 needs 1 more. Drag Military onto a territory adjacent to Player 2's holdings where Player 2 can win, and invest Economically in the same territory. Or use coordinated actions between both tabs to set up a win state.

**Expected Result:**
- When the 3rd territory is unified, a victory overlay appears on both tabs.
- Overlay shows "{winner_name} wins!" — either "Player 1 wins!" or "Player 2 wins!".
- The winning player's tab shows "You win!".
- The losing player's tab shows "You lose.".
- Cards are no longer draggable. Actions are blocked.

**If this fails:** Victory doesn't trigger at 3, or only triggers on one tab. See Triage Section 3, Row 7.

---

## 3. TRIAGE TABLE

When a test step fails, find the symptom below. Check the listed files and causes first.

| Step | Symptom | Most Likely Cause | Check |
|------|---------|-------------------|-------|
| 1 | Server won't start | Rust compilation error | `app/server/src/lib.rs`: syntax, missing imports, `#[spacetimedb::table]` / `#[spacetimedb::reducer]` macro usage |
| 1 | Frontend white screen | JavaScript error, import failure | Browser console. Check `App.tsx`, `main.tsx`, `connection.ts`, `package.json` dependencies, and that `module_bindings` was generated |
| 1 | No WebSocket connection | Wrong SpacetimeDB URI | `VITE_SPACETIMEDB_URI` / `VITE_MODULE_NAME` env vars. Check `connection.ts` builder config |
| 2 | Map is blank | Subscriptions not delivering data | `useSubscriptions.ts`: are the `useTable(tables.x)` calls correct and is `isReady` true? Server logs: are tables populated? |
| 2 | Territory colors wrong | Seed data mismatch | `start_game` reducer — compare inserted values against Interface Contract Section 3 |
| 2 | Victory tracker shows 0/3 | Client unified count calculation | `territoryHelpers.ts` — `countUnifiedTerritories` function logic |
| 2 | Card hand empty | Action points not 5 | `players` table subscription — is action_points = 5 after start_game? |
| 3 | Player 2 sees different state | Two tabs on different SpacetimeDB instances | Check both tabs use same URI. Check `start_game` not re-seeding |
| 3 | Player 2 has no cards | Player 2 not selecting its own row | `App.tsx`: is the current player picked by `playerId` from the URL (the `players` table is subscribed in full, not server-filtered)? |
| 4 | Attack doesn't change territory | Reducer validation failed silently | Server logs: is the reducer returning `Err(..)`? Check the browser console for the rejected `useReducer` promise message |
| 4 | Attack succeeds but map doesn't update | Subscription not triggering re-render | `useSubscriptions.ts`: are the `useTable` rows flowing into props? React rendering: is Map re-rendering? |
| 4 | Second tab doesn't see change | Subscription latency or missed update | Wait 2 seconds. If still not visible, check both tabs' WebSocket connections |
| 5 | Capital doesn't increase | Reducer not applying invest amount | `economic_invest` reducer — is +5 being added? Check for integer overflow |
| 6 | Points don't regenerate | Scheduled reducer not firing | Server logs: is `regenerate_action_points` firing? Check the `regen_timer` scheduled table was inserted in `start_game` with `ScheduleAt::Interval` of 8 seconds |
| 6 | Points regenerate too fast | Interval misconfigured | Check `ACTION_REGEN_SECONDS` constant value (should be 8) |
| 7 | Victory doesn't trigger at 3 | Win check logic error | `dimension_owner_change` — is it counting unified territories correctly? Check query logic |
| 7 | Victory triggers but overlay doesn't show | game_state subscription not updating | `App.tsx` — is it subscribed to `game_state`? Is the VictoryScreen component conditionally rendering on `status === 'ended'`? |
| 7 | Actions still work after victory | Reducers not checking game_state.status | `military_attack` and `economic_invest` — do they validate `status === 'active'`? |

---

## 4. POST-VALIDATION FIX PRIORITIES

After the test script passes completely, address issues in this order before proceeding to Slice 2:

### Priority 1: Showstopper Bugs

Anything that would prevent Slice 2 from building on this codebase:
- Server crashes under any condition.
- Reducers do not return `Result<(), String>` correctly (a validation failure must be an `Err`, not a silent no-op).
- Subscriptions fail to deliver updates reliably.
- The codebase does not compile cleanly (`spacetime build` / `cargo build` and `npm run build` must succeed with zero errors).

### Priority 2: Visual and UX Issues

Issues that affect usability across all future slices:
- Territory colors are hard to distinguish (check contrast between #4488FF and #FF4444).
- Card drag feels unresponsive or janky.
- Map layout doesn't clearly show adjacency (players can't tell which territories border which).
- Action point bar is unclear or hard to read.
- Victory screen doesn't clearly announce winner.

### Priority 3: Balance Tuning

Values that affect gameplay feel:
- Starting troop counts (10 for home, 4–6 for fractured) — are attacks too easy or too hard?
- Economic invest amount (5) — does economic ownership flip at a reasonable pace?
- Regeneration rate (8 seconds) — does the game feel too fast or too slow?
- Win threshold (3 territories) — are games too short or too long?

### Priority 4: Polish

Visual improvements that make the demo look finished:
- Territory hover tooltips showing troop counts and capital values.
- Smooth color transitions when ownership changes.
- Card slide animation when points regenerate.
- Styling the victory overlay.

---

## 5. SLICE 2 READINESS GATE

Before generating Slice 2, all of the following must be true:

1. **All 7 test steps pass** with no workarounds or manual interventions.
2. **Server compiles** with `spacetime build` (or `cargo build`): zero errors, zero warnings preferred.
3. **Client compiles** with `npm run build` — zero errors.
4. **No known showstopper bugs** remain. Any bug discovered during testing is either fixed or documented with a plan to fix before Slice 2 generation.
5. **The codebase is committed** to version control and tagged `slice-1-complete`. Slice 2 generation modifies this same `risk-dominion/app/` codebase in place, so a clean tagged rollback point must exist.

If any condition is not met, do not proceed to Slice 2. Fix the issue, re-run the test script, and re-evaluate.

---

## 6. MANUAL ITERATION NOTES

- **Debug panel (optional):** If any test step is hard to verify (e.g., waiting for regen), add temporary buttons to `App.tsx` that call reducers directly or display raw table data. Remove these before Slice 2.
- **Second browser tab:** During testing, keep both tabs visible side-by-side to verify real-time sync. The 1-second sync expectation is generous — SpacetimeDB subscriptions typically deliver in milliseconds.
- **Seed data verification:** The most common failure in Step 2 is a single wrong value in the seed data. Compare the `start_game` reducer's insert statements character-by-character against Interface Contract Section 3.

---

## End of Slice 1 Implementation Strategy

Validate. Debug. Fix. Commit. Then Slice 2.