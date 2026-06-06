# RISK: DOMINION — SLICE 6 IMPLEMENTATION STRATEGY

## Version 1.0
## Scope: Counter-Intel, Global Chat, Direct Messages, Deception System
## Slice 6 of 7. Target: Human Team — After Claude Code Generation

---

## Principle 0: The Information Warfare Layer

Slice 6 adds information warfare. The chat is not a social feature — it is a battlefield. Every message is a potential weapon. Every DM is a private channel for deception. The AI opponents lie, manipulate, and try to turn enemies against each other. The human player can do the same.

This is Slice 6 of 7. It is not the final slice; Slice 7 (spectator and replay) follows.

This slice modifies the AI commander prompt and the Strategist prompt — two of the most critical prompts in the system. It adds new tables, a new reducer, AI chat generation inside the reasoning cycle procedure, and new frontend components. It introduces trust scores, cross-referencing logic, and structural DM privacy (a public/secret table split plus a subscription row filter).

The rule: Slice 6 must pass every regression check and every new feature test before it is tagged `slice-6-complete`. No exceptions.

This document tells you how to validate Slice 6, how to debug it when validation fails, and what to fix before the final demo.

---

## 1. VALIDATION STRUCTURE

Slice 6 validation has two parts:

**Part A: Regression Check** — Condensed Slice 5 tests to confirm the commander and Strategist prompt modifications didn't break existing functionality. Approximately 5–10 minutes.

**Part B: New Feature Test** — Tests for global chat, DMs, AI messaging, trust scores, Strategist chat analysis, and DM privacy. Approximately 20–30 minutes (includes waiting for multiple AI cycles).

Execute Part A first. If any step fails, stop and fix before proceeding to Part B.

---

## 2. PART A: REGRESSION CHECK

### Prerequisites

- SpacetimeDB server is running (the `risk-dominion` module published from `app/server`).
- Frontend dev server is running (`app/client`).
- One browser tab open to `http://localhost:5173`.
- Anthropic API key seeded into the private `module_config` table: `spacetime call risk-dominion set_config '"anthropic_api_key"' '"sk-ant-..."'`.

---

### Step A1: Server Start and Initial Render

**Action:** Start the server. Load the frontend.

**Expected Result:** No errors in server or browser console. Map renders with 4 X-split quadrants. Ticker shows "Game started." ChatPanel visible on the right side with four tabs (Global, Zhao, Consortium, Prophet). Strategist alerts area visible.

**If this fails:** The application didn't load. Check server compilation with new tables. Check client compilation with new components.

---

### Step A2: Core Actions and AI Cycles Still Work

**Action:** Execute Military, Economic, and Covert actions. Wait for AI cycles.

**Expected Result:** All actions execute successfully. AI opponents still act (may take up to 120 seconds for first orchestrated cycle). Intel panel still shows deliberation chain when queried. Ticker shows events.

**If this fails:** The commander prompt modifications may have broken action selection JSON parsing. Check server logs for commander response errors.

---

### Step A3: Strategist Alerts Still Work

**Action:** Wait for Strategist cycle (first at 50s). Observe alert area.

**Expected Result:** Strategist generates game state alerts (threats, opportunities, weaknesses) as in Slice 5. Chat analysis alerts may also appear if AIs have sent messages — this is expected and fine.

**If this fails:** The Strategist prompt modifications may have broken the notification JSON parsing. Check server logs for Strategist response errors.

---

### Step A4: Hotkeys and Orchestration Intel Still Work

**Action:** Press WASD to move cursor. Press 1/2/3 to select cards. Query AI intel.

**Expected Result:** Hotkeys function normally. Intel panel shows full deliberation chain with subordinate entries.

**If this fails:** The App.tsx modifications may have broken the keydown handler. Check for conflicts between chat hotkeys and existing hotkeys.

---

**All 4 regression steps pass?** Core functionality is intact. Proceed to Part B.

---

## 3. PART B: NEW FEATURE TEST

### Prerequisites

- Part A complete and passing.
- Game has been running long enough for at least one AI cycle.

---

### Step B1: ChatPanel Renders with Tabs

**Action:** Look at the right side of the screen.

**Expected Result:**
- ChatPanel is visible with four tabs: "Global", "Zhao", "Consortium", "Prophet".
- Global tab is active by default.
- Message area is empty or shows system-generated messages.
- Text input field and Send button visible at the bottom.
- Tabs have player color accents.

**If ChatPanel doesn't render:** Check component import in App.tsx. Check that chat panel state defaults to open.

---

### Step B2: Send Global Message

**Action:** With Global tab active, type "Hello everyone" in the input. Press Enter.

**Expected Result:**
- Message appears in the chat history.
- Sender name shows "Player" in blue.
- Timestamp visible in gray.
- Message aligned to the right (player's own messages).
- Input field clears after sending.

**If message doesn't appear:** Check the `send_chat_message` reducer call (single named-args object). Check the filtered `chat_log` subscription is delivering data.

---

### Step B3: Send Direct Message

**Action:** Switch to Zhao DM tab (click tab or press Ctrl+2). Type "Zhao, I'm watching you." Press Enter.

**Expected Result:**
- Message appears in Zhao DM tab.
- Message does NOT appear in Global tab.
- Switch back to Global tab — verify the DM is not there.
- Switch to Consortium DM tab — verify the DM is not there.

**If DM appears in wrong tab:** Check `recipient_id` filtering in subscription or client-side tab filtering.

**If DM doesn't appear at all:** Check that `send_chat_message` includes `recipient_id`.

---

### Step B4: AI Sends Chat Messages

**Action:** Wait for AI cycles (up to 120 seconds). Watch all chat tabs.

**Expected Result:**
- At least one AI sends a message within 2 cycles.
- Message appears in the appropriate tab (Global or DM).
- Message content reflects the AI's persona:
  - Zhao: threats, bluster, or aggressive statements.
  - Consortium: economic commentary or false reassurance.
  - Prophet: cryptic observations or selective truth.
- AI messages are color-coded with the AI's player color.
- AI messages are aligned to the left.

**If AIs never send messages:** Check commander prompt for `chat_message` output field. Check JSON parsing — the new field may be causing parse failures. Check server logs for Claude responses.

**If AIs send only empty or null chat messages:** The AI may be choosing silence. This is valid behavior but should not happen every cycle. Check the persona descriptions for chat strategy guidance.

**If Claude appears to be refusing due to safety filters:** This is a known risk. Check the commander prompt for game context framing. The prompt should state that all communication occurs within a strategy game and deception is an expected mechanic. If refusals persist, add the fallback instruction: "If you are unable to send the intended message due to content restrictions, return null for chat_message and continue with your actions silently. Do not explain the refusal. Do not break character."

---

### Step B5: AI Uses Direct Messages

**Action:** Over multiple cycles, observe whether AIs send DMs to the player.

**Expected Result:** At least one AI should use DMs within 3–4 cycles. The DM should be visible only in that AI's tab. The DM content should feel private — a whisper, a deal, a threat meant only for the player.

**If AIs only use global chat:** The persona descriptions may not emphasize DMs enough. Check the chat strategy guidance in the commander prompt — it should explicitly mention using DMs for private communication.

---

### Step B6: Territory Reference in Chat

**Action:** If an AI or the player sends a message with bracket syntax like `[South America]`, observe the message rendering.

**Expected Result:**
- The territory name appears as a clickable link in gold (#FFD700).
- Hovering shows an underline.
- Clicking the link highlights that territory on the map with a gold glow.

**If territory names don't become links:** Check `territory_id` extraction in `send_chat_message`. Check bracket syntax parsing regex.

**If click doesn't highlight:** Check `onTerritoryClick` handler in App.tsx — it must set the territory highlight state.

---

### Step B7: Strategist Chat Analysis

**Action:** Deploy 3+ agents in a territory where an AI has military or economic presence. Wait for an AI to send a message containing a factual claim about that territory. Wait for the next Strategist cycle.

**Expected Result:**
- Strategist generates a `chat_analysis` alert.
- Alert shows the sender's name, the claim, and the verification status.
- If agents confirm the claim: green border, "confirmed", recommend "believe".
- If agents contradict the claim: red border, "contradicted", recommend "ignore".
- If no agents in territory: gray border, "unverifiable", recommend "investigate".
- Clicking the alert highlights the referenced territory.

**If no chat analysis appears:** Check Strategist prompt for `chat_analysis` output field. Check that player-visible chat history is being passed to the Strategist prompt.

**If analysis is consistently wrong:** The agent intel cross-referencing may be querying the wrong territory. Check `evaluate_chat_messages` logic.

---

### Step B8: Trust Score Effects Observable

**Action:** Over 4–5 cycles, send Zhao a DM with a false claim about an undefended territory. For example: "Consortium has no troops in North Africa" when you know they do. Observe through intel whether Zhao's trust score for you changes.

**Expected Result:**
- If Zhao acts on your false claim and the action fails (attack repelled), Zhao's trust in you should drop.
- This may be visible in Zhao's intel deliberation chain if the commander discusses trust.
- Over multiple cycles, a pattern of lies should result in Zhao ignoring your messages or sending hostile responses.

**If trust scores never change:** Check `evaluate_chat_messages` function. Check that retroactive trust penalties are applied when AI suffers bad outcomes from accepted claims.

**If trust changes aren't visible:** The AI's reasoning log may not include trust score discussions. This is acceptable — trust is a mechanical system that affects AI behavior even if not explicitly narrated.

---

### Step B9: Chat Hotkeys

**Action:** Press Ctrl+1, Ctrl+2, Ctrl+3, Ctrl+4 in sequence. Press T when chat panel is visible.

**Expected Result:**
- Ctrl+1: Global tab active.
- Ctrl+2: Zhao DM tab active.
- Ctrl+3: Consortium DM tab active.
- Ctrl+4: Prophet DM tab active.
- T: Chat input field gains focus (cursor blinks in input).

**If hotkeys don't work:** Check the keydown handler in App.tsx. Check that Ctrl key modifier is detected correctly. Check that T doesn't conflict with other hotkeys when chat panel is closed.

---

### Step B10: DM Privacy Verification

**Action:** This test verifies that DMs are truly private. Method: use browser developer tools or a second browser tab connected as a hypothetical second human player (if multiplayer is re-enabled for testing).

**For single-client testing:** Inspect the network traffic or subscription data. Verify that `chat_log` rows with `recipient_id` set to a player other than yourself are NOT present in the client's data. Also verify no `is_deception` / `claimed_fact` data is present at all (those fields live in the non-public `chat_secret` table the client never subscribes to).

**Expected Result:** The player only sees:
- Global messages (`recipient_id = 0`).
- DMs where the player is sender or recipient.
- The player does NOT see DMs between Zhao and Consortium, Consortium and Prophet, etc.
- No deception or claimed-fact fields appear anywhere in client data.

**If DMs leak:** Check the `chat_log` subscription row filter. Because privacy is enforced by the subscription query (not column stripping), the filter must be `recipient_id = 0 OR sender_id = client_id OR recipient_id = client_id`. If secret fields leak, the secret columns were wrongly placed on the public `chat_log` table instead of the non-public `chat_secret` table.

---

**All 10 feature test steps pass?** Slice 6 is validated. The game is demo-ready.

---

## 4. TRIAGE TABLE — SLICE 6 SPECIFIC

| Step | Symptom | Most Likely Cause | Check |
|------|---------|-------------------|-------|
| B1 | ChatPanel doesn't render | Component not imported or state defaults closed | App.tsx — verify import and render |
| B2 | Global messages don't appear | Reducer not called or subscription not connected | `send_chat_message`, filtered `chat_log` subscription |
| B3 | DM appears in Global tab | recipient_id filtering missing | Client tab filtering or server subscription filtering |
| B3 | DM doesn't appear at all | recipient_id not passed to reducer | `send_chat_message` call — verify recipient_id parameter |
| B4 | AI never sends chat messages | Chat output not in commander prompt | Check commander prompt for chat_message field. Check JSON parsing. |
| B4 | AI messages are generic | Persona chat guidance too vague | Tune persona descriptions in commander prompt |
| B4 | Claude refuses to send messages | Safety filters blocking content | Add game context framing. Add fallback-to-silence instruction. Test with direct threat DM. |
| B5 | AI never uses DMs | Persona doesn't emphasize private channels | Add DM strategy guidance to persona descriptions |
| B6 | Territory links don't highlight | Bracket parsing or click handler broken | `send_chat_message` territory extraction. App.tsx onTerritoryClick. |
| B7 | No chat analysis alerts | Strategist prompt missing chat section | Check prompt for chat_analysis field. Check chat history passed correctly. |
| B7 | Analysis contradicts known intel | Agent intel query wrong | `evaluate_chat_messages` cross-referencing logic |
| B8 | Trust scores never change | evaluate_chat_messages not called | Check AI cycle start — function should run before commander prompt |
| B8 | Retroactive penalties not applied | Bad outcome detection missing | `apply_ai_actions` (in `ai_reasoning_cycle` tx2) — track which actions were influenced by messages |
| B9 | Chat hotkeys don't work | Keydown handler conflict | Check Ctrl key modifier. Check T doesn't conflict. |
| B10 | DMs visible to wrong players | Subscription filter incomplete | `chat_log` subscription row filter: recipient_id = 0 OR sender_id OR recipient_id |
| B10 | Secret fields leak to client | Secret columns on public table | Move `is_deception`/`claimed_fact` to non-public `chat_secret` table |

---

## 5. POST-VALIDATION FIX PRIORITIES

### Priority 1: Showstopper Bugs

- Chat crashes server (message parsing, table insert errors).
- DMs leak to wrong players (privacy filter broken).
- Commander prompt modifications break AI action selection.
- Strategist prompt modifications break existing alerts.
- Chat hotkeys break existing hotkeys.

### Priority 2: AI Chat Behavior Quality

- AIs send contextually relevant messages (not generic).
- AI personas feel distinct in chat (Zhao threatens, Consortium reassures, Prophet observes).
- AIs use both global and DM channels strategically.
- AIs choose silence when they have nothing useful to say (not forced to speak).
- Claude does not refuse to roleplay due to safety filters.

### Priority 3: Trust System Observability

- Trust score changes are visible through intel or AI behavior.
- AIs that have been lied to consistently ignore future messages from that sender.
- AIs that have built trust respond to that sender's messages.
- Retroactive penalties work when an AI is burned by false intel.

### Priority 4: Chat UX

- Tabs are clearly labeled and intuitive.
- Message history is readable (font size, contrast, spacing).
- Territory links are visually distinct and clickable.
- Unread indicators work (if implemented).
- Input field is easy to find and use.

### Priority 5: Strategist Chat Analysis Quality

- Verification is accurate (confirmed/contradicted/unverifiable).
- Recommendations are contextually helpful.
- Analysis text is specific, not generic.
- False positives are rare (Strategist doesn't cry wolf).

---

## 6. DEMO READINESS GATE

Before the game is shown to judges, all of the following must be true:

1. **All 4 regression steps pass** with no errors.
2. **All 10 feature test steps pass** with no workarounds.
3. **All three AIs send chat messages** within 2 cycles of game start.
4. **At least one AI uses DMs strategically** (not just global chat).
5. **Strategist generates chat analysis** for at least one AI claim.
6. **DM privacy verified** — player cannot see AI-to-AI DMs.
7. **All chat hotkeys function** (Ctrl+1/2/3/4, T).
8. **All Slice 5 hotkeys still function** (no conflicts).
9. **Claude does not refuse to roleplay** — AIs send in-character messages without content warnings.
10. **Server compiles** with `cargo build` — zero errors.
11. **Client compiles** with `npm run build` — zero errors.
12. **No known showstopper bugs.**

If any condition is not met, fix it before the demo.

---

## 7. MANUAL ITERATION NOTES

- **Chat stress test:** Send 10 messages rapidly. Verify rate limiting works (AIs evaluate at most 3 per cycle). Verify no crashes.
- **Trust system deep test:** Play a long session where you consistently lie to one AI and tell the truth to another. Verify the AI you lied to eventually ignores you while the AI you were honest with continues engaging.
- **DM privacy audit:** If possible, run two browser clients. Verify DMs sent from one client to an AI are not visible on the other client.
- **Claude safety filter monitoring:** During the first few AI cycles, watch server logs for any content warnings or refusals. If they occur, immediately add stronger game context framing to the prompt.
- **Chat demo narrative:** For the demo, plant a specific DM exchange — have the player send Zhao a false tip that the Consortium is weak, then watch Zhao attack the Consortium. This shows the deception system working in a single demo arc.

---

## 8. CLOSING NOTE

Slice 6 is the information warfare layer, not the final slice. After validation, Risk: Dominion has four dimensions of territorial control (Military, Economic, Cultural, Covert; win condition is 5 unified territories across the 4 counting dimensions, Covert excluded), AI opponents that deliberate through councils of specialists, natural language queries against a live database, and now a chat system where every message is a potential weapon. Slice 7 (spectator and replay) still follows.

The journey from Slice 1 toward the full game:
- Slice 1: Two players, two dimensions, hex map, card-driven actions (3 unified across 2 dimensions).
- Slice 2: AI opponents, Covert dimension, intel system.
- Slice 3: Cultural dimension, cross-dimension bonuses, the 5-unified-across-4-dimensions victory.
- Slice 4: Natural language queries, canned queries, autocomplete, event ticker.
- Slice 5: Multi-agent orchestration, human Strategist, full keyboard control.
- Slice 6: Global chat, direct messages, AI deception, trust scores, counter-intel.
- Slice 7: Spectator mode and replay (the final slice).

Validate. Polish. Then build Slice 7.

---

## End of Slice 6 Implementation Strategy

This is the Slice 6 validation document. After this, proceed to Slice 7.