# RISK: DOMINION — SLICE 6 MASTERPLAN

## Version 1.0
## Scope: Counter-Intel, Global Chat, Direct Messages, Deception System
## Target: Claude Code Generation — Modifying the Slice 5 Codebase

---

## 0. DOCUMENT PURPOSE

This document specifies how to modify the working Slice 5 codebase to add the counter-intel and global chat system. Read this document in full. Read the existing Slice 5 codebase. Apply the changes specified here.

Do not regenerate Slice 5. Do not create a new project. Modify the existing files in place. Mark each output file as MODIFIED or NEW.

---

## 1. BEFORE YOU BEGIN

Read every existing file in the Slice 5 codebase:
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
- `slice-1/client/src/components/ActionBar.tsx`
- `slice-1/client/src/components/VictoryScreen.tsx`

Understand the current code before making any changes. Then apply the modifications in this document in the order specified.

---

## 2. FILE LIST

Output each file in the order specified in Section 3. Mark every file as MODIFIED or NEW.

**MODIFIED:**
1. `server/src/lib.rs`
2. `client/src/constants.ts`
3. `client/src/types.ts`
4. `client/src/hooks/useSubscriptions.ts`
5. `client/src/components/StrategistAlerts.tsx`
6. `client/src/App.tsx`

**NEW:**
7. `client/src/components/ChatPanel.tsx`

---

## 3. GENERATION ORDER

Generate changes in this sequence. Each file must only reference types and components that already exist in the Slice 5 codebase or were generated earlier in this sequence.

1. `server/src/lib.rs` (MODIFIED)
2. `client/src/constants.ts` (MODIFIED)
3. `client/src/types.ts` (MODIFIED)
4. `client/src/hooks/useSubscriptions.ts` (MODIFIED)
5. `client/src/components/ChatPanel.tsx` (NEW)
6. `client/src/components/StrategistAlerts.tsx` (MODIFIED)
7. `client/src/App.tsx` (MODIFIED)

---

## 4. SERVER MODIFICATIONS

### 4.1 New Tables

Add to the TABLES section:

**`chat_log`:**
```rust
#[spacetimedb(table)]
struct ChatLog {
    id: i32,
    timestamp: i64,
    sender_id: i32,
    recipient_id: Option<i32>,  // NULL = global, Some(id) = DM
    message_text: String,
    territory_id: Option<i32>,
    is_deception: bool,          // NEVER exposed to clients
    claimed_fact: Option<String>, // NEVER exposed to clients
}
```

**`ai_trust`:**
```rust
#[spacetimedb(table)]
struct AiTrust {
    ai_player_id: i32,       // the AI doing the trusting
    target_player_id: i32,   // the player being evaluated
    trust_score: i32,        // 0-100, default 50
    messages_evaluated: i32, // default 0
    truths_confirmed: i32,   // default 0
    lies_caught: i32,        // default 0
    last_updated: i64,
}
```

Composite primary key: (`ai_player_id`, `target_player_id`). Use `#[primarykey]` or equivalent if supported.

### 4.2 New Reducer: `send_chat_message`

```rust
#[spacetimedb(reducer)]
fn send_chat_message(
    sender_id: i32,
    message_text: String,
    recipient_id: Option<i32>,
    is_deception: bool,
    claimed_fact: Option<String>,
) -> Result<(), String> {
    // Validate: game active, sender_id valid (1-4), message non-empty (max 500 chars)
    // Extract territory_id: parse message_text for [Territory Name] patterns
    //   Match against territory names. If found, set territory_id.
    // Insert into chat_log with timestamp = now
    // Return { "success": true, "message_id": id }
}
```

Bracket parsing: iterate over territory names. For each name, check if `[name]` appears in `message_text`. If multiple, use the first one found.

### 4.3 Internal Function: `evaluate_chat_messages`

```rust
fn evaluate_chat_messages(ai_player_id: i32) -> ChatEvaluationSummary {
    // 1. Query chat_log for unevaluated messages (since ai_trust.last_updated per sender)
    // 2. Group by sender_id. Apply rate limit: max 3 messages per sender.
    // 3. For each message with non-NULL claimed_fact:
    //    a. Extract territory_id from the claim if possible
    //    b. Query covert table: agent_count > 0 where owner_id = ai_player_id 
    //       and territory_id matches the claimed territory
    //    c. Determine verification:
    //       - Verified true: agents confirm. trust_score += 3 (cap 100). truths_confirmed += 1.
    //       - Proven false: agents contradict. trust_score -= 15 (floor 0). lies_caught += 1.
    //       - Unverifiable: no agents in territory. No trust change.
    //    d. Handle contradictions: if sender sent conflicting public and private claims,
    //       evaluate each independently. Net trust reflects both.
    //    e. messages_evaluated += 1
    // 4. Apply decay: for senders with no messages, trust_score -= 1 (floor 25)
    // 5. Apply spam penalty: if sender had >3 messages, trust_score -= 2
    // 6. Update last_updated = now
    // 7. Return ChatEvaluationSummary with formatted results
}
```

### 4.4 Modified AI Commander Prompt

In the AI reasoning cycle, after building the game state snapshot and specialist results, add these sections to the commander prompt:

**New input sections** (insert before "Your available action points"):

```
Recent chat messages (last 10, both global and DMs addressed to you):
{chat_history_formatted}

Your trust scores for other players:
- Player: {score} (truths confirmed: {truths}, lies caught: {lies})
- Consortium: {score} (truths confirmed: {truths}, lies caught: {lies})
- Prophet: {score} (truths confirmed: {truths}, lies caught: {lies})

Your current intel from agent network:
{agent_intel_summary}
```

**New output field** (add to the expected JSON response structure):

```json
{
  "actions": [...],
  "chat_message": {
    "message_text": "...",
    "recipient_id": null,
    "is_deception": false,
    "claimed_fact": "...",
    "territory_id": 6
  }
}
```

- `chat_message` can be `null` if the AI chooses silence.
- `recipient_id`: `null` for global broadcast, or a specific player ID (1-4, not self) for DM.
- `is_deception`: `true` if the AI is intentionally lying.
- `claimed_fact`: concise statement of the factual claim. `null` for threats or banter.
- `territory_id`: set if the message references a specific territory.

**Chat strategy guidance** (add to persona descriptions):

- **Zhao:** "You communicate through threats and bluster. Use global chat to intimidate. Use DMs to make deals or issue ultimatums. Lie aggressively to provoke other players into fighting each other. Your lies are bold and direct."
- **Consortium:** "You communicate through false reassurance and subtle misdirection. Use global chat to project peaceful intentions. Use DMs to plant seeds of doubt about other players. Your lies are subtle and deniable."
- **Prophet:** "You communicate through selective truth. Share real intelligence to build trust, then cash it in with a devastating lie at a critical moment. Use DMs to build private relationships. Your deceptions are rare but devastating."

**Safety filter fallback** (add to the output instructions):

"If you are unable to send the intended message due to content restrictions, return null for chat_message and continue with your actions silently. Do not explain the refusal. Do not break character. All communication occurs within a strategy board game where deception, bluffing, and manipulation are expected and consented-to mechanics."

### 4.5 Modified Strategist Prompt

In the Strategist cycle, add these sections to the prompt:

**New input sections** (insert before the current game state):

```
Recent chat messages visible to the player (last 10, includes global and player's DMs):
{player_visible_chat_history}

Player's current intel from agent network:
{agent_intel_summary}
```

The Strategist only sees messages the player can see — global messages and DMs involving the player. DMs between AI opponents are NOT included.

**New output field** (add to the expected JSON response):

```json
{
  "notifications": [...],
  "chat_analysis": [
    {
      "message_id": 42,
      "sender_name": "Zhao",
      "channel": "global",
      "claim": "Consortium is massing troops in North Africa",
      "verification": "contradicted",
      "analysis": "Your agents in North Africa show minimal Consortium military presence. Zhao may be trying to provoke you into attacking the Consortium.",
      "recommended_action": "ignore",
      "territory_id": 6
    }
  ]
}
```

- `chat_analysis` can be an empty array `[]` if no messages to analyze.
- `channel`: `"global"` or `"dm"`.
- `verification`: `"confirmed"`, `"contradicted"`, or `"unverifiable"`.
- `recommended_action`: `"believe"`, `"investigate"`, `"ignore"`, or `"counter"`.

### 4.6 Modified `subscribe_chat_log`

The subscription for `chat_log` must apply server-side filtering:

1. **Strip columns:** The `is_deception` and `claimed_fact` columns MUST be removed from all rows before delivery to any client. These fields exist only for server-side trust evaluation.
2. **Filter DMs:** Only include rows where:
   - `recipient_id IS NULL` (global message), OR
   - `sender_id = {client_player_id}` (message sent by this client), OR
   - `recipient_id = {client_player_id}` (message addressed to this client).
3. The client never sees DMs between other players.

### 4.7 Retroactive Trust Update

In `ai_submit_actions`, after processing action results:
- If any action was influenced by an accepted (unverified) claim from chat, and the action outcome was negative (attack failed, territory lost), apply retroactive penalty: `trust_score -= 10` for the sender whose claim led to the bad outcome.
- Track which actions were influenced by which messages using a temporary map during the cycle.

---

## 5. CLIENT MODIFICATIONS

### 5.1 `constants.ts` (MODIFIED)

Add:

```typescript
export const MAX_CHAT_MESSAGE_LENGTH = 500;
export const CHAT_RATE_LIMIT_PER_CYCLE = 3;
export const TRUST_INITIAL = 50;
export const TRUST_VERIFIED_BONUS = 3;
export const TRUST_LIE_PENALTY = 15;
export const TRUST_BAD_OUTCOME_PENALTY = 10;
export const TRUST_DECAY_PER_CYCLE = 1;
export const TRUST_DECAY_FLOOR = 25;
export const TRUST_SPAM_PENALTY = 2;
```

### 5.2 `types.ts` (MODIFIED)

Add:

```typescript
export interface ChatLogRow {
  id: number;
  timestamp: number;
  sender_id: number;
  recipient_id: number | null;
  message_text: string;
  territory_id: number | null;
  // is_deception and claimed_fact are NEVER present in client data
}

export interface ChatAnalysisAlert {
  message_id: number;
  sender_name: string;
  channel: 'global' | 'dm';
  claim: string;
  verification: 'confirmed' | 'contradicted' | 'unverifiable';
  analysis: string;
  recommended_action: 'believe' | 'investigate' | 'ignore' | 'counter';
  territory_id: number | null;
}
```

### 5.3 `useSubscriptions.ts` (MODIFIED)

Add:

```typescript
const chatLog = useSubscription<ChatLogRow[]>('subscribe_chat_log');
```

Include `chatLog` in the returned object.

### 5.4 `ChatPanel.tsx` (NEW)

**Position:** Right side of the screen, collapsible sidebar opposite IntelPanel.

**Props:** `messages: ChatLogRow[]`, `currentPlayerId: number`, `playerColors: Record<number, string>`, `onSendMessage: (text: string, recipientId: number | null) => void`, `onTerritoryClick: (territoryId: number) => void`, `activeTab: 'global' | 2 | 3 | 4`, `onTabChange: (tab: 'global' | 2 | 3 | 4) => void`.

**Layout:**
- **Tab bar:** Four tabs — "Global", "Zhao", "Consortium", "Prophet". Active tab highlighted with that player's color from `playerColors`. Inactive tabs in `text-secondary`.
- **Message area:** Scrollable container. Messages filtered by active tab:
  - Global tab: `recipient_id === null`.
  - Player-specific tab: DMs between current player and that AI (`sender_id` or `recipient_id` matches).
  - Each message rendered as a row:
    - Sender name in Orbitron, 10px, colored by `playerColors[sender_id]`.
    - Timestamp in JetBrains Mono, 9px, `text-secondary`.
    - Message text in JetBrains Mono, 11px, `text-primary`.
    - If `territory_id` is set, the territory name is rendered as a clickable link in gold (#FFD700) with underline on hover. Click calls `onTerritoryClick(territory_id)`.
    - Player's own messages (`sender_id === currentPlayerId`) aligned right. Others aligned left.
    - Auto-scroll to bottom on new message.
- **Input area:** Bottom of panel. Text input (JetBrains Mono, 12px, max 500 chars) + "Send" button. Placeholder changes based on active tab: "Type a message..." for Global, "DM Zhao..." for Zhao tab. Enter key sends. Button calls `onSendMessage(text, recipientId)` where `recipientId` is `null` for Global or the AI's ID for DM tabs.
- **Unread indicators:** If a tab receives new messages while not active, show a small colored dot (8px) on that tab. Clear when tab becomes active.

**Hotkey hints:** Small rounded squares (same style as Slice 5 hotkey hints) showing "Ctrl+1" through "Ctrl+4" near each tab label. "T" hint near the input field.

**Styling:** Background `bg-surface` (#1A1A2E). Border-left: 1px `#334455`. Collapsible via a toggle button in the header.

### 5.5 `StrategistAlerts.tsx` (MODIFIED)

**New alert type:** `chat_analysis`.

**Rendering for chat_analysis alerts:**
- Border-left color based on verification:
  - `confirmed`: `#44CC66` (green)
  - `contradicted`: `#FF4444` (red)
  - `unverifiable`: `#8899AA` (gray)
- Content:
  - Header: "Chat: {sender_name} ({channel})" in Orbitron, 10px, player color.
  - Body: "{analysis}" in JetBrains Mono, 11px, `text-primary`.
  - Recommended action badge: small pill with text "BELIEVE" / "IGNORE" / "INVESTIGATE" / "COUNTER". Colors: believe=green, ignore=red, investigate=gray, counter=gold.
- Dismissable like all other Strategist alerts (calls `onDismiss`).
- If `territory_id` is set, clicking the alert body calls `onAlertClick(territory_id)` for map highlight.

### 5.6 `App.tsx` (MODIFIED)

**New state:**
```typescript
const [activeChatTab, setActiveChatTab] = useState<'global' | 2 | 3 | 4>('global');
const [chatPanelOpen, setChatPanelOpen] = useState(true);
```

**New handlers:**
- `handleSendMessage(text: string, recipientId: number | null)`: calls `send_chat_message(1, text, recipientId, false, null)`. Human messages default to `is_deception = false` and `claimed_fact = null`.
- `handleChatTerritoryClick(territoryId: number)`: sets a territory highlight on the map (similar to ticker click, gold glow for 3 seconds).

**New hotkeys** (add to existing `keydown` handler in the `useEffect`):

```typescript
// Chat tab switching with Ctrl
if (e.ctrlKey) {
  switch (e.key) {
    case '1': setActiveChatTab('global'); e.preventDefault(); break;
    case '2': setActiveChatTab(2); e.preventDefault(); break;
    case '3': setActiveChatTab(3); e.preventDefault(); break;
    case '4': setActiveChatTab(4); e.preventDefault(); break;
  }
}

// Chat input focus
case 't': case 'T':
  if (chatPanelOpen) {
    focusChatInput();
    e.preventDefault();
  }
  break;
```

The `focusChatInput` function calls `.focus()` on the chat input element (using a ref passed to ChatPanel, or by exposing a focus method).

**Layout changes:**
- Add `ChatPanel` to the right side of the screen, opposite `IntelPanel` (which is on the left).
- ChatPanel visibility controlled by `chatPanelOpen` state. Add a small toggle button in the top-right area to open/close chat.
- Layout order (left to right): IntelPanel, Map (center), ChatPanel.

**Subscriptions:** Add `chatLog` from `useSubscriptions`.

**Pass props:**
- `ChatPanel`: `messages={chatLog}`, `currentPlayerId={1}`, `playerColors={PLAYER_COLORS}`, `onSendMessage={handleSendMessage}`, `onTerritoryClick={handleChatTerritoryClick}`, `activeTab={activeChatTab}`, `onTabChange={setActiveChatTab}`.
- `StrategistAlerts`: existing props unchanged. The component handles new `chat_analysis` alerts internally via the `alerts` data.

---

## 6. GENERATION RULES

1. **Modify existing files in place.** Read each file before modifying. Preserve all Slice 5 functionality not explicitly changed.
2. **Mark every output file** as MODIFIED or NEW at the top.
3. **All arithmetic is integer arithmetic.** No floats.
4. **SpacetimeDB macros:** `#[spacetimedb(table)]`, `#[spacetimedb(reducer)]`, `#[spacetimedb(scheduled)]`.
5. **Tailwind CSS for all styling.** Use design tokens from `../AESTHETIC.md`.
6. **No emojis. No em dashes. No custom CSS files.**
7. **The `is_deception` and `claimed_fact` columns MUST be stripped** from all `chat_log` subscription data before delivery to clients.
8. **Chat messages respect privacy:** DMs are only visible to sender and recipient.
9. **Claude safety filter mitigation:** Commander prompt includes game context framing and fallback-to-silence instruction.

---

## 7. WHAT NOT TO GENERATE

Generate everything specified. Do not add:
- New dimensions
- New AI opponents
- New card types
- New gameplay mechanics beyond chat and counter-intel

---

## 8. SUCCESS CRITERIA

After applying all modifications, the Slice 6 application must:

1. **Compile** — `cargo build` for server, `npm run build` for client. Zero errors.
2. **Render ChatPanel** — Four tabs (Global, Zhao, Consortium, Prophet). Message input and send button.
3. **Send and receive global messages** — Player messages appear. AI messages appear within 2 cycles.
4. **Send and receive DMs** — Private messages stay in the correct tab. Not visible in Global.
5. **AI uses both channels** — At least one AI sends DMs strategically.
6. **Territory links work** — Bracket syntax creates clickable links that highlight the map.
7. **Strategist analyzes chat** — Chat analysis alerts appear with verification status and recommendations.
8. **Trust system functions** — Trust scores update based on verified truths and caught lies.
9. **DM privacy maintained** — Player cannot see AI-to-AI DMs.
10. **Chat hotkeys work** — Ctrl+1/2/3/4 switch tabs. T focuses input.
11. **All Slice 5 functionality preserved** — Gameplay, orchestration, hotkeys unchanged.

---

## End of Slice 6 Masterplan

Read the existing Slice 5 codebase. Apply every modification specified above in the order specified. Output every changed file with MODIFIED or NEW at the top. Generate now.