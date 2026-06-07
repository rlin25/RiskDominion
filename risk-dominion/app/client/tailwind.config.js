/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        "bg-root": "#0d0b08",
        "bg-surface": "#1a1610",
        "bg-surface-alt": "#241f16",
        "bg-ticker": "#100e09",
        "bg-map": "#141009",
        "text-primary": "#f0e6d0",
        "text-secondary": "#9a8870",
        "text-accent": "#d4a017",
        "text-command": "#c8b882",
        "player-1": "#4488FF",
        "player-2": "#d94f4f",
        "player-3": "#e8a020",
        "player-4": "#9b59b6",
        "dim-military": "#cc3322",
        "dim-economic": "#e8a020",
        "dim-cultural": "#2dbfa0",
        "dim-covert": "#8e44ad",
        highlight: "#d4a017",
        success: "#2ecc71",
        warning: "#e67e22",
        neutral: "#2a2318",
        "border-warm": "#3d3525",
        "border-gold": "#6b5a2a",
      },
      fontFamily: {
        display: ["Rajdhani", "sans-serif"],
        ui: ["Orbitron", "sans-serif"],
        data: ["JetBrains Mono", "monospace"],
      },
      keyframes: {
        marquee: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
        "glow-pulse": {
          "0%, 100%": { opacity: "0.7", transform: "scale(1)" },
          "50%": { opacity: "1", transform: "scale(1.03)" },
        },
        "float-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "victory-reveal": {
          "0%": { opacity: "0", transform: "scale(0.7) translateY(20px)" },
          "60%": { transform: "scale(1.04) translateY(-4px)" },
          "100%": { opacity: "1", transform: "scale(1) translateY(0)" },
        },
        "pip-fill": {
          "0%": { transform: "scale(0.4)", opacity: "0" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        shake: {
          "0%, 100%": { transform: "translateX(0)" },
          "20%": { transform: "translateX(-4px) rotate(-1deg)" },
          "40%": { transform: "translateX(4px) rotate(1deg)" },
          "60%": { transform: "translateX(-3px)" },
          "80%": { transform: "translateX(3px)" },
        },
        "banner-in": {
          "0%": { opacity: "0", letterSpacing: "0.4em" },
          "100%": { opacity: "1", letterSpacing: "0.1em" },
        },
      },
      animation: {
        marquee: "marquee 40s linear infinite",
        "glow-pulse": "glow-pulse 2.5s ease-in-out infinite",
        "float-up": "float-up 0.3s ease-out forwards",
        "victory-reveal": "victory-reveal 0.6s cubic-bezier(0.34,1.56,0.64,1) forwards",
        "pip-fill": "pip-fill 0.2s ease-out forwards",
        shake: "shake 0.4s ease-in-out",
        "banner-in": "banner-in 0.8s ease-out forwards",
      },
      boxShadow: {
        "territory": "0 2px 12px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.05)",
        "card": "0 4px 16px rgba(0,0,0,0.5), 0 1px 0 rgba(255,255,255,0.04)",
        "card-lift": "0 12px 32px rgba(0,0,0,0.7), 0 0 20px rgba(212,160,23,0.25)",
        "panel": "inset 0 0 0 1px rgba(212,160,23,0.12), 0 4px 24px rgba(0,0,0,0.4)",
      },
    },
  },
  plugins: [],
};
