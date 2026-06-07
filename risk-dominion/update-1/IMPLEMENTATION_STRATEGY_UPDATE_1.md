# UX OVERHAUL — IMPLEMENTATION STRATEGY

## Version 1.1
## Scope: Complete Visual and Interaction Overhaul — All Slices
## Target: Human Team — After Claude Code Generation

---

## Principle 0: This Is the Final Polish

The UI/UX overhaul is the last change before the demo. It transforms the game from technically sound but visually rough into a polished, cohesive experience. The changes are: font swap from Cinzel to Rajdhani everywhere, emoji removal, warm parchment palette enforcement, five new components (TitleScreen, ColorLegend, CommandBar, ChatWindow, soundEngine), and restyling of existing components (IntelPanel, VictoryScreen, EventTicker, StrategistAlerts).

This overhaul does not change game mechanics. Military combat, economic investment, cultural spread, covert operations, AI reasoning, trust scores, and the win condition remain exactly as they were. The hex map stays as-is. The fanned card hand stays as-is. Only the visual and interaction layer changes.

The rule: every test step below must pass before the game is shown to judges.

---

## 1. VALIDATION STRUCTURE

One test script covers every visual and interaction element. Follow it from start to finish. If a step fails, stop and fix before continuing. Each step assumes the previous steps passed.

Estimated time: 20-30 minutes.

---

## 2. PREREQUISITES

Before starting the test script:

- SpacetimeDB server is running and the module is published.
- Frontend dev server is running (`npm run dev` in `app/client`).
- One browser tab open at `http://localhost:5173`.
- Anthropic API key is configured in the environment (needed for chat and AI queries).
- Browser dev tools console is open to catch JavaScript errors.

---

## 3. TEST SCRIPT

---

### Step 1: Title Screen on Load

**Action:** Hard-reload the page (Cmd+Shift+R or Ctrl+Shift+R). Watch the screen for the first 3 seconds.

**Expected:**
- A full-screen dark overlay appears immediately over the map.
- The text "RISK: DOMINION" is visible, centered, in gold (#d4a017), Rajdhani font.
- The hex map is dimly visible behind the overlay.
- After approximately 2 seconds the overlay begins fading.
- After the fade (approximately 0.5s) the map is fully visible and the overlay is gone from the DOM.

**Debug if failing:**
- Check that TitleScreen.tsx is rendered in App.tsx on initial load.
- Check that TitleScreen unmounts (does not just set opacity:0) after the animation completes.
- If the map is not visible behind the overlay, check that the TitleScreen overlay uses `position: fixed` and `z-index` above the map but that the map is rendered underneath it.

---

### Step 2: Hex Map Renders with Continent Banners (No Emoji, Rajdhani Text)

**Action:** Look at the map after the title fades.

**Expected:**
- Three continent columns are visible: Americas (left), Europe-Africa (center), Asia-Oceania (right).
- Each column has a banner above it. The banner text reads the continent name in uppercase Rajdhani, gold-dim color, wide letter-spacing.
- No emoji characters appear anywhere on the banner or on the map (no ⚔, no 🏛, no 🌏).
- The world silhouette SVG background is visible as a very faint gold-tinted landmass shape behind the hex grid.
- Hex tiles are arranged in a 2-column grid within each continent group.

**Debug if failing:**
- No emoji: open Map.tsx and confirm `CONTINENT_ICONS` map is removed and the `<span>` that rendered emoji is gone.
- Cinzel still showing: inspect the banner text element in browser DevTools. The computed font-family must be Rajdhani, not Cinzel.
- Font not loading: check `index.html` for the Google Fonts link. It must include `Rajdhani:wght@500;600;700`.

---

### Step 3: Territory Hover Shows Tooltip Data

**Action:** Hover the mouse cursor over any territory hex tile and hold for 0.5 seconds.

**Expected:**
- A tooltip or title callout appears (may be the native browser `title` attribute tooltip or a custom hover card).
- The callout shows: territory name, troop count, capital status, agent count, influence percentage.
- Moving the mouse off the hex hides the callout.

**Debug if failing:**
- Check Territory.tsx. The `title` prop on the outer div encodes all four dimension values.
- If a custom hover card is implemented, check that the mouseenter/mouseleave handlers are bound to the hex container.

---

### Step 4: Fanned Card Hand Visible at Bottom

**Action:** Look at the bottom section of the screen while in player mode (no `?spectator=true` or `?replay=true` in the URL).

**Expected:**
- A row of fanned cards is visible along the bottom edge.
- Cards are arranged in a fan arc (each card rotated slightly relative to its neighbors).
- Each card shows a type icon (sword, coin stack, or eye) and a label at the bottom.
- Card labels read "ATTACK", "INVEST", or "DEPLOY" in Rajdhani font (not Cinzel).
- The card count reflects the player's current action points.

**Debug if failing:**
- Cinzel still on labels: open ActionCard.tsx in DevTools, confirm computed font-family is Rajdhani.
- Cards missing: check that `gameEnded` is false and `actionPoints > 0`.
- Fan angles wrong: check the `angle` and `yLift` math in CardHand.tsx — these must not be changed.

---

### Step 5: Card Drag Highlights Valid Targets

**Action:** Click and hold (begin dragging) a Military card.

**Expected:**
- While dragging, a set of territory hex tiles becomes visually highlighted (gold border, dashed ring, or glow).
- Only adjacent enemy territories are highlighted (territories where the opponent has military ownership adjacent to player-owned territories).
- Releasing over empty space cancels without action.

**Action:** Click and hold an Economic or Covert card.

**Expected:**
- All 12 territory hex tiles become highlighted.

**Debug if failing:**
- Check the `handleDragStart` function in App.tsx.
- For Military: `getValidMilitaryTargets(military, PLAYER_ID)` must return the correct set.
- For Economic/Covert: `Array.from({ length: TOTAL_TERRITORIES }, (_, i) => i + 1)` must produce ids 1–12.
- Highlight rendering: check that Territory.tsx `isHighlighted` prop triggers the dashed ring SVG polygon.

---

### Step 6: Card Drop Executes Action and Updates Territory

**Action:** Drag a Military card and drop it onto a highlighted (valid adjacent enemy) territory.

**Expected:**
- The drag ends cleanly.
- The `militaryAttack` reducer is called with the correct `territoryId` and `playerId`.
- Within 1-2 seconds, the territory state updates (the military quadrant color changes to reflect new ownership or the troop count updates).
- The `highlighted` set clears and no tiles remain highlighted.

**Debug if failing:**
- Check `handleDragEnd` in App.tsx. Confirm it calls `militaryAttack({ territoryId, playerId: PLAYER_ID })`.
- If the reducer is called but the territory doesn't update, check the SpacetimeDB subscription and `buildTerritoryStates`.
- If the drop does nothing, confirm `event.over?.id` is a valid territory id (number, not string).

---

### Step 7: Enter Key Summons Command Bar

**Action:** Press the Enter key while no input is focused.

**Expected:**
- The CommandBar slides or fades into view.
- It shows a dark surface background (not the map background, a distinct elevated surface).
- A gold `>` prompt character is visible on the left.
- A text input field is focused and ready for input.
- Placeholder text reads something like "Type a command or question..."
- The input uses JetBrains Mono font.

**Debug if failing:**
- Check the `onKey` handler in App.tsx. The Enter key case must call `setCommandBarOpen(true)` or equivalent.
- Confirm CommandBar.tsx is mounted and controlled by this state.
- If the bar appears but is not focused, check that CommandBar calls `inputRef.current?.focus()` on mount.

---

### Step 8: Command Bar Dropdown Shows Correct Sections

**Action:** With the CommandBar open, click the `>` prompt character.

**Expected:**
- A dropdown panel appears below the command bar.
- The dropdown contains four labeled sections: INTEL, CHAT, EVENTS, ADVICE.
- Each section has at least one selectable option.
- Hovering an option highlights it (subtle gold background or border).
- The dropdown includes a hint at the bottom such as "or type anything..." in a secondary text style.

**Action:** Press Escape.

**Expected:**
- The dropdown closes.
- The CommandBar dismisses.
- Focus returns to the document.

**Debug if failing:**
- Check CommandBar.tsx click handler on the `>` span.
- Confirm all four sections are rendered in the dropdown.
- Check that Escape key dismisses both the dropdown and the CommandBar.

---

### Step 9: "chat with Zhao" Opens Chat Window

**Action:** Press Enter to open the CommandBar. Type `chat with Zhao` and press Enter.

**Expected:**
- The CommandBar dismisses.
- A ChatWindow panel appears in the bottom-right corner of the screen.
- The panel header shows Zhao's name in Rajdhani font and a close button.
- The message area is visible (may be empty if no prior conversation).
- A text input field is at the bottom for composing messages.

**Debug if failing:**
- Check CommandBar.tsx command parsing logic. The string "chat with Zhao" (case-insensitive) must trigger opening a chat with playerId 2 (Zhao's id from `AI_PLAYERS` in constants.ts).
- Check that App.tsx state includes a `chatWindowTarget` or equivalent that ChatWindow.tsx reads.
- Check ChatWindow.tsx positioning: `position: fixed`, `bottom`, `right` CSS values.

---

### Step 10: Query Result Shades Hex Tiles as Heatmap

**Action:** Use the QueryBar (top of screen) or the CommandBar to submit a query such as "where am I weakest".

**Expected:**
- The hex tiles on the map change shade to reflect vulnerability (darker or more saturated tiles indicate higher vulnerability).
- A short caption appears on or near the map: for example, "3 territories vulnerable. North Africa is your weakest position."
- After 10 seconds, the heatmap shading fades and tiles return to normal coloring.

**Debug if failing:**
- Check App.tsx `queryHighlights` and `queryResult` state.
- Check ResultsPanel.tsx or the heatmap overlay rendering — it must read tile ids from `queryHighlights` and apply a visual modifier.
- Check the 10-second auto-dismiss timer.

---

### Step 11: Color Legend Visible Bottom-Left

**Action:** Look at the bottom-left corner of the screen during normal gameplay.

**Expected:**
- The ColorLegend component is visible.
- It shows four rows, one per player: a colored square matching the player's hex color, and the player's name in Rajdhani.
- "You" (Player 1, blue) appears first, followed by Zhao (red), Consortium (gold/orange), Prophet (purple).
- The legend is at approximately 60% opacity in its resting state and does not cover or obscure hex tiles or the card hand.

**Debug if failing:**
- Confirm ColorLegend.tsx is imported and rendered in App.tsx (or in Map.tsx).
- Check positioning: `position: fixed` or `position: absolute`, `bottom`, `left`, with appropriate margin.
- Check that PLAYER_COLORS and AI_PLAYERS from constants.ts are used for the color squares and names.

---

### Step 12: Victory Animation Plays on Win

**Action:** Play until the win condition triggers, or temporarily lower `WIN_UNIFIED_TERRITORIES` in constants.ts to 2 and force a win.

**Expected:**
- When the game ends with the human player winning, the VictoryScreen component renders.
- A shockwave ring (expanding circle or polygon) animates outward from the winning territory hex.
- After the ring animation completes (~1.5s), a victory overlay card appears with win text in Rajdhani/gold.
- A sound plays: the victory ascending sequence (C5-E5-G5 or equivalent synthesized tones).

**Debug if failing:**
- Check VictoryScreen.tsx for the CSS keyframe animation on the shockwave ring.
- Check soundEngine.ts — `playSoundEvent('victory')` must be called on VictoryScreen mount.
- If no sound: check that AudioContext is created and that the Web Audio API is unblocked (requires a prior user interaction; card drag counts).

---

### Step 13: Sound Triggers Fire at Correct Moments

**Action:** With audio output enabled, perform these actions in sequence and listen:
- Drag and drop a card successfully.
- Watch a territory ownership change (opponent's turn or own action).
- Wait for cultural influence to tick on a contested territory.

**Expected:**
- Card play: a short high-pitched tone (~800Hz, ~50ms) fires when a reducer call completes successfully.
- Territory flip: a low thud (~120Hz, ~150ms) fires when a territory changes military ownership.
- Cultural pressure: a soft oscillating tone (~200-400Hz) fires when cultural influence ticks on a contested territory.

**Debug if failing:**
- Check that soundEngine.ts exports `playSoundEvent` and that the function is called from the correct event handlers.
- If AudioContext is suspended: confirm that a user gesture (card drag, click) has occurred before the first sound attempt. Web Audio requires a prior gesture.
- Use browser DevTools console to check for "AudioContext suspended" or "NotAllowedError".

---

### Step 14: npm run build Passes with Zero Errors

**Action:** In the `app/client` directory, run `npm run build`.

**Expected:**
- The build completes without TypeScript errors, missing import errors, or Vite bundling errors.
- No warnings about missing font files or missing modules.

**Debug if failing:**
- TypeScript error on new type: check that CommandBarState, ChatWindowState, SoundEvent, HeatmapEntry are exported from types.ts.
- Missing import: check that all new components (TitleScreen, ColorLegend, CommandBar, ChatWindow, soundEngine) exist at their declared paths.
- Tailwind class not found: check tailwind.config.js for the Rajdhani font token update.

---

## 4. TRIAGE TABLE

| Step | Symptom | Most Likely Cause | Fix Location |
|------|---------|-------------------|--------------|
| 1 | No title screen | TitleScreen not mounted | App.tsx — add TitleScreen render at root level |
| 1 | Title doesn't fade | CSS animation not defined | TitleScreen.tsx — check keyframe for fadeOut |
| 1 | Title stays forever | Unmount callback missing | TitleScreen.tsx — setTimeout to call onDone after 2.8s |
| 2 | Emoji still visible | CONTINENT_ICONS not removed | Map.tsx — remove the map constant and the rendering span |
| 2 | Banner still Cinzel | Font swap missed | Map.tsx — replace fontFamily string on banner span |
| 2 | Rajdhani not loading | index.html link wrong | index.html — verify Rajdhani in Google Fonts URL |
| 3 | No tooltip data | title prop missing or empty | Territory.tsx — confirm title attribute string |
| 4 | Card labels still Cinzel | Font swap missed | ActionCard.tsx — replace both fontFamily strings |
| 4 | Empty state label Cinzel | Font swap missed | CardHand.tsx — replace fontFamily string on empty label |
| 5 | No highlight on Military drag | handleDragStart not computing targets | App.tsx — check getValidMilitaryTargets call |
| 5 | All tiles highlight for Military | Target logic ignores adjacency | App.tsx — confirm Military branch, not the else branch |
| 6 | Drop has no effect | territoryId is string, not number | App.tsx handleDragEnd — cast event.over.id to number |
| 6 | Reducer called but no update | Subscription stale | useSubscriptions.ts — check SpacetimeDB 2.4.1 hook wiring |
| 7 | Enter does not open CommandBar | Hotkey handler uses old logic | App.tsx onKey — add Enter case for CommandBar |
| 7 | CommandBar not focused on open | No autoFocus or focus call | CommandBar.tsx — call inputRef.current?.focus() on mount |
| 8 | Dropdown missing sections | Rendering logic incomplete | CommandBar.tsx — add all four section headers and options |
| 9 | Chat command not recognized | Parser too strict | CommandBar.tsx — case-insensitive match on "chat with {name}" |
| 9 | ChatWindow wrong position | CSS values incorrect | ChatWindow.tsx — position: fixed, bottom: 16px, right: 16px |
| 10 | No heatmap on query | queryHighlights not applied | App.tsx / Map.tsx — confirm queryHighlights passed as prop |
| 10 | Heatmap never fades | Auto-dismiss timer missing | App.tsx — setTimeout 10s to clear queryHighlights |
| 11 | ColorLegend missing | Component not rendered | App.tsx or Map.tsx — add ColorLegend import and render |
| 11 | Wrong colors in legend | Using wrong constant | ColorLegend.tsx — use PLAYER_COLORS and AI_PLAYERS |
| 12 | No shockwave animation | CSS keyframe missing | VictoryScreen.tsx — add @keyframes expand ring |
| 12 | No victory sound | playSoundEvent not called | VictoryScreen.tsx — call playSoundEvent('victory') on mount |
| 13 | No sound at all | AudioContext blocked | Confirm user gesture preceded first sound; check console |
| 13 | Wrong sound timing | Trigger in wrong handler | soundEngine.ts calls — move to correct event callback |
| 14 | TypeScript build error | New type not exported | types.ts — add and export all new interfaces |
| 14 | Missing module | New file path wrong | Check that all five new files exist at declared paths |

---

## 5. READINESS GATE CHECKLIST

Before the game is shown to judges, every item on this list must be true. Check each box manually.

- [ ] `npm run build` in `app/client` completes with zero errors.
- [ ] Title screen appears on load, fades correctly, and unmounts from the DOM.
- [ ] Hex map is visible after title fades. Continent banners have Rajdhani text. No emoji anywhere on screen.
- [ ] All 12 territory hex tiles render with correct quadrant fills, troop counts, and name labels in Rajdhani.
- [ ] Fanned card hand is visible in player mode. Cards have Rajdhani labels.
- [ ] Military card drag highlights valid adjacent targets only. Economic and Covert drag highlights all territories.
- [ ] Card drop calls the correct reducer. Territory state updates within 2 seconds.
- [ ] Enter key opens CommandBar. Escape dismisses it. JetBrains Mono input field is focused on open.
- [ ] Clicking `>` in CommandBar shows dropdown with INTEL, CHAT, EVENTS, ADVICE sections.
- [ ] "chat with Zhao" opens ChatWindow bottom-right. AI responds in 100 characters or fewer.
- [ ] Query result shades hex tiles as heatmap. Caption appears. Auto-dismisses after 10 seconds.
- [ ] ColorLegend visible bottom-left with four player entries, correct colors, Rajdhani labels.
- [ ] VictoryScreen shows shockwave ring animation when human player wins. Sound plays.
- [ ] Five sound events fire: card play, territory flip, cultural pressure, victory, defeat.
- [ ] No Cinzel font reference remains in any file in `app/client/src`.
- [ ] No emoji character appears anywhere in any file in `app/client/src`.
- [ ] All existing game logic works: actions, AI cycles, cultural spread, intel, chat pipeline, trust scores, replay, spectator mode.
- [ ] PlayerIndicator.tsx, ReplayControls.tsx, SpectatorOverlay.tsx, QueryBar.tsx, ResultsPanel.tsx, and ChatPanel.tsx all still exist and are imported where they were before.

---

## 6. MANUAL ITERATION NOTES

- **Font verification:** After building, open the browser Network tab and filter by "Rajdhani". Confirm the font file is downloaded. If it is not, the Google Fonts link in index.html is wrong.
- **Emoji audit:** After generation, run `grep -r "[\xF0\x9F\x80-\xFF]" app/client/src` or search the codebase for the specific removed emoji (⚔ 🏛 🌏) to confirm they are gone.
- **Cinzel audit:** Run `grep -r "Cinzel" app/client/src` to confirm zero results after the overhaul.
- **Sound testing:** Web Audio API requires a user gesture before the first sound. Click or drag a card at least once before testing sound triggers. If sounds are still silent after a gesture, check the browser console for "AudioContext was not allowed to start".
- **Demo dry run:** After all steps pass, do one full playthrough: load, title fades, inspect map, drag a card, execute an action, open the command bar, chat with Zhao, check the legend, play to victory. Note anything that feels slow or broken.

---

## 7. FINAL NOTE

After this validation passes, Risk: Dominion is visually complete and ready for judges. The overhaul delivers: a coherent warm parchment visual identity, Rajdhani as the display font everywhere, emoji-free continent banners, a title screen arrival moment, a command bar for all non-card interactions, chat windows with terse AI responses, a heatmap query system on the existing hex map, a color legend, and a victory animation with sound — all without touching a single line of game logic.

Validate. Polish. Demo.

---

## End of UX Overhaul Implementation Strategy v1.1
