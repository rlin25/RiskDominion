import { useState } from "react";
import { useProcedure } from "spacetimedb/react";
import { procedures } from "../module_bindings";
import { AI_PLAYERS } from "../constants";
import type { IntelResult } from "../types";

interface Props {
  onHighlight: (ids: number[]) => void;
}

// Calls the `get_intel` *procedure* (procedures can return data to the caller;
// reducers cannot) and shows the AI's latest reasoning when the human has enough
// agents deployed on that AI's territories.
export function IntelPanel({ onHighlight }: Props) {
  const getIntel = useProcedure(procedures.getIntel);
  const [intel, setIntel] = useState<IntelResult | null>(null);
  const [loading, setLoading] = useState<number | null>(null);

  async function ask(aiPlayerId: number) {
    setLoading(aiPlayerId);
    try {
      const res = await getIntel({ aiPlayerId });
      setIntel(res);
      onHighlight(res.territoriesReferenced ?? []);
    } catch (e) {
      console.warn("get_intel:", e);
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="flex w-[260px] flex-col gap-2 border-r border-[#334455] bg-bg-surface/60 p-3">
      <h2 className="font-ui text-[13px] text-text-accent">Intel</h2>
      {AI_PLAYERS.map((ai) => (
        <button
          key={ai.id}
          onClick={() => ask(ai.id)}
          disabled={loading !== null}
          className="rounded border border-[#334455] px-2 py-1 text-left font-ui text-[11px] text-text-secondary transition-colors hover:border-highlight hover:text-text-primary disabled:opacity-50"
        >
          <span className="mr-1 inline-block h-2 w-2 rounded-sm" style={{ backgroundColor: ai.color }} />
          {loading === ai.id ? `Querying ${ai.name}...` : `What is ${ai.name} planning?`}
        </button>
      ))}

      {intel && (
        <div className="mt-2 overflow-y-auto rounded bg-bg-surface p-2 font-data text-[11px] text-text-primary">
          <div className="mb-1 font-ui text-[11px] text-text-accent">{intel.aiPlayerName}</div>
          {intel.status === "success" ? (
            <p className="whitespace-pre-wrap leading-snug">{intel.intelText}</p>
          ) : (
            <p className="text-text-secondary">{intel.intelText}</p>
          )}
        </div>
      )}
    </div>
  );
}
