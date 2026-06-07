import { LEGEND } from "../constants";

// Map color key (bottom-left). Dim by default, full opacity on hover.
export function ColorLegend() {
  return (
    <div
      className="fixed z-10 flex flex-col gap-1 opacity-60 transition-opacity hover:opacity-100"
      style={{ bottom: 16, left: 16 }}
    >
      {LEGEND.map((entry) => (
        <div key={entry.id} className="flex items-center gap-1.5">
          <span
            className="rounded-sm"
            style={{ width: 10, height: 10, backgroundColor: entry.color }}
          />
          <span style={{ fontFamily: "Inter, sans-serif", fontSize: 10, color: "#7d827e" }}>
            {entry.name}
          </span>
        </div>
      ))}
    </div>
  );
}
