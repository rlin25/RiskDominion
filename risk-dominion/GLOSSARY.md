# GLOSSARY -- Risk: Dominion

Every game term defined in plain English. No assumed knowledge required.

For technical implementation details, see [ARCHITECTURE.md](ARCHITECTURE.md).

---

## Category Index

- [Game Concepts](#game-concepts): Action Points, Cross-Dimension Bonus, Information Warfare, Pre-Seeded Board, Real-Time, Risk: Dominion, Territory, Unification, Unified Territory Count, Victory Condition
- [Dimensions](#dimensions): Covert, Cultural, Dimension, Economic, Military, Quadrant Map, Split Ownership
- [Actions](#actions): Action Card, Card Hand, Deploy Agent, Drag-and-Drop, Economic Invest, Military Attack
- [AI Systems](#ai-systems): AI Opponent, Commander, Consortium, Deliberation Chain, Intel, Intel Threshold, Orchestration, Persona, Prophet, Reasoning Cycle, Specialist, Strategist, Strategist Alert, Subordinate, Trust Score, Zhao
- [Technical Terms](#technical-terms): Claude, Fire-and-Forget, LLM, Reducer, Replay Mode, Scheduled Reducer, SpacetimeDB, Spectator Mode, Subscription, Thread

---

## Game Concepts

**Action Points**
The currency you spend to take actions. Each player has a pool of action points, capped at 10. One point regenerates every 8 seconds automatically. Every card you play costs exactly 1 point. When your pool is empty, your card hand is empty and you must wait for regeneration. See also: Card Hand, Real-Time.

**Cross-Dimension Bonus**
A small mechanical advantage granted when you own multiple dimensions in the same territory. The four bonuses form a cycle: Military ownership makes economic investments in that territory more effective. Economic ownership amplifies the cultural pressure a territory exerts on its neighbors. Cultural ownership makes your agents in that territory count more effectively toward the intel threshold. Covert ownership (agents) adds to your attacking troop count when striking from that territory. The bonuses are modest by design -- they reward coordinated play without punishing specialization. See also: Dimension, Split Ownership.

**Information Warfare**
The strategic practice of shaping your information environment -- both gathering intelligence on opponents and feeding them false information. Covert presence lets you read AI reasoning stored in the database. In Slice 6, the battlefield extends to the chat channel: AI opponents actively lie, issue false warnings, and attempt to manipulate you into fighting their enemies. The Strategist cross-references AI chat claims against your agent network and flags likely deceptions. Information warfare now has two fronts: the intel system (what you learn about them) and the chat channel (what they want you to believe). See also: Intel, Covert, Trust Score, Deliberation Chain.

**Pre-Seeded Board**
The game does not start from an empty map. All 12 territories are populated with split ownership across dimensions before the first action is taken. Home territories (North America for the player, Western Europe for the Consortium, East Asia for Zhao, Middle East for the Prophet) are unified under their home factions. The remaining 8 territories are fractured, with different players owning different dimensions and cultural influence already accumulating. The game starts mid-conflict, not at peace.

**Real-Time**
There are no turns in Risk: Dominion. The game clock runs continuously. Action points regenerate on a fixed timer. Cultural influence spreads on a 30-second interval. AI opponents reason on 60-second cycles. You can act at any moment you have action points. Your opponents -- human or AI -- can act at any moment they have action points. Nothing waits. See also: Action Points, Reasoning Cycle.

**Risk: Dominion**
A real-time strategy game built on SpacetimeDB where the battlefield is a live multidimensional database. Each territory on the map is a collection of rows in dimension tables. Each player action is a database transaction. Each AI opponent is a native participant in the same database. The game's central claim: the database is not storage for a game. The database is the game.

**Territory**
One of 12 named regions on the hex map. Territories are grouped into three continents: the Americas (North America, Central America, Caribbean, South America), Europe-Africa (Western Europe, North Africa, Southern Africa, Eastern Europe), and Asia-Oceania (Middle East, South Asia, East Asia, Oceania). Each territory has four dimensions of ownership that can be held by different players simultaneously. See also: Dimension, Split Ownership, Quadrant Map.

**Unification**
A territory is unified when the same player owns all four dimensions -- Military, Economic, Cultural, and Covert -- at the same time. Unification is not permanent. If any dimension flips to another player, the territory is no longer unified. The player who unifies 5 territories first wins. See also: Unified Territory Count, Victory Condition.

**Unified Territory Count**
The number of territories in which a single player owns all four dimensions simultaneously. This is the game's score. Victory requires a count of 5. The count is dynamic -- a territory that was unified can become fragmented again if any single dimension flips to another player. See also: Unification, Victory Condition.

**Victory Condition**
The first player to unify 5 territories wins. A territory counts as unified only when one player owns all four of its dimensions (Military, Economic, Cultural, Covert) simultaneously. The win check runs after every dimension ownership change. There is no end-of-round resolution. The moment the fifth territory unifies, the game ends immediately. See also: Unification, Unified Territory Count.

---

## Dimensions

**Covert**
The third dimension of territorial ownership, representing intelligence operations. Covert ownership is held by the player with the most agents in a territory. There is no troop count or capital value -- only an agent count and an owner. Agents are deployed with the Deploy Agent card and accumulate over time. Covert ownership provides two benefits: it counts toward territory unification, and it enables the intel system when you have enough agents in AI-active territories. In Slice 3, covert agents also provide a direct bonus to military attacks launched from that territory. See also: Deploy Agent, Intel, Cross-Dimension Bonus.

**Cultural**
The fourth dimension introduced in Slice 3, representing ideological influence and social power. Cultural is the only dimension with no card -- you cannot play a card to claim it directly. Instead, cultural influence spreads passively every 30 seconds, driven by the economic strength of neighboring territories. When a neighbor's economy is strong, it exerts cultural pressure across the border. Influence accumulates as a percentage (0 to 100). When influence exceeds 50%, the Cultural dimension flips to the influencing player and the percentage resets. To shape Cultural spread, invest economically in territories near the ones you want to culturally influence. See also: Economic, Cross-Dimension Bonus, Scheduled Reducer.

**Dimension**
One layer of ownership within a territory. Risk: Dominion has four dimensions: Military, Economic, Cultural, and Covert. Each dimension is stored as a separate database table. A territory can have up to four different owners, one per dimension. Each dimension has its own rules for how ownership changes. When the same player owns all four dimensions in a territory, that territory is unified. See also: Split Ownership, Quadrant Map.

**Economic**
The second dimension of territorial ownership, representing capital and financial control. Economic ownership is held by the player with the most capital in a territory. Capital accumulates through Economic Invest cards. Each investment adds capital; when your capital exceeds the current owner's, you gain Economic ownership. Economic strength matters beyond its own dimension: the economic capital of a territory determines the cultural pressure it exerts on adjacent territories. See also: Economic Invest, Cultural, Cross-Dimension Bonus.

**Military**
The first and most direct dimension of territorial ownership, representing troop presence. Military ownership is determined by troop count. Attacking an adjacent territory compares your troop count to the defender's. If yours is higher, you take Military ownership. Troops do not deplete on a successful attack -- the comparison determines the outcome. Military ownership grants a bonus to economic investments in the same territory. See also: Military Attack, Cross-Dimension Bonus.

**Quadrant Map**
The visual representation of split ownership. Each hexagonal territory is divided into four triangular quadrants meeting at the center point. The top-left quadrant shows the Military owner's color, the top-right shows Economic, the bottom-left shows Cultural, and the bottom-right shows Covert. If a dimension has no owner, the quadrant shows a neutral dark gray. A territory that is fully unified shows a single solid color across all four quadrants. See also: Split Ownership, Dimension.

**Split Ownership**
The condition where different players own different dimensions of the same territory. This is the default state of the world, not an anomaly. Central America might be held militarily by the player, economically by the Consortium, culturally by the Prophet, and have Covert ownership by Zhao. The map renders this as four different colors in the same hex. Split ownership creates the strategic depth of the game -- you must plan across all four layers to unify a territory. See also: Dimension, Quadrant Map, Unification.

---

## Actions

**Action Card**
A physical representation of an available action. Cards appear in the card hand at the bottom of the screen. Each card represents one action type (Military Attack, Economic Invest, or Deploy Agent). A card is present in the hand if and only if you have an action point to spend it. Playing a card consumes one action point and removes the card. A replacement slides in when the next action point regenerates. See also: Card Hand, Action Points.

**Card Hand**
The row of action cards displayed at the bottom of the screen. The hand contains one card per available action point, up to a maximum of 10. All cards in the hand are identical in type -- the three types (Military, Economic, Covert) are available as long as action points allow. When action points reach zero, the hand is empty. Cards slide into the hand as points regenerate. See also: Action Card, Action Points.

**Deploy Agent**
The Covert action card. Drag a Deploy Agent card onto any territory to place one agent there. There is no adjacency restriction -- you can deploy to any territory regardless of your current presence. If you already own the Covert dimension in the target territory, your agent count increases. If another player owns Covert, you take ownership when your agent count exceeds theirs. Agents persist until another player deploys and overtakes your count. Deploying 3 agents into a territory where an AI has presence unlocks intel access. See also: Covert, Intel, Action Card.

**Drag-and-Drop**
The primary interaction model. To take an action, drag a card from the card hand onto a territory on the map. When you pick up a card, valid target territories glow with the appropriate color. Military cards highlight adjacent territories where you have military presence in red. Economic cards highlight all territories in gold. Covert cards highlight all territories in purple. Releasing a card on an invalid target returns the card to the hand with no effect. See also: Action Card, Card Hand.

**Economic Invest**
The Economic action card. Drag an Economic Invest card onto any territory to add capital to your economic stake there. Each investment adds a fixed amount of capital. If you own the Military dimension in the target territory, the investment receives a small bonus. If your total capital in a territory exceeds the current Economic owner's capital, you take Economic ownership. Economic investment is the indirect driver of cultural influence spread. See also: Economic, Cross-Dimension Bonus.

**Military Attack**
The Military action card. Drag a Military Attack card onto an adjacent territory to launch an attack. The attack compares your troop count in your source territory to the defender's troop count in the target territory. If your troops outnumber the defender's, you take Military ownership of the target. If you have covert agents in the target territory, their count is added to your attacking force. Adjacency is required -- you can only attack from a territory you own militarily to a territory that shares a hex edge. See also: Military, Covert, Cross-Dimension Bonus.

---

## AI Systems

**AI Opponent**
One of three computer-controlled players in the game: Zhao, the Consortium, and the Prophet. AI opponents are not separate programs running outside the database. They are rows in the same players table as the human, distinguished only by an `is_ai` flag. They have the same action point regeneration, the same action cost, and the same reducer validation rules as the human player. They cannot cheat. They can be spied on. See also: Zhao, Consortium, Prophet, Reasoning Cycle, Persona.

**Commander**
In Slice 5, the final decision-making agent in each AI's orchestration hierarchy. After the four domain specialists have submitted their recommendations, the commander receives all four sets of recommendations along with a full game state snapshot. It synthesizes the specialist input according to the AI's persona priorities, resolves conflicts, and submits the final action batch. The commander's reasoning is the last entry in the deliberation chain visible through the intel system. See also: Specialist, Deliberation Chain, Orchestration.

**Consortium**
One of three AI opponents. Player color: orange. The Consortium plays as a patient economic power -- it builds capital quietly, then converts wealth into territorial control. Its specialist subordinates are the Auditor (economic), Actuary (military, risk-averse), Courier (covert, defensive), and Appraiser (cultural, long-term). The Consortium attacks only to defend critical economic positions. It is the hardest opponent to disrupt because its strategy is slow and distributed. See also: AI Opponent, Persona, Reasoning Cycle.

**Deliberation Chain**
The full sequence of reasoning produced during a single AI orchestration cycle: four specialist analyses followed by the commander's synthesis. In Slice 5, every entry in the chain is logged to the `ai_reasoning_log` table with its subordinate identifier. When you have sufficient intel to access an AI's reasoning, you see the entire deliberation -- who recommended what, and why the commander agreed or overrode them. See also: Commander, Specialist, Intel, Orchestration.

**Intel**
The contents of an AI opponent's most recent reasoning cycle, accessible when you have met the intel threshold. Intel shows the AI's reasoning text and, in Slice 5, the full deliberation chain from all four specialists and the commander. The territories referenced in the AI's plans are highlighted on the map. Intel is a snapshot of the last completed cycle -- it may be up to 60 seconds old. See also: Intel Threshold, Deliberation Chain, Reasoning Cycle.

**Intel Threshold**
The minimum covert presence required to access an AI's reasoning. You need at least 3 effective agents in a territory where that AI has military or economic ownership. In Slice 3+, cultural ownership of the same territory by the player adds a 10% bonus to effective agent count for this calculation. If you meet the threshold, querying the AI returns its reasoning. If not, you receive: "Insufficient intel. Deploy agents in territories where this AI is active." See also: Intel, Covert, Cultural.

**Orchestration**
The architecture in which multiple AI agents work together on a single task. In Slice 5, each AI opponent's reasoning cycle uses orchestration: four specialist Claude calls run in parallel, each analyzing one domain of the game state with a narrow focused prompt. When all four complete, the commander calls Claude again with all four specialists' recommendations and produces the final decision. This contrasts with the single-agent approach in Slices 2 through 4, where one Claude call handled the full reasoning. See also: Commander, Specialist, Deliberation Chain.

**Persona**
The strategic personality that defines how an AI opponent reasons. Each AI has a priority ordering across the four dimensions:
- Zhao: Military first, then Covert, then Economic, then Cultural.
- Consortium: Economic first, then Cultural, then Military, then Covert.
- Prophet: Cultural first, then Covert, then Economic, then Military.

The persona is embedded in the prompts sent to Claude during reasoning cycles. It shapes how the commander resolves conflicts between specialist recommendations. See also: AI Opponent, Commander, Reasoning Cycle.

**Prophet**
One of three AI opponents. Player color: purple. The Prophet plays as a cultural and intelligence specialist -- it spreads cultural influence and deploys agents everywhere. Its specialist subordinates are Whisper (cultural), Oracle (covert, predictive), Seer (economic, culturally-focused), and Warden (military, attacks only when culture has already prepared the territory). The Prophet is the hardest to predict because its strategy is indirect and its progress is often invisible until a cultural flip occurs. See also: AI Opponent, Persona, Reasoning Cycle.

**Reasoning Cycle**
The 60-second interval at which each AI opponent analyzes the current game state and submits actions. In Slices 2 through 4, each cycle makes one Claude call. In Slice 5, each cycle makes five parallel Claude calls (four specialists plus one commander). The cycles are staggered: Zhao at 0s/60s/120s, Consortium at 20s/80s/140s, Prophet at 40s/100s/160s. If a cycle is still processing when the next one fires, the new cycle is skipped. A 30-second timeout (Slice 5: commander) prevents the game from freezing on slow API responses. See also: AI Opponent, Orchestration, Deliberation Chain.

**Specialist**
In Slice 5, one of four domain-focused Claude agents that analyze a subset of the game state for an AI opponent. Each AI has four specialists: one for Military, one for Economic, one for Cultural, and one for Covert. Each specialist receives only the game data relevant to its domain (not the full state), uses a focused prompt with the AI's persona context, and returns up to 3 recommended actions with one-sentence justifications. Specialists run in parallel. Their outputs are passed to the Commander. See also: Commander, Orchestration, Deliberation Chain.

**Strategist**
The player's AI advisor. Unlike the three AI opponents, the Strategist is not an adversary -- it is an ally. It runs its own 60-second cycle, offset 50 seconds from game start. Each cycle, it analyzes the full game state and identifies up to 3 notifications for the player: threats (what should concern you), opportunities (where you can gain an advantage), and weaknesses (where you are vulnerable). Notifications appear as dismissable alert cards in the top-right of the screen. The Strategist can also be queried directly through the query bar. See also: Strategist Alert, Reasoning Cycle.

**Strategist Alert**
A notification card generated by the Strategist and displayed in the top-right of the screen. Each alert has a priority level -- critical (red, pulsing border), warning (orange), or info (gray) -- and actionable text. Alerts fall into three categories: threats (what should concern you), opportunities (where you can gain advantage), weaknesses (where you are vulnerable), and -- added in Slice 6 -- Chat Analysis (when the Strategist cross-references an AI chat claim against your agent network and finds it likely false). If the alert references a specific territory, clicking the card body highlights that territory on the map. Alerts can be dismissed individually with the X button. Up to three active (non-dismissed) alerts are shown at a time. See also: Strategist, Trust Score.

**Subordinate**
Any AI agent that operates below a commander in an orchestration hierarchy. In the context of Risk: Dominion, the four domain specialists are subordinates of their faction's commander. The Strategist is a subordinate of the player (a helpful one, not adversarial). Each subordinate has a named identity that reflects the AI faction's persona. See also: Specialist, Commander, Orchestration.

**Trust Score**
A number from 0 to 100 that each AI opponent maintains for every other player, representing how reliable that player's claims have proven to be. Trust starts at 50 -- neutral. When an AI receives a chat message containing a factual claim, it cross-references the claim against its own agent network. If agents confirm the claim is true, trust increases. If agents prove the claim false, trust drops significantly. An AI with low trust in a sender will discount or ignore that sender's future messages. A player who lies early and gets caught will be doubted for the rest of the game. A player who builds a reputation for honesty can eventually cash it in with a devastating lie. Trust decays slowly over time if a sender goes silent. See also: Deliberation Chain, Intel, Reasoning Cycle.

**Zhao**
One of three AI opponents. Player color: red. Zhao plays as an aggressive military commander -- he masses troops and attacks where he has advantage. His specialist subordinates are Vanguard (military, aggressive), Paymaster (economic, funds military expansion), Scout (covert, finds intel gaps for combat bonuses), and Adjutant (cultural, dismissive -- only cares if culture supports a military objective). Zhao is the most direct opponent and the most predictable. If his troops are massing on a border, he is coming. See also: AI Opponent, Persona, Reasoning Cycle.

---

## Technical Terms

**Claude**
The large language model (LLM) made by Anthropic, accessed through the Anthropic API. In Risk: Dominion, Claude is used for: AI opponent reasoning cycles, specialist subordinate analysis, natural language query translation, Tab autocomplete suggestions, Strategist advisor analysis, and AI chat message generation. All Claude calls are made server-side from within SpacetimeDB scheduled reducers, using spawned threads to avoid blocking the game. See also: LLM, Reasoning Cycle, Strategist.

**Fire-and-Forget**
A pattern for writing to the event feed table inside a reducer without letting that write affect the reducer's primary outcome. Event writes are wrapped so that if the write fails, the main state change (the attack, the investment, etc.) still succeeds and persists. The event feed cannot break the game. This design choice ensures that a narrative side-effect never blocks or rolls back a core gameplay transaction. See also: Reducer, SpacetimeDB.

**LLM**
Large Language Model. A type of AI system trained to understand and generate natural language. In Risk: Dominion, the LLM used is Claude. LLM calls are made from server-side threads with timeouts. All prompts include a structured game state snapshot and explicit output format instructions to ensure consistent, parseable responses. See also: Claude.

**Reducer**
A server-side function in SpacetimeDB that validates and mutates database tables in a single transaction. When you drag a card onto a territory, the client calls a reducer. The reducer checks whether the action is legal (correct territory, sufficient action points, valid adjacency), mutates the relevant tables if so, and returns a result. Reducers are the only way to change game state. No client can directly write to a table. See also: SpacetimeDB, Subscription.

**Replay Mode**
A post-game view of a completed game, accessed by adding `?replay=true` to the URL after a game ends. A scrubbable timeline spans from game start to game end, with colored markers for every event. Dragging the playhead to any point in time reconstructs the map state, AI deliberation chain, chat history, and trust scores at that moment. Play, pause, and speed controls allow the full game to be watched back at 1x, 2x, or 4x speed. The replay proves that everything the AI did and said is preserved in the database and reviewable. See also: Spectator Mode, Deliberation Chain.

**Scheduled Reducer**
A reducer that fires automatically on a fixed time interval, without being triggered by a player. Risk: Dominion has four scheduled reducers: action point regeneration (every 8 seconds), cultural spread tick (every 30 seconds), AI reasoning cycle (every 60 seconds, three instances staggered 20 seconds apart), and Strategist advisor cycle (every 60 seconds, offset 50 seconds). Scheduled reducers are how time-based game mechanics are implemented inside the database. See also: Reducer, SpacetimeDB.

**SpacetimeDB**
The database platform that powers Risk: Dominion's backend. SpacetimeDB runs the database and the server in the same process -- there is no separate web server or API layer. Tables, reducers, subscriptions, and scheduled functions all live inside SpacetimeDB. Clients connect directly via WebSocket and receive real-time table updates through subscriptions. See also: Reducer, Subscription.

**Spectator Mode**
A read-only view of a live game, accessed by adding `?spectator=true` to the URL. A spectator subscribes to every SpacetimeDB table and sees all live updates -- the map, the event ticker, the chat panel, and the intel panel -- but cannot interact with any of them. Cards are not draggable. No reducers can be called. A stats overlay visible only to spectators shows hidden state: unified territory counts per faction, dimension dominance percentages, trust scores between every pair of players, AI cycle status, and territories with the highest cultural pressure. Multiple spectators can watch simultaneously. See also: Replay Mode, Subscription, SpacetimeDB.

**Subscription**
The mechanism by which the client receives live updates from SpacetimeDB. When a reducer mutates a table, SpacetimeDB automatically pushes the changed rows to all connected clients that have subscribed to that table. There is no polling. No REST requests. When Zhao takes a territory, every client's map updates within one second via subscription. See also: SpacetimeDB, Reducer.

**Thread**
A unit of concurrent execution in Rust. In Risk: Dominion, threads are used for all Claude API calls made from within scheduled reducers. Because Claude calls can take 10 to 30 seconds, they cannot block the main reducer execution. The pattern is: the reducer spawns a thread, returns immediately, and the thread makes the API call independently. When the thread completes, it writes results back to the database via internal reducer calls. See also: Fire-and-Forget, Reducer.
