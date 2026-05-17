import { ST } from "./types";
import { PLAYLISTS, PLAYLIST_TEMPOS, WAVE_PLAYLIST } from "./constants";
import { state } from "./state";

const _sfxNext: Record<string, number> = {};

function _ok(key: string, gapSec: number): boolean {
  if (!state.AC) return false;
  const t = state.AC.currentTime;
  if (t < (_sfxNext[key] ?? 0)) return false;
  _sfxNext[key] = t + gapSec;
  return true;
}

export function ensureAC(): void {
  try {
    if (!state.AC) {
      state.AC = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    }
    if (state.AC.state === "suspended") state.AC.resume();
    state.audioFailed = false;
  } catch {
    state.audioFailed = true;
  }
}

function tone(freq: number, dur: number, type: OscillatorType, vol: number): void {
  try {
    if (!state.AC) return;
    const o = state.AC.createOscillator();
    const g = state.AC.createGain();
    o.connect(g);
    g.connect(state.AC.destination);
    o.type = type || "square";
    o.frequency.value = freq;
    g.gain.setValueAtTime(vol || 0.07, state.AC.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, state.AC.currentTime + dur);
    o.start();
    o.stop(state.AC.currentTime + dur);
  } catch { /* audio not available */ }
}

function noise(dur: number, vol: number): void {
  try {
    if (!state.AC) return;
    const len = Math.floor(state.AC.sampleRate * dur);
    const buf = state.AC.createBuffer(1, len, state.AC.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = state.AC.createBufferSource();
    const g = state.AC.createGain();
    src.buffer = buf;
    src.connect(g);
    g.connect(state.AC.destination);
    g.gain.value = vol || 0.12;
    src.start();
    src.stop(state.AC.currentTime + dur);
  } catch { /* audio not available */ }
}

export function sfxShoot(): void   { if (_ok("shoot",   0.05)) tone(880, 0.06, "square",   0.022); }
export function sfxHit(): void        { if (_ok("hit",       0.08)) { tone(160, 0.22, "sawtooth", 0.09); noise(0.15, 0.05); } }
export function sfxShieldHit(): void  { if (_ok("shieldhit", 0.06)) { tone(1100, 0.08, "triangle", 0.06); tone(800, 0.12, "sine", 0.04); } }
export function sfxBang(): void    { if (_ok("bang",    0.06)) { tone(320, 0.07, "sine",     0.045); noise(0.05, 0.025); } }
export function sfxBossIn(): void  { if (_ok("bossIn",  0.25)) { tone(55, 0.6, "sawtooth", 0.11); tone(75, 0.6, "square", 0.07); } }
export function sfxDestroy(): void { if (_ok("destroy", 0.25)) { tone(80, 0.9, "sawtooth", 0.13); tone(50, 1.1, "square", 0.09); noise(1.0, 0.08); [120, 90, 60].forEach((f, i) => setTimeout(() => tone(f, 0.3, "sawtooth", 0.06), i * 120)); } }

export function sfxCollect(): void {
  if (!_ok("collect", 0.15)) return;
  [380, 560, 840].forEach((f, i) => setTimeout(() => tone(f, 0.1, "sine", 0.09), i * 55));
}

export function sfxPowerup(): void {
  [300, 420, 560, 720, 960].forEach((f, i) =>
    setTimeout(() => tone(f, 0.09, "triangle", 0.10), i * 45));
}

export function startMusic(): void {
  if (state.mActive) return;
  state.mActive = true;
  const next = () => {
    if (!state.mActive) return;
    if (state.gState === ST.PLAY) {
      const pl = PLAYLISTS[state.playlistIdx];
      const freq = pl[state.mIdx++ % pl.length];
      if (freq) tone(freq, 0.22, "triangle", 0.062);
    }
    state.mTimer = setTimeout(next, PLAYLIST_TEMPOS[state.playlistIdx] || 280);
  };
  next();
}

export function sfxLevelUp(): void {
  // Fanfarra ascendente + chord final
  const seq = [523.25, 659.25, 783.99, 1046.50];
  seq.forEach((f, i) => setTimeout(() => tone(f, 0.14, "triangle", 0.10), i * 80));
  setTimeout(() => {
    tone(1046.50, 0.40, "triangle", 0.10);
    tone(1318.51, 0.40, "sine",     0.06);
    tone(783.99,  0.40, "triangle", 0.05);
  }, seq.length * 80);
}

export function startLevelUpMusic(): void {
  stopMusic();
  state.playlistIdx = 12; // índice da playlist de level-up
  state.mIdx = 0;
  state.mActive = true;
  const next = () => {
    if (!state.mActive) return;
    if (state.gState !== ST.LEVELUP) { state.mActive = false; return; }
    const pl = PLAYLISTS[state.playlistIdx];
    const freq = pl[state.mIdx++ % pl.length];
    if (freq) tone(freq, 0.20, "sine", 0.055);
    state.mTimer = setTimeout(next, 260);
  };
  next();
}

export function stopMusic(): void {
  state.mActive = false;
  if (state.mTimer) { clearTimeout(state.mTimer); state.mTimer = null; }
}

export function switchMusicForPhase(wave: number): void {
  const idx = WAVE_PLAYLIST[wave % WAVE_PLAYLIST.length] ?? 6;
  if (state.playlistIdx === idx) return;
  state.playlistIdx = idx;
  state.mIdx = 0;
  stopMusic();
  startMusic();
}

export function startMenuMusic(diffIdx: number): void {
  stopMusic();
  state.playlistIdx = diffIdx === 1 ? 11 : 10;
  state.mIdx = 0;
  state.mActive = true;
  const next = () => {
    if (!state.mActive) return;
    if (state.gState === ST.MENU || state.gState === ST.ABOUT || state.gState === ST.OVER) {
      const pl = PLAYLISTS[state.playlistIdx];
      const freq = pl[state.mIdx++ % pl.length];
      if (freq) tone(freq, 0.20, "triangle", 0.055);
    }
    state.mTimer = setTimeout(next, PLAYLIST_TEMPOS[state.playlistIdx] || 280);
  };
  next();
}
