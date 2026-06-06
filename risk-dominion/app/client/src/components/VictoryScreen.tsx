interface Props {
  winner: string;
  didWin: boolean;
  winnerColor: string;
}

export function VictoryScreen({ winner, didWin, winnerColor }: Props) {
  return (
    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-bg-root/90 transition-opacity duration-[400ms] ease-out">
      <div className="relative flex flex-col items-center justify-center">
        <svg
          width="120"
          height="105"
          viewBox="0 0 80 70"
          className="absolute opacity-40"
          aria-hidden
        >
          <polygon
            points="0,35 20,0 60,0 80,35 60,70 20,70"
            fill="none"
            stroke={winnerColor}
            strokeWidth={2}
          />
        </svg>
        <h1 className="z-10 font-ui text-[28px] text-text-accent">{winner} wins!</h1>
        <p className="z-10 mt-2 font-ui text-[16px] text-text-primary">
          {didWin ? "You win!" : "You lose."}
        </p>
      </div>
    </div>
  );
}
