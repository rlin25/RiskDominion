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
# 1. Start a local SpacetimeDB (default port 3000, matches .env)
spacetime start

# 2. Build + publish the module (from app/server)
cd server && spacetime publish risk-dominion --server local -y && cd ..

# 3. Generate client bindings (from app/)
spacetime generate --lang typescript --out-dir client/src/module_bindings --module-path server

# 4. Run the client (from app/client)
cd client && npm install && npm run dev
# Open http://localhost:5173/?player=1 and (second tab) ?player=2
```

> Port 3000 must be free. If another dev server (e.g. Next.js) is using it,
> stop that first, or start SpacetimeDB elsewhere with
> `spacetime start --listen-addr 127.0.0.1:<port>` and update `.env` to match.

`spacetime dev --client-lang typescript --module-bindings-path ./client/src/module_bindings`
(run in `server/`) auto-rebuilds, republishes, and regenerates bindings on change.

## Slice 1 (current)

Two players, two dimensions (Military, Economic). Drag action cards onto
territories: Military attacks adjacent territories; Economic invests capital.
First to unify 3 territories (owning both dimensions) wins. Action points
regenerate +1 every 8 seconds (cap 10) via a scheduled reducer.
