import { useEffect, useRef, useState } from "react";
import { useReducer } from "spacetimedb/react";
import { reducers } from "../module_bindings";

// Small top-right control that resets to a fresh, randomized game (each player
// dominant in one random country). Two-click confirm guards against accidents.
export function NewGameButton() {
  const resetGame = useReducer(reducers.resetGame);
  const [armed, setArmed] = useState(false);
  const timer = useRef<number | null>(null);

  useEffect(() => () => {
    if (timer.current !== null) window.clearTimeout(timer.current);
  }, []);

  function onClick() {
    if (!armed) {
      setArmed(true);
      timer.current = window.setTimeout(() => setArmed(false), 3000);
      return;
    }
    if (timer.current !== null) window.clearTimeout(timer.current);
    setArmed(false);
    resetGame().catch((e) => console.warn("reset_game:", e));
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={`fixed flex items-center gap-1.5 rounded-full border transition-colors ${
        armed
          ? "text-gold border-gold"
          : "text-text-secondary border-border-subtle hover:text-text-primary hover:border-text-secondary"
      }`}
      style={{
        top: 14,
        right: 14,
        zIndex: 30,
        padding: "5px 12px",
        background: "rgba(30,33,32,0.85)",
        fontFamily: "Inter, sans-serif",
        fontSize: 11,
        letterSpacing: "0.04em",
      }}
    >
      <svg width="12" height="12" viewBox="0 0 16 16" aria-hidden>
        <path
          d="M13 8a5 5 0 1 1-1.5-3.6"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
        <path
          d="M13 2.5 V5 H10.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {armed ? "Confirm reset" : "New Game"}
    </button>
  );
}
