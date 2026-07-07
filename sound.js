// Lightweight sound effects synthesized with the Web Audio API.
// No external audio files needed — every effect is generated on the fly.

let ctx = null;

function ac() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (AC) ctx = new AC();
  }
  // Browsers start the context suspended until a user gesture; resume on use.
  if (ctx && ctx.state === "suspended") ctx.resume();
  return ctx;
}

// Play a single oscillator "blip" with an exponential volume decay.
function blip(freq, dur, type = "sine", gain = 0.18, freqEnd = null) {
  const a = ac();
  if (!a) return;
  const t0 = a.currentTime;
  const osc = a.createOscillator();
  const g = a.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (freqEnd) osc.frequency.exponentialRampToValueAtTime(freqEnd, t0 + dur);
  g.gain.setValueAtTime(gain, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(a.destination);
  osc.start(t0);
  osc.stop(t0 + dur);
}

// Short bright pop when a critter is destroyed.
export function playKill() {
  blip(660, 0.12, "square", 0.14, 990);
}

// Rising two-note chime when a power-up is collected.
export function playPickup() {
  blip(520, 0.1, "triangle", 0.16, 620);
  const a = ac();
  if (a) setTimeout(() => blip(780, 0.16, "triangle", 0.16, 940), 90);
}

// Dull thud when a critter breaches the apex and you lose a life.
export function playDamage() {
  blip(220, 0.22, "sawtooth", 0.2, 90);
}

// Descending game-over tone.
export function playGameOver() {
  blip(440, 0.25, "sawtooth", 0.2, 220);
  setTimeout(() => blip(330, 0.3, "sawtooth", 0.2, 160), 160);
  setTimeout(() => blip(220, 0.5, "sawtooth", 0.2, 90), 340);
}
