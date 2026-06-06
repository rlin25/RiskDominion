# PITCH.md — Risk: Dominion

---

Most hackathon projects use a database. We built a game that IS a database.

---

## The Insight

SpacetimeDB puts the database and server in the same process. Tables, reducers, procedures, subscriptions — no separate backend. Most demos use this for chat apps. We went further. What if the database wasn't just storage? What if it was the game mechanic itself?

## Our Game

Risk: Dominion is a four-dimensional strategy game. Each territory has four layers of ownership — Military, Economic, Cultural, Covert — stored as four SpacetimeDB tables. Drag cards to attack, invest, and deploy agents. Every card is a reducer call. Every color change is a subscription update. Cultural influence spreads passively through scheduled reducers. Three AI opponents live in the same tables and go through the same action logic, reasoning through scheduled procedures that call Claude. Victory requires unifying all four dimensions across five territories. You're not conquering land. You're unifying truth across layers of a live database.

## Technical Achievements

**Multi-agent AI orchestration.** Each AI opponent runs five Claude agents -- four specialist subordinates and a commander -- all called over `ctx.http` from a single scheduled procedure (reducers are sandboxed and cannot make HTTP calls). Their full deliberation chain is logged to a table and queryable by the player.

**Natural language to live table queries.** Type "Where am I weakest?" A procedure sends your question to Claude with a live game state snapshot and returns a structured response with highlighted territories and a data table directly to the client. You're querying the battlefield in plain English.

**AI deception and trust scoring.** Every AI opponent sends chat messages to the shared channel. They lie. Claims are cross-referenced against each AI's own agent network; if caught, their trust score drops and remains penalized for the rest of the game. A player who builds a reputation for honesty can cash it in later with a single devastating lie. The chat channel is a fifth dimension of conflict.

**Decoupled narrative layer.** Every action writes to an `event_feed` table. A scrolling ticker subscribes to it. Events are fire-and-forget -- if a write fails, the game state change persists. The narrative cannot break the game.

**Spectator mode and replay system.** Any observer can open `?spectator=true` and see the live game with hidden state exposed: trust scores, dimension dominance percentages, active AI cycles. After the game ends, `?replay=true` opens a scrubbable timeline reconstructed from `event_feed` and `ai_reasoning_log`. Every AI deliberation, every chat message, every trust score change is reviewable at any point in history.

## What Judges Should Notice

- Zero external servers. The only external calls are to Claude.
- AI agents are rows in a `players` table. An `is_ai` boolean is the only difference.
- Cultural spread is a scheduled reducer running pure database logic, no HTTP.
- The query system runs against live tables, not cached summaries.
- AI orchestration issues five Claude calls over `ctx.http` from one scheduled procedure -- the only function type that can make HTTP calls.
- The AIs lie in chat. The lie is chosen by the model in the same reasoning cycle that picks their actions -- not scripted.
- The replay is not a recording. It reconstructs state from logged database events, proving the database recorded everything.

## The Close

We didn't build a game with a database. We built a game that is a database. Every territory is a row. Every action is a transaction. Every AI is a native participant. The database is the game.