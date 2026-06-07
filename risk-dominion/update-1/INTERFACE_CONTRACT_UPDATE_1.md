# UI/UX OVERHAUL — INTERFACE CONTRACT

## Version 1.1
## Scope: Complete Visual and Interaction Overhaul — All Slices
## Target: Claude Code Generation

---

## 0. DOCUMENT PURPOSE

This document is the authoritative implementation specification for the complete UI/UX overhaul of Risk: Dominion. Every visual element, component behavior, interaction pattern, animation, and layout rule is specified here with exact values.

This contract is organized by component. Each section specifies one component's exact visual properties, behavior, states, and interactions. All color tokens are drawn from the warm parchment palette defined in Section 0.1. All typography uses the Rajdhani / JetBrains Mono / Cinzel / Orbitron hierarchy defined in Section 0.2.

### 0.1 Color Palette Reference

| Token | Hex | Usage |
|---|---|---|
| bg-root | `#0d0b08` | Page background, deepest layer |
| bg-surface | `#1a1610` | Panel and card backgrounds |
| bg-surface-alt | `#241f16` | Alternate raised surfaces |
| bg-ticker | `#100e09` | Event ticker strip |
| bg-map | `#141009` | Map canvas background |
| text-primary | `#f0e6d0` | Primary readable text |
| text-secondary | `#9a8870` | Subdued labels, hints |
| text-accent | `#d4a017` | Gold highlights, active states |
| text-command | `#c8b882` | Command bar text |
| border-warm | `#3d3525` | Default panel borders |
| border-gold | `#6b5a2a` | Hover and active borders |
| player-1 | `#4488FF` | Human player (You) |
| player-2 | `#d94f4f` | Zhao |
| player-3 | `#e8a020` | Consortium |
| player-4 | `#9b59b6` | Prophet |
| dim-military | `#cc3322` | Military dimension accent |
| dim-economic | `#e8a020` | Economic dimension accent |
| dim-cultural | `#2dbfa0` | Cultural dimension accent |
| dim-covert | `#8e44ad` | Covert dimension accent |
| neutral | `#2a2318` | Unowned territory fill |
| highlight | `#d4a017` | Selected / highlighted gold |
| success | `#2ecc71` | Victory / positive state |
| warning | `#e67e22` | Warning state |

### 0.2 Typography Reference

| Role | Family | Size | Weight | Use |
|---|---|---|---|---|
| Display / game title | Cinzel, serif | as specified per context | 700 | Game name, section titles |
| UI labels / headers | Rajdhani, sans-serif | as specified per context | 400–700 | All UI labels replacing Inter |
| Command Points label | Orbitron, sans-serif | 8px | 400 | Digital-chrome pip label |
| Data / monospace | JetBrains Mono, monospace | as specified per context | 400–700 | Troop counts, chat, code |

**Rule:** Wherever a previous version of this document specified Inter, use Rajdhani. Where it specified "JetBrains Mono or Inter", use "Rajdhani or JetBrains Mono". JetBrains Mono is reserved for numerical data, chat messages, and the command bar input.

---

## 1. MAP AND TERRITORY RENDERING

### 1.1 Map Container

- Layout: flex row of continent columns, `class="map-bg vignette relative flex flex-1 items-center justify-center gap-8 p-6 overflow-hidden"`
- Background token: `bg-map` (`#141009`)
- The map uses **no D3.js and no GeoJSON**. All territory rendering is SVG hexagons arranged in a CSS grid/flex layout
- Pan and zoom: not applicable — layout is static flex
- Decorative world-silhouette SVG: absolutely positioned behind the hex grid at `opacity: 0.055`, pointer-events none, aria-hidden, fills via `#d4a017` paths
- Decorative corner marks: four `28×28px` SVGs at each corner, `opacity: 0.20`, L-bracket lines in `#d4a017`, `stroke-width: 1.5`

### 1.2 Continent Columns

Territories are grouped into three continent columns as defined in `constants.ts`:

```
Americas:       territories [1, 2, 3, 4]
Europe-Africa:  territories [5, 6, 7, 8]
Asia-Oceania:   territories [9, 10, 11, 12]
```

Each continent column is a `<div>` with:
- `class="flex flex-col items-center gap-2"`
- Continent banner at top (see 1.3)
- Territory grid below (see 1.4)

### 1.3 Continent Banners

- Container: flex row with center alignment, `px-3 py-1 rounded`
- Background: `linear-gradient(90deg, transparent, rgba(212,160,23,0.12), transparent)`
- Top border: `1px solid rgba(212,160,23,0.20)`
- Bottom border: `1px solid rgba(212,160,23,0.20)`
- Continent name label:
  - Font: **Rajdhani, sans-serif**, weight 600, 10px
  - Color: `#9a8870` (text-secondary)
  - `letter-spacing: 0.18em`
  - `text-transform: uppercase`
- **No emoji** in continent banners. Text only. No icon span.

### 1.4 Territory Grid within Continent Column

- `class="grid grid-cols-2 gap-x-3 gap-y-4 rounded-xl p-4"`
- Background: `rgba(255,255,255,0.012)`
- Border: `1px solid rgba(212,160,23,0.08)`
- Box-shadow: `inset 0 0 40px rgba(0,0,0,0.3)`
- Each cell renders one `<Territory>` component

### 1.5 Territory Component — Hex SVG

Each territory is a flatop SVG hexagon:

- **Container:** `<div class="flex flex-col items-center select-none">`
- **SVG:** `width="92" height="80" viewBox="0 0 92 80"`
- **Hex points:** `"0,40 23,0 69,0 92,40 69,80 23,80"`
- Hover scale: `hover:scale-[1.1]`, `transition-transform duration-150 ease-out`, `transformOrigin: "center 75%"`
- Drop target: `dnd-kit useDroppable({ id: territory.territoryId })`; `isOver` state drives border color and drop glow

**Hex layers (bottom to top in SVG paint order):**

1. **Base fill:** `<polygon points="0,40 23,0 69,0 92,40 69,80 23,80" fill="#1a1610" />`
2. **Clip path:** `<clipPath id="hex-clip-{territoryId}"><polygon points="0,40 23,0 69,0 92,40 69,80 23,80" /></clipPath>`
3. **Quadrant fills** (clipped to hex):
   - Military — top-left: `<polygon points="46,40 46,0 23,0 0,40" fill={militaryOwnerColor} fillOpacity={0.82} />`
   - Cultural — top-right: `<polygon points="46,40 46,0 69,0 92,40" fill={culturalOwnerColor} fillOpacity={0.82} />`
   - Economic — bottom-right: `<polygon points="46,40 92,40 69,80 46,80" fill={economicOwnerColor} fillOpacity={0.82} />`
   - Covert — bottom-left: `<polygon points="46,40 0,40 23,80 46,80" fill={covertOwnerColor} fillOpacity={0.82} />`
   - Unowned quadrant fill: `#2a2318` (neutral)
   - Covert fill: only show owner color when `agentCount > 0`; otherwise `#2a2318`
4. **Inner dividers:** `<g stroke="#0d0a06" strokeWidth={1} opacity={0.6}>` — four lines from center `(46,40)` to each cardinal midpoint
5. **Outer border polygon:** `fill="none"`, `stroke={borderColor}`, `strokeWidth={borderWidth}` (see 1.7 for state values)
6. **Center medallion:**
   - Outer circle: `cx="46" cy="40" r="16"`, `fill="#0d0a06"`, `stroke={borderColor}`, `strokeWidth="1.5"`
   - Inner circle: `cx="46" cy="40" r="13"`, `fill="#1a1610"`
   - Troop count text: `x="46" y="44"`, `textAnchor="middle"`, `fontSize="13"`, `fontWeight="700"`, `fontFamily="JetBrains Mono, monospace"`, `fill="#f0e6d0"`
7. **Highlight ring** (rendered only when `isHighlighted || isOver`): `<polygon points="3,40 24,3 68,3 89,40 68,77 24,77" fill="none" stroke="#d4a017" strokeWidth={1.5} strokeDasharray="6 3" opacity={0.7} />`

### 1.6 Territory State Rules

**Dominant owner:** derived by counting how many dimensions (`militaryOwner`, `economicOwner`, `covertOwner`, `culturalOwner`) share the same `playerId > 0`. The player with the highest count wins. Tie: lower playerId wins. If all zero: no dominant owner.

| State | Border color | Border width | Glow |
|---|---|---|---|
| neutral (no owner) | `#3d3525` (border-warm) | 1.5px | none |
| owned (dominant owner) | dominant player color | 2px | `{dominantColor}55` drop-shadow |
| highlighted or isOver | `#d4a017` (gold) | 2.5px | `rgba(212,160,23,0.7)` drop-shadow |

Glow is applied as CSS `filter: drop-shadow(0 0 10px {glowColor})` on the container div. `isOver` glow: `rgba(212,160,23,0.5)`.

### 1.7 Territory Name Label

- Element: `<div>` below the SVG, `mt-1 px-2 py-0.5 rounded text-center leading-tight`
- Font: **Rajdhani, sans-serif** — weight 600 when territory is owned or highlighted, weight 400 otherwise
- Size: **8.5px**
- Color: `#d4a017` when highlighted; dominant player color when owned; `#9a8870` (text-secondary) otherwise
- `letter-spacing: 0.03em`
- Text shadow: `0 0 8px {dominantColor}44` when owned
- `maxWidth: 88px`, `white-space: nowrap`, `overflow: hidden`, `text-overflow: ellipsis`

### 1.8 Attack Lines on Hex Map

Attack lines are not D3 animated arrows. They are plain SVG lines drawn on an overlay SVG layer positioned absolutely over the map container.

- Trigger: drag start with a Military card
- Overlay SVG: `position: absolute`, `inset: 0`, `pointer-events: none`, `z-index: 5`
- Line per valid attack path: `<line>` from source hex center to target hex center
  - Hex center coordinates are calculated from the hex grid layout positions (not GeoJSON centroids)
  - Stroke: attacking player's `PLAYER_COLORS[playerId]`
  - Stroke opacity: 0.60
  - `stroke-width: 2px`
  - `stroke-dasharray: "6 4"`
- Pulse animation: CSS keyframe `@keyframes dash-march` that animates `stroke-dashoffset` from `0` to `-20` over 500ms, linear, infinite. Applied via `animation: dash-march 500ms linear infinite`
- Dismiss: on drag end — overlay SVG removed or set `display: none`
- **Remove:** D3 `path.attr("d", lineGenerator)` patterns, particle circle nodes, `.attr("stroke-dashoffset")` D3 animation, `d3.easeLinear` tween

### 1.9 Color Legend

- Position: absolutely within map container, `bottom: 16px`, `left: 16px`
- Background: transparent
- Four rows, each:
  - Color swatch: `10px × 10px`, `border-radius: 2px`, `display: inline-block`, `margin-right: 6px`; fill is the player's color
  - Name label: **Rajdhani, sans-serif**, 10px, `#9a8870` (text-secondary)
  - `margin-bottom: 4px`
- Player rows: `#4488FF` "You", `#d94f4f` "Zhao", `#e8a020` "Consortium", `#9b59b6` "Prophet"
- Opacity: 0.60 normally, 1.0 on hover of the legend container, `transition: opacity 200ms`
- Z-index: 10

---

## 2. CARD HAND

### 2.1 Container

- Layout: `class="flex w-full items-end justify-center gap-0 pb-3 pt-2"`
- `min-height: 96px`
- `border-top: 1px solid #3d3525`
- Background: `linear-gradient(0deg, #0d0a06 0%, #1a1610 100%)`
- Box-shadow: `inset 0 8px 24px rgba(0,0,0,0.4)`
- Inner fan wrapper: `<div class="relative flex items-end" style="height: 120px">`

### 2.2 Card Generation

Cards are generated from `actionPoints` in a repeating cycle: `["military", "economic", "covert"]`.

```typescript
const count = gameEnded ? 0 : Math.max(0, actionPoints);
const cycle: CardType[] = ["military", "economic", "covert"];
const cards: CardType[] = Array.from({ length: count }, (_, i) => cycle[i % 3]);
```

### 2.3 Fan Arc Layout

For each card at index `i` in a hand of `total` cards:

```typescript
const mid = (total - 1) / 2;
const angle = (i - mid) * 5.5;               // degrees
const yLift = Math.pow(Math.abs(i - mid), 1.4) * 5;  // pixels downward parabolic arc
```

Applied as:
```css
transform: rotate({angle}deg) translateY({yLift}px);
transform-origin: bottom center;
margin-left: {i === 0 ? 0 : -10}px;
z-index: {i};
```

### 2.4 Card Entry Animation

Each card animates in with `animate-float-up` (defined in Tailwind config as `float-up 0.3s ease-out forwards`):

```
@keyframes float-up {
  0%   { opacity: 0; transform: translateY(8px); }
  100% { opacity: 1; transform: translateY(0); }
}
```

Stagger delay: `animation-delay: {i * 0.06}s`, `animation-fill-mode: both`.

### 2.5 Empty State

When `cards.length === 0`:

- Label: font **Rajdhani, sans-serif**, 11px, `letter-spacing: 0.12em` (not Cinzel), `text-transform: uppercase`
- Color: `#4a4030`
- Text: `"Campaign Ended"` when `gameEnded === true`; `"Awaiting Orders"` otherwise
- Decorative horizontal line below: `height: 1px`, `width: 96px`, `background: linear-gradient(90deg, transparent, #3d3525, transparent)`

### 2.6 Individual Card (ActionCard)

**Dimensions:** `width: 78px`, `height: 112px`

**Background:** `linear-gradient(160deg, #221e18 0%, #13110d 100%)`

**Border:** `1.5px solid {accentColor}` (or `1.5px solid #3d3525` when disabled)

**Border radius:** 8px (rounded-lg)

**Accent colors by type:**

| CardType | Accent |
|---|---|
| military | `#cc3322` |
| economic | `#e8a020` |
| covert | `#8e44ad` |

**Card layout (flex column, top to bottom):**

1. Top corner marks row (`px-1.5 pt-1.5`, `justify-between`):
   - Left: dimension initial letter (e.g., "M", "E", "C"), Cinzel, 9px, accent color, opacity 0.8
   - Right: `✦` glyph, Cinzel, 9px, accent color, opacity 0.8
2. Center icon (`flex-1`, centered): `CardIcon` SVG component, `36×36px`, color = accent when enabled, `#3d3525` when disabled
3. Bottom label strip:
   - Background: `linear-gradient(0deg, {accent}22, transparent)`
   - `border-top: 1px solid {accent}33`
   - `py-1.5 text-center`
   - Label text: Cinzel, 8.5px, weight 700, `letter-spacing: 0.12em`, color = accent when enabled, `#3d3525` when disabled
   - Labels: `"ATTACK"` (military), `"INVEST"` (economic), `"DEPLOY"` (covert)

**Box-shadow:**
- Default: `0 4px 16px rgba(0,0,0,0.5), 0 0 6px {accent}22`
- Lifted/dragging: `0 14px 36px rgba(0,0,0,0.7), 0 0 20px {accent}55`
- Disabled: none

**Hover glow border** (non-disabled, non-dragging): `pointer-events-none` overlay div, `inset: 0`, `border-radius: 8px`, `box-shadow: 0 0 0 1px {accent}44, 0 0 12px {accent}22`, `opacity: 0` normally, `opacity: 1` on hover via `hover:opacity-100 transition-opacity duration-200`

### 2.7 Drag Behavior

Drag is handled by `dnd-kit useDraggable`:

```typescript
const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
  id,
  data: { cardType },
  disabled,
});
```

While `isDragging === true`:
- `transform: translate3d({x}px, {y}px, 0) rotate(4deg) scale(1.08)`
- `opacity: 0.92`
- `cursor: grabbing`
- `z-index: 100`
- Box-shadow: lifted value (see 2.6)

While not dragging:
- `transition: transform 0.15s ease, box-shadow 0.15s ease`
- `cursor: grab` (or `not-allowed` when disabled)

**Remove:** stack depth layers, count number in top-right corner, "slide onto top of stack" regeneration animation from previous spec version. There is one card per action point; the hand regenerates entirely from `actionPoints` each render cycle.

---

## 3. COMMAND BAR

### 3.1 Container

- Default state: not rendered (`commandBarVisible === false`)
- Summon trigger: Enter key or T key (when no input element is focused)
- Dismiss triggers: Escape key, card drag start, executing a command
- Position: `position: fixed`, `top: 12px`, `left: 50%`, `transform: translateX(-50%)`
- Width: `60vw`, `max-width: 720px`
- Height: `44px`
- Background: `#1a1610` (bg-surface) at 92% opacity
- Border: `1px solid #3d3525` (border-warm), bottom border only
- Border radius: 6px
- Z-index: 100

### 3.2 Appear/Dismiss Animation

```css
@keyframes slideDown {
  from { transform: translateX(-50%) translateY(-12px); opacity: 0; }
  to   { transform: translateX(-50%) translateY(0);    opacity: 1; }
}
@keyframes slideUp {
  from { transform: translateX(-50%) translateY(0);    opacity: 1; }
  to   { transform: translateX(-50%) translateY(-12px); opacity: 0; }
}
```

Appear: `slideDown 200ms ease-out`. Dismiss: `slideUp 200ms ease-in`.

### 3.3 Input Area

- Layout: flex row, `align-items: center`, `height: 100%`, `padding: 0 12px`
- `>` prompt glyph: JetBrains Mono, 16px, `#d4a017` (text-accent), `margin-right: 8px`
- Text input: JetBrains Mono, 14px, `#f0e6d0` (text-primary), no border, no outline, transparent background, `flex: 1`
- Placeholder: `"Type a command or question..."`, color `#9a8870` (text-secondary)
- On Enter: execute command, dismiss bar

### 3.4 Dropdown

Trigger: click on the `>` prompt glyph.

- Container: `position: absolute`, `top: 44px`, `left: 0`, same width as command bar
- Background: `#1a1610` (bg-surface) at 95% opacity
- Border: `1px solid #3d3525` (border-warm), border-radius 6px
- Padding: `4px 0`
- Z-index: 100

**Section headers:**
- Font: **Rajdhani, sans-serif**, 9px, `#9a8870` (text-secondary), uppercase
- `padding: 4px 8px 2px 8px`

**Options:**
- Font: **Rajdhani, sans-serif**, 11px, `#f0e6d0` (text-primary)
- `padding: 8px 10px`
- Hover: background `rgba(212,160,23,0.10)`
- Cursor: pointer

**Dividers between sections:**
- `border-top: 0.5px solid #3d3525`, `margin: 2px 0`

**Sections and options:**
- INTEL: "Show me Zhao's plans", "Show me Consortium's plans", "Show me Prophet's plans"
- CHAT: "Chat with Zhao", "Chat with Consortium", "Chat with Prophet"
- EVENTS: "What's happening?"
- ADVICE: "How am I doing?", "Where should I attack?"

**Bottom hint:**
- Font: **Rajdhani, sans-serif**, 10px, italic, `#9a8870`, `text-align: center`, `padding: 4px 8px`
- Text: `"or type anything..."`

### 3.5 Shake Animation (Unrecognized Input)

Trigger: Enter pressed with unrecognized command text.

Uses the `shake` keyframe from Tailwind config:

```css
@keyframes shake {
  0%, 100% { transform: translateX(-50%); }
  20%       { transform: translateX(calc(-50% - 4px)) rotate(-1deg); }
  40%       { transform: translateX(calc(-50% + 4px)) rotate(1deg); }
  60%       { transform: translateX(calc(-50% - 3px)); }
  80%       { transform: translateX(calc(-50% + 3px)); }
}
```

Duration: `0.4s ease-in-out`. Error hint text below bar: Rajdhani, 11px, `#9a8870`, centered. Disappears after 3 seconds.

### 3.6 Auto-Dismiss on Card Drag

When a card drag starts (`onDragStart` in DndContext):
- If command bar is open: dismiss it immediately (no animation, instant hide)
- If dropdown is open: close it immediately

---

## 4. CHAT WINDOW

### 4.1 Container

- Position: `position: fixed`, `bottom: 120px`, `right: 16px`
- Dimensions: `width: 280px`, `height: 320px`
- Background: `#1a1610` (bg-surface) at 92% opacity
- Border: `1px solid #3d3525` (border-warm)
- Border radius: 6px
- Z-index: 40
- Multiple windows: stack vertically with `gap: 12px`. Newest at the bottom.

### 4.2 Appear/Dismiss Animation

```css
@keyframes chatIn  { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
@keyframes chatOut { from { opacity: 1; }                          to { opacity: 0; } }
```

Appear: `chatIn 200ms ease-out`. Dismiss: `chatOut 150ms ease-in`.
Dismiss triggers: close button, Escape key, clicking outside the window.

### 4.3 Header

- Height: 40px
- Padding: 8px
- Display: flex, `align-items: center`
- AI avatar: `width: 32px`, `height: 32px`, `border-radius: 50%`, `margin-right: 8px`
  - **No portrait asset required.** Always render a colored circle filled with the AI's `PLAYER_COLORS[ai.id]` color, containing the AI's first initial as text: **Rajdhani, sans-serif**, 14px, `#f0e6d0`, centered
- AI name: **Rajdhani, sans-serif**, 14px, AI's player color, weight 600
- Close button: `margin-left: auto`, Rajdhani, 16px, `#9a8870`, cursor pointer
  - Hover: `#f0e6d0`

### 4.4 Message Area

- `flex: 1`, `overflow-y: auto`
- Padding: 8px
- Display: flex, `flex-direction: column`, `gap: 8px`

**AI messages (left-aligned):**
- Container: display flex, `align-items: flex-start`, `gap: 6px`
- Avatar: `24px × 24px` colored initial circle (same as header, smaller), `flex-shrink: 0`
- Content column:
  - Name: **Rajdhani, sans-serif**, 10px, AI's player color
  - Text: JetBrains Mono, 11px, `#f0e6d0` (text-primary), `max-width: 200px`, `word-wrap: break-word`

**Player messages (right-aligned):**
- Container: display flex, `justify-content: flex-end`
- Text: JetBrains Mono, 11px, `#f0e6d0` (text-primary), `max-width: 200px`, `word-wrap: break-word`, `text-align: right`

**Timestamps (on message hover):**
- JetBrains Mono, 9px, `#9a8870` (text-secondary)
- Appears below the message text, hidden by default, visible on hover

### 4.5 Input Area

- Height: 36px
- `border-top: 0.5px solid #3d3525` (border-warm)
- Input field: JetBrains Mono, 13px, `#f0e6d0` (text-primary), no border, no outline, transparent background, `width: 100%`, `padding: 0 8px`
- Placeholder: `"Message {AI name}..."`, color `#9a8870`
- Send on Enter key. Input clears after sending.

### 4.6 AI Response Character Limit

AI prompt for chat responses must include:

```
Keep your response to one short sentence, no more than 100 characters. Be terse and punchy. Do not exceed this limit.
```

---

## 5. QUERY VISUALIZATIONS

All visualizations render as overlays on the SVG hex grid, not on geographic D3 paths. They fade in over 300ms and fade out after 10 seconds or on the next query. D3 is not used.

### 5.1 Heat Map

- Applied as fill-opacity overlays on each territory's hex SVG
- Implementation: for each territory hex, render an additional `<polygon points="0,40 23,0 69,0 92,40 69,80 23,80">` overlay inside the SVG, with `fill={heatColor}` and `fillOpacity={0.60}`, where `heatColor` is derived from a linear interpolation between the low and high values
- Color scale: `#241f16` (bg-surface-alt, low) → `#d4a017` (gold, medium) → `#d94f4f` (player-2, high)
- Legend: small gradient bar, `80px × 12px`, absolutely positioned in bottom-right of map, with min/max labels in Rajdhani 9px `#9a8870`

### 5.2 Flow Lines

- SVG lines drawn between hex territory center positions on the overlay SVG layer (see 1.8 for overlay SVG pattern)
- Hex center coordinates are derived from each territory's position in the flex/grid layout
- Stroke: owner's player color at 60% opacity, `stroke-width: 2px`, `stroke-dasharray: "8 6"`
- Pulse: same CSS `dash-march` animation as attack lines (Section 1.8)
- Multiple lines appear with 100ms stagger via `animation-delay`

### 5.3 Proportional Symbols

- Circles centered on each territory hex's SVG center point `(46, 40)` in the overlay SVG
- Radius: linearly scaled between `8px` (min) and `32px` (max)
- Fill: owner's player color at 50% opacity
- Stroke: owner's player color, `stroke-width: 1px`
- Entry animation: `r` from 0 to target over 300ms ease-out via CSS or SVG animation

### 5.4 Bar Chart

- Absolutely positioned overlay card within the map container, placed in available open space (e.g., `top: 16px`, `right: 16px` within the map div)
- Background: `#1a1610` at 92% opacity
- Border: `1px solid #3d3525`, border-radius 6px, padding 12px
- Title: **Rajdhani, sans-serif**, 12px, `#d4a017`, `margin-bottom: 8px`
- Bars: horizontal, `height: 12px`, player colors, `border-radius: 2px`
- Labels: JetBrains Mono, 10px, `#f0e6d0`, to the right of each bar

### 5.5 Comparison Table

- Same card style as bar chart
- Column headers: **Rajdhani, sans-serif**, 10px, `#d4a017`, `border-bottom: 0.5px solid #3d3525`, `padding-bottom: 4px`
- Cell values: JetBrains Mono, 10px, `#f0e6d0`
- Row dividers: `0.5px solid #3d3525`
- Cell padding: `4px 8px`

---

## 6. INTEL PANEL

### 6.1 Container

- Layout: `class="styled-scroll flex w-[260px] flex-col gap-2 p-3 overflow-y-auto"`
- `border-right: 1px solid #3d3525`
- Background: `rgba(13,10,6,0.7)` (near bg-root)
- Rendered as a left-sidebar panel within the main flex layout, toggled by `intelOpen` state
- Toggle hotkey: `I`

### 6.2 Header

- Text: `"◉ Intelligence"`
- Font: Cinzel, serif, 11px, `letter-spacing: 0.22em`, `#d4a017` (text-accent), uppercase

### 6.3 AI Query Buttons

One button per AI player (`AI_PLAYERS` array from `constants.ts`):

- Border: `1px solid #3d3525`, hover border `#6b5a2a` (border-gold)
- Background: `rgba(255,255,255,0.02)`
- Font: **Rajdhani, sans-serif**, 10px, `#9a8870`, `letter-spacing: 0.04em`
- Border radius: 4px, padding `2px 8px`
- AI color dot: `8px × 8px` inline circle, `background: ai.color`, `box-shadow: 0 0 6px {ai.color}88`
- Loading state text: `"Querying {ai.name}…"` — normal text: `"What is {ai.name} planning?"`
- `disabled:opacity-50` during loading

The `getIntel` call uses `useProcedure(procedures.getIntel)`. Returns `IntelResult` with `.territoriesReferenced`, `.deliberation[]`, `.intelText`, `.status`, `.aiPlayerName`.

### 6.4 Intel Result Display

Container:
- Background: `#13110d` (deep bg-surface)
- Border: `1px solid #3d3525`
- Border radius: 4px, padding 8px
- `overflow-y: auto`
- `font-family: JetBrains Mono, monospace`, font-size 11px

Header row:
- AI player name: Cinzel, serif, 10px, `#d4a017`

Deliberation rows (when `intel.status === "success"` and `deliberation.length > 0`):
- Separated by `border-bottom: 1px solid #3d3525`, `padding-bottom: 4px`
- Subordinate name + role: **Rajdhani, sans-serif**, 11px — commander role in `#d4a017`, others in `#9a8870`
- Reasoning text: JetBrains Mono, 11px, `#f0e6d0`, `white-space: pre-wrap`, `line-height: snug`

Plain intel text (when no deliberation): JetBrains Mono, 11px, `#f0e6d0`, `white-space: pre-wrap`

Error/locked state: JetBrains Mono, 11px, `#9a8870`

---

## 7. VICTORY AND DEFEAT SCREEN

### 7.1 Container

- Position: `position: absolute`, `inset: 0`, `z-index: 50`
- Background: `radial-gradient(ellipse at center, rgba(13,10,6,0.88) 40%, rgba(0,0,0,0.97) 100%)`
- Display: flex, `align-items: center`, `justify-content: center`

### 7.2 Victory Animation

Entry uses the `victory-reveal` keyframe from Tailwind config:

```css
@keyframes victory-reveal {
  0%  { opacity: 0; transform: scale(0.7) translateY(20px); }
  60% { transform: scale(1.04) translateY(-4px); }
  100%{ opacity: 1; transform: scale(1) translateY(0); }
}
```

Applied as `class="animate-victory-reveal"` to the inner content column. Duration `0.6s cubic-bezier(0.34,1.56,0.64,1)`.

### 7.3 Victory Content Layout

Inner content column: `flex flex-col items-center gap-5`:

1. **Crown SVG** (`90×80px`):
   - Crown base rect: `x=15 y=58 w=60 h=10 rx=2`, `fill={winnerColor}`, `opacity=0.85`
   - Crown body polygon: `points="15,58 15,30 28,44 45,18 62,44 75,30 75,58"`, `fill={winnerColor}`, `opacity=0.75`
   - Jewels: three circles (center top r=5, left r=3.5, right r=3.5), `fill="#f0e6d0"`, high opacity
   - Glow stroke: same polygon, `fill="none"`, `stroke={winnerColor}`, `strokeWidth=1.5`, `opacity=0.5`

2. **Decorative rule:** flex row — `64px` gradient line, `✦` in winner color (14px), `64px` gradient line

3. **Winner name block:**
   - Supra-label: Cinzel, serif, 11px, `#9a8870`, `letter-spacing: 0.35em`, uppercase, `"Dominion Achieved"`
   - Winner name: Cinzel, serif, 32px, weight 700, `color={winnerColor}`, `text-shadow: 0 0 24px {winnerColor}88, 0 0 48px {winnerColor}44`, `line-height: 1.1`
   - Sub-label: Cinzel, serif, 13px, `#d4a017`, `letter-spacing: 0.2em`, `"CONQUERS ALL"`

4. **Decorative rule** (same as above)

5. **Win/lose line:**
   - Font: Orbitron, sans-serif, 15px, `letter-spacing: 0.10em`
   - Victory: `color: #2ecc71 (success)`, `text-shadow: 0 0 12px #2ecc7188`, text `"✦  VICTORY IS YOURS  ✦"`
   - Defeat: `color: #9a8870 (text-secondary)`, text `"Your campaign ends here."`

### 7.4 Post-Game State

- Command bar remains summonable
- Card hand remains visible but all cards have `disabled={true}` (not draggable)
- Map remains interactive for viewing

---

## 8. EVENT TICKER

### 8.1 Container

- Height: 30px
- `border-top: 1px solid #3d3525`
- Background: `linear-gradient(0deg, #0d0a06, #100e09)` (bg-root → bg-ticker)

### 8.2 "DISPATCHES" Label

- Flex shrink-0, `height: 100%`, `padding: 0 12px`
- `border-right: 1px solid #3d3525`
- Background: `rgba(212,160,23,0.06)`
- Text: Cinzel, serif, 8px, `#d4a017`, `letter-spacing: 0.2em`

### 8.3 Scrolling Strip

- `overflow: hidden`, `flex: 1`
- Inner div: `class="flex w-max animate-marquee items-center gap-0 whitespace-nowrap py-1 pl-4"`
- Content is doubled (two copies: `row("a")` and `row("b")`) for seamless loop
- `group-hover:[animation-play-state:paused]`
- Marquee keyframe: `translateX(0)` → `translateX(-50%)`, duration `40s linear infinite`

### 8.4 Individual Event Item

- Icon glyph: `color={PLAYER_COLORS[event.playerId]}`, 9px
- Event text button: JetBrains Mono, 10px, `color={EVENT_TYPE_COLORS[event.eventType]}`, `opacity: 0.85`, `hover:opacity-100`
- Separator: `✦` glyph, `color: #3d3525`, 10px
- Click triggers `onEventClick(event.territoryId)` which highlights that territory for 3 seconds

**Event type colors** (from `EVENT_TYPE_COLORS` in `constants.ts`):

| Type | Color |
|---|---|
| military | `#FF6666` |
| economic | `#FFCC44` |
| cultural | `#44DDAA` |
| covert | `#AA44FF` |
| victory | `#FFD700` |
| system | `#8899AA` |

### 8.5 Empty State

- Full 30px height, `align-items: center`, `justify-content: center`
- Text: Cinzel, serif, 9px, `#4a4030`, `letter-spacing: 0.2em`, `"AWAITING DISPATCHES"`

---

## 9. STRATEGIST ALERTS

### 9.1 Container

- Rendered as a column of notification cards below the QueryBar, above the main flex row
- Each card: `flex items-start gap-2 px-3 py-2 rounded`
- Background: `#1a1610` (bg-surface)
- `border-left: 3px solid #d4a017`
- `border: 1px solid #3d3525`
- `max-width: 480px`

### 9.2 Content

- Alert text: **Rajdhani, sans-serif**, 12px, `#f0e6d0` (text-primary)
- Dismiss button: `×` glyph, `margin-left: auto`, Rajdhani 14px, `#9a8870`, hover `#f0e6d0`
- Territory link (if applicable): clicking highlights territory for 3 seconds via `onAlertClick(territoryId)`
- Appear: `animate-float-up` (0.3s ease-out)
- Dismiss: calls `dismissAlert({ notificationId: id })` reducer

---

## 10. TITLE SCREEN

### 10.1 Container

- Position: `position: fixed`, `inset: 0`, `z-index: 9999`
- Background: `rgba(13,11,8,0.72)` (bg-root at 72% opacity)
- Display: flex, `align-items: center`, `justify-content: center`
- The live map is rendered and updating behind this overlay at all times

### 10.2 Content

- Inner content: `flex flex-col items-center gap-4`
- Game title: Cinzel, serif, 36px, weight 700, `#d4a017` (text-accent)
  - `text-shadow: 0 0 20px rgba(212,160,23,0.45), 0 0 40px rgba(212,160,23,0.20)`
  - Text: `"RISK: DOMINION"`
- Subtitle: **Rajdhani, sans-serif**, 14px, `#9a8870`, `letter-spacing: 0.30em`, uppercase
  - Text: `"ESTABLISHING COMMAND LINK…"`
- Animated gold glyph: `⚔` at 32px, `color: #d4a017`, CSS `animation: glow-pulse 2s ease-in-out infinite`

### 10.3 Animation Sequence

- Phase 1 — Fade in: overlay + content fade from `opacity: 0` to `opacity: 1`, `300ms ease-out`
- Phase 2 — Hold: maintain for `2000ms`
- Phase 3 — Fade out: overlay + content fade from `opacity: 1` to `opacity: 0`, `500ms ease-in`
- After phase 3: component unmounts permanently (sets `titleScreenDone = true`)

---

## 11. SOUND ENGINE

### 11.1 Initialization

- Module: `soundEngine.ts`
- Single `AudioContext` instance, created lazily on first user interaction (click or keypress)
- All functions check `if (!ctx) initAudioContext()` before scheduling nodes

### 11.2 Sound Definitions

**`playCardSound()`**
- OscillatorNode: type `'sine'`, frequency `800Hz`
- GainNode: start `−18dB`, exponential ramp to `−60dB` over `50ms`
- Duration: `50ms`

**`playTerritoryFlipSound()`**
- OscillatorNode: type `'sine'`, frequency `120Hz`
- Frequency ramp: `120Hz` → `80Hz` over `150ms`
- GainNode: constant `−15dB`
- Duration: `150ms`

**`playCulturalPressureSound(level: 1 | 2)`**
- OscillatorNode: type `'sine'`
- Level 1 (≥30% influence): frequency `200Hz`, ramp to `300Hz` over `200ms`, gain `−28dB`
- Level 2 (≥40% influence): frequency `300Hz`, ramp to `400Hz` over `200ms`, gain `−26dB`
- Duration: `200ms`

**`playVictorySound()`**
Three sequential OscillatorNodes:
- Tone 1: C5 (`523.25Hz`), `150ms`, `−12dB`
- Gap: `100ms`
- Tone 2: E5 (`659.25Hz`), `150ms`, `−12dB`
- Gap: `100ms`
- Tone 3: G5 (`783.99Hz`), `150ms`, `−12dB`
- Total: `650ms`

**`playDefeatSound()`**
Two sequential OscillatorNodes:
- Tone 1: G4 (`392Hz`), `300ms`, `−15dB`
- Gap: `200ms`
- Tone 2: C4 (`261.63Hz`), `300ms`, `−15dB`
- Total: `800ms`

### 11.3 Trigger Conditions

| Sound | Trigger |
|---|---|
| `playCardSound()` | After successful `militaryAttack`, `economicInvest`, or `deployAgent` reducer response |
| `playTerritoryFlipSound()` | After any dimension owner changes in a territory |
| `playCulturalPressureSound(1)` | When any territory's `influencePct` crosses above 30% |
| `playCulturalPressureSound(2)` | When any territory's `influencePct` crosses above 40% |
| `playVictorySound()` | Game ends with `winnerPlayer.playerId === HUMAN_PLAYER_ID` |
| `playDefeatSound()` | Game ends with `winnerPlayer.playerId !== HUMAN_PLAYER_ID` |

---

## 12. SPACETIMEDB 2.4.1 BINDINGS

### 12.1 Reactive Table Subscriptions

All live data subscriptions use `useTable` from the SpacetimeDB React SDK:

```typescript
const military  = useTable(tables.military);
const economic  = useTable(tables.economic);
const covert    = useTable(tables.covert);
const cultural  = useTable(tables.cultural);
const players   = useTable(tables.player);
const gameState = useTable(tables.gameState);
const eventFeed = useTable(tables.eventFeed);
const strategistLog = useTable(tables.strategistLog);
const chatLog   = useTable(tables.chatLog);
const aiState   = useTable(tables.aiState);
const aiTrust   = useTable(tables.aiTrust);
```

These are reactive: the component re-renders when rows change.

### 12.2 Procedures (Return Values)

Procedures are called with `useProcedure` and can return data to the caller:

```typescript
const getIntel = useProcedure(procedures.getIntel);
// Usage:
const result: IntelResult = await getIntel({ aiPlayerId });
```

### 12.3 Reducers (Mutations)

Mutations use `useReducer`:

```typescript
const militaryAttack = useReducer(reducers.militaryAttack);
const economicInvest = useReducer(reducers.economicInvest);
const deployAgent    = useReducer(reducers.deployAgent);
const dismissAlert   = useReducer(reducers.dismissStrategistAlert);
const sendChat       = useReducer(reducers.sendChatMessage);
const startGame      = useReducer(reducers.startGame);
```

### 12.4 Connection

```typescript
DbConnection.builder()
  .withUri(SPACETIMEDB_URI)
  .withModuleName(MODULE_NAME)
  .onConnect(handleConnect)
  .onDisconnect(handleDisconnect)
  .build();
```

---

## 13. APP.TSX LAYOUT

### 13.1 Overall Structure

Full-page `<div class="relative flex h-full flex-col">` containing:

1. `<QueryBar>` — top, full width
2. Title bar row — `px-4 py-2`, `border-bottom: 1px solid #3d3525`, `background: linear-gradient(90deg, #13110d, #1a1610, #13110d)`
   - Left: game name (Cinzel, 13px, weight 700, `#d4a017`, `letter-spacing: 0.12em`) with `⚔` glyph
   - Right: `<ActionBar>`
3. `<ResultsPanel>` — conditionally rendered below title bar when `queryResult !== null`
4. `<StrategistAlerts>` — below ResultsPanel
5. Main flex row (`flex flex-1 overflow-hidden`): `<IntelPanel>` | `<Map>` | `<ChatPanel>` | `<SpectatorOverlay>`
6. Bottom strip: `<CardHand>` (player mode) or nothing
7. Footer strip: `<EventTicker>` (live) or `<ReplayControls>` (replay mode)
8. `<VictoryScreen>` — `z-index: 50`, absolutely positioned

### 13.2 Title Bar — ActionBar Integration

`<ActionBar>` renders a pip row for Command Points:

- Label: Orbitron, sans-serif, 8px, `#9a8870`, `letter-spacing: 0.20em`, uppercase, `"Command Points"`
- Pips: `MAX_ACTION_POINTS` (10) circles, each `10×10px`, `border-radius: 50%`
  - Filled: `background: {playerColor}`, `border: 1.5px solid {playerColor}`, `box-shadow: 0 0 6px {playerColor}88`
  - Empty: `background: transparent`, `border: 1.5px solid #3d3525`, `transform: scale(0.85)`
  - Filled → empty transition: `transition: all 0.3s`
- Count readout: JetBrains Mono, 11px, `#9a8870`, `ml-1.5`, tabular-nums: `"{actionPoints}/{MAX_ACTION_POINTS}"`

### 13.3 State

```typescript
const [highlighted, setHighlighted]         = useState<Set<number>>(new Set());
const [queryResult, setQueryResult]          = useState<QueryResult | null>(null);
const [queryHighlights, setQueryHighlights]  = useState<number[]>([]);
const [tickerHighlight, setTickerHighlight]  = useState<number | null>(null);
const [ownedHighlight, setOwnedHighlight]    = useState(false);
const [intelOpen, setIntelOpen]              = useState(true);
const [commandBarVisible, setCommandBarVisible] = useState(false);
const [titleScreenDone, setTitleScreenDone]  = useState(false);
```

### 13.4 Hotkeys

```typescript
// H  — toggle own-territory highlight
// I  — toggle intel panel
// Q  — focus query input
// T or Enter — open command bar (when no input focused)
// Escape — clear all highlights, close command bar, blur inputs
```

### 13.5 Drag Flow

```
DragStart:
  if cardType === "military" → highlight valid military target territories
  else                       → highlight all 12 territories
  if commandBarVisible       → setCommandBarVisible(false) immediately

DragEnd:
  clear highlighted
  if valid drop on territory → call appropriate reducer
```

Map highlights are the union of: `highlighted` (drag targets) + `queryHighlights` (query results) + `ownedHighlight` set (owned territories) + `tickerHighlight` (last clicked event territory).

---

## 14. OVERLAY POSITIONING RULES

### 14.1 Fixed Positions

| Component | Position |
|---|---|
| Command bar | Fixed, top center |
| Chat windows | Fixed, bottom-right, stacked with 12px gap |
| Intel panel | Left sidebar in main flex row |
| Strategist alerts | Column below QueryBar/title bar |
| Color legend | Absolute within map, bottom-left |
| Card hand | Bottom of page, full width |
| Event ticker / Replay controls | Footer strip, full width |
| Victory screen | Absolute over full layout, z-50 |
| Title screen | Fixed, full viewport, z-9999 |
| Query visualizations | Absolute overlay within map container |

### 14.2 Z-Index Stack

From bottom to top:

| Layer | Z-index |
|---|---|
| Map canvas and territory hexes | 0 |
| Color legend | 10 |
| Card hand | 20 |
| Query visualization overlays | 30 |
| Chat windows, Intel panel | 40 |
| Event notifications, Strategist alerts | 50 |
| Victory / Defeat screen | 50 (absolute within layout) |
| Command bar and dropdown | 100 |
| Title screen | 9999 |

---

## 15. DEPENDENCY NOTES

D3.js is **not a dependency** and must not be added. All map rendering uses SVG markup and CSS. All animations use CSS keyframes or Tailwind animation utilities. dnd-kit (`@dnd-kit/core`) handles all drag-and-drop.

SpacetimeDB client version: **2.4.1**. Use `useTable`, `useProcedure`, `useReducer`, and `DbConnection.builder()` as described in Section 12. Do not use older API patterns (e.g., `useSpacetimeDB`, `subscribe()` with string queries, or non-builder connection patterns).

---

## End of UI/UX Overhaul Interface Contract v1.1

This document specifies every visual element, interaction pattern, animation, and layout rule for the complete frontend overhaul. All color values are from the warm parchment palette in Section 0.1. All typography uses Rajdhani in place of Inter. The hex grid map replaces all D3/GeoJSON patterns. dnd-kit handles drag-and-drop. SpacetimeDB 2.4.1 hooks are specified in Section 12. Every value is exact. Every behavior is specified. Ready for generation.
