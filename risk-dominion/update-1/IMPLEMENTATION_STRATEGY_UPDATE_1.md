# UX OVERHAUL — IMPLEMENTATION STRATEGY

## Version 1.0
## Scope: Complete UI/UX Overhaul — All Slices
## Target: Human Team — After Claude Code Generation

---

## Principle 0: This Is the Final Polish

The UI/UX overhaul is the last change before the demo. It transforms the game from technically impressive but visually confusing into a polished, beautiful, intuitive experience. Every visual element, every interaction pattern, every animation, and every sound trigger is being replaced or significantly modified.

This overhaul does not change game mechanics. Military combat, economic investment, cultural spread, covert operations, AI reasoning, trust scores, and the win condition remain exactly as they were. The overhaul changes how the game looks, feels, and responds to the player.

The rule: the overhaul must pass every test step before the game is shown to judges. No exceptions.

This document tells you how to validate the overhaul, how to debug it when validation fails, and what to fix before the demo.

---

## 1. VALIDATION STRUCTURE

The overhaul uses a single comprehensive validation pass. One test script covers every visual element and interaction pattern. The script follows the player experience — from loading the game to victory.

Estimated time: 15-20 minutes.

Execute the script from start to finish. If any step fails, stop and fix before continuing. Each step builds on the previous ones.

---

## 2. TEST SCRIPT

### Prerequisites

- SpacetimeDB server is running.
- Frontend dev server is running.
- One browser tab open to `http://localhost:5173`.
- Anthropic API key configured in `.env` (needed for chat and queries).

---

### Step 1: Title Screen

**Action:** Load the game. Watch the screen.

**Expected Result:**
- The live map is visible, dimmed by a dark overlay.
- "Risk: Dominion" appears centered in gold (#d4a843), Inter font, large.
- The title holds for approximately 2 seconds.
- The overlay and text fade out over about half a second.
- The full-brightness map is revealed.

**If the title doesn't appear:** Check the title screen component. Check that it renders on page load before the main game UI.

**If the map isn't visible behind the title:** The dimming overlay may be fully opaque. Check opacity value (should be 60% of bg-ocean).

---

### Step 2: Map Renders with Geographic Territories

**Action:** Look at the map after the title fades.

**Expected Result:**
- The map shows recognizable continent shapes — Americas (left), Europe and Africa (center), Asia and Oceania (right).
- Territories have irregular, jagged borders within the continents.
- Territory names are visible at very small size, low opacity, positioned near each territory.
- The color legend is visible in the bottom-left corner: four colored squares with "You", "Zhao", "Consortium", "Prophet".
- The map can be panned by dragging and zoomed by scrolling.

**If the map doesn't show geographic shapes:** Check GeoJSON data loading, D3 projection setup, and SVG rendering.

**If territories are uniform hexagons instead of irregular shapes:** The old territory rendering is still active. The overhaul must replace the hex grid with the GeoJSON-based D3 map.

**If territory names are missing:** Check that territory name labels are rendered at the territory centroids with the correct font and opacity.

**If the color legend is missing:** Check the legend component. Verify it's positioned bottom-left with the correct colors.

---

### Step 3: Territory Hover Data Callout

**Action:** Hover the mouse over any territory. Hold for a moment.

**Expected Result:**
- After a brief delay, a small floating card appears near the territory.
- The card shows the territory name, then four rows with dimension icons, owner names, and values.
- A thin line connects the card to the territory.
- Moving the mouse away makes the card disappear immediately.

**If no callout appears:** Check the hover event handler on territory SVG paths. Check the delay (150ms).

**If the callout shows wrong data:** Check that dimension table subscriptions are delivering current ownership data.

**If the leader line is missing:** Check the SVG line element connecting callout to territory centroid.

---

### Step 4: Territory Ownership Patterns

**Action:** Look at several different territories. Find one owned by multiple players.

**Expected Result:**
- Territories with one owner across all dimensions: solid player color, no visible patterns.
- Territories with multiple owners: visible texture patterns combining. Diagonal lines for Military, dots for Economic, crosshatch for Cultural, small circles for Covert.
- Patterns are subtle — visible on inspection but not screaming.
- Unified territories (one player owns all four dimensions): solid color with a subtle gold border.

**If patterns don't appear:** Check D3 procedural pattern generation. Check that pattern rendering is tied to dimension ownership data.

**If patterns are too prominent or too faint:** Adjust pattern opacity (should be 40% of owner color).

**If small territories look cluttered:** Check the small territory rule (reduce density by 50% for territories under 2000 square pixels).

---

### Step 5: Card Stacks

**Action:** Look at the bottom center of the screen.

**Expected Result:**
- Three stacks of cards are visible: red-accented (Military), gold-accented (Economic), purple-accented (Covert).
- Each top card shows a geometric icon and a count number in the top-right corner.
- Cards beneath the top card are visible as offset layers, creating depth.
- The stacks have subtle shadows.
- Gaps between stacks are even.

**If stacks don't appear:** Check the card stack component. Verify it receives action point data from subscriptions.

**If counts are wrong:** Check that action point values from the players table subscription are correctly mapped to each stack.

**If offset layers don't show:** Check the stack rendering logic — cards beneath should be offset 3px down and right per level.

---

### Step 6: Military Attack Arrows

**Action:** Click and hold (or start dragging) the top card of the Military stack.

**Expected Result:**
- Dashed lines appear from each of the player's adjacent territories to every valid attack target.
- Small particles travel along each line from source to target.
- Valid target territories are subtly highlighted.
- Non-valid territories remain unchanged.
- Releasing the card over empty space or an invalid target makes the arrows disappear.

**If arrows don't appear:** Check the drag-start event handler. Verify it computes valid targets from the military table and adjacency map.

**If arrows point to wrong territories:** Check the adjacency data and the valid target computation.

**If particles don't animate:** Check the D3 animation loop for particle movement along the dashed lines.

---

### Step 7: Execute a Card Action

**Action:** Drag a Military card onto a valid adjacent target territory. Release.

**Expected Result:**
- The card animates back to the stack.
- The count number decrements.
- The territory ownership updates (patterns change if ownership changed).
- The card play sound triggers (a short click).

**If the action doesn't execute:** Check the reducer call. Verify the drag-end handler calls the correct reducer with the correct parameters.

**If the count doesn't decrement:** Check the action point subscription update. The count should reflect the new action point value.

**If no sound plays:** Check the Web Audio API context. Check that the card play sound trigger fires on successful reducer calls.

---

### Step 8: Command Bar Appears

**Action:** Press the Enter key.

**Expected Result:**
- A bar slides down from the top of the screen, centered.
- It shows a gold `>` prompt on the left and a text input field.
- The placeholder text reads "Type a command or question..."
- The bar has a dark background with slight transparency.

**If the bar doesn't appear:** Check the keydown event listener for Enter. Check that the command bar component mounts on keypress.

**If the bar appears in the wrong position:** Check CSS positioning — should be top center, 60% width, 12px from top.

**If the `>` prompt is wrong color:** Should be #d4a843 (gold).

---

### Step 9: Command Bar Dropdown

**Action:** Click the `>` prompt.

**Expected Result:**
- A dropdown menu appears below the command bar.
- It has categorized sections: INTEL, CHAT, EVENTS, ADVICE.
- Each section has a small header and options.
- Hovering an option highlights it in subtle gold.
- At the bottom: "or type anything..." in italic.

**If the dropdown doesn't appear:** Check the click handler on the `>` prompt.

**If sections are missing:** Check the dropdown rendering logic for all four categories.

**If the "or type anything..." hint is missing:** Add the hint text at the bottom of the dropdown.

---

### Step 10: Open Chat via Command Bar

**Action:** Type "chat with Zhao" in the command bar and press Enter.

**Expected Result:**
- The command bar dismisses.
- A chat window appears in the bottom-right corner of the screen.
- The window header shows Zhao's portrait, name, and a close button.
- The message area shows conversation history (may be empty if this is the first chat).
- An input field is at the bottom.

**If the chat window doesn't appear:** Check the command parsing logic. "chat with Zhao" should trigger the chat window for player_id 2.

**If the window appears in the wrong position:** Check fixed positioning — bottom-right corner.

**If Zhao's portrait is missing:** Check the AI portrait asset loading. Portraits should be generated or loaded as specified.

---

### Step 11: AI Chat Response

**Action:** Type a message in the chat input. Press Enter.

**Expected Result:**
- Your message appears in the chat window, aligned right.
- Within a few seconds, Zhao responds with a message aligned left.
- Zhao's response is short — one sentence, under 100 characters.
- Zhao's portrait appears next to his message.
- The response is in character (aggressive, threatening, or strategic).

**If no response appears:** Check the real-time chat pipeline. Check the Claude API call.

**If the response is too long:** Check the AI prompt for the character limit instruction. The prompt must specify "Keep your response to one short sentence, no more than 100 characters."

**If the response is out of character:** Check Zhao's persona description in the chat prompt.

---

### Step 12: Query Visualization

**Action:** Press Enter to summon the command bar. Type "where am I weakest" and press Enter.

**Expected Result:**
- The command bar dismisses.
- Territories on the map change appearance — a heat map overlay shades them by vulnerability.
- A small text caption appears: something like "3 territories vulnerable. North Africa is your weakest position."
- After several seconds, the visualization fades and the map returns to normal.

**If no visualization appears:** Check the query pipeline. Check Claude response parsing for the visualization type and data.

**If the wrong visualization type appears:** "Where am I weakest" should produce a heat map. Check the query prompt's visualization selection logic.

**If the caption is missing:** Check that the text caption is rendered alongside the visualization.

---

### Step 13: Empty Card Stack State

**Action:** Use all action points by executing actions rapidly. Watch the card stacks.

**Expected Result:**
- When a stack's count reaches 0, the top card dims (opacity drops).
- A slow pulse animation runs on the dimmed stack — brightness subtly oscillates.
- After 4 seconds, a new card slides onto the stack, the count increments, and the stack brightens.

**If stacks don't dim:** Check the empty state styling for card stacks. Opacity should be 0.4.

**If the pulse animation doesn't run:** Check the CSS animation for the empty state. It should match the 4-second regeneration interval.

**If cards don't regenerate:** Check the action point regeneration scheduled reducer. Verify it's set to 4 seconds.

---

### Step 14: Victory Animation

**Action:** Play the game until the player unifies 5 territories. (Temporarily lower the win threshold for faster testing.)

**Expected Result:**
- When the fifth territory unifies, a ring of the player's color expands from that territory across the map.
- After the shockwave, all territories pulse gently in the player's color.
- After a brief pause, a "Victory" overlay appears — centered card with gold text.
- The victory sound plays (ascending three-note sequence).

**If the shockwave doesn't appear:** Check the victory animation trigger in the win condition handler. Check the SVG/CSS animation for the expanding ring.

**If the overlay doesn't appear:** Check the victory overlay component. It should render after a 1-second pause.

**If no sound plays:** Check the victory sound trigger in the Web Audio API.

---

### Step 15: Defeat Animation

**Action:** Start a new game. Allow an AI opponent to win. (Or temporarily force an AI victory.)

**Expected Result:**
- The territory that sealed the loss is highlighted with a pulsing border in the opponent's color.
- All other territories dim.
- After 2 seconds, a "Defeat" overlay appears.
- The losing territory name is shown.
- The defeat sound plays (descending two-note sequence).

**If the territory isn't highlighted:** Check the defeat animation trigger. The losing territory should be identified from the game state at the moment of loss.

**If territories don't dim:** Check the dimming animation — all non-losing territories should reduce to 40% brightness.

**If no sound plays:** Check the defeat sound trigger.

---

## 3. TRIAGE TABLE

| Step | Symptom | Most Likely Cause | Check |
|------|---------|-------------------|-------|
| 1 | No title screen | Component not mounted | App.tsx — title screen should render on initial load |
| 1 | Title doesn't fade | CSS animation missing | Check fade-out animation duration and trigger |
| 2 | Hexagons instead of geographic map | Old rendering still active | Map component — must use D3 GeoJSON, not hex grid |
| 2 | Map is blank | GeoJSON data not loaded | Check GeoJSON file loading, D3 projection |
| 2 | No color legend | Legend component missing | Check bottom-left corner rendering |
| 3 | No hover callout | Hover event not bound | Territory SVG paths — add mouseenter/mouseleave |
| 3 | Wrong data in callout | Subscription data not passed | Check dimension table subscriptions |
| 4 | No patterns on territories | D3 pattern generation not running | Check procedural pattern code |
| 4 | Patterns wrong color | Color mapping error | Pattern color should match dimension owner's player color |
| 4 | Small territories unreadable | Small territory rule not applied | Check area calculation and density reduction |
| 5 | Card stacks missing | Component not rendered | App.tsx — verify card stack component |
| 5 | Wrong count on stacks | Action point data not connected | Players table subscription |
| 6 | No attack arrows | Drag-start handler missing | Military card drag event |
| 6 | Arrows point wrong | Adjacency data incorrect | Check adjacency map and valid target logic |
| 7 | Action doesn't execute | Reducer not called | Drag-end handler, reducer call |
| 7 | No card play sound | Web Audio not initialized | Check AudioContext creation, trigger condition |
| 8 | Command bar doesn't appear | Keydown listener missing | App.tsx — Enter key handler |
| 8 | Command bar wrong size/position | CSS incorrect | Check width (60%), position (top center), height (44px) |
| 9 | Dropdown doesn't appear | Click handler on `>` missing | Command bar component |
| 9 | Dropdown missing sections | Rendering logic incomplete | Check all four categories rendered |
| 10 | Chat window doesn't open | Command parsing wrong | "chat with Zhao" should map to player_id 2 |
| 10 | Chat window wrong position | CSS positioning | Should be bottom-right, fixed |
| 11 | AI doesn't respond | Real-time chat pipeline broken | Check Claude API call for chat |
| 11 | AI response too long | Character limit not in prompt | Add limit instruction to AI chat prompt |
| 12 | No visualization | Query pipeline broken | Check Claude response, visualization renderer |
| 12 | Wrong visualization type | Type selection wrong | Check query prompt's visualization selection |
| 13 | Stacks don't dim at zero | Empty state styling missing | Card stack component — opacity 0.4 when count=0 |
| 13 | Cards don't regenerate | Regeneration interval wrong | Check scheduled reducer (should be 4s) |
| 14 | No victory shockwave | Animation not triggered | Win condition handler |
| 14 | No victory sound | Sound trigger missing | Web Audio API — victory sequence |
| 15 | No defeat highlight | Defeat animation not triggered | Game end handler for opponent victory |
| 15 | No defeat sound | Sound trigger missing | Web Audio API — defeat sequence |

---

## 4. POST-VALIDATION FIX PRIORITIES

### Priority 1: Showstopper Bugs

- Game doesn't load (white screen, crash).
- Map doesn't render.
- Cards can't be dragged or actions don't execute.
- Command bar doesn't work.
- Any regression that breaks existing game logic.

### Priority 2: Visual Accuracy

- Territory patterns match AESTHETIC.md v2.0 specifications (correct pattern types, colors, opacity).
- Colors match the palette exactly (hex codes in Section 1 of AESTHETIC.md v2.0).
- Fonts load correctly (JetBrains Mono for data, Inter for UI).
- Card stack dimensions, spacing, and depth are correct.
- Command bar size, position, and styling are correct.
- Chat window size and layout are correct.
- Color legend shows correct colors and names.

### Priority 3: Interaction Fidelity

- Command bar summons and dismisses correctly.
- Dropdown opens on `>` click and shows all categorized options.
- Chat windows open, display messages, and respond to input.
- AI responses are within the 100-character limit.
- Query visualizations render the correct type for the question.
- Attack arrows appear on Military card pickup and disappear on drop.
- Overlays respect fixed positions (chat bottom-right, intel top-right, events top-center, advice top-left).
- Card stack empty state dims and pulses correctly.

### Priority 4: Animation Quality

- All transitions use specified durations and easing.
- Victory shockwave expands smoothly across the map.
- Defeat dimming and highlight work correctly.
- Title screen fades in and out smoothly.
- Command bar slide animation is smooth.
- Chat window fade-in is smooth.

### Priority 5: Sound

- All five sound triggers fire at the correct moments.
- Volumes are appropriate (not too loud, not inaudible).
- No audio glitches or pops.
- Web Audio API context is created once and reused.

### Priority 6: Polish

- Title screen timing feels right (2-second hold is comfortable).
- Overlay opacities feel right (not too dark, not too faint).
- Color legend is readable but unobtrusive.
- Card stack depth reads clearly as stacked cards.
- Territory patterns are visible but not overwhelming.
- Territory names are readable at their low opacity.

---

## 5. READINESS GATE

Before the game is shown to judges, all of the following must be true:

1. **All 15 test steps pass** with no errors or workarounds.
2. **Map renders with geographic shapes**, territory patterns, hover callouts, and color legend.
3. **Card stacks function correctly** — drag, count decrement, empty state dim/pulse, regeneration animation.
4. **Command bar** summons on Enter, shows dropdown on `>` click, accepts text input, handles unrecognized input with shake.
5. **Chat windows** open via command bar, display messages, AI responds within 100 characters, close properly.
6. **Query visualizations** render on the map in response to natural language questions.
7. **Attack arrows** appear on Military card pickup and disappear on drop.
8. **Victory and defeat animations** play completely with sound.
9. **All sound triggers** fire for card play, territory flip, cultural pressure, victory, and defeat.
10. **No overlay covers** the card stacks or command bar.
11. **Title screen** fades correctly on load.
12. **All existing game logic** functions unchanged — actions, AI cycles, cultural spread, intel, chat system.
13. **Server compiles** with `cargo build` — zero errors.
14. **Client compiles** with `npm run build` — zero errors.
15. **No known showstopper bugs.**

If any condition is not met, fix it before the demo.

---

## 6. MANUAL ITERATION NOTES

- **Visual comparison:** Keep AESTHETIC.md v2.0 open during validation. Compare every element against the spec. Colors, sizes, fonts, spacing — everything is specified exactly.
- **D3 debugging:** If territory rendering or patterns aren't working, check the browser console for D3 errors. Verify GeoJSON data is valid. Check that the SVG container is properly sized.
- **Sound testing:** Use headphones during sound validation. The cultural pressure sounds are very quiet by design — they should be barely perceptible.
- **Performance check:** On a lower-powered machine, verify that animations don't stutter. If they do, the animation system should simplify (the spec includes a frame rate check at 30fps).
- **Demo dry run:** After all 15 steps pass, do one full playthrough as if it were the demo. Follow the demo arc from UX_OVERHAUL_DECISIONS.md. Note anything that feels slow, awkward, or confusing.

---

## 7. FINAL NOTE

This is the last validation document. After the overhaul passes all checks, Risk: Dominion is complete — mechanically deep, visually stunning, and ready for judges.

The journey from the original Slice 1 hex grid to this overhaul:
- The map now looks like a real world, not a board game.
- The interface is two elements — map and cards — not a dozen panels.
- The command bar unifies every non-action interaction into one input.
- The AI has a face, a voice, and a personality.
- Queries produce visualizations, not text walls.
- Victory and defeat have emotional weight.
- Sound makes the game feel physical.

Validate. Polish. Demo. Win.

---

## End of UX Overhaul Implementation Strategy

This is the final validation document. After this, the game is ready for judges.