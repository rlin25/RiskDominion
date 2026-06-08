// Web Audio API sound engine (INTERFACE_CONTRACT §11). No audio files: every
// cue is synthesized from oscillators on a single, lazily-created AudioContext.
// All functions are no-ops in SSR / environments without Web Audio.

let ctx: AudioContext | null = null;

type AudioCtor = typeof AudioContext;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor: AudioCtor | undefined =
    window.AudioContext ?? (window as unknown as { webkitAudioContext?: AudioCtor }).webkitAudioContext;
  if (!Ctor) return null;
  if (!ctx) {
    try {
      ctx = new Ctor();
    } catch {
      return null;
    }
  }
  if (ctx.state === "suspended") {
    void ctx.resume();
  }
  return ctx;
}

// Convert a decibel value to a linear gain multiplier.
function dbToGain(db: number): number {
  return 10 ** (db / 20);
}

// Play a single oscillator tone. `slideTo` (when given) ramps the frequency
// linearly across the duration; the gain ramps exponentially toward silence.
function tone(
  c: AudioContext,
  startTime: number,
  freq: number,
  db: number,
  durationMs: number,
  slideTo?: number,
): void {
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = "sine";

  const dur = durationMs / 1000;
  const end = startTime + dur;

  osc.frequency.setValueAtTime(freq, startTime);
  if (slideTo != null) {
    osc.frequency.linearRampToValueAtTime(slideTo, end);
  }

  const peak = dbToGain(db);
  gain.gain.setValueAtTime(peak, startTime);
  // Exponential ramps cannot reach 0; aim for a small floor.
  gain.gain.exponentialRampToValueAtTime(0.0001, end);

  osc.connect(gain);
  gain.connect(c.destination);
  osc.start(startTime);
  osc.stop(end);
}

export function playCardSound(): void {
  const c = getCtx();
  if (!c) return;
  tone(c, c.currentTime, 800, -18, 50);
}

export function playTerritoryFlipSound(): void {
  const c = getCtx();
  if (!c) return;
  tone(c, c.currentTime, 120, -15, 150, 80);
}

export function playCulturalPressureSound(level: 1 | 2): void {
  const c = getCtx();
  if (!c) return;
  if (level === 1) {
    tone(c, c.currentTime, 200, -28, 200, 300);
  } else {
    tone(c, c.currentTime, 300, -26, 200, 400);
  }
}

export function playVictorySound(): void {
  const c = getCtx();
  if (!c) return;
  const notes = [523.25, 659.25, 783.99]; // C5, E5, G5
  const noteMs = 150;
  const gapMs = 100;
  let t = c.currentTime;
  for (const f of notes) {
    tone(c, t, f, -12, noteMs);
    t += (noteMs + gapMs) / 1000;
  }
}

export function playDefeatSound(): void {
  const c = getCtx();
  if (!c) return;
  const notes = [392, 261.63]; // G4, C4
  const noteMs = 300;
  const gapMs = 200;
  let t = c.currentTime;
  for (const f of notes) {
    tone(c, t, f, -15, noteMs);
    t += (noteMs + gapMs) / 1000;
  }
}
