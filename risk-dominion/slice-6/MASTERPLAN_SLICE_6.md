# RISK: DOMINION — SLICE 6 MASTERPLAN

## Version 1.0
## Scope: Counter-Intel, Global Chat, Direct Messages, Deception System
## Slice 6 of 7. Target: Claude Code Generation — Extending the single `risk-dominion/app/` codebase (Slice 5 state)

---

## 0. DOCUMENT PURPOSE

This document specifies how to extend the working `risk-dominion/app/` codebase (as it stands after Slice 5, tagged `slice-5-complete`) to add the counter-intel and global chat system. Read this document in full. Read the existing `app/` codebase. Apply the changes specified here.

The canonical code is one evolving application at `risk-dominion/app/{server,client}` that grows each slice; each completed slice is tagged `slice-N-complete` in git. Do not create a new project or a per-slice copy. Modify the existing files in place. Mark each output file as MODIFIED or NEW.

This is Slice 6 of 7. It is not the final slice; Slice 7 (spectator and replay) follows.

---

## 1. BEFORE YOU BEGIN

Read every existing file in the `app/` codebase (Slice 5 state):
- `app/server/Cargo.toml`
- `app/server/src/lib.rs`
- `app/client/src/App.tsx`
- `app/client/src/constants.ts`
- `app/client/src/types.ts`
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
- `app/client/src/components/ActionBar.tsx`
- `app/client/src/components/VictoryScreen.tsx`

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

Generate changes in this sequence. Each file must only reference types and components that already exist in the `app/` codebase (Slice 5 state) or were generated earlier in this sequence.

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

Add to the TABLES section. NOTE the table split for chat privacy: SpacetimeDB has no per-subscriber column projection on a `public` table, so secret fields live in a separate non-`public` table that clients never subscribe to.

**`chat_log`** (public, client-facing — contains NO secret fields):
```rust
#[spacetimedb::table(accessor = chat_log, public)]
pub struct ChatLog {
    #[primary_key]
    #[auto_inc]
    pub id: u64,
    pub timestamp: i64,        // i64 millis: ctx.timestamp.to_micros_since_unix_epoch() / 1000
    pub sender_id: i32,
    pub recipient_id: i32,     // 0 = global broadcast; 1-4 = DM to that player
    pub message_text: String,
    pub territory_id: i32,     // 0 = none; otherwise the referenced territory
}
```

**`chat_secret`** (NOT `public`; server logic and the Strategist procedure only; clients NEVER subscribe to this):
```rust
#[spacetimedb::table(accessor = chat_secret)]
pub struct ChatSecret {
    #[primary_key]
    pub chat_id: u64,            // same value as the matching chat_log.id
    pub is_deception: bool,      // whether the sender intentionally lied
    pub claimed_fact: String,    // structured factual claim ("" if none)
}
```

Use `i32`/`u64` sentinels (`recipient_id == 0` for global, `territory_id == 0` for none, `claimed_fact == ""` for no claim) rather than `Option`, matching the Slice 1-5 reference idioms. `id` is `#[primary_key] #[auto_inc] u64`. `chat_secret.chat_id` is a non-`auto_inc` `#[primary_key]` set equal to the freshly inserted `chat_log.id`.

**`ai_trust`:**
```rust
// SpacetimeDB has no native composite primary key. Use a surrogate auto-inc id
// plus a multi-column btree index for lookups by (ai_player_id, target_player_id).
#[spacetimedb::table(
    accessor = ai_trust,
    public,
    index(accessor = by_pair, btree(columns = [ai_player_id, target_player_id]))
)]
pub struct AiTrust {
    #[primary_key]
    #[auto_inc]
    pub id: u64,
    pub ai_player_id: i32,       // the AI doing the trusting (2, 3, or 4)
    pub target_player_id: i32,   // the player being evaluated (1-4, not self)
    pub trust_score: i32,        // 0-100, starts at 50
    pub messages_evaluated: i32, // default 0
    pub truths_confirmed: i32,   // default 0
    pub lies_caught: i32,        // default 0
    pub last_updated: i64,       // i64 millis
}
```

Look up a relationship via the index, e.g. `tx.db.ai_trust().by_pair().filter((ai_player_id, target_player_id))` and update the returned row by its `id`. `ai_trust` may be `public` (it holds no message secrets and is useful for intel display); the privacy-critical fields live only in `chat_secret`.

### 4.2 New Reducer: `send_chat_message`

```rust
#[spacetimedb::reducer]
fn send_chat_message(
    ctx: &ReducerContext,
    sender_id: i32,
    message_text: String,
    recipient_id: i32,   // 0 = global, 1-4 = DM
    is_deception: bool,
    claimed_fact: String, // "" = no claim
) -> Result<(), String> {
    // Validate: game active, sender_id in 1..=4, message non-empty (max 500 chars),
    //   recipient_id in {0,1,2,3,4} and != sender_id when non-zero.
    //   On any failure return Err("msg".into()).
    // Extract territory_id by parsing message_text for [Territory Name] patterns
    //   against known territory names; 0 if none.
    // Insert into chat_log (id = 0 to auto-inc) with timestamp from ctx.timestamp.
    // Read back the inserted row's id, then insert the matching ChatSecret
    //   { chat_id: id, is_deception, claimed_fact }.
    // Return Ok(()).
}
```

Reducers cannot return data to the caller. The client does not receive a message id; it observes the new row via its `chat_log` subscription. Success is `Ok(())`; validation failure is `Err("msg".into())`.

Bracket parsing: iterate over territory names. For each name, check if `[name]` appears in `message_text`. If multiple, use the first one found.

This reducer is the ONLY way a chat message reaches `chat_log`. The human client calls it for player messages. AI chat is NOT produced by calling this reducer (see 4.4); it is written directly inside the AI reasoning cycle procedure's commit transaction.

### 4.3 Private Function: `evaluate_chat_messages`

`evaluate_chat_messages` is a private Rust function called inside the AI reasoning cycle procedure's transaction (via `ctx.with_tx`). It is NOT a reducer and NOT a procedure. It reads `chat_log` and `chat_secret`, cross-references against the AI's covert agents, and updates `ai_trust` rows in the same transaction.

```rust
// Called as: tx-scoped fn(tx, ai_player_id) -> ChatEvaluationSummary
// where tx is the &mut transaction handle from ctx.with_tx inside ai_reasoning_cycle.
fn evaluate_chat_messages(tx: &TxHandle, ai_player_id: i32) -> ChatEvaluationSummary {
    // 1. Query chat_log for unevaluated messages (timestamp > ai_trust.last_updated per sender).
    //    For each message, read its ChatSecret by chat_id to get claimed_fact / is_deception.
    // 2. Group by sender_id. Apply rate limit: max 3 messages per sender.
    // 3. For each message with a non-empty claimed_fact:
    //    a. Extract territory_id from the claim if possible.
    //    b. Read covert table: agent_count > 0 where owner_id = ai_player_id
    //       and territory_id matches the claimed territory.
    //    c. Determine verification:
    //       - Verified true: agents confirm. trust_score += 3 (cap 100). truths_confirmed += 1.
    //       - Proven false: agents contradict. trust_score -= 15 (floor 0). lies_caught += 1.
    //       - Unverifiable: no agents in territory. No trust change.
    //    d. Handle contradictions: if a sender sent conflicting public and private claims,
    //       evaluate each independently. Net trust reflects both.
    //    e. messages_evaluated += 1
    // 4. Apply decay: for senders with no messages, trust_score -= 1 (floor 25).
    // 5. Apply spam penalty: if sender had >3 messages, trust_score -= 2.
    // 6. Update last_updated = now (ctx.timestamp in millis, threaded into the fn).
    // 7. Return ChatEvaluationSummary with formatted results (a string for the prompt).
}
```

`ChatEvaluationSummary` is a plain Rust struct (no `#[derive(SpacetimeType)]` needed; it never crosses the wire). It is built in tx1 of the cycle and folded into the commander system prompt. All arithmetic is integer arithmetic.

### 4.4 Modified AI Commander Prompt and AI Chat Generation

AI chat is generated INSIDE the AI reasoning cycle procedure. There is no separate chat endpoint and no reducer involved. The commander's single Claude response (already produced by the existing `ai_reasoning_cycle` procedure via `ctx.http`) carries an optional `chat_message` field alongside its `actions`. When the procedure parses that response in its commit transaction (tx2, the same `ctx.with_tx` that applies actions), it writes the AI's chat directly into `chat_log` plus `chat_secret` (exactly the rows `send_chat_message` would write, but inserted in-procedure rather than via the reducer). Reducers (and `send_chat_message` specifically) are NOT used for AI chat.

Concretely, in `ai_reasoning_cycle`:
- tx1 (snapshot): call `evaluate_chat_messages(tx, ai_id)` to update trust and produce the summary, then build the commander system prompt including chat history and trust scores.
- HTTP: the existing `anthropic_call(ctx, ...)` sends the prompt and returns the response text (procedures only; `ctx.http`).
- tx2 (commit): parse the response. Apply actions as today. If `chat_message` is non-null and passes the same validation as `send_chat_message`, insert the `chat_log` + `chat_secret` rows (extract `territory_id` the same way, stamp `timestamp` from `ctx.timestamp`).

In the AI reasoning cycle, after building the game state snapshot, specialist results, and chat evaluation summary, add these sections to the commander prompt:

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

This is the Claude response shape. When tx2 of `ai_reasoning_cycle` parses it, map the LLM's nullable fields onto the storage sentinels before inserting: `recipient_id` null -> `0`, `claimed_fact` null -> `""`, `territory_id` null/absent -> `0` (and re-derive `territory_id` from bracket parsing if the model omitted it). Write the `chat_log` row plus the matching `chat_secret` row directly in this transaction.

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

The Strategist cycle is a procedure (it calls Claude via `ctx.http`). It reads `chat_log` AND `chat_secret` inside its snapshot transaction, but it only feeds the Strategist messages the player can see: global messages and DMs involving the player. DMs between AI opponents are NOT included. The Strategist procedure may read `chat_secret` server-side (for example to ground its analysis), but it must never echo `is_deception` or `claimed_fact` back to the client; only the analysis text and verification verdict are surfaced.

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

### 4.6 Chat Privacy: Table Split + Subscription Query

SpacetimeDB has NO per-subscriber column projection on a `public` table, and a `public` table is fully readable by any subscriber. There is no way to "strip columns" or hide a column per client. Privacy is therefore enforced structurally by the table split from 4.1:

1. **Secret fields live in a separate non-`public` table.** `is_deception` and `claimed_fact` are in `chat_secret`, which is NOT `public`. Clients cannot and do not subscribe to it; only server-side procedure/fn logic (the AI cycle, the Strategist procedure) reads it. There is nothing to "strip" because the secret columns are never in the client-facing table.
2. **DM scoping is done with a subscription query, not column projection.** The client subscribes to `chat_log` with a row filter so it only receives global rows and DMs it is part of:
   ```sql
   SELECT * FROM chat_log
   WHERE recipient_id = 0
      OR sender_id = :client_player_id
      OR recipient_id = :client_player_id
   ```
   (`recipient_id = 0` means global.) The client never receives DM rows between other players because those rows never match its subscription query.
3. The client never sees DMs between other players, and never sees any deception or claimed-fact data.

### 4.7 Retroactive Trust Update

Retroactive trust adjustment happens inside `apply_ai_actions` (the private fn invoked within the AI reasoning cycle procedure's tx2), after processing action results:
- If any action was influenced by an accepted (unverified) claim from chat, and the action outcome was negative (attack failed, territory lost), apply retroactive penalty: `trust_score -= 10` (floor 0) for the sender whose claim led to the bad outcome.
- Track which actions were influenced by which messages using a temporary map built during this cycle's reasoning (in-procedure, not a table).

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

Note: generated TypeScript bindings use camelCase field names (Rust `sender_id` becomes `senderId`). The interfaces below mirror the wire shape; align names with the generated bindings from `spacetime generate`.

```typescript
export interface ChatLogRow {
  id: number;
  timestamp: number;
  senderId: number;
  recipientId: number;   // 0 = global, 1-4 = DM
  messageText: string;
  territoryId: number;    // 0 = none
  // is_deception and claimed_fact live in the non-public chat_secret table
  // and are NEVER part of client data
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

### 5.3 `useSubscriptions.ts` (MODIFIED)

Subscribe to `chat_log` with a row filter so the client only receives global rows and DMs it is part of (privacy is enforced by this query plus the table split; there is no column stripping). Using the generated bindings and React hooks:

```typescript
const [chatLog, chatReady] = useTable(tables.chatLog, {
  filter: `recipient_id = 0 OR sender_id = ${currentPlayerId} OR recipient_id = ${currentPlayerId}`,
});
```

Include `chatLog` in the returned object. The non-public `chat_secret` table has no generated client binding and is never subscribed.

### 5.4 `ChatPanel.tsx` (NEW)

**Position:** Right side of the screen, collapsible sidebar opposite IntelPanel.

**Props:** `messages: ChatLogRow[]`, `currentPlayerId: number`, `playerColors: Record<number, string>`, `onSendMessage: (text: string, recipientId: number | null) => void`, `onTerritoryClick: (territoryId: number) => void`, `activeTab: 'global' | 2 | 3 | 4`, `onTabChange: (tab: 'global' | 2 | 3 | 4) => void`.

**Layout:**
- **Tab bar:** Four tabs — "Global", "Zhao", "Consortium", "Prophet". Active tab highlighted with that player's color from `playerColors`. Inactive tabs in `text-secondary`.
- **Message area:** Scrollable container. Messages filtered by active tab:
  - Global tab: `recipientId === 0`.
  - Player-specific tab: DMs between current player and that AI (`senderId` or `recipientId` matches).
  - Each message rendered as a row:
    - Sender name in Orbitron, 10px, colored by `playerColors[senderId]`.
    - Timestamp in JetBrains Mono, 9px, `text-secondary`.
    - Message text in JetBrains Mono, 11px, `text-primary`.
    - If `territoryId` is non-zero, the territory name is rendered as a clickable link in gold (#FFD700) with underline on hover. Click calls `onTerritoryClick(territoryId)`.
    - Player's own messages (`senderId === currentPlayerId`) aligned right. Others aligned left.
    - Auto-scroll to bottom on new message.
- **Input area:** Bottom of panel. Text input (JetBrains Mono, 12px, max 500 chars) + "Send" button. Placeholder changes based on active tab: "Type a message..." for Global, "DM Zhao..." for Zhao tab. Enter key sends. Button calls `onSendMessage(text, recipientId)` where `recipientId` is `0` for Global or the AI's ID for DM tabs.
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
- If `territoryId` is non-zero, clicking the alert body calls `onAlertClick(territoryId)` for map highlight.

### 5.6 `App.tsx` (MODIFIED)

**New state:**
```typescript
const [activeChatTab, setActiveChatTab] = useState<'global' | 2 | 3 | 4>('global');
const [chatPanelOpen, setChatPanelOpen] = useState(true);
```

**New handlers:**
- `handleSendMessage(text: string, recipientId: number)`: calls the `send_chat_message` reducer via the `useReducer(reducers.sendChatMessage)` hook with a single named-args object: `sendChatMessage({ senderId: 1, messageText: text, recipientId, isDeception: false, claimedFact: '' })`. Human messages default to `isDeception = false` and `claimedFact = ''` (recipientId 0 = global). The call returns a `Promise<void>`; the new message appears via the `chatLog` subscription, not from a return value.
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

**Subscriptions:** Add `chatLog` (the filtered `chat_log` subscription) from `useSubscriptions`.

**Pass props:**
- `ChatPanel`: `messages={chatLog}`, `currentPlayerId={1}`, `playerColors={PLAYER_COLORS}`, `onSendMessage={handleSendMessage}`, `onTerritoryClick={handleChatTerritoryClick}`, `activeTab={activeChatTab}`, `onTabChange={setActiveChatTab}`.
- `StrategistAlerts`: existing props unchanged. The component handles new `chat_analysis` alerts internally via the `alerts` data.

---

## 6. GENERATION RULES

1. **Modify existing files in place** within `risk-dominion/app/`. Read each file before modifying. Preserve all Slice 5 functionality not explicitly changed.
2. **Mark every output file** as MODIFIED or NEW at the top.
3. **All arithmetic is integer arithmetic.** No floats.
4. **SpacetimeDB macros (2.4.1):** `#[spacetimedb::table(accessor = name, public)]` on a `pub struct` with column attrs `#[primary_key]`, `#[auto_inc]`, and table-level `index(accessor = ..., btree(columns = [...]))`; `#[spacetimedb::reducer] fn f(ctx: &ReducerContext, ...) -> Result<(), String>`; scheduled work uses a scheduled table `scheduled(target_fn)`. AI chat is written inside the `ai_reasoning_cycle` procedure (`#[spacetimedb::procedure]`, `ctx.http`, `ctx.with_tx`), never by a reducer.
5. **Tailwind CSS for all styling.** Use design tokens from `../AESTHETIC.md`.
6. **No emojis. No em dashes. No custom CSS files.**
7. **Chat privacy is enforced by a table split, not column stripping.** SpacetimeDB has no per-subscriber column projection on a `public` table. Secret fields (`is_deception`, `claimed_fact`) live in the non-`public` `chat_secret` table that clients never subscribe to; the public `chat_log` holds only non-secret fields.
8. **DM scoping uses a subscription row filter:** `recipient_id = 0 OR sender_id = :client OR recipient_id = :client`. DMs are only visible to sender and recipient.
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

Read the existing `app/` codebase (Slice 5 state). Apply every modification specified above in the order specified. Output every changed file with MODIFIED or NEW at the top. Generate now.