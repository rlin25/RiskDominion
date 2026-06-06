# RISK: DOMINION — SLICE 7 DESIGN DECISIONS

## Version 1.0
## Scope: Spectator Mode, Replay System, Complete Transparency (Slice 7 of 7)
## Platform: SpacetimeDB 2.4.1
## Relationship: Extends DECISIONS_SLICE_6.md (applies to the single evolving app at risk-dominion/app/)

---

## 0. HOW TO READ THIS DOCUMENT

This document describes what changes in Slice 7. It does not repeat everything from Slices 1 through 6.

**All prior principles remain in effect unless this document explicitly modifies them.** If a principle is not mentioned here, it is unchanged.

Slice 6 gave us information warfare — a global chat where every message is a potential weapon, AIs that lie and evaluate lies, trust scores that track reputation. The game is deep, strategic, and alive. But much of that depth is invisible during play. The AI's deliberation happens inside the database. Trust scores update silently. Chat deceptions unfold across cycles. A spectator watching the game sees the surface — territory colors changing, events scrolling — but not the minds behind the moves.

Slice 7 makes everything visible. A spectator mode lets observers watch the game live with X-ray vision into hidden state. A replay mode lets anyone scrub through a completed game and see exactly what every AI was thinking at every moment. This is the transparency layer. The proof that everything we built is real.

---

## 1. WHAT SLICE 7 CHANGES

| Slice 6 | Slice 7 |
|---------|---------|
| Only the player sees the game | Spectators can watch live with a stats overlay showing hidden information |
| The game is experienced in real time | Completed games can be replayed, scrubbed, and analyzed |
| AI thinking is visible only through intel queries | AI deliberation is visible at every moment in the replay timeline |
| Trust scores update silently | Trust scores are visible in spectator overlay and replay |
| Cultural pressure is inferred | Cultural pressure can be overlaid on the map during replay |
| There's no record of what happened when | A timeline shows every event, color-coded, scrubbable |

Slice 7 does not change any existing gameplay mechanics. It adds new ways to watch and understand the game.

---

## 2. NEW PRINCIPLES

### Principle 15: Watch Without Touching

A spectator is someone who watches the game without playing it. They see everything. They control nothing.

In Slice 7, anyone can open the game with a URL parameter — `?spectator=true` — and enter spectator mode. The spectator subscribes to every SpacetimeDB table, just like the player. They see the map with all four quadrants. They see the ticker narrating events. They see the chat panel with all public messages. They see the intel panel. Everything is live.

But the spectator cannot act. Cards are not draggable. The chat input is hidden. No reducers can be called. The spectator is a read-only participant in the database — they receive every subscription update but can never send a mutation.

Multiple spectators can watch simultaneously. Ten people. Twenty. A hundred. All receiving the same live updates through SpacetimeDB subscriptions. This proves a core platform claim: subscriptions scale to any number of connected clients because they push data, not respond to requests.

The spectator sees more than the player. A stats overlay — visible only in spectator mode — shows information the player would love to have. Unified territory counts for every faction. Dimension dominance percentages — who controls what share of Military, Economic, Cultural, and Covert. Trust scores between every pair of players, displayed as small bar charts. The territories with the highest foreign cultural influence — the next likely flips. Which AI is currently thinking — whose reasoning cycle is active right now. The spectator has X-ray vision into the hidden state of the game.

This is not just a feature for hackathon judges, though it serves them perfectly. It is a demonstration that SpacetimeDB subscriptions work for observers as well as players — a capability that matters for dashboards, monitoring systems, and any application where many people need to watch live data without touching it.

### Principle 16: Every Thought, Visible

A completed game is a story. The replay mode tells it.

When a game ends — when someone unifies five territories and the victory screen appears — the data doesn't disappear. Every event is stored in the `event_feed` table. Every AI reasoning cycle is stored in the `ai_reasoning_log`. Every chat message is stored in the `chat_log`. Every trust score update is stored in the `ai_trust` table. The complete history of the game is preserved in the database.

The replay mode opens that history. It can be accessed by adding `?replay=true` to the URL after a game has ended.

A timeline bar appears at the bottom of the screen. It spans from the moment the game started to the moment it ended. Small colored dots mark every event — red for military attacks, gold for economic investments, purple for cultural flips, blue for agent deployments, green for chat messages. Hovering a dot shows what happened. Clicking a dot jumps to that moment.

A playhead moves along the timeline. You can drag it to scrub through the game. You can press play and watch the entire game unfold at 1x, 2x, or 4x speed. You can pause and examine a single moment.

What makes the replay powerful is what you can see at each moment that was invisible during the game.

Click on any point in the timeline. The map renders exactly as it was at that moment — who owned what, how many troops, how much capital, what influence percentages. But you can also open the intel panel and see what the AI was thinking. The replay shows the most recent deliberation chain before that timestamp. If Zhao just attacked Brazil, you can see the full council that produced that decision. Vanguard identified the target. Scout confirmed the intel. Paymaster approved the economic impact. Adjutant noted the cultural implications. Commander Zhao gave the order. All five minds, their reasoning preserved and reviewable.

Open the chat log at that same moment. See what messages were sent. Who lied to whom. What trust scores looked like before and after. Watch the Consortium whisper false reassurance to the Prophet while preparing an economic takeover. See the Prophet share selective truth with the player to direct attention away from its own operations.

Overlay cultural pressure on the map. Watch influence spread across borders in slow motion. See the exact moment a territory's culture flipped — not just that it flipped, but the economic pressure that caused it, accumulating tick by tick.

The replay transforms the game from a competition into a story. A story where every thought, every lie, every strategic calculation is preserved and reviewable. The data was always there. The replay is the lens that makes it visible.

**How it works under the hood.** The replay does not store snapshots of the game at every moment. It reconstructs the game by starting from the initial seed state — the same board the game began with — and replaying every known action in order. AI actions are fully logged in `ai_reasoning_log`, so the AI's moves can be reconstructed exactly. Player actions are partially captured in `event_feed` — the replay knows what happened and when, even if it doesn't have the exact before-and-after numbers for every player action. The reconstruction is an approximation that becomes more precise over time as more data is logged. For the hackathon, the replay focuses on what it can show perfectly: AI deliberation, chat history, trust scores, cultural pressure, and the event timeline. Full state reconstruction is noted as a future enhancement.

**A small addition.** To know the timeline bounds, the game now records an `ended_at` value in the key-value `game_state` table when victory occurs, derived from `ctx.timestamp` (the same deterministic clock that records `started_at`). This is one line inside the existing `dimension_owner_change` win check; no new server endpoints. The replay timeline spans from `started_at` to `ended_at`.

---

## 3. WHAT SLICE 7 DOES NOT CHANGE

- Military combat: unchanged.
- Economic investment: unchanged.
- Agent deployment: unchanged.
- Cultural spread: unchanged.
- Cross-dimension bonuses: unchanged.
- Win condition: still 5 unified territories.
- AI reasoning: unchanged.
- Chat system: unchanged.
- Trust system: unchanged.
- Query system: unchanged.
- Event ticker: unchanged.
- Hotkeys: unchanged.

Slice 7 adds sight. It does not change the game.

---

## 4. SUMMARY OF NEW LOCKED DECISIONS

| Decision | Outcome |
|----------|---------|
| Spectator mode | Read-only view via `?spectator=true`. No interactions. Multiple simultaneous spectators. |
| Spectator stats overlay | Unified counts, dimension dominance %, trust scores, cultural hotspots, AI cycle status. Visible only to spectators. |
| Replay mode | Post-game timeline via `?replay=true`. Scrubbable. Play/pause/speed controls. |
| Timeline | Horizontal bar with colored event markers. Hover for details. Click to jump. |
| AI deliberation in replay | Shows most recent deliberation chain before current timestamp. All subordinates and commander. |
| Chat in replay | Chat history synced to replay position. Shows messages sent at that moment. |
| Cultural overlay | Optional overlay showing influence percentages during replay. |
| State reconstruction | Event-sourced from ai_reasoning_log and event_feed. Player actions approximated from event_feed. |
| Timeline bounds | `ended_at` added to game_state when game ends. |
| New frontend mode | URL parameter routing: default (player), spectator, replay. |

---

## 5. THE GAME AFTER SLICE 7

After Slice 7, Risk: Dominion is not just playable. It is observable, reviewable, and provable.

A judge can watch the game live as a spectator, seeing more information than the player. After the game ends, they can open the replay and scrub through every moment. They can see the AI's full deliberation chain for any decision. They can watch trust scores rise and fall. They can see lies being told and detected. They can watch cultural pressure spread across the map.

Nothing is hidden. Every thought is visible. The database was always recording. Now you can watch it back.

---

## End of Slice 7 Decisions Document

This document, combined with DECISIONS_SLICE_1.md through DECISIONS_SLICE_6.md, contains the complete design philosophy for Risk: Dominion. All principles from prior slices not explicitly modified here remain in full effect. The next document is the Slice 7 Interface Contract.