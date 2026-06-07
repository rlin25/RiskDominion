# VISUAL OVERHAUL — MASTERPLAN

## Version 1.1
## Scope: Visual and Font Overhaul — All Slices
## Reflects: Current codebase (SpacetimeDB 2.4.1, React + TypeScript + Vite + Tailwind CSS + dnd-kit)

---

## 0. DOCUMENT PURPOSE

This masterplan defines what files need to change to complete the visual overhaul of Risk: Dominion. It tells you what to read, what to modify, in what order, and what constraints apply.

This overhaul refines the visual and interaction layer — updating fonts, removing emojis, and polishing aesthetics. Game mechanics, reducers, AI systems, and database operations remain completely unchanged. The hex grid map is preserved.

---

## 1. BEFORE YOU BEGIN

Read every existing file in the frontend codebase. Understand the current component tree, styling approach, and interaction patterns.

Read these supporting documents:
- `AESTHETIC.md` v2.1 — exact visual design system: colors, fonts, dimensions, animations
- `UIUX.md` v1.1 — interaction patterns, user flows, state management
- `INTERFACE_CONTRACT_UPDATE_1.md` — exact component specs with pixel values
- `DECISIONS_UPDATE_1.md` — design philosophy and rationale

---

## 2. CRITICAL CONSTRAINTS

These rules define the overhaul. They override any previous documentation:

1. **The hex grid map stays.** Do not introduce D3.js geographic projection. The map is SVG hexagon territories grouped into three continent columns. This is intentional and must not be changed.

2. **Replace Cinzel with Rajdhani.** Cinzel feels too formal for a strategy game. Rajdhani (wght 500/600/700) has a bold, military-technical edge that fits. Update `index.html`, `tailwind.config.js`, and every component that references Cinzel inline or via `font-display`.

3. **Preserve the fanned card hand.** The fan arc layout with rotation and parabolic vertical offset is the current card aesthetic and must be preserved. Do not change to three stacks.

4. **Preserve portrait card dimensions and icons.** Cards are 78×112px with sword/coin/eye SVG icons. These stay exactly as implemented.

5. **Remove emoji from continent banners.** Map.tsx currently uses `⚔ 🏛 🌏` next to continent names. Remove all emojis. Continent name text only, styled with Rajdhani.

6. **No D3.js dependency.** Do not add d3 to package.json.

7. **All existing game features must continue to function:** actions, AI cycles, cultural spread, intel, chat, queries, trust scores, win conditions, SpacetimeDB subscriptions.

---

## 3. FILE LIST

### MODIFIED (8 files)

1. `app/client/index.html` — Replace Cinzel font link with Rajdhani
2. `app/client/tailwind.config.js` — Update `font-display` token from Cinzel to Rajdhani
3. `app/client/src/components/Map.tsx` — Remove emoji icons from continent banners
4. `app/client/src/components/Territory.tsx` — Update inline Cinzel references to Rajdhani
5. `app/client/src/components/ActionCard.tsx` — Update inline Cinzel references to Rajdhani
6. `app/client/src/components/CardHand.tsx` — Update inline Cinzel references to Rajdhani
7. `app/client/src/components/VictoryScreen.tsx` — Update inline Cinzel references to Rajdhani
8. `app/client/src/components/IntelPanel.tsx` — Update inline Cinzel references to Rajdhani

### NEW (0 files)

No new files required.

### DELETED (0 files)

No files to delete. All existing components remain.

Files that currently exist and must NOT be deleted:
- `PlayerIndicator.tsx`
- `ReplayControls.tsx`
- `SpectatorOverlay.tsx`
- `QueryBar.tsx`
- `ResultsPanel.tsx`
- `ChatPanel.tsx`
- `StrategistAlerts.tsx`
- `ActionBar.tsx`
- `EventTicker.tsx`

---

## 4. GENERATION ORDER

1. `app/client/index.html` (MODIFIED) — font swap
2. `app/client/tailwind.config.js` (MODIFIED) — Tailwind font token
3. `app/client/src/components/Map.tsx` (MODIFIED) — remove emojis
4. `app/client/src/components/ActionCard.tsx` (MODIFIED) — font update
5. `app/client/src/components/Territory.tsx` (MODIFIED) — font update
6. `app/client/src/components/CardHand.tsx` (MODIFIED) — font update
7. `app/client/src/components/VictoryScreen.tsx` (MODIFIED) — font update
8. `app/client/src/components/IntelPanel.tsx` (MODIFIED) — font update

---

## 5. IMPLEMENTATION REFERENCES

- **Colors, dimensions, animations:** `AESTHETIC.md` v2.1
- **Interaction flows, state management:** `UIUX.md` v1.1
- **Component specs with exact values:** `INTERFACE_CONTRACT_UPDATE_1.md`
- **Design philosophy:** `DECISIONS_UPDATE_1.md`

---

## 6. SCOPE BOUNDARY

**Do change:**
- Font from Cinzel to Rajdhani everywhere it appears
- Emoji removal from continent banners
- Any UI polish consistent with AESTHETIC.md v2.1

**Do NOT change:**
- Hex grid map structure and layout
- Territory.tsx quadrant fill logic
- CardHand.tsx fan layout
- ActionCard.tsx card dimensions and icons
- dnd-kit drag/drop behavior
- SpacetimeDB subscription or reducer calls
- Game mechanics, AI systems, or database schema

---

## 7. SUCCESS CRITERIA

After applying all modifications:

1. `npm run build` compiles without errors.
2. Hex map renders correctly with continent banners — no emoji, Rajdhani text only.
3. All cards show Rajdhani labels instead of Cinzel.
4. Territory name labels use Rajdhani.
5. VictoryScreen uses Rajdhani for "Dominion Achieved", winner name, "CONQUERS ALL".
6. IntelPanel headers use Rajdhani.
7. No other visual regressions.
8. All existing game logic functions unchanged.

---

## End of Visual Overhaul Masterplan v1.1
