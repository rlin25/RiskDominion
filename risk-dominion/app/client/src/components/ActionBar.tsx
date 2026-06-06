import { MAX_ACTION_POINTS } from "../constants";

interface Props {
  actionPoints: number;
  playerColor: string;
}

export function ActionBar({ actionPoints, playerColor }: Props) {
  const pct = Math.max(0, Math.min(1, actionPoints / MAX_ACTION_POINTS)) * 100;
  return (
    <div className="relative h-[20px] w-[160px] overflow-hidden rounded border border-text-secondary bg-neutral">
      <div
        className="h-full transition-[width] duration-300 ease-out"
        style={{ width: `${pct}%`, backgroundColor: playerColor }}
      />
      <span className="absolute inset-0 flex items-center justify-center font-data text-[12px] text-text-primary">
        {actionPoints}/{MAX_ACTION_POINTS}
      </span>
    </div>
  );
}
