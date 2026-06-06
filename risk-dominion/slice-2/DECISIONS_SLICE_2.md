# RISK: DOMINION — SLICE 2 DESIGN DECISIONS

## Version 2.0
## Scope: AI Opponents and Intel System
## Relationship: Extends DECISIONS_SLICE_1.md
## Platform: SpacetimeDB 2.4.1

---

## 0. HOW TO READ THIS DOCUMENT

This document describes what changes in Slice 2. It does not repeat everything from Slice 1.

**All Slice 1 principles remain in effect unless this document explicitly replaces or modifies them.** If a principle is not mentioned here, it is unchanged from Slice 1.

Slice 1 gave us a working two-player game. Two humans competed across Military and Economic dimensions on a shared map. Slice 2 transforms that into a single-player game against three AI opponents, and adds a third dimension — Covert — that lets the player spy on the AI's plans.

---

## 1. WHAT SLICE 2 CHANGES

| Slice 1 | Slice 2 |
|---------|---------|
| Two human players | One human vs three AI opponents |
| Two dimensions (Military, Economic) | Three dimensions (Military, Economic, Covert) |
| Two card types (Attack, Invest) | Three card types (Attack, Invest, Deploy Agent) |
| All information is public | AI plans are hidden unless you earn intel |
| No AI systems | AI reasoning cycles, persona-driven opponents |

---

## 2. MODIFIED PRINCIPLES

### Modified Principle 2: Dimensions Are Tables

Slice 1 had two dimension tables: `military` and `economic`. Slice 2 adds a third, a public SpacetimeDB table keyed by territory:

```rust
#[spacetimedb::table(accessor = covert, public)]
pub struct Covert {
    #[primary_key]
    pub territory_id: i32,
    pub owner_id: i32, // 0 means no agents present
    pub agent_count: i32,
}
```

The Covert dimension represents your intelligence network. Agents deployed in a territory gather information about what the AI opponents are planning there. In a future slice, Covert will also provide combat bonuses. For Slice 2, its sole purpose is intel gathering.

The schema now has three dimension tables. Each territory can be owned by up to three different players simultaneously — one for Military, one for Economic, one for Covert.

### Modified Principle 3: Real-Time, Card-Driven Action

Slice 1 had two card types. Slice 2 adds a third:

- **Military Attack** (red card) — unchanged. Attack an adjacent territory.
- **Economic Invest** (gold card) — unchanged. Add capital to a territory.
- **Deploy Agent** (purple card) — new. Place an agent in any territory. Agents accumulate and determine what intel you can access.

All three cards cost 1 action point. All three follow the same drag-and-drop interaction. The Deploy Agent card has no adjacency restriction — you can deploy agents anywhere on the map.

---

## 3. REPLACED PRINCIPLES

### Replaced Principle 4: Single Player Against AI

**What Slice 1 said:** Two human players share a SpacetimeDB instance. Player identity comes from a URL parameter (`?player=1` or `?player=2`). No authentication. No lobby.

**What Slice 2 says:** There is one human player. Always. The human is player_id 1. There is no URL parameter. Three AI opponents occupy player slots 2, 3, and 4.

The AI opponents are not external programs calling an API. They are rows in the same `players` table as the human. The only difference between a human row and an AI row is a single field: `is_ai`. The human has `is_ai = false`. The AIs have `is_ai = true`. Everything else — action points, reducer endpoints, subscription data — is identical.

This proves a core architectural claim: any faction in the game is just a player ID in a table. Nothing in the database schema cares whether the brain behind that ID is biological or artificial. The game is multiplayer-ready by design. Slice 2 simply chooses to fill the non-human slots with AI.

---

## 4. NEW PRINCIPLES

### New Principle 5: AI as First-Class Database Citizens

The three AI opponents live inside SpacetimeDB. There is no external service polling the game and pushing moves in. Each AI's turn is driven by a scheduled procedure inside the module itself: the procedure reads the live board, calls Claude over HTTP via `ctx.http` (procedures are the only function type allowed to make HTTP calls), and applies the validated moves through the same action logic the human uses. Their reasoning — the actual text of what they are thinking — is stored in a database table called `ai_reasoning_log`. That table is queryable.

Each AI has a distinct personality that shapes how it plays. A personality is not a special ability. It is a preference. Given the same board state, Zhao will reach for a military attack. The Consortium will reach for an economic investment. The Prophet will deploy an agent to see what everyone else is doing. They all have access to the same actions. They all pay the same costs. They just prioritize differently.

The AI does not cheat. It does not get extra action points. It does not bypass adjacency rules. Its moves run through the exact same action logic the human's reducers use (the shared `do_military_attack` / `do_economic_invest` / `do_deploy_agent` fns), so they are validated identically. If an AI tries to attack a non-adjacent territory, the action is rejected. If an AI runs out of action points, it must wait for regeneration like everyone else.

The AI's reasoning is persistent. Every 60 seconds, each AI writes its full thought process to the database. This is not a log file on a server somewhere. It is a live table row that the human can query — if they have earned the right to see it.

**The three AI opponents:**

**Zhao** — The General. Player color: red (#FF4444). Zhao sees the map as a battlefield. He masses troops and attacks where he has advantage. He invests economically only when there are no good attack targets. He deploys agents sparingly, and only in territories he plans to strike. Zhao is predictable in his aggression. If you see his troops building on your border, he is coming.

**The Consortium** — The Financier. Player color: orange (#FFAA00). The Consortium sees the map as a portfolio. It invests capital wherever it has military protection. It builds economic dominance quietly, then converts that wealth into unified territories. It attacks only to defend critical positions. If the Consortium is investing in a territory, it intends to own it.

**The Prophet** — The Spymaster. Player color: purple (#AA44FF). The Prophet sees the map as an information network. It deploys agents everywhere, gathering intelligence on every player's moves. It attacks and invests opportunistically, targeting whoever looks weakest. The Prophet is the hardest to predict because it adapts to what it learns. In a future slice, the Prophet's agent network will become a cultural influence engine. For now, it is the reason you need your own agents.

---

### New Principle 6: AI Timing and Execution

The AI does not think continuously. It thinks in cycles. Every 60 seconds, each AI runs a reasoning cycle. The cycles are staggered so the AIs don't all think at the same time:

- Zhao thinks at 0 seconds, 60 seconds, 120 seconds...
- The Consortium thinks at 20 seconds, 80 seconds, 140 seconds...
- The Prophet thinks at 40 seconds, 100 seconds, 160 seconds...

When an AI's cycle fires, the scheduled procedure does three things in order. First, in one short transaction, it snapshots the current board into a persona-flavored prompt, marks the AI "pending", and re-arms the next cycle. Then, with no transaction held open, it sends that prompt to Claude and waits for the reply. Because no transaction is held during the call, the database is never locked while an AI is thinking. The human can keep playing. Other AIs can keep thinking. Nothing freezes.

When Claude responds, the procedure opens a second transaction and validates the proposed actions against the current board state. If the AI proposed attacking a territory it no longer borders (because the human took it while the AI was thinking), that action is rejected. Valid actions are applied. Results are written to the reasoning log.

If Claude takes more than 30 seconds to respond, the call times out and returns an error. The AI misses that turn, its status is reset to idle, and the next cycle proceeds normally. The AI does not get to bank extra actions.

If a new cycle fires while the previous one is still thinking, the "pending" guard makes the new cycle skip. No queue builds up. No cascading delays. The AI simply waits for the next scheduled cycle.

The AI has the same action point regeneration as the human: 1 point every 8 seconds, capped at 10. When the AI submits actions, it can only spend points it actually has. It cannot go into debt. It cannot borrow from future cycles.

---

### New Principle 7: Information is Power, Intel is Earned

In Slice 1, everything was visible. You could see exactly what troops and capital the other player had in every territory. There were no secrets.

In Slice 2, the AI's plans are hidden. The AI is thinking in natural language — full sentences about strategy, threats, and opportunities. That reasoning is stored in the database. Whether you can read it depends on your covert presence.

Here is how intel works:

You deploy agents using the new Covert card. Each agent costs 1 action point. Agents go to a specific territory. They stay there until another player deploys agents and takes over the Covert dimension for that territory.

To read an AI's last reasoning cycle, you need at least 3 agents in a territory where that AI has a presence. It does not need to be the AI's home territory — any territory where the AI owns Military or Economic counts.

If you meet the threshold and query "What is Zhao planning?", you see Zhao's actual reasoning text. The territories Zhao mentioned in its plans are highlighted on your map.

If you do not meet the threshold, you see: "Insufficient intel. Deploy agents in territories where Zhao is active."

Three agents is a deliberate investment. You start the game with 5 action points. Deploying 3 agents in a single territory costs 3 points — more than half your starting budget. This is intentional. Intel is not free. You must choose between attacking, investing, and learning. A player who invests heavily in agents will have fewer points for military and economic actions. A player who ignores agents will have more points but will fight blind.

This tradeoff is the strategic heart of Slice 2.

---

## 5. UPDATED SEED DATA

The pre-seeded board now has four players. Each gets one unified home territory.

| Player | Home Territory | Military | Economic | Covert |
|--------|---------------|----------|----------|--------|
| Player (you) | North America (1) | 10 troops | 20 capital | 1 agent |
| Zhao | East Asia (11) | 10 troops | 20 capital | 1 agent |
| Consortium | Western Europe (5) | 10 troops | 20 capital | 1 agent |
| Prophet | Middle East (9) | 10 troops | 20 capital | 1 agent |

The remaining 8 territories are fractured — each dimension owned by a different player, with 0 or 1 agents scattered across them.

Notice that each AI starts with 1 agent in its home territory. You start with 1 agent in yours. No one starts with the 3 agents needed to read anyone else's plans. You must earn that.

---

## 6. VICTORY CONDITION

Unchanged from Slice 1: first to unify 3 territories wins. A territory is unified when the same player owns both Military and Economic. Covert ownership does not count toward unification — it is a support dimension, not a victory dimension.

This will change in Slice 3 when Cultural arrives and the threshold increases to 5 territories unified across all four dimensions. For Slices 1 and 2, the win condition stays at 3 territories unified across the 2 victory dimensions (Military + Economic). Covert never counts toward unification, in this slice or any later one. This is Slice 2 of 7.

---

## 7. WHAT SLICE 2 DOES NOT CHANGE

- The map: still 12 hex territories, three continents.
- Action points: still 1 per 8 seconds, cap 10, flat 1-point cost.
- Military combat: still `attacker_troops > defender_troops`.
- Economic investment: still +5 capital, flips when exceeding current owner.
- Victory: still 3 unified territories.
- Pre-seeded board: still starts mid-game, not empty.
- Real-time: still no turns. The clock runs continuously.
- Subscriptions: still deliver live state changes to all connected clients.

---

## 8. SUMMARY OF NEW LOCKED DECISIONS

| Decision | Outcome |
|----------|---------|
| Player model | 1 human (player_id 1) vs 3 AI (player_ids 2, 3, 4) |
| AI identity | `is_ai` boolean on players table |
| New dimension | Covert (agent_count per territory) |
| New card | Deploy Agent (purple, no adjacency restriction) |
| AI execution | Scheduled procedure per AI, calls Claude via `ctx.http` |
| AI cycle interval | ~60 seconds per AI (self-pacing chain) |
| AI stagger | 20 seconds between AIs (seeded first-fire) |
| AI LLM timeout | 30 seconds |
| AI overlap | Skip cycle if previous still pending (pending guard) |
| AI action budget | Same 1pt/8sec regen as human; shared `do_*` action logic |
| API key storage | Private `module_config` table, seeded via `set_config` |
| AI model | `claude-sonnet-4-6` |
| AI reasoning storage | `ai_reasoning_log` table, queryable |
| Intel threshold | 3 agents in a territory where AI has presence |
| Intel query | `get_intel(ai_player_id)` procedure returns reasoning or "insufficient" |
| AI personas | Zhao (military), Consortium (economic), Prophet (agent-focused) |
| Home territories | 4 total (one per player), each with 1 agent |
| Win condition | Unchanged: 3 unified territories |

---

## 9. A NOTE ON THE FUTURE

The AI architecture in Slice 2 uses a single reasoning agent per opponent. One AI, one thought process, one batch of actions per cycle. This is the foundation.

In a future slice, each AI opponent could be expanded into a small team of specialist subordinates. A military advisor. An economic forecaster. An intel analyst. Multiple agents per faction, coordinated by a commander agent. The human player could also receive an AI strategist subordinate — an advisor that watches the game state and warns of threats.

The database schema already supports this. The `ai_reasoning_log` table can track which subordinate produced which reasoning. The orchestration layer would be a new procedure that makes multiple Claude calls (each via `ctx.http`) and synthesizes their output.

This is not in scope for Slice 2. But everything we build now is designed to support it later.

---

## End of Slice 2 Decisions Document

This document, combined with DECISIONS_SLICE_1.md, contains the complete design philosophy for Slice 2. All Slice 1 principles not explicitly replaced or modified here remain in full effect. The next document is the Slice 2 Interface Contract, which will specify every new table column, reducer signature, subscription shape, and wire format for the AI and intel systems.