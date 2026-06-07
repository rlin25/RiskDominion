# UIUX.md — Risk: Dominion Interaction Design

## Version 1.1
## Scope: UI/UX Reference — All Slices
## Companion: AESTHETIC.md v2.1, INTERFACE_CONTRACT_UPDATE_1.md
## Reflects: Current codebase (SpacetimeDB 2.4.1, React + dnd-kit, hex grid map)

---

## 0. DOCUMENT PURPOSE

This document specifies how every interaction works in Risk: Dominion. It does not specify visual appearance (see AESTHETIC.md v2.1) or pixel-level component specs (see INTERFACE_CONTRACT_UPDATE_1.md). It specifies behavior: what happens when the player does something, step by step.

---

## 1. INITIAL LOAD FLOW

**Trigger:** Player opens the application in a browser.

**Sequence:**
1. SpacetimeDB connection established via `DbConnection.builder()` with the configured URI and module name.
2. Table subscriptions activate: military, economic, cultural, covert, players, gameState, eventFeed, chatLog, aiReasoningLog, strategistLog.
3. Game state begins updating in the background (AI cycles, cultural spread, etc.).
4. Loading screen renders: "ESTABLISHING COMMAND LINK..." in Orbitron font, centered.
5. Once the SpacetimeDB connection resolves, loading screen unmounts.
6. Top bar, hex map, card hand, and DISPATCHES ticker become visible and interactive.
7. Game is fully playable.

**Edge case:** If game has already ended (`gameState.status === 'ended'`), render VictoryScreen immediately after load completes.

---

## 2. CARD ACTION FLOW

Cards are implemented via dnd-kit (`useDraggable` / `useDroppable`). The fanned card hand is the primary action interface.

### 2.1 Pick Up Card

**Trigger:** Player initiates a drag on a non-disabled `ActionCard`.

**Sequence:**
1. dnd-kit fires `onDragStart`. Card enters drag state: lifts (translateY −4px), scales 1.08, rotates 4deg, shadow intensifies.
2. If Military card:
   - `attackMode` state set to `true` in App.tsx.
   - Adjacent enemy territories highlight as valid attack targets (gold border, dashed ring).
3. If Economic or Covert: no map changes. All territories are valid drop targets.
4. Card follows cursor via dnd-kit transform.

### 2.2 Valid Drop

**Trigger:** dnd-kit `onDragEnd` fires with `over.id` = a valid territory ID.

**Sequence:**
1. Appropriate SpacetimeDB reducer called:
   - Military card: `reducers.militaryAttack({ targetTerritoryId, troops: 1 })`
   - Economic card: `reducers.economicInvest({ targetTerritoryId, amount: 1 })`
   - Covert card: `reducers.deployAgent({ targetTerritoryId })`
2. `attackMode` set to `false`. All territory highlights cleared.
3. SpacetimeDB subscription delivers updated dimension state. Hex quadrant fills and medallion number re-render reactively.
4. Player's action point count decrements in subscription, ActionBar pip empties.

### 2.3 Invalid Drop

**Trigger:** dnd-kit `onDragEnd` fires with `over` = null or non-droppable target.

**Sequence:**
1. Card returns to its fan position (dnd-kit default behavior).
2. `attackMode` set to `false`. Highlights cleared.
3. No reducer called.

### 2.4 Disabled Card State

**Condition:** Player's action point count for that dimension is 0, or game has ended.

**Behavior:**
- Card at 30% opacity, `border: 1.5px solid #3d3525`.
- Cursor `not-allowed`. `disabled` prop passed to `useDraggable` so drag is blocked.
- No shimmer on hover.

### 2.5 Action Point Regeneration

**Trigger:** SpacetimeDB subscription delivers updated `players` row with increased `actionPoints`.

**Sequence:**
1. React re-renders CardHand with updated enabled/disabled state for cards.
2. Newly enabled cards animate in with `animate-float-up`, staggered.
3. Corresponding ActionBar pip fills with `animate-pip-fill`.

---

## 3. HEX MAP INTERACTIONS

### 3.1 Territory Hover

**Trigger:** Mouse enters a territory hex SVG.

**Behavior:**
1. Territory hex scales up to 1.1x (CSS hover, `transformOrigin: center 75%`).
2. Territory name label brightens.
3. Native browser tooltip (via `title` attribute) shows: `{name} — troops {n}, capital {n}, agents {n}, influence {n}%`.

### 3.2 Territory as Drop Target

**Trigger:** dnd-kit active drag hovers over a `useDroppable` territory.

**Behavior:**
1. `isOver = true` → territory border switches to gold (`#d4a017`), 2.5px.
2. Dashed animated highlight ring appears around hex perimeter.
3. Drop-shadow glow activates.

On drag exit or drop: `isOver = false`, border returns to default state.

### 3.3 Attack Mode Map State

**Trigger:** `attackMode === true` (Military card picked up).

**Behavior:**
- Valid attack target territories (adjacent, not Military-owned by player): gold border applied via `isHighlighted` prop.
- Non-valid territories: unchanged.

**Reset:** `attackMode = false` on any drag end.

---

## 4. INTEL FLOW

### 4.1 Query Intel

**Trigger:** Player clicks an AI button in the IntelPanel.

**Sequence:**
1. Button shows loading state: "Querying {name}..." label.
2. `useProcedure(procedures.getIntel)({ aiPlayerId })` resolves asynchronously.
3. `onHighlight(res.territoriesReferenced)` callback fires — App.tsx updates `highlighted` Set.
4. IntelPanel renders deliberation chain: each subordinate's reasoning + recommendations, commander entry last.
5. If no data: "No intelligence available yet. {name} has not completed a planning cycle."

### 4.2 Territory Highlights from Intel

**Trigger:** `highlighted` Set updated in App.tsx from IntelPanel callback.

**Behavior:** Territory components with IDs in `highlighted` receive `isHighlighted={true}`, rendering gold border and dashed ring.

---

## 5. CHAT FLOW

### 5.1 Send Message

**Trigger:** Player types in ChatPanel input and presses Enter.

**Sequence:**
1. Input trimmed. Empty input: no action.
2. `reducers.sendChatMessage({ recipientId, text, isPublic: false })` called.
3. Message appears in chat history via subscription update.
4. AI response arrives within 2–5 seconds via `chatLog` subscription delivering a new row.

### 5.2 Receive AI Response

**Trigger:** Subscription delivers new `chatLog` row from an AI player.

**Behavior:**
- Message rendered in ChatPanel, left-aligned, with AI name in player color.
- Responses are 100 characters or fewer (enforced server-side in AI prompt).

---

## 6. QUERY FLOW

### 6.1 Submit Query

**Trigger:** Player selects a canned query or types a custom query in QueryBar.

**Sequence:**
1. `reducers.queryDatabase({ queryText })` (or `reducers.queryDatabaseCanned({ queryId })` for canned queries) called.
2. QueryBar enters loading state.
3. Subscription delivers `QueryResult`. ResultsPanel renders the response text or structured data.

### 6.2 Autocomplete

**Trigger:** Player types in QueryBar input.

**Sequence:**
1. If query text length > 2, `reducers.getAutocomplete({ prefix })` called.
2. Autocomplete suggestions rendered in dropdown below input.
3. Player can click a suggestion to use it as the query.

---

## 7. NOTIFICATION FLOW

### 7.1 Event Feed (DISPATCHES)

**Trigger:** New row in `eventFeed` table subscription.

**Behavior:**
- EventTicker renders the event with type-appropriate prefix icon and text.
- Marquee animation for overflow content.
- Events accumulate up to `EVENT_FEED_MAX_DISPLAY` (50).

### 7.2 Strategist Alerts

**Trigger:** New row in `strategistLog` table subscription.

**Behavior:**
- StrategistAlerts component renders the advice text.
- Strategic recommendations based on current game state from Strategist AI.

---

## 8. VICTORY / DEFEAT FLOW

### 8.1 Victory

**Trigger:** `gameState.status === 'ended'` AND `gameState.winner` equals the human player's name.

**Sequence:**
1. VictoryScreen renders as absolute overlay.
2. Crown SVG, decorative lines, winner name animate in with `animate-victory-reveal`.
3. "DOMINION ACHIEVED" label, winner name in their color, "CONQUERS ALL" subtitle.
4. "VICTORY IS YOURS" status in success green.
5. CardHand remains visible but cards are disabled (game over).

### 8.2 Defeat

**Trigger:** `gameState.status === 'ended'` AND `gameState.winner` is NOT the human player.

**Sequence:**
1. VictoryScreen renders with `didWin={false}`.
2. Crown in winning AI's player color.
3. "Your campaign ends here." status in muted secondary color.

---

## 9. INPUT RULES

| Key | Context | Action |
|-----|---------|--------|
| `Enter` | QueryBar input focused | Submit query |
| `Enter` | ChatPanel input focused | Send chat message |
| `Escape` | dnd-kit drag active | Cancel drag (dnd-kit handles natively) |

No global keyboard shortcuts beyond component-local inputs.

---

## 10. STATE MANAGEMENT

### 10.1 App-Level UI State

```typescript
// App.tsx
const [attackMode, setAttackMode]   = useState<boolean>(false);
const [highlighted, setHighlighted] = useState<Set<number>>(new Set());
```

### 10.2 SpacetimeDB Subscription State

```typescript
// All game state — reactive via SpacetimeDB WebSocket
const military      = useTable(tables.military);
const economic      = useTable(tables.economic);
const cultural      = useTable(tables.cultural);
const covert        = useTable(tables.covert);
const players       = useTable(tables.players);
const gameState     = useTable(tables.gameState);
const eventFeed     = useTable(tables.eventFeed);
const chatLog       = useTable(tables.chatLog);
const aiReasoning   = useTable(tables.aiReasoningLog);
const strategistLog = useTable(tables.strategistLog);
```

### 10.3 Rules

- Game state flows FROM subscriptions TO components via props.
- No component mutates game state directly.
- Reducers are called by leaf components to trigger server-side changes.
- After a reducer call, components wait for subscription update — no optimistic local state mutation for game data.
- UI state (attackMode, highlighted) is managed in App.tsx and passed as props.

---

## 11. COMPONENT RESPONSIBILITY MAP

| Component | Role |
|-----------|------|
| `App.tsx` | Root layout, DnD context provider, UI state (attackMode, highlighted) |
| `Map.tsx` | Continent column layout, world silhouette background |
| `Territory.tsx` | Hex SVG render, quadrant fills, dnd-kit drop target |
| `CardHand.tsx` | Fan layout, card positioning, entry animations |
| `ActionCard.tsx` | Card visuals, dnd-kit drag source |
| `ActionBar.tsx` | Action point pip row |
| `EventTicker.tsx` | DISPATCHES panel and marquee feed |
| `IntelPanel.tsx` | AI intel buttons and deliberation display |
| `VictoryScreen.tsx` | Win/loss overlay |
| `ChatPanel.tsx` | Chat history and message input |
| `QueryBar.tsx` | Query input and canned query buttons |
| `ResultsPanel.tsx` | Query result display |
| `StrategistAlerts.tsx` | Strategist advice display |
| `PlayerIndicator.tsx` | Player color/status indicator |

---

## End of UIUX.md v1.1

This document specifies every interaction pattern, user flow, and state management rule for Risk: Dominion as it currently exists in the codebase. Use alongside AESTHETIC.md v2.1 (visual design) and INTERFACE_CONTRACT_UPDATE_1.md (component specs).
