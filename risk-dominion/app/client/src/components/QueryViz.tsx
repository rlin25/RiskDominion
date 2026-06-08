import type { CSSProperties } from "react";
import { LEGEND } from "../constants";
import type { VizSpec } from "../types";

interface QueryVizProps {
  viz: VizSpec;
  onDismiss: () => void;
}

// Map a row label to a player color when it names a known player; else gold.
function labelColor(label: string): string {
  const lower = label.toLowerCase();
  const match = LEGEND.find((p) => lower.includes(p.name.toLowerCase()));
  return match ? match.color : "#d4a843";
}

const CARD_STYLE: CSSProperties = {
  background: "rgba(30,33,32,0.92)",
  border: "1px solid #3a3f3c",
  borderRadius: 6,
  padding: 12,
};

// Renders the NON-map part of a query result (the map highlights are drawn by
// Map.tsx). Positioned top-right so it never overlaps the command bar
// (top-center) or the card stack (bottom-center).
export function QueryViz({ viz, onDismiss }: QueryVizProps) {
  const bars =
    viz.type === "bar"
      ? viz.rows.map((r) => ({ label: r[0] ?? "", value: Number(r[1]) }))
      : [];
  const maxBar = bars.reduce((m, b) => Math.max(m, Number.isFinite(b.value) ? b.value : 0), 0) || 1;

  return (
    <div
      className="animate-fade-in fixed z-40 flex flex-col gap-2"
      style={{ top: 70, right: 16, width: 280 }}
    >
      {/* Caption card */}
      <div style={CARD_STYLE} className="flex items-start gap-2">
        <span
          className="flex-1"
          style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: "#c5c9c6" }}
        >
          {viz.caption}
        </span>
        <button
          type="button"
          onClick={onDismiss}
          className="leading-none hover:text-text-primary"
          style={{ fontFamily: "Inter, sans-serif", fontSize: 14, color: "#7d827e" }}
          aria-label="Dismiss"
        >
          ×
        </button>
      </div>

      {/* Bar chart */}
      {viz.type === "bar" && bars.length > 0 && (
        <div style={CARD_STYLE} className="flex flex-col gap-1.5">
          {bars.map((b, i) => {
            const pct = Math.max(0, (b.value / maxBar) * 100);
            const color = labelColor(b.label);
            return (
              <div key={i} className="flex flex-col gap-0.5">
                <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 10, color: "#c5c9c6" }}>
                  {b.label} ({Number.isFinite(b.value) ? b.value : "-"})
                </span>
                <div style={{ height: 12, background: "#2a2d2c", borderRadius: 2 }}>
                  <div
                    style={{
                      height: 12,
                      width: `${pct}%`,
                      background: color,
                      borderRadius: 2,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Table */}
      {viz.type === "table" && viz.rows.length > 0 && viz.columns.length > 0 && (
        <div style={CARD_STYLE}>
          <div
            className="flex"
            style={{ borderBottom: "0.5px solid #d4a843", paddingBottom: 2 }}
          >
            {viz.columns.map((c, i) => (
              <span
                key={i}
                className="flex-1"
                style={{ fontFamily: "Inter, sans-serif", fontSize: 10, color: "#d4a843" }}
              >
                {c}
              </span>
            ))}
          </div>
          {viz.rows.map((r, ri) => (
            <div
              key={ri}
              className="flex"
              style={{ borderBottom: "0.5px solid #3a3f3c", padding: "2px 0" }}
            >
              {r.map((cell, ci) => (
                <span
                  key={ci}
                  className="flex-1 break-words"
                  style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 10, color: "#c5c9c6" }}
                >
                  {cell}
                </span>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Heatmap legend */}
      {viz.type === "heatmap" && (
        <div style={CARD_STYLE} className="flex items-center gap-2">
          <div
            style={{
              flex: 1,
              height: 8,
              borderRadius: 4,
              background: "linear-gradient(90deg, #2a2d2c, #d4a843)",
            }}
          />
          <span style={{ fontFamily: "Inter, sans-serif", fontSize: 9, color: "#7d827e" }}>
            low &gt; high
          </span>
        </div>
      )}
    </div>
  );
}
