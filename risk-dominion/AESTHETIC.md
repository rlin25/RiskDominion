# AESTHETIC.md — Risk: Dominion Visual Design System

## Version 2.0
## Scope: Complete Visual Overhaul — All Slices
## Replaces: AESTHETIC.md v1.0 in its entirety

---

## 0. PURPOSE

This document specifies the exact visual design of Risk: Dominion. Every color, font, dimension, animation, and rendering rule is defined here. Claude Code must implement these specifications exactly.

The companion document UIUX.md specifies interaction patterns and component behavior.

---

## 1. COLOR PALETTE

### 1.1 Background Colors

| Token | Hex | Usage |
|-------|-----|-------|
| `bg-ocean` | `#1a1d1c` | Map background (ocean/void) |
| `bg-landmass` | `#2d302e` | Default territory fill before patterns |
| `bg-surface` | `#1e2120` | Overlays, chat windows, cards |
| `bg-overlay` | `#1e2120` at 92% opacity | Command bar, temporary surfaces |

### 1.2 Player Colors

| Token | Hex | Player |
|-------|-----|--------|
| `player-1` | `#5b8cbe` | Human player |
| `player-2` | `#c4554d` | Zhao |
| `player-3` | `#c4944d` | Consortium |
| `player-4` | `#8b6bae` | Prophet |

### 1.3 Functional Colors

| Token | Hex | Usage |
|-------|-----|-------|
| `gold` | `#d4a843` | `>` prompt, highlights, victory text, dropdown hover |
| `success` | `#5a9e6f` | Victory elements |
| `text-primary` | `#c5c9c6` | All primary text |
| `text-secondary` | `#7d827e` | Supporting text, timestamps, placeholder |
| `border-subtle` | `#3a3f3c` | Panel borders, dividers |
| `neutral-empty` | `#2a2d2c` | Unowned territory areas |

---

## 2. TYPOGRAPHY

### 2.1 Font Families

| Role | Font | Source | Weights |
|------|------|--------|---------|
| Data | JetBrains Mono | Google Fonts | 400, 500 |
| UI | Inter | Google Fonts | 400, 600 |

Font loading:
```html
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
```

### 2.2 Type Scale

| Size | Data (JetBrains Mono) | UI (Inter) |
|------|----------------------|------------|
| 9px | — | Territory names (low opacity), legend |
| 10px | Query results table | Color legend names |
| 11px | Chat messages, tooltip body | Dropdown options |
| 13px | Command bar input | Chat header AI name |
| 14px | — | Overlay headers |
| 16px | — | Command bar prompt |
| 28px | — | Victory/Defeat title |

### 2.3 Tailwind Configuration

```javascript
module.exports = {
  theme: {
    extend: {
      colors: {
        'bg-ocean': '#1a1d1c',
        'bg-landmass': '#2d302e',
        'bg-surface': '#1e2120',
        'player-1': '#5b8cbe',
        'player-2': '#c4554d',
        'player-3': '#c4944d',
        'player-4': '#8b6bae',
        'gold': '#d4a843',
        'success': '#5a9e6f',
        'text-primary': '#c5c9c6',
        'text-secondary': '#7d827e',
        'border-subtle': '#3a3f3c',
        'neutral-empty': '#2a2d2c',
      },
      fontFamily: {
        data: ['JetBrains Mono', 'monospace'],
        ui: ['Inter', 'sans-serif'],
      },
      opacity: {
        '92': '0.92',
      },
    },
  },
};
```

---

## 3. MAP AND TERRITORIES

### 3.1 Map Layout

- Full world map rendered via D3.js geographic projection
- Continents: Americas, Europe, Africa, Asia, Oceania
- 12 territories total, defined as GeoJSON polygon features
- Projection: Mercator or Equal Earth
- Map extends beyond viewport. Pan by dragging. Zoom by scroll wheel (scale extent: 1x to 4x)
- Edge fades: subtle dark gradient at viewport edges indicating more map is available

### 3.2 Territory Rendering

- Each territory is a GeoJSON feature rendered as an SVG path via D3
- Fill: `bg-landmass` (#2d302e) as base color
- Stroke: `border-subtle` (#3a3f3c), 1px
- Patterns overlay on the base fill to indicate dimensional ownership (see Section 3.3)
- Territory name: Inter, 9px, `text-secondary` (#7d827e) at 40% opacity. Positioned at territory centroid. On hover: opacity transitions to 100% over 200ms
- Hover: territory stroke brightens to `text-primary` (#c5c9c6), 2px. Data callout appears (see Section 3.5)

### 3.3 Ownership Patterns

Territory ownership is communicated through procedural texture patterns generated via D3. Each dimension owner contributes a pattern.

**Pattern Definitions:**

- **Military:** Contour-parallel lines. Generated from the territory's perimeter inward. 1px stroke, owner's color at 40% opacity. Line spacing: 6px.
- **Economic:** Dot stipple. Points placed on a jittered grid within the territory bounds. Point diameter: 1.5px. Spacing: 8px. Owner's color at 40% opacity.
- **Cultural:** Crosshatch. Lines at 45 and -45 degrees from territory centroid. 1px stroke, owner's color at 40% opacity. Spacing: 10px.
- **Covert:** Small circles. Poisson disk sampling within territory bounds. Circle diameter: 2px. Minimum distance between circles: 8px. Owner's color at 40% opacity.

**Pattern Combination:**
- Multiple patterns overlay additively within the territory
- A territory owned by one player across all dimensions: solid player color, no patterns
- A territory with two owners: two patterns combine
- A territory with three or four owners: all patterns combine
- Unified territory (one player owns all four dimensions): solid player color with subtle 1px gold border

**Small Territory Rule:**
- If a territory's area is less than 2000 square pixels at default zoom, reduce pattern density by 50% (double all spacing values)
- If area is less than 1000 square pixels, replace patterns with a single small colored dot (4px diameter) in the territory's label area per dimension owner

### 3.4 Attack Arrows

When a Military card is picked up from the stack:
- Thin dashed lines (2px stroke, player-1 color, 60% opacity) appear from each of the player's adjacent territories to every valid attack target
- A small particle (4px circle, player-1 color, 80% opacity) travels along each line from source to target
- Particle duration: 800ms per traversal, looping
- Arrows and particles disappear when the card is dropped or the action completes

### 3.5 Territory Data Callout

On territory hover:
- A small floating card appears near the territory, offset 12px from the cursor or territory edge
- Background: `bg-surface` (#1e2120) at 92% opacity
- Border: 1px `border-subtle` (#3a3f3c)
- Border radius: 4px
- Padding: 8px 10px
- Content: territory name (Inter, 12px, text-primary), then four rows showing dimension owner and value
- Each row: dimension icon (10px) + owner name (Inter, 10px, owner color) + value (JetBrains Mono, 10px, text-primary)
- A thin leader line (1px, border-subtle) connects the callout to the territory centroid
- Appears on hover after 150ms delay. Disappears immediately on mouse leave.

### 3.6 Color Legend

- Position: bottom-left corner of the map viewport, 16px from edges
- Four rows, each with:
  - 10px × 10px colored square (border-radius: 2px)
  - Player name in Inter, 10px, text-secondary
- Row colors: `player-1`, `player-2`, `player-3`, `player-4`
- Names: "You", "Zhao", "Consortium", "Prophet"
- Background: none (transparent)
- Opacity: 60% normally, 100% on hover of the legend area
- Always visible

---

## 4. CARD STACKS

### 4.1 Dimensions and Positioning

- Three stacks, centered horizontally at the bottom of the screen
- Distance from bottom edge: 24px
- Gap between stacks: 16px
- Each card: 60px wide, 84px tall
- Border radius: 6px
- Background: `bg-surface` (#1e2120)
- Border: 1px `border-subtle` (#3a3f3c)
- Left border accent: 3px solid, colored by dimension
  - Military: `#c4554d` (Zhao's red, repurposed as the military dimension color)
  - Economic: `#c4944d` (amber)
  - Covert: `#8b6bae` (violet)

### 4.2 Card Content

- Dimension icon: centered, 24px, rendered in the dimension's accent color
  - Military: upward chevron (SVG polygon, stroke-only, 2px)
  - Economic: circle with vertical line (SVG, stroke-only, 2px)
  - Covert: concentric circles (SVG, outer stroke 2px, inner filled)
- Count number: JetBrains Mono, 18px, `text-primary` (#c5c9c6), positioned top-right corner, 8px from edges

### 4.3 Stack Visual

- Cards beneath the top card are offset 3px down and 3px right per level
- Maximum 5 offset layers visible. A stack of 10 shows the top card + 5 offset beneath
- Cards beneath are slightly darker (opacity decreases by 8% per level)
- The stack has a subtle drop shadow: `0 2px 8px rgba(0,0,0,0.3)`

### 4.4 Empty State

- When action points for a dimension are 0, the top card appears dimmed: opacity 0.4
- A subtle pulse animation runs on the stack: opacity oscillates between 0.4 and 0.55 over 4 seconds (matching regeneration interval)
- The count shows "0" in `text-secondary` (#7d827e)
- Cards are not draggable in this state

### 4.5 Drag State

- On pickup (mousedown/touchstart on the top card): card lifts 4px up, scales to 1.05, shadow intensifies
- During drag: card follows cursor, slight rotation (2 degrees), opacity 0.9
- On valid drop: card animates back to stack, shrinking, as the count decrements
- On invalid drop (released over non-target): card snaps back to stack over 200ms ease-out

### 4.6 Regeneration Animation

- When an action point regenerates: a new card slides onto the top of the stack from above, 200ms ease-out
- The count number updates with a brief flash of `gold` (#d4a843) for 300ms

---

## 5. COMMAND BAR

### 5.1 Dimensions and Positioning

- Hidden by default. Summoned by pressing Enter or T.
- Position: top center of screen, 12px from top edge
- Width: 60% of viewport width, max-width 720px
- Height: 44px
- Background: `bg-surface` (#1e2120) at 92% opacity
- Border: 1px `border-subtle` (#3a3f3c), bottom border only
- Border radius: 6px
- Appear animation: slide down from top edge + fade in, 200ms ease-out
- Dismiss animation: slide up + fade out, 200ms ease-in. Also dismisses on Escape.

### 5.2 Input Area

- `>` prompt: JetBrains Mono, 16px, `gold` (#d4a843), positioned 12px from left edge, vertically centered
- Text input: JetBrains Mono, 14px, `text-primary` (#c5c9c6), no border, no outline, transparent background
- Placeholder: "Type a command or question..." in `text-secondary` (#7d827e)
- Input spans from the prompt to the right edge, with 12px right padding
- On Enter: execute command, dismiss bar, show result
- Auto-dismiss: if the player starts dragging a card while the bar is open, the bar dismisses immediately. Action takes priority.

### 5.3 Dropdown

- Appears on click of the `>` prompt
- Position: directly below the command bar, same width
- Background: `bg-surface` (#1e2120) at 95% opacity
- Border: 1px `border-subtle` (#3a3f3c), all sides
- Border radius: 6px
- Sections with headers and dividers:

```
INTEL
  Show me Zhao's plans
  Show me Consortium's plans
  Show me Prophet's plans
────────────────────
CHAT
  Chat with Zhao
  Chat with Consortium
  Chat with Prophet
────────────────────
EVENTS
  What's happening?
────────────────────
ADVICE
  How am I doing?
  Where should I attack?
────────────────────
  or type anything...
```

- Section headers: Inter, 9px, `text-secondary` (#7d827e), uppercase, 8px padding-left, 4px padding-top
- Options: Inter, 11px, `text-primary`, 10px padding-left, 8px padding-vertical
- Hover on option: background `gold` at 10% opacity
- Dividers: 0.5px `border-subtle`
- Final hint "or type anything...": Inter, 10px, italic, `text-secondary`, centered

### 5.4 Shake Animation (Unrecognized Input)

- Triggered when the command bar cannot parse the input
- CSS animation: `translateX` by ±4px, 3 oscillations, 200ms total
- After shake: a brief message appears below the input for 3 seconds: "I didn't understand that. Try 'help' for options." in Inter, 11px, `text-secondary`

---

## 6. CHAT WINDOWS

### 6.1 Dimensions and Positioning

- Fixed position: bottom-right corner of screen
- Size: 280px wide, 320px tall
- Background: `bg-surface` (#1e2120) at 92% opacity
- Border: 1px `border-subtle` (#3a3f3c)
- Border radius: 6px
- Multiple chat windows stack vertically with 12px gap. Newest at the bottom.
- Appear animation: fade in + scale from 0.95 to 1.0, 200ms ease-out
- Dismiss: close button, Escape, or clicking outside. Fade out, 150ms.

### 6.2 Header

- AI portrait: 32px × 32px, circular, positioned 8px from left
- AI name: Inter, 14px, AI's player color, vertically centered next to portrait
- Close button: "×" character, Inter, 16px, `text-secondary`, positioned 8px from right. Hover: `text-primary`.

### 6.3 Message Area

- Scrollable area between header and input
- Messages:
  - AI messages: aligned left. Portrait (24px, circular), name (Inter, 10px, AI color), message text (JetBrains Mono, 11px, text-primary). All in a row.
  - Player messages: aligned right. Message text only (JetBrains Mono, 11px, text-primary, text-right).
  - Timestamp on hover: JetBrains Mono, 9px, text-secondary, appears below the message.
- Padding: 8px
- Message gap: 8px between messages
- Auto-scroll to bottom on new message

### 6.4 Input Area

- Position: bottom of window
- Full width input field, JetBrains Mono, 13px, text-primary
- Background: `bg-surface` slightly lighter
- Placeholder: "Message {AI name}..." in text-secondary
- Border top: 0.5px border-subtle
- Send on Enter. Input clears after send.

### 6.5 AI Response Character Limit

- AI responses are limited to approximately 75-100 characters
- One short sentence per response
- The AI prompt instructs: "Keep your response to one short sentence, no more than 100 characters. Be terse and punchy."
- The compact window never requires scrolling during a single exchange

---

## 7. QUERY VISUALIZATIONS

All visualizations render directly on the map using D3. They fade in over 300ms and fade out after 10 seconds or on click-away.

### 7.1 Heat Map

- Territories shaded by data intensity
- Gradient: territory base color (low) → `gold` (#d4a843) (medium) → `player-2` (#c4554d) (high)
- Opacity: 60% overlay on territory fill
- Applied to all territories simultaneously via D3 color scale

### 7.2 Flow Lines

- Animated dashed lines between territories
- 2px stroke, owner color, 60% opacity
- Dash pattern: 8px dash, 6px gap
- Particle: 4px circle, owner color, 80% opacity, travels along the line
- Particle speed: 1 second to traverse the full line
- Lines appear sequentially with 100ms stagger between each

### 7.3 Proportional Symbols

- Circles overlaid on territory centroids
- Radius proportional to data value (min 8px, max 32px)
- Fill: owner color at 50% opacity
- Stroke: 1px, owner color
- Scale animation on appear: from 0 to full radius, 300ms ease-out

### 7.4 Bar Chart

- Semi-transparent card overlay in open map space
- Card style: same as chat window background and border
- Bars: horizontal, 12px height, owner colors
- Labels: JetBrains Mono, 10px, text-primary
- Axes: subtle, border-subtle color

### 7.5 Comparison Table

- Structured data card overlay
- Card style: same as bar chart
- Columns and rows in JetBrains Mono
- Column headers: Inter, 10px, `gold`
- Cell values: JetBrains Mono, 10px, text-primary
- Row dividers: 0.5px border-subtle

---

## 8. INTEL DISPLAY

Intel appears as an overlay in the top-right quadrant of the map when summoned via command bar.

### 8.1 Dimensions

- Size: 360px wide, auto height (max 500px, scrollable)
- Position: top-right, 16px from top and right edges
- Background: `bg-surface` (#1e2120) at 92% opacity
- Border: 1px `border-subtle`
- Border radius: 6px

### 8.2 Content

- Header: AI portrait (32px) + name (Inter, 14px, AI color) + close button
- Deliberation chain: each subordinate shown as a row
  - Subordinate portrait (24px)
  - Subordinate name and role (Inter, 11px, AI color for name, text-secondary for role)
  - Reasoning text (JetBrains Mono, 11px, text-primary)
  - Recommendations shown as small colored tags
- Commander row shown last, slightly larger, with final action tags
- Separators: 0.5px border-subtle between subordinates

---

## 9. EVENT NOTIFICATIONS

### 9.1 Display

- Position: top-center, below the command bar if open, otherwise 60px from top
- Small card: max 300px wide, auto height
- Background: `bg-surface` at 85% opacity
- Border-left: 3px solid, colored by event type (military=player-2 red, economic=amber, cultural=violet, covert=violet, system=gold)
- Content: event text in JetBrains Mono, 11px, text-primary
- Appear: fade in + slide down 8px, 200ms
- Auto-dismiss: fade out after 4 seconds
- Maximum 3 visible at once. Older ones dismissed first.

---

## 10. STRATEGIST ADVICE

### 10.1 Display

- Position: top-left quadrant, 16px from top and left edges
- Card style: same as event notifications
- Border-left: 3px solid `gold` (#d4a843)
- Content: advice text in Inter, 12px, text-primary
- Appear and dismiss same as event notifications
- Summoned via command bar or appears proactively (existing Strategist cycle)

---

## 11. TITLE SCREEN

- On page load: the live map is visible, dimmed by a dark overlay (bg-ocean at 60% opacity)
- Centered text: "Risk: Dominion" in Inter, 36px, `gold` (#d4a843)
- Text fades in over 300ms, holds for 2 seconds
- Overlay and text fade out simultaneously over 500ms
- The full-brightness map is revealed
- Game is immediately playable

---

## 12. VICTORY AND DEFEAT

### 12.1 Victory

- Trigger: fifth territory unified
- Shockwave: a ring of the winner's color expands from the unified territory's centroid
  - 2px stroke, radius from 0 to covering entire map viewport
  - Duration: 1.5 seconds, ease-out
- After shockwave: all territories pulse gently in winner's color
  - Opacity oscillates between 10% and 30%, 2-second cycle
- After 1-second pause: victory overlay appears
  - Centered card, bg-surface at 95% opacity
  - "Victory" in Inter, 28px, `gold`
  - Winner's color accent border, 2px
- Command bar remains active post-game

### 12.2 Defeat

- Trigger: opponent unifies fifth territory
- The losing territory is highlighted: pulsing border, 3px, opponent's color, opacity 60-100%, 1-second cycle
- All other territories dim to 40% brightness over 500ms
- Duration: 2 seconds
- Defeat overlay appears: same card style as victory
  - "Defeat" in Inter, 28px, `gold`
  - Territory name below in Inter, 16px, text-secondary
- Command bar remains active post-game

---

## 13. SOUND DESIGN

All sounds generated via Web Audio API. No audio files. One AudioContext created on page load.

### 13.1 Sound Definitions

- **Card play:** Sine wave, 800Hz, 50ms duration, quick fade out (gain exponential ramp to 0 over last 20ms). Volume: -18dB.
- **Territory flip:** Sine wave, 120Hz, 150ms duration, frequency ramp to 80Hz over duration. Volume: -15dB.
- **Cultural pressure (30% threshold):** Sine wave, 200Hz to 300Hz over 200ms. Volume: -28dB.
- **Cultural pressure (40% threshold):** Sine wave, 300Hz to 400Hz over 200ms. Volume: -26dB.
- **Victory:** Three sequential sine wave tones: C5 (523Hz, 150ms), E5 (659Hz, 150ms), G5 (784Hz, 150ms). 100ms gaps between. Volume: -12dB.
- **Defeat:** Two sequential sine wave tones: G4 (392Hz, 300ms), C4 (262Hz, 300ms). 200ms gap. Volume: -15dB.

### 13.2 Trigger Conditions

- Card play: on successful reducer call for military_attack, economic_invest, or deploy_agent
- Territory flip: on any dimension_owner_change
- Cultural pressure: when influence_pct crosses 30% and 40% thresholds
- Victory/Defeat: on game end

---

## 14. ANIMATION PRINCIPLES

- All durations: 150-500ms unless specified otherwise
- All easing: ease-out for appears, ease-in for dismisses
- No bouncing, no spring physics, no staggered children unless specified
- Territory color transitions: 300ms ease-out on fill changes
- Map pan/zoom: immediate (no animation) for responsiveness
- If frame rate drops below 30fps, disable all non-essential animations (particles, pulses, shockwave). Keep essential transitions (color changes, appears/dismisses).

---

## End of AESTHETIC.md v2.0

This document completely replaces the previous AESTHETIC.md. All visual specifications herein are authoritative. UI interaction patterns and component behavior are specified in UIUX.md.