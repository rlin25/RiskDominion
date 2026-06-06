import { useState, type KeyboardEvent } from "react";
import { useProcedure } from "spacetimedb/react";
import { procedures } from "../module_bindings";
import { CANNED_QUERIES } from "../constants";
import type { QueryResult } from "../types";

interface Props {
  onResult: (result: QueryResult) => void;
  onHighlight: (ids: number[]) => void;
}

// Natural-language query bar. All three calls are *procedures* (they call Claude
// and return data, which reducers cannot do).
export function QueryBar({ onResult, onHighlight }: Props) {
  const queryDatabase = useProcedure(procedures.queryDatabase);
  const getCannedQuery = useProcedure(procedures.getCannedQuery);
  const autocompleteQuery = useProcedure(procedures.autocompleteQuery);

  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);

  function handleResult(result: QueryResult) {
    onResult(result);
    onHighlight(result.highlightedTerritories ?? []);
  }

  async function submit() {
    if (loading || text.trim().length === 0) return;
    setLoading(true);
    setSuggestions([]);
    try {
      handleResult(await queryDatabase({ query: text }));
    } catch (e) {
      console.warn("query_database:", e);
    } finally {
      setLoading(false);
    }
  }

  async function runCanned(queryId: number) {
    if (loading) return;
    setLoading(true);
    setSuggestions([]);
    try {
      handleResult(await getCannedQuery({ queryId }));
    } catch (e) {
      console.warn("get_canned_query:", e);
    } finally {
      setLoading(false);
    }
  }

  async function autocomplete() {
    try {
      const res = await autocompleteQuery({ partial: text });
      setSuggestions(res.suggestions ?? []);
    } catch (e) {
      console.warn("autocomplete_query:", e);
    }
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      void submit();
    } else if (e.key === "Tab") {
      e.preventDefault();
      void autocomplete();
    } else if (e.key === "Escape") {
      setSuggestions([]);
    }
  }

  return (
    <div className="relative border-b border-[#334455] bg-bg-surface">
      <div className="flex items-center gap-3 px-4 py-2">
        <span className="font-data text-[13px] text-text-accent">&gt;</span>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Ask anything about the game state..."
          className="flex-1 bg-transparent font-data text-[13px] text-text-primary placeholder:text-text-secondary focus:outline-none"
        />
        {loading && <span className="font-data text-[11px] text-text-secondary">querying...</span>}
        <div className="flex flex-wrap justify-end gap-1">
          {CANNED_QUERIES.map((q) => (
            <button
              key={q.id}
              onClick={() => runCanned(q.id)}
              disabled={loading}
              className="rounded-full bg-bg-surface-alt px-3 py-1 font-ui text-[11px] text-text-secondary transition-colors hover:border hover:border-highlight hover:text-text-primary disabled:opacity-50"
            >
              {q.label}
            </button>
          ))}
        </div>
      </div>

      {suggestions.length > 0 && (
        <div className="absolute left-8 top-full z-40 mt-1 w-[360px] rounded border border-[#334455] bg-bg-surface shadow-lg">
          {suggestions.map((s, i) => (
            <button
              key={i}
              onClick={() => {
                setText(s);
                setSuggestions([]);
              }}
              className="block w-full px-3 py-1.5 text-left font-data text-[12px] text-text-primary hover:bg-bg-surface-alt"
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
