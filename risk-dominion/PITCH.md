# PITCH.md — Risk: Dominion

---

Most hackathon projects use a database. We built a game that IS a database.

---

## The Insight

SpacetimeDB puts the database and server in the same process. Tables, reducers, subscriptions — no separate backend. Most demos use this for chat apps. We went further. What if the database wasn't just storage? What if it was the game mechanic itself?

## Our Game

Risk: Dominion is a four-dimensional strategy game. Each territory has four layers of ownership — Military, Economic, Cultural, Covert — stored as four SpacetimeDB tables. Drag cards to attack, invest, and deploy agents. Every card is a reducer call. Every color change is a subscription update. Cultural influence spreads passively through scheduled reducers. Three AI opponents live in the same tables, writing to the same reducers. Victory requires unifying all four dimensions across five territories. You're not conquering land. You're unifying truth across layers of a live database.

## Technical Achievements

**Multi-agent AI orchestration.** Each AI opponent runs five Claude agents — four specialist subordinates and a commander — spawned as parallel threads from a scheduled reducer. Their full deliberation chain is logged to a table and queryable by the player.

**Natural language to live table queries.** Type "Where am I weakest?" The game sends your question to Claude with a live game state snapshot. Claude returns a structured response with highlighted territories and a data table. You're querying the battlefield in plain English.

**Decoupled narrative layer.** Every action writes to an `event_feed` table. A scrolling ticker subscribes to it. Events are fire-and-forget — if a write fails, the game state change persists. The narrative cannot break the game.

## What Judges Should Notice

- Zero external servers. The only external calls are to Claude.
- AI agents are rows in a `players` table. An `is_ai` boolean is the only difference.
- Cultural spread is a scheduled reducer running pure database logic.
- The query system runs against live tables, not cached summaries.
- We spawn parallel threads from scheduled reducers for AI orchestration.

## The Close

We didn't build a game with a database. We built a game that is a database. Every territory is a row. Every action is a transaction. Every AI is a native participant. The database is the game.