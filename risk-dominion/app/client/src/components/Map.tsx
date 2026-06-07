import { Territory } from "./Territory";
import { CONTINENTS } from "../constants";
import type { TerritoryState } from "../types";

const CONTINENT_ICONS: Record<string, string> = {
  "Americas":      "⚔",
  "Europe-Africa": "🏛",
  "Asia-Oceania":  "🌏",
};

interface Props {
  territories: TerritoryState[];
  highlighted: Set<number>;
  currentPlayerId: number;
}

export function Map({ territories, highlighted, currentPlayerId }: Props) {
  const byId: Record<number, TerritoryState> = {};
  for (const t of territories) byId[t.territoryId] = t;

  return (
    <div className="map-bg vignette relative flex flex-1 items-center justify-center gap-8 p-6 overflow-hidden">

      {/* World map silhouette background */}
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.055]"
        viewBox="0 0 1000 500"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden
      >
        {/* Americas */}
        <path d="M160,60 Q180,40 200,55 Q220,65 215,90 Q225,110 210,130 Q220,160 200,190 Q190,220 175,250 Q165,280 150,310 Q135,340 140,370 Q145,400 130,420 Q110,440 95,420 Q80,395 90,370 Q100,340 95,310 Q85,280 90,250 Q95,220 85,190 Q70,160 75,130 Q80,100 95,80 Q115,55 140,55 Z" fill="#d4a017"/>
        <path d="M205,80 Q230,70 250,85 Q265,100 255,125 Q245,155 230,175 Q215,195 210,220 Q205,245 195,265 Q185,240 190,215 Q195,190 205,165 Q215,140 215,115 Q212,95 205,80 Z" fill="#d4a017"/>

        {/* Europe */}
        <path d="M430,50 Q450,40 470,50 Q490,60 485,85 Q480,110 460,125 Q440,140 420,130 Q400,118 405,95 Q410,70 430,50 Z" fill="#d4a017"/>
        <path d="M460,120 Q490,110 510,125 Q525,140 515,165 Q500,185 480,190 Q460,195 445,180 Q430,163 440,145 Q448,128 460,120 Z" fill="#d4a017"/>

        {/* Africa */}
        <path d="M440,190 Q475,180 500,200 Q520,220 515,260 Q510,300 500,340 Q490,375 475,400 Q455,425 435,415 Q415,400 410,370 Q405,335 408,300 Q412,265 415,230 Q420,205 440,190 Z" fill="#d4a017"/>

        {/* Russia / Eurasia */}
        <path d="M490,40 Q560,25 640,35 Q710,45 760,60 Q800,75 820,95 Q810,115 780,120 Q740,125 700,115 Q660,105 620,110 Q580,115 545,105 Q510,95 495,75 Q487,60 490,40 Z" fill="#d4a017"/>

        {/* Asia */}
        <path d="M540,110 Q600,95 660,105 Q720,115 760,130 Q790,145 785,175 Q775,205 750,225 Q720,245 685,255 Q650,263 615,255 Q580,245 560,225 Q538,202 535,175 Q532,145 540,110 Z" fill="#d4a017"/>

        {/* South / SE Asia */}
        <path d="M590,250 Q630,240 665,250 Q695,260 700,290 Q698,320 680,340 Q655,360 625,355 Q595,348 580,325 Q565,300 570,275 Q575,255 590,250 Z" fill="#d4a017"/>

        {/* Australia */}
        <path d="M730,310 Q770,295 810,305 Q845,315 855,345 Q860,375 845,400 Q825,425 790,430 Q755,435 730,415 Q705,393 700,365 Q696,335 710,318 Q718,308 730,310 Z" fill="#d4a017"/>

        {/* Japan */}
        <path d="M800,130 Q820,120 835,130 Q848,142 840,158 Q828,170 812,165 Q797,158 797,145 Q797,134 800,130 Z" fill="#d4a017"/>
      </svg>

      {/* Decorative corner marks */}
      {["top-0 left-0", "top-0 right-0", "bottom-0 left-0", "bottom-0 right-0"].map((pos, i) => (
        <svg
          key={i}
          width="28" height="28"
          viewBox="0 0 28 28"
          className={`absolute ${pos} m-2 opacity-20`}
          aria-hidden
        >
          <line x1="0" y1="0" x2="0"  y2="14" stroke="#d4a017" strokeWidth="1.5" />
          <line x1="0" y1="0" x2="14" y2="0"  stroke="#d4a017" strokeWidth="1.5" />
        </svg>
      ))}

      {CONTINENTS.map((continent) => (
        <div key={continent.name} className="flex flex-col items-center gap-2">
          {/* Continent banner */}
          <div className="flex items-center gap-1.5 px-3 py-1 rounded"
            style={{
              background: "linear-gradient(90deg, transparent, rgba(212,160,23,0.12), transparent)",
              borderTop: "1px solid rgba(212,160,23,0.2)",
              borderBottom: "1px solid rgba(212,160,23,0.2)",
            }}
          >
            <span className="text-[13px]">{CONTINENT_ICONS[continent.name] ?? "◆"}</span>
            <span
              className="text-[10px] tracking-widest uppercase"
              style={{ fontFamily: "Cinzel, serif", color: "#9a8870", letterSpacing: "0.18em" }}
            >
              {continent.name}
            </span>
          </div>

          {/* Territory grid */}
          <div
            className="grid grid-cols-2 gap-x-3 gap-y-4 rounded-xl p-4"
            style={{
              background: "rgba(255,255,255,0.012)",
              border: "1px solid rgba(212,160,23,0.08)",
              boxShadow: "inset 0 0 40px rgba(0,0,0,0.3)",
            }}
          >
            {continent.territories.map((id) => {
              const state = byId[id];
              if (!state) return null;
              const isOwned =
                state.militaryOwner === currentPlayerId ||
                state.economicOwner === currentPlayerId;
              return (
                <Territory
                  key={id}
                  state={state}
                  isHighlighted={highlighted.has(id)}
                  isOwned={isOwned}
                />
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
