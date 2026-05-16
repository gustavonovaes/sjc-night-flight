import { ST } from "./types";
import type {
  Particle, FloatText, RadioQueueItem, HordeItem, CbersMission,
  DevState, DevItemRect, TouchState, PlayerStats, DifficultyConfig, PerkDef,
} from "./types";
import { DIFFICULTIES } from "./constants";

// Type-only imports to avoid circular runtime deps (entities/multiplayer import state at runtime).
import type { Player, Bullet, HomingMissile, Enemy, EBullet, Collectible } from "./entities";

export const state = {
  // Game state machine
  gState: ST.MENU as ST,

  // Frame counter + FPS
  frame: 0,
  fps: 0,
  _fpsCount: 0,
  _fpsTs: 0,

  // Score / combo
  score: 0,
  combo: 1,
  comboT: 0,
  hiScore: 0,

  // Entity lists (typed via import type — no runtime circular dep)
  player:       null as Player | null,
  bullets:      [] as (Bullet | HomingMissile)[],
  enemies:      [] as Enemy[],
  eBullets:     [] as EBullet[],
  collectibles: [] as Collectible[],
  particles:    [] as Particle[],
  floaters:     [] as FloatText[],

  // World scrolling
  dayPhase: 0.02,
  off1: 0, off2: 0, off3: 0, offSky: 0,
  scrollSpd: 2,

  // Game timers
  spawnT: 60,
  collectT: 100,
  shakeAmt: 0,

  // Wave / boss
  bossAlive: false,
  waveText: "",
  waveT: 0,
  waveNum: 0,
  ovniEventT: 2200,
  hordeQueue: [] as HordeItem[],
  hordeSpawnT: 0,
  currentPhase: 0,

  // High-score key
  hsKey: "sjc_hi_aventura",

  // Player / difficulty selection
  selectedPlane: 0,
  selectedDifficulty: 0,
  diffCfg: DIFFICULTIES[0] as DifficultyConfig,

  // Per-run statistics
  playerStats: {
    pw: {} as Record<string, number>,
    kills: 0, hits: 0, grazes: 0, maxCombo: 1,
    shotsFired: 0, shotsHit: 0,
    bossKills: 0, shieldBlocks: 0, nearDeathHits: 0, comboKills: 0,
    longestGrazeStreak: 0, wavesWithoutHit: 0,
    startTime: 0,
  } as PlayerStats,

  // Dynamic Difficulty Adjustment
  ddaStress: 0.5,
  _curGrazeStreak: 0,
  _waveHits: 0,

  // Radio / mission
  radioText: "",
  radioT: 0,
  radioQueue: [] as RadioQueueItem[],
  grazeCount: 0,
  cbersMission: null as CbersMission | null,
  cbersMissionT: 3800,

  // Dev panel
  dev: {
    open: false,
    escHold: 0,
    openCooldown: 0,
    godMode: false,
    noProj: false,
    daySpeed: 1,
    selectedScene: 0,
    cursor: 0,
  } as DevState,
  devItemRects: [] as DevItemRect[],

  // Level-up system
  playerLevel: 0,
  levelUpCards: null as PerkDef[] | null,

  // Slow-motion effect (cigarra morph)
  slowMoT: 0,

  // Audio
  AC: null as AudioContext | null,
  audioFailed: false,
  playlistIdx: 6,
  mIdx: 0,
  mActive: false,
  mTimer: null as ReturnType<typeof setTimeout> | null,

  // Input
  keys: {} as Record<string, boolean>,
  touch: {
    active: false, vx: 0, vy: 0, cx: 0, cy: 0, kx: 0, ky: 0,
  } as TouchState,
};
