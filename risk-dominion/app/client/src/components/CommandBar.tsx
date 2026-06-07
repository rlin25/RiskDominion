import { useEffect, useRef, useState } from "react";
import { useProcedure } from "spacetimedb/react";
import { procedures } from "../module_bindings";
import { COMMAND_SECTIONS, PLAYER_COLORS } from "../constants";
import type { VizSpec } from "../types";
import { inferViz, parseCommand } from "../utils/queryViz";

interface CommandBarProps {
  visible: boolean;
  notificationDot: boolean;
  onDismiss: () => void;
  onOpenChat: (aiId: number) => void;
  onOpenIntel: (aiId: number) => void;
  onShowEvents: () => void;
  onAdvice: (text: string) => void; // App shows persistent advice card
  onQueryViz: (viz: VizSpec | null) => void;
}

export function CommandBar({
  visible,
  notificationDot,
  onDismiss,
  onOpenChat,
  onOpenIntel,
  onShowEvents,
  onAdvice,
  onQueryViz,
}: CommandBarProps) {
  const queryDatabase = useProcedure(procedures.queryDatabase);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [shakeKey, setShakeKey] = useState(0);
  const [shaking, setShaking] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      inputRef.current?.focus();
    } else {
      // Reset transient state when the bar is hidden.
      setDropdownOpen(false);
      setShaking(false);
      setErrorMsg(null);
    }
  }, [visible]);

  if (!visible) return null;

  function triggerShake() {
    setShakeKey((k) => k + 1);
    setShaking(true);
    setErrorMsg("I didn't understand that. Try 'help' for options.");
    window.setTimeout(() => setShaking(false), 200);
    window.setTimeout(() => setErrorMsg(null), 3000);
  }

  async function dispatch(raw: string) {
    const trimmed = raw.trim();
    if (!trimmed || loading) return;

    const cmd = parseCommand(trimmed);

    if (cmd.kind === "intel") {
      onOpenIntel(cmd.aiId);
      setText("");
      onDismiss();
      return;
    }
    if (cmd.kind === "chat") {
      onOpenChat(cmd.aiId);
      setText("");
      onDismiss();
      return;
    }
    if (cmd.kind === "events") {
      onShowEvents();
      setText("");
      onDismiss();
      return;
    }

    if (cmd.kind === "advice") {
      setLoading(true);
      try {
        const result = await queryDatabase({ query: trimmed });
        onAdvice(result.summary || "No read on your position yet.");
        setText("");
        onDismiss();
      } catch {
        onAdvice("No read on your position yet.");
        setText("");
        onDismiss();
      } finally {
        setLoading(false);
      }
      return;
    }

    // query
    setLoading(true);
    try {
      const result = await queryDatabase({ query: trimmed });
      const empty =
        !result.summary &&
        result.highlightedTerritories.length === 0 &&
        result.dataTable.rows.length === 0;
      if (empty) {
        triggerShake();
      } else {
        onQueryViz(inferViz(result, trimmed));
        setText("");
        onDismiss();
      }
    } catch {
      triggerShake();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed left-1/2 z-[60] -translate-x-1/2"
      style={{ top: 12, width: "60vw", maxWidth: 720 }}
    >
      <div
        key={shakeKey}
        className={`flex items-center gap-2 ${shaking ? "animate-cmd-shake" : "animate-cmd-down"}`}
        style={{
          height: 44,
          background: "rgba(30,33,32,0.92)",
          borderBottom: "1px solid #3a3f3c",
          borderRadius: 6,
          padding: "0 12px",
        }}
      >
        <button
          type="button"
          onClick={() => setDropdownOpen((v) => !v)}
          className="relative flex items-center"
          style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 16, color: "#d4a843" }}
          aria-label="Command menu"
        >
          &gt;
          {notificationDot && (
            <span
              className="absolute h-1.5 w-1.5 rounded-full"
              style={{ top: -2, right: -6, backgroundColor: PLAYER_COLORS[2] }}
            />
          )}
        </button>

        <input
          ref={inputRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void dispatch(text);
            } else if (e.key === "Escape") {
              e.stopPropagation();
              onDismiss();
            }
          }}
          placeholder="Type a command or question..."
          className="flex-1 bg-transparent outline-none"
          style={{
            fontFamily: "JetBrains Mono, monospace",
            fontSize: 14,
            color: "#c5c9c6",
          }}
        />

        {loading && (
          <span
            style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 14, color: "#7d827e" }}
          >
            ...
          </span>
        )}
      </div>

      {errorMsg && (
        <div
          className="mt-1 px-3"
          style={{ fontFamily: "Inter, sans-serif", fontSize: 11, color: "#7d827e" }}
        >
          {errorMsg}
        </div>
      )}

      {dropdownOpen && (
        <div
          className="absolute left-0"
          style={{
            top: 44,
            width: "100%",
            background: "rgba(30,33,32,0.95)",
            border: "1px solid #3a3f3c",
            borderRadius: 6,
          }}
        >
          {COMMAND_SECTIONS.map((section, si) => (
            <div
              key={section.title}
              style={si > 0 ? { borderTop: "0.5px solid #3a3f3c" } : undefined}
            >
              <div
                className="px-2.5 pt-2 pb-1 uppercase"
                style={{ fontFamily: "Inter, sans-serif", fontSize: 9, color: "#7d827e" }}
              >
                {section.title}
              </div>
              {section.options.map((opt) => (
                <button
                  key={opt.label}
                  type="button"
                  onClick={() => {
                    setDropdownOpen(false);
                    void dispatch(opt.label);
                  }}
                  className="block w-full text-left hover:bg-gold/10"
                  style={{
                    fontFamily: "Inter, sans-serif",
                    fontSize: 11,
                    color: "#c5c9c6",
                    padding: "8px 10px",
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          ))}
          <div
            className="text-center italic"
            style={{
              fontFamily: "Inter, sans-serif",
              fontSize: 10,
              color: "#7d827e",
              padding: "8px 10px",
              borderTop: "0.5px solid #3a3f3c",
            }}
          >
            or type anything...
          </div>
        </div>
      )}
    </div>
  );
}
