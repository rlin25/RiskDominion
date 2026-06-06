# RISK: DOMINION — SLICE 7 INTERFACE CONTRACT

## Version 1.0
## Scope: Spectator Mode, Replay System, Complete Transparency (Slice 7 of 7)
## Target: Claude Code Generation — Modifying the `risk-dominion/app/` Codebase
## Platform: SpacetimeDB 2.4.1

---

## 0. HOW TO READ THIS DOCUMENT

This document specifies every table modification, component, and URL routing pattern that is **new or modified** in Slice 7. It does not repeat Slice 1–6 specifications. The canonical code is the single evolving app at `risk-dominion/app/{server,client}` (at the `slice-6-complete` tag); modify it in place.

**All prior tables, reducers, subscriptions, and constants remain in effect unless this document explicitly modifies them.** If a component is not mentioned here, it is unchanged from Slice 6.

Slice 7 adds no new gameplay. It adds visibility — spectator mode for live observation and replay mode for post-game analysis.

---

## 1. MODIFIED SERVER BEHAVIOR

### 1.1 `dimension_owner_change` — Add `ended_at`

`dimension_owner_change` is a private Rust fn invoked inside the active reducer transaction (not a reducer itself). When the win check triggers (unified count >= 5, unified across all four dimensions), add one line using `ctx.timestamp`:

```rust
if unified >= WIN_UNIFIED_TERRITORIES {
    let winner_name = player_display_name(ctx, new_owner);
    set_game_value(ctx, "status", "ended");
    set_game_value(ctx, "winner", &winner_name);
    // NEW: timeline end bound for replay.
    set_game_value(ctx, "ended_at", &now_millis(ctx).to_string());
}
```

The `game_state` table is key-value (`pub key: String` primary key, `pub value: String`). No schema change. Just one new key-value pair written via the existing `set_game_value` helper, with the value being millis-since-epoch derived from `ctx.timestamp` (`now_millis` = `ctx.timestamp.to_micros_since_unix_epoch() / 1000`), matching how `started_at` is stored.

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

If `?replay=true` is accessed while the `game_state` `status` value is not `'ended'`, show a message: "Replay will be available after the game ends." Do not render replay controls. (`game_state` is key-value; read the status with `gameState.find((r) => r.key === 'status')?.value`.)

---

## 4. STATE RECONSTRUCTION FOR REPLAY

The replay reconstructs game state at any timestamp by starting from the initial seed state and applying events in order.

### 4.1 Data Sources

- **Initial state:** Same seed data as `start_game` (all four dimension tables, player data, game_state).
- **AI actions:** From the `ai_reasoning_log` rows (the `actionsTaken` JSON in TS bindings). These are exact — the replay can reproduce AI-caused state changes precisely.
- **Player actions:** From `event_feed` (subscribed via `useTable(tables.event_feed)`). Ownership changes are accurate (the event names the territory and dimension). Exact numerical values (troop counts, capital amounts) are approximated. This is a known limitation — player action logging at the same fidelity as AI logging is a future enhancement.
- **Cultural spread:** From `event_feed` cultural flip events. The replay knows when flips occurred.
- **Timeline events:** From `event_feed`, ordered by `timestamp`. Generated TS row/field names are camelCase (`eventType`, `eventText`, `playerId`, `territoryId`, `cycleAt`).

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
- Data: count `ownerId` per dimension table (camelCase TS field), divide by 12.

**Trust Score Summary:**
- Per AI (players 2, 3, 4): show trust scores for each other player.
- Display as small bar or number: "Zhao trusts Player: 45/100".
- Data: `aiTrust` filtered by `aiPlayerId`.

**Cultural Hotspots:**
- Top 3 territories by `influencePct` where `cultural.ownerId !== military.ownerId`.
- Display territory name, influence percentage, cultural owner.
- Data: `cultural` joined with `military`.

**AI Cycle Status:**
- Per AI: "idle" or "thinking..." (when `cycleStatus === 'pending'`).
- Data: `aiState`.

**Recent Events:**
- Last 3 events from `eventFeed`.
- Same format as EventTicker entries but static.

**Styling:** Semi-transparent dark background (`bg-surface` at 90% opacity). Sections separated by thin dividers. Headers in Orbitron, 11px, `text-accent`. Data in JetBrains Mono, 10px, `text-primary`. Compact layout to fit alongside the map.

**In replay mode:** All data filtered to `currentTimestamp`. Trust scores show the most recent `aiTrust` update before `currentTimestamp`. Cultural hotspots show the state at `currentTimestamp`. AI cycle status shows the state at `currentTimestamp`.

### 5.2 `ReplayControls.tsx` (NEW)

**Position:** Fixed bar at the bottom of the screen, replacing the card hand area. Height: 60px.

**Props:** `events: EventFeedRow[]`, `startedAt: number`, `endedAt: number`, `currentTimestamp: number`, `onSeek: (timestamp: number) => void`, `isPlaying: boolean`, `onPlayPause: () => void`, `speed: number`, `onSpeedChange: (speed: number) => void`.

**Timeline Bar:**
- Horizontal track spanning the full width. Height: 20px.
- Background: `bg-surface` (#1A1A2E). Border: 1px `#334455`. Border-radius: 4px.
- Time markers: small ticks at 30-second intervals with labels in JetBrains Mono, 8px, `text-secondary`.
- Event markers: small colored dots (6px diameter) positioned along the timeline at each event's timestamp.
  - Colors by `eventType` (camelCase TS field): military=#FF6666, economic=#FFCC44, cultural=#44DDAA, covert=#AA44FF, chat=#44CC66, victory/system=#FFD700.
  - Hovering a dot: show tooltip with `eventText` in JetBrains Mono, 10px, on a dark background.
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
- `game_state` is key-value; read values from the `gameState` rows returned by `useTable(tables.game_state)`, e.g. `gameState.find((r) => r.key === 'status')?.value`. The `started_at`/`ended_at` values are millis-since-epoch strings; parse with `Number(...)`.
- Verify the `status` value is `'ended'`. If not, set `replayUnavailable = true`.
- Set `currentTimestamp` to the parsed `started_at`.
- Build initial snapshot cache from seed data at `started_at`.

**Conditional rendering:**
- **Player mode:** Existing behavior. All interactions enabled.
- **Spectator mode:** CardHand renders cards as non-draggable (visual only). ChatPanel hides input. SpectatorOverlay visible. All subscriptions active.
- **Replay mode:** CardHand hidden. ChatPanel hides input, receives `currentTimestamp`. IntelPanel receives `currentTimestamp`. ReplayControls visible. SpectatorOverlay visible with `currentTimestamp`. Map renders reconstructed state at `currentTimestamp`. EventTicker hidden or shows events up to `currentTimestamp`.

**Replay unavailable state:**
```typescript
const status = gameState.find((r) => r.key === 'status')?.value ?? 'active';
if (mode === 'replay' && status !== 'ended') {
  return <div>Replay will be available after the game ends.</div>;
}
```

### 6.2 `IntelPanel.tsx` (MODIFIED)

**New optional prop:** `currentTimestamp: number | null`. Default `null`.

**When `currentTimestamp` is provided (replay mode):**
- Filter the `ai_reasoning_log` rows (camelCase TS fields) for `cycleAt <= currentTimestamp`, grouped by `aiPlayerId` and `cycleAt`.
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

### 6.4 `useSubscriptions.ts` (UNCHANGED)

No changes needed. Spectator mode uses the same subscriptions as player mode. Replay mode uses subscription data captured at load time. The hook already exposes the tables Slice 7 reads (`military`, `economic`, `cultural`, `covert`, `players`, `game_state`, `event_feed`, `ai_reasoning_log`, `ai_state`, `ai_trust`, `chat_log`) via `useTable(tables.x)` from the `spacetimedb/react` package.

---

## 7. IMPLEMENTATION NOTES FOR CLAUDE CODE

### 7.1 Server

- Modify `dimension_owner_change` (a private fn in the reducer tx): add `set_game_value(ctx, "ended_at", &now_millis(ctx).to_string())` when the game ends, using `ctx.timestamp`.
- No other server changes. No new reducers, procedures, or tables.

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

Modify the `risk-dominion/app/` codebase (at `slice-6-complete`) as specified. Output every new and modified file. Indicate NEW or MODIFIED at the top of each file.