# RISK: DOMINION — SLICE 7 INTERFACE CONTRACT

## Version 1.0
## Scope: Spectator Mode, Replay System, Complete Transparency
## Target: Claude Code Generation — Modifying the Slice 6 Codebase

---

## 0. HOW TO READ THIS DOCUMENT

This document specifies every table modification, component, and URL routing pattern that is **new or modified** in Slice 7. It does not repeat Slice 1–6 specifications.

**All prior tables, reducers, subscriptions, and constants remain in effect unless this document explicitly modifies them.** If a component is not mentioned here, it is unchanged from Slice 6.

Slice 7 adds no new gameplay. It adds visibility — spectator mode for live observation and replay mode for post-game analysis.

---

## 1. MODIFIED SERVER BEHAVIOR

### 1.1 `dimension_owner_change` — Add `ended_at`

When the win check triggers (unified count >= 5), add one line:

```rust
// Existing:
game_state set key='status' to 'ended'
game_state set key='winner' to player_name

// NEW:
game_state set key='ended_at' to current_timestamp_ms
```

The `game_state` table is key-value. No schema change. Just one new row inserted.

---

## 2. NO NEW REDUCERS

Spectator mode uses existing subscriptions. Replay mode reconstructs state client-side from existing data. No new server endpoints are needed.

---

## 3. URL PARAMETER ROUTING

`App.tsx` reads these URL parameters on mount:

| URL | Mode | Behavior |
|-----|------|----------|
| (no parameter) | Player | Full interactivity. Cards draggable. Chat input visible. |
| `?spectator=true` | Spectator | Read-only. No card dragging. No chat input. Stats overlay visible. |
| `?replay=true` | Replay | Read-only. Timeline visible. No chat input. Requires game to have ended. |

If `?replay=true` is accessed while `game_state.status !== 'ended'`, show a message: "Replay will be available after the game ends." Do not render replay controls.

---

## 4. STATE RECONSTRUCTION FOR REPLAY

The replay reconstructs game state at any timestamp by starting from the initial seed state and applying events in order.

### 4.1 Data Sources

- **Initial state:** Same seed data as `start_game` (all four dimension tables, player data, game_state).
- **AI actions:** From `ai_reasoning_log.actions_taken` JSON. These are exact — the replay can reproduce AI-caused state changes precisely.
- **Player actions:** From `event_feed`. Ownership changes are accurate (the event names the territory and dimension). Exact numerical values (troop counts, capital amounts) are approximated. This is a known limitation — player action logging at the same fidelity as AI logging is a future enhancement.
- **Cultural spread:** From `event_feed` cultural flip events. The replay knows when flips occurred.
- **Timeline events:** From `event_feed`, ordered by `timestamp`.

### 4.2 Snapshot Caching

- Take snapshots of the reconstructed state every 30 seconds of game time.
- A snapshot is a compressed representation of all four dimension tables, player action points, and unified counts.
- Store snapshots in a Map keyed by timestamp.
- When scrubbing to time T: find the nearest snapshot before T, then apply events from that snapshot time to T.
- Build snapshots lazily (on first scrub) or pre-compute on replay load.

### 4.3 Reconstruction Algorithm

```
function reconstructState(targetTimestamp):
    snapshot = findNearestSnapshot(targetTimestamp)
    state = clone(snapshot)
    events = eventsBetween(snapshot.time, targetTimestamp)
    for event in events:
        applyEvent(state, event)
    return state
```

---

## 5. NEW COMPONENTS

### 5.1 `SpectatorOverlay.tsx` (NEW)

**Position:** Right side of the screen, or collapsible panel. Visible in spectator mode and replay mode. Hidden in player mode.

**Props:** `military: MilitaryRow[]`, `economic: EconomicRow[]`, `cultural: CulturalRow[]`, `covert: CovertRow[]`, `players: PlayerRow[]`, `aiState: AIStateRow[]`, `aiTrust: AiTrustRow[]`, `eventFeed: EventFeedRow[]`, `currentTimestamp: number | null` (null in live spectator mode, set in replay mode).

**Sections:**

**Unified Territory Count:**
- Per player: player name (color-coded), unified count, territory names.
- Data: `countUnifiedTerritories(military, economic, cultural, covert, playerId)`.

**Dimension Dominance:**
- Per dimension: percentage each player controls.
- Display as horizontal bar chart or percentage numbers.
- Data: count `owner_id` per dimension table, divide by 12.

**Trust Score Summary:**
- Per AI (players 2, 3, 4): show trust scores for each other player.
- Display as small bar or number: "Zhao trusts Player: 45/100".
- Data: `aiTrust` filtered by `ai_player_id`.

**Cultural Hotspots:**
- Top 3 territories by `influence_pct` where `cultural.owner_id !== military.owner_id`.
- Display territory name, influence percentage, cultural owner.
- Data: `cultural` joined with `military`.

**AI Cycle Status:**
- Per AI: "idle" or "thinking..." (when `cycle_status === 'pending'`).
- Data: `aiState`.

**Recent Events:**
- Last 3 events from `eventFeed`.
- Same format as EventTicker entries but static.

**Styling:** Semi-transparent dark background (`bg-surface` at 90% opacity). Sections separated by thin dividers. Headers in Orbitron, 11px, `text-accent`. Data in JetBrains Mono, 10px, `text-primary`. Compact layout to fit alongside the map.

**In replay mode:** All data filtered to `currentTimestamp`. Trust scores show the most recent `ai_trust` update before `currentTimestamp`. Cultural hotspots show the state at `currentTimestamp`. AI cycle status shows the state at `currentTimestamp`.

### 5.2 `ReplayControls.tsx` (NEW)

**Position:** Fixed bar at the bottom of the screen, replacing the card hand area. Height: 60px.

**Props:** `events: EventFeedRow[]`, `startedAt: number`, `endedAt: number`, `currentTimestamp: number`, `onSeek: (timestamp: number) => void`, `isPlaying: boolean`, `onPlayPause: () => void`, `speed: number`, `onSpeedChange: (speed: number) => void`.

**Timeline Bar:**
- Horizontal track spanning the full width. Height: 20px.
- Background: `bg-surface` (#1A1A2E). Border: 1px `#334455`. Border-radius: 4px.
- Time markers: small ticks at 30-second intervals with labels in JetBrains Mono, 8px, `text-secondary`.
- Event markers: small colored dots (6px diameter) positioned along the timeline at each event's timestamp.
  - Colors: military=#FF6666, economic=#FFCC44, cultural=#44DDAA, covert=#AA44FF, chat=#44CC66, victory/system=#FFD700.
  - Hovering a dot: show tooltip with `event_text` in JetBrains Mono, 10px, on a dark background.
  - Clicking a dot: calls `onSeek(event.timestamp)`.
- Playhead: a vertical white line (2px) with a triangle handle at the top. Positioned at `currentTimestamp` proportional to the timeline width. Draggable — on drag, calls `onSeek` with the calculated timestamp.

**Controls (below the timeline):**
- Play/Pause button: "▶" or "⏸" in Orbitron, 14px. Calls `onPlayPause`.
- Speed selector: three buttons — "1x", "2x", "4x". Active speed highlighted in `text-accent`. Calls `onSpeedChange`.
- Current timestamp: `MM:SS` format in JetBrains Mono, 12px, `text-primary`.
- Jump to Start: "⏮" button. Calls `onSeek(startedAt)`.
- Jump to End: "⏭" button. Calls `onSeek(endedAt)`.

**Playback logic (in App.tsx, not in this component):**
- When `isPlaying` is true, use `requestAnimationFrame` or `setInterval` to advance `currentTimestamp` by the speed multiplier.
- At 1x speed: advance by the actual elapsed time. At 2x: advance twice as fast.
- Stop playback when `currentTimestamp >= endedAt`.

---

## 6. MODIFIED COMPONENTS

### 6.1 `App.tsx` (MODIFIED)

**Mode detection:**
```typescript
const params = new URLSearchParams(window.location.search);
const isSpectator = params.get('spectator') === 'true';
const isReplay = params.get('replay') === 'true';
const mode: 'player' | 'spectator' | 'replay' = isReplay ? 'replay' : isSpectator ? 'spectator' : 'player';
```

**Replay state (only used in replay mode):**
```typescript
const [currentTimestamp, setCurrentTimestamp] = useState<number>(0);
const [isPlaying, setIsPlaying] = useState(false);
const [playbackSpeed, setPlaybackSpeed] = useState(1);
const [replaySnapshotCache] = useState<Map<number, ReplaySnapshot>>(new Map());
```

**Replay initialization (on mount, if mode === 'replay'):**
- Verify `gameState.status === 'ended'`. If not, set `replayUnavailable = true`.
- Set `currentTimestamp = gameState.started_at`.
- Build initial snapshot cache from seed data at `started_at`.

**Conditional rendering:**
- **Player mode:** Existing behavior. All interactions enabled.
- **Spectator mode:** CardHand renders cards as non-draggable (visual only). ChatPanel hides input. SpectatorOverlay visible. All subscriptions active.
- **Replay mode:** CardHand hidden. ChatPanel hides input, receives `currentTimestamp`. IntelPanel receives `currentTimestamp`. ReplayControls visible. SpectatorOverlay visible with `currentTimestamp`. Map renders reconstructed state at `currentTimestamp`. EventTicker hidden or shows events up to `currentTimestamp`.

**Replay unavailable state:**
```typescript
if (mode === 'replay' && gameState.status !== 'ended') {
  return <div>Replay will be available after the game ends.</div>;
}
```

### 6.2 `IntelPanel.tsx` (MODIFIED)

**New optional prop:** `currentTimestamp: number | null`. Default `null`.

**When `currentTimestamp` is provided (replay mode):**
- Query `ai_reasoning_log` for rows with `cycle_at <= currentTimestamp`, grouped by `ai_player_id` and `cycle_at`.
- For each AI, show the most recent complete cycle before `currentTimestamp`.
- If `currentTimestamp` falls between cycles, show the last completed cycle.
- The deliberation chain display is unchanged — it renders whatever data is passed to it.

**When `currentTimestamp` is null (player/spectator mode):**
- Existing behavior. Query the most recent cycle as before.

### 6.3 `ChatPanel.tsx` (MODIFIED)

**New optional prop:** `currentTimestamp: number | null`. Default `null`.

**New prop:** `mode: 'player' | 'spectator' | 'replay'`. Default `'player'`.

**When `currentTimestamp` is provided (replay mode):**
- Filter messages to those with `timestamp <= currentTimestamp`.
- As playback advances, messages appear chronologically.

**Input visibility:**
- `mode === 'player'`: Show input field and Send button.
- `mode === 'spectator'` or `mode === 'replay'`: Hide input field and Send button.

### 6.4 `useSubscriptions.ts` (MODIFIED)

No changes needed. Spectator mode uses the same subscriptions as player mode. Replay mode uses subscription data captured at load time.

---

## 7. IMPLEMENTATION NOTES FOR CLAUDE CODE

### 7.1 Server

- Modify `dimension_owner_change`: add `game_state` insert for `key='ended_at'` when the game ends.
- No other server changes.

### 7.2 Client

- Add `SpectatorOverlay.tsx` and `ReplayControls.tsx` as NEW.
- Modify `App.tsx`: URL parameter parsing, mode state, conditional rendering, replay state management, playback logic.
- Modify `IntelPanel.tsx`: optional `currentTimestamp` prop with time-aware filtering.
- Modify `ChatPanel.tsx`: optional `currentTimestamp` prop, mode-based input visibility.
- The replay reconstruction logic can be in a new utility file `replayEngine.ts` or inline in `App.tsx`. It should export `reconstructState(timestamp, seedState, events, snapshots)` and `buildSnapshot(state, timestamp)`.

### 7.3 Styling

- All new components use Tailwind CSS with design tokens from `../AESTHETIC.md`.
- SpectatorOverlay uses a semi-transparent dark panel.
- ReplayControls uses the dark surface background with colored event dots.
- No emojis. No em dashes. No custom CSS files.

---

## 8. WHAT NOT TO GENERATE

Generate everything specified. Do not add:
- New dimensions
- New AI opponents
- New card types
- New gameplay mechanics
- New server endpoints beyond the `ended_at` insertion

---

## 9. SUCCESS CRITERIA

After applying all modifications, the Slice 7 application must:

1. **Compile** — `cargo build` for server, `npm run build` for client. Zero errors.
2. **Spectator mode** — Opening `?spectator=true` shows a read-only view. Cards not draggable. Chat input hidden. SpectatorOverlay visible with correct stats.
3. **Multiple spectators** — Two browser tabs with `?spectator=true` both show live updates.
4. **Replay mode** — After game ends, opening `?replay=true` shows the timeline with event markers. Playhead is draggable. Play/pause and speed controls work.
5. **Replay unavailable** — Opening `?replay=true` during active game shows the unavailable message.
6. **AI deliberation in replay** — Scrubbing to a timestamp shows the AI's deliberation chain from that moment.
7. **Chat in replay** — Chat history is time-filtered and appears chronologically during playback.
8. **Spectator stats** — Overlay shows accurate unified counts, dimension dominance, trust scores, cultural hotspots, and AI cycle status.
9. **All Slice 6 functionality preserved** — Gameplay, chat, deception, trust system unchanged.

---

## End of Slice 7 Interface Contract

Modify the Slice 6 codebase as specified. Output every new and modified file. Indicate NEW or MODIFIED at the top of each file.