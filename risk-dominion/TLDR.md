# TLDR.md — Risk: Dominion

## What It Is

Risk: Dominion is a real-time strategy game where the battlefield is a live multidimensional database. Every territory on the map is a row in a table. Every action you take is a database transaction. Every AI opponent is a native participant in that same database — thinking, planning, and acting through councils of specialist agents. Built on SpacetimeDB.

---

## Status

Current slice progress during the hackathon. Update as each slice is validated.

| Slice | Feature | Status |
|-------|---------|--------|
| 1 | Core gameplay (2 players, 2 dimensions) | ⬜ |
| 2 | AI opponents, Covert dimension, intel | ⬜ |
| 3 | Cultural dimension, cross-dimension bonuses | ⬜ |
| 4 | Query system, event ticker, autocomplete | ⬜ |
| 5 | Subagent orchestration, hotkeys, Strategist | ⬜ |
| 6 | Global chat with AI deception and trust scoring | ⬜ |
| 7 | Spectator mode and replay system | ⬜ |

---

## Why It's Cool

- **AI opponents don't just decide — they deliberate.** Each AI runs a council of five Claude agents: four specialist subordinates (military, economic, cultural, covert) and a commander who synthesizes their recommendations. The full deliberation chain is visible to the player through the intel system.

- **The battlefield is a database you can query.** Type "Where am I weakest?" in plain English. The game translates your question into a live query across the dimension tables and returns highlighted territories with a data table. Ten pre-built query buttons give you instant strategic insights.

- **Every action is a real-time database transaction.** Drag a card onto a territory. That triggers a reducer — a deterministic server-side function that validates your move and updates the tables. The reducer does not return data; instead the change is pushed to every connected client via subscriptions. No polling. No REST APIs. No latency.

---

## How It Works

A React frontend (using the `spacetimedb` npm client) connects to a SpacetimeDB 2.4.1 server written in Rust. All game state lives in SpacetimeDB tables — military, economic, cultural, covert, players, events, and AI reasoning logs. The client subscribes to these tables and re-renders in real time whenever data changes. Player actions are reducers (deterministic, no HTTP); everything that calls Claude — AI reasoning cycles, multi-agent orchestration, the query system, and the Strategist — runs in procedures, the only function type allowed to make HTTP calls via `ctx.http`.

---

## Key Features

- Four dimensions of control per territory: Military, Economic, Cultural, Covert
- Split ownership — different players can own different dimensions of the same territory
- Three AI opponents with distinct personas (Zhao the General, Consortium the Financier, Prophet the Spymaster)
- Cultural influence spreads passively based on economic pressure from neighboring territories
- Cross-dimension bonuses reward coordinated play across all four dimensions
- Natural language query bar — ask the database anything about the game state
- Live event ticker narrates every action in real time for spectators
- Keyboard controls for every common action (WASD navigation, card hotkeys, panel toggles)
- Human Strategist AI advisor that watches the game and pushes proactive alerts
- Global chat channel where AI opponents lie, threaten, and attempt to manipulate you
- Per-player AI trust scores updated by cross-referencing chat claims against agent networks
- Spectator mode with a hidden-state overlay showing trust scores, dimension dominance, and AI cycle status
- Replay system: scrub through the full post-game history to see AI deliberation and chat at any moment
- Hex map with X-split quadrant territory rendering
- Victory by unifying 5 territories across all four dimensions

---

## Tech Stack

SpacetimeDB 2.4.1, Rust, `spacetimedb` (npm client), React 18, TypeScript, Vite, dnd-kit, Tailwind CSS, Claude (Anthropic API)

---

## Quick Start

Clone the repo. Install the SpacetimeDB 2.4.1 CLI with `curl -sSf https://install.spacetimedb.com | sh`. Run `bash setup.sh`. The code is one evolving codebase at `app/` (`app/server` + `app/client`), tagged per slice. Publish the module (`spacetime publish --project-path app/server risk-dominion`), generate the TypeScript bindings, seed the Anthropic key into the private `module_config` table (`spacetime call risk-dominion set_config '"anthropic_api_key"' '"sk-ant-..."'`), then `cd app/client && npm run dev`. Open `localhost:5173`. That's it.

---

## Want More Detail?

- **README.md** — Full project overview with architecture diagram
- **ARCHITECTURE.md** — Technical deep-dive into the system design
- **GLOSSARY.md** — Every game term defined in plain English
- **DEMO_SCRIPT.md** — Timed 7-minute walkthrough for presenting to judges
- **AESTHETIC.md** — Visual design system (colors, fonts, territory design)
- **SETUP.md** — Environment setup guide