# UI/UX OVERHAUL — MASTERPLAN

## Version 1.1
## Scope: Complete Visual and Interaction Overhaul — All Slices
## Target: Claude Code Generation

---

## 0. DOCUMENT PURPOSE

This masterplan is the entry point for implementing the complete UI/UX overhaul of Risk: Dominion. It tells you what to read, what to generate, in what order, and what constraints apply.

This overhaul replaces the entire visual and interaction layer of the frontend. Game mechanics, reducers, AI systems, and database operations remain completely unchanged.

---

## 1. BEFORE YOU BEGIN

Read every existing file in the frontend codebase. Understand the current component tree, styling approach, and interaction patterns before making any changes.

The actual codebase to understand before starting:

- `app/client/src/App.tsx` — root component, layout, DnD context, hotkeys, mode logic
- `app/client/src/constants.ts` — game constants, TERRITORY_NAMES, ADJACENCY, PLAYER_COLORS, CONTINENTS, AI_PLAYERS
- `app/client/src/types.ts` — TerritoryState, CardType, QueryResult, and all shared types
- `app/client/src/components/Map.tsx` — hex grid map, continent columns, territory grid, world silhouette SVG background
- `app/client/src/components/Territory.tsx` — individual hex tile with four-quadrant ownership SVG, center medallion, drop target
- `app/client/src/components/CardHand.tsx` — fanned card hand, float-up animation, empty/ended states
- `app/client/src/components/ActionCard.tsx` — draggable card, SVG icons, Cinzel labels (to be replaced with Rajdhani)
- `app/client/src/components/IntelPanel.tsx`
- `app/client/src/components/VictoryScreen.tsx`
- `app/client/src/components/EventTicker.tsx`
- `app/client/src/components/StrategistAlerts.tsx`
- `app/client/src/components/ActionBar.tsx`
- `app/client/src/components/QueryBar.tsx`
- `app/client/src/components/ResultsPanel.tsx`
- `app/client/src/components/ChatPanel.tsx`
- `app/client/src/components/PlayerIndicator.tsx`
- `app/client/src/components/ReplayControls.tsx`
- `app/client/src/components/SpectatorOverlay.tsx`
- `app/client/src/hooks/useSubscriptions.ts`
- `app/client/src/utils/territoryHelpers.ts`
- `app/client/index.html`
- `app/client/tailwind.config.js`
- `app/client/package.json`

Read these supporting documents for detailed specifications:
- `AESTHETIC.md` (exact visual design system: colors, fonts, dimensions, animations)
- `UIUX.md` (interaction patterns, user flows, state management, keyboard shortcuts)
- `UX_OVERHAUL_DECISIONS.md` (design philosophy and rationale)

---

## 2. CRITICAL CONSTRAINTS

These paradigm shifts define the overhaul. They override any previous implementation or document that conflicts.

1. **The hex grid stays.** The map is an SVG hex grid organized in three continent columns (Americas, Europe-Africa, Asia-Oceania). No D3.js geographic projection. No GeoJSON. No irregular territory shapes. The Territory.tsx hex tile is restyled, not replaced with a different rendering approach.

2. **The fanned card hand stays.** CardHand.tsx renders a fanned arc of draggable cards at the bottom of the screen. It is modified for font updates and minor styling but the fanned layout, the fan angle math, the float-up animation, and the drag behavior are preserved. Do not replace this with three card stacks.

3. **No D3.js.** Do not add d3 to package.json. Do not write any D3 imports. Map rendering, query visualizations, and all other visuals use SVG, CSS, and React. Query results render as a heatmap overlay on the existing hex tiles and a caption label — no D3 required.

4. **Font swap: Cinzel to Rajdhani.** Every inline `fontFamily: "Cinzel, serif"` style is replaced with `fontFamily: "Rajdhani, sans-serif"`. Orbitron remains for digital chrome elements. JetBrains Mono remains for all numeric and data fields. Update the Google Fonts link in `index.html` to include Rajdhani (wght 500;600;700). Update `tailwind.config.js` to replace the `font-display` token value from `'Cinzel'` to `'Rajdhani'`.

5. **No emoji anywhere.** Remove all emoji characters from all files. The loading state in App.tsx uses a sword emoji — replace with a gold SVG or a plain text glyph. The continent banner in Map.tsx uses emoji (⚔ 🏛 🌏) — remove the `CONTINENT_ICONS` map entirely and render continent names as text only.

6. **Warm parchment palette.** All colors must come from the established warm palette. Core tokens: `bg-deep #0d0a06`, `bg-mid #1a1610`, `bg-surface #221e18`, `gold #d4a017`, `gold-dim #9a8870`, `border-subtle #3d3525`, player colors from `PLAYER_COLORS` in constants.ts. No ocean blue, no cool gray, no new palette departures.

7. **SpacetimeDB 2.4.1 hooks only.** Use `useTable`, `useProcedure`, `useReducer`, and `DbConnection.builder()`. Do not use older API patterns such as `useSpacetimeTable`, `useSpacetimeReducer`, or direct SDK calls that bypass these hooks.

8. **No files are deleted.** PlayerIndicator.tsx, ReplayControls.tsx, SpectatorOverlay.tsx, QueryBar.tsx, ResultsPanel.tsx, and ChatPanel.tsx all remain in the codebase. Do not remove them, do not remove their imports in App.tsx.

9. **The command bar is new.** CommandBar.tsx is a new component. It is summoned by pressing Enter (replacing the old Q-to-focus-input shortcut in App.tsx). It is dismissed by Escape. It handles INTEL, CHAT, EVENTS, and ADVICE navigation. It does not replace QueryBar — it coexists with it in the layout.

10. **All game mechanics remain completely unchanged.** Reducers, AI systems, database operations, subscription patterns, win conditions, action point logic, cultural spread, trust scores — none of these change.

---

## 3. FILE LIST

### MODIFIED (14 files)

These files keep their exact paths. Their internal rendering, styling, and font references are updated to match the overhaul spec. Game logic within them is preserved.

1. `app/client/package.json` — remove any d3 entry if present; add no new dependencies except those required for Rajdhani font tooling if needed (Google Fonts is loaded via CDN, so no npm package is needed)
2. `app/client/src/constants.ts` — add sound frequency constants, add UI color tokens as named exports
3. `app/client/src/types.ts` — add CommandBarState, ChatWindowState, SoundEvent, HeatmapEntry types
4. `app/client/index.html` — swap Google Fonts link: remove Cinzel, add Rajdhani (wght 500;600;700), keep Orbitron and JetBrains Mono
5. `app/client/tailwind.config.js` — update `font-display` token from `'Cinzel'` to `'Rajdhani'`; add `font-ui: ['Rajdhani', 'sans-serif']` if not already present
6. `app/client/src/components/Territory.tsx` — swap `fontFamily: "Cinzel, serif"` to `fontFamily: "Rajdhani, sans-serif"` on the territory name label; preserve all hex SVG geometry, quadrant fills, medallion, glow logic, and drop target behavior
7. `app/client/src/components/Map.tsx` — remove `CONTINENT_ICONS` map and emoji span entirely; render continent name as Rajdhani text only; swap `fontFamily: "Cinzel, serif"` to Rajdhani on the banner label; keep world silhouette SVG background, hex grid layout, and continent columns unchanged
8. `app/client/src/components/CardHand.tsx` — swap Cinzel font reference to Rajdhani on empty-state label; preserve fanned layout, angle math, float-up animation, and all card rendering
9. `app/client/src/components/ActionCard.tsx` — swap all `fontFamily: "Cinzel, serif"` to `fontFamily: "Rajdhani, sans-serif"` on card labels (top corner letter, bottom action label); preserve SVG icons, drag behavior, accent colors, shimmer class
10. `app/client/src/components/IntelPanel.tsx` — restyle to warm parchment palette; swap any Cinzel references to Rajdhani; preserve all intel data display and highlight callbacks
11. `app/client/src/components/VictoryScreen.tsx` — add shockwave ring animation (CSS keyframes, expands from center); add sound trigger on mount; swap Cinzel to Rajdhani on overlay text
12. `app/client/src/components/EventTicker.tsx` — restyle to warm palette; swap Cinzel to Rajdhani; preserve event click callbacks and feed rendering
13. `app/client/src/components/StrategistAlerts.tsx` — restyle as advice cards; swap Cinzel to Rajdhani; preserve dismiss callbacks and alert data
14. `app/client/src/App.tsx` — add TitleScreen render on load; add ColorLegend to map area; add CommandBar with Enter key trigger (update hotkey handler); add ChatWindow state; add heatmap overlay state for query results; swap Cinzel reference in loading screen to Rajdhani; remove sword emoji from loading state; preserve all existing layout, subscriptions, drag handlers, mode logic, and reducer calls

### NEW (5 files)

15. `app/client/src/utils/soundEngine.ts` — Web Audio API sound synthesis; exports `playSoundEvent(type: SoundEvent): void`; types: `card-play`, `territory-flip`, `cultural-pressure`, `victory`, `defeat`; all tones synthesized via OscillatorNode; AudioContext created once and reused
16. `app/client/src/components/ColorLegend.tsx` — bottom-left fixed panel; renders four colored squares with player names from `AI_PLAYERS` plus "You" for HUMAN_PLAYER_ID; Rajdhani labels; 60% opacity normally; warm parchment background
17. `app/client/src/components/TitleScreen.tsx` — full-screen overlay; "RISK: DOMINION" in gold Rajdhani; fades in 300ms, holds 2s, fades out 500ms; map is live behind it; unmounts after animation completes
18. `app/client/src/components/ChatWindow.tsx` — fixed bottom-right chat overlay; shows conversation with a single AI opponent; Rajdhani header with player name; JetBrains Mono messages; close button; AI responses enforced at 100 characters or fewer
19. `app/client/src/components/CommandBar.tsx` — dark surface bar; gold `>` prompt; JetBrains Mono text input; dropdown on `>` click showing INTEL, CHAT, EVENTS, ADVICE sections; shake animation on unrecognized input; summons on Enter key; dismisses on Escape

### DELETED

None. No files are deleted. All existing components remain in the codebase.

---

## 4. GENERATION ORDER

Generate files in this sequence. Each file must only reference types and utilities that already exist or were generated earlier in this list.

1. `app/client/index.html` (MODIFIED) — font swap, no code dependencies
2. `app/client/tailwind.config.js` (MODIFIED) — font token update, no code dependencies
3. `app/client/package.json` (MODIFIED) — dependency audit, no code dependencies
4. `app/client/src/constants.ts` (MODIFIED) — adds sound constants and color tokens; no new imports needed
5. `app/client/src/types.ts` (MODIFIED) — adds new interfaces; depends only on existing types
6. `app/client/src/utils/soundEngine.ts` (NEW) — depends on `SoundEvent` type from types.ts
7. `app/client/src/components/ColorLegend.tsx` (NEW) — depends on `PLAYER_COLORS`, `AI_PLAYERS`, `HUMAN_PLAYER_ID` from constants.ts
8. `app/client/src/components/TitleScreen.tsx` (NEW) — depends only on React; no game data needed
9. `app/client/src/components/ActionCard.tsx` (MODIFIED) — font swap only; depends on existing CardType, useDraggable
10. `app/client/src/components/ChatWindow.tsx` (NEW) — depends on types.ts message types and constants.ts AI_PLAYERS
11. `app/client/src/components/CommandBar.tsx` (NEW) — depends on types.ts CommandBarState; no game data coupling
12. `app/client/src/components/Territory.tsx` (MODIFIED) — font swap only; all SVG geometry and drop logic unchanged
13. `app/client/src/components/Map.tsx` (MODIFIED) — remove emoji, font swap; depends on Territory.tsx and constants.ts
14. `app/client/src/components/CardHand.tsx` (MODIFIED) — font swap on empty state; depends on ActionCard.tsx
15. `app/client/src/components/IntelPanel.tsx` (MODIFIED) — restyle; depends on existing subscriptions and types
16. `app/client/src/components/VictoryScreen.tsx` (MODIFIED) — add animation and sound; depends on soundEngine.ts
17. `app/client/src/components/EventTicker.tsx` (MODIFIED) — restyle; depends on existing event types
18. `app/client/src/components/StrategistAlerts.tsx` (MODIFIED) — restyle; depends on existing alert types
19. `app/client/src/App.tsx` (MODIFIED) — integrates all new and modified components; depends on all of the above

---

## 5. IMPLEMENTATION REFERENCES

For exact specifications, refer to:

- **Colors, fonts, dimensions, animations:** `AESTHETIC.md`
- **Interaction flows, state management, keyboard shortcuts:** `UIUX.md`
- **Design philosophy and rationale:** `UX_OVERHAUL_DECISIONS.md`

If any detail is ambiguous between documents, the constraints in Section 2 of this masterplan take precedence.

---

## 6. SCOPE BOUNDARY

This is a visual and interaction overhaul only.

**Do change:** Every `fontFamily: "Cinzel, serif"` reference (replace with Rajdhani), all emoji (remove), warm palette color values, continent banner rendering in Map.tsx, loading screen in App.tsx, VictoryScreen animation, IntelPanel styling, EventTicker styling, StrategistAlerts styling, plus all five new files.

**Do NOT change:** Game mechanics, reducer logic, AI systems, database operations, table schemas, subscription patterns, server code, slice-specific functionality, win conditions, action point logic, cultural spread calculations, trust score updates, hex tile SVG geometry, fanned card layout math, drag-and-drop behavior, territory quadrant rendering, DnD context, mode logic (player/spectator/replay).

All existing game features must continue to function exactly as before: actions, AI cycles, cultural spread, intel, chat system, trust scores, query system, replay, spectator mode.

---

## 7. GENERATION RULES

1. **Modify existing files in place.** MODIFIED files keep their file paths. Only change what the overhaul requires. Preserve all game logic, all reducer calls, all subscription hooks.
2. **Mark every output file** as MODIFIED or NEW at the top of the file (as a comment).
3. **No D3.js.** No d3 import anywhere. SVG and React only.
4. **Tailwind CSS for all layout and spacing.** Inline styles only for dynamic values (player colors, glow intensities derived from game state). No custom CSS files.
5. **No emojis.** Search every file you touch for emoji characters and remove them.
6. **All colors from the warm parchment palette** defined in Section 2. No ocean blue, no cool gray.
7. **Fonts: Rajdhani (500/600/700) for all display labels and UI text. Orbitron for digital chrome. JetBrains Mono for numbers, data, query input, timestamps.** Cinzel must not appear anywhere after the overhaul.
8. **Sound: Web Audio API only.** No audio files. OscillatorNode synthesis only.
9. **SpacetimeDB 2.4.1 API only:** `useTable`, `useProcedure`, `useReducer`, `DbConnection.builder()`.

---

## 8. SUCCESS CRITERIA

After applying all modifications:

1. `npm run build` compiles without errors or TypeScript complaints.
2. App loads and TitleScreen appears: "RISK: DOMINION" in gold Rajdhani, fades over the live map, unmounts after 2.8s total.
3. Hex map renders with continent banners showing text-only labels in Rajdhani — no emoji characters anywhere on screen.
4. Territory hex tiles display correctly: four-quadrant ownership fill, center medallion with troop count in JetBrains Mono, name label in Rajdhani below the hex.
5. Fanned card hand is visible at the bottom: cards fan at correct angles, Rajdhani labels on each card, all three card types render.
6. Dragging a Military card highlights valid adjacent enemy targets; dragging Economic or Covert cards highlights all territories.
7. Dropping a card on a valid target calls the correct reducer and the territory state updates.
8. Pressing Enter opens CommandBar (dark surface, gold `>`, JetBrains Mono input); clicking `>` shows dropdown with INTEL, CHAT, EVENTS, ADVICE sections.
9. Typing "chat with Zhao" in CommandBar opens ChatWindow bottom-right; AI responds in 100 characters or fewer.
10. Query result from QueryBar or CommandBar shades hex tiles as a heatmap overlay with a caption; auto-dismisses after 10 seconds.
11. ColorLegend visible bottom-left: four colored squares with player names, Rajdhani labels.
12. VictoryScreen shows shockwave ring animation expanding from the winning territory hex; sound plays.
13. All five sound events trigger at correct moments: card play, territory flip, cultural pressure, victory, defeat.
14. No Cinzel font references remain anywhere in the codebase. No emoji characters remain anywhere in the codebase.

---

## End of UI/UX Overhaul Masterplan v1.1

Read the existing codebase. Read all supporting documents. Apply every modification in the order specified. Output every changed file marked MODIFIED or NEW. This is the definitive masterplan. Generate now.
