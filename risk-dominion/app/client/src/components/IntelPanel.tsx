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
    <div
      className="styled-scroll flex w-[260px] flex-col gap-2 p-3 overflow-y-auto"
      style={{ borderRight: "1px solid #3d3525", background: "rgba(13,10,6,0.7)" }}
    >
      <h2
        style={{ fontFamily: "Cinzel, serif", fontSize: 11, letterSpacing: "0.22em", color: "#d4a017", textTransform: "uppercase" }}
      >
        ◉ Intelligence
      </h2>
      {AI_PLAYERS.map((ai) => (
        <button
          key={ai.id}
          onClick={() => ask(ai.id)}
          disabled={loading !== null}
          className="rounded px-2 py-1.5 text-left transition-all disabled:opacity-50"
          style={{
            border: "1px solid #3d3525",
            background: "rgba(255,255,255,0.02)",
            fontFamily: "Cinzel, serif",
            fontSize: 10,
            color: "#9a8870",
            letterSpacing: "0.04em",
          }}
          onMouseEnter={e => { if (!loading) (e.currentTarget as HTMLElement).style.borderColor = "#6b5a2a"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "#3d3525"; }}
        >
          <span
            className="mr-1.5 inline-block h-2 w-2 rounded-full"
            style={{ backgroundColor: ai.color, boxShadow: `0 0 6px ${ai.color}88` }}
          />
          {loading === ai.id ? `Querying ${ai.name}…` : `What is ${ai.name} planning?`}
        </button>
      ))}

      {intel && (
        <div
          className="mt-2 overflow-y-auto rounded p-2 font-data text-[11px]"
          style={{ background: "#13110d", border: "1px solid #3d3525", color: "#f0e6d0" }}
        >
          <div className="mb-1" style={{ fontFamily: "Cinzel, serif", fontSize: 10, color: "#d4a017" }}>
            {intel.aiPlayerName}
          </div>
          {intel.status === "success" && intel.deliberation.length > 0 ? (
            <div className="flex flex-col gap-2">
              {intel.deliberation.map((d, i) => (
                <div key={i} className="border-b border-[#334455] pb-1 last:border-0">
                  <div
                    className={`font-ui text-[11px] ${d.subordinateId === "commander" ? "text-text-accent" : "text-text-secondary"}`}
                  >
                    {d.subordinateName} — {d.role}
                  </div>
                  <p className="whitespace-pre-wrap leading-snug">{d.reasoning}</p>
                </div>
              ))}
            </div>
          ) : intel.status === "success" ? (
            <p className="whitespace-pre-wrap leading-snug">{intel.intelText}</p>
          ) : (
            <p className="text-text-secondary">{intel.intelText}</p>
          )}
        </div>
      )}
    </div>
  );
}
