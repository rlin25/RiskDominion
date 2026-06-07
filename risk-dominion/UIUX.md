# UIUX.md — Risk: Dominion Interaction Design

## Version 1.1
## Scope: Complete UI/UX Overhaul — All Slices
## Companion: AESTHETIC.md v2.0, INTERFACE_CONTRACT_UX_OVERHAUL.md

---

## 0. DOCUMENT PURPOSE

This document specifies how every interaction works in Risk: Dominion. It does not specify how things look (see AESTHETIC.md v2.0) or exact pixel values (see INTERFACE_CONTRACT_UX_OVERHAUL.md). It specifies behavior — what happens when the player does something, step by step.

Each section describes one interaction flow: what triggers it, the sequence of events, the state changes, what the player sees and hears, and how the flow ends.

### 0.1 Map Architecture

The map is a hex grid, not a geographic projection. There are 12 territories arranged in three continent columns rendered as CSS/div layout (no D3, no SVG viewport pan/zoom):

- Americas column: North America (1), Central America (2), Caribbean (3), South America (4)
- Europe-Africa column: Western Europe (5), North Africa (6), Southern Africa (7), Eastern Europe (8)
- Asia-Oceania column: Middle East (9), South Asia (10), East Asia (11), Oceania (12)

Each territory is an SVG hexagon (92×80 viewBox) drawn as a `<polygon points="0,40 23,0 69,0 92,40 69,80 23,80">`. The hexagon is divided into four quadrants: top-left = Military, top-right = Cultural, bottom-right = Economic, bottom-left = Covert. A center medallion shows the troop count. The territory name label sits below the hexagon. There is no camera, no zoom, no pan — the three columns are always fully visible.

### 0.2 Card Hand Architecture

The card hand is a fanned arc of portrait cards (`78×112px` each) rendered at the bottom of the screen. Cards are fanned with a rotation angle and y-lift applied per card position so they spread outward from a common bottom-center origin. The number of cards in the fan equals `actionPoints` (clamped to 0–10). Cards cycle through types in `["military", "economic", "covert"]` order. Drag is implemented via `dnd-kit` (`useDraggable`/`useDroppable`). There is no concept of "stacks" or "top card" — every card in the fan is individually draggable.

### 0.3 SpacetimeDB API

State is read via `useTable(tables.X)` subscriptions. Mutations are called via `useReducer(reducers.X)`. The reducers relevant to card play use these exact signatures:

- `militaryAttack({ territoryId, playerId })`
- `economicInvest({ territoryId, playerId })`
- `deployAgent({ territoryId, playerId })`
- `sendChatMessage({ senderId, messageText, recipientId, isDeception, claimedFact })`

Query and intel operations use `useProcedure(procedures.X)` because they return data to the caller:

- `queryDatabase({ query: string })`
- `getIntel({ aiPlayerId: number })`
- `getCannedQuery({ queryId: number })`
- `autocompleteQuery({ partial: string })`

### 0.4 Component Inventory

**Existing components (must not be deleted):**
`Map.tsx`, `Territory.tsx`, `CardHand.tsx`, `ActionCard.tsx`, `IntelPanel.tsx`, `ChatPanel.tsx`, `QueryBar.tsx`, `ResultsPanel.tsx`, `ActionBar.tsx`, `StrategistAlerts.tsx`, `EventTicker.tsx`, `SpectatorOverlay.tsx`, `ReplayControls.tsx`, `VictoryScreen.tsx`

**New components added by this overhaul:**
`CommandBar.tsx`, `ChatWindow.tsx`, `TitleScreen.tsx`, `ColorLegend.tsx`, `soundEngine.ts`

---

## 1. INITIAL LOAD FLOW

**Trigger:** Player opens the application in a browser.

**Sequence:**
1. SpacetimeDB connection established. All `useTable` subscriptions activated via `useSubscriptions`. `isReady` is `false` while any table subscription is pending.
2. While `isReady` is `false`: loading screen renders ("ESTABLISHING COMMAND LINK…" with pulsing sword icon). This is the existing App.tsx loading gate and does not change.
3. Once `isReady` becomes `true` and `titleScreenDone` is `false`: TitleScreen component mounts as a full-viewport dark overlay with "RISK: DOMINION" in gold Cinzel.
4. Overlay and text fade in over 300ms.
5. Hold for 2000ms. The live hex map is visible and updating behind the overlay (territory owners may change, event ticker may update — this is intentional and shows the world is alive).
6. Overlay and text fade out over 500ms.
7. TitleScreen unmounts. `titleScreenDone` state set to `true`.
8. Map, ColorLegend, and CardHand are now fully interactive.
9. ColorLegend component is visible at a fixed position, showing the four player color swatches with names.
10. Game is fully playable.

**Edge case — game ends during title screen:** If `gameEnded` becomes `true` while TitleScreen is still mounted, do not render VictoryScreen yet. Queue the victory/defeat state. After TitleScreen unmounts and `titleScreenDone` is `true`, render VictoryScreen immediately on the next render cycle.

**Edge case — replay or spectator mode:** TitleScreen still plays on initial load. `titleScreenDone` follows the same flow regardless of mode.

---

## 2. CARD ACTION FLOW

### 2.1 Pick Up Card from Fan

**Trigger:** Player initiates a drag gesture (`mousedown` + movement) on any card in the fanned hand where `actionPoints > 0` and the game has not ended.

**Sequence:**
1. dnd-kit `DragStartEvent` fires. `handleDragStart` reads `event.active.data.current.cardType`.
2. Card enters drag state via `useDraggable` transform: lifts 4px visually (handled by the `isDragging` flag in `ActionCard`), scales to 1.08, shadow intensifies to `0 14px 36px rgba(0,0,0,0.7)` with accent color bloom.
3. The card follows the cursor via dnd-kit's pointer tracking. The other cards in the fan remain in their fanned positions — they do not reflow or collapse during drag.
4. If the card type is `"military"`:
   - `attackMode` set to `true`.
   - `highlighted` state set to `new Set(getValidMilitaryTargets(military, PLAYER_ID))`.
   - Valid target hex territories render with gold dashed ring and `drop-shadow(0 0 10px rgba(212,160,23,0.7))`.
   - An SVG `<line>` is drawn from each Military-controlled territory adjacent to a valid target toward that target. Lines are straight SVG lines (not animated particles, not D3 paths) — drawn as dashed gold strokes with `strokeDasharray`. These lines are rendered in an `<svg>` overlay positioned absolutely over the map area.
5. If the card type is `"economic"` or `"covert"`:
   - `highlighted` set to all 12 territory IDs (every territory is a valid target).
   - No attack arrows drawn.
6. If command bar is open at drag start: `commandBarVisible` set to `false` immediately (no animation — the command bar dismisses silently).

### 2.2 Valid Drop onto Territory

**Trigger:** dnd-kit `DragEndEvent` fires and `event.over?.id` is a valid territory ID for the card type being dragged. Territories register as drop zones via `useDroppable({ id: territoryId })`.

**Sequence:**
1. dnd-kit returns the card's transform to zero (card snaps back to its fan position over 150ms via dnd-kit's default snap behavior).
2. `attackMode` set to `false`. `highlighted` cleared to empty Set. Attack arrow SVG overlay removed.
3. The appropriate reducer is called with the actual API signature:
   - Military: `militaryAttack({ territoryId, playerId: PLAYER_ID })`
   - Economic: `economicInvest({ territoryId, playerId: PLAYER_ID })`
   - Covert: `deployAgent({ territoryId, playerId: PLAYER_ID })`
4. On reducer success (SpacetimeDB confirms the transaction):
   - The `players` table subscription delivers an updated row. `actionPoints` decrements.
   - `CardHand` re-renders with one fewer card in the fan. The removed card slot collapses — remaining cards reanimate to their new fan positions.
   - `playCardSound()` triggered (via `soundEngine.ts`).
   - If military or economic ownership changed: the affected territory hexagon's quadrant color updates instantly via subscription. `playTerritoryFlipSound()` triggered.
5. On reducer error (`.catch` path): no state change. No sound. The card remains in the fan at its original position. No visual error shown on the card itself.

### 2.3 Invalid Drop

**Trigger:** dnd-kit `DragEndEvent` fires and `event.over` is `null` OR `event.over.id` is a territory that is not a valid target for this card type. In `handleDragEnd`, the validity check is: for military cards, `getValidMilitaryTargets(military, PLAYER_ID).includes(territoryId)`.

**Sequence:**
1. Card snaps back to its fan position (150ms ease-out via dnd-kit).
2. `attackMode` set to `false`. `highlighted` cleared. Attack arrow overlay removed.
3. No reducer called. No sound.

### 2.4 Card Fan Regeneration

**Trigger:** SpacetimeDB delivers an updated `PlayerRow` where `actionPoints` is higher than the previous value. This happens when action points regenerate on the server (every `ACTION_REGEN_SECONDS = 8` seconds while `actionPoints < MAX_ACTION_POINTS = 10`).

**Sequence:**
1. `useSubscriptions` delivers the new `players` array. `actionPoints` increases.
2. `CardHand` re-renders. The `cards` array (derived as `Array.from({ length: count }, (_, i) => cycle[i % 3])`) is longer by the number of regenerated points.
3. Each card renders with `animate-float-up` CSS animation and a staggered `animationDelay` of `i * 0.06s`. New cards that were not present before appear to float up into their fan positions.
4. There is no "card slides onto a stack" animation — the entire fan re-renders with the new card count, and the float-up animation on each card creates the appearance of the hand filling out.
5. If the hand was in empty state (count was 0): the "Awaiting Orders" message disappears as soon as `count` becomes 1. The fan re-renders with the new cards.

### 2.5 Empty Card State

**Condition:** `actionPoints === 0` (and game has not ended). `CardHand` derives `count = Math.max(0, actionPoints)` which is 0.

**Behavior:**
- `CardHand` renders an empty state div: the text "Awaiting Orders" in Cinzel serif at 11px, tracking-widest, color `#4a4030`.
- A thin horizontal rule with a gradient stroke appears below the text.
- No cards are rendered. No drag targets exist in the card hand area.
- There is no pulsing animation on a dimmed stack — the empty state is completely static text.
- When `actionPoints` becomes 1 or more (next regeneration tick), the empty state unmounts and the card fan mounts in its place.

**Condition variant — game ended:** `CardHand` derives `count = 0` when `gameEnded === true`. The empty state renders with the text "Campaign Ended" instead of "Awaiting Orders". Behavior otherwise identical.

---

## 3. COMMAND BAR FLOW

### 3.1 Summon

**Trigger:** `Enter` key or `T` key pressed while `commandBarVisible === false` AND `titleScreenDone === true` AND no input element is currently focused.

**Sequence:**
1. `commandBarVisible` set to `true`.
2. CommandBar component mounts with a slide-down animation (200ms ease-out).
3. Input field auto-focuses. Cursor blinks in input.
4. Placeholder text: "Type a command or question..."
5. Gold `>` prompt visible at left of input.

**Edge case — command bar already visible:** `Enter` executes the current input content (see Execute Command). `T` types the letter "t" into the focused input field.

**Edge case — input focused elsewhere:** If any `<input>` element has focus (QueryBar, ChatPanel, ChatWindow), `Enter` and `T` are consumed by that input. The command bar is not summoned.

### 3.2 Type Input

**Trigger:** Player types characters while command bar input is focused.

**Sequence:**
1. Characters appear in the input field.
2. No other behavior triggered. Dropdown remains closed.

### 3.3 Open Dropdown

**Trigger:** Player clicks the `>` prompt in the command bar.

**Sequence:**
1. Dropdown panel appears below the command bar, same width as the bar.
2. Dropdown shows categorized command options in four sections:
   - **INTEL** — "What is Zhao planning?", "What is Consortium planning?", "What is Prophet planning?"
   - **CHAT** — "Chat with Zhao", "Chat with Consortium", "Chat with Prophet"
   - **EVENTS** — "What is happening?", "Recent events"
   - **ADVICE** — "How am I doing?", "Where should I attack?"
3. Player can click any option to execute it (see Execute from Dropdown).
4. Player can click `>` again, press Escape, or click outside the dropdown to close it.
5. While dropdown is open, typing in the input does NOT close the dropdown. Both can be active simultaneously.

### 3.4 Execute Command

**Trigger:** `Enter` key pressed while command bar input contains text.

**Sequence:**
1. Input text is trimmed of leading/trailing whitespace. Matching is case-insensitive.
2. Text is matched against known patterns in priority order:
   - Contains "zhao" AND ("plan" OR "intel" OR "thinking") → open Intel panel for player_id 2
   - Contains "consortium" AND ("plan" OR "intel" OR "thinking") → open Intel panel for player_id 3
   - Contains "prophet" AND ("plan" OR "intel" OR "thinking") → open Intel panel for player_id 4
   - Contains "chat" AND "zhao" → open ChatWindow for player_id 2
   - Contains "chat" AND "consortium" → open ChatWindow for player_id 3
   - Contains "chat" AND "prophet" → open ChatWindow for player_id 4
   - Contains "happening" OR "events" OR "news" → show recent EventTicker entries as notification cards
   - Contains "how am i doing" OR "status" OR "progress" → request Strategist advice card
   - Contains "attack" OR "where should i" → request tactical advice from Strategist
   - Contains "weak" OR "weakest" OR "vulnerable" → execute canned query id 0 ("Weaknesses")
   - Contains "winning" OR "who is winning" → execute canned query id 9 ("Winning")
   - No match → treat entire text as a natural language query, call `queryDatabase({ query: text })`
3. CommandBar dismissed: `commandBarVisible` set to `false`, slide-up animation (200ms).
4. Dropdown closed if open.
5. Input cleared.
6. The matched action executes (see relevant section: Intel Flow, Chat Flow, Query Flow, Notification Flow).

### 3.5 Execute from Dropdown

**Trigger:** Player clicks a labeled option in the dropdown.

**Sequence:**
1. Dropdown closes immediately.
2. The option's text string is treated as if the player had typed it into the input and pressed Enter. Pattern matching (step 2 of Execute Command) proceeds from the option text.
3. CommandBar dismissed after the action is dispatched.

### 3.6 Unrecognized or Failed Input

**Trigger:** Enter pressed with text that does not match any known pattern AND the natural language query either errors or returns an empty result.

**Sequence:**
1. CommandBar plays a shake animation (3 horizontal oscillations, 200ms total).
2. An error hint appears below the bar: "I didn't understand that. Try 'help' for options." in Inter 11px, `text-secondary` color.
3. Input field is NOT cleared. Player may edit and try again.
4. Error hint disappears after 3 seconds.
5. CommandBar remains open and focused.

### 3.7 Dismiss

**Trigger:** `Escape` key pressed, OR player clicks outside the command bar area, OR a card drag begins (`DragStartEvent` fires).

**Sequence:**
1. `commandBarVisible` set to `false`.
2. Dropdown closes if open.
3. CommandBar unmounts with slide-up animation (200ms).
4. Input cleared.
5. Error hint cleared if visible.

---

## 4. CHAT FLOW

### 4.1 Open Chat Window

**Trigger:** Command executed for "chat with {AI name}" (via command bar or dropdown).

**Sequence:**
1. The AI's `playerId` is added to `activeChats` array if not already present. `activeChats` is a `number[]` stored in App-level state.
2. `ChatWindow` component mounts for that AI with fade-in + scale-up animation (200ms ease-out).
3. Window appears at bottom-right corner. If other `ChatWindow` instances are open, the new window stacks directly above them (lowest window sits at bottom-right, each additional window stacks higher).
4. Message history for that AI is loaded from the `chatLog` subscription array, filtered to rows where `(senderId === PLAYER_ID && recipientId === ai.playerId) || (senderId === ai.playerId && recipientId === PLAYER_ID)`. Messages sorted ascending by `timestamp`.
5. Message area auto-scrolls to the most recent message.
6. Input field in the ChatWindow is focused.

**Note on ChatPanel vs ChatWindow:** The existing `ChatPanel.tsx` is a persistent right-side panel (always visible in player mode). `ChatWindow.tsx` is the new overlay-style floating window opened via command bar. Both co-exist. The `ChatPanel` shows all chat logs including global; `ChatWindow` shows a focused DM thread with one AI. If both show the same DM thread simultaneously, they display the same data from the subscription — no deduplication or suppression needed.

### 4.2 Send Message from ChatWindow

**Trigger:** Player types text in a ChatWindow's input and presses `Enter`.

**Sequence:**
1. Input text trimmed. If empty, nothing happens.
2. Player's message renders immediately in the chat window (right-aligned, text only). This is an optimistic local render before the reducer confirms.
3. Reducer called:
   ```
   sendChatMessage({
     senderId: PLAYER_ID,
     messageText: text,
     recipientId: ai.playerId,
     isDeception: false,
     claimedFact: "",
   })
   ```
4. Input field cleared.
5. Message area scrolls to bottom.
6. AI response arrives via `chat_log` subscription (2–5 seconds). The new row is delivered to `chatLog` in `useSubscriptions`, and all components subscribed to that data re-render.

### 4.3 Receive AI Response

**Trigger:** New `ChatLogRow` delivered by the `chat_log` subscription where `senderId` is an AI player_id and `recipientId === PLAYER_ID`.

**Sequence:**
1. New message appears in the `ChatWindow` for that AI (left-aligned, with AI name in the AI's player color).
2. Message area scrolls to bottom.
3. The same message also appears in `ChatPanel` under the corresponding DM tab, because both components read from the same `chatLog` array.
4. If the `ChatWindow` for that AI is not open: a persistent notification dot appears near the command bar's `>` prompt, in the AI's color. It clears when the ChatWindow is next opened.
5. If the `ChatWindow` is open but the chat window DOM is not scrolled to bottom (player is reading history): a "↓ New message" indicator appears at the bottom edge of the message area. Clicking it scrolls to bottom and clears the indicator.

**AI Response Constraints:**
- Response is 100 characters or fewer — one short sentence.
- Response time: 2–5 seconds (real-time pipeline, separate from action points cycle).
- Response is written in that AI's persona (Zhao is terse and strategic; Consortium is bureaucratic; Prophet is cryptic).

### 4.4 Close ChatWindow

**Trigger:** Player clicks the close button on the ChatWindow, presses `Escape` (with ChatWindow focused), or clicks outside all ChatWindows while no other overlay is higher priority.

**Sequence:**
1. AI's `playerId` removed from `activeChats` array.
2. `ChatWindow` unmounts with fade-out animation (150ms).
3. Remaining chat windows do not reposition — they remain stacked at the bottom-right at their existing positions.

### 4.5 Multiple Chat Windows

- Multiple `ChatWindow` instances can be open simultaneously. Each is independent.
- Sending in one does not affect others.
- Windows stack vertically at bottom-right. Newest window appears at the bottom of the stack.
- Maximum 3 `ChatWindow` instances visible. If a 4th is opened, the oldest open window closes automatically (fade-out, 150ms) before the new one mounts.

---

## 5. QUERY FLOW

### 5.1 Execute Query

**Trigger:** Command text parsed as a natural language query, OR a canned query button clicked directly in `QueryBar`, OR a canned query matched via command bar pattern.

**Sequence:**
1. Command bar dismissed (if open).
2. For natural language queries: `queryDatabase({ query: text })` called via `useProcedure`.
3. For canned queries: `getCannedQuery({ queryId })` called via `useProcedure`.
4. While the procedure is pending: a subtle loading state appears. In `QueryBar`, the `>` prompt area shows a slow pulse. If triggered via command bar (which is now dismissed), a small `"..."` indicator appears at bottom-right of the map area.
5. On response:
   - `QueryResult` passed to `onResult` callback, setting `queryResult` state in App.
   - `highlightedTerritories` from the result passed to `onHighlight`, setting `queryHighlights` in App.
   - `ResultsPanel` mounts and renders the result.
   - Highlighted territory IDs are added to `mapHighlights` (the Set passed to `Map`), causing those hex territories to show their gold highlight ring.
   - If the result specifies a `visualization` type, the visualization renders on or near the map (see Visualization Types below).
   - Visualization fades in over 300ms.
   - No sound triggered.
6. Visualization auto-dismisses after 10 seconds (fade out over 300ms), OR earlier if:
   - Player starts a new query.
   - Player starts dragging a card (`DragStartEvent` fires).
   - Player presses `Escape`.

### 5.2 Visualization Types

The `QueryResult`'s `visualization.type` field determines how results are overlaid on the hex map. The hex map has no D3 layer — all visualizations are rendered as HTML/SVG elements positioned absolutely over the map container.

- `heatmap`: Each territory hex receives a tint overlay based on `visualization.data[territoryId]` value on a normalized color scale. The tint is applied as an additional fill polygon inside the hex SVG, semi-transparent, rendered on top of the existing quadrant fills.
- `flow`: An `<svg>` element absolutely positioned over the map area draws straight lines between territory hex center positions for each pair in `visualization.data`. Lines are solid or dashed, in a neutral gold/white color, with arrowheads. These are static SVG lines — not animated, not D3 path interpolation.
- `symbols`: Proportional SVG circles drawn at the center of each specified territory hex, sized relative to `visualization.data[territoryId]` value.
- `bar`: A `ResultsPanel` card overlay renders a styled horizontal bar chart using the `visualization.data` values. This floats over the map, not embedded in the hex grid.
- `table`: A `ResultsPanel` card overlay renders a comparison table. Same floating position.

**Finding hex center positions for visualizations:** Each territory's approximate screen-center position is determined by its column (continent group) and row (order within the group). The three continent columns are laid out with known CSS gap and padding. Territory hex centers are calculated from their DOM bounding boxes at render time (via `getBoundingClientRect`) or from a static lookup table keyed by `territoryId`.

### 5.3 Autocomplete

**Trigger:** `Tab` key pressed while `QueryBar` input is focused and has text.

**Sequence:**
1. `autocompleteQuery({ partial: text })` called.
2. Suggestions list appears below the query bar input.
3. Clicking a suggestion sets the input text to that suggestion and hides the list.
4. `Escape` hides the suggestion list without clearing the input.

### 5.4 Query Error

If the procedure returns an error or times out:
- No visualization rendered. `queryResult` remains null.
- A brief event notification card appears at top-center: "Query failed. Try again." — same styling as EventTicker notifications, auto-dismisses after 4 seconds.
- No shake animation on the command bar (shake is reserved for unrecognized command input, not query failures).

---

## 6. INTEL FLOW

### 6.1 Open Intel Panel

**Trigger:** Command executed for "show me {AI name}'s plans", OR player clicks an AI button directly inside the existing `IntelPanel.tsx` component.

**Sequence:**
1. `showIntel` state set to the AI's `playerId` (a `number`).
2. `IntelPanel` component mounts (or re-renders if already mounted) displaying that AI's data.
3. Appears on the left side of the map with fade-in + slight scale-up animation (200ms ease-out). If already open for a different AI, it transitions immediately to the new AI's data without unmounting.
4. `getIntel({ aiPlayerId })` procedure called. While loading, button shows `"Querying {name}…"`.
5. On success, `IntelResult` is displayed:
   - `intel.aiPlayerName` shown as the panel header.
   - If `intel.status === "success"` and `intel.deliberation.length > 0`: each `DeliberationEntry` is rendered as a collapsible row showing `subordinateName`, `role`, and `reasoning`. Commander entry (`subordinateId === "commander"`) is always expanded by default. Subordinate entries are collapsed by default (show name and role only; click to expand reasoning text).
   - If `intel.status === "success"` and no deliberation entries: plain text `intel.intelText` is shown.
   - If `intel.status !== "success"`: `intel.intelText` shown in `text-secondary` color.
6. `intel.territoriesReferenced` IDs passed to `onHighlight` callback, adding them to `queryHighlights` so those hex territories light up.
7. If no intel available yet: "No intelligence available yet. {AI name} has not completed a planning cycle."

### 6.2 Navigate Intel

- Scroll vertically through the deliberation chain within the IntelPanel.
- Subordinate entries can be clicked to toggle expansion of reasoning text.
- Commander entry remains always expanded.
- No other interactions within the panel.

### 6.3 Close Intel

**Trigger:** Player clicks the close button on the IntelPanel, or presses Escape (see Overlay Management), or clicking outside the panel while it has no higher-priority overlay open.

**Sequence:**
1. `showIntel` set to `null`.
2. IntelPanel unmounts with fade-out animation (150ms).
3. `onHighlight([])` called to clear the territory highlights that were set during Intel open.

---

## 7. NOTIFICATION FLOW

### 7.1 Event Notifications

**Trigger:** New row delivered by the `event_feed` subscription (`EventFeedRow` arrives in `eventFeed` array from `useSubscriptions`). The `EventTicker` and `StrategistAlerts` components consume this data.

**Sequence:**
1. Event notification card created with the event text from `eventRow.description` (or equivalent field) and a left border color matching `EVENT_TYPE_COLORS[eventRow.eventType]`.
2. Card appears at top-center with slide-down + fade-in animation (200ms).
3. If 3 notification cards are already visible: the oldest is removed immediately (no animation) before the new one enters.
4. After 4 seconds: card fades out (200ms) and is removed from the DOM.
5. Clicking the card calls `handleEventClick(territoryId)`, which sets `tickerHighlight` to that territory ID for 3 seconds, causing that hex territory to show its highlight ring.
6. No sound triggered on generic events.

**EventTicker vs ReplayControls:** In player mode and spectator mode, `EventTicker` renders at the bottom. In replay mode, `ReplayControls` renders at the bottom instead. `EventTicker` is suppressed in replay mode.

### 7.2 Strategist Advice Cards

**Trigger:** New row delivered by the `strategist_log` subscription (`StrategistLogRow` arrives in `strategistLog` array), OR player requests advice via command bar ("how am I doing", "where should I attack").

**Sequence:**
1. `StrategistAlerts` component renders the alert as a card at top-left with a gold border.
2. Card appears with the same slide-down + fade-in animation (200ms) as event notifications.
3. Auto-generated alerts (from subscription): auto-dismiss after 8 seconds (longer than events because advice is substantive).
4. Player-requested advice (from command bar): the resulting card persists until the player explicitly dismisses it via the close button on the card or presses `Escape`.
5. Dismissal calls the `dismissStrategistAlert({ notificationId: id })` reducer.

---

## 8. VICTORY/DEFEAT FLOW

### 8.1 Victory

**Trigger:** `game_state` subscription delivers a row `{ key: "status", value: "ended" }` AND `{ key: "winner", value: playerName }` where `winnerPlayer.playerId === PLAYER_ID`.

In App.tsx these are read as:
```
const status = gameState.find(r => r.key === "status")?.value ?? "active";
const winner = gameState.find(r => r.key === "winner")?.value ?? "";
const gameEnded = status === "ended";
const didWin = winnerPlayer?.playerId === PLAYER_ID;
```

**Sequence:**
1. All open overlays dismissed immediately without animation: `commandBarVisible = false`, `activeChats = []`, `showIntel = null`.
2. CardHand re-renders with `gameEnded = true`, showing "Campaign Ended" empty state. Cards are not draggable.
3. Victory animation plays:
   - A shockwave ring (SVG circle expanding from the center of the winning territory's hex) animates outward across the map area (1500ms, `stroke-dasharray` expanding radius).
   - `playVictorySound()` triggered at shockwave start.
   - After shockwave reaches the map edges: all 12 territory hexagons pulse in the winner's player color for 2 cycles (1s per cycle).
4. 1000ms pause.
5. `VictoryScreen` overlay fades in (300ms): "Victory" in gold Cinzel, large.
6. After VictoryScreen is visible: command bar becomes summonable again. `titleScreenDone` remains `true`. Player can query game history or chat post-game.

**Finding the winning territory's hex center for the shockwave origin:** The winning territory is identified from `winner` name matched to the player who holds the most territories, or from the `militaryOwner` field on the territory with the highest military score. The shockwave originates from that territory's hex center position on screen.

### 8.2 Defeat

**Trigger:** `game_state.status === "ended"` AND `winnerPlayer.playerId !== PLAYER_ID`.

**Sequence:**
1. All open overlays dismissed immediately without animation.
2. CardHand shows "Campaign Ended" empty state.
3. Defeat animation plays:
   - The territory where the decisive action occurred (last event in `eventFeed` with a `military` type) is identified. Its hex renders with a continuously pulsing border in red.
   - All other territory hexagons dim to 40% brightness via CSS `opacity` transition (500ms).
   - `playDefeatSound()` triggered.
   - Hold for 2000ms.
4. `VictoryScreen` fades in (300ms): winner's name prominently, with the losing territory name below.
5. After overlay appears: command bar is summonable. Player can query or chat post-game.

---

## 9. TERRITORY INTERACTION FLOW

### 9.1 Hover

**Trigger:** Mouse enters a Territory hex component.

**Behavior:**
- The hex scales up slightly (CSS `hover:scale-[1.1]` on the SVG, applied via Tailwind). Transform origin is `center 75%` so the hex expands upward from its label.
- The browser native tooltip appears (from the `title` attribute on the outer div):
  `"{name} — troops {troopCount}, capital {capital}, agents {agentCount}, influence {influencePct}%"`
- No custom callout div, no D3 foreignObject, no leader line. The native tooltip is the hover interaction.

### 9.2 Drop Target

**Trigger:** A card is being dragged and the cursor enters a Territory hex's drop zone (registered via `useDroppable`).

**Behavior:**
- `isOver` becomes `true` for that territory.
- Border color switches to gold `#d4a017`, border width increases.
- Glow color shifts to `rgba(212,160,23,0.5)`.
- Center medallion border adopts the gold color.
- These are CSS transitions (150ms), not D3 animations.

### 9.3 Click (via EventTicker)

**Trigger:** Player clicks a territory name link inside `ChatPanel` or `EventTicker`.

**Behavior:**
- `handleEventClick(territoryId)` sets `tickerHighlight` to that ID.
- That territory's hex shows its highlight ring (gold dashed ring) for 3 seconds.
- After 3 seconds: `tickerHighlight` set to `null`, ring removed.

---

## 10. STATE MANAGEMENT

### 10.1 App-Level State (current, plus overhaul additions)

Current state in App.tsx:
```typescript
// Existing state
const [highlighted, setHighlighted] = useState<Set<number>>(new Set());
const [queryResult, setQueryResult] = useState<QueryResult | null>(null);
const [queryHighlights, setQueryHighlights] = useState<number[]>([]);
const [tickerHighlight, setTickerHighlight] = useState<number | null>(null);
const [ownedHighlight, setOwnedHighlight] = useState(false);
const [intelOpen, setIntelOpen] = useState(true);
```

New state added by this overhaul:
```typescript
const [commandBarVisible, setCommandBarVisible] = useState(false);
const [activeChats, setActiveChats] = useState<number[]>([]);
const [showIntel, setShowIntel] = useState<number | null>(null);
const [titleScreenDone, setTitleScreenDone] = useState(false);
```

`attackMode` is derived, not stored as state: it is `true` whenever a drag is in progress and the dragged card's `cardType === "military"`. This is determined within `handleDragStart` by setting `highlighted` to military targets only, and within `handleDragEnd` by clearing `highlighted`. An explicit `attackMode: boolean` state variable may be added to App-level state for passing to the attack arrow SVG overlay component, which needs to know whether to render.

Subscription data from `useSubscriptions`:
```typescript
const { military, economic, covert, cultural, players, gameState, eventFeed,
        strategistLog, chatLog, aiState, aiTrust, isReady } = useSubscriptions();
```

### 10.2 Derived State

```typescript
const me = players.find(p => p.playerId === PLAYER_ID);
const actionPoints = me?.actionPoints ?? 0;
const playerColor = PLAYER_COLORS[PLAYER_ID] ?? "#4488FF";

const status = gameState.find(r => r.key === "status")?.value ?? "active";
const winner = gameState.find(r => r.key === "winner")?.value ?? "";
const gameEnded = status === "ended";
const winnerPlayer = players.find(p => p.playerName === winner);
const didWin = winnerPlayer?.playerId === PLAYER_ID;

const territories = useMemo(
  () => buildTerritoryStates(military, economic, covert, cultural),
  [military, economic, covert, cultural]
);

const mapHighlights = new Set<number>([
  ...highlighted,
  ...queryHighlights,
  ...ownedIds,
  ...(tickerHighlight != null ? [tickerHighlight] : []),
]);
```

### 10.3 State Flow Rules

- Game state flows FROM subscriptions TO all components via props. No component mutates game state directly.
- UI overlay state (`commandBarVisible`, `activeChats`, `showIntel`, `titleScreenDone`) is managed in App.tsx and passed down as props and callbacks.
- Overlay components (CommandBar, ChatWindow, IntelPanel) each receive a dismiss callback from App.tsx. They never directly modify App state.
- CardHand receives `actionPoints` and `gameEnded` as props. It calls reducers via closures passed from App, or directly via `useReducer` hooks — it does not manage any overlay state.
- Attack arrow SVG overlay receives `attackMode` (bool), `highlighted` (Set), and `territories` as props. It renders only when `attackMode` is true.

---

## 11. OVERLAY MANAGEMENT

### 11.1 Rules

- Only one `CommandBar` instance exists. One `IntelPanel` instance exists.
- Multiple `ChatWindow` instances can be open simultaneously (max 3).
- Opening a new intel AI closes the previous IntelPanel data and shows the new AI (the panel itself does not remount — it transitions).
- Opening a ChatWindow does NOT close other chat windows, the command bar, or the intel panel.
- Starting a card drag closes only the command bar. Chat windows and intel panel remain open during card drags.
- Escape key dismisses one overlay at a time, in priority order.

### 11.2 Dismiss Priority

When `Escape` is pressed with multiple overlays open, one press dismisses the highest-priority open overlay:

1. Dropdown (if command bar is open and dropdown is open)
2. Command bar (if open)
3. Intel panel (if open)
4. Chat windows (all open windows close together in one press)
5. Active card drag (if in progress — returns card to fan position)

One press of Escape dismisses exactly the current highest-priority item. Multiple presses step down through the list.

---

## 12. KEYBOARD SHORTCUTS

| Key | Condition | Action |
|-----|-----------|--------|
| `Enter` | Command bar hidden, title screen done, no input focused | Summon command bar |
| `Enter` | Command bar open, input has text | Execute command |
| `T` | Command bar hidden, no input focused, title screen done | Summon command bar |
| `Escape` | Dropdown open | Close dropdown only |
| `Escape` | Command bar open, no dropdown | Dismiss command bar |
| `Escape` | Intel panel open, command bar closed | Close intel panel |
| `Escape` | Chat windows open, no higher-priority overlay | Close all chat windows |
| `Escape` | Card drag active, no other overlays | Cancel drag |
| `H` / `h` | No input focused | Toggle owned-territory highlight |
| `I` / `i` | No input focused | Toggle intel panel open/closed |
| `Q` / `q` | No input focused | Focus QueryBar input |
| `Tab` | QueryBar input focused | Request autocomplete suggestions |

**Removed shortcuts from previous versions:**
- Chat tab keyboard shortcuts (Slice 6) are removed. Chat is accessed only through the command bar.
- Card hotkey selection (Slice 5) is removed. Cards are dragged, not selected by keyboard.
- WASD map navigation (Slice 5) is removed. The hex grid is not panned by keyboard.

---

## 13. SOUND TRIGGER SUMMARY

All sound functions are exported from `soundEngine.ts`. The engine is initialized once at app load. Each function checks whether audio context is unlocked (requires a user gesture first) before playing.

| Event | Function | When |
|-------|----------|------|
| Card played successfully | `playCardSound()` | After reducer `.then()` confirms the transaction |
| Territory ownership change | `playTerritoryFlipSound()` | When a territory's owner field changes in subscription |
| Cultural influence at 30% | `playCulturalPressureSound(1)` | When any `influencePct` crosses 30% upward |
| Cultural influence at 40% | `playCulturalPressureSound(2)` | When any `influencePct` crosses 40% upward |
| Victory | `playVictorySound()` | When shockwave animation begins (game ended, player won) |
| Defeat | `playDefeatSound()` | When defeat dimming animation begins (game ended, player lost) |

Cultural pressure threshold crossing is detected by comparing the previous `influencePct` value (stored in a `useRef` or `usePrevious` hook) against the new value on each subscription update.

---

## 14. SPECTATOR AND REPLAY MODES

### 14.1 Spectator Mode

**URL:** `?spectator=true`

- `mode === "spectator"` in App.tsx.
- `CardHand` is not rendered (only rendered in player mode).
- `SpectatorOverlay` is rendered alongside the map.
- `ChatPanel` renders in read-only mode (`mode !== "player"` suppresses the input row).
- Command bar is NOT summonable in spectator mode (no actions to take).
- Intel panel and query bar remain available for observation.
- `EventTicker` renders normally.

### 14.2 Replay Mode

**URL:** `?replay=true`

- `mode === "replay"` in App.tsx.
- If game has not ended yet: a waiting message renders ("Replay will be available after the game ends.").
- Once game has ended: replay UI renders. `currentTimestamp` playhead initialized to `startedAt`.
- `ReplayControls` renders at the bottom instead of `EventTicker`.
- `ChatPanel` is shown with `currentTimestamp` filter — only messages whose `timestamp <= currentTimestamp` are displayed.
- `CardHand` is not rendered.
- Command bar is not summonable.
- Playback loop: every 200ms, `currentTimestamp` advances by `200 * playbackSpeed` ms. When playhead reaches `endedAt`, playback stops.

---

## End of UIUX.md

This document specifies every interaction pattern, user flow, state transition, and behavioral rule for the Risk: Dominion frontend. Use it alongside AESTHETIC.md v2.0 (visual design) and INTERFACE_CONTRACT_UX_OVERHAUL.md (exact component specifications) during implementation. Every trigger, every sequence, every edge case is defined. Ready for generation.
