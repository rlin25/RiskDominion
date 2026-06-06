# Risk: Dominion

**A real-time strategy game where the battlefield is a live multidimensional database, powered by SpacetimeDB and Claude.**

---

## Architecture

```mermaid
%%{init: {"theme": "dark"}}%%
flowchart LR
    classDef client fill:#0d1729,stroke:#4488FF,stroke-width:2px,color:#c8d8ff
    classDef server fill:#0a1f12,stroke:#44CC66,stroke-width:2px,color:#c8ffcc
    classDef ai fill:#2a0d0d,stroke:#FF6666,stroke-width:2px,color:#ffc8c8

    subgraph C["CLIENT - React / TypeScript / dnd-kit / Tailwind"]
        MAP("Hex Map"):::client
        HAND("Card Hand"):::client
        QB("Query Bar"):::client
        TICKER("Event Ticker"):::client
        ALERTS("Strategist Alerts"):::client
    end

    subgraph S["SPACETIMEDB - Rust"]
        RED("Reducers"):::server
        TAB("12 Tables"):::server
        SCH("Scheduled Reducers"):::server
    end

    subgraph A["CLAUDE - Anthropic API"]
        ORCH("AI Orchestration"):::ai
        NLQ("Query Translation"):::ai
        STRAT("Strategist Advisor"):::ai
    end

    MAP -->|"actions"| RED
    HAND -->|"actions"| RED
    QB -->|"query"| RED
    RED -->|"mutate"| TAB
    TAB -->|"subscriptions"| MAP
    TAB -->|"subscriptions"| TICKER
    TAB -->|"subscriptions"| ALERTS
    SCH -->|"AI cycles 60s"| ORCH
    SCH -->|"Strategist 60s"| STRAT
    RED -->|"query thread"| NLQ
    ORCH -->|"submit actions"| RED
    NLQ -->|"results"| TAB
    STRAT -->|"alerts"| TAB
```

---

## Quick Start

```bash
git clone https://github.com/rlin25/RiskDominion.git
cd RiskDominion/risk-dominion
bash setup.sh
```

Open `prompts/generate_slice_1.txt` in Claude Code. Follow the generation instructions for each slice in order. Start the SpacetimeDB server, then open `http://localhost:5173`.

---

## Features

- **Four dimensions of control** -- Military, Economic, Cultural, and Covert. Each territory can be owned by a different player in each dimension simultaneously.
- **Split ownership map** -- Victory requires unifying all four dimensions across five territories. Holding land is not enough.
- **Three AI opponents** -- Zhao (aggressive general), Consortium (patient financier), Prophet (cultural spymaster). Each runs live LLM reasoning cycles every 60 seconds against the same live database the player is reading.
- **Multi-agent AI orchestration** -- Each AI opponent runs a council of five Claude agents: four domain specialists (military, economic, cultural, covert) and a commander who synthesizes their recommendations. Fifteen calls per minute across all three AIs.
- **Traceable deliberation chain** -- Every subordinate recommendation and commander decision is logged to the database and queryable through the intel system. See not just what the AI decided, but who recommended what.
- **Passive cultural spread** -- Cultural influence spreads every 30 seconds based on adjacent economic pressure. There is no Cultural card. The dimension is shaped indirectly through economic investment.
- **Cross-dimension bonuses** -- Military protects Economic, Economic funds Cultural, Cultural enables Covert, Covert sharpens Military. Coordinated multi-dimension play compounds.
- **Natural language queries** -- Type any question about the game state in plain English. Claude translates it into a structured response: one-sentence summary, sortable data table, and highlighted territories on the live map.
- **Ten canned queries** -- Pre-optimized prompts for the most common strategic questions, from "Who is winning?" to "Where is my covert presence too thin?"
- **Tab autocomplete** -- Context-aware query completions appear as you type. Up to three suggestions from a live game state snapshot.
- **Live event ticker** -- Every game action narrated in a scrolling feed. Color-coded by player. Geometric SVG icons by dimension. Click any event to highlight the referenced territory on the map.
- **Human Strategist advisor** -- An AI ally that analyzes the full game state every 60 seconds and pushes dismissable alerts: threats, opportunities, and weaknesses. On your side.
- **Full keyboard control** -- Select cards with 1, 2, 3. Navigate the map with WASD or arrow keys. Confirm with Enter or Space. Cancel with Escape. Focus the query bar with Q, toggle intel with I, cycle AI targets with C, highlight owned territories with H.
- **Global chat with deception** -- All four players communicate through a shared channel and private DMs. AI opponents lie, threaten, and try to manipulate you into fighting their enemies. There is no mechanical truth label. Belief is always a choice.
- **AI trust system** -- Each AI tracks a trust score (0-100) for every other player. Claims are cross-referenced against the AI's own agent network. A player who lies and gets caught loses credibility for the rest of the game.
- **Strategist chat analysis** -- The Strategist monitors AI messages and flags likely deceptions based on your agent coverage. "Zhao claims the Consortium is building forces in North Africa. Your agents show no evidence of this."
- **Spectator mode** -- Open any live game in read-only mode via `?spectator=true`. A stats overlay shows hidden state: trust scores, dimension dominance percentages, AI cycle status, and cultural pressure hotspots.
- **Replay system** -- After a game ends, open `?replay=true` to scrub through the full game history. See AI deliberation chains, chat messages, trust score changes, and cultural spread at any moment on a scrubbable timeline.

---

## Tech Stack

| Technology | Role |
|------------|------|
| **SpacetimeDB** | Database, server, and subscriptions -- all in one process |
| **Rust** | Server modules, reducers, scheduled reducers, thread orchestration |
| **React 18** | Frontend UI |
| **TypeScript** | Type-safe client code |
| **Vite** | Frontend build tool and dev server |
| **dnd-kit** | Drag-and-drop card interaction |
| **Tailwind CSS** | All styling via utility classes |
| **Claude (Anthropic API)** | AI reasoning, multi-agent orchestration, queries, Strategist |

---

## Slice Structure

| Slice | What It Adds |
|-------|-------------|
| **Slice 1** | Core gameplay: two human players, Military and Economic dimensions, hex map with X-split quadrant territories, drag-and-drop cards, real-time sync via SpacetimeDB subscriptions, victory at 3 unified territories |
| **Slice 2** | Single player vs AI: Zhao, Consortium, Prophet. Covert dimension. Deploy Agent card. LLM-powered reasoning cycles every 60 seconds. Intel system: earn access to AI plans by deploying agents. |
| **Slice 3** | Cultural dimension with passive spread mechanic. Cross-dimension bonuses. Victory expanded to 5 unified territories across all four dimensions. |
| **Slice 4** | Natural language query bar. Ten canned query buttons. Tab autocomplete. Live event ticker narrating every action. All powered by Claude against live database tables. |
| **Slice 5** | Multi-agent AI orchestration: commander + 4 domain specialists per AI. Human Strategist advisor with proactive alerts. Full keyboard control with discoverable hotkey hints. |
| **Slice 6** | Global chat with deception mechanics. AI opponents lie, threaten, and issue false reassurances. Per-player trust scores updated by cross-referencing claims against agent networks. Strategist flags likely deceptions. |
| **Slice 7** | Spectator mode (read-only live view with stats overlay). Replay system: scrubbable post-game timeline showing AI deliberation, chat history, trust score changes, and cultural pressure at any moment. |

---

## Documentation

- [GLOSSARY.md](risk-dominion/GLOSSARY.md) -- Every game term defined in plain English for judges and new players
- [ARCHITECTURE.md](risk-dominion/ARCHITECTURE.md) -- Technical deep-dive: tables, reducers, AI orchestration, data flow diagrams
- [DEMO_SCRIPT.md](risk-dominion/DEMO_SCRIPT.md) -- Timed 7-minute walkthrough script for presenting to judges
- [AESTHETIC.md](risk-dominion/AESTHETIC.md) -- Visual design system: colors, fonts, territory rendering, component specs
- [SETUP.md](risk-dominion/SETUP.md) -- Environment setup, verification, and troubleshooting

**Design decisions by slice:**
- [slice-1/DECISIONS_SLICE_1.md](risk-dominion/slice-1/DECISIONS_SLICE_1.md) -- Core gameplay design philosophy
- [slice-2/DECISIONS_SLICE_2.md](risk-dominion/slice-2/DECISIONS_SLICE_2.md) -- AI opponents and intel system design
- [slice-3/DECISIONS_SLICE_3.md](risk-dominion/slice-3/DECISIONS_SLICE_3.md) -- Cultural dimension and cross-dimension bonuses
- [slice-4/DECISIONS_SLICE_4.md](risk-dominion/slice-4/DECISIONS_SLICE_4.md) -- Query system and event ticker
- [slice-5/DECISIONS_SLICE_5.md](risk-dominion/slice-5/DECISIONS_SLICE_5.md) -- Multi-agent orchestration, Strategist, and hotkeys
- [slice-6/DECISIONS_SLICE_6.md](risk-dominion/slice-6/DECISIONS_SLICE_6.md) -- Global chat, deception mechanics, and AI trust system
- [slice-7/DECISIONS_SLICE_7.md](risk-dominion/slice-7/DECISIONS_SLICE_7.md) -- Spectator mode and replay system

---

## Team

| Name | Role |
|------|------|
| [Team member] | [Role] |
| [Team member] | [Role] |
