# RISK: DOMINION — SLICE 7 IMPLEMENTATION STRATEGY

## Version 1.0
## Scope: Spectator Mode, Replay System, Complete Transparency
## Target: Human Team — After Claude Code Generation

---

## Principle 0: This Is the Transparency Layer

Slice 7 is the final slice. After this, Risk: Dominion is not just playable — it is observable, reviewable, and provable. Spectator mode lets judges watch live with X-ray vision into hidden game state. Replay mode lets anyone scrub through a completed game and see exactly what every AI was thinking at every moment.

This slice modifies `App.tsx` significantly — adding URL parameter routing for three modes (player, spectator, replay). It adds new components for the stats overlay and replay timeline. It makes existing components time-aware for historical data display.

The rule: Slice 7 must pass every regression check and every new feature test before the game is considered demo-ready. No exceptions.

This document tells you how to validate Slice 7, how to debug it when validation fails, and what to fix before the final demo.

---

## 1. VALIDATION STRUCTURE

Slice 7 validation has two parts:

**Part A: Regression Check** — Condensed Slice 6 tests to confirm the mode routing changes didn't break player mode. Approximately 5 minutes.

**Part B: New Feature Test** — Tests for spectator mode, replay timeline, AI deliberation in replay, chat in replay, and multi-spectator support. Approximately 15–20 minutes.

Execute Part A first. If any step fails, stop and fix before proceeding to Part B.

---

## 2. PART A: REGRESSION CHECK

### Prerequisites

- SpacetimeDB server is running.
- Frontend dev server is running.
- One browser tab open to `http://localhost:5173` (no URL parameters — player mode).
- Anthropic API key configured in `.env`.

---

### Step A1: Player Mode Loads Correctly

**Action:** Load the game with no URL parameters.

**Expected Result:** Map renders. Cards are draggable. Chat input is visible. No SpectatorOverlay. No ReplayControls. This is the standard player experience from Slice 6.

**If this fails:** The mode detection logic in `App.tsx` may be defaulting to the wrong mode. Check URL parameter parsing.

---

### Step A2: Core Actions Still Work

**Action:** Execute Military, Economic, and Covert actions.

**Expected Result:** All actions execute successfully. Action points decrement. Territory ownership changes. Ticker shows events.

**If this fails:** The conditional rendering may have accidentally disabled interactions in player mode. Check that mode-specific guards only apply in spectator and replay modes.

---

### Step A3: AI, Chat, and Strategist Still Work

**Action:** Wait for AI cycles. Observe chat messages. Watch for Strategist alerts.

**Expected Result:** AI opponents act. Chat messages appear from AIs. Strategist generates alerts. Intel panel shows deliberation chains.

**If this fails:** The mode routing may have broken subscription data flow. Check that subscriptions are active in player mode.

---

### Step A4: Slice 6 Hotkeys Still Work

**Action:** Press Ctrl+1/2/3/4 to switch chat tabs. Press T to focus chat input. Press WASD to move cursor.

**Expected Result:** All Slice 6 hotkeys function normally.

**If this fails:** The mode detection may have added conditional logic that interferes with the keydown handler. Check that hotkey handling is not gated by mode.

---

**All 4 regression steps pass?** Player mode is intact. Proceed to Part B.

---

## 3. PART B: NEW FEATURE TEST

### Prerequisites

- Part A complete and passing.
- Game is running in player mode in one tab.
- Have additional browser tabs ready for spectator testing.

---

### Step B1: Spectator Mode Renders

**Action:** Open a second browser tab to `http://localhost:5173/?spectator=true`.

**Expected Result:**
- Map renders with all four quadrants.
- Cards are visible but NOT draggable (cursor does not change to grab, cards don't move).
- Chat panel is visible but has NO input field or Send button.
- SpectatorOverlay panel is visible (right side or overlay) showing stats.
- Ticker is visible and scrolling.

**If spectator can drag cards:** Check `CardHand.tsx` — it should receive a `draggable` prop or check the mode. Verify `App.tsx` passes the correct mode.

**If chat input is visible:** Check `ChatPanel.tsx` — input visibility should be gated by `mode === 'player'`.

**If SpectatorOverlay not visible:** Check component import and conditional rendering in `App.tsx`.

---

### Step B2: Spectator Overlay Accuracy

**Action:** Compare the SpectatorOverlay stats to the player's game state.

**Expected Result:**
- Unified territory counts match what the player sees in their victory tracker.
- Dimension dominance percentages add up to approximately 100% per dimension.
- Trust scores appear as numbers or small bars for each AI relationship.
- Cultural hotspots list territories with the highest foreign influence.
- AI cycle status shows "idle" or "thinking..." for each AI. When an AI is mid-cycle, its status should show "thinking..." or "pending."
- Recent events match the last few lines in the player's ticker.

**If stats are wrong:** Check the data sources in `SpectatorOverlay.tsx`. Verify the subscription data is being passed correctly. In replay mode, check that time filtering is applied.

**If AI cycle status never shows "thinking":** The `ai_state` table may not be subscribed. Check `useSubscriptions.ts`.

---

### Step B3: Spectator Real-Time Updates

**Action:** In the player tab, execute a Military attack. Watch the spectator tab.

**Expected Result:** The spectator tab shows the territory color change within 1 second. The ticker updates. The SpectatorOverlay stats update (unified counts, dimension dominance, recent events).

**If spectator doesn't update:** Check that spectator subscriptions are connected to the same SpacetimeDB instance. Both tabs must use the same server URI.

---

### Step B4: Multi-Spectator Test

**Action:** Open three browser tabs, all with `?spectator=true`.

**Expected Result:** All three show identical map state, identical stats, and update simultaneously when the player acts.

**If tabs show different state:** Check that all tabs connect to the same SpacetimeDB instance. Check for client-side caching issues.

---

### Step B5: Game End and Replay Availability

**Action:** In the player tab, play until victory (or temporarily lower win threshold). Note that the game ends and victory screen appears.

**Expected Result:** Victory screen appears in player tab. Spectator tabs show the victory state. The `game_state` table now has `ended_at` set.

**Action:** Open a new tab to `http://localhost:5173/?replay=true`.

**Expected Result:** Replay mode loads. Timeline bar visible at the bottom. ReplayControls visible. Map shows the initial seed state (or the start of game state). No "Replay unavailable" message.

**If "Replay unavailable" appears:** Check that `game_state.status` is `'ended'` and `ended_at` key exists. Check the conditional in `App.tsx`.

---

### Step B6: Replay Timeline

**Action:** Observe the timeline bar at the bottom of the screen.

**Expected Result:**
- Timeline spans the full width of the screen.
- Time markers visible at 30-second intervals.
- Colored dots mark events along the timeline. Colors are distinct (red, gold, purple, blue, green, gold).
- Hovering a dot shows a tooltip with the event text.
- Clicking a dot moves the playhead to that position and updates the map.

**If timeline is empty:** Check `event_feed` data. Check that `started_at` and `ended_at` timestamps are valid. Check that events are sorted by timestamp.

**If dots are all one color:** Check the `event_type` field mapping to colors.

**If clicking a dot doesn't jump:** Check `onSeek` handler in `ReplayControls`. Check that `currentTimestamp` state updates in `App.tsx`.

---

### Step B7: AI Deliberation in Replay

**Action:** Scrub the playhead to a timestamp where you know an AI acted (look for military event markers). Open the intel panel.

**Expected Result:**
- Intel panel shows the AI's deliberation chain from the most recent cycle before that timestamp.
- The deliberation includes all subordinates and the commander.
- If you scrub to a point between cycles, it shows the last completed cycle.
- The deliberation chain matches what the AI actually did at that moment in the game.

**If intel shows current data instead of historical:** Check that `currentTimestamp` prop is passed to `IntelPanel`. Check the time filtering logic — it must query `ai_reasoning_log` with `cycle_at <= currentTimestamp`.

**If deliberation is empty:** The `ai_reasoning_log` may not have rows for that time period. Scrub to a later timestamp after the AI's first cycle completed.

---

### Step B8: Chat in Replay

**Action:** Scrub the playhead through the timeline. Watch the chat panel.

**Expected Result:**
- Chat messages appear chronologically as the playhead advances.
- Messages that were sent after the current timestamp are NOT visible.
- When you scrub backwards, later messages disappear.
- The chat panel shows the conversation as it unfolded.

**If all messages are visible regardless of timestamp:** Check that `currentTimestamp` prop is passed to `ChatPanel`. Check the filtering logic — `timestamp <= currentTimestamp`.

**If no messages appear:** Check that `chat_log` has data. Check that the time filter isn't excluding everything.

---

### Step B9: Playback Controls

**Action:** Press the Play button. Observe the playhead.

**Expected Result:**
- Playhead advances automatically along the timeline.
- Map updates as the playhead moves through events.
- Press Pause — playhead stops.
- Change speed to 2x — playhead moves twice as fast.
- Change speed to 4x — playhead moves four times as fast.
- Press "Jump to Start" — playhead moves to the beginning.
- Press "Jump to End" — playhead moves to the victory event.
- Current timestamp display updates in MM:SS format.

**If playback doesn't advance:** Check the `requestAnimationFrame` or `setInterval` logic in `App.tsx`. Check that `isPlaying` state triggers the animation loop.

**If speed changes don't work:** Check that `playbackSpeed` is multiplied correctly in the timestamp advancement calculation.

**If playhead can be dragged past the end:** Clamp the playhead position to `[started_at, ended_at]`.

---

### Step B10: Replay During Active Game

**Action:** Start a new game (or use one that hasn't ended). Open `?replay=true`.

**Expected Result:** A message appears: "Replay will be available after the game ends." No timeline. No replay controls. No map reconstruction.

**If replay loads anyway:** Check the conditional in `App.tsx` — `if (mode === 'replay' && gameState.status !== 'ended')`.

---

**All 10 feature test steps pass?** Slice 7 is validated. The game is demo-ready.

---

## 4. TRIAGE TABLE — SLICE 7 SPECIFIC

| Step | Symptom | Most Likely Cause | Check |
|------|---------|-------------------|-------|
| B1 | Spectator can drag cards | Mode not passed to CardHand | App.tsx — pass mode prop. CardHand — disable drag in non-player modes. |
| B1 | Chat input visible in spectator | Mode not passed to ChatPanel | ChatPanel — hide input when mode !== 'player'. |
| B1 | SpectatorOverlay missing | Component not rendered | App.tsx — conditional render for spectator and replay modes. |
| B2 | Stats show wrong numbers | Wrong data source or no time filter | SpectatorOverlay — verify subscription data. In replay, verify time filtering. |
| B2 | AI status never updates | ai_state not subscribed | useSubscriptions.ts — verify subscription. |
| B3 | Spectator doesn't update live | Different server instance or broken subscription | Check both tabs use same SpacetimeDB URI. |
| B5 | Replay shows "unavailable" after game ended | ended_at not set | Check dimension_owner_change for ended_at insertion. Check game_state table. |
| B6 | Timeline empty | event_feed has no data or timestamps invalid | Check event_feed table. Check started_at/ended_at values. |
| B6 | Event dots all one color | event_type mapping wrong | ReplayControls — check color map for each event_type. |
| B7 | Intel shows current data in replay | currentTimestamp not passed or not used | IntelPanel — verify prop received. Check time filtering query. |
| B8 | All chat messages visible in replay | currentTimestamp not filtering | ChatPanel — verify messages filtered by timestamp. |
| B9 | Playback doesn't advance | Animation loop not running | App.tsx — check isPlaying triggers setInterval or requestAnimationFrame. |
| B9 | Speed has no effect | playbackSpeed not applied | Check timestamp increment formula: delta * playbackSpeed. |
| B10 | Replay loads during active game | Conditional check missing | App.tsx — add check for gameState.status === 'ended'. |

---

## 5. POST-VALIDATION FIX PRIORITIES

### Priority 1: Showstopper Bugs

- Spectator mode breaks player mode (interactions disabled for the player).
- Replay mode crashes the application.
- Playback hangs or infinite loops.
- `App.tsx` mode routing prevents the game from loading in any mode.
- Multiple spectators see inconsistent state.

### Priority 2: Replay Accuracy

- AI deliberation appears at the correct timestamps. Not off by one cycle.
- Chat history aligns with events. Messages don't appear before they were sent.
- Trust scores in the spectator overlay reflect historical state during replay.
- Cultural hotspots are accurate at each timestamp.

### Priority 3: Spectator Overlay Accuracy

- Unified counts match the player's victory tracker exactly.
- Dimension dominance percentages are correct.
- AI cycle status updates in real time.
- Recent events match the ticker.

### Priority 4: Timeline UX

- Event markers are clearly visible and distinguishable by color.
- Hover tooltips appear quickly and show useful information.
- Playhead drags smoothly without lag.
- Speed controls feel responsive.
- Timestamp display is accurate.

### Priority 5: Visual Polish

- Timeline bar looks professional.
- Spectator overlay is readable and well-organized.
- Playback transitions are smooth (no flickering when scrubbing).
- Replay unavailable message is styled appropriately.

---

## 6. DEMO READINESS GATE

Before the game is shown to judges, all of the following must be true:

1. **All 4 regression steps pass** with no errors.
2. **All 10 feature test steps pass** with no workarounds.
3. **Spectator mode works in at least 3 simultaneous browser tabs.**
4. **Replay timeline shows all events from a completed game.**
5. **AI deliberation is visible and correct at multiple timestamps** (beginning, middle, end of game).
6. **Chat history is time-synced in replay** — messages appear chronologically.
7. **Playback controls work smoothly** — play, pause, speed change, jump to start/end.
8. **Spectator overlay shows accurate stats** in both live and replay modes.
9. **Replay shows unavailable message during active games.**
10. **Server compiles** with `cargo build` — zero errors.
11. **Client compiles** with `npm run build` — zero errors.
12. **No known showstopper bugs.**

If any condition is not met, fix it before the demo.

---

## 7. MANUAL ITERATION NOTES

- **Spectator load test:** Open 5+ spectator tabs. Verify all update simultaneously without lag. This demonstrates subscription scalability.
- **Replay accuracy deep test:** Play a short game (lower win threshold to 2). After victory, replay the entire game at 1x speed. Verify every event appears in order. Spot-check 3 timestamps for AI deliberation accuracy.
- **Timeline performance:** If the game has 200+ events, the timeline should still render smoothly. If dots overlap, consider clustering them at that zoom level.
- **Snapshot caching verification:** Open browser dev tools. Monitor memory usage during replay scrubbing. Snapshot cache should not grow unbounded.
- **Demo narrative for replay:** Prepare a specific timestamp to show judges. "Let me show you the exact moment Zhao decided to attack Brazil. Here's the deliberation chain. You can see Vanguard recommended it, Scout confirmed, and Zhao gave the order."

---

## 8. FINAL NOTE

This is the last implementation strategy document. Slice 7 is the final slice. After validation, Risk: Dominion is complete — and transparent.

The journey from Slice 1 to Slice 7:
- Slice 1: Two players, two dimensions, hex map, card-driven actions.
- Slice 2: AI opponents, Covert dimension, intel system.
- Slice 3: Cultural dimension, cross-dimension bonuses, four-dimension victory.
- Slice 4: Natural language queries, canned queries, autocomplete, event ticker.
- Slice 5: Multi-agent orchestration, human Strategist, full keyboard control.
- Slice 6: Global chat, direct messages, AI deception, trust scores, counter-intel.
- Slice 7: Spectator mode, replay system, complete transparency.

What began as a two-player board game is now a fully observable, reviewable, and provable demonstration of what SpacetimeDB makes possible: a real-time strategy game where the database is the battlefield, AI agents deliberate through councils of specialists, players query the battlefield in natural language, deception flows through private channels, and every thought is visible in replay.

Validate. Polish. Demo. Win.

---

## End of Slice 7 Implementation Strategy

This is the final validation document. After this, the game is ready for judges.