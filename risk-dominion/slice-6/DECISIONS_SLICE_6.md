# RISK: DOMINION — SLICE 6 DESIGN DECISIONS

## Version 1.0
## Scope: Counter-Intel, Global Chat, Deception System
## Relationship: Extends DECISIONS_SLICE_5.md

---

## 0. HOW TO READ THIS DOCUMENT

This document describes what changes in Slice 6. It does not repeat everything from Slices 1 through 5.

**All prior principles remain in effect unless this document explicitly modifies them.** If a principle is not mentioned here, it is unchanged.

Slice 5 gave us AI opponents that deliberate through councils of specialists, a human Strategist advisor, and full keyboard controls. The game is strategically deep and technically impressive. Slice 6 adds a new dimension of warfare: deception. A global chat channel where every message is a potential weapon, every claim is a choice to trust or doubt, and every player — human and AI — can manipulate, deceive, and be deceived.

---

## 1. WHAT SLICE 6 CHANGES

| Slice 5 | Slice 6 |
|---------|---------|
| No communication between players | Global chat channel + private DMs between any two players |
| AI opponents act on known information | AI opponents lie, manipulate, and try to turn enemies against each other — in public and in private |
| Trust is not a mechanic | AIs maintain trust scores for every other player, updated by verifying claims from both public and private messages |
| Strategist analyzes game state | Strategist also analyzes chat messages and DMs — flagging likely deceptions |
| Information comes from agents or queries | Information also comes from messages that may or may not be true, sent publicly or whispered privately |

---

## 2. NEW PRINCIPLE

### Principle 14: Truth is a Weapon

In the real world, intelligence agencies do not just gather information. They plant it. Deception is as powerful as discovery. A well-placed lie can redirect an army. A trusted voice can start a war.

Slice 6 adds a global chat channel. Every player — the human and all three AI opponents — can send messages visible to everyone. Messages carry no inherent truth value. "Zhao is massing troops on your border" might be a genuine warning from a concerned neutral party. Or it might be a lie designed to provoke you into attacking Zhao while the real sender prepares to strike somewhere else.

The AI opponents play this game too. They lie. They flatter. They threaten. They try to turn you against your enemies, and your enemies against each other. The Consortium might privately message you — through the global chat, visible to all — claiming that the Prophet is about to attack your economic holdings. The Consortium might be telling the truth. Or it might want you to fight the Prophet while the Consortium quietly buys up both of your territories.

All of this happens in two channels. The global chat is visible to everyone. Direct messages are private, one-to-one conversations between any two players. The AIs use both. Zhao might publicly threaten the Consortium while privately DMing the player: "I'm about to attack the Consortium. Stay out of my way." That DM might be genuine — a warlord showing respect to a neutral party. Or it might be a lie designed to keep the player distracted while Zhao attacks somewhere else. Private deception is more powerful than public deception because there are no witnesses to hold the liar accountable.

When an AI receives conflicting information — a public statement that contradicts a private DM from the same sender — it cross-references both against its own intelligence. If the AI's agents confirm the truth, the liar is penalized for the public lie but the private honesty is noted. A player can build trust privately while maintaining a public facade, but contradictions will be caught if the target has good intel. Trust is per relationship, built or broken one message at a time, across both channels.

Each AI has a distinct communication style shaped by its persona. Zhao threatens and blusters. He lies aggressively to provoke conflicts between other players. The Consortium offers false reassurances and subtle misdirection. The Prophet shares selective truths — real intelligence designed to direct your attention where the Prophet wants it, away from where the Prophet is actually operating.

The AI opponents understand that all communication occurs within a strategy game. Deception, bluffing, and manipulation are expected and consented-to mechanics. The system prompt explicitly frames chat as gameplay, not real-world statements. If an AI is unable to generate a message due to content restrictions, it falls back to silence rather than breaking character.

**How AIs decide what to believe.** Every AI maintains a trust score for every other player. Trust starts at 50 — neutral. When an AI receives a message containing a factual claim, it cross-references that claim against its own intelligence network. If the AI's agents confirm the claim is true, the sender's trust score increases. If the AI's agents prove the claim is false, the sender's trust score drops significantly. If the AI cannot verify the claim — it has no agents in the relevant territory — it weighs the message based on the sender's current trust score. Trusted senders get the benefit of the doubt. Untrusted senders are ignored.

There is a distinction between information that is verified by the AI's own agents and information that is merely accepted because a trusted sender said it. Verified information fully updates the AI's strategic model. Accepted information influences decisions but with lower confidence. If an accepted claim leads the AI into a bad outcome — it attacks based on false intelligence and loses — the sender's trust score suffers more than if a verified claim turned out wrong.

Trust decays slowly over time if a sender goes silent. Trust recovers slowly after being damaged. A player who lies early and gets caught will be doubted for the rest of the game. A player who builds a reputation for honesty can cash it in later with a devastating lie.

**Rate limiting.** AIs are not naive. If a player floods the chat with dozens of messages, the AI evaluates at most three messages per sender per cycle. Excess messages are ignored. A sender who consistently spams the chat sees their trust score decay faster. The AI values quality over quantity.

DMs are subject to the same rate limits and evaluation logic as public messages. The AI evaluates at most three messages total per sender per cycle, regardless of channel. A player who floods both public chat and DMs is treated the same as a player who floods one — excess messages are ignored, trust decays faster.

**How the human player participates.** A chat panel shows the message history from all players, color-coded by sender. The player types freeform messages. These go to everyone. The player can reference specific territories using bracket syntax — `[South America]` — which highlights that territory on the map for anyone reading the message.

The player can lie freely, just like the AIs. There is no mechanical truth enforcement. No system labels messages as true or false. Belief is always a choice.

**The Strategist helps.** The human player's Strategist advisor — already watching the game state from Slice 5 — now also watches the chat. When an AI sends a message containing a factual claim, the Strategist cross-references it against the player's own agent network. If Zhao claims the Consortium is massing troops in North Africa, and the player's agents in North Africa show minimal Consortium military presence, the Strategist flags it: "Zhao claims Consortium is building forces in North Africa. Your agents show no evidence of this. Zhao may be trying to provoke you."

The Strategist's chat analysis appears as a new type of alert, alongside the existing threat and opportunity notifications. The player can also ask the Strategist directly: "Should I believe Zhao's last message?"

The Strategist is not omniscient. If the player has no agents in the relevant territory, the Strategist cannot verify the claim. It will tell the player: "Insufficient intel to verify. Consider deploying agents in the region or evaluating based on Zhao's past reliability."

**This is not a social feature.** The chat is not here so players can say "good game" or "nice move." It is a battlefield. Every message is a move. Every claim is a weapon. Every choice to trust or doubt has strategic consequences that ripple through the rest of the game. Information warfare sits alongside military, economic, cultural, and covert operations as the fifth dimension of conflict — not stored in a table, but played out in the space between what is true and what is believed.

---

## 3. NEW DATA

### Chat Messages

Every message is stored across two tables. The public `chat_log` table records who sent it, when, what they said, and which territory it references. A separate non-public `chat_secret` table records whether the message was truthful (`is_deception`) and its structured `claimed_fact`. The truth value is never exposed to any client: it is not a column of the public table at all, and clients cannot subscribe to the secret table. It exists only for AI trust evaluation, the Strategist's server-side analysis, and post-game review.

This table split is deliberate. SpacetimeDB has no per-subscriber column projection on a public table and no way to hide a column from some subscribers. Privacy must be structural: public-safe fields in the public table, secrets in a separate server-only table.

A `recipient_id` field distinguishes public messages (0, visible to all) from direct messages (set to the target player's ID, visible only to sender and recipient). DM scoping is enforced by the client's subscription row filter, which only matches rows where the client is the sender or recipient (or the message is global). The Strategist can only analyze DMs the player sends or receives. The player cannot see DMs between AI opponents.

### Trust Scores

Every AI maintains a trust score for every other player in an `ai_trust` table. Scores range from 0 to 100 and start at 50. They are updated when claims are verified or disproven. They decay slowly over time. They are read by the AI during its reasoning cycle to evaluate incoming messages.

---

## 4. HOW THE AI CYCLE CHANGES

The AI's 60-second reasoning cycle already handles action selection. In Slice 6, it also handles communication.

The reasoning cycle is a scheduled procedure (the only function type allowed to make HTTP calls to Claude, via `ctx.http`). At the start of each cycle, before the commander prompt is built, the AI evaluates any new chat messages inside the snapshot transaction. It cross-references claims against its agent network. It updates trust scores accordingly.

The commander prompt — which already includes the full game state, specialist recommendations, and persona context — now also includes the last ten chat messages and the AI's current trust scores. The commander decides not just what actions to take, but what to say. The output includes an optional chat message. If the AI has nothing useful to say, it stays silent.

A chat message is not a separate Claude call and not a reducer. It is one more field in the commander's single response, written directly into the chat tables in the same commit transaction that applies the AI's actions. What the AI says should align with what it is about to do. If the Consortium is preparing an economic takeover, it should be sending false reassurances in the same breath.

---

## 5. HOW THE STRATEGIST CYCLE CHANGES

The Strategist's 60-second cycle (a procedure, since it calls Claude via `ctx.http`) already analyzes the game state for threats, opportunities, and weaknesses. In Slice 6, it also analyzes the chat. It may read the non-public `chat_secret` table server-side to ground its analysis, but never echoes those secret fields to the client.

The Strategist prompt now includes the last ten chat messages and the player's current intel. For each message from an AI that contains a factual claim, the Strategist evaluates whether the player's agents confirm or contradict it. It generates chat analysis alerts alongside its existing notifications.

The player sees these as Strategist alerts with a new category: "Chat Analysis."

---

## 6. SUMMARY OF NEW LOCKED DECISIONS

| Decision | Outcome |
|----------|---------|
| Chat model | Global channel, all 4 players, freeform text |
| Message truth | No mechanical label. Truth stored server-side, never exposed. |
| AI message types | True intel, false intel, threats, false reassurance, silence |
| AI persona styles | Zhao: aggressive/threats. Consortium: subtle/false reassurance. Prophet: selective truth/omission. |
| Trust system | Scores 0-100, start at 50. Cross-referenced against agent intel. |
| Verification levels | Verified (own agents confirm) vs Accepted (trust sender). Different confidence. |
| Trust consequences | Proven truth: small increase. Proven lie: large decrease. Bad outcome from accepted claim: large decrease. |
| Rate limiting | Max 3 messages per sender per cycle evaluated. Spam decays trust faster. |
| Human interaction | Freeform text input, territory referencing with brackets, Strategist assistance |
| Strategist chat role | Proactively evaluates AI claims, flags likely deceptions, generates chat analysis alerts |
| AI cycle change | Commander prompt extended with chat history, trust scores, and chat message output |
| Strategist cycle change | Prompt extended with chat history and chat analysis output |
| New tables | `chat_log` (public), `chat_secret` (non-public, holds is_deception/claimed_fact), `ai_trust` (surrogate id + btree index on (ai_player_id, target_player_id)) |
| New component | `ChatPanel` |
| Modified components | `StrategistAlerts` (new alert type), `App` (chat integration) |
| DM system | Private one-to-one messages. recipient_id distinguishes public from private. |
| DM trust | Contradictions between public and private messages are evaluated separately. Public lie + private truth = net trust penalty but private honesty noted. |
| DM UI | ChatPanel tabs: Global, Zhao DM, Consortium DM, Prophet DM. Hotkeys Ctrl+1 through Ctrl+4. |
| DM visibility | Strategist only analyzes DMs involving the player. Player cannot see AI-to-AI DMs. |

---

## 7. WHAT SLICE 6 DOES NOT CHANGE

- Military combat: unchanged.
- Economic investment: unchanged.
- Agent deployment: unchanged.
- Cultural spread: unchanged.
- Cross-dimension bonuses: unchanged.
- Win condition: still 5 unified territories across the 4 counting dimensions (Covert excluded).
- AI action selection: unchanged. Chat is an additional output, not a replacement.
- Query system: unchanged.
- Event ticker: unchanged.
- Hotkeys: unchanged.
- Orchestration: unchanged.

---

## End of Slice 6 Decisions Document

This document, combined with DECISIONS_SLICE_1.md through DECISIONS_SLICE_5.md, carries the design philosophy for Risk: Dominion through Slice 6 of 7. Slice 7 (spectator and replay) adds the final layer. All principles from prior slices not explicitly modified here remain in full effect. The next document is the Slice 6 Interface Contract.