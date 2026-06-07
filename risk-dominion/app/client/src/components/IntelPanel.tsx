import { useState } from "react";
import { useProcedure } from "spacetimedb/react";
import { procedures } from "../module_bindings";
import { AI_PLAYERS, TERRITORY_NAMES } from "../constants";
import type { IntelResult } from "../types";

interface Props {
  onHighlight: (ids: number[]) => void;
}

const ACTION_LABELS: Record<string, string> = {
  military_attack: "Attack",
  economic_invest: "Invest",
  deploy_agent: "Deploy agent",
};

type ParsedAction = { actionType: string; territoryId?: number; reasoning?: string };

function mapActions(arr: unknown[]): ParsedAction[] {
  return arr
    .filter((x): x is Record<string, unknown> => !!x && typeof x === "object")
    .map((x) => ({
      actionType: String(x.action_type ?? ""),
      territoryId: typeof x.territory_id === "number" ? x.territory_id : undefined,
      reasoning: typeof x.reasoning === "string" ? x.reasoning : undefined,
    }))
    .filter((a) => a.actionType);
}

// The AI replies with a JSON array of actions, but the model frequently emits
// malformed JSON (missing keys, stray quotes), so a strict parse isn't enough.
// Try strict first, then fall back to a tolerant scan that still recovers the
// action type, territory, and embedded one-line rationale per action.
function extractActions(raw: string): ParsedAction[] {
  const text = raw.replace(/```[a-zA-Z]*/g, "").replace(/```/g, "").trim();
  try {
    const v = JSON.parse(text);
    if (Array.isArray(v)) return mapActions(v);
  } catch {
    /* malformed — fall through to tolerant scan */
  }
  const out: ParsedAction[] = [];
  const matches = [...text.matchAll(/"action_type"\s*:\s*"([^"]+)"/g)];
  for (let k = 0; k < matches.length; k++) {
    const m = matches[k];
    const start = (m.index ?? 0) + m[0].length;
    const end = k + 1 < matches.length ? (matches[k + 1].index ?? text.length) : text.length;
    const chunk = text.slice(start, end);
    const tid = chunk.match(/"territory_id"\s*:\s*(\d+)/);
    const rsn = chunk.match(/"reasoning"\s*:\s*"([\s\S]*?)"\s*[},]/);
    const reasoning = (rsn ? rsn[1] : chunk)
      .replace(/^[\s,]+/, "")
      .replace(/[}\],\s]+$/, "")
      .replace(/^"+|"+$/g, "")
      .trim();
    out.push({
      actionType: m[1],
      territoryId: tid ? Number(tid[1]) : undefined,
      reasoning: reasoning || undefined,
    });
  }
  return out;
}

// Keep only the human-readable prose: drop code fences and the JSON action blob
// (rendered separately as a list). The blob is cut whether or not it's valid
// JSON, so malformed output never leaks. Specialists reply with pure JSON, so
// this can legitimately return "".
function cleanReasoning(text: string): string {
  let out = text.replace(/```[a-zA-Z]*/g, "").replace(/```/g, "");
  const jsonStart = out.search(/\[\s*\{|\{\s*"action_type"/);
  if (jsonStart !== -1) out = out.slice(0, jsonStart);
  out = out.trim();
  // Nothing but leftover brackets/braces → no real prose.
  if (/^[[\]{}\s]*$/.test(out)) return "";
  return out;
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
          {intel.status === "success" && intel.deliberation.length > 0 ? (
            <div className="flex flex-col gap-2">
              {intel.deliberation.map((d, i) => {
                const prose = cleanReasoning(d.reasoning);
                // Prefer the server-extracted array, but fall back to scanning
                // the full reply when that's empty/unparseable.
                let actions = extractActions(d.actionsJson);
                if (actions.length === 0) actions = extractActions(d.reasoning);
                return (
                  <div key={i} className="border-b border-[#334455] pb-1 last:border-0">
                    <div
                      className={`font-ui text-[11px] ${d.subordinateId === "commander" ? "text-text-accent" : "text-text-secondary"}`}
                    >
                      {d.subordinateName} — {d.role}
                    </div>
                    {prose && <p className="whitespace-pre-wrap leading-snug">{prose}</p>}
                    {actions.length > 0 && (
                      <ul className="mt-1 flex flex-col gap-1">
                        {actions.map((a, j) => (
                          <li key={j} className="flex flex-col leading-snug">
                            <span className="text-text-accent">
                              {ACTION_LABELS[a.actionType] ?? a.actionType}
                              {a.territoryId != null &&
                                ` → ${TERRITORY_NAMES[a.territoryId] ?? `T${a.territoryId}`}`}
                            </span>
                            {a.reasoning && <span className="text-text-secondary">{a.reasoning}</span>}
                          </li>
                        ))}
                      </ul>
                    )}
                    {!prose && actions.length === 0 && (
                      <p className="italic text-text-secondary">No recommended actions.</p>
                    )}
                  </div>
                );
              })}
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
