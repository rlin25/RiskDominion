interface Props {
  playerName: string;
  playerColor: string;
}

export function PlayerIndicator({ playerName, playerColor }: Props) {
  return (
    <div className="flex items-center gap-2">
      <span
        className="inline-block h-[10px] w-[10px] rounded-full"
        style={{ backgroundColor: playerColor }}
      />
      <span className="font-ui text-[12px] text-text-secondary">
        You are {playerName}
      </span>
    </div>
  );
}
