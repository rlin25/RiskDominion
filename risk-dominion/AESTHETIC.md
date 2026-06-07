# AESTHETIC.md — Risk: Dominion Visual Design System

## Version 2.1
## Scope: Complete Visual Overhaul — All Slices
## Replaces: AESTHETIC.md v2.0 in its entirety

---

## 0. PURPOSE

This document specifies the exact visual design of Risk: Dominion. Every color, font, dimension,
animation, and rendering rule is defined here. Implementation must match these specifications exactly.

The companion document UIUX.md specifies interaction patterns and component behavior.

---

## 1. COLOR PALETTE

All tokens are defined in `tailwind.config.js`. Do not invent new hex values. Reference these tokens.

### 1.1 Background Colors

| Token | Hex | Usage |
|-------|-----|-------|
| `bg-root` | `#0d0b08` | Page root, deepest background |
| `bg-surface` | `#1a1610` | Panels, overlays, cards |
| `bg-surface-alt` | `#241f16` | Alternating rows, hover states |
| `bg-ticker` | `#100e09` | Event ticker strip |
| `bg-map` | `#141009` | Map background |

### 1.2 Text Colors

| Token | Hex | Usage |
|-------|-----|-------|
| `text-primary` | `#f0e6d0` | All primary text |
| `text-secondary` | `#9a8870` | Labels, placeholders, timestamps |
| `text-accent` | `#d4a017` | Gold highlights, important labels |
| `text-command` | `#c8b882` | Command bar prompt echo |

### 1.3 Player Colors

| Token | Hex | Player |
|-------|-----|--------|
| `player-1` | `#4a90e2` | Human player |
| `player-2` | `#d94f4f` | Zhao |
| `player-3` | `#e8a020` | Consortium |
| `player-4` | `#9b59b6` | Prophet |

### 1.4 Dimension Colors

| Token | Hex | Dimension |
|-------|-----|-----------|
| `dim-military` | `#cc3322` | Military quadrant accent |
| `dim-economic` | `#e8a020` | Economic quadrant accent |
| `dim-cultural` | `#2dbfa0` | Cultural quadrant accent |
| `dim-covert` | `#8e44ad` | Covert quadrant accent |

### 1.5 Border and Structural Colors

| Token | Hex | Usage |
|-------|-----|-------|
| `border-warm` | `#3d3525` | All panel borders, dividers |
| `border-gold` | `#6b5a2a` | Hovered borders, gold-tier dividers |
| `neutral` | `#2a2318` | Unowned territory fill |
| `highlight` | `#d4a017` | Active selection, drop target |
| `success` | `#2ecc71` | Victory confirmation |
| `warning` | `#e67e22` | Warning states |

### 1.6 Box Shadows (from tailwind.config.js)

| Token | Value |
|-------|-------|
| `shadow-territory` | `0 2px 12px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.05)` |
| `shadow-card` | `0 4px 16px rgba(0,0,0,0.5), 0 1px 0 rgba(255,255,255,0.04)` |
| `shadow-card-lift` | `0 12px 32px rgba(0,0,0,0.7), 0 0 20px rgba(212,160,23,0.25)` |
| `shadow-panel` | `inset 0 0 0 1px rgba(212,160,23,0.12), 0 4px 24px rgba(0,0,0,0.4)` |

---

## 2. TYPOGRAPHY

### 2.1 Font Families

Three fonts. Each has a defined role. Do not substitute.

| Role | Font | Weight | Usage |
|------|------|--------|-------|
| `font-display` | Rajdhani | 500 / 600 / 700 | Territory names, continent banners, panel headers, victory text, card labels |
| `font-ui` | Orbitron | 400 / 500 / 700 | ActionBar label, loading screen, top nav chrome |
| `font-data` | JetBrains Mono | 400 / 500 | Troop counts, data values, command bar input, chat messages, timestamps, query results |

**Why Rajdhani:** Semi-condensed, military-technical. Readable at 8.5–10px. Feels like a strategy
game instrument panel. Works both in UPPERCASE tracking and in normal mixed case. Replaces Cinzel,
which was too classical and Roman for this aesthetic.

**Why Orbitron:** Digital chrome for system-level UI. Reserve for elements that signal
"machine interface": the action bar label, the loading state, replay controls.

**Why JetBrains Mono:** All numbers, data, and freeform user input. Monospaced ensures column
alignment in tables and pip counters. Signals "this is information, not decoration."

### 2.2 Google Fonts Import URL

Replace the existing `<link>` in `index.html`:

```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link
  href="https://fonts.googleapis.com/css2?family=Rajdhani:wght@500;600;700&family=JetBrains+Mono:wght@400;500&family=Orbitron:wght@400;500;700&display=swap"
  rel="stylesheet"
/>
```

### 2.3 Tailwind fontFamily Update

```javascript
fontFamily: {
  display: ["Rajdhani", "sans-serif"],
  ui:      ["Orbitron", "sans-serif"],
  data:    ["JetBrains Mono", "monospace"],
},
```

### 2.4 Type Scale

| Context | Font | Size | Weight | Color |
|---------|------|------|--------|-------|
| Territory name label | Rajdhani | 8.5px | 600 (owned) / 500 (neutral) | `text-accent` (highlighted) / player color (owned) / `text-secondary` (neutral) |
| Continent banner | Rajdhani | 10px | 600 | `text-secondary` |
| Card corner mark | Rajdhani | 9px | 500 | dimension accent |
| Card action label | Rajdhani | 8.5px | 700 | dimension accent |
| ActionBar label | Orbitron | 8px | 400 | `text-secondary` |
| ActionBar count | JetBrains Mono | 11px | 400 | `text-secondary` |
| Troop count in medallion | JetBrains Mono | 13px | 700 | `text-primary` |
| Command bar prompt `>` | JetBrains Mono | 16px | 400 | `text-accent` |
| Command bar input | JetBrains Mono | 13px | 400 | `text-primary` |
| Chat message | JetBrains Mono | 11px | 400 | `text-primary` |
| Chat header AI name | Rajdhani | 13px | 600 | AI player color |
| Intel panel header | Rajdhani | 12px | 600 | `text-accent` |
| Intel panel body | JetBrains Mono | 11px | 400 | `text-primary` |
| Query table header | Rajdhani | 10px | 600 | `text-accent` |
| Query table cell | JetBrains Mono | 10px | 400 | `text-primary` |
| Event ticker event text | JetBrains Mono | 10px | 400 | event type color |
| Event ticker label | Rajdhani | 8px | 600 | `text-accent` |
| Victory title | Rajdhani | 32px | 700 | winner color |
| Victory subtitle | Rajdhani | 13px | 600 | `text-accent` |
| Victory subhead | Rajdhani | 11px | 500 | `text-secondary` |
| Victory win/lose line | Orbitron | 15px | 400 | `success` / `text-secondary` |
| Loading screen | Orbitron | 14px | 400 | `text-secondary` |
| Title screen game title | Rajdhani | 48px | 700 | `text-accent` |
| Title screen subtitle | Rajdhani | 13px | 500 | `text-secondary` |

---

## 3. MAP AND TERRITORIES

### 3.1 Map Layout

The map is a hex grid: 12 SVG hexagon territories arranged in three continent columns. There is no
D3.js geographic projection, no GeoJSON, no Mercator projection. The hex grid is the canonical map
representation and must be preserved as-is.

**Continent columns (from constants.ts):**

| Column | Continent | Territory IDs |
|--------|-----------|---------------|
| Left | Americas | 1, 2, 3, 4 |
| Center | Europe-Africa | 5, 6, 7, 8 |
| Right | Asia-Oceania | 9, 10, 11, 12 |

Each continent column renders as a 2-column grid of hex territories with a continent banner above it.
The three columns are arranged horizontally with `gap-8`.

The map container uses:
- CSS class `map-bg` — warm crosshatch grid pattern (`rgba(212,160,23,0.04)` lines, 32px spacing)
- CSS class `vignette` — radial gradient edge darkening
- Decorative corner marks: 28×28 SVG L-brackets, `text-accent` at 20% opacity, one per corner

Background silhouette: an SVG world map outline is rendered as a purely decorative element,
positioned `absolute inset-0`, `pointer-events-none`, `opacity-[0.055]`, `fill="#d4a017"`. It does
not interact with gameplay. It provides spatial context behind the hex grid.

### 3.2 Hex Territory Dimensions

Each territory is a single `<svg width="92" height="80" viewBox="0 0 92 80">` element.

Hexagon vertex points: `0,40 23,0 69,0 92,40 69,80 23,80`

This produces a flat-top hexagon 92px wide and 80px tall.

### 3.3 Hex Territory Layers (render order, bottom to top)

1. **Base fill** — `<polygon points="0,40 23,0 69,0 92,40 69,80 23,80" fill="#1a1610" />`
2. **Dimension quadrants** (clipped to hex shape via `<clipPath>`)
3. **Inner dividers** — four lines from center (46,40) to hex edges
4. **Outer border polygon** — stroke only, no fill
5. **Center medallion** — `<circle cx="46" cy="40" r="16">` outer ring + `<circle r="13">` inner fill
6. **Troop count** — JetBrains Mono 13px/700 at (46,44), `text-primary`
7. **Highlight ring** — dashed gold polygon, conditionally rendered when highlighted or drop-over

### 3.4 Dimension Quadrant Fills

Four quadrants are cut from the hex center (46,40), clipped inside the hex shape:

| Quadrant | Points | Dimension | Default (neutral) | Owned |
|----------|--------|-----------|-------------------|-------|
| Top-left | `46,40 46,0 23,0 0,40` | Military | `neutral` (#2a2318) | `PLAYER_COLORS[owner]` |
| Top-right | `46,40 46,0 69,0 92,40` | Cultural | `neutral` (#2a2318) | `PLAYER_COLORS[owner]` |
| Bottom-right | `46,40 92,40 69,80 46,80` | Economic | `neutral` (#2a2318) | `PLAYER_COLORS[owner]` |
| Bottom-left | `46,40 0,40 23,80 46,80` | Covert | `neutral` (#2a2318) | `PLAYER_COLORS[owner]` if `agentCount > 0`, else `neutral` |

All quadrant fills use `fillOpacity={0.82}`.

Inner dividers: `stroke="#0d0a06"`, `strokeWidth={1}`, `opacity={0.6}`. Lines from (46,40) to
top-center, bottom-center, left-center, right-center.

### 3.5 Border States

The outer border polygon adapts based on state:

| State | Color | Width |
|-------|-------|-------|
| Highlighted (selected / drag-over) | `#d4a017` | 2.5px |
| Dominant owner present | dominant player color | 2px |
| Neutral (no owner) | `#3d3525` | 1.5px |

The outer glow uses CSS `filter: drop-shadow(0 0 10px {glowColor})`:
- Highlighted: `rgba(212,160,23,0.7)`
- Drag-over: `rgba(212,160,23,0.5)`
- Dominant owner: `{playerColor}55`
- Neutral: no filter

Dominant owner is derived by counting which player ID appears most frequently across the four
dimension owners. Ties are broken by first-encountered ID.

When highlighted or drag-over, a secondary dashed ring renders inside the hex:
`points="3,40 24,3 68,3 89,40 68,77 24,77"`, `stroke="#d4a017"`, `strokeWidth={1.5}`,
`strokeDasharray="6 3"`, `opacity={0.7}`.

### 3.6 Center Medallion

Outer ring: `<circle cx="46" cy="40" r="16" fill="#0d0a06" stroke={borderColor} strokeWidth="1.5" />`
Inner fill: `<circle cx="46" cy="40" r="13" fill="#1a1610" />`
Troop count: JetBrains Mono, 13px, 700, `#f0e6d0`, anchored at (46, 44).

### 3.7 Territory Name Label

Rendered below the hex SVG as a `<div>` with:
- Font: **Rajdhani** (replaces Cinzel — same visual intent, correct font)
- Size: 8.5px
- Weight: 600 if owned or dominant, 500 if neutral
- Color: `#d4a017` if highlighted, dominant player color if owned, `#9a8870` if neutral
- Text shadow: `0 0 8px {playerColor}44` when dominant owner exists
- `maxWidth: 88`, `whiteSpace: nowrap`, `textOverflow: ellipsis`
- `letterSpacing: 0.03em`
- `mt-1 px-2 py-0.5 rounded text-center leading-tight`

### 3.8 Territory Hover

On `<svg>` hover: `scale(1.1)` via `transition-transform duration-150 ease-out hover:scale-[1.1]`.
`transformOrigin: "center 75%"` so the territory scales up from its base rather than its center.

A `title` attribute on the wrapper provides a browser tooltip with troop count, capital, agent count,
and influence percentage (for accessibility and quick reference).

### 3.9 Continent Column Layout

Each continent column is:
```
<div className="flex flex-col items-center gap-2">
  {/* Continent banner */}
  {/* Territory 2×2 grid */}
</div>
```

Territory grid: `grid grid-cols-2 gap-x-3 gap-y-4 rounded-xl p-4` with:
- `background: rgba(255,255,255,0.012)`
- `border: 1px solid rgba(212,160,23,0.08)`
- `boxShadow: inset 0 0 40px rgba(0,0,0,0.3)`

---

## 4. CONTINENT BANNERS

### 4.1 Appearance

Each continent banner is a narrow pill above the territory grid:

```
<div className="flex items-center gap-1.5 px-3 py-1 rounded"
  style={{
    background: "linear-gradient(90deg, transparent, rgba(212,160,23,0.12), transparent)",
    borderTop: "1px solid rgba(212,160,23,0.2)",
    borderBottom: "1px solid rgba(212,160,23,0.2)",
  }}
>
  <span className="text-[10px] tracking-widest uppercase"
    style={{ fontFamily: "Rajdhani, sans-serif", fontWeight: 600, color: "#9a8870", letterSpacing: "0.18em" }}
  >
    {continent.name}
  </span>
</div>
```

### 4.2 No Emoji Icons

Continent banners display text only. There are no emoji icons (no ⚔, no 🏛, no 🌏). The continent
names — Americas, Europe-Africa, Asia-Oceania — are sufficient. The `CONTINENT_ICONS` map in
`Map.tsx` must be removed.

---

## 5. ACTION CARDS

### 5.1 Card Dimensions

Each card: `width: 78, height: 112` — portrait orientation, playing-card proportions.
Border radius: `rounded-lg` (8px).

### 5.2 Card Types

| Type | Accent Color | Label | Sub-label first char |
|------|-------------|-------|---------------------|
| military | `#cc3322` | ATTACK | M |
| economic | `#e8a020` | INVEST | E |
| covert | `#8e44ad` | DEPLOY | C |

### 5.3 Card Layers (bottom to top)

1. **Background gradient:** `linear-gradient(160deg, #221e18 0%, #13110d 100%)`
2. **Border:** `1.5px solid {accent}` (or `#3d3525` when disabled)
3. **Top corner marks:** first char of sub-label (left) + `✦` (right), Rajdhani 9px, accent color at 80% opacity
4. **Center icon:** 36×36 SVG, accent color (or `#3d3525` when disabled)
5. **Bottom label strip:** gradient fade `{accent}22 → transparent`, top border `{accent}33`, label text Rajdhani 8.5px/700/tracked

### 5.4 Card Icons (SVG, 36×36 viewBox)

**Military — Sword:**
- Blade: vertical line (18,4)→(18,28), strokeWidth 2.5
- Handle split: (18,28)→(12,34) and (18,28)→(24,34), strokeWidth 2
- Cross-guard: horizontal line (11,22)→(25,22), strokeWidth 2.5
- Tip diamond: `polygon points="18,4 21,10 18,8 15,10"`, filled, opacity 0.9

**Economic — Coin Stack:**
- Bottom ellipse: cx=18, cy=26, rx=11, ry=4
- Stack cylinder sides: rect x=7 y=16 w=22 h=10 (fill opacity 0.15), two vertical lines
- Top ellipse: cx=18, cy=16, rx=11, ry=4
- Dollar sign: JetBrains Mono `$`, 8px, centered at (18, 19.5)

**Covert — Eye:**
- Outer ellipse: rx=13, ry=7
- Iris: circle r=4.5, fill accent at 0.9 opacity
- Pupil: circle r=2, fill `#0d0b08`
- Lashes: three short lines from top of iris, opacity 0.5

### 5.5 Card States

| State | Opacity | Border | Shadow |
|-------|---------|--------|--------|
| Normal | 1.0 | 1.5px accent | `0 4px 16px rgba(0,0,0,0.5), 0 0 6px {accent}22` |
| Disabled | 0.3 | 1.5px `#3d3525` | none |
| Dragging | 0.92 | 1.5px accent | `0 14px 36px rgba(0,0,0,0.7), 0 0 20px {accent}55` |

On drag: `rotate(4deg) scale(1.08)` applied via dnd-kit transform.
Transition when not dragging: `transform 0.15s ease, box-shadow 0.15s ease`.

### 5.6 Card Shimmer

`.card-shimmer::before` — diagonal shimmer overlay, `opacity: 0` at rest, `opacity: 1` on hover.
Gradient: `linear-gradient(135deg, transparent 30%, rgba(255,255,255,0.06) 50%, transparent 70%)`.

---

## 6. FANNED CARD HAND

### 6.1 Container

```css
min-height: 96px;
border-top: 1px solid #3d3525;
background: linear-gradient(0deg, #0d0a06 0%, #1a1610 100%);
box-shadow: inset 0 8px 24px rgba(0,0,0,0.4);
padding-bottom: 12px;
padding-top: 8px;
```

### 6.2 Fan Layout

Cards are rendered in a relative container with `height: 120px`. Each card:
- Uses `transformOrigin: "bottom center"`
- Receives rotation: `angle = (i - mid) * 5.5` degrees, where `mid = (total - 1) / 2`
- Receives vertical lift: `yLift = Math.pow(Math.abs(i - mid), 1.4) * 5` pixels — parabolic arc,
  cards at the edges sit lower than cards in the center
- Overlap: `marginLeft: i === 0 ? 0 : -10` — 10px negative margin between cards
- z-index: `i` — cards to the right render on top
- Stagger: `animationDelay: {i * 0.06}s` with `animate-float-up` and `animationFillMode: both`

### 6.3 Card Cycle

Cards cycle through types `["military", "economic", "covert"]` by index modulo 3. A player with
6 action points holds: military, economic, covert, military, economic, covert.

### 6.4 Empty State

When `count === 0` (no action points or game ended), the hand area shows a centered message:
- Rajdhani, 11px, tracked uppercase, color `#4a4030`
- Text: "Campaign Ended" (game ended) or "Awaiting Orders" (no AP)
- Below: a thin decorative line: `linear-gradient(90deg, transparent, #3d3525, transparent)`, `w-24 h-px`

---

## 7. ACTION BAR

### 7.1 Layout

Positioned top-right in the main nav header strip. Flex column, items aligned right, `gap-1`.

### 7.2 Label

```
"Command Points"
fontFamily: "Orbitron, sans-serif"
fontSize: 8px
letterSpacing: widest
color: #9a8870
textTransform: uppercase
```

### 7.3 Pip Row

Ten circular pips in a horizontal row, `gap-1`, followed by the numeric readout.

Each pip: `width: 10, height: 10, border-radius: full`
- Filled: `backgroundColor: playerColor`, `border: 1.5px solid playerColor`, `boxShadow: 0 0 6px {playerColor}88`, `scale(1)`
- Empty: `backgroundColor: transparent`, `border: 1.5px solid #3d3525`, no shadow, `scale(0.85)`
- Transition: `transition-all duration-300`

Animate filled pips on appear: `animate-pip-fill` keyframe (scale 0.4 → 1, opacity 0 → 1, 0.2s ease-out).

Numeric readout: JetBrains Mono, 11px, `#9a8870`, `tabular-nums`, `ml-1.5`.
Format: `{actionPoints}/{MAX_ACTION_POINTS}` where `MAX_ACTION_POINTS = 10`.

---

## 8. COMMAND BAR (NEW)

### 8.1 Overview

The command bar is the unified non-card interaction interface. Hidden by default. Summoned by
pressing `Enter` or `T`. Dismissed by `Escape` or by beginning a drag action.

### 8.2 Dimensions and Position

- Position: top-center of viewport, `12px` from top edge
- Width: `60vw`, max-width `720px`
- Height: `44px`
- `z-index: 200`

### 8.3 Visual Appearance

```
background: rgba(26, 22, 16, 0.96)   /* bg-surface at ~96% opacity */
border: 1px solid #3d3525
border-radius: 6px
box-shadow: inset 0 0 0 1px rgba(212,160,23,0.10), 0 8px 32px rgba(0,0,0,0.6)
```

### 8.4 Input Area

Left side: `>` prompt
- Font: JetBrains Mono, 16px, `#d4a017`
- Padding-left: 14px, vertically centered
- Not interactive — visual chrome only

Input field:
- Font: JetBrains Mono, 13px, `#f0e6d0`
- Background: transparent
- Border: none, outline: none
- Placeholder: "Type a command or question..." in `#9a8870`
- Right padding: 14px
- Spans from prompt to right edge

On Enter: execute command, dismiss bar, route result to appropriate handler.

### 8.5 Appear Animation

The command bar slides down from the top edge and fades in:
```css
@keyframes slideDown {
  0%  { opacity: 0; transform: translateY(-12px); }
  100%{ opacity: 1; transform: translateY(0); }
}
animation: slideDown 0.18s ease-out forwards;
```

Dismiss: reverse (slide up + fade out, 0.15s ease-in).

### 8.6 Shake Animation

On unrecognized input, apply `animate-shake` keyframe (defined in tailwind.config.js):
```
0%,100%: translateX(0)
20%: translateX(-4px) rotate(-1deg)
40%: translateX(4px) rotate(1deg)
60%: translateX(-3px)
80%: translateX(3px)
Duration: 0.4s ease-in-out
```

After shake: a brief inline message appears below the bar for 3 seconds in JetBrains Mono 11px
`#9a8870`: "I didn't understand that. Try 'help' for options."

### 8.7 Dropdown Menu

Clicking the `>` prompt expands a dropdown immediately below the command bar, same width.

```
background: rgba(26, 22, 16, 0.97)
border: 1px solid #3d3525
border-radius: 0 0 6px 6px
box-shadow: 0 8px 24px rgba(0,0,0,0.5)
```

Section headers: Rajdhani 9px/600, uppercase, `#9a8870`, `padding: 4px 10px 2px`.
Options: Rajdhani 11px/500, `#f0e6d0`, `padding: 6px 10px`. Hover: `background: rgba(212,160,23,0.08)`.
Dividers: `1px solid #3d3525`.
Footer hint: Rajdhani 10px/400 italic, `#9a8870`, centered: "or type anything..."

Sections:
```
INTEL
  Show me Zhao's plans
  Show me Consortium's plans
  Show me Prophet's plans
──────────────────
CHAT
  Chat with Zhao
  Chat with Consortium
  Chat with Prophet
──────────────────
EVENTS
  What's happening?
──────────────────
ADVICE
  How am I doing?
  Where should I attack?
──────────────────
  or type anything...
```

---

## 9. CHAT WINDOWS (NEW)

### 9.1 Overview

Chat windows are opened via the command bar (e.g., "Chat with Zhao"). They are temporary overlays,
not persistent panels.

### 9.2 Dimensions and Position

- Fixed position: bottom-right corner of viewport
- Size: 280px wide, 320px tall
- Inset: 16px from right, 16px from bottom
- Multiple windows stack vertically with 12px gap, newest at bottom

### 9.3 Visual Appearance

```
background: rgba(26, 22, 16, 0.95)
border: 1px solid #3d3525
border-radius: 6px
box-shadow: inset 0 0 0 1px rgba(212,160,23,0.08), 0 8px 32px rgba(0,0,0,0.5)
```

Appear animation: `animate-float-up` (opacity 0→1, translateY 8px→0, 0.3s ease-out).
Dismiss: fade out 0.15s ease-in.

### 9.4 Header

Height: 40px. `border-bottom: 1px solid #3d3525`.

Left: AI portrait placeholder — 32×32px circle, `background: #241f16`, `border: 1px solid #3d3525`.
Positioned 8px from left.

AI name: Rajdhani, 13px/600, AI player color. Vertically centered.

Close button `×`: Rajdhani 16px, `#9a8870`, positioned 8px from right. Hover: `#f0e6d0`.

### 9.5 Message Area

Scrollable. `padding: 8px`. `gap-2` between messages. Auto-scroll on new message.
Uses `.styled-scroll` scrollbar style.

AI messages (aligned left):
- Portrait (24px circle), AI name (Rajdhani 10px, AI color), message (JetBrains Mono 11px, `#f0e6d0`)

Player messages (aligned right):
- JetBrains Mono 11px, `#f0e6d0`, text-right only

Timestamp (on hover): JetBrains Mono 9px, `#9a8870`, appears below message.

### 9.6 Input Area

Full-width input at bottom. `border-top: 1px solid #3d3525`. Padding: `8px 10px`.
Font: JetBrains Mono 13px, `#f0e6d0`. Background: `#241f16`.
Placeholder: "Message {AI name}..." in `#9a8870`.
Send on Enter. Clears after send. Max 500 characters (matches `MAX_CHAT_MESSAGE_LENGTH`).

---

## 10. COLOR LEGEND (NEW)

### 10.1 Position

Bottom-left corner of the map viewport. `16px` from bottom edge, `16px` from left edge. Absolute
positioned within the map container.

### 10.2 Content

Four rows, one per player:

| Square | Name |
|--------|------|
| `#4a90e2` | You |
| `#d94f4f` | Zhao |
| `#e8a020` | Consortium |
| `#9b59b6` | Prophet |

### 10.3 Visual Appearance

Each row: horizontal flex, `gap-2`, `items-center`.
Color square: `10×10px`, `border-radius: 2px`, filled with player color.
Name: Rajdhani, 10px/500, `#9a8870`.

Legend container: no background. `opacity: 0.6` normally, `opacity: 1.0` on hover of the legend area.
Transition: `opacity 0.2s ease`.

---

## 11. TITLE SCREEN (NEW)

### 11.1 Behavior

On page load: the title screen covers the full viewport. It is not a separate route — it is an
overlay rendered on top of the already-loading game.

The live map renders behind the overlay. The overlay dims it.

### 11.2 Overlay

```
position: absolute inset-0 z-50
background: radial-gradient(ellipse at center, rgba(13,11,8,0.82) 30%, rgba(0,0,0,0.95) 100%)
display: flex flex-col items-center justify-center gap-3
```

### 11.3 Content

Game title: Rajdhani, 48px/700, `#d4a017`
```css
text-shadow: 0 0 40px rgba(212,160,23,0.4), 0 2px 4px rgba(0,0,0,0.8);
letter-spacing: 0.04em;
animation: banner-in 0.8s ease-out forwards;
```

Subtitle: Rajdhani, 13px/500, `#9a8870`, letter-spacing: 0.25em, uppercase: "TACTICAL COMMAND INTERFACE"

### 11.4 Timing

- Title fades in via `animate-banner-in` (0.8s)
- Holds for 2 seconds after animation completes
- Overlay fades out over 0.5s via opacity transition
- Full-brightness map is revealed
- The loading screen ("ESTABLISHING COMMAND LINK…") is shown inside this overlay while
  `!isReady`, then transitions to the title-hold state once data arrives

---

## 12. QUERY VISUALIZATIONS (NEW)

Query results are rendered as overlays on the hex map SVG. They fade in over 300ms and auto-dismiss
after 10 seconds, or on click-away. All visualization types share the same container:

```
position: absolute inset-0 pointer-events-none
z-index: 10
```

### 12.1 Heat Map

Territories shaded by data intensity via color overlay polygons drawn inside the hex clip regions.

- Low intensity: base hex fill (`#1a1610`)
- Medium: `#d4a017` at 40% opacity overlay
- High: `#d94f4f` at 50% opacity overlay
- Applied simultaneously to all territories via proportional color interpolation

### 12.2 Flow Lines

Animated dashed lines drawn as SVG `<line>` elements connecting territory centers:
- Stroke: owner color, 2px, 60% opacity
- Dash: `strokeDasharray="8 6"`, animated offset for motion effect
- Particle: 4px circle traveling along the line, owner color at 80% opacity, 1s loop
- Sequential stagger: 100ms delay between each line appearing

Territory center coordinates are calculated from the rendered hex positions in the grid layout.

### 12.3 Proportional Symbols

SVG circles overlaid at territory centers:
- Radius: proportional to value, range `[8px, 32px]`
- Fill: owner color at 50% opacity
- Stroke: 1px owner color
- Appear: scale 0 → full radius, 300ms ease-out, staggered 50ms per territory

### 12.4 Bar Chart Overlay

Semi-transparent card rendered in open map space (upper-left of center column):
```
background: rgba(26, 22, 16, 0.94)
border: 1px solid #3d3525
border-radius: 6px
padding: 12px
```
- Column headers: Rajdhani 10px/600, `#d4a017`
- Horizontal bars: 12px height, owner colors, labeled with JetBrains Mono 10px
- Row dividers: `1px solid #3d3525`

### 12.5 Comparison Table

Same card surface as bar chart:
- Column headers: Rajdhani 10px/600, `#d4a017`
- Cell values: JetBrains Mono 10px, `#f0e6d0`
- Row dividers: `0.5px solid #3d3525`
- Row hover: `background: rgba(212,160,23,0.04)`

---

## 13. EVENT TICKER (DISPATCHES)

### 13.1 Container

Height: 30px. Fixed at bottom, above card hand.

```
border-top: 1px solid #3d3525
background: linear-gradient(0deg, #0d0a06, #100e09)
overflow: hidden
```

On hover: `[animation-play-state:paused]` pauses the marquee.

### 13.2 Label

Left-anchored pill: `px-3 py-1`, `border-right: 1px solid #3d3525`, `background: rgba(212,160,23,0.06)`.
Text: Rajdhani, 8px/600, `#d4a017`, letter-spacing 0.2em, uppercase: "DISPATCHES"

### 13.3 Marquee

Horizontally scrolling event feed: `animate-marquee` (40s linear infinite).
The event row is duplicated so the scroll is seamless. When paused, the player can read.

Each event item: inline-flex, `gap-1.5`:
- Icon: Unicode symbol, 9px, player color
- Event text: JetBrains Mono, 10px, event type color, clickable — triggers territory highlight (3s flash)
- Separator: `✦`, `#3d3525`, 10px

Event type icon map:
```
military: "⚔"   economic: "◈"   cultural: "✦"
covert:   "◉"   victory:  "★"   system:   "▸"
```

Event type color map (from constants.ts):
```
military: "#FF6666"   economic: "#FFCC44"   cultural: "#44DDAA"
covert:   "#AA44FF"   victory:  "#FFD700"   system:   "#8899AA"
```

### 13.4 Empty State

"AWAITING DISPATCHES" — Rajdhani, 9px, `#4a4030`, letter-spacing 0.2em, centered.

---

## 14. INTEL PANEL

### 14.1 Current Layout

The intel panel is a left-side drawer. It is toggled by pressing `I`. It is rendered as a flex
sibling to the map — when visible, it narrows the map; it does not float over it.

### 14.2 Headers

All panel section headers: Rajdhani, 12px/600, `#d4a017`, letter-spacing 0.1em, uppercase.

### 14.3 Data Values

All data values (troop counts, influence percentages, agent counts): JetBrains Mono, 11px, `#f0e6d0`.

### 14.4 Row Structure

Territory rows:
- Territory name: Rajdhani, 11px/600, player color if owned, `#9a8870` if neutral
- Sub-values: JetBrains Mono, 10px, `#9a8870`
- Owned indicator: a `3px` left border in player color on the row
- Hover: `background: rgba(212,160,23,0.04)`

### 14.5 Panel Background

```
background: #1a1610
border-right: 1px solid #3d3525
box-shadow: inset 0 0 0 1px rgba(212,160,23,0.06)
```

Uses `.styled-scroll` for overflow-y scrollable content.

---

## 15. VICTORY SCREEN

### 15.1 Trigger

Rendered as an `absolute inset-0 z-50` overlay when `gameEnded && mode === "player"`.

### 15.2 Background

`radial-gradient(ellipse at center, rgba(13,10,6,0.88) 40%, rgba(0,0,0,0.97) 100%)`

### 15.3 Crown SVG (90×80, viewBox "0 0 90 80")

- Crown base rect: x=15, y=58, w=60, h=10, rx=2, fill=winnerColor, opacity=0.85
- Crown body: `polygon points="15,58 15,30 28,44 45,18 62,44 75,30 75,58"`, fill=winnerColor, opacity=0.75
- Crown jewel center: circle cx=45, cy=26, r=5, fill=`#f0e6d0`, opacity=0.95
- Crown jewels flanking: circles at (22,47) and (68,47), r=3.5, fill=`#f0e6d0`, opacity=0.8
- Outer glow outline: same polygon path, fill=none, stroke=winnerColor, strokeWidth=1.5, opacity=0.5

### 15.4 Text Content

All text uses **Rajdhani** (replaces Cinzel).

- Sub-header: Rajdhani, 11px/500, `#9a8870`, letter-spacing 0.35em, uppercase: "Dominion Achieved"
- Winner name: Rajdhani, 32px/700, winnerColor, `text-shadow: 0 0 24px {color}88, 0 0 48px {color}44`
- Lower tagline: Rajdhani, 13px/600, `#d4a017`, letter-spacing 0.2em: "CONQUERS ALL"
- Win/lose line: Orbitron, 15px, `#2ecc71` (win) / `#9a8870` (lose), letter-spacing 0.1em
  - Win: "✦  VICTORY IS YOURS  ✦", text-shadow `0 0 12px #2ecc7188`
  - Lose: "Your campaign ends here."

### 15.5 Animation

Entire content container: `animate-victory-reveal` (0.6s cubic-bezier(0.34,1.56,0.64,1) forwards)

### 15.6 Decorative Lines

Two horizontal rule assemblies — above and below the text block:

```
<div className="flex items-center gap-3">
  <div className="h-px w-16" style={{ background: `linear-gradient(90deg, transparent, ${winnerColor})` }} />
  <span style={{ color: winnerColor, fontSize: 14 }}>✦</span>
  <div className="h-px w-16" style={{ background: `linear-gradient(90deg, ${winnerColor}, transparent)` }} />
</div>
```

---

## 16. SOUND DESIGN

All sounds synthesized via the Web Audio API. No audio files. No external assets. One
`AudioContext` instance created on user first interaction (browser autoplay policy).

### 16.1 Sound Definitions

| Event | Waveform | Frequency | Duration | Notes |
|-------|----------|-----------|----------|-------|
| Card play | sine | 800Hz | 50ms | Gain exponential ramp to 0 over last 20ms. Volume: -18dB |
| Territory flip | sine | 120Hz → 80Hz ramp | 150ms | Frequency linearly ramps down. Volume: -15dB |
| Cultural pressure 30% | sine | 200Hz → 300Hz | 200ms | Volume: -28dB |
| Cultural pressure 40% | sine | 300Hz → 400Hz | 200ms | Volume: -26dB |
| Victory | sine | C5 (523Hz), E5 (659Hz), G5 (784Hz) sequential | 150ms each, 100ms gap | Volume: -12dB |
| Defeat | sine | G4 (392Hz), C4 (262Hz) sequential | 300ms each, 200ms gap | Volume: -15dB |

### 16.2 Trigger Conditions

- **Card play:** on successful reducer call for `militaryAttack`, `economicInvest`, or `deployAgent`
- **Territory flip:** on any dimension owner change (received via subscription update)
- **Cultural pressure:** when `influencePct` crosses 30% or 40% thresholds
- **Victory / Defeat:** on `gameEnded` state transition

---

## 17. ANIMATIONS

All animation keyframes and durations are defined in `tailwind.config.js` `keyframes` and
`animation` blocks. Do not define duplicate keyframes in CSS.

### 17.1 Keyframe Reference

| Token | Keyframe | Duration | Usage |
|-------|----------|----------|-------|
| `animate-marquee` | translateX(0 → -50%) | 40s linear infinite | Event ticker scroll |
| `animate-glow-pulse` | opacity+scale oscillation | 2.5s ease-in-out infinite | Loading spinner, empty hand |
| `animate-float-up` | opacity 0→1, translateY 8px→0 | 0.3s ease-out forwards | Card hand appear, chat window appear |
| `animate-victory-reveal` | scale 0.7→1 + translateY 20px→0 | 0.6s cubic-bezier(0.34,1.56,0.64,1) | Victory screen |
| `animate-pip-fill` | scale 0.4→1, opacity 0→1 | 0.2s ease-out | Action pip fill-in |
| `animate-shake` | translateX ±4px oscillation | 0.4s ease-in-out | Command bar unrecognized |
| `animate-banner-in` | opacity 0→1, letterSpacing 0.4em→0.1em | 0.8s ease-out forwards | Title screen |

### 17.2 Principles

- Appears: ease-out. Dismisses: ease-in.
- No bouncing or spring physics except `victory-reveal` (intentional cubic-bezier overshoot).
- Territory color transitions: 300ms ease-out on quadrant fill changes.
- Hover scale on hex territory: 150ms ease-out.
- If frame rate drops below 30fps: disable `animate-marquee`, `animate-glow-pulse`, and any
  particle animations. Preserve color transitions and appear/dismiss animations.

---

## 18. UTILITY CSS CLASSES (from index.css)

| Class | Description |
|-------|-------------|
| `.map-bg` | Warm crosshatch grid. `#0d0a06` base + gold 4% opacity grid at 32px |
| `.vignette::after` | Radial gradient edge darkening, `pointer-events-none`, `absolute inset-0` |
| `.panel-border` | `1px solid #3d3525` + inner gold shadow `rgba(212,160,23,0.08)` |
| `.text-gold-gradient` | `linear-gradient(180deg, #f0c040 0%, #a07010 100%)` clip text |
| `.card-shimmer::before` | 135deg shimmer, opacity 0→1 on hover |
| `.styled-scroll` | 4px scrollbar, `#1a1610` track, `#3d3525` thumb, `#6b5a2a` hover |

---

## 19. SPACETIMEDB 2.4.1 INTEGRATION NOTES

The client connects to SpacetimeDB 2.4.1. All data subscriptions and mutations use the following
patterns from the SDK:

| Operation | Hook | Example |
|-----------|------|---------|
| Reactive table subscription | `useTable(tables.X)` | `useTable(tables.militaryState)` |
| Request / response | `useProcedure(procedures.X)` | `useProcedure(procedures.queryIntel)` |
| Mutation / state change | `useReducer(reducers.X)` | `useReducer(reducers.militaryAttack)` |
| Connection setup | `DbConnection.builder()` | chained builder pattern in connection module |

Do not use `subscribe()`, `on()`, `call()`, or any other API pattern from older SpacetimeDB
versions. Only the hooks listed above are valid for 2.4.1.

The `useSubscriptions()` hook in `App.tsx` wraps all table subscriptions and exposes typed
reactive state to the component tree. Visual components receive state as props and do not call
SpacetimeDB hooks directly.

---

## End of AESTHETIC.md v2.1

This document completely replaces AESTHETIC.md v2.0. All visual specifications herein are
authoritative. UI interaction patterns and component behavior are specified in UIUX.md.
