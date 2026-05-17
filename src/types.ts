export enum ST {
  MENU    = 0,
  PLAY    = 1,
  PAUSE   = 2,
  OVER    = 3,
  ABOUT   = 4,
  LOBBY   = 5,
  MULTI   = 6,
  LEVELUP = 7,
}

export interface PerkDef {
  id: string;
  name: string;
  desc: string;
  icon: string;
  col: string;
}

export interface PlayerPerks {
  bulletEvasion:   number; // 0-1: prob. de ignorar projéteis
  impactEvasion:   number; // 0-1: prob. de ignorar colisões
  dmgBonus:        number; // dano extra por tiro (inteiro)
  grazeRadiusMult: number; // multiplicador do raio de rasante (padrão 1.0)
  comboTimeMult:   number; // multiplicador da duração do combo (padrão 1.0)
  invMult:         number; // multiplicador da invulnerabilidade pós-dano (padrão 1.0)
}

export interface PlaneConfig {
  id: string;
  name: string;
  icon: string;
  accel: number;
  maxSpd: number;
  fireN: number;
  lives: number;
  unlock: number;
}

export interface DifficultyConfig {
  id: string;
  name: string;
  icon: string;
  col: string;
  desc: string;
  comboMax: number;
  spawnMin: number;
  spawnBase: number;
  spawnWaveMult: number;
  spawnTimeMult: number;
  bossInterval: number;
  doubleBossWave: number;
  hpMult: number;
  dropMult: number;
  hsKey: string;
}

export interface PlayerStats {
  pw: Record<string, number>;
  kills: number;
  hits: number;
  grazes: number;
  maxCombo: number;
  shotsFired: number;
  shotsHit: number;
  bossKills: number;
  shieldBlocks: number;
  nearDeathHits: number;
  comboKills: number;
  longestGrazeStreak: number;
  wavesWithoutHit: number;
  startTime: number;
  timeSurvived?: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  size: number;
  col: string;
}

export interface FloatText {
  txt: string;
  x: number;
  y: number;
  vy: number;
  lifetime: number;
  col: string;
}

export interface TrailParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  size: number;
  hue?: number;
  smoke?: boolean;
}

export interface HordeItem {
  type: string;
}

export interface RadioQueueItem {
  text: string;
  delay: number;
}

export interface CbersMission {
  x: number;
  y: number;
  hp: number;
  bonus: number;
}

export interface DevState {
  open: boolean;
  escHold: number;
  openCooldown: number;
  godMode: boolean;
  noProj: boolean;
  daySpeed: number;
  selectedScene: number;
  cursor: number;
  showHitboxes: boolean;
  showDebugOverlay: boolean;
}

export interface DevItemRect {
  i: number;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface TouchState {
  active: boolean;
  vx: number;
  vy: number;
  cx: number;
  cy: number;
  kx: number;
  ky: number;
}

export interface Circle {
  x: number;
  y: number;
  r: number;
}

export interface SkyKeyframe {
  t: number;
  c: string[];
  sun: number;
  moon: number;
  st: number;
}

export interface SkyKeyframeProcessed extends SkyKeyframe {
  cr: [number, number, number][];
}

export interface SkyValues {
  zenith: string;
  midhi: string;
  midlo: string;
  horizon: string;
  sun: number;
  moon: number;
  st: number;
}

export interface Star {
  x: number;
  y: number;
  r: number;
  tw: number;
  spd: number;
}

export interface Building {
  x: number;
  w: number;
  h: number;
  type: string;
  litSeed: number;
}

export interface TreeData {
  ox: number;
  h: number;
}

export interface CarData {
  lane: number;
  offset: number;
  spd: number;
}

export interface CollectibleType {
  id: string;
  lbl: string;
  pts: number;
  col: string;
  glow: string;
  icon: string;
  pw?: string;
  rare?: boolean;
}

export interface WaveDef {
  name: string;
  phase: number;
  horde: HordeItem[];
}

export type DevItemKind = "toggle" | "action" | "header";
export interface DevItem {
  lbl: string;
  type: DevItemKind;
  col: number;
  get?: () => boolean;
  set?: (v: boolean) => void;
  run?: () => void;
}

export interface DevScene {
  lbl: string;
  phase: number;
}

export interface PlayerSnapshot {
  x: number;
  y: number;
  vx: number;
  vy: number;
  tilt: number;
  ts: number;
}

export interface BuffsState {
  shield: boolean;
  boost: boolean;
  bis: boolean;
  avibras: boolean;
  inpe: boolean;
  revap: boolean;
  delta: boolean;
  ericsson: boolean;
}

export interface ServerEnemy {
  id: string;
  type: string;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  isBoss: boolean;
}

export interface ServerCollectible {
  id: string;
  ctype: string;
  x: number;
  y: number;
}

export interface SosItem {
  id: string;
  x: number;
  y: number;
  deadId: string;
  spawnTime: number;
  duration: number;
}
