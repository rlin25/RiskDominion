# UIUX.md — Risk: Dominion Interaction Design

## Version 1.0
## Scope: Complete UI/UX Overhaul — All Slices
## Companion: AESTHETIC.md v2.0, INTERFACE_CONTRACT_UPDATE_1.md

---

## 0. DOCUMENT PURPOSE

This document specifies how every interaction works in Risk: Dominion. It does not specify how things look (see AESTHETIC.md v2.0) or exact pixel values (see INTERFACE_CONTRACT_UPDATE_1.md). It specifies behavior — what happens when the player does something, step by step.

Each section describes one interaction flow: what triggers it, the sequence of events, the state changes, what the player sees and hears, and how the flow ends.

---

## 1. INITIAL LOAD FLOW

**Trigger:** Player opens the application in a browser.

**Sequence:**
1. SpacetimeDB connection established. All table subscriptions activated.
2. Game state begins updating in the background (AI cycles, cultural spread, etc.).
3. TitleScreen component renders: full-viewport dark overlay with "Risk: Dominion" in gold.
4. Overlay and text fade in over 300ms.
5. Hold for 2000ms. The live map is visible and updating behind the overlay.
6. Overlay and text fade out over 500ms.
7. TitleScreen unmounts. `titleScreenDone` state set to `true`.
8. Map and CardHand components are now interactive.
9. Color legend is visible. Territory names are visible at low opacity.
10. Game is fully playable.

**Edge case:** If the game ends before the title screen fades, the VictoryScreen does not render until the title screen has completed its fade-out. Queue the victory state and render after TitleScreen unmounts.

---

## 2. CARD ACTION FLOW

> **Implementation note:** The card hand is rendered as a retained fan-out arc (one card per action point, fanned with rotation and lift, cycling Military/Economic/Covert) rather than three discrete stacks. All drag, attack-arrow, empty-state, regeneration, styling, and sound behavior described in this section still applies to the fanned cards.

### 2.1 Pick Up Card

**Trigger:** `mousedown` on the top card of any card stack where `count > 0`.

**Sequence:**
1. Card enters drag state: lifts 4px, scales to 1.05, shadow intensifies.
2. If the card is Military type:
   - `attackMode` state set to `true`.
   - Map renders attack arrows: dashed lines from player's adjacent Military-controlled territories to valid attack targets.
   - Valid target territories highlight with gold border.
   - Particles animate along arrows.
3. If the card is Economic or Covert type: no map changes. All territories are valid targets.
4. If command bar is open: dismiss command bar immediately (no animation).
5. Card follows cursor during drag.

### 2.2 Valid Drop

**Trigger:** `mouseup` while card is over a valid target territory.

**Sequence:**
1. Card animates back to stack position (200ms ease-out).
2. Appropriate reducer called: `military_attack(territory_id, 1)`, `economic_invest(territory_id, 1)`, or `deploy_agent(territory_id, 1)`.
3. `attackMode` set to `false`. Attack arrows and highlights removed from map.
4. On reducer success response:
   - Action point subscription updates. Card stack count decrements.
   - `playCardSound()` triggered.
   - If ownership changed: territory patterns update, `playTerritoryFlipSound()` triggered.
5. On reducer error response: no state change. Card remains in stack. No sound.

### 2.3 Invalid Drop

**Trigger:** `mouseup` while card is NOT over a valid target territory.

**Sequence:**
1. Card snaps back to stack position (200ms ease-out).
2. `attackMode` set to `false`. Attack arrows and highlights removed.
3. No reducer called. No sound.

### 2.4 Regeneration

**Trigger:** Action point regeneration from server (every 4 seconds while `action_points < 10`).

**Sequence:**
1. Subscription delivers updated `players` table row.
2. Corresponding card stack count increments.
3. New card slides onto top of stack from above (200ms ease-out).
4. Count number flashes gold for 300ms.
5. If stack was in empty state (count was 0): stack returns to full opacity, pulse animation stops.
6. No sound triggered.

### 2.5 Empty State

**Condition:** `count === 0` for a card stack.

**Behavior:**
- Stack renders at 40% opacity.
- Slow pulse animation runs continuously (opacity 0.4 → 0.55 → 0.4 over 4 seconds).
- Cards are not draggable. Cursor is default, not grab.
- Regeneration exits empty state when count becomes 1.

---

## 3. COMMAND BAR FLOW

### 3.1 Summon

**Trigger:** `Enter` key or `T` key pressed while command bar is hidden AND title screen has completed.

**Sequence:**
1. `commandBarVisible` set to `true`.
2. CommandBar component mounts with slide-down animation (200ms).
3. Input field auto-focuses. Cursor blinks in input.
4. Placeholder text visible: "Type a command or question..."
5. `>` prompt visible in gold.

**Edge case:** If command bar is already visible, `Enter` executes the current input. `T` types the letter "t" in the input field.

### 3.2 Type Input

**Trigger:** Player types characters while command bar input is focused.

**Sequence:**
1. Characters appear in the input field.
2. No other behavior triggered. Dropdown remains closed.

### 3.3 Open Dropdown

**Trigger:** Player clicks the `>` prompt.

**Sequence:**
1. Dropdown appears below the command bar with categorized sections.
2. Dropdown uses the same width as the command bar.
3. Player can click any option to execute that command.
4. Player can click the `>` again or press Escape to close the dropdown.
5. While dropdown is open, typing in the input field does NOT close the dropdown. Both can be active.

### 3.4 Execute Command

**Trigger:** `Enter` key pressed while command bar input has text.

**Sequence:**
1. Input text is parsed. Leading/trailing whitespace trimmed. Case-insensitive matching.
2. Command matched against known patterns:
   - Contains "zhao" AND ("plan" OR "intel" OR "thinking"): open intel for player_id 2
   - Contains "consortium" AND ("plan" OR "intel" OR "thinking"): open intel for player_id 3
   - Contains "prophet" AND ("plan" OR "intel" OR "thinking"): open intel for player_id 4
   - Contains "chat" AND "zhao": open chat with player_id 2
   - Contains "chat" AND "consortium": open chat with player_id 3
   - Contains "chat" AND "prophet": open chat with player_id 4
   - Contains "happening" OR "events" OR "news": show recent event notifications
   - Contains "how am i doing" OR "status" OR "progress": request Strategist advice
   - Contains "attack" OR "where should i": request tactical advice from Strategist
   - Contains "weak" OR "weakest" OR "vulnerable": run query for weakness heat map
   - Contains "winning" OR "who is winning": run query for victory progress
   - Otherwise: treat as natural language query. Send to `query_database`.
3. Command bar dismissed: `commandBarVisible` set to `false`, slide-up animation (200ms).
4. Command action executed (see relevant flow sections for chat, intel, query, notifications, advice).
5. Input field cleared.

### 3.5 Execute from Dropdown

**Trigger:** Player clicks an option in the dropdown.

**Sequence:**
1. Dropdown closes.
2. The option's text is treated as if the player typed it. Execute Command flow continues from step 2.
3. Command bar dismissed.

### 3.6 Unrecognized Input

**Trigger:** Enter pressed with text that doesn't match any known command pattern AND the natural language query returns an error or empty result.

**Sequence:**
1. Command bar plays shake animation (3 oscillations, 200ms).
2. Error message appears below the bar: "I didn't understand that. Try 'help' for options." in Inter, 11px, text-secondary.
3. Input field is NOT cleared. Player can edit and try again.
4. Error message disappears after 3 seconds.
5. Command bar remains open.

### 3.7 Dismiss

**Trigger:** `Escape` key pressed, OR player clicks outside the command bar, OR a card drag starts.

**Sequence:**
1. `commandBarVisible` set to `false`.
2. Dropdown closes if open.
3. CommandBar unmounts with slide-up animation (200ms).
4. Input field cleared.
5. Error message cleared.

---

## 4. CHAT FLOW

### 4.1 Open Chat

**Trigger:** Command executed for "chat with {AI name}".

**Sequence:**
1. AI's player_id added to `activeChats` array if not already present.
2. ChatWindow component mounts for that AI with fade-in + scale animation (200ms).
3. Chat window appears at bottom-right. If other chat windows are open, stacks above them.
4. Message history for that AI loaded from `chat_log` subscription data, filtered by `(sender_id = 1 AND recipient_id = ai_id) OR (sender_id = ai_id AND recipient_id = 1) OR (recipient_id IS NULL AND sender_id = ai_id)`. Most recent messages shown.
5. Auto-scroll to bottom of message area.
6. Input field focused.

### 4.2 Send Message

**Trigger:** Player types text and presses `Enter` in chat input.

**Sequence:**
1. Input text trimmed. If empty, nothing happens.
2. Player message rendered immediately in the chat window: right-aligned, text only.
3. `send_chat_message(1, text, recipient_id, false, null)` reducer called. `recipient_id` is the AI's player_id for DMs, or null for global (if global chat is supported).
4. Input field cleared.
5. Message area scrolls to bottom.
6. AI response expected within 2-5 seconds via the real-time chat pipeline.

### 4.3 Receive AI Response

**Trigger:** AI sends a chat message (via real-time chat pipeline, subscription delivers new `chat_log` row).

**Sequence:**
1. New message appears in the appropriate chat window.
2. AI message rendered left-aligned with portrait, name, and text.
3. Message area scrolls to bottom.
4. If chat window for that AI is not open: a notification dot appears near the command bar `>` prompt (persistent until chat is opened).
5. If chat window is open but minimized or behind another window: the window's header subtly pulses in the AI's color for 2 seconds.

**AI Response Constraints:**
- Response must be 100 characters or fewer — one short sentence.
- Response time: 2-5 seconds (real-time pipeline, separate from action cycle).
- Response is in character based on AI persona.

### 4.4 Close Chat

**Trigger:** Player clicks close button, presses `Escape`, or clicks outside the chat window.

**Sequence:**
1. AI's player_id removed from `activeChats` array.
2. ChatWindow unmounts with fade-out animation (150ms).
3. Remaining chat windows shift to fill the gap (if any).

### 4.5 Chat with Multiple AIs

- Multiple chat windows can be open simultaneously.
- Each window is independent. Sending a message in one does not affect others.
- Windows stack vertically at bottom-right. Newest at the bottom.
- Maximum 3 chat windows visible. If a 4th is opened, the oldest (topmost) closes automatically.

---

## 5. QUERY FLOW

### 5.1 Execute Query

**Trigger:** Command executed that maps to a natural language query (or explicit query command).

**Sequence:**
1. Command bar dismissed.
2. Query text sent to `query_database` reducer.
3. Loading indicator: subtle pulse on the `>` prompt area (if command bar were open) or a small "..." indicator in the bottom-right corner. Disappears when response arrives.
4. On response:
   - Parse `visualization` field from response JSON.
   - Render the specified visualization type on the map (heat map, flow lines, proportional symbols, bar chart, comparison table).
   - Render text caption near the visualization.
   - Visualization fades in over 300ms.
   - No sound triggered.
5. Visualization auto-dismisses after 10 seconds (fade out over 300ms), OR immediately if:
   - Player starts a new query.
   - Player starts dragging a card.
   - Player presses Escape.

### 5.2 Visualization Types

The query response specifies `visualization.type`. The frontend has pre-built renderers for each type:

- `heatmap`: Apply color scale to all territory fills based on `visualization.data` values.
- `flow`: Draw animated lines with particles between territory pairs specified in `visualization.data`.
- `symbols`: Draw proportional circles on territories specified in `visualization.data`.
- `bar`: Render a bar chart card overlay with `visualization.data` values.
- `table`: Render a comparison table card overlay with `visualization.data` rows.

### 5.3 Query Error

If `query_database` returns an error or timeout:
- No visualization rendered.
- Brief event notification appears: "Query failed. Try again." (auto-dismisses after 4 seconds).
- No shake animation (shake is only for command bar unrecognized input, not query failures).

---

## 6. INTEL FLOW

### 6.1 Open Intel

**Trigger:** Command executed for "show me {AI name}'s plans".

**Sequence:**
1. `showIntel` state set to the AI's player_id.
2. IntelPanel component mounts at top-right with fade-in + scale animation (200ms).
3. Most recent `ai_reasoning_log` rows for that AI queried and displayed.
4. Deliberation chain rendered: each subordinate's reasoning and recommendations, commander's final decision.
5. If no reasoning log exists yet: panel shows "No intelligence available yet. {AI name} has not completed a planning cycle."

### 6.2 Navigate Intel

- Scroll vertically through the deliberation chain.
- Subordinate entries are collapsed by default (show name and role only). Click to expand reasoning text.
- Commander entry is always expanded.
- No other interactions within the intel panel.

### 6.3 Close Intel

**Trigger:** Close button, Escape key, or clicking outside the panel.

**Sequence:**
1. `showIntel` set to `null`.
2. IntelPanel unmounts with fade-out animation (150ms).

---

## 7. NOTIFICATION FLOW

### 7.1 Event Notifications

**Trigger:** New row inserted into `event_feed` table. Subscription delivers the row.

**Sequence:**
1. Event notification card created with the event text and appropriate border color.
2. Card appears at top-center with slide-down + fade-in animation (200ms).
3. If 3 notifications are already visible: the oldest is dismissed immediately (no animation).
4. After 4 seconds: card fades out (200ms) and is removed.
5. No sound triggered.

### 7.2 Strategist Advice

**Trigger:** Strategist cycle completes and generates notifications, OR player requests advice via command bar.

**Sequence:**
1. Advice card created at top-left with gold border.
2. Appears with same animation as event notifications.
3. Auto-dismisses after 8 seconds (longer than events — advice is more substantive).
4. If player requested advice via command bar: card persists until dismissed by player (close button or Escape).

---

## 8. VICTORY/DEFEAT FLOW

### 8.1 Victory

**Trigger:** `game_state.status` changes to `'ended'` and `game_state.winner` is the player's name.

**Sequence:**
1. All open overlays dismissed immediately (chat windows, intel panel, command bar).
2. Card stacks remain visible but are not draggable.
3. Victory animation plays:
   - Shockwave ring expands from winning territory across map (1500ms).
   - `playVictorySound()` triggered at shockwave start.
   - After shockwave: all territories pulse in winner's color.
4. 1000ms pause.
5. Victory overlay fades in (300ms): "Victory" in gold.
6. After overlay appears: command bar is summonable again. Player can query or chat post-game.

### 8.2 Defeat

**Trigger:** `game_state.status` changes to `'ended'` and `game_state.winner` is NOT the player's name.

**Sequence:**
1. All open overlays dismissed immediately.
2. Card stacks remain visible but are not draggable.
3. Defeat animation plays:
   - Losing territory identified and highlighted with pulsing border.
   - All other territories dim to 40% brightness (500ms transition).
   - `playDefeatSound()` triggered.
   - Hold for 2000ms.
4. Defeat overlay fades in (300ms): "Defeat" in gold, losing territory name below.
5. After overlay appears: command bar is summonable. Player can query or chat post-game.

---

## 9. KEYBOARD SHORTCUTS

| Key | Condition | Action |
|-----|-----------|--------|
| `Enter` | Command bar hidden, title screen done | Summon command bar |
| `Enter` | Command bar open, input has text | Execute command |
| `T` | Command bar hidden, no input focused, title screen done | Summon command bar |
| `Escape` | Any overlay open | Dismiss all overlays (command bar, chat, intel) |
| `Escape` | Card being dragged | Cancel drag, return card to stack |

**Chat tab shortcuts from Slice 6 are removed.** Chat is accessed only through the command bar.

**Card hotkeys from Slice 5 are removed.** Cards are dragged, not selected by keyboard.

**WASD navigation from Slice 5 is removed.** Map is panned by mouse drag.

---

## 10. STATE MANAGEMENT

### 10.1 App-Level State

```typescript
interface AppState {
  // UI State
  commandBarVisible: boolean;
  activeChats: number[];        // player_ids of open chat windows
  showIntel: number | null;     // ai_player_id or null
  titleScreenDone: boolean;
  attackMode: boolean;          // true when Military card is being dragged
  
  // Game State (from subscriptions)
  military: MilitaryRow[];
  economic: EconomicRow[];
  cultural: CulturalRow[];
  covert: CovertRow[];
  players: PlayerRow[];
  gameState: GameStateRow[];
  eventFeed: EventFeedRow[];
  chatLog: ChatLogRow[];
  aiReasoningLog: AIReasoningLogRow[];
  strategistLog: StrategistLogRow[];
}
```

### 10.2 State Flow

- Game state flows FROM subscriptions TO all components via props. No component mutates game state directly.
- UI state is managed in App.tsx and passed down as props and callbacks.
- Overlay components (CommandBar, ChatWindow, IntelPanel) receive dismiss callbacks.
- CardHand receives game state and calls reducers. It does not manage overlay state.

---

## 11. OVERLAY MANAGEMENT

### 11.1 Rules

- Only one instance of each overlay type can be open at a time (one intel panel, one command bar).
- Multiple chat windows can be open simultaneously (max 3).
- Opening a new overlay does NOT automatically close others (except: opening intel closes any previous intel).
- Escape key closes ALL overlays.
- Starting a card drag closes the command bar only (not chat or intel).

### 11.2 Dismiss Priority

When multiple overlays are open and Escape is pressed:
1. Dropdown (if open)
2. Command bar (if open)
3. Intel panel (if open)
4. All chat windows
5. Card drag (if active)

One press of Escape dismisses the highest priority open overlay. Multiple presses dismiss each in sequence.

---

## 12. SOUND TRIGGER SUMMARY

| Event | Function | When |
|-------|----------|------|
| Card played | `playCardSound()` | After successful reducer response |
| Territory ownership change | `playTerritoryFlipSound()` | After `dimension_owner_change` |
| Cultural pressure 30% | `playCulturalPressureSound(1)` | When any territory's influence crosses 30% |
| Cultural pressure 40% | `playCulturalPressureSound(2)` | When any territory's influence crosses 40% |
| Victory | `playVictorySound()` | When game ends with player as winner |
| Defeat | `playDefeatSound()` | When game ends with AI as winner |

---

## End of UIUX.md

This document specifies every interaction pattern, user flow, state transition, and behavioral rule for the Risk: Dominion frontend. Use this document alongside AESTHETIC.md v2.0 (visual design) and INTERFACE_CONTRACT_UPDATE_1.md (exact component specifications) during implementation. Every trigger, every sequence, every edge case is defined. Ready for generation.