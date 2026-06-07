interface Props {
  winner: string;
  didWin: boolean;
  winnerColor: string;
}

export function VictoryScreen({ winner, didWin, winnerColor }: Props) {
  return (
    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center"
      style={{ background: "radial-gradient(ellipse at center, rgba(13,10,6,0.88) 40%, rgba(0,0,0,0.97) 100%)" }}
    >
      <div className="animate-victory-reveal flex flex-col items-center gap-5">

        {/* Trophy / crown SVG */}
        <svg width="90" height="80" viewBox="0 0 90 80" aria-hidden>
          {/* Crown base */}
          <rect x="15" y="58" width="60" height="10" rx="2" fill={winnerColor} opacity="0.85"/>
          {/* Crown body */}
          <polygon
            points="15,58 15,30 28,44 45,18 62,44 75,30 75,58"
            fill={winnerColor}
            opacity="0.75"
          />
          {/* Crown jewels */}
          <circle cx="45" cy="26" r="5" fill="#f0e6d0" opacity="0.95"/>
          <circle cx="22" cy="47" r="3.5" fill="#f0e6d0" opacity="0.8"/>
          <circle cx="68" cy="47" r="3.5" fill="#f0e6d0" opacity="0.8"/>
          {/* Outer glow ring */}
          <polygon
            points="15,58 15,30 28,44 45,18 62,44 75,30 75,58"
            fill="none"
            stroke={winnerColor}
            strokeWidth="1.5"
            opacity="0.5"
          />
        </svg>

        {/* Decorative line */}
        <div className="flex items-center gap-3">
          <div className="h-px w-16" style={{ background: `linear-gradient(90deg, transparent, ${winnerColor})` }} />
          <span style={{ color: winnerColor, fontSize: 14 }}>✦</span>
          <div className="h-px w-16" style={{ background: `linear-gradient(90deg, ${winnerColor}, transparent)` }} />
        </div>

        {/* Winner name */}
        <div className="text-center">
          <div
            style={{
              fontFamily: "Cinzel, serif",
              fontSize: 11,
              letterSpacing: "0.35em",
              color: "#9a8870",
              textTransform: "uppercase",
              marginBottom: 6,
            }}
          >
            Dominion Achieved
          </div>
          <h1
            style={{
              fontFamily: "Cinzel, serif",
              fontSize: 32,
              fontWeight: 700,
              color: winnerColor,
              textShadow: `0 0 24px ${winnerColor}88, 0 0 48px ${winnerColor}44`,
              lineHeight: 1.1,
            }}
          >
            {winner}
          </h1>
          <div
            style={{
              fontFamily: "Cinzel, serif",
              fontSize: 13,
              color: "#d4a017",
              letterSpacing: "0.2em",
              marginTop: 4,
            }}
          >
            CONQUERS ALL
          </div>
        </div>

        {/* Decorative line */}
        <div className="flex items-center gap-3">
          <div className="h-px w-16" style={{ background: `linear-gradient(90deg, transparent, ${winnerColor})` }} />
          <span style={{ color: winnerColor, fontSize: 14 }}>✦</span>
          <div className="h-px w-16" style={{ background: `linear-gradient(90deg, ${winnerColor}, transparent)` }} />
        </div>

        {/* You win / lose */}
        <p
          style={{
            fontFamily: "Orbitron, sans-serif",
            fontSize: 15,
            color: didWin ? "#2ecc71" : "#9a8870",
            letterSpacing: "0.1em",
            textShadow: didWin ? "0 0 12px #2ecc7188" : undefined,
          }}
        >
          {didWin ? "✦  VICTORY IS YOURS  ✦" : "Your campaign ends here."}
        </p>
      </div>
    </div>
  );
}
