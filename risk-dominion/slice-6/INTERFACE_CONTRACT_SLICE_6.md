# RISK: DOMINION — SLICE 6 INTERFACE CONTRACT

## Version 1.0
## Scope: Counter-Intel, Global Chat, Direct Messages, Deception System
## Slice 6 of 7. Target: Claude Code Generation — Extending the single `risk-dominion/app/` codebase (Slice 5 state)

---

## 0. HOW TO READ THIS DOCUMENT

This document specifies every table, reducer, subscription, component, prompt change, and hotkey binding that is **new or modified** in Slice 6. It does not repeat Slice 1–5 specifications.

**All prior tables, reducers, subscriptions, and constants remain in effect unless this document explicitly modifies them.** If a component is not mentioned here, it is unchanged from Slice 5.

---

## 1. NEW TABLES

Chat privacy is enforced by a TABLE SPLIT, not by hiding columns. SpacetimeDB has no per-subscriber column projection on a `public` table, so the secret fields live in a separate non-`public` table (`chat_secret`) that clients never subscribe to. The public client-facing table (`chat_log`) holds only non-secret fields.

### 1.1 `chat_log` (public, client-facing)

| Column | Rust type | Attributes | Description |
|--------|-----------|------------|-------------|
| `id` | `u64` | `#[primary_key] #[auto_inc]` | Unique message ID |
| `timestamp` | `i64` | | Unix timestamp (ms), `ctx.timestamp.to_micros_since_unix_epoch() / 1000` |
| `sender_id` | `i32` | | Player who sent the message (1-4) |
| `recipient_id` | `i32` | | 0 = global broadcast. 1-4 = DM to that player. |
| `message_text` | `String` | | The message content |
| `territory_id` | `i32` | | Territory referenced via bracket syntax (0 = none), for map highlight |

```rust
#[spacetimedb::table(accessor = chat_log, public)]
pub struct ChatLog { /* fields above */ }
```

### 1.2 `chat_secret` (NOT public, server-only)

| Column | Rust type | Attributes | Description |
|--------|-----------|------------|-------------|
| `chat_id` | `u64` | `#[primary_key]` | Equals the matching `chat_log.id` |
| `is_deception` | `bool` | | Whether sender intentionally lied. NEVER reaches clients. |
| `claimed_fact` | `String` | | Structured claim for cross-referencing ("" = none). NEVER reaches clients. |

```rust
#[spacetimedb::table(accessor = chat_secret)]  // no `public` -> no client subscription, no client binding
pub struct ChatSecret { /* fields above */ }
```

**Visibility rules:**
- Global messages (`recipient_id == 0`): visible to all players via the `chat_log` subscription.
- DMs (`recipient_id != 0`): the client subscription query (Section 6) only matches rows where the client is sender or recipient, so DMs are visible only to sender and recipient.
- `is_deception` and `claimed_fact` never reach any client: they are not columns of `chat_log` at all; they live in the non-`public` `chat_secret` table read only by server-side procedure/fn logic (AI cycle, Strategist procedure).

### 1.3 `ai_trust`

SpacetimeDB has no native composite primary key. Use a surrogate `#[primary_key] #[auto_inc] id: u64` plus a multi-column btree index on `(ai_player_id, target_player_id)`.

| Column | Rust type | Attributes | Description |
|--------|-----------|------------|-------------|
| `id` | `u64` | `#[primary_key] #[auto_inc]` | Surrogate key |
| `ai_player_id` | `i32` | | The AI doing the trusting (2, 3, or 4) |
| `target_player_id` | `i32` | | The player being evaluated (1-4, not self) |
| `trust_score` | `i32` | | Trust score 0-100. Starts at 50 (neutral). |
| `messages_evaluated` | `i32` | | Total messages evaluated from this sender (default 0) |
| `truths_confirmed` | `i32` | | Claims verified true by own agents (default 0) |
| `lies_caught` | `i32` | | Claims proven false by own agents (default 0) |
| `last_updated` | `i64` | | Unix timestamp (ms) of last update |

```rust
#[spacetimedb::table(
    accessor = ai_trust,
    public,
    index(accessor = by_pair, btree(columns = [ai_player_id, target_player_id]))
)]
pub struct AiTrust { /* fields above */ }
```

Look up a relationship via `tx.db.ai_trust().by_pair().filter((ai_player_id, target_player_id))`, mutate the returned row, and write it back by its `id`.

---

## 2. NEW CLIENT-FACING REDUCERS

### 2.1 `send_chat_message(ctx, sender_id: i32, message_text: String, recipient_id: i32, is_deception: bool, claimed_fact: String)`

```rust
#[spacetimedb::reducer]
fn send_chat_message(
    ctx: &ReducerContext,
    sender_id: i32,
    message_text: String,
    recipient_id: i32,    // 0 = global, 1-4 = DM
    is_deception: bool,
    claimed_fact: String, // "" = no claim
) -> Result<(), String>
```

**Called by:** The frontend when the human player sends a message. This reducer is for the HUMAN player only. AI chat is NOT produced by calling this reducer; it is written directly inside the `ai_reasoning_cycle` procedure's commit transaction (see Section 4).

**Validation (return `Err("msg".into())` on failure):**
1. The game must be active.
2. `sender_id` must be 1-4.
3. `message_text` must be non-empty, max 500 characters.
4. `recipient_id` must be 0 (global) or 1-4; if non-zero it must not equal `sender_id`.

**Behavior:**
1. Extract `territory_id` from bracket syntax in `message_text`. Look for patterns like `[South America]` or `[North Africa]`. Match against territory names. If found, set `territory_id`; otherwise 0.
2. Insert a row into `chat_log` (`id = 0` to auto-inc):
   - `timestamp` from `ctx.timestamp` in millis
   - `sender_id`, `recipient_id`, `message_text`, `territory_id` as resolved
3. Read back the inserted row's `id`, then insert a matching `chat_secret` row `{ chat_id: id, is_deception, claimed_fact }`. For human messages the player can optionally flag their own deception/claim for Strategist tracking; defaults are `false` / `""`.
4. Return `Ok(())`.

**Returns:** Nothing to the caller. Reducers cannot return data to clients; the client observes the new message through its `chat_log` subscription. Success is `Ok(())`; validation failure is `Err("msg".into())`.

---

## 3. INTERNAL FUNCTIONS

### 3.1 `evaluate_chat_messages(tx, ai_player_id: i32) -> ChatEvaluationSummary`

**Called by:** The `ai_reasoning_cycle` procedure, inside its snapshot transaction (`ctx.with_tx`, tx1), at the start of each cycle before the commander prompt is built.

**Not a reducer and not a procedure.** A private Rust function that runs within the procedure's transaction. It receives the `&mut` transaction handle so it can read `chat_log` / `chat_secret` and write `ai_trust` rows in the same tx. `ChatEvaluationSummary` is a plain Rust struct (no `#[derive(SpacetimeType)]`); it never crosses the wire, it is folded into the commander prompt string.

**Behavior:**
1. Query `chat_log` for messages the AI hasn't evaluated yet (timestamp since `ai_trust.last_updated` for each sender). For each message, read its `chat_secret` by `chat_id` to obtain `claimed_fact` / `is_deception`.
2. Separate messages by sender. Apply rate limit: evaluate at most 3 messages per sender. Ignore excess.
3. For each message with a non-empty `claimed_fact`:
   - Cross-reference `claimed_fact` against the AI's agent network (covert table where `owner_id = ai_player_id`).
   - Determine verification status:
     - **Verified true:** AI's agents confirm the claim. `trust_score += 3` (cap 100). `truths_confirmed += 1`.
     - **Proven false:** AI's agents contradict the claim. `trust_score -= 15` (floor 0). `lies_caught += 1`.
     - **Unverifiable:** AI has no agents in relevant territory. No trust change.
   - If a sender contradicts themselves across public and private channels (public says X, DM says Y), evaluate both independently. The net trust change reflects both evaluations.
   - `messages_evaluated += 1` for each message processed.
4. Apply decay: for each sender with no messages evaluated this cycle, `trust_score -= 1` (floor 25).
5. Apply spam penalty: if any sender had more than 3 messages in this cycle, `trust_score -= 2` per excess message evaluated (only applied once per cycle per sender).
6. Update `last_updated = now` for all evaluated relationships.
7. Return a `ChatEvaluationSummary` containing:
   - For each sender: current trust score, verification results for each message, any contradictions found.
   - Formatted as a string for inclusion in the commander prompt.

### 3.2 Retroactive Trust Update

When an AI acts on an **accepted** (unverified but believed) claim and the outcome is negative:
- If the AI attacked based on a DM claiming a territory was undefended, and the attack failed: `trust_score -= 10` (floor 0) for that sender.
- Applied inside `apply_ai_actions` (the private fn invoked within the `ai_reasoning_cycle` procedure's commit transaction, tx2) when action results are processed.
- This requires tracking which actions were influenced by which messages. Hold this in an in-procedure temporary map during the cycle (not a table).

---

## 4. MODIFIED AI COMMANDER PROMPT AND AI CHAT GENERATION

AI chat is generated INSIDE the `ai_reasoning_cycle` procedure. There is no separate AI-chat endpoint and no reducer is involved. The commander's single Claude response (already produced by the existing procedure via `ctx.http`) carries an optional `chat_message` field alongside its `actions`. The procedure's commit transaction (tx2, the same `ctx.with_tx` that applies actions) parses that field and, if present and valid, writes the `chat_log` plus `chat_secret` rows directly. This is the only place AI chat is written; `send_chat_message` (Section 2) is for the human player only.

Cycle flow:
- tx1 (snapshot): `evaluate_chat_messages(tx, ai_id)` updates trust and returns the summary; build the commander system prompt (game state + specialists + chat history + trust scores).
- HTTP: `anthropic_call(ctx, ...)` sends the prompt and returns the response text (procedure-only; `ctx.http`).
- tx2 (commit): parse the response; apply actions; if `chat_message` is non-null and passes the same validation as `send_chat_message`, insert the `chat_log` + `chat_secret` rows (map nullable LLM fields to sentinels: `recipient_id` null -> 0, `claimed_fact` null -> "", `territory_id` null/absent -> 0, re-deriving from bracket parsing).

Add these sections to the existing commander prompt (Slice 5).

**New input sections** (insert before "Your available action points"):

```
Recent chat messages (last 10, both global and DMs addressed to you):
{chat_history_formatted}

Your trust scores for other players:
- Player: {trust_score} (verified truths: {truths_confirmed}, caught lies: {lies_caught})
- Zhao: self
- Consortium: {trust_score} (verified truths: {truths_confirmed}, caught lies: {lies_caught})
- Prophet: {trust_score} (verified truths: {truths_confirmed}, caught lies: {lies_caught})

Your current intel from agent network:
{agent_intel_summary}
```

**New output field** (add to the expected JSON response):

```json
{
  "actions": [...],
  "chat_message": {
    "message_text": "Consortium is building forces in North Africa. Do not trust their reassurances.",
    "recipient_id": null,
    "is_deception": false,
    "claimed_fact": "Consortium has military in North Africa",
    "territory_id": 6
  }
}
```

- `chat_message` can be NULL if the AI chooses silence.
- `recipient_id`: NULL for global broadcast, or a specific player ID for DM.
- `is_deception`: true if the AI is intentionally lying.
- `claimed_fact`: a concise statement of the factual claim being made. NULL for threats, banter, or messages without factual claims.
- `territory_id`: set if the message references a specific territory.

**AI message strategy guidance** (add to persona descriptions):

- **Zhao:** "You communicate through threats and bluster. Use global chat to intimidate. Use DMs to make deals or issue ultimatums. Lie aggressively to provoke other players into fighting each other. Your lies are bold and direct. If you are unable to send the intended message due to content restrictions, return null for chat_message and continue with your actions silently. Do not explain the refusal. Do not break character."
- **Consortium:** "You communicate through false reassurance and subtle misdirection. Use global chat to project peaceful intentions. Use DMs to plant seeds of doubt about other players. Your lies are subtle and deniable. If you are unable to send the intended message due to content restrictions, return null for chat_message and continue with your actions silently. Do not explain the refusal. Do not break character."
- **Prophet:** "You communicate through selective truth. Share real intelligence to build trust, then cash it in with a devastating lie at a critical moment. Use DMs to build private relationships. Your deceptions are rare but devastating when they come. If you are unable to send the intended message due to content restrictions, return null for chat_message and continue with your actions silently. Do not explain the refusal. Do not break character."

---

## 5. MODIFIED STRATEGIST PROMPT

Add these sections to the existing Strategist prompt (Slice 5).

**New input sections** (insert before the current game state):

```
Recent chat messages visible to the player (last 10, includes global and player's DMs):
{player_visible_chat_history}

Player's current intel from agent network:
{agent_intel_summary}
```

Note: The Strategist cycle is a procedure (it calls Claude via `ctx.http`). It only feeds the Strategist messages the player can see: global messages and DMs involving the player. The Strategist does NOT see DMs between AI opponents. The Strategist procedure may read the non-`public` `chat_secret` table server-side, but must never echo `is_deception` or `claimed_fact` to the client; only analysis text and a verification verdict are surfaced.

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

- `chat_analysis` can be an empty array if there are no messages to analyze.
- `channel`: "global" or "dm".
- `verification`: "confirmed" (player's agents agree), "contradicted" (player's agents disagree), "unverifiable" (no agents in relevant territory).
- `recommended_action`: "believe", "investigate" (deploy agents to verify), "ignore", "counter" (respond with your own message).

---

## 6. NEW SUBSCRIPTIONS

### 6.1 `chat_log` subscription (with row filter)

| Subscription | Table | Client Usage |
|-------------|-------|--------------|
| `chat_log` (filtered) | `chat_log` | Render ChatPanel message history |

There is no per-subscriber column projection in SpacetimeDB and no server function "strips columns". Privacy is structural:

- **Secret fields are not in `chat_log` at all.** `is_deception` and `claimed_fact` live in the non-`public` `chat_secret` table, which clients cannot subscribe to and which has no generated client binding. There is nothing to strip.
- **DM scoping is a subscription row filter.** The client subscribes to `chat_log` with:
  ```sql
  SELECT * FROM chat_log
  WHERE recipient_id = 0
     OR sender_id = :client_player_id
     OR recipient_id = :client_player_id
  ```
  (`recipient_id = 0` = global.) DM rows between other players never match, so they never reach the client.

**Client-side:** Subscribe via the generated bindings / React `useTable` hook with the row filter above. Render in ChatPanel.

---

## 7. CLIENT MODIFICATIONS

### 7.1 `ChatPanel.tsx` (NEW)

**Position:** Right side of the screen, or collapsible sidebar opposite IntelPanel.

**Props:** `messages: ChatLogRow[]`, `currentPlayerId: number`, `onSendMessage: (text: string, recipientId: number) => void`, `onTerritoryClick: (territoryId: number) => void`.

**Layout:**
- **Tab bar at top:** Four tabs — "Global", "Zhao", "Consortium", "Prophet". Active tab highlighted with that player's color.
- **Message area:** Scrollable message history filtered by active tab.
  - Global tab: shows all messages where `recipientId === 0`.
  - Player-specific tabs: shows DMs between current player and that AI.
  - Each message: sender name (color-coded), timestamp (small, gray), message text. If `territoryId` is non-zero, the territory name is a clickable link that calls `onTerritoryClick`.
  - Player's own messages aligned right. Others aligned left.
  - Auto-scroll to newest on new message.
- **Input area at bottom:** Text input field + Send button. Placeholder: "Type a message..." or "DM Zhao..." depending on active tab. Enter sends. Max 500 characters.
- **Unread indicators:** If a tab has new messages since last viewed, show a small colored dot on the tab.

**Hotkeys:**
- `Ctrl+1`: Global tab
- `Ctrl+2`: Zhao DM tab
- `Ctrl+3`: Consortium DM tab
- `Ctrl+4`: Prophet DM tab
- `T`: Focus chat input (when chat panel is open)

**Styling:** Dark surface background. Messages use JetBrains Mono, 11px. Sender names in Orbitron, 10px, player color. Timestamps in text-secondary, 9px. Territory links in gold (#FFD700) with underline on hover.

### 7.2 `StrategistAlerts.tsx` (MODIFIED)

**New alert type:** `chat_analysis`.

**Rendering for chat_analysis alerts:**
- Border-left color based on verification:
  - `confirmed`: green (#44CC66)
  - `contradicted`: red (#FF4444)
  - `unverifiable`: gray (#8899AA)
- Content:
  - Header: "Chat Analysis: {sender_name} ({channel})" in Orbitron, 10px.
  - Body: "{analysis}" in JetBrains Mono, 11px.
  - Recommended action as a small badge: "IGNORE", "BELIEVE", "INVESTIGATE", "COUNTER".
- Dismissable like all other Strategist alerts.
- Clicking the alert body highlights the referenced territory if `territoryId` is non-zero.

### 7.3 `App.tsx` (MODIFIED)

**New state:**
```typescript
const [activeChatTab, setActiveChatTab] = useState<'global' | 2 | 3 | 4>('global');
const [chatPanelOpen, setChatPanelOpen] = useState(true);
```

**New handlers:**
- `handleSendMessage(text: string, recipientId: number)`: calls the `send_chat_message` reducer via `useReducer(reducers.sendChatMessage)` with a single named-args object: `sendChatMessage({ senderId: currentPlayerId, messageText: text, recipientId, isDeception: false, claimedFact: '' })` (recipientId 0 = global). Human messages default to `isDeception = false` / `claimedFact = ''`. The call returns `Promise<void>`; the new message appears via the `chatLog` subscription.
- `handleChatTerritoryClick(territoryId: number)`: highlights the territory on the map (similar to ticker click).

**New hotkeys (add to existing keydown handler):**
```typescript
case 't': case 'T': focusChatInput(); break;
// Ctrl+1 through Ctrl+4
if (e.ctrlKey) {
  switch (e.key) {
    case '1': setActiveChatTab('global'); break;
    case '2': setActiveChatTab(2); break;
    case '3': setActiveChatTab(3); break;
    case '4': setActiveChatTab(4); break;
  }
}
```

**Layout changes:** Add `ChatPanel` to the right side of the screen, opposite `IntelPanel`.

**Subscriptions:** Add `chatLog` (the filtered `chat_log` subscription) from `useSubscriptions`.

**Pass props:**
- `ChatPanel`: `messages={chatLog}`, `currentPlayerId`, `onSendMessage`, `onTerritoryClick`.
- `StrategistAlerts`: existing props unchanged. The component handles new `chat_analysis` alert type internally.

### 7.4 `useSubscriptions.ts` (MODIFIED)

Subscribe to `chat_log` with the privacy row filter (no column stripping; the secret table is never subscribed):
```typescript
const [chatLog, chatReady] = useTable(tables.chatLog, {
  filter: `recipient_id = 0 OR sender_id = ${currentPlayerId} OR recipient_id = ${currentPlayerId}`,
});
```

Include `chatLog` in the returned object.

### 7.5 `constants.ts` (MODIFIED)

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

### 7.6 `types.ts` (MODIFIED)

Add (generated bindings use camelCase; align with `spacetime generate` output):
```typescript
export interface ChatLogRow {
  id: number;
  timestamp: number;
  senderId: number;
  recipientId: number;   // 0 = global, 1-4 = DM
  messageText: string;
  territoryId: number;    // 0 = none
  // is_deception and claimed_fact live in the non-public chat_secret table
  // and are NEVER present in client data
}

export interface ChatAnalysisAlert {
  messageId: number;
  senderName: string;
  channel: 'global' | 'dm';
  claim: string;
  verification: 'confirmed' | 'contradicted' | 'unverifiable';
  analysis: string;
  recommendedAction: 'believe' | 'investigate' | 'ignore' | 'counter';
  territoryId: number;   // 0 = none
}
```

---

## 8. IMPLEMENTATION NOTES FOR CLAUDE CODE

### 8.1 Server

- Modify `app/server/src/lib.rs` (Slice 5 state).
- Add `chat_log` (public), `chat_secret` (non-public), and `ai_trust` (surrogate id + btree index) tables.
- Add the `send_chat_message` reducer (human player only).
- Add `evaluate_chat_messages` as a private fn run inside the `ai_reasoning_cycle` procedure transaction.
- AI chat is written inside `ai_reasoning_cycle`'s commit tx (tx2) from the commander's `chat_message` field, never via a reducer.
- Modify the commander prompt construction to include chat history, trust scores, agent intel summary, and chat output format.
- Modify the Strategist prompt construction (a procedure) to include player-visible chat history and chat analysis output.
- Chat evaluation runs in tx1 of `ai_reasoning_cycle`, before the commander prompt is built.
- Retroactive trust updates for bad outcomes are applied in `apply_ai_actions` (inside tx2) when action results are processed.
- Chat privacy is enforced by the table split (`chat_secret` is non-public) plus the `chat_log` subscription row filter; there is no column stripping and no per-subscriber projection.

### 8.2 Client

- Add `app/client/src/components/ChatPanel.tsx` as NEW.
- Modify `StrategistAlerts.tsx` to handle `chat_analysis` alert type.
- Modify `App.tsx` to add ChatPanel, chat state, chat hotkeys, and the filtered chat subscription.
- Modify `useSubscriptions.ts` to subscribe to `chat_log` with the privacy row filter.
- Modify `constants.ts` to add trust and chat constants.
- Modify `types.ts` to add `ChatLogRow` and `ChatAnalysisAlert`.

---

## 9. WHAT NOT TO GENERATE

This is Slice 6. Generate everything specified. Do not add:
- New dimensions
- New AI opponents
- New card types
- New gameplay mechanics beyond chat and counter-intel

---

## End of Slice 6 Interface Contract

Modify the `risk-dominion/app/` codebase (Slice 5 state) as specified. Output every new and modified file. Indicate NEW or MODIFIED at the top of each file.