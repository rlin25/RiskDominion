# AESTHETIC.md — Risk: Dominion Visual Design System

## Version 1.0
## Scope: All Slices (1–7)
## Target: Claude Code Generation — Visual Consistency Across the Entire Project

---

## 0. PURPOSE

This document defines the visual identity of Risk: Dominion. Every slice, every component, every state must conform to these rules. The goal is a cohesive "dark command center" aesthetic that balances strategy board game warmth with database-driven precision.

No emojis. No em dashes. No custom CSS files. All styling via Tailwind utility classes or inline SVG attributes.

---

## 1. VISUAL TONE

**Dark command center.** Deep navy-black backgrounds. Neon-bright territory colors. Glowing highlights. Geometric precision. The player is commanding a living database that happens to render as a world map.

**Keywords:** tactical, precise, luminous, geometric, data-driven, board game heritage, high contrast.

**Antithesis:** flat, pastel, playful, skeuomorphic, cluttered, AI-generated-looking.

---

## 2. COLOR PALETTE

### 2.1 Background Colors

| Token | Hex | Usage |
|-------|-----|-------|
| `bg-root` | `#0A0A1A` | Main screen background behind the map |
| `bg-surface` | `#1A1A2E` | Cards, panels, query bar, results table |
| `bg-surface-alt` | `#222240` | Alternating row in data tables, hover states |
| `bg-ticker` | `#0D0D1A` | Event ticker background |

### 2.2 Text Colors

| Token | Hex | Usage |
|-------|-----|-------|
| `text-primary` | `#E0E0E0` | All primary text, territory names, card labels |
| `text-secondary` | `#8899AA` | Placeholder text, timestamps, secondary data |
| `text-accent` | `#FFD700` | Victory text, critical alerts |

### 2.3 Player Colors

| Token | Hex | Player |
|-------|-----|--------|
| `player-1` | `#4488FF` | Player 1 (human, blue) |
| `player-2` | `#FF4444` | Player 2 / Zhao (red) |
| `player-3` | `#FFAA00` | Consortium (orange) — arrives Slice 2 |
| `player-4` | `#AA44FF` | Prophet (purple) — arrives Slice 2 |

### 2.4 Dimension Accent Colors

Used on cards and dimension-specific UI elements:

| Token | Hex | Dimension |
|-------|-----|-----------|
| `dim-military` | `#FF6666` | Military card left border, attack indicators |
| `dim-economic` | `#FFCC44` | Economic card left border, invest indicators |
| `dim-cultural` | `#44DDAA` | Cultural indicators — arrives Slice 3 |
| `dim-covert` | `#AA44FF` | Covert card left border, intel indicators — arrives Slice 2 |

### 2.5 Functional Colors

| Token | Hex | Usage |
|-------|-----|-------|
| `highlight` | `#FFD700` | Territory highlight glow, focus rings, selected states |
| `success` | `#44CC66` | Victory elements, positive deltas |
| `warning` | `#FF8844` | AI timeout warnings, intel insufficient |
| `neutral` | `#2A2A3E` | Empty quadrant (no owner), disabled card state |

---

## 3. TYPOGRAPHY

### 3.1 Font Families

| Role | Font | Source | Usage |
|------|------|--------|-------|
| UI / Game Interface | **Orbitron** | Google Fonts (weights: 400, 500, 700) | Territory names, card labels, player names, buttons, headers, victory text |
| Data / Database Output | **JetBrains Mono** | Google Fonts (weights: 400, 500) | Query results, data tables, timestamps, action point numbers, intel text, ticker events |

### 3.2 Type Scale

| Size | UI (Orbitron) | Data (JetBrains Mono) |
|------|---------------|----------------------|
| `xs` (10px) | Territory name on map | — |
| `sm` (11px) | Card cost indicator, canned query pills | Ticker event text |
| `base` (13px) | Card labels, player indicator | Query input text, data table cells |
| `lg` (16px) | Action bar number, panel titles | Intel report text |
| `xl` (20px) | Victory text | — |
| `2xl` (28px) | Victory headline | — |

### 3.3 Font Loading

```html
<link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&family=Orbitron:wght@400;500;700&display=swap" rel="stylesheet">
```

Tailwind config extension:
```javascript
theme: {
  extend: {
    fontFamily: {
      ui: ['Orbitron', 'sans-serif'],
      data: ['JetBrains Mono', 'monospace'],
    }
  }
}
```

---

## 4. MAP AND TERRITORIES

### 4.1 Map Layout

- 12 hexagonal territories arranged in a honeycomb grid.
- Three continent groups: Americas (left, 4 hexes), Europe-Africa (center, 4 hexes), Asia-Oceania (right, 4 hexes).
- Each continent group has a subtle background tint: a very low-opacity ellipse or rounded rectangle in a continent-themed color behind its hexes. Not bright. Barely perceptible. Acts as a visual grouping cue.
- Adjacent territories share a hex edge. Cross-continent adjacency (e.g., North America to Western Europe) is shown by a thin 1px connecting line in `#334455` between the two hexes.

### 4.2 Territory Hexagon

- Size: approximately 70px from flat edge to flat edge (width ~80px).
- Stroke: 1.5px `#334455`.
- Fill: X-split into four triangular quadrants meeting at the center point.
  - Each quadrant is a triangle defined by: center point + two adjacent vertices of the hexagon.
  - Quadrant fill = owning player's color. If no owner, fill = `neutral` (#2A2A3E).
  - In Slice 1 (two dimensions): Top-left and bottom-right quadrants = Military and Economic. Top-right and bottom-left = neutral.
  - In Slice 3 (four dimensions): All four quadrants active.
- Internal quadrant divider lines: 0.5px `#334455`, drawn from center to vertex and center to edge midpoints.

### 4.3 Territory States

| State | Visual |
|-------|--------|
| **Default** | Quadrants filled per ownership. 1.5px border `#334455`. |
| **Owned (current player has any dimension)** | Border brightens to `text-secondary` (#8899AA), 2px. |
| **Highlighted (drag target or query result)** | Outer glow: `box-shadow: 0 0 12px 4px rgba(255, 215, 0, 0.5)`. Border `#FFD700`. |
| **Hover** | Slight scale increase `transform: scale(1.08)`. Border brightens. Cursor pointer. |
| **Neutral (no owner in any dimension)** | All quadrants `#2A2A3E`. Dim appearance. |

### 4.4 Territory Labels

- Territory name below each hexagon.
- Font: Orbitron, 10px, `text-primary` (#E0E0E0).
- Centered horizontally below the hex. Single line. No truncation (names are short).

---

## 5. ACTION CARDS

### 5.1 Card Container

- Shape: horizontal rounded rectangle.
- Dimensions: 90px width × 55px height. Border radius: 8px.
- Background: `bg-surface` (#1A1A2E).
- Left border: 3px solid dimension accent color.
  - Military: `dim-military` (#FF6666)
  - Economic: `dim-economic` (#FFCC44)
  - Covert: `dim-covert` (#AA44FF) — arrives Slice 2
- Shadow: `0 2px 8px rgba(0, 0, 0, 0.3)`.

### 5.2 Card Content

- Center icon: geometric SVG shape, 20px, colored with the dimension accent.
  - Military: upward-pointing chevron. An equilateral triangle pointing up, stroke-only, 2px stroke.
  - Economic: circle with a vertical line through it. A circle (radius 8px) with a vertical line from top to bottom, stroke-only, 2px stroke. The line extends 2px above and below the circle.
  - Covert: concentric circles. Outer circle radius 8px, inner circle radius 3px, stroke-only, 2px stroke. — arrives Slice 2
- Below icon: label text in Orbitron, 13px, `text-primary`.
  - Military: "ATTACK"
  - Economic: "INVEST"
  - Covert: "DEPLOY" — arrives Slice 2
- Top-right corner: cost indicator. A small circle (14px diameter) with "1" in JetBrains Mono, 9px, `text-secondary`. The circle border is 1px `text-secondary`.

### 5.3 Card States

| State | Visual |
|-------|--------|
| **Available** | Full opacity. Shadow present. Cursor grab. |
| **Dragging** | Opacity 0.85. Slight rotation (2 degrees). Shadow increases to `0 4px 16px rgba(0, 0, 0, 0.5)`. Cursor grabbing. |
| **Disabled (0 action points)** | Opacity 0.35. No shadow. Cursor not-allowed. All content muted. |
| **Returning (invalid drop)** | Snaps back to hand position over 200ms ease-out. No visual change during snap. |

### 5.4 Card Hand

- Fixed bar at the bottom of the viewport.
- Background: `bg-surface` (#1A1A2E) at 90% opacity with a 1px top border `#334455`.
- Height: 80px. Full width.
- Cards are centered horizontally in a row with 12px gaps.
- New card enters: slides up from below the hand bar over 200ms ease-out.

---

## 6. ANIMATION SYSTEM

All animations use `ease-out` timing. No bouncing. No spring physics. No staggered delays. Precise and mechanical.

| Element | Property | Duration | Easing |
|---------|----------|----------|--------|
| Territory color change | background-color | 300ms | ease-out |
| Territory highlight glow | box-shadow | 150ms | ease-out |
| Territory hover scale | transform | 150ms | ease-out |
| Card enter hand | transform (translateY) | 200ms | ease-out |
| Card return to hand | transform (translateY) | 200ms | ease-out |
| Action bar fill | width | 300ms | ease-out |
| Victory overlay | opacity | 400ms | ease-out |
| Results panel slide | transform (translateY) | 250ms | ease-out |
| Ticker scroll | transform (translateX) | Continuous linear, speed ~30px/s |

---

## 7. QUERY BAR AND RESULTS (Slice 4)

### 7.1 Query Bar

- Position: top of screen, full width.
- Height: 36px.
- Background: `bg-surface` (#1A1A2E). Bottom border: 1px `#334455`.
- Layout: `>` prompt character in JetBrains Mono, 13px, `text-accent` (#FFD700), followed by the text input.
- Text input: JetBrains Mono, 13px, `text-primary`, placeholder `text-secondary`. No border. No outline. Background transparent. Full remaining width.
- Placeholder text: "Ask anything about the game state..."

### 7.2 Canned Query Buttons

- Row of 10 pill-shaped buttons directly below the query bar.
- Height: 24px. Padding: 6px 12px. Border radius: 12px (fully rounded).
- Background: `bg-surface-alt` (#222240). Text: Orbitron, 11px, `text-secondary`.
- Hover: border becomes `highlight` (#FFD700), 1px. Text becomes `text-primary`.
- Gap between buttons: 8px.

### 7.3 Results Panel

- Appears between the query buttons and the map.
- Background: `bg-surface` (#1A1A2E) at 95% opacity. Border: 1px `#334455`. Border radius: 4px.
- Slides down from the query bar area over 250ms ease-out.
- Content:
  - Summary text: Orbitron, 14px, `text-primary`. Top of panel, with a 1px bottom border `#334455`. Padding: 8px 12px.
  - Data table: JetBrains Mono, 13px, `text-primary`. Alternating row backgrounds: `bg-surface` and `bg-surface-alt`. Column headers: Orbitron, 11px, `text-accent` (#FFD700). Cell padding: 6px 12px. Row border: 0.5px `#334455`.
- Close button: small "×" in top-right corner. Orbitron, 16px, `text-secondary`. Hover: `text-primary`.

---

## 8. EVENT TICKER (Slice 4)

- Fixed bar at the very bottom of the viewport, below the card hand.
- Height: 28px. Background: `bg-ticker` (#0D0D1A). Top border: 1px `#334455`.
- Content scrolls right-to-left continuously. Linear animation, speed approximately 30px/s.
- Each event:
  - Player color indicator: a small square (8×8px, border-radius 2px) filled with the relevant player's color.
  - Event text: JetBrains Mono, 11px, `text-primary`.
  - Separator between events: a middot character (`·`) in `text-secondary`, with 8px spacing on each side.
- Hover: scrolling pauses. Cursor pointer.
- Clicking an event with a territory reference: highlights that territory on the map for 3 seconds.

---

## 9. ACTION BAR

- Position: top-right corner of the screen.
- A horizontal bar with a border and fill.
- Width: 160px. Height: 20px. Border radius: 4px.
- Border: 1px `text-secondary` (#8899AA).
- Background (empty): `neutral` (#2A2A3E).
- Fill: the current player's color. Width transitions proportionally to `actionPoints / maxActionPoints` over 300ms ease-out.
- Text overlay: JetBrains Mono, 12px, `text-primary`, centered. Reads "5/10" etc.

---

## 10. PLAYER INDICATOR

- Position: top-left corner of the screen.
- A colored dot (10px diameter, filled with current player's color) followed by "You are Player X" in Orbitron, 12px, `text-secondary`.
- Simple. Unobtrusive. Always visible.

---

## 11. VICTORY SCREEN

- Full-screen overlay. Background: `bg-root` (#0A0A1A) at 90% opacity. Fades in over 400ms ease-out.
- Centered content:
  - Winner announcement: Orbitron, 28px, `text-accent` (#FFD700). Reads "{Winner} wins!"
  - Subtitle: Orbitron, 16px, `text-primary`. Reads "You win!" (if current player won) or "You lose." (if current player lost).
  - A decorative geometric element: a large hexagon outline (matching the territory hexagons but 120px wide, stroke 2px, player winner's color) behind the text.
- No restart button. The game state is final for the session.

---

## 12. SCREEN LAYOUT (ALL SLICES)

```
┌────────────────────────────────────────────────┐
│ Player Indicator          Action Bar            │  ← top bar area
├────────────────────────────────────────────────┤
│ [> Ask anything about the game state..._____]  │  ← query bar (Slice 4)
│ [Pill] [Pill] [Pill] [Pill] [Pill] ...         │  ← canned queries (Slice 4)
├────────────────────────────────────────────────┤
│                                                │
│               HEX MAP AREA                     │  ← fills remaining space
│      (12 hex territories, 3 continents)        │
│                                                │
├────────────────────────────────────────────────┤
│  [Card] [Card] [Card] [Card] [Card]            │  ← card hand (fixed, 80px)
├────────────────────────────────────────────────┤
│ ■ Event text · ■ Event text · ■ Event text ... │  ← ticker (Slice 4, fixed, 28px)
└────────────────────────────────────────────────┘
```

---

## 13. GEOMETRIC ICON SPECIFICATIONS

All icons are simple SVG paths. No emojis. No icon fonts. No raster images.

### 13.1 Military (Attack)

```
<svg width="20" height="20" viewBox="0 0 20 20">
  <polygon points="10,3 17,16 3,16" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
</svg>
```
An upward-pointing triangle. Color: `dim-military` (#FF6666).

### 13.2 Economic (Invest)

```
<svg width="20" height="20" viewBox="0 0 20 20">
  <circle cx="10" cy="10" r="7" fill="none" stroke="currentColor" stroke-width="2"/>
  <line x1="10" y1="2" x2="10" y2="18" stroke="currentColor" stroke-width="2"/>
</svg>
```
A circle with a vertical line through it, extending slightly beyond the circle. Color: `dim-economic` (#FFCC44).

### 13.3 Covert (Deploy) — Slice 2+

```
<svg width="20" height="20" viewBox="0 0 20 20">
  <circle cx="10" cy="10" r="8" fill="none" stroke="currentColor" stroke-width="2"/>
  <circle cx="10" cy="10" r="3" fill="currentColor"/>
</svg>
```
Concentric circles. Outer ring stroke-only, inner dot filled. Color: `dim-covert` (#AA44FF).

---

## 14. PROHIBITIONS

These must never appear in the generated code:

- **No emojis.** No Unicode emoji characters anywhere. Use geometric SVG icons instead.
- **No em dashes.** Use standard hyphens or middots (·) for separators.
- **No custom CSS files.** All styling must be Tailwind utility classes or inline SVG attributes.
- **No rounded corners above 8px** except for fully rounded pills (border-radius 12px+).
- **No box shadows with colors other than `#000000` (black) at varying opacities or `#FFD700` (gold) for highlights.**
- **No font weights above 700.**
- **No animations longer than 400ms except the ticker scroll.**
- **No color gradients.** Solid colors only.

---

## 15. TAILWIND CONFIGURATION REFERENCE

```javascript
// tailwind.config.js
module.exports = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'bg-root': '#0A0A1A',
        'bg-surface': '#1A1A2E',
        'bg-surface-alt': '#222240',
        'bg-ticker': '#0D0D1A',
        'text-primary': '#E0E0E0',
        'text-secondary': '#8899AA',
        'text-accent': '#FFD700',
        'player-1': '#4488FF',
        'player-2': '#FF4444',
        'player-3': '#FFAA00',
        'player-4': '#AA44FF',
        'dim-military': '#FF6666',
        'dim-economic': '#FFCC44',
        'dim-cultural': '#44DDAA',
        'dim-covert': '#AA44FF',
        'highlight': '#FFD700',
        'success': '#44CC66',
        'warning': '#FF8844',
        'neutral': '#2A2A3E',
      },
      fontFamily: {
        ui: ['Orbitron', 'sans-serif'],
        data: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
};
```

---

## End of AESTHETIC.md

Every generated component must reference this document for colors, fonts, spacing, and animation values. Use the Tailwind config tokens defined here. Never hardcode hex values or font families in component code. The visual identity of Risk: Dominion is a single, coherent system. Maintain it across all seven slices.