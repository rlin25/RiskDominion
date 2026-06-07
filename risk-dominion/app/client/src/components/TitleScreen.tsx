import { useEffect } from "react";

interface TitleScreenProps {
  onDone: () => void;
}

// A non-blocking title overlay. The live map renders behind it; pointer-events
// are disabled so it never intercepts input. Fades in, holds, fades out over
// 2800ms (animate-title-fade keyframe), then calls onDone.
export function TitleScreen({ onDone }: TitleScreenProps) {
  useEffect(() => {
    const t = window.setTimeout(onDone, 2800);
    return () => window.clearTimeout(t);
  }, [onDone]);

  return (
    <div
      className="animate-title-fade fixed inset-0 z-[9999] flex items-center justify-center"
      style={{ background: "rgba(26,29,28,0.6)", pointerEvents: "none" }}
    >
      <h1
        style={{
          fontFamily: "Inter, sans-serif",
          fontSize: 36,
          fontWeight: 600,
          color: "#d4a843",
          textShadow: "0 0 20px rgba(212,168,67,0.3)",
        }}
      >
        Risk: Dominion
      </h1>
    </div>
  );
}
