# RISK: DOMINION — SLICE 4 DESIGN DECISIONS

## Version 1.0
## Scope: Query System, Event Ticker (Slice 4 of 7)
## Relationship: Extends DECISIONS_SLICE_3.md

---

## 0. HOW TO READ THIS DOCUMENT

This document describes what changes in Slice 4. It does not repeat everything from Slices 1, 2, and 3.

**All prior principles remain in effect unless this document explicitly modifies them.** If a principle is not mentioned here, it is unchanged.

Slice 3 gave us the complete four-dimension game. Military, Economic, Cultural, and Covert. Three AI opponents with distinct personas. Cross-dimension bonuses that reward coordinated play. Cultural influence that spreads like a creeping tide. Victory at 5 unified territories.

Slice 4 adds the final layer: the ability to talk to the database and a live narrative feed that tells the story of the game. This is the polish slice. The features that make a judge stop mid-demo and say "wait, that's real?"

---

## 1. WHAT SLICE 4 CHANGES

| Slice 3 | Slice 4 |
|---------|---------|
| Game state visible only on the map | Game state queryable in natural language |
| No strategic query tools | 10 canned query buttons for instant answers |
| Events happen silently | Every event narrated in a scrolling ticker |
| Judge must understand rules to follow demo | Judge reads ticker, understands immediately |
| 4 dimensions, 3 AI, complete gameplay | All of the above, plus query system and narrative layer |

Slice 4 does not change any existing gameplay mechanics. Military combat, economic investment, agent deployment, cultural spread, AI reasoning, cross-dimension bonuses, and the win condition all remain exactly as they were in Slice 3. Slice 4 adds new ways to see and understand the game, not new ways to play it.

---

## 2. NEW PRINCIPLES

### New Principle 10: Query Everything

The battlefield is a live database. In Slices 1 through 3, you could see the database — the colored quadrants on the map are live table rows. But you could not talk to it. Slice 4 changes that.

A query bar sits at the top of the screen. It looks like a command line. A blinking prompt character invites you to type. You can ask anything about the game state in plain English.

"Where is Zhao strongest?"

The game sends your question to Claude, along with a snapshot of the current game state — every territory, every owner, every troop count, every capital value, every influence percentage, every agent. Claude translates your question into a structured answer. The response appears in a results panel: a one-sentence summary, a data table with columns and rows, and a list of territory IDs that are highlighted on the map with a gold glow.

You didn't click through menus. You didn't memorize a query language. You asked a question about a live database and got an answer in seconds.

This is the thesis of the entire project. The database is not a storage layer. The database is the game. And now you can talk to it.

**The query bar is ambitious.** Natural language processing is never perfectly reliable. That's why ten canned query buttons sit right below the bar. Each one is a pre-built question that always works instantly:

0. **"Where am I weakest?"** — Shows territories where you own the fewest dimensions. Tells you where to focus.
1. **"Show contested territories."** — Shows territories where three or more different players each own at least one dimension. The most volatile regions on the map.
2. **"Where is Zhao about to attack?"** — Shows territories adjacent to Zhao's military holdings that he doesn't already control. Early warning system.
3. **"Which territories are closest to unification?"** — Shows territories where someone owns three of four dimensions. The most dangerous places on the map.
4. **"Show my economic dominance."** — Shows every territory where you own the Economic dimension, ranked by capital. Your financial empire at a glance.
5. **"Where is my covert presence too thin?"** — Shows territories where you have zero agents but opponents are active. Tells you where to deploy.
6. **"What is the Consortium's strongest dimension?"** — Shows which dimension the Consortium controls in the most territories. Reveals their strategy.
7. **"Where is cultural influence spreading fastest?"** — Shows territories with the highest foreign influence percentages. The next likely cultural flips.
8. **"Show me territories with cross-dimension bonuses."** — Shows territories where you own multiple dimensions and are receiving synergy bonuses.
9. **"Who is winning?"** — Shows the unified territory count for every player. The scoreboard.

These buttons send optimized, pre-tested prompts to Claude. Because the questions are fixed and the prompt wording has been refined, their responses are more consistent than freeform queries. They demonstrate the full capability of the query system — live database interrogation through natural language — with lower variance. A judge who clicks "Who is winning?" and sees a live data table with highlighted territories understands exactly what this project is.

The natural language bar is the explorer. The canned queries are the guided tour. Both are real. Both query the live database through Claude. Neither uses dummy data or mock responses.

### New Principle 11: The World Narrates Itself

In Slices 1 through 3, things happened on the map. Colors changed. Territories flipped. AI opponents made moves. But if you weren't looking at the right territory at the right moment, you missed it.

Slice 4 adds an event ticker — a scrolling feed at the bottom of the screen that narrates everything that happens in real time. It looks like a news ticker or a system log. Events scroll from right to left. Each event is a single sentence.

Every significant action in the game writes an event. Here is what the ticker reports:

- **Game start:** "Game started. Four factions vie for control."
- **Military victory:** "Zhao seized military control of Brazil from Player."
- **Military defeat:** "Player's attack on East Asia was repelled by Zhao."
- **Economic flip:** "Consortium gained economic control of North Africa from Prophet."
- **Economic investment:** "Player invested in South America. Capital now 25."
- **Agent deployment:** "Prophet deployed an agent in Western Europe."
- **Cultural spread:** "Consortium's cultural influence spread to Southern Africa, displacing Prophet."
- **Territory unified:** "Player unified North America — 2 of 5 toward victory."
- **Victory:** "Player wins! All five territories unified."
- **AI failure:** "Zhao's command appears to be in disarray." (the AI's Claude call errored or timed out)

Each event is color-coded. If Zhao takes a territory, the event text has a red indicator. If the Consortium invests, orange. If culture spreads, the event uses the cultural owner's color. A small icon sits before each event — a sword for military, a coin for economic, a book for cultural, an eye for covert, a trophy for victory, a gear for system messages.

Clicking an event highlights the relevant territory on the map. If the ticker says "Zhao seized military control of Brazil," clicking that event makes Brazil glow gold. You can see exactly where the action happened.

The ticker serves two audiences.

**For the player,** it is ambient awareness. You might be focused on your military campaign in the Americas. The ticker tells you that the Prophet just deployed agents in your economic stronghold in Europe. You didn't see it happen on the map, but you know it happened. The world is alive whether you're watching or not.

**For spectators and judges,** it is a live narrative that requires zero game knowledge. A judge walking past your screen during the hackathon can read three lines of the ticker and understand exactly what's happening. "Zhao seized military control of Brazil. Consortium invested in Western Europe. Player unified North America — 2 of 5 toward victory." They don't need to know the rules. The ticker tells the story.

The ticker is not decoration. It is the spectator-facing interface. In a 48-hour hackathon where judges spend 2–3 minutes at each project, the ticker ensures those 2–3 minutes are filled with visible drama.

**The ticker displays the last 50 events.** This is a display choice, not a data limit. The server stores every event for the entire game session. The ticker scrolls to show the newest events. Older events scroll off the left side of the screen. Nothing is lost — the display is a window, not a cutoff.

**The ticker touches nearly every game-state change.** Adding event writes means modifying the code that handles military attacks, economic investments, agent deployments, cultural spread ticks, unification checks, the AI reasoning cycle, and game start. This is the most widespread change in any slice. Each event write is a pure side effect of the action's transaction: it is the last operation, appended after the state change, sharing the same atomic transaction. The narrative is a faithful recorder of what actually committed, never an obstacle to it. (Player and AI actions both flow through the shared action helpers, so a single event write per helper narrates both.)

---

## 3. WHAT SLICE 4 DOES NOT CHANGE

- Military combat: unchanged from Slice 3.
- Economic investment: unchanged from Slice 3.
- Agent deployment: unchanged from Slice 3.
- Cultural spread: unchanged from Slice 3.
- Cross-dimension bonuses: unchanged from Slice 3.
- AI reasoning cycles: unchanged from Slice 3.
- Win condition: still 5 unified territories across all four dimensions.
- The map: still 12 hex territories, three continents.
- Card types: still Military, Economic, Covert. Cultural remains passive.
- Action points: still 1 per 8 seconds, cap 10.

Slice 4 adds sight and story. It does not change the game.

---

## 4. SUMMARY OF NEW LOCKED DECISIONS

| Decision | Outcome |
|----------|---------|
| Query system | Natural language query bar at screen top |
| Canned queries | 10 pre-built buttons covering all dimensions and strategic concerns |
| Query result format | Summary text, data table (columns + rows), highlighted territory IDs |
| Query mechanism | All queries (freeform and canned) are procedures that call Claude over ctx.http and return structured data; the client invokes them via useProcedure |
| Event feed | `event_feed` is a public event/log table that the server writes as a side effect. Server retains full history. |
| Event ticker | Scrolling bar at screen bottom. Last 50 events displayed. Color-coded by player. Icons by dimension. |
| Event click | Clicking an event highlights the referenced territory on the map |
| Event types | 10 event types: start, military success, military failure, economic flip, economic invest, agent deploy, cultural flip, unification, victory, AI failure |
| Event writes | A side effect of the action's transaction; last operation, atomic with the state change, never an obstacle to it |

---

## 5. AFTER SLICE 4

Slice 4 adds the query and narrative layer. After Slice 4, Risk: Dominion has all four dimensions, three AI opponents, cultural spread, natural language queries, and a live event ticker. Slices 5 through 7 still follow: Slice 5 adds multi-agent orchestration, keyboard controls, and the human Strategist advisor; Slice 6 adds chat with deception and trust; Slice 7 adds the spectator and replay layer.

The player can:
- Drag cards to attack, invest, and deploy agents across four dimensions
- Watch cultural influence spread passively based on economic strength
- See cross-dimension bonuses reward coordinated play
- Fight three AI opponents with distinct personas and LLM-powered reasoning
- Spy on AI plans through the covert intel system
- Query the live database in natural language
- Follow the game's story through a scrolling event ticker
- Win by unifying 5 territories across all four dimensions

What began in Slice 1 as a two-player, two-dimension board game is now a full strategic experience where the database is the battlefield, AI agents are native participants, and information itself is a weapon.

The next document is the Slice 4 Interface Contract. It will specify every new table, every modified reducer, the query bar component, the event ticker component, and the exact event strings for every game action.

---

## End of Slice 4 Decisions Document

This document, combined with DECISIONS_SLICE_1.md through DECISIONS_SLICE_3.md, contains the design philosophy for Slices 1 through 4. All principles from prior slices not explicitly modified here remain in full effect. See DECISIONS_SLICE_5.md for the advanced capabilities slice.