# DECISIONS_UPDATE_1.md — Risk: Dominion

## Version 1.1
## Scope: Complete UI/UX Overhaul — All Slices
## Output: AESTHETIC.md v2.1

---

## 0. WHY THIS EXISTS

The current game is technically impressive but the original AESTHETIC.md v2.0 was written without
access to the actual codebase. It described a map, a font stack, a card system, and a color palette
that do not match what was built. This document records every design decision for the overhaul,
including corrections to the wrong assumptions in v2.0.

This document does not change how the game works. It changes how the game looks, feels, and
responds to the player.

---

## 1. VISUAL PHILOSOPHY: TACTICAL WAR ROOM

The game feels like a tactical war room — warm lamp light on dark surfaces, hand-drawn grid paper,
operator terminals. The player is a commander, not an analyst staring at satellite imagery. Every
surface is warm parchment, not cold steel. The gold accent is the color of importance. The font
stack signals military-technical precision.

Territories are hexagons on a grid. The grid is the interface. Data overlays the grid. The player
reaches in and makes things happen through cards and commands.

Information reveals itself in layers. The hex grid is always visible. Query results overlay the
grid. Chat opens on demand. Text supports. Animation tells the story.

---

## 2. DECISIONS — WHAT IS CORRECTED FROM V2.0

### Decision C1 — MAP: Hex Grid Preserved (No D3, No GeoJSON)

**v2.0 Assumed:** D3.js geographic projection, GeoJSON polygon features, Mercator or Equal Earth
projection, pannable/zoomable world map.

**What the codebase actually has:** An SVG hex grid. Each territory is a 92×80px hexagon with
flat-top orientation. Twelve territories are grouped into three continent columns (Americas,
Europe-Africa, Asia-Oceania) of four territories each, arranged in a 2×2 grid per column. No D3.
No GeoJSON. No projection.

**Decision: Keep the hex grid exactly as built.**

**Why:**

The hex grid is abstract tactical space. It does not pretend to be a geographic atlas. This is
the correct metaphor — Risk is played on an abstracted board, not a globe.

Replacing it with a D3 geographic map would require:
- Adding D3.js (~600KB dependency)
- Rewriting the quadrant fill system (which clips quadrant polygons inside the hex shape)
- Replacing the dnd-kit drop zones (currently bound to hex territory IDs) with D3 path hit areas,
  which are unreliable for drag-and-drop on irregular polygons
- Abandoning the elegant center medallion troop display
- Rebuilding every territory rendering component from scratch

There is no gameplay benefit to geographic accuracy. The hex grid already maps the twelve
territories and their adjacencies correctly. The decorative SVG world silhouette in `Map.tsx`
provides geographic context without any of the costs.

**All mentions of D3.js, GeoJSON, geographic projection, irregular polygonal territory shapes,
and pannable/zoomable map are removed from AESTHETIC.md v2.1.**

---

### Decision C2 — FONT: Rajdhani Replaces Cinzel

**v2.0 Assumed:** JetBrains Mono for data, Inter for UI. Cinzel was not explicitly in v2.0 but
was in the original codebase.

**What the codebase actually uses:** Cinzel (display), Orbitron (UI chrome), JetBrains Mono (data).

**Decision: Replace Cinzel with Rajdhani. Keep Orbitron. Keep JetBrains Mono. Remove Inter.**

**Why Rajdhani over Cinzel:**

Cinzel is designed to evoke ancient Roman inscriptions — serifs, classical proportions, formal
authority. It reads as a historical epic, not a strategy terminal. At 8.5px (the territory name
label size), Cinzel's serifs blur and the condensed all-caps loses legibility.

Rajdhani is semi-condensed, military-technical, drawn from Indian type traditions but adapted
for the Latin script in a way that produces a clean, confident, slightly terse character. It
works at 8.5–10px without anti-aliasing artifacts. It communicates precision and command — the
exact register of a strategy game instrument panel. Weight 600 for display use; weight 700 for
headers and victory text; weight 500 for supporting labels.

**Why not Inter:**

v2.0 specified Inter as the UI font. The actual codebase does not use Inter anywhere. Orbitron
already handles system-level UI chrome (ActionBar label, loading state). Adding Inter would
introduce a third sans-serif and blur the typographic hierarchy. Rajdhani handles all display
and label roles. Inter is excluded.

**Google Fonts import URL for Rajdhani:**
```
https://fonts.googleapis.com/css2?family=Rajdhani:wght@500;600;700&family=JetBrains+Mono:wght@400;500&family=Orbitron:wght@400;500;700&display=swap
```

**tailwind.config.js `fontFamily` change:**
```javascript
// Before
display: ["Cinzel", "serif"],

// After
display: ["Rajdhani", "sans-serif"],
```

---

### Decision C3 — CARDS: Fanned Card Hand Preserved (No Three Stacks)

**v2.0 Assumed:** Three card stacks at the bottom center. Each stack is a small pile — top card
visible, offset layers beneath, count number top-right. Cards: 60×84px, left border accent.

**What the codebase actually has:** A fanned card hand. Portrait playing cards (78×112px). Each
card is independently draggable via dnd-kit. The hand uses a parabolic fan arc: rotation per card
is `(i - mid) * 5.5` degrees, vertical lift is `Math.pow(Math.abs(i - mid), 1.4) * 5` pixels,
overlap is `marginLeft: -10px`, `transformOrigin: "bottom center"`. Cards cycle through military,
economic, and covert types by index modulo 3.

**Decision: Keep the fanned card hand exactly as built.**

**Why:**

The fan arc reads as a hand of playing cards, which is the exact metaphor this game uses. The
fan communicates "you have multiple action options available." A player scanning the bottom of the
screen sees a spread hand and understands immediately: these are cards I can play.

The three-stack design would require:
- Changing card dimensions from 78×112 to 60×84
- Replacing the per-card dnd-kit draggable with a stack-pickup interaction
- Losing the color-by-index cycling that shows exactly which card types are available
- Losing the parabolic lift that gives the hand a satisfying, organic feel

The fanned hand is already built, polished, and working. It communicates correctly. It is kept.

---

### Decision C4 — COLOR PALETTE: Warm Parchment Stays (No Satellite Colors)

**v2.0 Assumed:** `bg-ocean: #1a1d1c`, `bg-landmass: #2d302e`, `text-primary: #c5c9c6`,
`border-subtle: #3a3f3c`. A cool dark palette suggesting satellite intelligence imagery.

**What the codebase actually uses:** `bg-root: #0d0b08`, `bg-surface: #1a1610`,
`text-primary: #f0e6d0`, `border-warm: #3d3525`. A warm dark parchment palette.

**Decision: Keep the warm parchment palette exactly as defined in tailwind.config.js.**

**Why:**

The warm parchment palette matches the Tactical War Room philosophy. The `#0d0b08` root is not
cool charcoal — it has a warm brown undertone. The `#f0e6d0` text-primary is warm cream, not
cool gray-white. The `#3d3525` border is warm brown, not green-gray.

The satellite intelligence palette (cool dark ocean tones, green-tinged text) was designed for a
different aesthetic — a cold, analytical dashboard. This game is not that. It is a commander at
a lamp-lit table. The warm palette reinforces this at every surface.

Changing the palette would require updating every component, every inline style value, and every
hardcoded hex reference across the client source. The warm palette is correct. It stays.

**The tokens `bg-ocean`, `bg-landmass`, `neutral-empty`, `border-subtle`, `gold` (as a stand-alone
token) are not in tailwind.config.js and must not be referenced in implementation.**

---

### Decision C5 — CONTINENT BANNERS: Text Only, No Emoji

**v2.0 Did Not Specify Emoji** — but the existing `Map.tsx` uses `CONTINENT_ICONS`:
```javascript
const CONTINENT_ICONS: Record<string, string> = {
  "Americas":      "⚔",
  "Europe-Africa": "🏛",
  "Asia-Oceania":  "🌏",
};
```

**Decision: Remove emoji from continent banners. Text-only labels.**

**Why:**

Emoji are OS-rendered glyphs with inconsistent sizing, color rendering, and baseline alignment
across platforms. On some systems "🏛" renders in full color; on others it renders as text. The
continent labels — Americas, Europe-Africa, Asia-Oceania — are already informative. An emoji
does not add tactical meaning. It adds noise and cross-platform risk.

The `CONTINENT_ICONS` map in `Map.tsx` is removed. The banner renders the continent name only,
in Rajdhani 10px/600, tracked, uppercase.

---

## 3. DECISIONS — WHAT IS PRESERVED FROM THE OVERHAUL VISION

These features from the original overhaul plan are carried forward unchanged into AESTHETIC.md v2.1.

### Decision P1 — Command Bar: Unified Non-Card Interaction (PRESERVED, LOCKED)

The command bar is hidden by default. Pressing `Enter` or `T` summons it. It is the single entry
point for everything that is not a card play: intel queries, chat, event lookup, strategic advice.

The visual spec is new in v2.1 (it was missing from v2.0): dark parchment surface, gold `>` prompt
in JetBrains Mono, slide-down appear animation, shake on unrecognized input, dropdown of common
commands on `>` click.

Chat windows are opened exclusively via the command bar. There is no persistent chat sidebar.

### Decision P2 — Chat Windows: Fixed Bottom-Right Overlays (PRESERVED, LOCKED)

Chat windows open via the command bar (e.g., "Chat with Zhao"). They are temporary overlays
at bottom-right, not persistent panels. Multiple windows stack vertically. Each window has a
header with the AI portrait placeholder and name in AI player color, a scrollable message area,
and a JetBrains Mono input field.

### Decision P3 — Query Results as Map Visualizations (PRESERVED, LOCKED)

When the player asks a strategic question, the answer renders on the hex map as a visualization:
heat map shading, flow lines between territories, proportional symbol circles, or a bar chart
or comparison table floating in open map space. All types fade in over 300ms and auto-dismiss
after 10 seconds or on click-away.

### Decision P4 — Sound via Web Audio API (PRESERVED, LOCKED)

No audio files. No external assets. All sounds are synthesized sine wave tones triggered by game
events. See AESTHETIC.md v2.1 Section 16 for the full sound table.

### Decision P5 — Title Screen on Load (PRESERVED, LOCKED)

On page load, a full-viewport overlay shows the game title for approximately 2 seconds while the
live map loads behind it. The overlay dims the map. The title fades in via `animate-banner-in`.
After the hold, the overlay fades out and the map is revealed. Implemented as a React state toggle
in `App.tsx`.

### Decision P6 — Color Legend (PRESERVED, LOCKED)

A four-row color legend lives in the bottom-left corner of the map viewport. Ten-pixel colored
squares, player names in Rajdhani, 60% opacity at rest, 100% on hover. Always visible.
No background — transparent, like a map legend.

### Decision P7 — Intel Panel Redesign (PRESERVED, LOCKED)

The intel panel (left drawer, toggled by `I`) receives Rajdhani headers and better data row
structure. Territory names in Rajdhani, data values in JetBrains Mono, owned territories
highlighted with a colored left border.

### Decision P8 — Victory and Defeat Animations with Sound (PRESERVED, LOCKED)

Victory: `animate-victory-reveal` on the content block (existing keyframe). Crown SVG in winner
color. Rajdhani text. Victory sound (C5/E5/G5 tones). The map remains visible beneath the
radial gradient overlay.

Defeat: same overlay, defeat sound (G4/C4 tones). Loser sees the opponent's name and "Your
campaign ends here." in Orbitron.

The command bar remains active after game end.

---

## 4. DECISION TABLE

| # | Decision | Status | Summary |
|---|----------|--------|---------|
| C1 | Map rendering | CORRECTED | Hex grid preserved. D3/GeoJSON removed. |
| C2 | Font stack | CORRECTED | Rajdhani replaces Cinzel. Inter removed. Orbitron + JetBrains Mono kept. |
| C3 | Card system | CORRECTED | Fanned card hand preserved. Three-stack design removed. |
| C4 | Color palette | CORRECTED | Warm parchment kept. Satellite/ocean palette removed. |
| C5 | Continent banners | CORRECTED | Text-only labels. Emoji removed. |
| P1 | Command bar | PRESERVED, LOCKED | Unified command interface, Enter/T to summon |
| P2 | Chat windows | PRESERVED, LOCKED | Via command bar only, bottom-right overlays |
| P3 | Query visualizations | PRESERVED, LOCKED | Heat map, flow lines, symbols, chart, table on hex map |
| P4 | Sound via Web Audio API | PRESERVED, LOCKED | Synthesized tones, no audio files |
| P5 | Title screen | PRESERVED, LOCKED | Full-viewport overlay, live map behind |
| P6 | Color legend | PRESERVED, LOCKED | Bottom-left map corner, four player squares |
| P7 | Intel panel redesign | PRESERVED, LOCKED | Rajdhani headers, better row structure |
| P8 | Victory/defeat animations | PRESERVED, LOCKED | Crown SVG, Rajdhani text, Web Audio tones |
| P9 | No persistent panels | PRESERVED, LOCKED | No sidebar. All overlays are temporary. |
| P10 | Hex territory quadrant fills | PRESERVED, LOCKED | TL=Military, TR=Cultural, BR=Economic, BL=Covert |
| P11 | ActionBar 10-pip system | PRESERVED, LOCKED | 10 circular pips, Orbitron label, JetBrains Mono count |
| P12 | Event ticker (DISPATCHES) | PRESERVED, LOCKED | Horizontal marquee, 30px bar, Rajdhani label |
| P13 | SpacetimeDB 2.4.1 hooks | LOCKED | useTable / useProcedure / useReducer / DbConnection.builder() only |

---

## 5. WHAT IS NOT CHANGING

Game mechanics are untouched. This overhaul does not change:
- How combat, investment, cultural spread, or covert operations work
- How AI reasoning, trust scores, or victory conditions work
- How SpacetimeDB stores and delivers state
- The twelve-territory hex grid layout and adjacency rules
- The four-dimension ownership model (military, economic, cultural, covert)
- The dnd-kit drag-and-drop card interaction model

---

## 6. WHAT IS EXCLUDED FROM THIS OVERHAUL

The following were considered and explicitly excluded due to scope:
- Accessibility toggles (high contrast, reduced motion)
- Territory comparison by locking tooltips
- Persistent victory progress indicators
- AI action-chat consistency tracking
- Illustrated AI portraits with emotional animation (placeholder circles used instead)
- A detailed help system
- Endgame handling for open overlays

---

## End of DECISIONS_UPDATE_1.md v1.1

This document contains every design decision for the overhaul. Exact hex codes, pixel values,
animation durations, and component specifications are in AESTHETIC.md v2.1.
