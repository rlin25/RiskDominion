# UI/UX OVERHAUL — MASTERPLAN

## Version 1.0
## Scope: Complete Visual and Interaction Overhaul — All Slices
## Target: Claude Code Generation

---

## 0. DOCUMENT PURPOSE

This masterplan is the entry point for implementing the complete UI/UX overhaul of Risk: Dominion. It tells you what to read, what to generate, in what order, and what constraints apply.

This overhaul replaces the entire visual and interaction layer of the frontend. Game mechanics, reducers, AI systems, and database operations remain completely unchanged.

---

## 1. BEFORE YOU BEGIN

Read every existing file in the frontend codebase. Understand the current component tree, styling approach, and interaction patterns before making any changes.

Read these supporting documents for detailed specifications:
- `AESTHETIC.md` (v2.0 — exact visual design system: colors, fonts, dimensions, animations)
- `UIUX.md` (interaction patterns, user flows, state management, keyboard shortcuts)
- `INTERFACE_CONTRACT_UX_OVERHAUL.md` (exact component specifications with pixel values and D3 patterns)
- `UX_OVERHAUL_DECISIONS.md` (design philosophy and rationale)

---

## 2. CRITICAL CONSTRAINTS

These paradigm shifts define the overhaul. They override any previous implementation:

1. **The persistent UI is exactly two elements:** the full-screen D3 geographic map and the three card stacks at bottom center. Everything else is temporary and summoned through the command bar.

2. **Replace the hex grid entirely.** Use a D3.js geographic world map with GeoJSON data. Territories are irregular polygonal shapes within continent outlines. No hexagons anywhere.

3. **Territory ownership is shown through procedural D3 patterns** (diagonal lines, dots, crosshatch, circles) that overlay additively. Unified territories are solid color with gold border. No X-split quadrants.

4. **The command bar is the single interface** for all non-card interactions. Hidden by default. Summoned by Enter or T key. Dismissed by Escape or card drag. It handles chat, intel, queries, events, and advice.

5. **Chat windows open via the command bar.** Fixed bottom-right. AI responses must be 100 characters or fewer — enforced in the AI prompt.

6. **Query results render as D3 visualizations on the map** (heat maps, flow lines, symbols, bar charts, tables). They fade after 10 seconds. No separate results panel.

7. **Sound uses Web Audio API only.** No audio files. Exact frequencies and durations are specified in the interface contract.

8. **All game mechanics, reducers, AI systems, and database operations remain completely unchanged.** This is a visual and interaction overhaul only.

---

## 3. FILE LIST

### MODIFIED (16 files)

These files keep their paths but their internal logic and rendering may be completely rewritten to match the overhaul specs. Preserve only game logic unrelated to visual rendering.

1. `client/package.json` — add d3 dependency
2. `client/src/constants.ts` — new color tokens, sound constants
3. `client/src/types.ts` — new type interfaces
4. `client/src/utils/territoryHelpers.ts` — updated for pattern-based ownership
5. `client/src/components/ActionCard.tsx` — card stack styling
6. `client/src/components/Territory.tsx` — D3 geographic rendering, patterns, hover callout
7. `client/src/components/Map.tsx` — D3 geographic map, attack arrows, zoom/pan
8. `client/src/components/CardHand.tsx` — three stacks layout, drag behavior
9. `client/src/components/IntelPanel.tsx` — visual restyling
10. `client/src/components/VictoryScreen.tsx` — new animations
11. `client/src/components/EventTicker.tsx` — replaced with temporary notification cards
12. `client/src/components/StrategistAlerts.tsx` — restyled as advice cards
13. `client/src/components/QueryBar.tsx` — gutted, logic moved to CommandBar
14. `client/src/components/ResultsPanel.tsx` — gutted, replaced by D3 map visualizations
15. `client/src/hooks/useSubscriptions.ts` — updated for new component data needs
16. `client/src/App.tsx` — layout, state, overlay management

### NEW (6 files)

17. `client/src/utils/soundEngine.ts` — Web Audio API sound synthesis
18. `client/src/utils/patternRenderer.ts` — D3 procedural territory patterns
19. `client/src/components/ColorLegend.tsx` — persistent map legend
20. `client/src/components/TitleScreen.tsx` — arrival moment
21. `client/src/components/ChatWindow.tsx` — temporary chat overlay
22. `client/src/components/CommandBar.tsx` — unified command interface

### DELETED (3 files)

Before deleting, search the entire codebase for imports of these files. Remove all import statements and usages. Then delete:

- `client/src/components/PlayerIndicator.tsx`
- `client/src/components/ReplayControls.tsx`
- `client/src/components/SpectatorOverlay.tsx`

---

## 4. GENERATION ORDER

Generate files in this sequence. Each file must only reference types and utilities that already exist or were generated earlier.

1. `client/package.json` (MODIFIED)
2. `client/src/constants.ts` (MODIFIED)
3. `client/src/types.ts` (MODIFIED)
4. `client/src/utils/soundEngine.ts` (NEW)
5. `client/src/utils/patternRenderer.ts` (NEW)
6. `client/src/utils/territoryHelpers.ts` (MODIFIED)
7. `client/src/components/ColorLegend.tsx` (NEW)
8. `client/src/components/TitleScreen.tsx` (NEW)
9. `client/src/components/ActionCard.tsx` (MODIFIED)
10. `client/src/components/ChatWindow.tsx` (NEW)
11. `client/src/components/CommandBar.tsx` (NEW)
12. `client/src/components/Territory.tsx` (MODIFIED)
13. `client/src/components/Map.tsx` (MODIFIED)
14. `client/src/components/CardHand.tsx` (MODIFIED)
15. `client/src/components/IntelPanel.tsx` (MODIFIED)
16. `client/src/components/VictoryScreen.tsx` (MODIFIED)
17. `client/src/components/EventTicker.tsx` (MODIFIED)
18. `client/src/components/StrategistAlerts.tsx` (MODIFIED)
19. `client/src/components/QueryBar.tsx` (MODIFIED)
20. `client/src/components/ResultsPanel.tsx` (MODIFIED)
21. `client/src/hooks/useSubscriptions.ts` (MODIFIED)
22. `client/src/App.tsx` (MODIFIED)

---

## 5. IMPLEMENTATION REFERENCES

For exact specifications, refer to:

- **Colors, fonts, dimensions, animations:** `AESTHETIC.md` v2.0
- **Interaction flows, state management, keyboard shortcuts:** `UIUX.md`
- **Component specifications with pixel values, D3 patterns, sound frequencies:** `INTERFACE_CONTRACT_UX_OVERHAUL.md`
- **Design philosophy and rationale:** `UX_OVERHAUL_DECISIONS.md`

If any detail is ambiguous between documents, `INTERFACE_CONTRACT_UX_OVERHAUL.md` is the authoritative implementation spec.

---

## 6. SCOPE BOUNDARY

This is a visual and interaction overhaul only.

**Do change:** Every visual element, every interaction pattern, every animation, every sound trigger, the component tree, state management for UI, keyboard shortcuts.

**Do NOT change:** Game mechanics, reducer logic, AI systems, database operations, table schemas, subscription patterns, server code, slice-specific functionality, win conditions, action point logic, cultural spread calculations, trust score updates.

All existing game features must continue to function exactly as before: actions, AI cycles, cultural spread, intel, chat system, trust scores, query system, replay, spectator mode.

---

## 7. GENERATION RULES

1. **Modify existing files in place.** MODIFIED files may have their internal logic and rendering completely rewritten. The file path stays the same. Preserve only game logic unrelated to visual rendering.
2. **Mark every output file** as MODIFIED, NEW, or DELETED at the top.
3. **Use D3.js for all map rendering, pattern generation, query visualizations, and attack arrows.**
4. **Tailwind CSS for all styling.** Use the extended configuration from AESTHETIC.md.
5. **No emojis. No em dashes. No custom CSS files.**
6. **All colors from the palette in AESTHETIC.md.** No other colors.
7. **All fonts: JetBrains Mono or Inter.** No other fonts.
8. **Sound: Web Audio API only.** No audio files.
9. **Before deleting any file:** search for and remove all imports referencing that file.

---

## 8. SUCCESS CRITERIA

After applying all modifications:

1. Compile without errors (`npm run build`).
2. Map renders as D3 geographic world map with irregular territories and procedural patterns.
3. Title screen appears and fades correctly.
4. Three card stacks function: drag, count, empty state, regeneration.
5. Attack arrows appear on Military pickup and disappear on drop.
6. Territory hover shows data callout with leader line.
7. Command bar summons on Enter, shows dropdown, executes commands, shakes on bad input.
8. Chat windows open via command bar, AI responds within 100 characters.
9. Query visualizations render on map and fade after 10 seconds.
10. Victory and defeat animations play completely with sound.
11. All sound triggers fire at correct moments.
12. Color legend visible with correct colors and names.
13. All existing game logic functions unchanged.

---

## End of UI/UX Overhaul Masterplan

Read the existing codebase. Read all supporting documents. Apply every modification in the order specified. Output every changed file with MODIFIED, NEW, or DELETED at the top. This is the final masterplan. After generation, Risk: Dominion is complete. Generate now.