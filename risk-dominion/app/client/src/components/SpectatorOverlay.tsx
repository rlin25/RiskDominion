import { AI_PLAYERS, PLAYER_COLORS } from "../constants";
import { getTerritoryName } from "../utils/territoryHelpers";
import type {
  TerritoryState,
  PlayerRow,
  AIStateRow,
  AiTrustRow,
  EventFeedRow,
} from "../types";

interface Props {
  territories: TerritoryState[];
  players: readonly PlayerRow[];
  aiState: readonly AIStateRow[];
  aiTrust: readonly AiTrustRow[];
  eventFeed: readonly EventFeedRow[];
}

const ALL_PLAYERS = [
  { id: 1, name: "Player", color: PLAYER_COLORS[1] },
  ...AI_PLAYERS,
];

export function SpectatorOverlay({ territories, players, aiState, aiTrust, eventFeed }: Props) {
  const unified = (pid: number) =>
    territories.filter(
      (t) =>
        t.militaryOwner === pid &&
        t.economicOwner === pid &&
        t.culturalOwner === pid &&
        t.covertOwner === pid,
    ).length;

  const dominance = (pid: number, dim: keyof TerritoryState) =>
    Math.round((territories.filter((t) => t[dim] === pid).length / 12) * 100);

  const hotspots = [...territories]
    .filter((t) => t.culturalOwner !== 0 && t.culturalOwner !== t.militaryOwner && t.influencePct > 0)
    .sort((a, b) => b.influencePct - a.influencePct)
    .slice(0, 3);

  const recent = [...eventFeed]
    .sort((a, b) => Number(a.eventAt) - Number(b.eventAt))
    .slice(-3)
    .reverse();

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="border-b border-[#334455] py-2">
      <h3 className="mb-1 font-ui text-[11px] text-text-accent">{title}</h3>
      <div className="font-data text-[10px] text-text-primary">{children}</div>
    </div>
  );

  return (
    <div className="w-[260px] overflow-y-auto border-l border-[#334455] bg-bg-surface/90 px-3">
      <Section title="Unified Territories">
        {ALL_PLAYERS.map((p) => (
          <div key={p.id} className="flex justify-between">
            <span style={{ color: p.color }}>{p.name}</span>
            <span>{unified(p.id)} / 5</span>
          </div>
        ))}
      </Section>

      <Section title="Dimension Dominance">
        {(["militaryOwner", "economicOwner", "culturalOwner", "covertOwner"] as const).map((dim) => (
          <div key={dim} className="mb-0.5">
            <span className="text-text-secondary">{dim.replace("Owner", "")}: </span>
            {ALL_PLAYERS.map((p) => (
              <span key={p.id} style={{ color: p.color }} className="mr-1">
                {dominance(p.id, dim)}%
              </span>
            ))}
          </div>
        ))}
      </Section>

      <Section title="AI Trust (toward Player)">
        {AI_PLAYERS.map((ai) => {
          const row = aiTrust.find((t) => t.aiPlayerId === ai.id && t.targetPlayerId === 1);
          return (
            <div key={ai.id} className="flex justify-between">
              <span style={{ color: ai.color }}>{ai.name}</span>
              <span>{row ? row.trustScore : 50}/100</span>
            </div>
          );
        })}
      </Section>

      <Section title="Cultural Hotspots">
        {hotspots.length === 0 ? (
          <span className="text-text-secondary">None</span>
        ) : (
          hotspots.map((t) => (
            <div key={t.territoryId} className="flex justify-between">
              <span>{getTerritoryName(t.territoryId)}</span>
              <span style={{ color: PLAYER_COLORS[t.culturalOwner] ?? "#8899AA" }}>{t.influencePct}%</span>
            </div>
          ))
        )}
      </Section>

      <Section title="AI Status">
        {aiState.map((s) => {
          const ai = AI_PLAYERS.find((a) => a.id === s.aiPlayerId);
          return (
            <div key={s.aiPlayerId} className="flex justify-between">
              <span style={{ color: ai?.color }}>{ai?.name ?? s.aiPlayerId}</span>
              <span className="text-text-secondary">
                {s.cycleStatus === "pending" ? "thinking..." : "idle"}
              </span>
            </div>
          );
        })}
      </Section>

      <Section title="Recent Events">
        {recent.map((e) => (
          <div key={String(e.id)} className="mb-1 leading-snug">
            {e.eventText}
          </div>
        ))}
      </Section>

      <div className="py-1 text-center font-data text-[9px] text-text-secondary">
        {players.length} factions
      </div>
    </div>
  );
}
