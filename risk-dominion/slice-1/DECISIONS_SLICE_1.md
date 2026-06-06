# RISK: DOMINION — SLICE 1 DESIGN DECISIONS

## Version 1.0
## Scope: Two Players, Two Dimensions, Core Gameplay
## Target: Claude Code Generation

---

## Principle 0: The Database Is the Game

SpacetimeDB is not a backend for this game. SpacetimeDB is the game.

Every territory, every dimension of ownership, every action, and every player state exists as a live, queryable, transactional table. The player does not play on a database. The player plays against a database — mutating it, watching it change in real time, and racing another human to unify it under their control.

No game logic lives outside the server modules. No state is local-only. Every change is a subscription. Every action is a reducer. The platform is not a convenience. The platform is the premise.

In this slice, two human players share the same database instance. They see the same state. They mutate the same tables. The database is the shared battlefield, and the subscriptions are their window into it.

---

## Principle 1: One Map, Multiple Layers

The player sees a single geographic map divided into twelve named territories across three continents. Each territory is not owned in the singular. It is owned per dimension.

In this slice, two dimensions are active:

- **Military** — troop presence. Resolved by direct comparison of troop counts between adjacent territories. The dimension of aggression and territorial control.
- **Economic** — accumulated capital. Resolved by investment exceeding the current owner's capital. The dimension of buildup and economic pressure.

A territory where Player 1 holds Military and Player 2 holds Economic is not an anomaly. It is the default state of the world. The map renders each territory as a two-color rectangle — left half showing the Military owner's color, right half showing the Economic owner's color.

A territory is "unified" when one player controls both of its dimensions simultaneously. Victory is measured in unified territories, not conquered landmass. The map is not a scoreboard. The map is a live query result.

Future slices will activate additional dimensions. The architecture is designed for extension. Two dimensions are active now.

---

## Principle 2: Dimensions Are Tables, Not Properties

Each dimension is its own SpacetimeDB table. They share a territory ID as a join key, but they are independent structures, each a `public` table so both players can subscribe:

```rust
#[spacetimedb::table(accessor = military, public)]
pub struct Military {
    #[primary_key]
    pub territory_id: i32,
    pub owner_id: i32,
    pub troop_count: i32,
}

#[spacetimedb::table(accessor = economic, public)]
pub struct Economic {
    #[primary_key]
    pub territory_id: i32,
    pub owner_id: i32,
    pub capital: i32,
}
```

This schema is the game's conceptual model. "Who controls Central America militarily?" is a query against the military table. "Where am I economically dominant?" is a query against the economic table. The player is not playing a game that happens to use a database. The player is interacting with dimension tables that happen to be rendered as a map.

Ownership changes are transactional. When a Military attack succeeds, the reducer updates the military table, checks if the territory is now unified, and triggers the win check — all in one transaction. No partial state. No desyncs.

---

## Principle 3: Real-Time, Card-Driven Action

There are no turns. The game clock is always running. Both players share the same real-time stream.

Each player has a global pool of action points, capped at 10. Points regenerate at exactly 1 per 8 seconds. At game start, each player begins with 5 points — enough to act immediately, not enough to flood the board.

Every action costs exactly 1 point. There are no variable costs. The strategic depth comes from choosing which territory and which dimension to act upon, not from weighing point values. The action point integer is simple enough to be a single reducer line. The decisions it forces are rich enough to carry the game.

Actions are represented as a hand of cards at the bottom of the screen. Each card maps to one dimension-action pair. A card is present in the hand if and only if an action point is available to spend it. When points hit zero, the hand is empty. When a point regenerates, a card slides into the hand. The hand is the action point counter rendered visually.

In this slice, there are exactly two card types:

- **Military Attack** — red card, sword icon. Drag onto a territory adjacent to one the player controls militarily. Compares troop counts. Flips ownership if attacker has more troops.
- **Economic Invest** — gold card, coin icon. Drag onto any territory. Adds capital. Flips ownership if the player's capital exceeds the current owner's.

To act, the player drags a card from their hand onto a territory on the map. Upon pickup, valid target territories glow. Military cards: only adjacent territories with the player's military presence glow red. Economic cards: all territories glow gold. Invalid drops are mechanically impossible. The map guides the player.

When a card is played, it leaves the hand. The action point is consumed. A replacement card arrives with the next regeneration tick. The hand is never empty for long. It is never infinite.

---

## Principle 4: Two Players, One Database

In this slice, two human players share the same SpacetimeDB instance. There is no authentication. There is no lobby. There is no matchmaking.

Player identity is determined by a URL parameter: `?player=1` or `?player=2`. Player 1 is blue (#4488FF). Player 2 is red (#FF4444). Both connect to the same SpacetimeDB instance. Both subscribe to the same tables. Both see the same map, the same territory ownership, and each other's actions in real time.

The game initializes when the first player loads and calls `start_game`. If the game state already exists, subsequent `start_game` calls are ignored. The second player sees the pre-seeded board immediately via subscription and can begin acting.

Each player sees only their own card hand and action point bar. The map is shared. Territory ownership changes are visible to both players within one second via SpacetimeDB subscriptions.

This is the simplest possible multiplayer. It proves the real-time sync architecture without building any multiplayer UI. It also proves a core design claim: any faction slot in the dimension tables is just a player ID. Nothing in the schema distinguishes a human from any other kind of player.

This principle will be replaced in Slice 2 when the game becomes single-player against AI opponents. The replacement will be clean: the schema stays the same. The player count changes. The architecture is already multiplayer-ready.

---

## Principle 5: Victory Through Unification

The game ends when one player controls both dimensions in 3 territories simultaneously.

"Simultaneously" means at the moment of checking. Both dimension owner columns for a given territory must point to the same player ID right now. If Player 1 unified North America but lost Economic control 30 seconds later, North America no longer counts. Unification must be held, not just achieved.

The win check runs after every successful dimension ownership change, inside the same transaction:

```
When military or economic ownership changes:
    Count territories WHERE military.owner_id = player AND economic.owner_id = player.
    If count >= 3:
        End game. Winner = player.
```

There is no end-of-round resolution. No delayed victory. The moment the third territory flips to unified, the game is over. A persistent victory tracker shows each player's current unified territory count. No hidden thresholds. No surprise endings.

---

## Principle 6: Pre-Seeded, Always Alive

The game does not start from an empty board. It starts from a deliberately constructed mid-game state.

Twelve territories are pre-seeded with split ownership across the two dimensions. Player 1's home territory (North America) is unified. Player 2's home territory (Western Europe) is unified. The remaining ten territories are fractured — some dimensions owned by Player 1, some by Player 2, creating immediate strategic tension.

This serves three purposes:

**Demo impact.** A judge watching the game sees the full concept — two-color territories, split ownership, action cards, real-time updates — within 10 seconds of loading. No waiting for the game to get interesting.

**Tutorial by exposure.** The pre-seeded state teaches the rules implicitly. Players see territories owned by both players across different dimensions. They see the two-color map. They understand split ownership before they take their first action.

**Narrative momentum.** Neither player is building from scratch. They are seizing control of a world already in motion. The borders are contested. The first decision matters immediately.

---

## Summary of Locked Decisions for Slice 1

| Decision | Outcome |
|----------|---------|
| Game name | Risk: Dominion |
| Board representation | Single geographic map, 12 territories, 3 continents |
| Territory rendering | Two-color rectangles (Military left, Economic right) |
| Data model | Two dimension tables: military, economic |
| Active dimensions | Military, Economic |
| Ownership | Split per dimension per territory |
| Time system | Real-time, no turns |
| Action economy | Global pool, 1pt/8sec regen, 1pt flat cost, 10pt cap |
| Starting points | 5 per player |
| Card types | Military Attack (red), Economic Invest (gold) |
| Player input | Drag-and-drop cards onto highlighted valid targets |
| Card hand | Cards present only when action points available |
| Players | 2 humans via URL parameter (?player=1, ?player=2) |
| Multiplayer model | Shared SpacetimeDB instance, no auth, no lobby |
| Player colors | Player 1: #4488FF (blue), Player 2: #FF4444 (red) |
| Win condition | Unify 3 territories (both dimensions owned by same player) |
| Win check timing | After every dimension ownership change, in-transaction |
| Starting state | Pre-seeded mid-game board, 12 territories |
| Home territories | Player 1: North America, Player 2: Western Europe |
| Combat resolution | attacker_troops > defender_troops (no randomness) |
| Economic flip | Player's capital exceeds current owner's capital |
| Economic invest amount | +5 capital per action |
| Server structure | Single lib.rs with all tables, reducers, scheduled reducers |
| Frontend stack | React 18 + TypeScript + Vite + dnd-kit + Tailwind CSS |
| Map rendering | Plain SVG (hexagonal grid per AESTHETIC.md Section 4) |

---

## End of Slice 1 Decisions Document

This document contains no table column types, no reducer function signatures, no subscription shapes. Those belong to the Slice 1 Interface Contract.

What this document contains is the answer to every design question the Slice 1 build will encounter. When a teammate asks whether Military has adjacency restrictions — the answer is here. When Claude Code generates a reducer and the behavior feels ambiguous — the answer is here. When a judge asks why there are no turns — the answer is here.

The next document is the Slice 1 Interface Contract. It will specify every table column type, every reducer signature, every subscription shape, the exact seed data, and every wire format for Slice 1.