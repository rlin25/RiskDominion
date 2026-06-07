/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // AESTHETIC.md v2.0 — Satellite Intelligence palette
        "bg-ocean": "#1a1d1c",
        "bg-landmass": "#2d302e",
        "bg-surface": "#1e2120",
        "player-1": "#5b8cbe",
        "player-2": "#c4554d",
        "player-3": "#c4944d",
        "player-4": "#8b6bae",
        gold: "#d4a843",
        success: "#5a9e6f",
        "text-primary": "#c5c9c6",
        "text-secondary": "#7d827e",
        "border-subtle": "#3a3f3c",
        "neutral-empty": "#2a2d2c",
      },
      fontFamily: {
        data: ["JetBrains Mono", "monospace"],
        ui: ["Inter", "sans-serif"],
      },
      opacity: {
        92: "0.92",
      },
      keyframes: {
        // Command bar
        slideDown: {
          from: { transform: "translateX(-50%) translateY(-12px)", opacity: "0" },
          to: { transform: "translateX(-50%) translateY(0)", opacity: "1" },
        },
        slideUp: {
          from: { transform: "translateX(-50%) translateY(0)", opacity: "1" },
          to: { transform: "translateX(-50%) translateY(-12px)", opacity: "0" },
        },
        // ±4px shake for unrecognized input (keeps the -50% centering)
        cmdShake: {
          "0%, 100%": { transform: "translateX(-50%)" },
          "25%": { transform: "translateX(calc(-50% - 4px))" },
          "75%": { transform: "translateX(calc(-50% + 4px))" },
        },
        // Chat windows
        chatIn: {
          from: { opacity: "0", transform: "scale(0.95)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        chatOut: {
          from: { opacity: "1" },
          to: { opacity: "0" },
        },
        // Notifications / advice cards
        notifyIn: {
          from: { opacity: "0", transform: "translateY(-8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        // Empty card-stack pulse (matches 4s regen interval)
        emptyPulse: {
          "0%, 100%": { opacity: "0.4" },
          "50%": { opacity: "0.55" },
        },
        // Card hand entrance (retained fan-out arc)
        "float-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        // Victory territory pulse
        territoryPulse: {
          "0%, 100%": { opacity: "0.1" },
          "50%": { opacity: "0.3" },
        },
        // Defeat losing-territory border pulse
        losePulse: {
          "0%, 100%": { opacity: "0.6" },
          "50%": { opacity: "1" },
        },
        // Generic fade in (overlays, title, viz)
        fadeIn: {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        // Gold count flash on regen
        goldFlash: {
          "0%": { color: "#d4a843" },
          "100%": { color: "#c5c9c6" },
        },
      },
      animation: {
        "cmd-down": "slideDown 200ms ease-out forwards",
        "cmd-up": "slideUp 200ms ease-in forwards",
        "cmd-shake": "cmdShake 200ms ease-in-out 3",
        "chat-in": "chatIn 200ms ease-out forwards",
        "chat-out": "chatOut 150ms ease-in forwards",
        "notify-in": "notifyIn 200ms ease-out forwards",
        "empty-pulse": "emptyPulse 4s ease-in-out infinite",
        "float-up": "float-up 0.3s ease-out forwards",
        "territory-pulse": "territoryPulse 2s ease-in-out infinite",
        "lose-pulse": "losePulse 1s ease-in-out infinite",
        "fade-in": "fadeIn 300ms ease-out forwards",
        "gold-flash": "goldFlash 300ms ease-out forwards",
      },
    },
  },
  plugins: [],
};
