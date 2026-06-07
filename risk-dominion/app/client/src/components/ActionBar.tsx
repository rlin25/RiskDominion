import { MAX_ACTION_POINTS } from "../constants";

interface Props {
  actionPoints: number;
  playerColor: string;
}

export function ActionBar({ actionPoints, playerColor }: Props) {
  return (
    <div className="flex flex-col items-end gap-1">
      <span
        className="text-[8px] tracking-widest uppercase"
        style={{ fontFamily: "Cinzel, serif", color: "#9a8870" }}
      >
        Command Points
      </span>
      <div className="flex items-center gap-1">
        {Array.from({ length: MAX_ACTION_POINTS }, (_, i) => {
          const filled = i < actionPoints;
          return (
            <div
              key={i}
              className="rounded-full transition-all duration-300"
              style={{
                width: 10,
                height: 10,
                backgroundColor: filled ? playerColor : "transparent",
                border: `1.5px solid ${filled ? playerColor : "#3d3525"}`,
                boxShadow: filled ? `0 0 6px ${playerColor}88` : "none",
                transform: filled ? "scale(1)" : "scale(0.85)",
              }}
            />
          );
        })}
        <span
          className="ml-1.5 tabular-nums"
          style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 11, color: "#9a8870" }}
        >
          {actionPoints}/{MAX_ACTION_POINTS}
        </span>
      </div>
    </div>
  );
}
