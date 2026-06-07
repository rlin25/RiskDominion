// Query-result -> visualization inference + command-bar parsing.
// The server query procedure returns { summary, highlightedTerritories, dataTable }.
// The frontend infers how to render that shape (DECISIONS: no server-side viz field).

import type { ParsedCommand, QueryResult, VizSpec } from "../types";

export function inferViz(result: QueryResult, queryText: string): VizSpec {
  const columns = result.dataTable.columns;
  const rows = result.dataTable.rows;

  if (rows.length > 0 && columns.length >= 2) {
    const isBar =
      columns.length === 2 &&
      rows.every((r) => {
        const n = Number(r[1]);
        return Number.isFinite(n);
      });
    return {
      type: isBar ? "bar" : "table",
      caption: result.summary,
      territories: [],
      columns: [...columns],
      rows: rows.map((r) => [...r]),
    };
  }

  const highlights = result.highlightedTerritories;
  if (highlights.length > 0) {
    const isHeatmap = /weak|vulnerab|threat|strong|influence|spread|pressure/i.test(queryText);
    const n = highlights.length;
    return {
      type: isHeatmap ? "heatmap" : "symbols",
      caption: result.summary,
      territories: highlights.map((id, index) => ({ id, value: (n - index) / n })),
      columns: [],
      rows: [],
    };
  }

  return {
    type: "table",
    caption: result.summary,
    territories: [],
    columns: [],
    rows: [],
  };
}

// Case-insensitive command parsing (UIUX §3.4). Returns the player's intent;
// App.tsx dispatches the matching overlay/action.
export function parseCommand(input: string): ParsedCommand {
  const s = input.toLowerCase();

  const has = (sub: string) => s.includes(sub);
  const aiOf = (): number | null => {
    if (has("zhao")) return 2;
    if (has("consortium")) return 3;
    if (has("prophet")) return 4;
    return null;
  };

  // Intel: an AI name + a planning keyword.
  if ((has("plan") || has("intel") || has("thinking")) && aiOf() != null) {
    return { kind: "intel", aiId: aiOf() as number };
  }

  // Chat: "chat" + an AI name.
  if (has("chat") && aiOf() != null) {
    return { kind: "chat", aiId: aiOf() as number };
  }

  // Events.
  if (has("happening") || has("events") || has("news")) {
    return { kind: "events" };
  }

  // Advice: status / progress.
  if (has("how am i doing") || has("status") || has("progress")) {
    return { kind: "advice", topic: "status" };
  }

  // Advice: attack guidance.
  if (has("attack") || has("where should i")) {
    return { kind: "advice", topic: "attack" };
  }

  // Everything else falls through to a free-form database query.
  return { kind: "query", text: input };
}
