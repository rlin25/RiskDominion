import { Territory } from "./Territory";
import { CONTINENTS } from "../constants";
import type { TerritoryState } from "../types";

interface Props {
  territories: TerritoryState[];
  highlighted: Set<number>;
  currentPlayerId: number;
}

export function Map({ territories, highlighted, currentPlayerId }: Props) {
  const byId: Record<number, TerritoryState> = {};
  for (const t of territories) byId[t.territoryId] = t;

  return (
    <div className="flex flex-1 items-center justify-center gap-10 p-6">
      {CONTINENTS.map((continent) => (
        <div
          key={continent.name}
          className="grid grid-cols-2 gap-x-2 gap-y-3 rounded-2xl bg-white/[0.015] p-4"
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
      ))}
    </div>
  );
}
