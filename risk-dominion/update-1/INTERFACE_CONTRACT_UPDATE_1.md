# INTERFACE CONTRACT — VISUAL OVERHAUL

## Version 1.1
## Scope: Visual and Font Overhaul — All Slices
## Reflects: Current codebase (SpacetimeDB 2.4.1, React + TypeScript + Vite + Tailwind CSS + dnd-kit)

---

## 0. DOCUMENT PURPOSE

This document specifies exact values for every component affected by the visual overhaul. It is the authoritative implementation specification. Use alongside AESTHETIC.md v2.1 during implementation.

This version reflects the actual codebase — hex grid map, fanned portrait cards, warm parchment palette.

---

## 1. TYPOGRAPHY IMPLEMENTATION

### 1.1 Google Fonts Link (index.html)

Replace the existing Cinzel import with Rajdhani:

```html
<!-- REMOVE this: -->
<link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&display=swap" rel="stylesheet">

<!-- ADD this: -->
<link href="https://fonts.googleapis.com/css2?family=Rajdhani:wght@500;600;700&display=swap" rel="stylesheet">

<!-- KEEP these: -->
<link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700&display=swap" rel="stylesheet">
<link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet">
```

Or combine into a single link:
```html
<link href="https://fonts.googleapis.com/css2?family=Rajdhani:wght@500;600;700&family=Orbitron:wght@400;700&family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet">
```

### 1.2 Tailwind Config (tailwind.config.js)

```js
fontFamily: {
  display: ["Rajdhani", "sans-serif"],   // was: ["Cinzel", "serif"]
  ui:      ["Orbitron", "sans-serif"],   // unchanged
  data:    ["JetBrains Mono", "monospace"], // unchanged
},
```

### 1.3 Inline Style Replacement Rule

Every component that contains `fontFamily: "Cinzel, serif"` must be changed to:
```
fontFamily: "Rajdhani, sans-serif"
```

Affected files: ActionCard.tsx, Territory.tsx, CardHand.tsx, VictoryScreen.tsx, IntelPanel.tsx

---

## 2. MAP COMPONENT (Map.tsx)

### 2.1 Remove Emoji from Continent Banners

Current code contains:
```typescript
const CONTINENT_ICONS: Record<string, string> = {
  "Americas":      "⚔",
  "Europe-Africa": "🏛",
  "Asia-Oceania":  "🌏",
};
```

And uses it in JSX:
```tsx
<span className="text-[13px]">{CONTINENT_ICONS[continent.name] ?? "◆"}</span>
```

**Remove both.** Delete the `CONTINENT_ICONS` constant and the `<span>` element that renders it. The continent banner JSX after the change should contain only the name span.

### 2.2 Updated Continent Banner JSX

```tsx
<div className="flex items-center gap-1.5 px-3 py-1 rounded"
  style={{
    background: "linear-gradient(90deg, transparent, rgba(212,160,23,0.12), transparent)",
    borderTop: "1px solid rgba(212,160,23,0.2)",
    borderBottom: "1px solid rgba(212,160,23,0.2)",
  }}
>
  <span
    className="text-[10px] tracking-widest uppercase"
    style={{ fontFamily: "Rajdhani, sans-serif", fontWeight: 600, color: "#9a8870", letterSpacing: "0.18em" }}
  >
    {continent.name}
  </span>
</div>
```

---

## 3. TERRITORY COMPONENT (Territory.tsx)

### 3.1 Territory Name Label

Current:
```tsx
style={{
  fontFamily: "Cinzel, serif",
  fontSize: "8.5px",
  fontWeight: isOwned || dominant ? 600 : 400,
  ...
}}
```

Updated:
```tsx
style={{
  fontFamily: "Rajdhani, sans-serif",
  fontSize: "8.5px",
  fontWeight: isOwned || dominant ? 600 : 500,
  ...
}}
```

Note: Rajdhani's minimum practical weight is 500. Use 500 instead of 400 for the default state.

### 3.2 Hex SVG and Quadrant Logic

No changes to:
- Hex polygon points and clip paths
- Quadrant color fills (`militaryColor`, `economicColor`, `covertColor`, `culturalColor`)
- Center medallion (JetBrains Mono troop count)
- Border color and width logic
- Glow drop-shadow
- `isHighlighted`, `isOver`, `dominantOwner()` logic
- dnd-kit `useDroppable` setup

---

## 4. ACTION CARD COMPONENT (ActionCard.tsx)

### 4.1 Top Corner Labels

Current:
```tsx
<span style={{ fontFamily: "Cinzel, serif", fontSize: 9, color: accent, opacity: 0.8 }}>
  {sub[0]}
</span>
<span style={{ fontFamily: "Cinzel, serif", fontSize: 9, color: accent, opacity: 0.8 }}>
  ✦
</span>
```

Updated: replace `"Cinzel, serif"` with `"Rajdhani, sans-serif"` and `fontWeight: 500`.

### 4.2 Bottom Action Label

Current:
```tsx
<span
  style={{
    fontFamily: "Cinzel, serif",
    fontSize: 8.5,
    fontWeight: 700,
    letterSpacing: "0.12em",
    color: disabled ? "#3d3525" : accent,
  }}
>
```

Updated: replace `"Cinzel, serif"` with `"Rajdhani, sans-serif"`. Weight 700 stays.

### 4.3 Card Dimensions and Icons

No changes:
- Width 78px, height 112px, border-radius `rounded-lg`
- Background gradient `linear-gradient(160deg, #221e18 0%, #13110d 100%)`
- Accent border colors per dimension
- All three SVG icons (sword, coin stack, spy eye) unchanged
- dnd-kit `useDraggable` setup unchanged
- Drag transform, scale, rotate, shadow unchanged
- `.card-shimmer` class unchanged

---

## 5. CARD HAND COMPONENT (CardHand.tsx)

### 5.1 Empty State Text

Current: `fontFamily: "Cinzel, serif"`

Updated: `fontFamily: "Rajdhani, sans-serif"`, `fontWeight: 500`

### 5.2 Fan Layout

No changes:
- `angle = (i - mid) * 5.5` rotation calculation
- `yLift = Math.abs(i - mid) * 3` parabolic offset
- `-10px` margin-right overlap
- `transformOrigin: center bottom 120px` arc pivot
- `animate-float-up` entry animation with stagger

---

## 6. VICTORY SCREEN COMPONENT (VictoryScreen.tsx)

### 6.1 All Font References

Replace all `fontFamily: "Cinzel, serif"` with `fontFamily: "Rajdhani, sans-serif"`.

Specific instances:
1. "Dominion Achieved" label: fontSize 11, letterSpacing "0.35em", weight 500 (was 400 in Cinzel terms; Rajdhani 500 is the minimum)
2. Winner name: fontSize 32, weight 700 — same, font family changes only
3. "CONQUERS ALL": fontSize 13, letterSpacing "0.2em", weight 600
4. "You win/lose" status: this uses Orbitron — no change

### 6.2 Crown SVG and Colors

No changes. Crown SVG, jewel circles, decorative lines, animation — unchanged.

---

## 7. INTEL PANEL COMPONENT (IntelPanel.tsx)

### 7.1 Panel Header

Current: `fontFamily: "Cinzel, serif"`

Updated:
```tsx
style={{ fontFamily: "Rajdhani, sans-serif", fontWeight: 600, fontSize: 11, letterSpacing: "0.22em", color: "#d4a017", textTransform: "uppercase" }}
```

### 7.2 AI Query Buttons

Current: `fontFamily: "Cinzel, serif", fontSize: 10`

Updated:
```tsx
style={{
  fontFamily: "Rajdhani, sans-serif",
  fontWeight: 500,
  fontSize: 10,
  color: "#9a8870",
  letterSpacing: "0.04em",
}}
```

### 7.3 Result AI Name

Current: `fontFamily: "Cinzel, serif", fontSize: 10`

Updated: `fontFamily: "Rajdhani, sans-serif"`, `fontWeight: 600`, same fontSize.

### 7.4 Deliberation Content

Uses `font-data` (JetBrains Mono) and `font-ui` (Orbitron) Tailwind tokens — no inline Cinzel. No change.

---

## 8. APP.TSX TOP BAR

If App.tsx renders the "RISK: DOMINION" title with `fontFamily: "Cinzel, serif"` inline, update to `fontFamily: "Rajdhani, sans-serif"` weight 700.

---

## 9. HEX TERRITORY GRID — REFERENCE (no changes)

This section documents the current territory rendering for reference. No implementation changes needed.

### Territory SVG (92 × 80 px)

```
Hex points: 0,40 23,0 69,0 92,40 69,80 23,80

Quadrants:
  Military  (TL): 46,40 46,0 23,0 0,40
  Cultural  (TR): 46,40 46,0 69,0 92,40
  Economic  (BR): 46,40 92,40 69,80 46,80
  Covert    (BL): 46,40 0,40 23,80 46,80

Center medallion:
  Outer circle: r=16, fill #0d0a06
  Inner circle: r=13, fill #1a1610
  Troop count: JetBrains Mono 13px weight 700, #f0e6d0, x=46 y=44
```

### Continent Layout (Map.tsx)

Three columns: Americas (t1-4), Europe-Africa (t5-8), Asia-Oceania (t9-12)
Grid: `grid-cols-2` with `gap-x-3 gap-y-4` inside each continent block.

---

## 10. SPACETIMEDB 2.4.1 — REFERENCE (no changes)

No SpacetimeDB API changes in this overhaul. For reference, current hooks:

```typescript
import { useTable, useProcedure } from "spacetimedb/react";
import { tables, procedures } from "../module_bindings";
```

Reducer calls use the reducer functions imported from `module_bindings`:
```typescript
import { reducers } from "../module_bindings";
reducers.militaryAttack({ targetTerritoryId, troops: 1 });
```

Connection established in `connection.ts` via `DbConnection.builder()`.

---

## 11. CHECKLIST

Before marking implementation complete:

- [ ] `index.html`: Rajdhani link present, Cinzel link removed
- [ ] `tailwind.config.js`: `font-display` = `["Rajdhani", "sans-serif"]`
- [ ] `Map.tsx`: `CONTINENT_ICONS` constant removed, emoji span removed from banner JSX
- [ ] `Territory.tsx`: `fontFamily: "Rajdhani, sans-serif"` in territory label style
- [ ] `ActionCard.tsx`: both corner label spans and bottom label use Rajdhani
- [ ] `CardHand.tsx`: empty state text uses Rajdhani
- [ ] `VictoryScreen.tsx`: all three text elements use Rajdhani
- [ ] `IntelPanel.tsx`: header, buttons, result name use Rajdhani
- [ ] `npm run build` passes with zero errors
- [ ] Manual check: no Cinzel renders anywhere in the app

---

## End of Interface Contract v1.1

Every value is exact. Every behavior is specified. Implementation should be mechanical: find Cinzel, replace with Rajdhani, remove emoji. No judgment calls required.
