# RISK: DOMINION — SLICE 3 DESIGN DECISIONS

## Version 1.0
## Scope: Cultural Dimension, Cross-Dimension Bonuses, Full Four-Dimension Game
## Relationship: Extends DECISIONS_SLICE_2.md

---

## 0. HOW TO READ THIS DOCUMENT

This document describes what changes in Slice 3. It does not repeat everything from Slices 1 and 2.

**All Slice 1 and Slice 2 principles remain in effect unless this document explicitly modifies them.** If a principle is not mentioned here, it is unchanged.

Slice 2 gave us a single-player game against three AI opponents across three dimensions: Military, Economic, and Covert. The player could deploy agents to spy on AI plans. Slice 3 completes the dimensional picture by adding the fourth and final dimension — Cultural — and introduces mechanical relationships between all four dimensions. The game now has the full strategic depth originally envisioned.

---

## 1. WHAT SLICE 3 CHANGES

| Slice 2 | Slice 3 |
|---------|---------|
| Three dimensions (Military, Economic, Covert) | Four dimensions (Military, Economic, Cultural, Covert) |
| Three card types | Three card types (Cultural is passive — no card) |
| No cross-dimension bonuses | Bonuses for owning multiple dimensions in one territory |
| Win at 3 unified (Military + Economic) | Win at 5 unified (all four dimensions) |
| AI reasons about 3 dimensions | AI reasons about all 4 dimensions |
| Covert used only for intel | Covert also provides Military combat bonus |

---

## 2. NEW PRINCIPLES

### New Principle 8: Culture is a Creeping Tide

The Cultural dimension represents ideological influence, social power, and the slow spread of ideas. It works differently from every other dimension.

Military attacks are direct. You drag a card and troops clash. Economic investments are deliberate. You drag a card and capital grows. Covert deployments are targeted. You drag a card and agents infiltrate.

Culture does not have a card. You cannot drag Culture onto a territory. Culture spreads on its own.

Every 30 seconds, the game calculates cultural pressure. Each territory looks at its neighbors. If a neighboring territory has a strong economy, it exerts cultural pressure across the border. The higher the neighbor's capital, the stronger the pressure. If multiple neighbors exert pressure from the same player, their influence combines. Over time, this pressure accumulates as an influence percentage in the target territory. When influence exceeds 50%, the territory's Cultural ownership flips to the influencing player, and the influence percentage resets to zero.

You influence Culture indirectly. Investing economically in a border territory increases its capital, which increases the cultural pressure it exerts on its neighbors. If you want your culture to spread into enemy territory, build up your economy on the border. If you want to stop an opponent's culture from spreading, challenge their economic control in the region.

Culture is the long game. Military attacks resolve in seconds. Economic flips take a few investments. Cultural flips take minutes of sustained pressure. But when they happen, they shift the balance permanently. A territory that flips culturally is one dimension closer to unification — and you didn't spend a single action point directly on it.

### New Principle 9: Dimensions Feed Each Other

The four dimensions are not isolated lanes. They form a cycle. Owning one dimension in a territory makes it easier to claim the others.

The cycle works like this:

**Military protects Economic.** If you control the Military dimension in a territory, your economic investments there are 10% more effective. Soldiers guard the markets. Trade flourishes under the protection of your troops. In game terms: when you invest economically in a territory where you own Military, you get a bonus to the amount invested.

**Economic funds Cultural.** If you control the Economic dimension in a territory, the cultural pressure it exerts on neighboring territories is 15% stronger. Wealth radiates influence. A rich territory exports not just goods but ideas, language, and social power. In game terms: the capital value used to calculate cultural pressure gets a multiplier if you own both Economic and Cultural in the source territory.

**Cultural enables Covert.** If you control the Cultural dimension in a territory, your agents there operate 10% more effectively. Cultural familiarity provides cover. Agents blend in when they understand the local language and customs. In game terms: your agent count for intel threshold calculations gets a small boost in territories where you own Cultural.

**Covert sharpens Military.** If you have agents in a territory, they provide tactical intelligence for your military operations there. Agents reveal weak points, troop movements, and defensive gaps. In game terms: your agent count in a territory is added directly to your attacking troop count when you launch a military attack there. This is the same bonus that existed in Slice 2 — it is now explicitly part of the cycle.

These bonuses are small. Ten percent here. Fifteen percent there. They are not gates. You can win a Military victory in a territory where you have no agents. You can flip an Economy without owning the Military there first. The bonuses are tailwinds, not engines. They reward coordinated play without punishing specialization.

But they do create natural strategies. A player who wants to unify a territory efficiently will follow the cycle: establish military presence, invest economically under that protection, let cultural pressure build from that wealth, deploy agents under cultural cover, and then use the intelligence to launch a decisive military strike on the next target. The cycle turns.

A note on balance: the bonuses are intentionally modest because cycles can snowball. A player who gets ahead economically could, in theory, ride the cycle to dominate all four dimensions. The small percentages prevent this. Direct action — where you choose to drag your cards — still determines outcomes far more than passive bonuses. The cycle is a guide, not a guarantee.

---

## 3. MODIFIED PRINCIPLES

### Modified Principle 2: Dimensions Are Tables

Slice 2 had three dimension tables. Slice 3 adds the fourth and final:

```
cultural (
    territory_id   INT PRIMARY KEY,
    owner_id       INT NOT NULL,
    influence_pct  INT NOT NULL DEFAULT 0
)
```

The Cultural table tracks two things: who owns the Cultural dimension in each territory, and how much foreign influence is accumulating toward a flip. `influence_pct` ranges from 0 to 100. When it passes 50, ownership flips and influence resets to zero.

The schema now has four dimension tables — the full set. Each territory can be owned by up to four different players simultaneously across the four dimensions.

### Modified Victory Condition

Slice 2 required 3 unified territories. A territory was unified when the same player owned both Military and Economic. Covert did not count.

Slice 3 changes this. A territory is now unified when the same player owns all four dimensions: Military, Economic, Cultural, and Covert. Victory requires 5 unified territories.

This is a significant increase from Slice 2's threshold of 3. It reflects the expanded strategic space. With four dimensions, territories are more fragmented. Unifying one is harder. Unifying five requires sustained, coordinated effort across the full cycle of bonuses. A player who only attacks militarily cannot win. A player who only invests economically cannot win. Victory demands mastery of the entire system.

---

## 4. UPDATED AI PERSONAS

The three AI opponents now reason about all four dimensions. Their personas expand accordingly:

**Zhao** — The General. Zhao's priority order: Military first, then Covert, then Economic, then Cultural. Zhao sees Cultural influence as a sideshow. He would rather take a territory by force than wait for culture to spread. But he is not blind to it — if he controls a territory economically, he understands that cultural pressure will follow and may help him unify. He deploys agents in territories he plans to attack, using the Covert-to-Military bonus. He invests economically only to fund further military expansion. Zhao plays fast and direct.

**The Consortium** — The Financier. The Consortium's priority order: Economic first, then Cultural, then Military, then Covert. The Consortium sees the cycle clearly: build capital, let culture spread, unify territories through economic and cultural dominance, and use military only to defend what it has built. It deploys agents sparingly, mainly to monitor threats to its economic holdings. The Consortium plays the long game. If left unchecked, it will quietly accumulate wealth and cultural influence until entire regions flip without a single attack.

**The Prophet** — The Spymaster. The Prophet's priority order: Cultural first, then Covert, then Economic, then Military. In Slice 2, the Prophet focused on deploying agents everywhere. That was not random. It was preparation. The Prophet was building an intelligence network that, in Slice 3, becomes the foundation for cultural dominance. The Prophet invests economically in border territories to accelerate cultural spread. It deploys agents in culturally contested territories to monitor flip progress. It attacks only when a territory is already culturally aligned — the Prophet conquers minds before it conquers land. The Prophet is the hardest opponent to predict because its strategy is indirect. You will lose territories to the Prophet without realizing they were contested until the culture flipped.

---

## 5. UPDATED SEED DATA

The pre-seeded board now includes Cultural values. The philosophy is the same as Slice 1 and Slice 2: the board starts mid-conflict, not at peace.

Home territories are culturally stable. Each player's home territory has Cultural ownership matching the home player, with 0% foreign influence. Your culture is secure at home.

Fractured territories are culturally contested. In many of the 8 non-home territories, the Cultural owner is different from the Military or Economic owner, and influence percentages range from 20% to 40%. This means:

- Some territories are close to a cultural flip from the first second of the game.
- The player can see cultural pressure building and plan around it.
- The first cultural tick (30 seconds in) is likely to cause at least one flip, demonstrating the mechanic immediately.

For example, North Africa might be militarily controlled by the Consortium, economically controlled by the Consortium, but culturally dominated by the Prophet at 40% influence. The Consortium appears to hold this territory, but the Prophet's culture is about to flip it. The Consortium must decide: invest economically to strengthen its position, attack the Prophet's cultural source, or accept the coming flip and focus elsewhere.

This creates the strategic tension that defines Slice 3.

---

## 6. SUMMARY OF NEW LOCKED DECISIONS

| Decision | Outcome |
|----------|---------|
| New dimension | Cultural (influence_pct, passive spread) |
| Cultural mechanic | Spreads every 30s based on adjacent economic strength |
| Cultural flip threshold | influence_pct > 50 |
| Cultural card | None (Cultural is passive, no direct action) |
| Cross-dimension bonuses | Military→Economic (+10%), Economic→Cultural (+15%), Cultural→Covert (+10%), Covert→Military (+agent_count) |
| Bonus philosophy | Small multipliers, not gates. Tailwinds, not engines. |
| Victory condition | 5 unified territories (all 4 dimensions) |
| AI personas | Expanded to 4-dimension priority orders |
| Seed data | Cultural influence at 20-40% in fractured territories |
| Home territories | Cultural owner = home player, influence_pct = 0 |

---

## 7. WHAT SLICE 3 DOES NOT CHANGE

- The map: still 12 hex territories, three continents.
- Action points: still 1 per 8 seconds, cap 10, flat 1-point cost.
- Military combat: still attacker_troops > defender_troops (plus Covert bonus, now formalized in the cycle).
- Economic investment: still +5 capital (plus Military bonus, now formalized).
- Agent deployment: still 1 agent per action, inherit on flip (plus Cultural bonus to effective agent count).
- AI timing: still 60-second cycles, staggered 20 seconds apart.
- Intel: still threshold of 3 effective agents.
- Three card types: Military, Economic, Covert. Cultural has no card.
- Real-time: still no turns. The clock runs continuously.

---

## End of Slice 3 Decisions Document

This document, combined with DECISIONS_SLICE_1.md and DECISIONS_SLICE_2.md, contains the complete design philosophy for Slice 3. All prior principles not explicitly modified here remain in full effect. The next document is the Slice 3 Interface Contract, which will specify the exact Cultural table schema, the cultural spread tick reducer logic, the cross-dimension bonus formulas, the updated win check, the full seed data, and the expanded AI prompt templates.