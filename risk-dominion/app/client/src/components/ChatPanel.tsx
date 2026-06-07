import { useMemo, useState, type KeyboardEvent } from "react";
import { AI_PLAYERS, PLAYER_COLORS, MAX_CHAT_MESSAGE_LENGTH } from "../constants";
import { getTerritoryName } from "../utils/territoryHelpers";
import type { ChatLogRow } from "../types";

type Tab = 0 | 2 | 3 | 4; // 0 = global, 2-4 = DM with that AI

const PLAYER_NAMES: Record<number, string> = {
  1: "Player",
  ...Object.fromEntries(AI_PLAYERS.map((p) => [p.id, p.name])),
};

function senderName(id: number): string {
  return PLAYER_NAMES[id] ?? `Player ${id}`;
}

interface Props {
  messages: readonly ChatLogRow[];
  currentPlayerId: number;
  onSendMessage: (text: string, recipientId: number) => void;
  onTerritoryClick: (territoryId: number) => void;
  mode?: "player" | "spectator" | "replay";
  currentTimestamp?: number | null;
}

export function ChatPanel({
  messages,
  currentPlayerId,
  onSendMessage,
  onTerritoryClick,
  mode = "player",
  currentTimestamp = null,
}: Props) {
  const [tab, setTab] = useState<Tab>(0);
  const [text, setText] = useState("");

  const shown = useMemo(() => {
    let list = [...messages].sort((a, b) => Number(a.timestamp) - Number(b.timestamp));
    if (currentTimestamp != null) {
      list = list.filter((m) => Number(m.timestamp) <= currentTimestamp);
    }
    if (tab === 0) return list.filter((m) => m.recipientId === 0);
    return list.filter(
      (m) =>
        m.recipientId !== 0 &&
        ((m.senderId === currentPlayerId && m.recipientId === tab) ||
          (m.senderId === tab && m.recipientId === currentPlayerId)),
    );
  }, [messages, tab, currentPlayerId, currentTimestamp]);

  function send() {
    const t = text.trim();
    if (t.length === 0) return;
    onSendMessage(t, tab);
    setText("");
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      send();
    }
  }

  const tabs: { id: Tab; label: string; color: string }[] = [
    { id: 0, label: "Global", color: "#8899AA" },
    ...AI_PLAYERS.map((a) => ({ id: a.id as Tab, label: a.name, color: a.color })),
  ];

  return (
    <div className="flex h-full w-full flex-col bg-bg-surface">
      <div className="flex border-b border-[#334455]">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className="flex-1 py-1 font-ui text-[10px]"
            style={{
              color: tab === t.id ? t.color : "#8899AA",
              borderBottom: tab === t.id ? `2px solid ${t.color}` : "2px solid transparent",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {shown.length === 0 ? (
          <p className="font-data text-[11px] text-text-secondary">No messages.</p>
        ) : (
          shown.map((m) => {
            const mine = m.senderId === currentPlayerId;
            return (
              <div key={String(m.id)} className={`mb-2 flex flex-col ${mine ? "items-end" : "items-start"}`}>
                <span className="flex items-center gap-1 font-ui text-[10px]" style={{ color: PLAYER_COLORS[m.senderId] ?? "#8899AA" }}>
                  <span
                    className="inline-block h-2 w-2 rounded-[2px]"
                    style={{ backgroundColor: PLAYER_COLORS[m.senderId] ?? "#8899AA" }}
                  />
                  {mine ? "You" : senderName(m.senderId)}
                </span>
                <div
                  className={`max-w-[230px] rounded-2xl px-3 py-1.5 ${
                    mine ? "rounded-br-sm bg-[#2A3A5A]" : "rounded-bl-sm bg-[#24243A]"
                  }`}
                >
                  <span className="font-data text-[11px] text-text-primary">{m.messageText}</span>
                  {m.territoryId !== 0 && (
                    <button
                      onClick={() => onTerritoryClick(m.territoryId)}
                      className="mt-1 block font-data text-[10px] text-text-accent underline"
                    >
                      {getTerritoryName(m.territoryId)}
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {mode === "player" && (
        <div className="flex items-center gap-1 border-t border-[#334455] p-2">
          <input
            value={text}
            maxLength={MAX_CHAT_MESSAGE_LENGTH}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={tab === 0 ? "Message all..." : `DM ${AI_PLAYERS.find((a) => a.id === tab)?.name}...`}
            className="flex-1 bg-transparent font-data text-[11px] text-text-primary placeholder:text-text-secondary focus:outline-none"
          />
          <button onClick={send} className="font-ui text-[10px] text-text-accent">
            Send
          </button>
        </div>
      )}
    </div>
  );
}
