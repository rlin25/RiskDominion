# Risk: Dominion — Application

The single, evolving Risk: Dominion application, built on **SpacetimeDB 2.4.1**.
The codebase grows slice by slice (see `../slice-N/` for each slice's design
docs); each completed slice is tagged `slice-N-complete`.

- `server/` — Rust SpacetimeDB module (single `src/lib.rs`). Reducers are
  deterministic; all external/LLM work goes through **procedures** (the only
  function type that may make HTTP calls), introduced in Slice 2.
- `client/` — React + TypeScript + Vite + Tailwind + dnd-kit. Generated
  SpacetimeDB bindings live in `client/src/module_bindings/` (committed).

## Prerequisites

- SpacetimeDB CLI **2.4.1+** (`spacetime version upgrade`)
- Rust + `wasm32-unknown-unknown` target, Node 20+
- Config in `../.env` (copy from `../.env.example`)

## Run locally

```bash
# 1. Start a local SpacetimeDB (port 3001 to match .env)
spacetime start --listen-addr 127.0.0.1:3001

# 2. Publish the module + generate client bindings (from app/)
spacetime publish risk-dominion-2 --server local3001 -y
spacetime generate --lang typescript --out-dir client/src/module_bindings --module-path server

# 3. Run the client
cd client && npm install && npm run dev
# Open http://localhost:5173/?player=1 and (second tab) ?player=2
```

`spacetime dev --client-lang typescript --module-bindings-path ./client/src/module_bindings`
(run in `server/`) auto-rebuilds, republishes, and regenerates bindings on change.

## Slice 1 (current)

Two players, two dimensions (Military, Economic). Drag action cards onto
territories: Military attacks adjacent territories; Economic invests capital.
First to unify 3 territories (owning both dimensions) wins. Action points
regenerate +1 every 8 seconds (cap 10) via a scheduled reducer.
