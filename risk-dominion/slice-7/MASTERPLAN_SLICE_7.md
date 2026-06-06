# RISK: DOMINION — SLICE 7 MASTERPLAN

## Version 1.0
## Scope: Spectator Mode, Replay System, Complete Transparency — Final Slice
## Target: Claude Code Generation — Modifying the `risk-dominion/app/` Codebase (Slice 7 of 7)
## Platform: SpacetimeDB 2.4.1

---

## 0. DOCUMENT PURPOSE

This document specifies how to modify the existing `risk-dominion/app/` codebase (the single evolving app, at the `slice-6-complete` tag) to add spectator mode and the replay system. Read this document in full. Read the existing codebase. Apply the changes specified here, in place.

Do not create a new project or a per-slice copy. The canonical code is one app at `risk-dominion/app/{server,client}` that grows each slice; each completed slice is tagged `slice-N-complete` in git. Modify the existing files in place. Mark each output file as MODIFIED or NEW.

This is Slice 7 of 7 and the final slice. After this, Risk: Dominion is complete.

---

## 1. BEFORE YOU BEGIN

Read every existing file in the `risk-dominion/app/` codebase, including at least:
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
- `app/client/src/components/QueryBar.tsx`
- `app/client/src/components/ResultsPanel.tsx`
- `app/client/src/components/EventTicker.tsx`
- `app/client/src/components/StrategistAlerts.tsx`
- `app/client/src/components/ChatPanel.tsx`
- `app/client/src/components/ActionBar.tsx`
- `app/client/src/components/VictoryScreen.tsx`

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

Generate changes in this sequence. Each file must only reference types and components that already exist in the `risk-dominion/app/` codebase (at `slice-6-complete`) or were generated earlier in this sequence.

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

`dimension_owner_change` is a private Rust fn called inside the active reducer transaction (it is not itself a reducer). The win check fires when `unified >= WIN_UNIFIED_TERRITORIES` (5 unified territories, unified across all four dimensions: Military, Economic, Cultural, Covert; Covert never counts toward unification). The `game_state` table is a key-value table (`pub key: String` primary key, `pub value: String`) read/written through the `set_game_value` / `game_value` helpers. `started_at` is already stored as a millis-since-epoch string via `set_game_value(ctx, "started_at", &ts.to_string())`.

Add one line inside the existing win block, after setting `status` and `winner`, using `ctx.timestamp` (via the existing `now_millis(ctx)` helper, which returns `ctx.timestamp.to_micros_since_unix_epoch() / 1000`):

```rust
fn dimension_owner_change(ctx: &ReducerContext, new_owner: i32) {
    // ... existing unification count across all four dimensions ...
    if unified >= WIN_UNIFIED_TERRITORIES {
        let winner_name = player_display_name(ctx, new_owner);
        set_game_value(ctx, "status", "ended");
        set_game_value(ctx, "winner", &winner_name);
        // NEW: record the timeline end bound for replay (deterministic ctx.timestamp).
        set_game_value(ctx, "ended_at", &now_millis(ctx).to_string());
        log::info!("Game over: {winner_name} unified {unified} territories.");
    }
}
```

Use `ctx.timestamp` (never wall-clock / `SystemTime`). No other server changes. No new reducers, procedures, or tables.

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
   - Apply AI actions from `aiActions` where `cycleAt` falls in this time window. Use the `actionsTaken` JSON to update the reconstructed dimension tables.
   - Apply player actions from `events`. Ownership changes are extracted from event text and `territory_id`/`player_id` fields. Numerical values are approximated (troop counts reset to defaults on ownership change, capital incremented by approximate amounts).
   - Apply cultural flips from events with `event_type === 'cultural'`.
5. Recalculate `unifiedCounts` from the reconstructed dimension tables.
6. Return the reconstructed state.

**`buildSnapshot`:**
- Called every 30 seconds of game time during replay.
- Stores the current reconstructed state in the `snapshots` Map keyed by timestamp.
- The Map is passed by reference and mutated in place.

**Approximation note:** Player-caused numerical changes (exact troop counts, capital values) are approximated because `event_feed` stores narrative text, not numerical deltas. AI-caused changes are exact from `ai_reasoning_log` (the `actionsTaken` JSON in TS). This is an acceptable tradeoff. Full player action logging is a future enhancement.

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
- Data: count `ownerId` per dimension table (camelCase TS field).

**Trust Score Summary:**
- Header: "TRUST SCORES" in Orbitron, 11px, `text-accent`.
- Per AI (players 2, 3, 4): AI name + for each other player, show trust score as a small bar (0-100).
- Data: `aiTrust` filtered by `aiPlayerId`.

**Cultural Hotspots:**
- Header: "CULTURAL HOTSPOTS" in Orbitron, 11px, `text-accent`.
- Top 3 territories by `influencePct` where `cultural.ownerId !== military.ownerId`.
- Each: territory name, influence %, cultural owner name.
- Data: `cultural` joined with `military`.

**AI Cycle Status:**
- Header: "AI STATUS" in Orbitron, 11px, `text-accent`.
- Per AI: name + status ("idle" or "thinking..." when `cycleStatus === 'pending'`).
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
  - Colors by `eventType` (camelCase TS field): military=#FF6666, economic=#FFCC44, cultural=#44DDAA, covert=#AA44FF, chat=#44CC66, victory/system=#FFD700.
  - Hover: tooltip showing `eventText` in JetBrains Mono, 10px, dark background.
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
- Query the `ai_reasoning_log` rows (camelCase fields in TS, e.g. `cycleAt`, `aiPlayerId`, `actionsTaken`) for rows with `cycleAt <= currentTimestamp`, grouped by `aiPlayerId` and `cycleAt`.
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
- `game_state` is key-value, surfaced as `gameState` rows from `useTable(tables.game_state)`. Read values with `gameState.find((r) => r.key === 'started_at')?.value` etc. The stored value is a millis-since-epoch string; parse with `Number(...)`.
- Read `startedAt` (`started_at`) and `endedAt` (`ended_at`) this way.
- If the `status` value is not `'ended'`: set a flag `replayUnavailable = true`.
- If ended: build initial snapshot from seed data at `startedAt`. Set `currentTimestamp = startedAt`. Build initial replay state.
- The replay timeline reads from `event_feed` (subscribed via `useTable(tables.event_feed)`), ordered by `timestamp`. Generated TS row/field names are camelCase (e.g. `playerId`, `territoryId`, `eventType`, `cycleAt`); use the names emitted in `module_bindings`.

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

1. **Modify existing files in place** in the `risk-dominion/app/` codebase. Read each file before modifying. Preserve all functionality from prior slices not explicitly changed.
2. **Mark every output file** as MODIFIED or NEW at the top.
3. **All server-side arithmetic is integer arithmetic.** No floats in Rust.
4. **SpacetimeDB 2.4.1 macros (server side):** tables are `#[spacetimedb::table(accessor = name, public)]` on a `pub struct` with column attrs (`#[primary_key]`, `#[auto_inc]`, `#[unique]`, `#[index(btree)]`); reducers are `#[spacetimedb::reducer] fn f(ctx: &ReducerContext, ...) -> Result<(), String>`. Slice 7 changes no table or reducer signatures; it only adds one `set_game_value(ctx, "ended_at", ...)` line inside the existing `dimension_owner_change` private fn.
5. **Tailwind CSS for all styling.** Use design tokens from `../AESTHETIC.md` (relative to the slice docs; the app lives at `risk-dominion/app/client`).
6. **No emojis. No em dashes. No custom CSS files.**
7. **Replay state reconstruction is client-side only.** No new server endpoints, reducers, or procedures. The client uses the `spacetimedb` npm package, `useTable` hooks, and reads `event_feed` for the replay timeline.
8. **Player action numerical values are approximated** in replay. Acknowledge this in code comments.
9. **This is Slice 7 of 7, the final slice.** Generate everything specified. No placeholders.

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

Read the existing `risk-dominion/app/` codebase (at `slice-6-complete`). Apply every modification specified above in the order specified. Output every changed file with MODIFIED or NEW at the top. This is Slice 7 of 7, the final slice. After generation, Risk: Dominion is complete. Generate now.