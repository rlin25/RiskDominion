# RISK: DOMINION — SLICE 7 MASTERPLAN

## Version 1.0
## Scope: Spectator Mode, Replay System, Complete Transparency — Final Slice
## Target: Claude Code Generation — Modifying the Slice 6 Codebase

---

## 0. DOCUMENT PURPOSE

This document specifies how to modify the working Slice 6 codebase to add spectator mode and the replay system. Read this document in full. Read the existing Slice 6 codebase. Apply the changes specified here.

Do not regenerate Slice 6. Do not create a new project. Modify the existing files in place. Mark each output file as MODIFIED or NEW.

This is the final slice. After this, Risk: Dominion is complete.

---

## 1. BEFORE YOU BEGIN

Read every existing file in the Slice 6 codebase:
- `slice-1/server/Cargo.toml`
- `slice-1/server/src/lib.rs`
- `slice-1/client/src/App.tsx`
- `slice-1/client/src/constants.ts`
- `slice-1/client/src/types.ts`
- `slice-1/client/src/hooks/useSubscriptions.ts`
- `slice-1/client/src/utils/territoryHelpers.ts`
- `slice-1/client/src/components/Map.tsx`
- `slice-1/client/src/components/Territory.tsx`
- `slice-1/client/src/components/CardHand.tsx`
- `slice-1/client/src/components/ActionCard.tsx`
- `slice-1/client/src/components/IntelPanel.tsx`
- `slice-1/client/src/components/QueryBar.tsx`
- `slice-1/client/src/components/ResultsPanel.tsx`
- `slice-1/client/src/components/EventTicker.tsx`
- `slice-1/client/src/components/StrategistAlerts.tsx`
- `slice-1/client/src/components/ChatPanel.tsx`
- `slice-1/client/src/components/ActionBar.tsx`
- `slice-1/client/src/components/VictoryScreen.tsx`

Understand the current code before making any changes. Then apply the modifications in this document in the order specified.

---

## 2. FILE LIST

Output each file in the order specified in Section 3. Mark every file as MODIFIED or NEW.

**MODIFIED:**
1. `server/src/lib.rs`
2. `client/src/components/IntelPanel.tsx`
3. `client/src/components/ChatPanel.tsx`
4. `client/src/App.tsx`

**NEW:**
5. `client/src/utils/replayEngine.ts`
6. `client/src/components/SpectatorOverlay.tsx`
7. `client/src/components/ReplayControls.tsx`

---

## 3. GENERATION ORDER

Generate changes in this sequence. Each file must only reference types and components that already exist in the Slice 6 codebase or were generated earlier in this sequence.

1. `server/src/lib.rs` (MODIFIED)
2. `client/src/utils/replayEngine.ts` (NEW)
3. `client/src/components/SpectatorOverlay.tsx` (NEW)
4. `client/src/components/ReplayControls.tsx` (NEW)
5. `client/src/components/IntelPanel.tsx` (MODIFIED)
6. `client/src/components/ChatPanel.tsx` (MODIFIED)
7. `client/src/App.tsx` (MODIFIED)

---

## 4. SERVER MODIFICATIONS

### 4.1 `dimension_owner_change` — Add `ended_at`

In the win condition block (where `unified_count >= WIN_UNIFIED_TERRITORIES`), add one line after setting `status` and `winner`:

```rust
// Existing:
game_state set key='status' to 'ended'
game_state set key='winner' to player_name

// NEW:
game_state set key='ended_at' to current_timestamp_ms
```

Use the same timestamp function used elsewhere in the server. No other server changes.

---

## 5. NEW CLIENT UTILITY

### 5.1 `replayEngine.ts` (NEW)

This module handles state reconstruction for the replay system.

**Exports:**

```typescript
interface ReplaySnapshot {
  military: MilitaryRow[];
  economic: EconomicRow[];
  cultural: CulturalRow[];
  covert: CovertRow[];
  players: PlayerRow[];
  unifiedCounts: Record<number, number>;
}

function createInitialSnapshot(seedData: SeedData): ReplaySnapshot
function reconstructState(
  targetTimestamp: number,
  snapshots: Map<number, ReplaySnapshot>,
  events: EventFeedRow[],
  aiActions: AIReasoningLogRow[],
  seedData: SeedData
): ReplaySnapshot
function buildSnapshot(state: ReplaySnapshot, timestamp: number): void
```

**`createInitialSnapshot`:**
- Takes the seed data (same structure as `start_game` inserts).
- Returns a `ReplaySnapshot` representing the game at time 0.

**`reconstructState`:**
1. Find the nearest snapshot in `snapshots` with timestamp <= `targetTimestamp`.
2. Clone that snapshot as the starting state.
3. Collect all events with `timestamp > snapshotTime && timestamp <= targetTimestamp`, sorted by timestamp.
4. For each event:
   - Apply AI actions from `aiActions` where `cycle_at` falls in this time window. Use `actions_taken` JSON to update the reconstructed dimension tables.
   - Apply player actions from `events`. Ownership changes are extracted from event text and `territory_id`/`player_id` fields. Numerical values are approximated (troop counts reset to defaults on ownership change, capital incremented by approximate amounts).
   - Apply cultural flips from events with `event_type === 'cultural'`.
5. Recalculate `unifiedCounts` from the reconstructed dimension tables.
6. Return the reconstructed state.

**`buildSnapshot`:**
- Called every 30 seconds of game time during replay.
- Stores the current reconstructed state in the `snapshots` Map keyed by timestamp.
- The Map is passed by reference and mutated in place.

**Approximation note:** Player-caused numerical changes (exact troop counts, capital values) are approximated because `event_feed` stores narrative text, not numerical deltas. AI-caused changes are exact from `ai_reasoning_log.actions_taken`. This is an acceptable tradeoff. Full player action logging is a future enhancement.

---

## 6. NEW COMPONENTS

### 6.1 `SpectatorOverlay.tsx` (NEW)

**Position:** Right side of the screen. Visible in `mode === 'spectator'` and `mode === 'replay'`. Hidden in `mode === 'player'`.

**Props:**
```typescript
interface SpectatorOverlayProps {
  military: MilitaryRow[];
  economic: EconomicRow[];
  cultural: CulturalRow[];
  covert: CovertRow[];
  players: PlayerRow[];
  aiState: AIStateRow[];
  aiTrust: AiTrustRow[];
  eventFeed: EventFeedRow[];
  currentTimestamp: number | null;
}
```

**Sections (rendered vertically, separated by thin dividers):**

**Unified Territory Count:**
- Header: "UNIFIED TERRITORIES" in Orbitron, 11px, `text-accent`.
- Per player: colored dot + player name + count + territory names.
- Data: `countUnifiedTerritories(military, economic, cultural, covert, playerId)`.

**Dimension Dominance:**
- Header: "DIMENSION CONTROL" in Orbitron, 11px, `text-accent`.
- Per dimension: dimension name + horizontal bar showing each player's percentage.
- Bar segments colored by player color, widths proportional to `(count / 12) * 100`.
- Data: count `owner_id` per dimension table.

**Trust Score Summary:**
- Header: "TRUST SCORES" in Orbitron, 11px, `text-accent`.
- Per AI (players 2, 3, 4): AI name + for each other player, show trust score as a small bar (0-100).
- Data: `aiTrust` filtered by `ai_player_id`.

**Cultural Hotspots:**
- Header: "CULTURAL HOTSPOTS" in Orbitron, 11px, `text-accent`.
- Top 3 territories by `influence_pct` where `cultural.owner_id !== military.owner_id`.
- Each: territory name, influence %, cultural owner name.
- Data: `cultural` joined with `military`.

**AI Cycle Status:**
- Header: "AI STATUS" in Orbitron, 11px, `text-accent`.
- Per AI: name + status ("idle" or "thinking..." when `cycle_status === 'pending'`).
- Data: `aiState`.

**Recent Events:**
- Header: "RECENT EVENTS" in Orbitron, 11px, `text-accent`.
- Last 3 events from `eventFeed`, same format as ticker entries but static.
- If `currentTimestamp` is set, events filtered to `timestamp <= currentTimestamp`.

**Styling:** Semi-transparent background (`bg-surface` at 90% opacity). Width: 240px. Padding: 12px. Fonts: headers in Orbitron, data in JetBrains Mono. All colors from AESTHETIC.md. Scrollable if content exceeds viewport height.

### 6.2 `ReplayControls.tsx` (NEW)

**Position:** Fixed bar at the bottom of the screen, replacing the card hand area. Height: 60px. Visible only in `mode === 'replay'`.

**Props:**
```typescript
interface ReplayControlsProps {
  events: EventFeedRow[];
  startedAt: number;
  endedAt: number;
  currentTimestamp: number;
  onSeek: (timestamp: number) => void;
  isPlaying: boolean;
  onPlayPause: () => void;
  speed: number;
  onSpeedChange: (speed: number) => void;
}
```

**Timeline Bar (upper portion, 20px height):**
- Full width horizontal track. Background: `bg-surface`. Border: 1px `#334455`. Border-radius: 4px.
- Time markers: small ticks every 30 seconds. Labels in JetBrains Mono, 8px, `text-secondary`.
- Event markers: small circles (6px diameter) at each event's timestamp position. Position calculated as `((event.timestamp - startedAt) / (endedAt - startedAt)) * 100` percent from left.
  - Colors by event_type: military=#FF6666, economic=#FFCC44, cultural=#44DDAA, covert=#AA44FF, chat=#44CC66, victory/system=#FFD700.
  - Hover: tooltip showing `event_text` in JetBrains Mono, 10px, dark background.
  - Click: calls `onSeek(event.timestamp)`.
- Playhead: vertical white line (2px) with a small triangle handle at top (8px). Position calculated same as event markers. Draggable — on mousedown, track mouse movement, calculate timestamp from position, call `onSeek`.

**Controls (lower portion, 40px height):**
- Centered row of controls, 12px gap.
- Jump to Start button: "⏮" text, Orbitron 14px, `text-secondary`. Hover: `text-primary`. Calls `onSeek(startedAt)`.
- Play/Pause button: "▶" when paused, "⏸" when playing. Orbitron 16px, `text-primary`.
- Speed buttons: "1x", "2x", "4x" as small pills. Active speed in `text-accent` (#FFD700), others in `text-secondary`. Calls `onSpeedChange`.
- Jump to End button: "⏭" text. Calls `onSeek(endedAt)`.
- Current timestamp display: `MM:SS` format in JetBrains Mono, 12px, `text-primary`. Right-aligned.

---

## 7. MODIFIED COMPONENTS

### 7.1 `IntelPanel.tsx` (MODIFIED)

**New optional prop:** `currentTimestamp: number | null`. Default `null`.

**When `currentTimestamp` is provided (replay mode):**
- Query `ai_reasoning_log` for rows with `cycle_at <= currentTimestamp`, grouped by `ai_player_id` and `cycle_at`.
- For each AI button, when clicked, show the most recent complete cycle before `currentTimestamp`.
- If `currentTimestamp` falls between cycles, show the last completed cycle.
- The deliberation chain display rendering is unchanged.

**When `currentTimestamp` is null (player/spectator mode):**
- Existing behavior unchanged. Query the most recent cycle.

### 7.2 `ChatPanel.tsx` (MODIFIED)

**New optional prop:** `currentTimestamp: number | null`. Default `null`.

**New prop:** `mode: 'player' | 'spectator' | 'replay'`. Default `'player'`.

**When `currentTimestamp` is provided (replay mode):**
- Filter messages: `messages.filter(m => m.timestamp <= currentTimestamp)`.
- As `currentTimestamp` advances, messages appear chronologically.

**Input visibility:**
- `mode === 'player'`: Show text input and Send button.
- `mode !== 'player'`: Hide text input and Send button. The message area is read-only.

**All other rendering (tabs, message styling, territory links) unchanged.**

### 7.3 `App.tsx` (MODIFIED)

**Mode detection (at top of component):**
```typescript
const params = new URLSearchParams(window.location.search);
const isSpectator = params.get('spectator') === 'true';
const isReplay = params.get('replay') === 'true';
const mode: 'player' | 'spectator' | 'replay' = 
  isReplay ? 'replay' : isSpectator ? 'spectator' : 'player';
```

**New state (only used in replay mode):**
```typescript
const [currentTimestamp, setCurrentTimestamp] = useState<number>(0);
const [isPlaying, setIsPlaying] = useState(false);
const [playbackSpeed, setPlaybackSpeed] = useState(1);
const [replaySnapshots] = useState<Map<number, ReplaySnapshot>>(new Map());
const [replayState, setReplayState] = useState<ReplaySnapshot | null>(null);
```

**Replay initialization (useEffect, runs once when mode === 'replay'):**
- Read `startedAt` and `endedAt` from `gameState`.
- If `gameState.status !== 'ended'`: set a flag `replayUnavailable = true`.
- If ended: build initial snapshot from seed data at `startedAt`. Set `currentTimestamp = startedAt`. Build initial replay state.

**Replay unavailable render:**
```typescript
if (mode === 'replay' && replayUnavailable) {
  return (
    <div className="flex items-center justify-center h-screen bg-bg-root">
      <p className="font-ui text-text-primary text-lg">
        Replay will be available after the game ends.
      </p>
    </div>
  );
}
```

**Playback animation loop (useEffect, depends on isPlaying):**
```typescript
useEffect(() => {
  if (!isPlaying || mode !== 'replay') return;
  
  let lastFrame = performance.now();
  const animate = (now: number) => {
    const delta = (now - lastFrame) * playbackSpeed;
    lastFrame = now;
    setCurrentTimestamp(prev => {
      const next = prev + delta;
      if (next >= endedAt) {
        setIsPlaying(false);
        return endedAt;
      }
      return next;
    });
    animationRef.current = requestAnimationFrame(animate);
  };
  animationRef.current = requestAnimationFrame(animate);
  return () => {
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
  };
}, [isPlaying, playbackSpeed]);
```

**Replay state update (useEffect, depends on currentTimestamp):**
- When `currentTimestamp` changes in replay mode, call `reconstructState(currentTimestamp, replaySnapshots, eventFeed, aiReasoningLog, seedData)`.
- Every 30 seconds of game time, call `buildSnapshot(replayState, currentTimestamp)` to cache.
- Set `replayState` to the result.

**Conditional rendering by mode:**

*Player mode:* Existing behavior. All interactions enabled. No overlay panels.

*Spectator mode:*
- CardHand: pass `draggable={false}`. Cards render visually but are not interactive.
- ChatPanel: pass `mode="spectator"`. Input hidden.
- SpectatorOverlay: rendered. `currentTimestamp={null}`.
- All subscriptions active.
- No reducer calls allowed from UI interactions.

*Replay mode:*
- CardHand: hidden (not rendered).
- ChatPanel: pass `mode="replay"` and `currentTimestamp`. Input hidden.
- IntelPanel: pass `currentTimestamp`.
- SpectatorOverlay: rendered with `currentTimestamp`.
- ReplayControls: rendered with all props.
- Map: receives reconstructed state from `replayState` instead of live subscription data.
- EventTicker: hidden or shows events up to `currentTimestamp`.
- QueryBar: hidden (no queries during replay).
- StrategistAlerts: hidden (alerts are for live play).

**Pass mode to components that need it:**
- `CardHand`: `interactive={mode === 'player'}`
- `ChatPanel`: `mode={mode}`, `currentTimestamp={mode === 'replay' ? currentTimestamp : null}`
- `IntelPanel`: `currentTimestamp={mode === 'replay' ? currentTimestamp : null}`

---

## 8. GENERATION RULES

1. **Modify existing files in place.** Read each file before modifying. Preserve all Slice 6 functionality not explicitly changed.
2. **Mark every output file** as MODIFIED or NEW at the top.
3. **All arithmetic is integer arithmetic.** No floats in Rust.
4. **SpacetimeDB macros:** `#[spacetimedb(table)]`, `#[spacetimedb(reducer)]`, `#[spacetimedb(scheduled)]`.
5. **Tailwind CSS for all styling.** Use design tokens from `../AESTHETIC.md`.
6. **No emojis. No em dashes. No custom CSS files.**
7. **Replay state reconstruction is client-side only.** No new server endpoints.
8. **Player action numerical values are approximated** in replay. Acknowledge this in code comments.
9. **This is the final slice.** Generate everything specified. No placeholders.

---

## 9. WHAT NOT TO GENERATE

Generate everything specified. Do not add:
- New dimensions
- New AI opponents
- New card types
- New gameplay mechanics
- New server endpoints beyond the `ended_at` insertion

---

## 10. SUCCESS CRITERIA

After applying all modifications, the Slice 7 application must:

1. **Compile** — `cargo build` for server, `npm run build` for client. Zero errors.
2. **Spectator mode** — `?spectator=true` shows read-only view. SpectatorOverlay visible with accurate stats. Cards not draggable. Chat input hidden.
3. **Multiple spectators** — Three `?spectator=true` tabs show identical live state.
4. **Replay mode** — After game ends, `?replay=true` shows timeline with colored event markers. Playhead draggable. Play/pause/speed controls work.
5. **Replay unavailable** — `?replay=true` during active game shows the unavailable message.
6. **AI deliberation in replay** — Intel panel shows historical deliberation chain at scrubbed timestamp.
7. **Chat in replay** — Chat messages appear chronologically as playhead advances.
8. **Playback** — Play button advances playhead. Pause stops. Speed changes work. Jump buttons work.
9. **All Slice 6 functionality preserved** — Player mode unchanged.

---

## End of Slice 7 Masterplan

Read the existing Slice 6 codebase. Apply every modification specified above in the order specified. Output every changed file with MODIFIED or NEW at the top. This is the final slice. After generation, Risk: Dominion is complete. Generate now.