"use strict";

let AC = null;
function ensureAC() {
  if (!AC) {
    AC = new (window.AudioContext || window.webkitAudioContext)();
  }
  // Browsers suspendem o AudioContext até haver interação do usuário
  if (AC.state === "suspended") AC.resume();
}

function tone(freq, dur, type, vol) {
  try {
    const o = AC.createOscillator();
    const g = AC.createGain();
    o.connect(g);
    g.connect(AC.destination);
    o.type = type || "square";
    o.frequency.value = freq;
    g.gain.setValueAtTime(vol || 0.07, AC.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, AC.currentTime + dur);
    o.start();
    o.stop(AC.currentTime + dur);
  } catch (e) {}
}
function noise(dur, vol) {
  try {
    const len = Math.floor(AC.sampleRate * dur);
    const buf = AC.createBuffer(1, len, AC.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++)
      d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = AC.createBufferSource();
    const g = AC.createGain();
    src.buffer = buf;
    src.connect(g);
    g.connect(AC.destination);
    g.gain.value = vol || 0.12;
    src.start();
    src.stop(AC.currentTime + dur);
  } catch (e) {}
}

// Volume do tiro bem baixo — não deve competir com a música de fundo
function sfxShoot() {
  tone(880, 0.06, "square", 0.022);
}
function sfxHit() {
  tone(160, 0.22, "sawtooth", 0.09);
  noise(0.15, 0.05);
}
// Explosão de inimigo — ligeiramente mais suave que antes
function sfxBang() {
  tone(320, 0.07, "sine", 0.045);
  noise(0.05, 0.025);
}
function sfxCollect() {
  [380, 560, 840].forEach((f, i) =>
    setTimeout(() => tone(f, 0.1, "sine", 0.09), i * 55),
  );
}
function sfxPowerup() {
  [300, 420, 560, 720, 960].forEach((f, i) =>
    setTimeout(() => tone(f, 0.09, "triangle", 0.10), i * 45),
  );
}
function sfxBossIn() {
  tone(55, 0.6, "sawtooth", 0.11);
  tone(75, 0.6, "square", 0.07);
}

// Repertório: arcade clássico + chill hip-hop (fases 1-2) + rock (fases 3-4)
const PLAYLISTS = [
  // 0 — Tema original arcade
  [220, 261.63, 329.63, 392, 493.88, 392, 329.63, 261.63, 220, 261.63, 369.99, 440],
  // 1 — Tetris (Korobeiniki)
  [659.25, 493.88, 523.25, 587.33, 523.25, 493.88, 440, 440, 523.25, 659.25,
   587.33, 523.25, 493.88, 523.25, 587.33, 659.25, 523.25, 440, 440],
  // 2 — Space Invaders — descendente marcial
  [440, 415.30, 391.99, 369.99, 349.23, 329.63, 311.13, 293.66, 277.18,
   293.66, 311.13, 329.63, 349.23, 369.99, 391.99, 415.30, 440],
  // 3 — Galaga — arpejo tríade menor
  [293.66, 349.23, 440, 587.33, 440, 349.23, 293.66, 246.94,
   293.66, 369.99, 466, 587.33, 466, 369.99, 293.66],
  // 4 — Pac-Man intro
  [523.25, 659.25, 783.99, 1046.5, 987.77, 783.99, 880, 1046.5,
   987.77, 880, 783.99, 659.25, 523.25, 440, 392, 329.63],
  // 5 — Super Mario overworld
  [659.25, 659.25, 0, 659.25, 0, 523.25, 659.25, 0, 783.99, 0, 0, 0,
   392, 0, 0, 0, 523.25, 0, 0, 392, 0, 0, 329.63, 0, 0, 349.23, 0, 466,
   493.88, 0, 466, 0, 440, 0, 392],
  // 6 — Chill Hip-Hop I — Dm pentatônica, lofi groove
  [146.83, 0, 0, 174.61, 0, 196, 0, 0, 220, 0, 261.63, 0, 0, 220, 0, 196,
   0, 0, 174.61, 0, 0, 196, 0, 220, 0, 0, 261.63, 0, 220, 0, 0, 196],
  // 7 — Chill Hip-Hop II — Am swing, mais pulsante
  [110, 0, 130.81, 0, 0, 146.83, 0, 164.81, 0, 0, 196, 0, 164.81, 0, 0, 146.83,
   0, 0, 130.81, 0, 110, 0, 0, 130.81, 0, 164.81, 0, 0, 196, 0, 0, 164.81],
  // 8 — Rock I — Em power riff
  [164.81, 164.81, 0, 196, 0, 246.94, 246.94, 0, 220, 0, 164.81, 0, 0, 196,
   0, 329.63, 0, 246.94, 0, 196, 164.81, 0, 0, 246.94, 0, 329.63, 329.63, 0, 246.94, 0, 0, 164.81],
  // 9 — Rock II — pesado/heavy, modo inferior
  [220, 220, 0, 220, 293.66, 0, 329.63, 0, 293.66, 220, 0, 0, 220, 0, 196,
   0, 220, 0, 0, 293.66, 329.63, 0, 293.66, 0, 220, 0, 0, 196, 0, 0, 440, 220],
];
const PLAYLIST_TEMPOS = [280, 280, 280, 280, 280, 280, 350, 310, 210, 180];
const PLAYLIST_LABELS = ["Arcade", "Tetris", "Space Invaders", "Galaga", "Pac-Man", "Mario",
  "Chill Hip-Hop I", "Chill Hip-Hop II", "Rock I", "Rock II"];
// índice = onda (0-9+); cicla após a última
const WAVE_PLAYLIST = [6, 0, 7, 1, 2, 8, 3, 4, 9, 5];

let playlistIdx = 6;
let mIdx = 0;
let mActive = false;
let mTimer = null;
function startMusic() {
  if (mActive) return;
  mActive = true;
  const next = () => {
    if (!mActive) return;
    if (gState === ST.PLAY) {
      const pl = PLAYLISTS[playlistIdx];
      const freq = pl[mIdx++ % pl.length];
      if (freq) tone(freq, 0.22, "triangle", 0.062); // volume aumentado para se destacar dos SFX
    }
    mTimer = setTimeout(next, PLAYLIST_TEMPOS[playlistIdx] || 280);
  };
  next();
}
function switchMusicForPhase(wave) {
  const idx = WAVE_PLAYLIST[wave % WAVE_PLAYLIST.length] ?? 6;
  if (playlistIdx === idx) return;
  playlistIdx = idx;
  mIdx = 0;
  stopMusic();
  startMusic();
}
function stopMusic() {
  mActive = false;
  if (mTimer) {
    clearTimeout(mTimer);
    mTimer = null;
  }
}
