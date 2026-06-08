import { useEffect, useMemo, useRef, useState } from "react";
import { AI_PLAYERS, PLAYER_COLORS } from "../constants";
import type { ChatLogRow } from "../types";

interface ChatWindowProps {
  aiId: number;
  index: number; // 0 = bottommost; stack upward with 12px gap
  messages: ChatLogRow[]; // full live chat_log (filter inside to this DM thread)
  onClose: (aiId: number) => void;
  onSend: (aiId: number, text: string) => void; // App performs send + chat_reply
}

const HUMAN_ID = 1;

export function ChatWindow({ aiId, index, messages, onClose, onSend }: ChatWindowProps) {
  const ai = AI_PLAYERS.find((p) => p.id === aiId);
  const name = ai?.name ?? `Player ${aiId}`;
  const color = PLAYER_COLORS[aiId] ?? "#7d827e";
  const initial = name.charAt(0).toUpperCase();

  const [draft, setDraft] = useState("");
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const thread = useMemo(
    () =>
      messages
        .filter(
          (m) =>
            (m.senderId === HUMAN_ID && m.recipientId === aiId) ||
            (m.senderId === aiId && m.recipientId === HUMAN_ID),
        )
        .sort((a, b) => Number(a.timestamp) - Number(b.timestamp)),
    [messages, aiId],
  );

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [thread.length]);

  function send() {
    const trimmed = draft.trim();
    if (!trimmed) return;
    onSend(aiId, trimmed);
    setDraft("");
  }

  return (
    <div
      className="animate-chat-in fixed right-4 z-50 flex flex-col"
      style={{
        bottom: 120 + index * (320 + 12),
        width: 280,
        height: 320,
        background: "rgba(30,33,32,0.92)",
        border: "1px solid #3a3f3c",
        borderRadius: 6,
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.stopPropagation();
          onClose(aiId);
        }
      }}
    >
      {/* Header */}
      <div
        className="flex shrink-0 items-center gap-2 px-2.5"
        style={{ height: 40, borderBottom: "0.5px solid #3a3f3c" }}
      >
        <div
          className="flex items-center justify-center rounded-full"
          style={{ width: 32, height: 32, backgroundColor: color }}
        >
          <span style={{ fontFamily: "Inter, sans-serif", fontSize: 14, color: "#ffffff" }}>
            {initial}
          </span>
        </div>
        <span
          className="flex-1"
          style={{ fontFamily: "Inter, sans-serif", fontSize: 14, fontWeight: 600, color }}
        >
          {name}
        </span>
        <button
          type="button"
          onClick={() => onClose(aiId)}
          className="leading-none hover:text-text-primary"
          style={{ fontFamily: "Inter, sans-serif", fontSize: 16, color: "#7d827e" }}
          aria-label="Close"
        >
          ×
        </button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="styled-scroll flex flex-1 flex-col gap-2 overflow-y-auto p-2.5">
        {thread.map((m) => {
          const fromAi = m.senderId === aiId;
          if (fromAi) {
            return (
              <div key={String(m.id)} className="flex items-start gap-1.5">
                <div
                  className="flex shrink-0 items-center justify-center rounded-full"
                  style={{ width: 24, height: 24, backgroundColor: color }}
                >
                  <span style={{ fontFamily: "Inter, sans-serif", fontSize: 11, color: "#ffffff" }}>
                    {initial}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span style={{ fontFamily: "Inter, sans-serif", fontSize: 10, color }}>{name}</span>
                  <span
                    className="break-words"
                    style={{
                      fontFamily: "JetBrains Mono, monospace",
                      fontSize: 11,
                      color: "#c5c9c6",
                      maxWidth: 200,
                      overflowWrap: "anywhere",
                    }}
                  >
                    {m.messageText}
                  </span>
                </div>
              </div>
            );
          }
          return (
            <div key={String(m.id)} className="flex justify-end">
              <span
                className="break-words text-right"
                style={{
                  fontFamily: "JetBrains Mono, monospace",
                  fontSize: 11,
                  color: "#c5c9c6",
                  maxWidth: 200,
                  overflowWrap: "anywhere",
                }}
              >
                {m.messageText}
              </span>
            </div>
          );
        })}
      </div>

      {/* Input */}
      <div className="shrink-0 px-2.5" style={{ height: 36, borderTop: "0.5px solid #3a3f3c" }}>
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              send();
            }
          }}
          placeholder={`Message ${name}...`}
          className="h-full w-full bg-transparent outline-none"
          style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 13, color: "#c5c9c6" }}
        />
      </div>
    </div>
  );
}
