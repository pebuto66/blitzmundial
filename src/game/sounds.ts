// Lightweight WebAudio SFX — no external assets.
let ctx: AudioContext | null = null;
let muted = false;

function ac(): AudioContext | null {
  if (muted) return null;
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC = (window.AudioContext || (window as any).webkitAudioContext) as typeof AudioContext | undefined;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  return ctx;
}

export function setMuted(v: boolean) { muted = v; if (v && ctx) ctx.suspend().catch(() => {}); }
export function isMuted() { return muted; }

function envTone(freq: number, dur: number, type: OscillatorType = "sine", vol = 0.25, delay = 0) {
  const c = ac(); if (!c) return;
  const t0 = c.currentTime + delay;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(vol, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

function noiseBurst(dur: number, vol = 0.3, delay = 0, freq = 1200) {
  const c = ac(); if (!c) return;
  const t0 = c.currentTime + delay;
  const buf = c.createBuffer(1, Math.max(1, Math.floor(c.sampleRate * dur)), c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  const src = c.createBufferSource();
  src.buffer = buf;
  const filter = c.createBiquadFilter();
  filter.type = "bandpass"; filter.frequency.value = freq; filter.Q.value = 0.8;
  const g = c.createGain();
  g.gain.setValueAtTime(vol, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(filter).connect(g).connect(c.destination);
  src.start(t0);
  src.stop(t0 + dur + 0.02);
}

/** Dice clatter — 3-5 quick wood-block clicks. */
export function playDice(count = 3) {
  const n = Math.max(3, Math.min(6, count + 2));
  for (let i = 0; i < n; i++) {
    noiseBurst(0.06, 0.22, i * 0.05, 2200 + Math.random() * 800);
  }
}

/** Attack — muted boom with a metallic ring. */
export function playAttack() {
  noiseBurst(0.25, 0.35, 0, 260);
  envTone(120, 0.22, "sawtooth", 0.18);
  envTone(80, 0.28, "square", 0.12, 0.02);
}

/** Territory captured — quick rising fanfare. */
export function playConquest() {
  envTone(523, 0.14, "triangle", 0.22, 0);
  envTone(659, 0.14, "triangle", 0.22, 0.09);
  envTone(784, 0.24, "triangle", 0.24, 0.18);
  envTone(1046, 0.32, "sine", 0.18, 0.28);
}

/** Missile launch — rising whistle followed by a distant boom. */
export function playMissile() {
  const c = ac(); if (!c) return;
  const t0 = c.currentTime;
  // Rising whistle: swept sine from 220 Hz up to ~1800 Hz over ~1.1s
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(220, t0);
  osc.frequency.exponentialRampToValueAtTime(1800, t0 + 1.1);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(0.28, t0 + 0.15);
  g.gain.exponentialRampToValueAtTime(0.05, t0 + 1.05);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + 1.2);
  osc.connect(g).connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + 1.3);
  // Rocket thrust noise underneath
  noiseBurst(1.1, 0.18, 0, 400);
  // Distant impact boom
  noiseBurst(0.5, 0.45, 1.15, 90);
  envTone(60, 0.5, "sawtooth", 0.22, 1.15);
  envTone(45, 0.6, "square", 0.18, 1.2);
}