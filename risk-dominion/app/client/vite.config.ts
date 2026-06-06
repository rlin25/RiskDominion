import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

// The .env lives at the risk-dominion/ root (two levels up) and is shared with
// the server tooling. Vite reads it from there and exposes only VITE_-prefixed
// vars to the browser, keeping ANTHROPIC_API_KEY out of the client bundle.
export default defineConfig({
  plugins: [react()],
  envDir: path.resolve(__dirname, "../.."),
  server: { port: 5173 },
});
