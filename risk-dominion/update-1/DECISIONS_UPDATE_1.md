# UX_OVERHAUL_DECISIONS.md — Risk: Dominion

## Version 1.0
## Scope: Complete UI/UX Overhaul — All Slices
## Outputs: AESTHETIC.md v2.0 (updated), UIUX.md (new)

---

## 0. WHY THIS EXISTS

The current game is technically impressive but visually confusing. Players don't understand the four quadrants. The AI opponents are faceless numbers. Text clutters every surface. The hex grid doesn't look like a map. The interface shouts information from a dozen different places.

This document contains every design decision for a complete visual and interaction overhaul. It does not change how the game works. It changes how the game looks, feels, and responds to the player.

After this document is approved, two implementation documents will be created: an updated AESTHETIC.md with exact visual specifications, and a new UIUX.md with interaction patterns and component behavior.

---

## 1. VISUAL PHILOSOPHY: ALIVE INTELLIGENCE

The game looks like satellite imagery with tactical overlays — muted earth tones, thin lines, structured data. But it feels like a living world. Territories shake on impact. Victories pulse across the map. AI opponents have visible emotional states. The map breathes.

The player is an analyst with power — observing a real-feeling world, reaching into it, and making things happen. Every action has satisfying feedback. Every moment of tension resolves with drama. The game is fun to touch, not just to look at.

Information reveals itself in layers. The map is the interface. The player pulls detail when they want it. Text supports. Visualizations answer. Animation tells the story.

---

## 2. VISUAL SYSTEM

### Color Palette

The colors are restrained enough to feel like an intelligence feed, but warm enough to feel like a game.

- Background: deep charcoal, not black
- Landmass: dark olive-gray
- Territory borders: thin, muted
- Player 1 (human): muted steel blue
- Player 2 (Zhao): muted brick red
- Player 3 (Consortium): muted amber
- Player 4 (Prophet): muted violet
- Highlights and selections: tarnished gold
- Success and confirmation: muted green
- Text: warm off-white for primary, muted gray-green for secondary
- Temporary surfaces like chat windows: near-black with slight transparency

Ownership colors are distinct without being neon. Gold ties everything together — it is the color of importance, of "look here." Exact hex codes will be specified in AESTHETIC.md v2.0.

### Typography

Two fonts. No display fonts. No futuristic geometric type.

- **JetBrains Mono** for all data: numbers, timestamps, query input, chat messages, tooltip content. Monospaced, technical, precise. It signals "this is information."
- **Inter** for all UI labels: territory names, headers, AI names. Clean sans-serif, neutral, highly readable at small sizes. It signals "this is interface."

Exact sizes and weights will be specified in AESTHETIC.md v2.0.

### Territory Rendering

The map is a full world map with actual geographic continent shapes — Americas, Europe, Africa, Asia, Oceania. Each continent is divided into territories using irregular, jagged borders that follow natural geography. The territories are polygonal facets that fit together within the continent outlines. The overall effect is a low-poly world map where each facet is a territory.

Each territory is divided into four quadrants using an X-split pattern that adapts to the irregular shape. Each quadrant contains a small geometric icon representing its dimension:
- Military: chevron
- Economic: circle with vertical line
- Cultural: open book shape
- Covert: concentric circles

Icons are always visible, small, and rendered in the owning player's color. Empty quadrants are dark neutral.

Territory names appear at very small size and low opacity. They brighten on hover. They are always present for spatial orientation but never demand attention.

Hovering a territory shows a data callout — a small floating card with troop counts, capital, influence percentages, and agent counts. A thin leader line connects the callout to the territory.

The map is pannable by dragging and zoomable by scrolling. It extends beyond the viewport. Subtle edge fades indicate more map is available.

### AI Portraits

Each AI commander has an illustrated character portrait. Each subordinate has their own portrait, visually related to their commander but distinct. Portraits appear in chat windows and intel displays. They are small and rendered in a consistent illustrative style — stylized character art with muted tones, like illustrations in a premium strategy game.

Portraits subtly animate to reflect emotional state. Zhao's expression hardens when aggressive. The Consortium's eyes narrow when calculating. The Prophet's face becomes more enigmatic. These are not cartoonish animations. They are quiet, deliberate shifts.

### Card Stacks

The card hand is three stacks of cards at the bottom center of the screen. Military (red, chevron icon). Economic (gold, currency icon). Covert (purple, concentric circles icon).

Each stack appears as a small pile — the top card fully visible, additional cards visible as slightly offset layers beneath. The top card shows the dimension icon prominently and a number indicating how many cards are available.

When a card is used, the top card animates away and the stack shrinks. When action points regenerate, a card slides onto the top of the stack. Cards are compact — small enough to not dominate the map but large enough to read and interact with.

Dragging from the top card of any stack executes that action. When a Military card is picked up, valid attack targets highlight on the map and animated arrows appear from the player's adjacent territories pointing toward potential targets. The arrows are thin, dashed lines in the player's color with a pulse traveling from source to target.

When the player has zero action points, all stacks appear dimmed with a subtle slow pulse — a visual indicator that regeneration is in progress. When points regenerate, the stacks brighten and counts increment.

### Color Legend

A small legend lives in one corner of the map. Four small squares with names: Player (blue), Zhao (red), Consortium (amber), Prophet (violet). Small, low opacity, always visible. Like a map legend on an atlas. The player always knows who is who.

---

## 3. INTERACTION PATTERNS

### The Unified Command Bar

The command bar is the single point of interaction for everything beyond playing cards. It is hidden by default. Pressing Enter or T summons it — a text input with a gold `>` prompt at the top of the screen.

The player can type anything:
- Strategic questions: "Where am I weakest?"
- Navigation: "Show me Zhao's plans"
- Communication: "Chat with Consortium"
- Information: "What's happening?"
- Advice: "How am I doing?"

Clicking the `>` prompt opens a dropdown menu of common commands. This teaches the player what is possible. Selecting a command executes it. The dropdown and the text input produce the same results. One is for learning. One is for speed.

When the command bar does not understand an input, it responds with a subtle shake animation and a brief message: "I didn't understand that. Try 'help' for options."

### Query Results

When the player asks a question, the answer appears as a visualization overlaid directly on the map. Heat maps shade territories by intensity. Flow lines animate between territories. Symbols appear on relevant territories. Bar charts or comparison tables appear as temporary overlays in open map space. Everything renders on the map itself, not in a separate panel.

A small text caption accompanies the visualization — the headline, not the full explanation. The visualization shows the answer. The caption frames it.

Visualizations fade after several seconds or when the player clicks away. The command bar remains available for follow-up questions.

### Chat

Chat is accessed exclusively through the command bar. Typing "chat with Zhao" or "talk to Consortium" opens a temporary chat window overlaid on the map near that AI's territory. The window shows conversation history and an input field. The player types messages directly in the window. Closing the window dismisses it entirely.

A small notification dot appears near the `>` prompt when any AI has sent a new message. The player checks chat on their terms.

Chat responses from AIs are independent of their action plans. The map shows what the AI is doing. Chat shows who the AI is. They do not need to align.

### Panels and Overlays

There are no persistent panels. No sidebar. No slide-out drawers. No floating alert cards. Everything — chat windows, intel displays, event notifications, query visualizations — is a temporary overlay summoned through the command bar.

All overlays respect a simple rule: they never cover the card stacks or the command bar. If an overlay would appear behind or on top of these elements, it shifts to the nearest open space on the map.

### Persistent UI

Only two elements are always visible: the map and the card stacks. The command bar is hidden until summoned. Everything else is temporary. When all overlays are dismissed, the map returns to its clean state.

---

## 4. EMOTIONAL DESIGN

### Arrival

When the game loads, the title "Risk: Dominion" appears for two seconds — Inter, muted gold, centered on screen. The map is already live behind it. The fade reveals a world already in motion. The player arrives, not the game.

### Game Feel

Action points regenerate every four seconds. The faster pace keeps the game energetic. The player always has something to do soon.

The pre-seeded board state is natural — as if the player had started from turn one. No artificial drama. The player creates the story through their actions.

### Victory

When the fifth territory unifies, a shockwave pulse radiates from that territory across the entire map. The winner's color spreads in a wave. AI portraits show defeat expressions. A brief pause — one beat — then the victory overlay appears. The map continues pulsing gently beneath. The victory feels earned.

### Defeat

The territory that sealed the loss is highlighted and pulsing in the opponent's color. The map dims slightly except for that territory. A brief pause — the player sees what happened and feels it. Then the defeat overlay appears. The loss has weight.

### Post-Game

The command bar remains active after the game ends. The player can type "show me what happened" or "how did I do." The game is over, but the interface is still alive.

---

## 5. SOUND DESIGN

Sound uses minimal synthesized tones via the Web Audio API. No background music. No ambient loops. Sound punctuates moments. It does not fill silence.

- Subtle click when a card is played — short, satisfying
- Low thud when a territory flips ownership — weighty, consequential
- Rising tone as cultural pressure builds toward a flip — tension
- Short fanfare on victory — triumphant, brief
- Low descending tone on defeat — weighty, final

---

## 6. WHAT IS NOT CHANGING

Game mechanics are untouched. This overhaul does not change:
- How combat works
- How economic investment works
- How cultural spread works
- How covert operations and intel work
- How AI reasoning works
- How trust scores work
- How victory is calculated
- How the database stores state
- How subscriptions deliver updates

This is a visual and interaction overhaul only. The game plays the same way. It looks and feels completely different.

---

## 7. WHAT IS NOT INCLUDED

The following features were considered and explicitly excluded from this overhaul due to time constraints:
- Accessibility toggles for high contrast or reduced motion
- Territory comparison by locking tooltips
- Persistent victory progress indicators
- A sidebar for communication
- AI action-chat consistency tracking
- A detailed help system
- Endgame interruption handling for open overlays

---

## 8. SUMMARY OF ALL LOCKED DECISIONS

| # | Decision |
|---|----------|
| 1 | Visual philosophy is Alive Intelligence |
| 2 | Three-layer information hierarchy |
| 3 | Satellite Intelligence color palette with warmth |
| 4 | JetBrains Mono for data, Inter for UI |
| 5 | Geographic low-poly world map with irregular territory facets |
| 6 | Territory names always visible, small and low-opacity, brighten on hover |
| 7 | Three card stacks at bottom center with visual stacking and counts |
| 8 | Illustrated AI portraits for commanders and subordinates |
| 9 | Chat accessed exclusively through command bar, appears as temporary overlay |
| 10 | Unified command bar for all non-card interactions |
| 11 | No sidebar or persistent panels |
| 12 | Query results as map overlays with text captions |
| 13 | Game starts in natural state, no artificial drama |
| 14 | Victory shockwave pulse, defeat territory highlight and dim |
| 15 | Demo arc: Hook, Action, Question, Conversation, Visualization, Close |
| 16 | Chat exclusively through command bar, notification dot on new messages |
| 17 | Persistent UI is map and card stacks only |
| 18 | Sound via Web Audio API, minimal synthesized tones |
| 19 | No accessibility toggles |
| 20 | No territory comparison feature |
| 21 | Action point regeneration every 4 seconds |
| 22 | AESTHETIC.md updated to v2.0, new UIUX.md created |
| 23 | Chat independent of AI action plans |
| 24 | Command bar has no special animation, always static |
| 25 | Command bar hidden by default, Enter or T to summon |
| 26 | No persistent victory progress indicator |
| 27 | Command bar shake animation on unrecognized input |
| 28 | Card stacks dimmed with pulse when empty |
| 29 | Military pickup shows attack arrows and valid target highlights |
| 30 | Natural starting board state |
| 31 | Brief title card on load |
| 32 | Color legend integrated into map corner |

---

## End of UX_OVERHAUL_DECISIONS.md

This document contains every design decision for the overhaul. It does not contain exact hex codes, pixel values, animation durations, or component specifications. Those belong to AESTHETIC.md v2.0 and UIUX.md.

Generate those documents next.