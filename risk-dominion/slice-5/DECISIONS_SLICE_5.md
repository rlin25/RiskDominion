# RISK: DOMINION — SLICE 5 DESIGN DECISIONS

## Version 2.0 (SpacetimeDB 2.4.1)
## Scope: Subagent Orchestration, Hotkeys, Human Strategist
## Relationship: Extends DECISIONS_SLICE_4.md — Advanced Capabilities Slice (Slice 5 of 7)

---

## 0. HOW TO READ THIS DOCUMENT

This document describes what changes in Slice 5. It does not repeat everything from Slices 1 through 4.

**All prior principles remain in effect unless this document explicitly modifies them.** If a principle is not mentioned here, it is unchanged.

Slice 4 completed the feature set. The game has four dimensions, three AI opponents, cultural spread, cross-dimension bonuses, a natural language query system, and a live event ticker. It is a complete, playable, demo-ready game.

Slice 5 does not add new gameplay mechanics. It adds intelligence and speed. The AI opponents become smarter through multi-agent orchestration. The human player becomes faster through keyboard controls. And the player gains an AI ally — a Strategist that watches the game and offers advice.

This is the "advanced capabilities" slice. It elevates the game from complete to exceptional.

---

## 1. WHAT SLICE 5 CHANGES

| Slice 4 | Slice 5 |
|---------|---------|
| AI has one reasoning agent per cycle | AI has a commander + 4 specialist subordinates |
| AI reasoning is a single thought | AI reasoning is a traceable deliberation chain |
| Player has no AI assistant | Player has a Strategist subordinate offering proactive advice |
| Player uses mouse for everything | Player can command the game from the keyboard |
| Intel shows AI's final plan | Intel shows full deliberation: who recommended what |

---

## 2. NEW PRINCIPLES

### New Principle 12: Many Minds, One Purpose

In Slices 2 through 4, each AI opponent had a single mind. One reasoning cycle. One Claude call. One batch of actions. The AI thought alone.

In Slice 5, each AI opponent becomes a team. A commander sets the overall strategy. Specialist subordinates analyze their domains in depth. The military specialist examines every possible attack target. The economic specialist identifies the best investment opportunities. The cultural specialist monitors influence spread and predicts where the next flip will occur. The covert specialist assesses intel gaps and recommends agent placement. Each specialist is an independent Claude call with a narrow, focused prompt. Each sees only the game data relevant to their domain.

The commander receives recommendations from all four specialists. It resolves conflicts — the military specialist wants to attack Brazil, but the economic specialist says invest in Brazil instead. It weighs the options against the AI's persona. It submits the final action batch.

This is real multi-agent orchestration. Five minds working together inside a live database. The player who queries intel no longer sees just "Zhao plans to attack Brazil." They see the full deliberation:

- **Zhao's Vanguard** (military specialist): "Brazil is vulnerable. Player has only 4 troops there. We have 8 troops adjacent. Recommend attack."
- **Zhao's Scout** (covert specialist): "Confirmed. We have 3 agents in Brazil. Attack bonus of +3 applies. Target is clear."
- **Zhao's Paymaster** (economic specialist): "Concur. Brazil's economy is weak. No economic opportunity lost by attacking."
- **Zhao's Adjutant** (cultural specialist): "Cultural pressure from Brazil is negligible. No long-term cultural cost to military action."
- **Zhao (Commander)** : "All subordinates concur. Executing military strike on Brazil."

The AI's thinking is transparent. The player understands not just what the AI is doing, but why. This is a genuine technical achievement — multi-agent LLM coordination with traceable reasoning — and it is visible to the player through the intel system that has existed since Slice 2.

**Each AI has uniquely named subordinates** that reflect its persona:

**Zhao's Team (The General's Staff):**
- **Vanguard** — Military specialist. Aggressive. Finds attack opportunities and ranks them by probability of success.
- **Paymaster** — Economic specialist. Pragmatic. Identifies investments that fuel military expansion.
- **Scout** — Covert specialist. Tactical. Finds intel gaps and recommends agent placement for combat bonuses.
- **Adjutant** — Cultural specialist. Dismissive. Monitors cultural pressure but always recommends military solutions.

**The Consortium's Team (The Board of Directors):**
- **Auditor** — Economic specialist. Calculating. Models capital flows and projects returns on investment.
- **Actuary** — Military specialist. Risk-averse. Recommends defensive postures and minimal necessary force.
- **Courier** — Covert specialist. Watchful. Monitors competitor agent movements and recommends counter-intel.
- **Appraiser** — Cultural specialist. Patient. Evaluates cultural pressure as a long-term asset class.

**The Prophet's Team (The Circle of Seers):**
- **Whisper** — Cultural specialist. Patient. Tracks influence percentages and identifies the next likely flip.
- **Oracle** — Covert specialist. Predictive. Synthesizes intel to forecast opponent strategies.
- **Seer** — Economic specialist. Strategic. Identifies investments that create cascading cultural pressure.
- **Warden** — Military specialist. Opportunistic. Recommends attacks only when culture has already softened the target.

**The player also gets a subordinate:**

**Strategist** — The player's AI advisor. The Strategist is not an opponent. It is an ally. It runs on its own 60-second cycle, offset from the AI opponents. It analyzes the full game state. It identifies threats (Zhao is massing troops on your border), opportunities (South America is one dimension from unification), and weaknesses (you have no agents in Consortium territory). It writes notifications to a dedicated log. These appear as dismissable alerts in the UI — not in the event ticker (which narrates what happened) but as direct advice (which suggests what to do). The Strategist has a calm, analytical, supportive voice. It is on your side.

The Strategist can also be queried directly. Type "What should I do?" in the query bar, and the Strategist responds with contextual advice based on the current game state. The query system already exists from Slice 4. The Strategist adds a dedicated advisor endpoint.

**How the orchestration runs (and a note on scale).** Each AI cycle now makes 5 Claude calls (4 specialists + 1 commander) instead of 1. With 3 AIs and the Strategist, that is 16 calls per 60-second window. Subordinates use smaller prompts and lower token limits (150 max tokens) than the commander (500 max tokens). The AI cycles are staggered by 20 seconds, which naturally spreads the load.

A deliberate architectural decision: in SpacetimeDB, the AI reasoning cycle is **one scheduled procedure**, and the five Claude calls run **sequentially** inside it over `ctx.http` (four specialist calls, then one commander call), with all results committed in a single `ctx.with_tx`. There are no threads. SpacetimeDB has no `std::thread`, no `join()`, no `reqwest`, and no `tokio`; reducers cannot make HTTP calls at all, so only a procedure can do this work. The trade-off is latency: a cycle's wall-clock time is the sum of the call latencies, so the first orchestrated cycle can take up to ~120 seconds. This is acceptable because cycles are staggered and self-re-schedule. If sequential latency ever becomes a problem, the fallback is to fan the specialists out across separate scheduled-procedure rows (one per specialist, writing its result to a scratch table) with a follow-up commander row that reads them back. That fan-out is not implemented in Slice 5; the single sequential procedure is the chosen design.

**The reasoning log changes.** Since Slice 2, the `ai_reasoning_log` table has stored one row per AI cycle. In Slice 5, it gains a `subordinate_id` column. A private fn (`apply_ai_actions`) running inside the cycle procedure's transaction writes one row per subordinate plus the final commander row (all sharing the same `cycle_at`); there is no cross-thread reducer and no queue table. The intel query (a procedure) returns all rows from the latest cycle, ordered by subordinate. The player sees the full chain of thought.

### New Principle 13: Command at the Speed of Thought

Since Slice 1, the player has controlled the game with the mouse. Drag cards onto territories. Click buttons. It works. It is accessible. But for an experienced player — or for a judge watching a demo — it can feel slow.

Slice 5 adds keyboard controls for every common action. The player can command the game without touching the mouse.

**The hotkey map:**

| Key | Action |
|-----|--------|
| `1` | Select Military card from hand |
| `2` | Select Economic card from hand |
| `3` | Select Covert card from hand |
| `W` or `↑` | Move map selection to the territory above |
| `A` or `←` | Move map selection to the territory left |
| `S` or `↓` | Move map selection to the territory below |
| `D` or `→` | Move map selection to the territory right |
| `Enter` | Confirm action (deploy selected card to selected territory) |
| `Space` | Same as Enter (confirm action) |
| `Escape` | Cancel selection / close panel / close dropdown |
| `Q` | Focus the query bar |
| `I` | Open or close the Intel panel |
| `C` | Cycle through AI intel targets (Zhao → Consortium → Prophet → close) |
| `H` | Toggle highlight of all territories the player owns |
| `Tab` | Autocomplete in the query bar (already exists from Slice 4) |

**Hotkeys are discoverable.** Every UI element that has a hotkey shows a small hint. In the corner of each card, a tiny rounded square displays "1", "2", or "3". Next to the query bar prompt, a hint shows "Q". In the Intel panel header, a hint shows "I". These hints are subtle — JetBrains Mono, 9px, in a muted color, with a faint border. They don't distract. They inform.

**Hotkeys are an accelerator, not a replacement.** The mouse still works for everything. A new player can ignore the hotkeys entirely and play the full game. An experienced player can keep their hands on the keyboard and move faster. A judge watching the demo sees the player navigate the map, select cards, and execute actions without reaching for the mouse — and understands that this is a polished, professional experience.

**Navigation on a hex map.** WASD navigation moves a selection cursor between territories. The "nearest" territory in the pressed direction is selected based on the hex grid layout. Adjacency is not required for cursor movement — the cursor can jump to any territory. But the card deployment still requires adjacency for Military attacks, exactly as it always has. The cursor selects a target. The card determines whether that target is valid.

---

## 3. WHAT SLICE 5 DOES NOT CHANGE

- Military combat: unchanged.
- Economic investment: unchanged.
- Agent deployment: unchanged.
- Cultural spread: unchanged.
- Cross-dimension bonuses: unchanged.
- Win condition: still 5 unified territories across all 4 dimensions.
- The map: still 12 hex territories.
- Card types: still Military, Economic, Covert.
- Action points: still 1 per 8 seconds, cap 10.
- Query system: unchanged from Slice 4.
- Event ticker: unchanged from Slice 4.
- AI cycle timing: still 60 seconds, staggered 20 seconds apart.

Slice 5 adds minds and speed. It does not change the game.

---

## 4. SUMMARY OF NEW LOCKED DECISIONS

| Decision | Outcome |
|----------|---------|
| AI architecture | Commander + 4 specialist subordinates per AI |
| Specialist calls | Independent Claude calls with domain-specific prompts, 150 max tokens each, made sequentially via `ctx.http` inside one procedure |
| Commander role | Synthesizes recommendations, resolves conflicts, submits action batch |
| Zhao's team | Vanguard (military), Paymaster (economic), Scout (covert), Adjutant (cultural) |
| Consortium's team | Auditor (economic), Actuary (military), Courier (covert), Appraiser (cultural) |
| Prophet's team | Whisper (cultural), Oracle (covert), Seer (economic), Warden (military) |
| Human Strategist | Proactive advisor, scheduled procedure (Claude via `ctx.http`), 60s cycle, queryable |
| Strategist log | New public table with priority levels (critical, warning, info), dismissable alerts |
| Reasoning log | Added `subordinate_id` column, one row per subordinate per cycle |
| Intel visibility | Player sees full deliberation chain when querying AI intel |
| Concurrency model | Sequential `ctx.http` calls in one scheduled procedure. No threads. Fan-out via scheduled rows only as a fallback. |
| Hotkeys | 1-3 cards, WASD navigation, Enter/Space confirm, Escape cancel, Q/I/C/H panels |
| Hotkey hints | Small rounded squares on UI elements, JetBrains Mono 9px, muted |

---

## 5. THE GAME AFTER SLICE 5

After Slice 5, Risk: Dominion takes a major step toward its full vision. (Slices 6 and 7 still follow: global chat with AI deception, then spectator mode and replay.)

The player faces AI opponents that reason through a council of specialists, each bringing domain expertise to a coordinated strategy. The player has an AI strategist on their side, watching the game and offering advice. The player commands the battlefield from the keyboard at the speed of thought. And through the intel system, the player can see the full chain of reasoning behind every AI decision: a transparent, traceable, multi-agent thought process rendered inside a live database.

This is the technical wow factor. This is what makes people stop and say "wait, that's real?"

---

## End of Slice 5 Decisions Document

This document, combined with DECISIONS_SLICE_1.md through DECISIONS_SLICE_4.md, covers the core design philosophy through Slice 5. DECISIONS_SLICE_6.md extends this with global chat and AI deception mechanics. DECISIONS_SLICE_7.md adds spectator mode and the replay system. All principles from prior slices not explicitly modified here remain in full effect. The next document is the Slice 5 Interface Contract.