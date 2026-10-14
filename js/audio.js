// Main theme, boss theme, and soft effects (plus a synthesized music box as a fallback). Made by KiteRandel.
let ctx, master, music, delay, nextT = 0, step = 0, playing = false;
let mainBuf = null, mainSrc = null, mainGain = null;   // the calm main theme (a slowed, softened take on the boss theme)
let bossBuf = null, bossSrc = null, bossGain = null, bossOn = false, bossStopT = null;   // boss theme, decoded into Web Audio
export const snd = { muted: false };
export function initAudio() {
  if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
  const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
  ctx = new AC(); master = ctx.createGain(); master.gain.value = 0.55; master.connect(ctx.destination);
  music = ctx.createGain(); music.gain.value = 0.0;
  delay = ctx.createDelay(1); delay.delayTime.value = 0.36; const fb = ctx.createGain(); fb.gain.value = 0.32;
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2400;
  music.connect(master); music.connect(delay); delay.connect(lp).connect(fb).connect(delay); lp.connect(master);
  // the boss theme streams from a file and plays through its own fader
  mainGain = ctx.createGain(); mainGain.gain.value = 0; mainGain.connect(master);
  fetch('assets/main-theme.mp3?v=2').then((r) => r.arrayBuffer()).then((b) => ctx.decodeAudioData(b)).then((buf) => {
    mainBuf = buf; music.gain.cancelScheduledValues(ctx.currentTime); music.gain.value = 0;   // the music box steps aside
    applyMain(0.8);
  }).catch((e) => console.warn('main theme failed to load; using the music box', e));
  // decoded into the same audio graph as everything else, so browsers that block media autoplay (like Brave) still play it
  bossGain = ctx.createGain(); bossGain.gain.value = 0; bossGain.connect(master);
  fetch('assets/boss-theme.mp3?v=2').then((r) => r.arrayBuffer()).then((b) => ctx.decodeAudioData(b)).then((buf) => {
    bossBuf = buf; if (bossOn && !bossSrc) startBossSource();
  }).catch((e) => console.warn('boss theme failed to load', e));
}
function startBossSource() {
  if (!bossBuf || bossSrc) return;
  bossSrc = ctx.createBufferSource(); bossSrc.buffer = bossBuf; bossSrc.loop = true; bossSrc.connect(bossGain); bossSrc.start();
}
function stopBossSource() { if (bossSrc) { try { bossSrc.stop(); } catch (e) { /* already stopped */ } bossSrc.disconnect(); bossSrc = null; } }
const BOSS_VOL = 0.75, MAIN_VOL = 0.8;
// main theme: audible while running, ducked out during boss fights; restarts from the top when a run begins
function applyMain(tc = 0.6, restart = false) {
  if (!ctx || !mainBuf || !mainGain) return;
  const want = playing && !bossOn && !snd.muted ? MAIN_VOL : 0;
  if (restart || !mainSrc) {
    if (mainSrc) { try { mainSrc.stop(); } catch (e) { /* stopped */ } mainSrc.disconnect(); }
    mainSrc = ctx.createBufferSource(); mainSrc.buffer = mainBuf; mainSrc.loop = true; mainSrc.connect(mainGain); mainSrc.start();
  }
  const t = ctx.currentTime; mainGain.gain.cancelScheduledValues(t); mainGain.gain.setValueAtTime(mainGain.gain.value, t);
  mainGain.gain.setTargetAtTime(want, t, tc);
}
const waltzOn = () => !mainBuf;
export function bossMusicState() { return { on: bossOn, loaded: !!bossBuf, playing: !!bossSrc, gain: bossGain ? +bossGain.gain.value.toFixed(2) : null, waltz: music ? +music.gain.value.toFixed(2) : null, main: mainGain ? +mainGain.gain.value.toFixed(2) : null, mainLoaded: !!mainBuf, ctx: ctx ? ctx.state : null }; }
// fade the boss theme in (and the music box out) when a fight starts, and back again when it ends
export function setBossMusic(on) {
  if (!ctx || !bossGain || on === bossOn) return;
  if (ctx.state === 'suspended') ctx.resume();
  bossOn = on; const t = ctx.currentTime;
  clearTimeout(bossStopT);
  bossGain.gain.cancelScheduledValues(t); bossGain.gain.setValueAtTime(bossGain.gain.value, t);
  if (on) {
    startBossSource();   // if it's still decoding, it starts as soon as it's ready
    bossGain.gain.linearRampToValueAtTime(snd.muted ? 0 : BOSS_VOL, t + 2.5);
    music.gain.setTargetAtTime(0, t, 0.6); applyMain(0.6);
  } else {
    bossGain.gain.linearRampToValueAtTime(0, t + 3);
    bossStopT = setTimeout(() => { if (!bossOn) stopBossSource(); }, 3200);
    if (waltzOn()) music.gain.setTargetAtTime(playing && !snd.muted ? 1 : 0, t + 1.2, 0.8);
    else setTimeout(() => { if (!bossOn) applyMain(1.0); }, 1200);
  }
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
  // bosses
  bossIntro: () => { [45, 52, 57, 60].forEach((m, i) => pluck(mtof(m), i * 0.18, 1.6, 0.14, master, 'triangle')); noise(1.2, 200, 0.25, 0, 0.4); pluck(mtof(81), 0.7, 2, 0.08); },
  charge: (c) => { if (!ctx || snd.muted) return; const t = ctx.currentTime; const o = ctx.createOscillator(); const g = ctx.createGain(); o.type = 'sine';
    o.frequency.setValueAtTime(c ? 330 : 220, t); o.frequency.exponentialRampToValueAtTime(c ? 990 : 660, t + 0.5); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.09, t + 0.4); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.55);
    o.connect(g).connect(master); o.start(t); o.stop(t + 0.6); },
  wave: (c) => { noise(0.7, c ? 900 : 500, 0.35, 0, 0.5); pluck(mtof(c ? 69 : 62), 0, 0.8, 0.1, master, 'triangle'); },
  dodge: () => pluck(mtof(88), 0, 0.35, 0.07, master, 'triangle'),
  lanternDrop: () => [84, 88, 91].forEach((m, i) => pluck(mtof(m), i * 0.09, 0.9, 0.08)),
  throw: () => { noise(0.3, 1400, 0.25, 0, 0.6); pluck(mtof(79), 0, 0.3, 0.08, master, 'triangle'); },
  bossHit: () => { noise(0.5, 160, 0.7, 0, 0.6); [72, 67, 64].forEach((m, i) => pluck(mtof(m), 0.05 + i * 0.07, 0.6, 0.12, master, 'triangle')); },
  bossDown: () => [60, 64, 67, 72, 76, 79, 84].forEach((m, i) => pluck(mtof(m), i * 0.08, 1.2, 0.1, master, 'triangle')),
  crackWarn: () => { pluck(mtof(57), 0, 0.25, 0.1, master, 'square'); pluck(mtof(57), 0.18, 0.25, 0.1, master, 'square'); },
  slam: () => { noise(0.6, 120, 0.9, 0, 0.5); noise(0.4, 2000, 0.25, 0.02, 0.8); },
  stuck: () => { pluck(mtof(55), 0, 0.3, 0.1, master, 'triangle'); pluck(mtof(54), 0.15, 0.3, 0.1, master, 'triangle'); pluck(mtof(53), 0.3, 0.5, 0.1, master, 'triangle'); },
  escape: () => noise(0.25, 700, 0.3),
  // Wrath & Joy
  boing: () => { if (!ctx || snd.muted) return; const t = ctx.currentTime; const o = ctx.createOscillator(); const g = ctx.createGain(); o.type = 'triangle';
    o.frequency.setValueAtTime(180, t); o.frequency.exponentialRampToValueAtTime(720, t + 0.25); o.frequency.exponentialRampToValueAtTime(420, t + 0.5);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.18, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.55); o.connect(g).connect(master); o.start(t); o.stop(t + 0.6); },
  thunder: () => { noise(0.18, 3200, 0.55, 0, 0.8); noise(0.25, 900, 0.4, 0.02, 0.6); noise(1.6, 110, 0.75, 0.05, 0.4); },
  crackle: () => { for (let i = 0; i < 5; i++) noise(0.04, 2500 + Math.random() * 2500, 0.12, i * 0.07 + Math.random() * 0.03, 1.5); },
  fireburst: () => { noise(0.9, 500, 0.35, 0, 0.4); noise(0.5, 1800, 0.12, 0.05, 0.6); },
  growl: () => { if (!ctx || snd.muted) return; const t = ctx.currentTime; const o = ctx.createOscillator(); const g = ctx.createGain(); const f = ctx.createBiquadFilter();
    o.type = 'sawtooth'; o.frequency.setValueAtTime(70, t); o.frequency.linearRampToValueAtTime(95, t + 0.25); o.frequency.linearRampToValueAtTime(60, t + 0.7);
    f.type = 'lowpass'; f.frequency.value = 420; g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.22, t + 0.08); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.75);
    o.connect(f).connect(g).connect(master); o.start(t); o.stop(t + 0.8); noise(0.6, 250, 0.2, 0, 0.5); },
  sad: () => [76, 74, 71, 67].forEach((m, i) => pluck(mtof(m), i * 0.12, 0.4, 0.07, master, 'sine')),
  giggle: () => [84, 88, 86, 91].forEach((m, i) => pluck(mtof(m), i * 0.07, 0.18, 0.06, master, 'sine')),
  springPlant: () => { pluck(mtof(79), 0, 0.4, 0.09, master, 'triangle'); pluck(mtof(86), 0.06, 0.5, 0.07); },
  // Lilac & Glitch
  sing: (m, dur = 0.5, bright = false) => {   // a soft sung vowel: two sines with vibrato through a vowel-ish filter
    if (!ctx || snd.muted) return; const t = ctx.currentTime, f = mtof(m);
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(bright ? 0.1 : 0.13, t + 0.06); g.gain.setValueAtTime(bright ? 0.1 : 0.13, t + dur * 0.7); g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.25);
    const fl = ctx.createBiquadFilter(); fl.type = 'bandpass'; fl.frequency.value = bright ? 1400 : 900; fl.Q.value = 1.2;
    const vib = ctx.createOscillator(); vib.frequency.value = 5.5; const vg = ctx.createGain(); vg.gain.value = f * 0.012; vib.connect(vg);
    for (const [mul, type] of [[1, 'sine'], [2, 'triangle']]) { const o = ctx.createOscillator(); o.type = type; o.frequency.value = f * mul; vg.connect(o.frequency); const og = ctx.createGain(); og.gain.value = mul === 1 ? 1 : 0.35; o.connect(og).connect(fl); o.start(t); o.stop(t + dur + 0.3); }
    fl.connect(g).connect(master); vib.start(t); vib.stop(t + dur + 0.3);
    if (bright) pluck(f * 2, 0, 0.6, 0.05);
  },
  glitchGo: () => { for (let i = 0; i < 6; i++) pluck(200 + Math.random() * 1600, i * 0.04, 0.06, 0.06, master, 'square'); },
  glitch: () => { for (let i = 0; i < 4; i++) pluck(300 + Math.random() * 2000, i * 0.03, 0.05, 0.05, master, 'square'); noise(0.12, 3000, 0.2); },
  strike: () => { noise(0.3, 2400, 0.4, 0, 0.6); pluck(90, 0, 0.25, 0.15, master, 'square'); },
  echoStart: () => [72, 76, 79].forEach((m, i) => pluck(mtof(m), i * 0.07, 0.5, 0.06)),
  chord: (ms) => { [...new Set(ms)].concat([84]).forEach((m, i) => pluck(mtof(m), i * 0.03, 1.8, 0.09)); },
  offKey: () => { pluck(mtof(61), 0, 0.5, 0.1, master, 'sawtooth'); pluck(mtof(62), 0, 0.5, 0.08, master, 'sawtooth'); },
  snap: () => { noise(0.2, 1800, 0.6, 0, 2); pluck(mtof(88), 0, 0.4, 0.1, master, 'triangle'); pluck(mtof(64), 0.05, 0.9, 0.12, master, 'triangle'); },
};
// a gentle, slightly melancholic music-box waltz in A minor
const SONG = [
  [69, 72, 76], [74, 72, 69], [71, 74, 77], [76, 74, 71], [72, 76, 79], [77, 76, 72], [71, 74, 76], [72, 71, 69],
  [69, 72, 76], [74, 72, 69], [71, 74, 77], [79, 77, 76], [77, 76, 74], [76, 74, 72], [71, 72, 74], [69, -1, -1],
];
const BASS = [45, 50, 47, 52, 48, 53, 52, 45, 45, 50, 47, 52, 50, 48, 52, 45];
export function setMusic(on) {
  const was = playing; playing = on; if (!ctx) return;
  if (waltzOn()) { music.gain.setTargetAtTime(on && !snd.muted && !bossOn ? 1 : 0, ctx.currentTime, 0.4); if (on && nextT < ctx.currentTime) nextT = ctx.currentTime + 0.1; }
  else applyMain(on ? 1.2 : 0.5, on && !was);
}
export function tickMusic(tempo = 1) {
  if (!waltzOn()) return;
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
export function setMuted(m) {
  snd.muted = m; if (!ctx) return;
  music.gain.value = m || !playing || bossOn || !waltzOn() ? 0 : 1;
  if (mainGain) { mainGain.gain.cancelScheduledValues(ctx.currentTime); mainGain.gain.value = m || !playing || bossOn ? 0 : MAIN_VOL; }
  if (bossGain) { bossGain.gain.cancelScheduledValues(ctx.currentTime); bossGain.gain.value = m || !bossOn ? 0 : BOSS_VOL; }
}

// pausing the game freezes every sound in place
export function pauseAudio(on) { if (!ctx) return; if (on) ctx.suspend(); else ctx.resume(); }
