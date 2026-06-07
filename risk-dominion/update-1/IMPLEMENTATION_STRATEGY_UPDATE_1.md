# IMPLEMENTATION STRATEGY — VISUAL OVERHAUL

## Version 1.1
## Scope: Visual and Font Overhaul — All Slices
## Target: Human Team / Claude Code — After Spec Approval

---

## 0. SCOPE SUMMARY

This strategy covers validation for the visual overhaul of Risk: Dominion. The changes are targeted:
1. Swap Cinzel font for Rajdhani throughout the frontend
2. Remove emoji from continent banner labels

Everything else — hex grid, card hand, SpacetimeDB integration, game mechanics — is unchanged.

Estimated validation time: 5–10 minutes.

---

## 1. PREREQUISITES

- SpacetimeDB server running: `~/.local/bin/spacetime start --in-memory` (background)
- Module published: `~/.local/bin/spacetime publish risk-dominion --server local -y`
- Frontend dev server running: `npm run dev` in `app/client/`
- Browser open at `http://localhost:5173`

---

## 2. TEST SCRIPT

### Step 1: App Loads

**Action:** Navigate to `http://localhost:5173`.

**Expected:**
- App loads without white screen or console errors.
- Top bar shows `⚔ RISK: DOMINION` in Rajdhani (bold, slightly condensed) — NOT the thin-serif Cinzel.
- Loading screen text "ESTABLISHING COMMAND LINK..." visible briefly.

**If Cinzel still shows:** Check `index.html` for the Rajdhani link. Check `tailwind.config.js` `font-display` token. Check that `<link>` for Cinzel is removed.

---

### Step 2: Map Renders — No Emojis

**Action:** Look at the map area after load.

**Expected:**
- Three continent banners visible: "AMERICAS", "EUROPE-AFRICA", "ASIA-OCEANIA"
- No emoji characters (`⚔ 🏛 🌏`) next to continent names
- Continent text in Rajdhani, uppercase, muted gold color
- Hex grid territories render correctly with quadrant fills

**If emojis still show:** Check `Map.tsx` for the `CONTINENT_ICONS` record and its usage in the continent banner JSX. Remove the icon span or the entire `CONTINENT_ICONS` object.

---

### Step 3: Territory Labels Use Rajdhani

**Action:** Look at the labels below each hex territory.

**Expected:**
- Territory names (North America, Western Europe, etc.) in Rajdhani
- Labels are bold and semi-condensed — NOT the thin classical serif of Cinzel
- Labels readable at small size

**If Cinzel still shows:** Check `Territory.tsx` for inline `fontFamily: "Cinzel, serif"` and replace with `fontFamily: "Rajdhani, sans-serif"`.

---

### Step 4: Cards Use Rajdhani

**Action:** Look at the fanned card hand at the bottom of the screen.

**Expected:**
- Top corner sub-labels ("M", "E", "C") in Rajdhani
- Bottom action labels ("ATTACK", "INVEST", "DEPLOY") in Rajdhani bold
- Labels feel sharp and military — NOT thin-serif Cinzel
- Fan arc layout preserved: cards at varying rotation angles with overlap
- Card icons (sword, coins, eye) unchanged

**If Cinzel still shows:** Check `ActionCard.tsx` for inline `fontFamily: "Cinzel, serif"` references.

---

### Step 5: Victory Screen Uses Rajdhani

**To test:** Either play until someone wins, or temporarily force `gameState.status = 'ended'` in dev.

**Expected:**
- "Dominion Achieved" label in Rajdhani 11px
- Winner name in Rajdhani 32px bold
- "CONQUERS ALL" in Rajdhani 13px

**If Cinzel still shows:** Check `VictoryScreen.tsx` inline style `fontFamily` references.

---

### Step 6: Intel Panel Uses Rajdhani

**Action:** Open the Intel panel and click an AI query button.

**Expected:**
- "Intelligence" header in Rajdhani
- AI query button text in Rajdhani
- Result AI name in Rajdhani

**If Cinzel still shows:** Check `IntelPanel.tsx` inline style references.

---

### Step 7: Drag and Drop Functions

**Action:** Drag a card to a territory.

**Expected:**
- Card lifts, rotates 4deg, shadow intensifies
- Territory highlights gold on card hover
- Releasing over territory calls reducer correctly
- Card returns to fan position on invalid drop

Font changes must not affect dnd-kit behavior.

---

### Step 8: Build Check

**Action:** Run `npm run build` in `app/client/`.

**Expected:** Zero TypeScript or Vite errors.

---

## 3. TRIAGE TABLE

| Symptom | Most Likely Cause | Fix |
|---------|------------------|-----|
| Cinzel still shows on continent banners | Map.tsx uses `font-display` Tailwind class which still points to Cinzel | Update `tailwind.config.js` font-display token |
| Cinzel shows on card labels | `ActionCard.tsx` has inline `fontFamily: "Cinzel, serif"` | Replace inline styles with Rajdhani |
| Emojis still show on continent banners | `CONTINENT_ICONS` still referenced in Map.tsx JSX | Remove the emoji span from continent banner JSX |
| Rajdhani font not loading | `index.html` Cinzel link removed but Rajdhani link not added | Add Rajdhani Google Fonts link to `index.html` |
| Font looks like system fallback (generic sans-serif) | Google Fonts link added but name misspelled | Check exact font name: `family=Rajdhani:wght@500;600;700` |
| Build errors | TypeScript type issues | Check any changed JSX for type correctness |

---

## 4. READINESS GATE

Before implementation is complete, all of the following must be true:

1. App builds with `npm run build` — zero errors.
2. Continent banners show text only — no emoji.
3. All text that was Cinzel is now Rajdhani.
4. Hex grid map, fanned card hand, dnd-kit drag behavior — all unchanged.
5. SpacetimeDB connection, subscriptions, reducers — all unchanged.
6. No visual regressions in any component not explicitly changed.

---

## 5. SCOPE REMINDER

These changes are font and emoji only. If any other visual change seems needed, do NOT make it in this pass — record it for a future decision. The spec process exists precisely to avoid scope creep.

---

## End of Implementation Strategy v1.1
