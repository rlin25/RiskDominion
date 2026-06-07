# DECISIONS_UPDATE_1.md — Risk: Dominion Visual Overhaul Decisions

## Version 1.1
## Scope: Visual and Font Overhaul — All Slices
## Reflects: Current codebase state, informed by playing the game as built

---

## 0. WHY THIS EXISTS

The game is technically solid and the visual overhaul shipped in the `visualchanges` branch significantly improved the look. Two things still need adjustment: the font choice and the emoji continent labels. This document records every decision made about those changes and why.

---

## 1. VISUAL PHILOSOPHY: TACTICAL WAR ROOM

The game's aesthetic is a **Tactical War Room** — warm dark parchment, aged gold, the feeling of field command at night. The hex grid map reads as an abstracted tactical display, not a geographic map. Every element reinforces this: the portrait cards feel like command orders, the DISPATCHES ticker feels like a field radio, the dimension quadrants feel like intelligence overlays.

The goal is a game that looks serious without being sterile, and feels physical without being realistic.

---

## 2. FONT DECISIONS

### Decision 1: Replace Cinzel with Rajdhani

**Locked.**

Cinzel was the initial choice because it has weight and presence. The problem: Cinzel is a Roman inscriptions typeface. It reads as classical history — academic, ceremonial, slow. Risk: Dominion is a real-time strategy game with AI opponents and live data. That should feel fast, sharp, and slightly dangerous.

**Rajdhani** (Google Fonts, wght 500/600/700):
- Semi-condensed letterforms: fits more text without wrapping
- Clean, angular strokes: reads as military-technical, not ceremonial
- Works at 8.5px for territory labels: Cinzel became illegible at small sizes
- Bold weight (700) has presence for titles and victory text
- Free, widely cached on Google Fonts CDN

Alternatives considered:
- **Russo One**: Excellent bold presence, but lacks the 500/600 weight range needed for labels. Too heavy at small sizes.
- **Exo 2**: Good range but slightly too science-fiction — doesn't match the warm parchment palette.
- **Bebas Neue**: Display-only, all-caps, too narrow for body text labels.
- **Orbitron**: Already used as secondary digital-chrome font. Promoting it to primary would make the UI feel too sci-fi.

Rajdhani is the right balance: aggressive enough to feel like a game, legible at small sizes, distinct from the data font (JetBrains Mono).

### Decision 2: Orbitron stays as secondary digital font

**Locked.**

Orbitron is used for "Command Points" label in ActionBar and loading screen text. These are specifically digital/electronic readout moments. Rajdhani handles everything else.

### Decision 3: JetBrains Mono stays unchanged

**Locked.**

JetBrains Mono is correct for all numerical data: troop counts, timestamps, chat messages, event ticker text. Monospaced data signals "information feed" which is exactly right.

---

## 3. MAP DECISIONS

### Decision 4: Hex grid stays, no D3 geographic map

**Locked.**

The hex grid is the game's map. It is abstract tactical space — not a geographic atlas. The three-column continent layout (Americas, Europe-Africa, Asia-Oceania) gives geographic context without pretending to be a real map.

Replacing it with a D3 geographic projection would:
- Require adding ~600KB of D3 as a dependency
- Make territory shapes irregular and harder to read at small sizes
- Break the clean quadrant-fill system that clearly shows dimension ownership
- Make the hit areas for dnd-kit drops unreliable

The hex grid stays.

### Decision 5: Remove emoji from continent banners

**Locked.**

The current `⚔ 🏛 🌏` icons in Map.tsx were added quickly and don't fit. They look casual and inconsistent with the rest of the aesthetic. Emoji rendering varies by OS (especially on Linux game servers). The continent names are already clear: Americas, Europe-Africa, Asia-Oceania. No icons needed.

Continent banners get text-only labels in Rajdhani.

---

## 4. CARD DECISIONS

### Decision 6: Fanned portrait card hand is preserved

**Locked.**

The fan arc layout — rotation per card, parabolic vertical offset, card overlap — is the right aesthetic for a card-based action system. It reads as a hand of playing cards, which is exactly the metaphor the game uses. The portrait cards (78×112px) with sword/coin/eye SVG icons are distinctive and polished.

The alternative of three stacked piles was designed without seeing the current codebase. The fan hand is superior: it shows all card types simultaneously, communicates the "hand of cards" metaphor, and looks better in motion.

### Decision 7: Card icons and dimensions unchanged

**Locked.**

The sword (military), coin stack with $ (economic), and spy eye with lashes (covert) icons are clean and readable. The 78×112px portrait proportions work well in the fan layout. No changes.

---

## 5. WHAT IS NOT CHANGING

Game mechanics are untouched. This overhaul does not change:
- How combat, investment, or covert operations work
- The SpacetimeDB schema or reducer signatures
- The AI reasoning system
- The trust score system
- The win condition (5 unified territories)
- The action point regeneration timing
- The cultural spread calculations
- How subscriptions deliver state

---

## 6. DECISIONS TABLE

| # | Decision | Status |
|---|----------|--------|
| 1 | Replace Cinzel with Rajdhani (wght 500/600/700) | Locked |
| 2 | Orbitron stays as secondary digital UI font | Locked |
| 3 | JetBrains Mono stays as data font | Locked |
| 4 | Hex grid stays — no D3 geographic map | Locked |
| 5 | Remove emoji from continent banners | Locked |
| 6 | Fanned portrait card hand preserved | Locked |
| 7 | Card icons and dimensions unchanged | Locked |

---

## End of DECISIONS_UPDATE_1.md v1.1
