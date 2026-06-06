# DEMO SCRIPT -- Risk: Dominion

A timed 7-minute walkthrough for presenting to judges.

Features marked **[Slice N]** depend on that slice being stable. If a slice is not yet complete, skip those sections and use the fallback timing table at the end.

**Total time:** 7 minutes. Rehearse at least twice before the demo.

---

## Setup (Before the Demo)

- Game is loaded and running at `http://localhost:5173`
- At least one full AI cycle has completed (Zhao fires at 0s/60s; wait 90s to ensure all three AIs have cycled at least once)
- Query bar is visible at the top of the screen
- Chat panel is visible and has at least one AI message in it
- Intel panel is closed
- No open results panels or active queries
- Anthropic API key is seeded into the private `module_config` table (`spacetime call risk-dominion set_config '"anthropic_api_key"' '"sk-ant-..."'`) and verified working
- A second browser tab is open at `http://localhost:5173?spectator=true` (minimized, ready to switch to)
- Terminal showing the SpacetimeDB server logs is visible in a side window (optional but impressive)

---

## 0:00-0:30 -- First Impression

**Say:**
"This is Risk: Dominion. It looks like a strategy game. But under the hood, the map is a live database running on SpacetimeDB. Every territory you see -- every color, every number -- is a row in a table, updating in real time."

**Do:**
- Gesture at the hex map. Point out the X-split quadrant colors in different territories.
- Point to the four home territories -- blue North America, red East Asia, orange Western Europe, purple Middle East -- each unified under their home faction.
- Point to the fractured territories in between, showing multiple colors in the same hex.
- Point to the ticker at the bottom: "The ticker at the bottom narrates everything that happens. You can see 'Game started' from when we loaded."

---

## 0:30-1:30 -- Core Gameplay

**Say:**
"Every action is a database transaction."

**Do:**
- Drag a Military (red) card onto an adjacent territory. "I drag this card onto a neighboring territory. That's a reducer call -- a transaction that validates my move and mutates the military table." Watch the territory quadrant change color. Point to the ticker: "The ticker just narrated it."
- Drag an Economic (gold) card onto any territory. "Economic investment. Another reducer. The capital value in the economic table increases."
- Drag a Covert (purple) card onto any territory. "Agent deployment. A third dimension."

**Say:**
"Three dimensions, three card types. But there's a fourth dimension that has no card."

**Do:**
- Point at a territory showing a teal-green cultural quadrant. "Cultural influence -- this teal -- spreads passively based on economic pressure. Every 30 seconds, the game calculates how much cultural pressure each territory is receiving from its neighbors. Strong economies create cultural gravity. I don't play a card to spread culture. I shape it by where I invest."
- If a cultural flip is imminent (high influence percentage visible), point it out: "This territory is at 40% foreign influence. It's about to flip."

---

## 1:30-2:30 -- Query System

**Say:**
"The battlefield is a database. I can query it."

**Do:**
- Click the "Winning" canned query button (or "Who is winning?"). Wait for the results panel to appear.
- Point at the results panel: "A data table with live values. And the relevant territories are highlighted on the map."

**Say:**
"Those ten buttons are pre-built queries. But I can ask anything."

**Do:**
- Click the query bar and type: `Where is Zhao strongest?`
- Press Enter. Wait for results.

**Say:**
"That question just went to Claude -- the same LLM you know -- through a SpacetimeDB procedure that calls the Anthropic API over HTTP, along with a snapshot of every table in the database right now. Troop counts, capital values, agent counts, influence percentages. Claude translated my English question into a structured answer -- a summary, a data table, and a list of territories -- and the procedure returned it straight to the client. All from live data. Not a cached summary. Not a mock."

- Point at the highlighted territories on the map.
- Press the X button to close the results panel.

---

## 2:30-3:30 -- AI Orchestration [Slice 5]

**Say:**
"The AI opponents aren't simple bots. Each one runs a council of specialists."

**Do:**
- If needed, deploy 3 agents into a territory where Zhao has military or economic presence to meet the intel threshold.
- Click the Intel button or press I to open the intel panel. Select Zhao.

**Say:**
"This is Zhao's last reasoning cycle. Not just what he decided -- the full chain of reasoning from his team."

**Do:**
- Point at the deliberation entries in the Intel panel.
- Walk through them: "His military specialist -- Vanguard -- identified an attack target and justified it. His covert specialist -- Scout -- confirmed the intel. His economic and cultural specialists weighed in. Then Zhao, as commander, synthesized all four recommendations and made the final call."

**Say:**
"That's five separate Claude calls, all issued from one scheduled SpacetimeDB procedure -- the AI reasoning cycle. Four specialists, each seeing only their domain of the database, then one commander synthesizing the output. A procedure is the only kind of function that's allowed to make HTTP calls, so every one of those calls fires from `ctx.http` straight to the Anthropic API. All of it logged to a database table. Traceable. Queryable. And happening every 60 seconds for all three AI opponents."

**Do (optional):**
- Point at the SpacetimeDB server log window: each cycle prints the outbound HTTP calls to `api.anthropic.com`. "You can watch the actual requests fire here."

---

## 3:30-4:15 -- Strategist and Alerts [Slice 5]

**Say:**
"I also have an AI on my side."

**Do:**
- Point to the alert cards in the top-right corner (should be visible if 50+ seconds have passed since game start).

**Say:**
"Every 60 seconds, my Strategist analyzes the full game state and pushes me notifications. Threats, opportunities, weaknesses."

**Do:**
- Read one of the alerts aloud. Point to its priority indicator (red/orange/gray border).
- If an alert references a territory, click the card body: "Clicking an alert highlights the territory it's warning me about."
- Dismiss one alert with the X button: "And I can dismiss them when I've acknowledged them."

**Say:**
"The Strategist isn't a separate program. It's another scheduled procedure, another Claude call over `ctx.http`, writing its alerts to another table in the same SpacetimeDB instance."

---

## 4:15-4:45 -- Hotkeys [Slice 5]

**Say:**
"And I can command all of this from the keyboard."

**Do:**
- Press `1` to focus the Military card. Point to the hotkey hint square on the card.
- Press `2` to focus the Economic card. Press `3` for Covert.
- Press `W`, `A`, `S`, `D` -- show the selection cursor moving across the hex map.
- Press `Enter` to execute the action.

**Say:**
"Full keyboard control. WASD to navigate the map, 1, 2, 3 to select a card, Enter to confirm. The hints are printed right on the cards -- no documentation required."

**Do:**
- Press `Q` to focus the query bar: "Q focuses the query bar."
- Press `Escape` to return: "Escape exits and restores hotkeys."
- Press `H` to highlight owned territories: "H shows me everything I own across all dimensions."
- Press `I` to toggle the Intel panel: "I toggles the intel panel."

---

## 4:45-5:45 -- Deception and Chat [Slice 6]

**Say:**
"And then there is the fifth dimension of conflict: deception."

**Do:**
- Open the chat panel. Point to messages already in the channel.

**Say:**
"Every AI opponent can send messages. They lie. They threaten. They try to turn you against their enemies while they quietly move elsewhere."

**Do:**
- Read aloud a Consortium message and a Zhao message. If they contradict each other, point that out.
- Point to a Strategist alert flagging a likely deception: "My Strategist cross-referenced this claim against my agent network. It did not check out."

**Say:**
"Every AI maintains a trust score for every other player. Claims are verified against their own agents. Lie and get caught -- trust drops. That penalty lasts the rest of the game. You can build a reputation for honesty and cash it in later with a single devastating lie."

**Do:**
- Type a message into the chat: "Zhao is massing on the western border." Send it.
- Point at it: "I can lie too. The AIs will evaluate this claim against their own intel."

---

## 5:45-6:45 -- Spectator and Replay [Slice 7]

**Say:**
"Let me show you what the database looks like from outside the game."

**Do:**
- Switch to the second browser tab with `?spectator=true`.

**Say:**
"This is spectator mode. Read-only. Anyone can open this URL and watch the game live. The stats overlay shows information the player would love to have -- trust scores between every faction, dimension dominance percentages, which AI cycle is active right now."

**Do:**
- Point to each stat in the overlay.
- Switch back to the main tab: "Meanwhile the game is still running. The spectator sees every update."

**Say:**
"After the game ends, there is one more thing."

**Do:**
- Open a new tab with `?replay=true`. (If a completed game is not available, describe this section verbally.)
- Show the timeline bar at the bottom. Scrub to an earlier point.

**Say:**
"Every AI deliberation. Every chat message. Every trust score update. Every cultural pressure tick. The database recorded all of it. Now I can scrub back to any moment and see exactly what every AI was thinking -- and whether they were lying."

---

## 6:45-7:00 -- Wrap Up

**Say:**
"Risk: Dominion. Four dimensions. AI opponents that deliberate through councils of specialists. A database you can interrogate in plain English. A chat channel where every message is a potential weapon. And a complete replay of every thought the AI ever had."

**Pause for effect.**

"Every action a transaction. Every update a subscription. Every AI a native participant in the same live database."

**Do:**
- Gesture at the ticker, which is still scrolling.
- If a territory is close to unification, point to it: "This territory is one dimension away from unification -- which would put us one step from victory."

**Say:**
"Thank you. Happy to take questions."

---

## Fallback Timing by Slice

Drop any slice not yet validated and compress accordingly:

| Slices Available | Total Time | Notes |
|-----------------|------------|-------|
| 1-4 only | 4 min | Drop orchestration, hotkeys, chat, replay. Add ticker recap at 3:30. |
| 1-5 | 5 min | Drop chat and replay. Expand orchestration and hotkeys to fill. |
| 1-6 | 6 min | Drop replay. Expand chat segment to 1:30. |
| 1-7 (full) | 7 min | Use this script as written. |

**Ticker Recap (if Slice 5+ not available):** Trigger a few actions rapidly, then point to the ticker entries -- "The ticker narrated every one of those. A judge who walks up right now can read the last 30 seconds of the game without knowing any of the rules."

---

## Common Questions and Answers

**"Is the AI actually calling Claude, or is it simulated?"**
"Every AI reasoning cycle is a live Anthropic API call made from a SpacetimeDB procedure via `ctx.http`. You can see the SpacetimeDB server logs -- the HTTP request fires every 60 seconds. In Slice 5, that's five API calls per AI per cycle, all from the one reasoning procedure."

**"Why a procedure and not a reducer for the AI?"**
"Reducers in SpacetimeDB are deterministic and sandboxed -- they cannot make HTTP calls and cannot return data to clients. Anything that talks to Claude has to be a procedure, which is the only function type with HTTP access through `ctx.http`. The reasoning cycle snapshots the board in one transaction, makes the Claude call with no transaction held open, then commits the AI's actions in a second transaction. Player actions stay as plain deterministic reducers."

**"What happens if the API is slow?"**
"Each specialist call has a 15-second request timeout. The commander has a 30-second timeout. On timeout, the AI misses that cycle and the ticker shows a timeout event. The game never freezes."

**"Why SpacetimeDB?"**
"Because SpacetimeDB puts the database and server in the same process. There's no separate backend, no REST layer, no WebSocket middleware. The client subscribes directly to tables, and procedures handle anything that needs an outbound call like Claude. That's what makes the real-time sync under one second -- the architecture has no extra hops."

**"Can I see the AI reasoning?"**
"Yes -- if you deploy at least 3 agents in a territory where the AI has military or economic presence, you can query its intel. In Slice 5, you see the full deliberation chain from every specialist and the commander."

**"Do the AIs actually lie in chat, or is that scripted?"**
"Every message is a live Claude call. The AI decides what to say based on its current strategy and trust scores. If it is preparing an economic attack, it may try to distract you with false military warnings. There is no script. The lie is chosen by the model in the same reasoning cycle that picks the AI's actions."

**"What does the spectator see that the player does not?"**
"Trust scores between every pair of players, dimension dominance percentages across the whole board, which AI cycle is currently running, and territories with the highest foreign cultural pressure. The player has to earn intel through agents. The spectator sees everything."
