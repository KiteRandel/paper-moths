// Music box + soft effects, synthesized live. Made by KiteRandel.
let ctx, master, music, delay, nextT = 0, step = 0, playing = false;
export const snd = { muted: false };
export function initAudio() {
  if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
  const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
  ctx = new AC(); master = ctx.createGain(); master.gain.value = 0.55; master.connect(ctx.destination);
  music = ctx.createGain(); music.gain.value = 0.0;
  delay = ctx.createDelay(1); delay.delayTime.value = 0.36; const fb = ctx.createGain(); fb.gain.value = 0.32;
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2400;
  music.connect(master); music.connect(delay); delay.connect(lp).connect(fb).connect(delay); lp.connect(master);
}
function pluck(f, when, dur = 0.9, vol = 0.12, dest = master, type = 'sine') {
  if (!ctx || snd.muted) return;
  const t = ctx.currentTime + when;
  for (const [mul, v] of [[1, 1], [2, 0.25], [3.01, 0.08]]) {
    const o = ctx.createOscillator(); o.type = type; o.frequency.value = f * mul;
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol * v, t + 0.006); g.gain.exponentialRampToValueAtTime(0.0001, t + dur * (1 / mul));
    o.connect(g).connect(dest); o.start(t); o.stop(t + dur + 0.05);
  }
}
function noise(dur, freq, vol, when = 0, q = 1) {
  if (!ctx || snd.muted) return;
  const t = ctx.currentTime + when; const len = Math.floor(ctx.sampleRate * dur);
  const b = ctx.createBuffer(1, len, ctx.sampleRate); const d = b.getChannelData(0); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const s = ctx.createBufferSource(); s.buffer = b; const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = q;
  const g = ctx.createGain(); g.gain.value = vol; s.connect(f).connect(g).connect(master); s.start(t);
}
const PENTA = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24];
const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
export const sfx = {
  moth: (combo) => pluck(mtof(79 + PENTA[Math.min(combo, PENTA.length - 1)]), 0, 0.6, 0.1, master, 'triangle'),
  bell: () => { pluck(mtof(91), 0, 1.4, 0.12); pluck(mtof(98), 0.08, 1.4, 0.09); },
  jump: () => noise(0.22, 900, 0.25, 0, 0.8),
  land: () => noise(0.12, 300, 0.25),
  slide: () => noise(0.35, 600, 0.18, 0, 0.5),
  lane: () => noise(0.08, 1500, 0.08),
  power: () => [72, 76, 79, 84].forEach((m, i) => pluck(mtof(m), i * 0.07, 0.8, 0.1, master, 'triangle')),
  shield: () => { noise(0.3, 500, 0.3); pluck(mtof(60), 0, 0.6, 0.15, master, 'triangle'); },
  hit: () => { noise(0.4, 180, 0.6, 0, 0.7); pluck(mtof(45), 0, 0.8, 0.2, master, 'triangle'); },
  fall: () => { if (!ctx || snd.muted) return; const o = ctx.createOscillator(); const g = ctx.createGain(); const t = ctx.currentTime; o.frequency.setValueAtTime(600, t); o.frequency.exponentialRampToValueAtTime(90, t + 0.9); g.gain.setValueAtTime(0.12, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 1); o.type = 'triangle'; o.connect(g).connect(master); o.start(t); o.stop(t + 1.05); },
  click: () => pluck(mtof(84), 0, 0.3, 0.08, master, 'triangle'),
};
// a gentle, slightly melancholic music-box waltz in A minor
const SONG = [
  [69, 72, 76], [74, 72, 69], [71, 74, 77], [76, 74, 71], [72, 76, 79], [77, 76, 72], [71, 74, 76], [72, 71, 69],
  [69, 72, 76], [74, 72, 69], [71, 74, 77], [79, 77, 76], [77, 76, 74], [76, 74, 72], [71, 72, 74], [69, -1, -1],
];
const BASS = [45, 50, 47, 52, 48, 53, 52, 45, 45, 50, 47, 52, 50, 48, 52, 45];
export function setMusic(on) { playing = on; if (ctx) { music.gain.setTargetAtTime(on && !snd.muted ? 1 : 0, ctx.currentTime, 0.4); if (on && nextT < ctx.currentTime) nextT = ctx.currentTime + 0.1; } }
export function tickMusic(tempo = 1) {
  if (!ctx || !playing) return;
  const beat = 0.42 / tempo;
  while (nextT < ctx.currentTime + 0.25) {
    const bar = Math.floor(step / 3) % SONG.length, b = step % 3;
    const n = SONG[bar][b]; const w = nextT - ctx.currentTime;
    if (n > 0) pluck(mtof(n + 12), w, 1.1, 0.07, music, 'sine');
    if (b === 0) pluck(mtof(BASS[bar]), w, 1.6, 0.06, music, 'triangle');
    nextT += beat; step++;
  }
}
export function setMuted(m) { snd.muted = m; if (ctx) music.gain.value = m || !playing ? 0 : 1; }
