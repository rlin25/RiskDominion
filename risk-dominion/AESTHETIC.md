# AESTHETIC.md — Risk: Dominion Visual Design System

## Version 2.1
## Scope: Complete Visual Design Reference — All Slices
## Reflects: Current codebase (SpacetimeDB 2.4.1, React + TypeScript + Vite + Tailwind CSS + dnd-kit)

---

## 0. DOCUMENT PURPOSE

This document is the authoritative visual design reference for Risk: Dominion. It specifies the color palette, typography, component dimensions, animations, and layout rules.

The visual aesthetic is **Tactical War Room** — warm dark parchment and aged metal, like a field commander's tent at night. Muted gold, deep charcoal, and dim player colors create strategic weight. The game looks like it has history.

---

## 1. COLOR PALETTE

All tokens defined in `tailwind.config.js`. Use only these values.

### Backgrounds

| Token | Hex | Usage |
|-------|-----|-------|
| `bg-root` | `#0d0b08` | Page root, deepest layer |
| `bg-surface` | `#1a1610` | Panels, cards, overlays |
| `bg-surface-alt` | `#241f16` | Elevated panels, hover states |
| `bg-ticker` | `#100e09` | DISPATCHES ticker background |
| `bg-map` | `#141009` | Map container background |

### Text

| Token | Hex | Usage |
|-------|-----|-------|
| `text-primary` | `#f0e6d0` | Primary readable text |
| `text-secondary` | `#9a8870` | Muted labels, metadata |
| `text-accent` | `#d4a017` | Gold highlights, headers, calls to action |
| `text-command` | `#c8b882` | Query input text |

### Players

| Token | Hex | Player |
|-------|-----|--------|
| `player-1` | `#4488FF` | Human (You) |
| `player-2` | `#d94f4f` | Zhao |
| `player-3` | `#e8a020` | Consortium |
| `player-4` | `#9b59b6` | Prophet |

These match `PLAYER_COLORS` in `constants.ts`.

### Dimensions

| Token | Hex | Dimension |
|-------|-----|-----------|
| `dim-military` | `#cc3322` | Military quadrant accent |
| `dim-economic` | `#e8a020` | Economic quadrant accent |
| `dim-cultural` | `#2dbfa0` | Cultural quadrant accent |
| `dim-covert` | `#8e44ad` | Covert quadrant accent |

### UI

| Token | Hex | Usage |
|-------|-----|-------|
| `highlight` | `#d4a017` | Selection, hover, drop target |
| `success` | `#2ecc71` | Victory, positive outcomes |
| `warning` | `#e67e22` | Caution states |
| `neutral` | `#2a2318` | Unowned territory fill |
| `border-warm` | `#3d3525` | Default panel borders |
| `border-gold` | `#6b5a2a` | Emphasized borders |

---

## 2. TYPOGRAPHY

Three font families. Strict role separation.

### Display Font — Rajdhani

**Role:** Titles, headings, card labels, continent banners, overlay headers, any text representing the game's voice.

**Why Rajdhani:** Bold semi-condensed letterforms with a military-technical edge. Aggressive where Cinzel was formal. Strong at small sizes. Feels like a strategy game, not a history book.

**Weights:** 500 (labels), 600 (headers), 700 (titles, victory)

**Google Fonts import (in index.html):**
```html
<link href="https://fonts.googleapis.com/css2?family=Rajdhani:wght@500;600;700&display=swap" rel="stylesheet">
```

**CSS:** `font-family: 'Rajdhani', sans-serif;`

**Tailwind token:** `font-display`

**Size reference:**
- Territory labels: 8.5px, weight 500
- Card corner sub-labels: 9px, weight 500
- Card action labels: 8.5px, weight 700, letter-spacing 0.12em
- Panel section headers: 10–11px, weight 600, letter-spacing 0.18–0.22em, uppercase
- UI labels: 11–12px, weight 600
- Top bar game title: 18px, weight 700, letter-spacing 0.12em
- Victory name: 32px, weight 700

### UI Font — Orbitron

**Role:** Action bar "Command Points" label, loading screen text, digital chrome elements that need a technical/futuristic feel distinct from military-physical.

**Use sparingly.** Rajdhani is the dominant display font. Orbitron appears in specific UI chrome only.

**CSS:** `font-family: 'Orbitron', sans-serif;`

**Tailwind token:** `font-ui`

**Sizes:** 9–15px

### Data Font — JetBrains Mono

**Role:** All numerical data — troop counts inside territory medallions, action point numbers, event ticker messages, chat text, timestamps, tooltip values.

**CSS:** `font-family: 'JetBrains Mono', monospace;`

**Tailwind token:** `font-data`

**Sizes:** 10–14px. Always monospaced.

---

## 3. HEX TERRITORY GRID

The map is a hex grid of SVG hexagon territories grouped into three continent columns. There is no D3.js geographic projection. The hex grid is the map.

### Territory SVG

- **Per-territory SVG viewport:** 92 × 80 px
- **Flat-top hexagon points:** `0,40 23,0 69,0 92,40 69,80 23,80`
- Clip path: same polygon as hex outline

### Quadrant Fill System

Four polygons divide the hex into quadrants, each representing one dimension:

| Quadrant | Dimension | Points |
|----------|-----------|--------|
| Top-left | Military | `46,40 46,0 23,0 0,40` |
| Top-right | Cultural | `46,40 46,0 69,0 92,40` |
| Bottom-right | Economic | `46,40 92,40 69,80 46,80` |
| Bottom-left | Covert | `46,40 0,40 23,80 46,80` |

- Quadrant fill: `PLAYER_COLORS[ownerId]` at 82% opacity
- Neutral (no owner): `#2a2318`
- Inner dividers: two crossing lines through center (46,40), stroke `#0d0a06` at 60% opacity

### Center Medallion

- Outer circle: r=16, fill `#0d0a06`, stroke = dominant owner color or `border-warm`
- Inner circle: r=13, fill `#1a1610`
- Troop count: JetBrains Mono 13px weight 700, `#f0e6d0`

**Dominant owner rule:** The player with the most quadrant ownership determines the border/glow color. If tied, lower player ID wins.

### Territory States

| State | Border color | Border width | Glow |
|-------|-------------|-------------|------|
| Neutral (unowned) | `#3d3525` | 1.5px | none |
| Owned | dominant player color | 2px | `${color}55` via drop-shadow |
| Highlighted (drop target) | `#d4a017` | 2.5px | `rgba(212,160,23,0.7)` |
| Drag-over | `#d4a017` | 2.5px | `rgba(212,160,23,0.5)` |

- Dashed ring when highlighted/over: `polygon` at inset 3px, stroke `#d4a017` dasharray `6 3`, animated

### Territory Name Label

- Font: Rajdhani 8.5px weight 500 (600 when player owns territory)
- Color: `#9a8870` default; dominant player color when owned; `#d4a017` when highlighted
- Position: below hex SVG, `margin-top: 4px`
- Max-width 88px, text-overflow ellipsis

### Continent Banners

Each continent group (Americas, Europe-Africa, Asia-Oceania) has a banner above its hex grid.

- Background: `linear-gradient(90deg, transparent, rgba(212,160,23,0.12), transparent)`
- Border-top/bottom: `1px solid rgba(212,160,23,0.2)`
- Label font: Rajdhani 10px weight 600, letter-spacing 0.18em, uppercase, `#9a8870`
- **No emoji icons next to continent names.** Text only.

### Map Container

- Class `.map-bg`: `#0d0a06` with gold crosshatch grid 4% opacity, 32px repeat
- Class `.vignette::after`: `radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.55) 100%)`
- World silhouette SVG background: absolute inset, 5.5% opacity, gold paths, pointer-events none
- Decorative corner L-marks: four SVG 28×28 shapes at corners, `#d4a017` at 20% opacity

---

## 4. ACTION CARDS

Portrait playing cards. The fanned hand at screen bottom is the primary interaction surface.

### Card Dimensions

- Width: 78px, Height: 112px, border-radius: 8px (`rounded-lg`)

### Card Background

```css
background: linear-gradient(160deg, #221e18 0%, #13110d 100%);
```

### Card Border and Glow

- Active: `1.5px solid {accentColor}` — `#cc3322` military, `#e8a020` economic, `#8e44ad` covert
- Disabled: `1.5px solid #3d3525`
- Hover glow (non-disabled, non-dragging): `box-shadow: 0 0 0 1px {accent}44, 0 0 12px {accent}22`

### Card Shadows

- Default: `0 4px 16px rgba(0,0,0,0.5), 0 0 6px {accent}22`
- Dragging: `0 14px 36px rgba(0,0,0,0.7), 0 0 20px {accent}55`
- Disabled: none

### Card Internal Layout (top to bottom)

**Top corner row:** `padding: 6px 6px 0`, flex space-between
- Left: first letter of sub-label ("M"/"E"/"C"), Rajdhani 9px weight 500, accent 80% opacity
- Right: `✦` glyph, same style

**Center icon area:** flex-1, centered
- 36×36 SVG dimension icon (see below)

**Bottom label bar:** `padding: 6px 0`, text-center
- Background: `linear-gradient(0deg, {accent}22, transparent)`
- Border-top: `1px solid {accent}33`
- Action label ("ATTACK"/"INVEST"/"DEPLOY"): Rajdhani 8.5px weight 700 letter-spacing 0.12em, accent color

### Dimension SVG Icons (36×36)

**Military — Sword (pointing up):**
- Blade: `line x1=18 y1=4 x2=18 y2=28` strokeWidth 2.5
- Pommel forks: lines (18,28)→(12,34) and (18,28)→(24,34) strokeWidth 2
- Cross-guard: `line x1=11 x2=25 y=22` strokeWidth 2.5
- Tip diamond: small polygon at blade point

**Economic — Coin Stack:**
- Two stacked ellipses with connecting vertical sides (r=11 for width, r=4 for height)
- Dollar sign `$` centered in JetBrains Mono 8px

**Covert — Spy Eye:**
- Outer ellipse: `rx=13 ry=7` centered at (18,18), stroke-only
- Iris: filled circle r=4.5
- Pupil: filled circle r=2 in card background color
- Three lash lines radiating from top

### Drag State (dnd-kit `useDraggable`)

- Dragging: `transform: translate3d({x}px, {y}px, 0) rotate(4deg) scale(1.08)`, opacity 0.92
- Non-drag transition: `transform 0.15s ease, box-shadow 0.15s ease`
- Cursor: `grab` (idle) → `grabbing` (drag) → `not-allowed` (disabled)

### Card Shimmer

CSS class `.card-shimmer::before`: diagonal gradient white shimmer overlay, opacity 0 by default, 1 on hover.

---

## 5. FANNED CARD HAND

### Fan Layout

- Cards centered horizontally at bottom of screen
- Rotation per card: `angle = (i - mid) * 5.5` degrees, where `mid = (cardCount - 1) / 2`
- Vertical droop (parabolic): `yLift = |i - mid| * 3px` downward offset
- Overlap: `margin-right: -10px` on all cards except last
- Transform origin: `center bottom 120px` (arc pivot point outside card)

### Empty State

- "Awaiting Orders" / "Campaign Ended" in Rajdhani 12px `#9a8870`

### Entry Animation

- Each card: `animate-float-up` (translateY 8px → 0, opacity 0 → 1)
- Stagger: 40ms per card index

---

## 6. ACTION BAR

### Pip Row

- 10 pips total (one per action point)
- Filled pip: 8px diameter circle, solid player-1 color (`#4488FF`), `box-shadow: 0 0 6px {playerColor}99`
- Empty pip: 8px circle, `border: 1px solid #3d3525`, transparent fill
- Pip animation on gain: `animate-pip-fill`
- Gap between pips: 4px

### Label

- "Command Points" in Orbitron 9px `#9a8870`, above pip row, centered

---

## 7. EVENT TICKER (DISPATCHES)

### Layout

- Left panel, 200px wide
- Header: Rajdhani 10px weight 600 letter-spacing 0.22em uppercase, `#d4a017`, prefix `◉`
- Border-right: `1px solid #3d3525`
- Background: `rgba(13,10,6,0.7)`

### Event Items

- Type-prefix symbol (non-emoji): `⚔ ◈ ✦ ◉ ★ ▸`
- Text: JetBrains Mono 11px `#f0e6d0`
- Marquee animation for long lines
- Hover: pauses marquee

---

## 8. INTEL PANEL

### Container

- Width: 260px
- Border-right: `1px solid #3d3525`
- Background: `rgba(13,10,6,0.7)`
- Header: `◉ Intelligence` — Rajdhani 11px weight 600 letter-spacing 0.22em uppercase, `#d4a017`

### AI Query Buttons

- Border: `1px solid #3d3525`, hover `#6b5a2a`
- Background: `rgba(255,255,255,0.02)`
- Font: Rajdhani 10px weight 500 `#9a8870`
- AI color dot: 8px circle with `box-shadow: 0 0 6px {aiColor}88`
- Label: `What is {name} planning?`

### Deliberation Result

- Background: `#13110d`, border `1px solid #3d3525`
- AI name: Rajdhani 10px `#d4a017`
- Subordinate name + role: Orbitron 11px, accent or secondary color
- Reasoning body: JetBrains Mono 11px `#f0e6d0`, line-height snug
- Separator: `border-b border-[#334455]`

---

## 9. VICTORY / DEFEAT SCREEN

### Overlay Background

```css
radial-gradient(ellipse at center, rgba(13,10,6,0.88) 40%, rgba(0,0,0,0.97) 100%)
```

### Crown SVG (90×80)

- Base rect and crown polygon in winner's player color
- Three jewel circles in `#f0e6d0`
- Outer glow stroke in winner's color at 50% opacity
- `animate-victory-reveal`

### Text Stack

1. "Dominion Achieved" — Rajdhani 11px weight 500 letter-spacing 0.35em, `#9a8870`, uppercase
2. Winner name — Rajdhani 32px weight 700, winner color, `text-shadow: 0 0 24px {color}88, 0 0 48px {color}44`
3. "CONQUERS ALL" — Rajdhani 13px weight 600 letter-spacing 0.2em, `#d4a017`
4. Victory/defeat status — Orbitron 15px, `#2ecc71` (victory) or `#9a8870` (defeat)

### Decorative Dividers

Gold gradient lines with `✦` center glyph in winner's color.

---

## 10. TOP BAR

- Background: `linear-gradient(90deg, #1a1610, #241f16, #1a1610)`
- Border-bottom: `1px solid #3d3525`
- Left: `⚔` + "RISK: DOMINION" — Rajdhani 18px weight 700 letter-spacing 0.12em, `#d4a017`
- Padding: 8px 16px

---

## 11. ANIMATIONS

Defined in `tailwind.config.js`:

| Name | Keyframe behavior | Duration |
|------|------------------|----------|
| `marquee` | `translateX(0) → translateX(-50%)` | 40s linear infinite |
| `glow-pulse` | opacity + scale oscillation | 2.5s ease-in-out infinite |
| `float-up` | `translateY(8px) opacity:0 → translateY(0) opacity:1` | 0.3s ease-out forwards |
| `victory-reveal` | scale + translateY entrance, spring easing | 0.6s cubic-bezier(0.34,1.56,0.64,1) |
| `pip-fill` | scale(0.4) opacity:0 → scale(1) opacity:1 | 0.2s ease-out forwards |
| `shake` | translateX oscillation ±4px + slight rotation | 0.4s ease-in-out |
| `banner-in` | opacity:0 letter-spacing:0.4em → opacity:1 letter-spacing:0.1em | 0.8s ease-out forwards |

---

## 12. BOX SHADOWS

```js
// tailwind.config.js boxShadow extensions
"territory": "0 2px 12px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.05)",
"card":      "0 4px 16px rgba(0,0,0,0.5), 0 1px 0 rgba(255,255,255,0.04)",
"card-lift": "0 12px 32px rgba(0,0,0,0.7), 0 0 20px rgba(212,160,23,0.25)",
"panel":     "inset 0 0 0 1px rgba(212,160,23,0.12), 0 4px 24px rgba(0,0,0,0.4)",
```

---

## 13. SPACETIMEDB 2.4.1 INTEGRATION

The visual layer is read-only with respect to game state. All data comes from table subscriptions via the SpacetimeDB React SDK.

### Key Hooks

```typescript
import { useTable, useProcedure } from "spacetimedb/react";
import { tables, procedures } from "./module_bindings";

// Subscription-based (reactive)
const military  = useTable(tables.military);
const economic  = useTable(tables.economic);
const cultural  = useTable(tables.cultural);
const covert    = useTable(tables.covert);
const players   = useTable(tables.players);
const gameState = useTable(tables.gameState);
const eventFeed = useTable(tables.eventFeed);

// Procedure-based (request/response)
const getIntel = useProcedure(procedures.getIntel);
```

### Visual Data Mapping

| Data source | Visual output |
|------------|---------------|
| `military.playerId` | Military quadrant fill |
| `military.troopCount` | Center medallion number |
| `economic.playerId` | Economic quadrant fill |
| `cultural.playerId` | Cultural quadrant fill |
| `covert.playerId` + `agentCount > 0` | Covert quadrant fill (neutral if agents = 0) |
| `players.actionPoints` | ActionBar pip count |
| `gameState.status === 'ended'` | Trigger VictoryScreen |
| `gameState.winner` | Victory/defeat determination |
| `eventFeed` rows | DISPATCHES ticker content |

---

## End of AESTHETIC.md v2.1

This document defines the complete visual design system for Risk: Dominion as it currently exists in the codebase. All components must use only these colors, fonts, and dimensions. When implementing new features, derive all visual properties from this document.
