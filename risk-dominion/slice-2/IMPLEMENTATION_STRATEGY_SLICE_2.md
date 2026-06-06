# RISK: DOMINION — SLICE 2 IMPLEMENTATION STRATEGY

## Version 2.0
## Scope: AI Opponents, Covert Dimension, Intel System
## Target: Human Team — After Claude Code Generation
## Platform: SpacetimeDB 2.4.1

---

## Principle 0: Validate Before You Build On It

Slice 2 transforms Slice 1 from a two-human game into a single-player experience against three Claude-powered AI opponents. It grows the single `risk-dominion/app/` codebase in place (reducers, seed data, subscriptions) and adds the Covert dimension, the AI reasoning cycle (a scheduled procedure calling Claude via `ctx.http`), and the intel system (a `get_intel` procedure).

If Slice 2 has a bug, Slice 3 (which adds Cultural spread and cross-dimension bonuses) will be debugging AI pipeline issues on top of new dimension mechanics. That is a nightmare.

The rule: Slice 2 must pass every regression check and every new feature test before Slice 3 generation begins. No exceptions.

This document tells you how to validate Slice 2, how to debug it when validation fails, and what to fix before moving on.

---

## 1. VALIDATION STRUCTURE

Slice 2 validation has two parts:

**Part A: Regression Check** — Condensed Slice 1 tests to confirm the codebase modifications didn't break core gameplay. Approximately 5 minutes.

**Part B: New Feature Test** — Tests for agent deployment, AI reasoning cycles, and intel queries. Approximately 15 minutes (includes waiting for AI cycles).

Execute Part A first. If any step fails, stop and fix before proceeding to Part B. A failing regression means Slice 1 functionality is broken, and new features won't work reliably on top of it.

---

## 2. PART A: REGRESSION CHECK

### Prerequisites

- SpacetimeDB 2.4.1 is installed (`spacetime version` reports 2.4.1; upgrade via `curl -sSf https://install.spacetimedb.com | sh` or `spacetime version upgrade`).
- The module is published (`spacetime publish risk-dominion --project-path server`) and the Anthropic API key is seeded once via `spacetime call risk-dominion set_config '"anthropic_api_key"' '"sk-ant-..."'`.
- Bindings are regenerated (`spacetime generate --lang typescript --out-dir client/src/module_bindings --module-path server`).
- Frontend dev server is running (`npm run dev`).
- One browser tab open to `http://localhost:5173` (no URL parameters — Slice 2 is single-player).

---

### Step A1: Server and Client Start

**Action:** Start the SpacetimeDB server. Start the frontend. Open browser to `http://localhost:5173`.

**Expected Result:** No errors in server console. No errors in browser console. A hex map is visible with 12 territories. No URL parameter needed.

**If this fails:** The application didn't load. Check that Slice 1 functionality still works. Check server compilation with new tables and reducers.

---

### Step A2: Single Player Identity

**Action:** Observe the action bar and player indicator.

**Expected Result:** The action bar color is blue (#4488FF). If a player indicator exists, it shows Player 1. No second player tab is needed. The game is single-player.

**If this fails:** The `?player=` URL parameter logic may not have been fully removed. Check `App.tsx` for remaining multiplayer logic.

---

### Step A3: Map Renders Correct Seed Data

**Action:** Inspect the hex map.

**Expected Result:**
- 12 hex territories with X-split quadrants (three colored wedges, one neutral wedge — Covert wedge is dark when no agents).
- North America (territory 1): Player blue in all three active quadrants (Military, Economic, Covert).
- East Asia (territory 11): Zhao red in all three active quadrants.
- Western Europe (territory 5): Consortium orange in all three active quadrants.
- Middle East (territory 9): Prophet purple in all three active quadrants.
- Central America (territory 2): Military = blue, Economic = orange, Covert = dark (no agents).
- Victory tracker shows: Player: 1/3, Zhao: 1/3, Consortium: 1/3, Prophet: 1/3.

**If this fails:** Seed data mismatch. Check `start_game` reducer against Interface Contract Section 3.3. Verify 4 players are inserted.

---

### Step A4: Player Executes Military and Economic Actions

**Action:** Drag a Military card onto an adjacent territory where the player has troop advantage. Drag an Economic card onto any territory.

**Expected Result:** Action points decrement. Territory ownership changes on successful attack. Capital increases on invest. Map updates. Action still uses `player_id=1`.

**If this fails:** Check that `military_attack` and `economic_invest` reducers still accept `player_id=1` (now thin wrappers over the shared `do_*` fns). Check that the validation range was expanded to 1-4 without breaking existing logic.

---

### Step A5: Action Points Regenerate

**Action:** Wait 8 seconds. Watch the action point bar.

**Expected Result:** Action points increment by 1. New card slides into hand. Continues until cap at 10.

**If this fails:** Check `regenerate_action_points` scheduled reducer. Verify it iterates over all 4 players.

---

**All 5 regression steps pass?** Proceed to Part B.

---

## 3. PART B: NEW FEATURE TEST

### Prerequisites

- Part A complete and passing.
- Anthropic API key is seeded in the private `module_config` table via `set_config` (not `.env`).
- The SpacetimeDB host has outbound network access to reach `api.anthropic.com` (the `ai_reasoning_cycle` procedure makes the HTTP call via `ctx.http`).

---

### Step B1: Covert Card Exists

**Action:** Look at the card hand at the bottom of the screen.

**Expected Result:** Three card types are visible (mix depending on action points):
- Military: red left border, chevron icon, "ATTACK"
- Economic: gold left border, circle-with-line icon, "INVEST"
- Covert: purple left border, concentric circles icon, "DEPLOY"

**If this fails:** Check `CardHand.tsx` for card type rendering. Check that the Covert card is included in the rotation.

---

### Step B2: Deploy Agent — First Deployment

**Action:** Drag a Covert card onto East Asia (territory 11). East Asia is Zhao's home territory. Zhao starts with 1 agent there.

**Expected Result:**
- Action points decrement by 1.
- East Asia's Covert quadrant changes. Before deployment: Covert owner was Zhao (red), 1 agent. After deployment: Covert owner becomes Player (blue), agent_count = 2 (inherited Zhao's 1 agent + player's new agent).
- Hovering over East Asia's Covert quadrant shows "Agents: 2".

**If this fails:** Check `deploy_agent` reducer logic. Verify agent inheritance on ownership flip.

---

### Step B3: Deploy Agent — Reach Intel Threshold

**Action:** Drag another Covert card onto East Asia.

**Expected Result:**
- Action points decrement.
- East Asia Covert quadrant still blue. Agent count = 3.
- Hover shows "Agents: 3".

**If this fails:** Check agent count increment when `covert.owner_id == player_id`.

---

### Step B4: Wait for Zhao's First AI Cycle

**Action:** Wait up to 60 seconds. Zhao's cycle fires at 0s, 60s, 120s from game start. If the game just started, you may need to wait nearly a full minute. Watch the map.

**Expected Result:** Within 60–90 seconds of game start, Zhao executes actions. You'll see one or more of:
- A territory's Military quadrant changes to red.
- A territory's Economic quadrant changes to red.
- A territory's Covert quadrant changes to red.
- Action point bar does NOT change for the player (AI has its own pool).

**If nothing happens after 90 seconds:** Check server logs for AI cycle errors. Check that the `ai_cycle_schedule` rows were seeded and the `ai_reasoning_cycle` procedure is firing. Check the Anthropic API key was seeded via `set_config`. See Triage Section 4.

---

### Step B5: Query Intel — Success

**Action:** Click the "What is Zhao planning?" button in the Intel panel.

**Expected Result:**
- Intel panel displays Zhao's reasoning text. This is natural language describing Zhao's strategy.
- The panel shows Zhao's name and the cycle timestamp.
- Territories referenced in Zhao's plan are highlighted on the map with a gold glow.
- The reasoning text is specific to the current game state (mentions territory names, not just generic strategy).

**If this fails:** Check the `get_intel` procedure. Check that `agent_count >= 3` in East Asia (Zhao has military and economic presence there). Check `ai_reasoning_log` for the most recent row.

---

### Step B6: Query Intel — Insufficient Agents

**Action:** Click "What is Consortium planning?" The player has not deployed agents in Consortium's territories.

**Expected Result:**
- Intel panel shows: "Insufficient intel. Deploy agents in territories where Consortium is active."
- No reasoning text. No territory highlights.
- Status is "insufficient_intel".

**If this fails:** Check the `get_intel` procedure logic for the `max_agent_count < 3` branch.

---

### Step B7: Wait for Consortium and Prophet Cycles

**Action:** Wait for the staggered cycles. Consortium fires at 20s, 80s, 140s. Prophet fires at 40s, 100s, 160s.

**Expected Result:** Both AIs execute actions within their cycles. Map updates reflect their moves. No server crashes.

**If this fails:** Check the stagger offsets in `start_game` (each AI's first `ai_cycle_schedule` row). Check that all three `ai_cycle_schedule` rows were seeded and each cycle re-arms the next.

---

### Step B8: AI Respects Action Point Economy

**Action:** Observe AI actions over multiple cycles. If possible, check server logs or add temporary debug output showing AI action points.

**Expected Result:** AI does not submit more actions than its available action points. AI action points regenerate at 1 per 8 seconds like the human. AI does not act when it has 0 points.

**If this fails:** Check that `apply_ai_actions` runs each action through the shared `do_*` fns, which check `action_points >= 1` and decrement before acting. Check that `regenerate_action_points` includes AI players.

---

**All 8 feature test steps pass?** Slice 2 is validated.

---

## 4. TRIAGE TABLE — SLICE 2 SPECIFIC

When a test step fails, find the symptom below.

| Step | Symptom | Most Likely Cause | Check |
|------|---------|-------------------|-------|
| A2 | Game asks for ?player= parameter | Multiplayer logic not removed | `App.tsx` — remove URL parameter parsing, hardcode player_id=1 |
| A3 | Map shows only 2 player colors | Seed data still has 2 players | `start_game` reducer — verify 4 player inserts |
| A3 | Covert quadrants missing | Covert subscription not wired | `useSubscriptions.ts` — add `useTable(tables.covert)` |
| B1 | No Covert card in hand | Card rotation doesn't include Covert | `CardHand.tsx` — add third card type to rotation |
| B2 | Agent deployment doesn't change quadrant | `deployAgent` reducer not called | Browser console — check the reducer call; verify bindings were regenerated |
| B2 | Agent count wrong after flip | Inheritance logic error | `do_deploy_agent` — check `agent_count + 1` on ownership change |
| B4 | AI doesn't act after 90s | AI cycle not firing | Server logs — check `ai_cycle_schedule` rows were seeded and re-armed. Check stagger offsets. |
| B4 | AI doesn't act, no errors | API key missing or host offline | Check `module_config` has `anthropic_api_key` (seeded via `set_config`). Check the host can reach `api.anthropic.com`. Check `ANTHROPIC_URL`. |
| B4 | AI cycle fires but no actions | LLM reply had no parseable array | Server logs — check `parse_actions` (extracts the LAST balanced `[...]`). Check prompt format. |
| B4 | Procedure errors during AI cycle | HTTP/parse error in the procedure | Check `anthropic_call` returns `Err` (not panic); on `Err` the cycle resets `cycle_status` to idle. |
| B5 | Intel returns "no recent reasoning" | AI hasn't completed a cycle yet | Wait for AI cycle to complete. Check `ai_reasoning_log` for rows. |
| B5 | Intel returns "insufficient" despite 3 agents | Agent check logic error | `get_intel` — verify it checks territories where AI has military OR economic |
| B5 | Intel returns text but no highlights | `territories_referenced` extraction failed | Check `actions_taken` JSON parsing in `get_intel` |
| B6 | Intel returns success for Consortium with no agents | Threshold check using wrong player | `get_intel` — verify `owner_id == 1` (human) filter |
| B8 | AI submits 10 actions at once | Action point tracking off | `do_*` fns — check each decrements one point and rejects at 0 |

---

## 5. POST-VALIDATION FIX PRIORITIES

### Priority 1: Showstopper Bugs

- The AI cycle procedure errors or panics.
- LLM calls hang past the 30s `ctx.http` timeout (verify the `Timeout` extension is set).
- AI actions corrupt game state.
- Covert deployment breaks military or economic ownership.
- Any regression that breaks Slice 1 functionality.

### Priority 2: AI Behavior Quality

- AI always picks the same action type (e.g., Zhao only deploys agents, never attacks). Tune the persona prompt.
- AI makes strategically nonsensical moves (attacks its own territory, invests where it already has dominant capital). Improve prompt clarity.
- AI times out more than 1 in 5 cycles. Check API latency, consider reducing prompt length or increasing timeout.
- AI actions are too predictable. Add slight randomness to persona descriptions.

### Priority 3: Intel UX

- Intel panel layout is unclear or hard to read.
- Territory highlights from intel don't clear when panel is closed.
- "Insufficient intel" message doesn't guide the player on where to deploy agents.
- No loading indicator while waiting for `get_intel` response.

### Priority 4: Covert Balance

- Intel threshold (3 agents) feels too easy or too hard to reach in early game.
- Agent inheritance on flip is too generous (makes Covert too volatile).
- Deploy Agent has no adjacency restriction — does this make it too powerful compared to Military?

### Priority 5: Polish

- AI cycle status indicator (showing "Zhao is planning..." during pending state).
- Covert quadrant visual distinction (different pattern or opacity for 1–2 agents vs 3+).
- Hover tooltip on territories showing all three dimension values.
- Card hand animation for the new Covert card type.

---

## 6. SLICE 3 READINESS GATE

Before generating Slice 3, all of the following must be true:

1. **All 5 regression steps pass** with no errors.
2. **All 8 feature test steps pass** with no workarounds.
3. **All three AIs complete cycles reliably.** At least 3 consecutive cycles per AI without timeout.
4. **Intel returns correct data** when threshold is met. Returns "insufficient" when not met.
5. **Server compiles** with `spacetime build` (or `cargo build`) — zero errors. The `unstable` feature is enabled.
6. **Client compiles** with `npm run build` — zero errors. Bindings were regenerated after the server change.
7. **No known showstopper bugs.** Any discovered bug is fixed or documented.
8. **The Slice 2 codebase is committed and tagged `slice-2-complete`.** Slice 3 generation grows this same `app/` codebase. A clean rollback point exists.

If any condition is not met, do not proceed to Slice 3. Fix the issue, re-run validation, and re-evaluate.

---

## 7. MANUAL ITERATION NOTES

- **AI cycle timing:** The 60-second cadence is long for testing. During validation you may temporarily lower `AI_CYCLE_SECONDS` to 20. Remember to restore it to 60 before tagging `slice-2-complete`. (The first-fire stagger lives in `start_game`; clearing the DB re-seeds it.)
- **Faster testing:** To trigger a cycle on demand, insert an `ai_cycle_schedule` row with a near-immediate `ScheduleAt::Time` (the procedure target receives the row). Avoid wiring client-callable triggers into production UI.
- **Anthropic API latency:** The API typically responds in 2-5 seconds. If consistently above 10 seconds, check your network or Anthropic's status page. The procedure's `ctx.http` timeout is 30s.
- **Reset during testing:** Clear and republish the SpacetimeDB database (`spacetime delete risk-dominion` then `spacetime publish ...`), then re-seed the API key with `set_config`. There is no in-game restart button in Slice 2.

---

## End of Slice 2 Implementation Strategy

Validate. Debug. Fix. Commit. Then Slice 3.