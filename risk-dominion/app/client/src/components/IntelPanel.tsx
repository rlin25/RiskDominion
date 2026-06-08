import { useEffect, useState } from "react";
import { useProcedure } from "spacetimedb/react";
import { procedures } from "../module_bindings";
import { AI_PLAYERS, PLAYER_COLORS } from "../constants";
import type { DeliberationEntry, IntelResult } from "../types";

interface Props {
  aiId: number;
  onClose: () => void;
}

// Best-effort extraction of short recommendation tags from a deliberation
// entry's actionsJson. Falls back to nothing if the JSON is not parseable.
function recommendationTags(actionsJson: string): string[] {
  if (!actionsJson) return [];
  try {
    const parsed = JSON.parse(actionsJson);
    const list = Array.isArray(parsed) ? parsed : [parsed];
    return list
      .map((a): string => {
        if (typeof a === "string") return a;
        if (a && typeof a === "object") {
          const o = a as Record<string, unknown>;
          const kind = o.kind ?? o.type ?? o.action ?? o.dimension;
          const target = o.territory ?? o.territoryId ?? o.target;
          if (kind != null && target != null) return `${String(kind)} #${String(target)}`;
          if (kind != null) return String(kind);
        }
        return "";
      })
      .filter((s) => s.length > 0)
      .slice(0, 4);
  } catch {
    return [];
  }
}

// Calls the `get_intel` procedure for the given AI and renders that AI's most
// recent deliberation chain when the human has enough agents deployed.
export function IntelPanel({ aiId, onClose }: Props) {
  const getIntel = useProcedure(procedures.getIntel);
  const [intel, setIntel] = useState<IntelResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const ai = AI_PLAYERS.find((p) => p.id === aiId);
  const name = ai?.name ?? `Player ${aiId}`;
  const color = PLAYER_COLORS[aiId] ?? "#7d827e";
  const initial = name.charAt(0).toUpperCase();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    setIntel(null);
    getIntel({ aiPlayerId: aiId })
      .then((res) => {
        if (!cancelled) setIntel(res);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [aiId, getIntel]);

  const hasIntel =
    intel != null && intel.status === "success" && intel.deliberation.length > 0;

  return (
    <div
      className="styled-scroll animate-chat-in fixed z-50 overflow-y-auto"
      style={{
        top: 16,
        right: 16,
        width: 360,
        maxHeight: 500,
        background: "rgba(30,33,32,0.92)",
        border: "1px solid #3a3f3c",
        borderRadius: 6,
      }}
    >
      {/* Header */}
      <div
        className="sticky top-0 flex items-center gap-2 px-3 py-2"
        style={{ background: "rgba(30,33,32,0.92)", borderBottom: "0.5px solid #3a3f3c" }}
      >
        <div
          className="flex items-center justify-center rounded-full"
          style={{ width: 32, height: 32, backgroundColor: color }}
        >
          <span style={{ fontFamily: "Inter, sans-serif", fontSize: 14, color: "#ffffff" }}>
            {initial}
          </span>
        </div>
        <span
          className="flex-1"
          style={{ fontFamily: "Inter, sans-serif", fontSize: 14, fontWeight: 600, color }}
        >
          {name}
        </span>
        <button
          type="button"
          onClick={onClose}
          className="leading-none hover:text-text-primary"
          style={{ fontFamily: "Inter, sans-serif", fontSize: 16, color: "#7d827e" }}
          aria-label="Close"
        >
          ×
        </button>
      </div>

      <div className="flex flex-col gap-2 p-3">
        {loading && (
          <p style={{ fontFamily: "Inter, sans-serif", fontSize: 11, color: "#7d827e" }}>
            Gathering intelligence...
          </p>
        )}

        {!loading && (error || !hasIntel) && (
          <p style={{ fontFamily: "Inter, sans-serif", fontSize: 11, color: "#7d827e" }}>
            No intelligence available yet.
          </p>
        )}

        {!loading && hasIntel && intel != null && (
          <div className="flex flex-col gap-3">
            {intel.deliberation.map((d: DeliberationEntry, i) => {
              const isCommander = d.subordinateId === "commander";
              const tags = recommendationTags(d.actionsJson);
              return (
                <div
                  key={i}
                  className="flex flex-col gap-1"
                  style={{
                    paddingBottom: 8,
                    borderBottom: i < intel.deliberation.length - 1 ? "0.5px solid #3a3f3c" : undefined,
                  }}
                >
                  <div className="flex items-center gap-1.5">
                    <div
                      className="flex shrink-0 items-center justify-center rounded-full"
                      style={{ width: 24, height: 24, backgroundColor: color }}
                    >
                      <span style={{ fontFamily: "Inter, sans-serif", fontSize: 11, color: "#ffffff" }}>
                        {d.subordinateName.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <span
                      style={{
                        fontFamily: "Inter, sans-serif",
                        fontSize: 11,
                        fontWeight: isCommander ? 700 : 400,
                        color: isCommander ? "#d4a843" : "#c5c9c6",
                      }}
                    >
                      {d.subordinateName}
                    </span>
                    <span style={{ fontFamily: "Inter, sans-serif", fontSize: 10, color: "#7d827e" }}>
                      {d.role}
                    </span>
                  </div>
                  <p
                    className="whitespace-pre-wrap leading-snug"
                    style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 11, color: "#c5c9c6" }}
                  >
                    {d.reasoning}
                  </p>
                  {tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {tags.map((t, ti) => (
                        <span
                          key={ti}
                          className="rounded"
                          style={{
                            fontFamily: "Inter, sans-serif",
                            fontSize: 9,
                            color: "#c5c9c6",
                            background: `${color}26`,
                            padding: "1px 5px",
                          }}
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
