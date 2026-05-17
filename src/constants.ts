import type { PlaneConfig, DifficultyConfig, CollectibleType, WaveDef, HordeItem, DevScene, Star, Building, TreeData, CarData, SkyKeyframe, PerkDef } from "./types";

export const W = 800;
export const H = 450;

export const FIRE_N = 24;
export const FIRE_B = 7;

export const SHIELD_DUR   = 300;
export const BOOST_DUR    = 340;
export const BIS_DUR      = 480;
export const AVIBRAS_DUR  = 540;
export const INPE_DUR     = 420;
export const REVAP_DUR    = 260;
export const DELTA_DUR    = 420;
export const ERICSSON_DUR = 540;
export const INV = 120;

export const JOY_MAX = 82;

export const TOTAL_KEY = "sjc_total_score";

export const DEV_BTN = { x: W - 50, y: H - 24, w: 46, h: 20 };
export const _MP_BTN_RECT = { x: W / 2 - 118, y: H / 2 + 184, w: 236, h: 22 };

export const MP_COLORS = ["#60a5fa", "#f472b6", "#34d399", "#fbbf24"];

export const BOSS_TYPES = ["boss", "prototipo_x", "cemaden_eye", "engrenagem", "cigarra"] as const;
export type BossType = typeof BOSS_TYPES[number];

export const BOSS_ROTATION = ["boss", "cemaden_eye", "engrenagem", "cigarra", "prototipo_x"] as const;

export const BOSS_LABELS: Record<string, string> = {
  boss:        "MONSTRO CLIMÁTICO",
  prototipo_x: "PROTÓTIPO X",
  cemaden_eye: "OLHO DO CEMADEN",
  engrenagem:  "GRANDE ENGRENAGEM",
  cigarra:     "A CIGARRA",
};

// ── Level-up perks ────────────────────────────────────────────────────────────
export const PERKS: PerkDef[] = [
  { id: "bullet_resist", icon: "🛡",  col: "#60a5fa", name: "Colete Balístico",    desc: "30% de chance de ignorar\nprojéteis inimigos" },
  { id: "impact_resist", icon: "⚙",  col: "#94a3b8", name: "Chassi Reforçado",    desc: "30% de chance de sobreviver\ncolisões com inimigos" },
  { id: "damage_up",     icon: "💥", col: "#f87171", name: "Munição Perfurante",   desc: "+1 dano por tiro\n(elimina inimigos em menos hits)" },
  { id: "speed_up",      icon: "⚡", col: "#34d399", name: "Motor Aprimorado",     desc: "+0.8 de velocidade\nmáxima permanente" },
  { id: "extra_life",    icon: "❤",  col: "#ef4444", name: "Veterano",             desc: "+1 vida extra\npermanente" },
  { id: "fire_rate",     icon: "🔫", col: "#fbbf24", name: "Gatilho Afiado",       desc: "Cadência de tiro +15%\npermanente" },
  { id: "graze_range",   icon: "✦",  col: "#fde68a", name: "Rasante Habilidoso",   desc: "Área de rasante +35%\n(projéteis e inimigos)" },
  { id: "combo_time",    icon: "🎯", col: "#c084fc", name: "Foco Total",           desc: "Combo dura 30%\nmais tempo" },
  { id: "inv_extend",    icon: "⏱",  col: "#818cf8", name: "Reflexos Aguçados",    desc: "Invulnerabilidade pós-dano\n+50%" },
  { id: "spread_shot",   icon: "🔱", col: "#f0abfc", name: "Canhão em Leque",      desc: "+1 faixa de disparo em ângulo\n(acumula a cada nível)" },
];

export const PLANES: PlaneConfig[] = [
  {
    id: "tucano", name: "EMB-314 Super Tucano", icon: "✈",  accel: 0.30, maxSpd: 4.0, fireN: FIRE_N, lives: 3, unlock: 0,
    specialIcon: "🔥", specialName: "Rajada de Canhão",
    specialMaxCD: 1080, specialGrazeCDR: 45, specialKillCDR: 90,
  },
  {
    id: "e2",     name: "Embraer E2",           icon: "🛫", accel: 0.25, maxSpd: 5.0, fireN: 20,     lives: 2, unlock: 3000,
    specialIcon: "💨", specialName: "Manobra Evasiva",
    specialMaxCD: 720,  specialGrazeCDR: 60, specialKillCDR: 70,
  },
  {
    id: "c390",   name: "C-390 Millennium",     icon: "🚀", accel: 0.20, maxSpd: 3.2, fireN: 30,     lives: 4, unlock: 8000,
    specialIcon: "💣", specialName: "Bombardeio em Área",
    specialMaxCD: 1680, specialGrazeCDR: 30, specialKillCDR: 150,
  },
];

export const DIFFICULTIES: DifficultyConfig[] = [
  {
    id: "aventura", name: "AVENTURA", icon: "🌅", col: "#34d399",
    desc: "Diversão garantida — curta cada onda",
    comboMax: 10,
    spawnMin: 44, spawnBase: 170, spawnWaveMult: 5, spawnTimeMult: 300,
    bossInterval: 4800, doubleBossWave: 18,
    hpMult: 0.65, dropMult: 1.5, hsKey: "sjc_hi_aventura",
    specialCDMult: 1.3, specialWaveCDMult: 0.04,
  },
  {
    id: "radical", name: "RADICAL", icon: "🔥", col: "#ef4444",
    desc: "Caos total — combo até 50×",
    comboMax: 50,
    spawnMin: 20, spawnBase: 120, spawnWaveMult: 6, spawnTimeMult: 300,
    bossInterval: 2400, doubleBossWave: 9,
    hpMult: 1.2, dropMult: 0.90, hsKey: "sjc_hi_radical",
    specialCDMult: 2.0, specialWaveCDMult: 0.05,
  },
];

export const RADIO_MSGS: Record<string, string> = {
  wave_0: "Torre SJC: Frente fria detectada sobre a Dutra. Proteja o Vale!",
  wave_1: "DCTA Controle: Contatos radar múltiplos. Drones hostis confirmados.",
  wave_2: "Torre SJC: Bando de araras-azuis em rota de colisão!",
  wave_3: "FAB 1986: Objetos não identificados na frequência. Situação OVNI.",
  wave_4: "Comandante FAB: Invasão coordenada detectada. Todos os sistemas ativos.",
  wave_5: "CEMADEN: Tempestade de categoria máxima. Evacuação imediata!",
  boss:   "Torre SJC: ⚠️ CONTATO DE GRANDE PORTE. Fogo à vontade.",
  ovni:   "FAB Radar: Objetos de 19/05/1986 confirmados. Interceptar!",
  collect_avibras: "Avibras: Mísseis ASTROS carregados. Fogo livre!",
  collect_14bis:   "ITA: Sistema 14-BIS ativado. Invencibilidade total.",
  hit_low: "Torre SJC: Piloto, último HP! Encontre escudo urgente!",
};

function _buildHorde(spec: [string, number][]): HordeItem[] {
  const arr: HordeItem[] = [];
  for (const [type, n] of spec) for (let i = 0; i < n; i++) arr.push({ type });
  return arr;
}

export const WAVE_DEFS: WaveDef[] = [
  { name: "Frente Fria da Mantiqueira",    phase: 1, horde: _buildHorde([["cloud",3],["drone",3]]) },
  { name: "Patrulha de Drones DCTA",       phase: 1, horde: _buildHorde([["drone",5],["cloud",2],["arara",2]]) },
  { name: "Bando de Araras Furiosas",      phase: 2, horde: _buildHorde([["arara",5],["drone",3],["cloud",1],["balao",1]]) },
  { name: "Noite dos Discos Voadores",     phase: 2, horde: _buildHorde([["ovni",3],["arara",3],["drone",2],["balao",1]]) },
  { name: "Invasão Coordenada",            phase: 3, horde: _buildHorde([["ovni",4],["arara",3],["drone",3],["cloud",1],["helicoptero",2]]) },
  { name: "Tempestade Total",              phase: 3, horde: _buildHorde([["ovni",4],["arara",4],["drone",3],["cloud",2],["helicoptero",2],["balao",2]]) },
  { name: "Alerta CEMADEN — Nível Máximo", phase: 4, horde: _buildHorde([["ovni",5],["arara",4],["drone",4],["cloud",2],["helicoptero",3],["tanajura",3],["balao",2]]) },
  { name: "Caos Sobre o Vale",             phase: 4, horde: _buildHorde([["ovni",6],["arara",5],["drone",4],["cloud",3],["helicoptero",3],["tanajura",4],["balao",2]]) },
  { name: "Batalha Final do Guardião",     phase: 4, horde: _buildHorde([["ovni",7],["arara",6],["drone",5],["cloud",3],["helicoptero",4],["tanajura",5],["balao",3]]) },
];

// Melodia de level-up: theme triunfal em lá maior
const _LEVELUP_THEME = [
  880, 0, 880, 0, 880, 0, 698.46, 0, 880, 0, 0, 1046.50, 0, 0,
  987.77, 0, 880, 0, 783.99, 0, 880, 0, 0, 0, 783.99, 0, 0, 0,
  698.46, 0, 783.99, 0, 880, 0, 783.99, 0, 698.46, 0, 659.25, 0,
  880, 0, 1046.50, 0, 987.77, 0, 880, 0,
];

const _MENU_THEME = [
  523.25, 659.25, 783.99, 1046.50, 987.77, 783.99, 659.25, 523.25,
  440,    523.25, 659.25, 880,     783.99, 659.25, 523.25, 392,
  349.23, 440,    523.25, 698.46,  659.25, 523.25, 440,    349.23,
  392,    493.88, 587.33, 783.99,  698.46, 587.33, 493.88, 392,
];

export const PLAYLISTS: number[][] = [
  // 0 — Arcade clássico (Ode à Alegria variada)
  [329.63, 329.63, 349.23, 392, 392, 349.23, 329.63, 293.66,
   261.63, 261.63, 293.66, 329.63, 329.63, 0, 293.66, 293.66,
   329.63, 329.63, 349.23, 392, 392, 349.23, 329.63, 293.66,
   261.63, 261.63, 293.66, 329.63, 293.66, 0, 261.63, 261.63],
  // 1 — Tetris (Korobeiniki)
  [659.25, 493.88, 523.25, 587.33, 523.25, 493.88, 440, 440,
   523.25, 659.25, 587.33, 523.25, 493.88, 0, 523.25, 587.33,
   659.25, 523.25, 440, 440, 0, 0, 587.33, 783.99, 987.77,
   880, 783.99, 659.25, 0, 523.25, 659.25, 587.33],
  // 2 — Descendente épico
  [440, 415.30, 391.99, 369.99, 349.23, 329.63, 311.13, 293.66,
   277.18, 293.66, 311.13, 329.63, 349.23, 369.99, 391.99, 415.30,
   440, 466.16, 493.88, 523.25, 493.88, 466.16, 440, 415.30,
   391.99, 369.99, 391.99, 415.30, 440, 493.88, 523.25, 587.33],
  // 3 — Galáxia (Galaga-style)
  [293.66, 349.23, 440, 587.33, 523.25, 440, 349.23, 293.66,
   261.63, 293.66, 369.99, 466, 523.25, 440, 369.99, 293.66,
   329.63, 392, 493.88, 659.25, 587.33, 493.88, 392, 329.63,
   293.66, 349.23, 440, 587.33, 440, 349.23, 261.63, 0],
  // 4 — Pac-Man chase
  [523.25, 587.33, 659.25, 698.46, 783.99, 880, 987.77, 1046.50,
   987.77, 880, 783.99, 698.46, 659.25, 587.33, 523.25, 493.88,
   523.25, 659.25, 783.99, 987.77, 880, 783.99, 659.25, 523.25,
   440, 392, 329.63, 293.66, 329.63, 392, 440, 523.25],
  // 5 — Mario (Super Mario Bros tema principal)
  [659.25, 659.25, 0, 659.25, 0, 523.25, 659.25, 0, 783.99, 0, 0, 0,
   392, 0, 0, 0, 523.25, 0, 0, 392, 0, 0, 329.63, 0, 0, 349.23, 0, 466,
   493.88, 0, 466, 0, 440, 0, 392, 0, 659.25, 783.99, 880, 698.46, 783.99,
   0, 659.25, 0, 523.25, 587.33, 493.88, 0, 523.25],
  // 6 — Chill Hip-Hop I (lo-fi night)
  [146.83, 0, 0, 174.61, 0, 196, 0, 0, 220, 0, 261.63, 0, 0, 220, 0, 196,
   0, 0, 174.61, 0, 0, 196, 0, 220, 0, 0, 261.63, 0, 220, 0, 0, 196,
   174.61, 0, 164.81, 0, 0, 155.56, 0, 164.81, 0, 174.61, 0, 196, 0, 0, 220, 0],
  // 7 — Chill Hip-Hop II
  [110, 0, 130.81, 0, 0, 146.83, 0, 164.81, 0, 0, 196, 0, 164.81, 0, 0, 146.83,
   0, 0, 130.81, 0, 110, 0, 0, 130.81, 0, 164.81, 0, 0, 196, 0, 0, 164.81,
   146.83, 0, 164.81, 0, 196, 0, 220, 0, 246.94, 0, 220, 0, 196, 0, 0, 164.81],
  // 8 — Rock I (riff agressivo)
  [164.81, 164.81, 0, 196, 0, 246.94, 246.94, 0, 220, 0, 164.81, 0, 0, 196,
   0, 329.63, 0, 246.94, 0, 196, 164.81, 0, 0, 246.94, 0, 329.63, 329.63, 0, 246.94, 0,
   220, 196, 164.81, 0, 196, 0, 246.94, 0, 329.63, 0, 392, 349.23, 329.63, 246.94, 0, 0, 220, 0],
  // 9 — Rock II (power chords)
  [220, 220, 0, 220, 293.66, 0, 329.63, 0, 293.66, 220, 0, 0, 220, 0, 196,
   0, 220, 0, 0, 293.66, 329.63, 0, 293.66, 0, 220, 0, 0, 196, 0, 0, 440, 220,
   329.63, 0, 329.63, 0, 329.63, 293.66, 0, 261.63, 0, 293.66, 0, 329.63, 0, 392, 0, 0],
  // 10 — Menu Arcade
  _MENU_THEME,
  // 11 — Menu Arcade Fast
  _MENU_THEME,
  // 12 — Level-Up (triunfal)
  _LEVELUP_THEME,
];
export const PLAYLIST_TEMPOS = [260, 240, 260, 250, 220, 200, 350, 310, 190, 175, 235, 185, 260];
export const PLAYLIST_LABELS = [
  "Arcade", "Tetris", "Épico", "Galáxia", "Pac-Man", "Mario",
  "Chill Hip-Hop I", "Chill Hip-Hop II", "Rock I", "Rock II",
  "Menu Arcade", "Menu Arcade Fast", "Level-Up",
];
export const WAVE_PLAYLIST = [6, 0, 7, 1, 2, 8, 3, 4, 9, 5];

export const DEV_SCENES: DevScene[] = [
  { lbl: "Auto",       phase: -1 },
  { lbl: "Madrugada",  phase: 0.05 },
  { lbl: "Nascer",     phase: 0.28 },
  { lbl: "Manhã",      phase: 0.40 },
  { lbl: "Tarde",      phase: 0.60 },
  { lbl: "Pôr do sol", phase: 0.73 },
  { lbl: "Noite",      phase: 0.90 },
];

// ── Sky ───────────────────────────────────────────────────────────────────────

export const SKY_KF: SkyKeyframe[] = [
  { t: 0.00, c: ["#010112","#05053a","#1a1060","#c84860"], sun: 0,    moon: 1.0, st: 1.0 },
  { t: 0.18, c: ["#010110","#040435","#160e50","#a02c55"], sun: 0,    moon: 0.7, st: 0.9 },
  { t: 0.24, c: ["#080418","#1c0840","#401430","#f04010"], sun: 0,    moon: 0.2, st: 0.4 },
  { t: 0.29, c: ["#120a3a","#2c1258","#601808","#ff7822"], sun: 0.45, moon: 0,   st: 0.1 },
  { t: 0.36, c: ["#0838c0","#1458d8","#2880e0","#90c8ff"], sun: 0.92, moon: 0,   st: 0   },
  { t: 0.50, c: ["#0050cc","#1068e0","#2890f0","#98d0ff"], sun: 1.0,  moon: 0,   st: 0   },
  { t: 0.64, c: ["#0040b0","#1850c0","#4878d8","#a8b8f0"], sun: 0.9,  moon: 0,   st: 0   },
  { t: 0.72, c: ["#100828","#2a0e50","#601410","#ff5010"], sun: 0.55, moon: 0,   st: 0   },
  { t: 0.79, c: ["#080320","#180838","#300a1a","#c03850"], sun: 0,    moon: 0,   st: 0.15},
  { t: 0.88, c: ["#010114","#040430","#141055","#a03060"], sun: 0,    moon: 0.5, st: 0.7 },
  { t: 1.00, c: ["#010112","#05053a","#1a1060","#c84860"], sun: 0,    moon: 1.0, st: 1.0 },
];

// ── Terrain helpers ───────────────────────────────────────────────────────────

function rng(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

function makeMountains(r: () => number, baseY: number, amp: number, rough: number): number[] {
  const pts: number[] = [];
  const n = 160;
  let h = baseY;
  for (let i = 0; i < n; i++) {
    h += (r() - 0.5) * rough;
    h = Math.max(baseY - amp, Math.min(baseY, h));
    pts.push(h);
  }
  return pts;
}

const r1 = rng(42), r2 = rng(137), r3 = rng(99), rSky = rng(777);

export const MT1 = makeMountains(r1, H * 0.52, H * 0.22, 14);
export const MT2 = makeMountains(r2, H * 0.64, H * 0.20, 18);
export const MT3 = makeMountains(r3, H * 0.75, H * 0.18, 12);

export const BLDGS: Building[] = (() => {
  const arr: Building[] = [];
  let x = 0;
  while (x < W * 3) {
    const roll = rSky();
    let w: number, h: number, type: string;
    if      (roll < 0.04) { type = "inpe";      w = 22 + rSky() * 50; h = 28 + rSky() * 100; }
    else if (roll < 0.08) { type = "tech";      w = 20 + rSky() * 50; h = 28 + rSky() * 100; }
    else if (roll < 0.13) { type = "praca";     w = 58 + rSky() * 42; h = 14 + rSky() * 20;  }
    else if (roll < 0.17) { type = "vincentino";w = 72 + rSky() * 22; h = 58 + rSky() * 22;  }
    else                  { type = "regular";   w = 18 + rSky() * 55; h = 18 + rSky() * 110; }
    arr.push({ x, w, h, type, litSeed: Math.floor(rSky() * 9999) });
    x += w + 2 + rSky() * 10;
  }
  return arr;
})();

export const PARQUE_TREES: TreeData[] = [-100,-74,-50,-26,-2,22,46,70,98].map((ox, i) => ({
  ox,
  h: 24 + (i % 3) * 5 + (Math.abs(ox) % 17),
}));

export const CARS: CarData[] = Array.from({ length: 28 }, (_, i) => ({
  lane:   i % 2,
  offset: (i * 193.7) % (W * 5),
  spd:    0.5 + (i % 6) * 0.18,
}));

export const STARS: Star[] = Array.from({ length: 130 }, () => ({
  x:   Math.random() * W,
  y:   Math.random() * H * 0.7,
  r:   Math.random() * 1.6 + 0.3,
  tw:  Math.random() * Math.PI * 2,
  spd: 0.08 + Math.random() * 0.2,
}));

// ── Collectibles ──────────────────────────────────────────────────────────────

const CTYPES_SCORE: CollectibleType[] = [
  { id: "embraer",  lbl: "EMBRAER",       pts: 120, col: "#fbbf24", glow: "#f59e0b", icon: "✈️" },
  { id: "inpe",     lbl: "INPE",          pts: 80,  col: "#60a5fa", glow: "#3b82f6", icon: "🛰️" },
  { id: "ita",      lbl: "ITA",           pts: 80,  col: "#f87171", glow: "#ef4444", icon: "🎓" },
  { id: "dcta",     lbl: "DCTA",          pts: 80,  col: "#c4b5fd", glow: "#7c3aed", icon: "🚀" },
  { id: "avibras",  lbl: "AVIBRAS",       pts: 60,  col: "#fb923c", glow: "#ea580c", icon: "🛡️" },
  { id: "tech",     lbl: "TECHPARK",      pts: 50,  col: "#a78bfa", glow: "#7c3aed", icon: "💎" },
  { id: "jj",       lbl: "J&J",          pts: 50,  col: "#f9a8d4", glow: "#ec4899", icon: "💊" },
  { id: "gm",       lbl: "GM",           pts: 50,  col: "#6ee7b7", glow: "#10b981", icon: "🚗" },
  { id: "ericsson", lbl: "ERICSSON",      pts: 50,  col: "#7dd3fc", glow: "#0ea5e9", icon: "📡" },
  { id: "panasonic",lbl: "PANASONIC",     pts: 40,  col: "#93c5fd", glow: "#3b82f6", icon: "📺" },
  { id: "hitachi",  lbl: "HITACHI",       pts: 40,  col: "#fca5a5", glow: "#ef4444", icon: "⚡" },
  { id: "nestle",   lbl: "NESTLÉ",        pts: 35,  col: "#fde68a", glow: "#f59e0b", icon: "☕" },
  { id: "bayer",    lbl: "BAYER",         pts: 35,  col: "#86efac", glow: "#22c55e", icon: "🌿" },
  { id: "parker",   lbl: "PARKER",        pts: 30,  col: "#d8b4fe", glow: "#a855f7", icon: "🔧" },
  { id: "eaton",    lbl: "EATON",         pts: 30,  col: "#fdba74", glow: "#f97316", icon: "⚙️" },
  { id: "caoa",     lbl: "CAOA CHERY",    pts: 30,  col: "#bfdbfe", glow: "#60a5fa", icon: "🚙" },
  { id: "revap",    lbl: "REVAP",         pts: 30,  col: "#fcd34d", glow: "#eab308", icon: "🛢️" },
  { id: "ball",     lbl: "BALL CORP",     pts: 25,  col: "#c7d2fe", glow: "#6366f1", icon: "🧪" },
  { id: "lanxess",  lbl: "LANXESS",       pts: 25,  col: "#a3e635", glow: "#84cc16", icon: "🔬" },
  { id: "ardagh",   lbl: "ARDAGH",        pts: 25,  col: "#94a3b8", glow: "#64748b", icon: "🏭" },
  { id: "fccr",     lbl: "FCCR",         pts: 40,  col: "#f0abfc", glow: "#e879f9", icon: "🎨" },
  { id: "sesc",     lbl: "SESC SJC",      pts: 40,  col: "#34d399", glow: "#10b981", icon: "🎭" },
  { id: "museu",    lbl: "MUSEU FOLCLORE",pts: 40,  col: "#fbbf24", glow: "#f59e0b", icon: "🎪" },
  { id: "arena",    lbl: "FARMA CONDE",   pts: 40,  col: "#f87171", glow: "#ef4444", icon: "🏟️" },
  { id: "parque",   lbl: "PARQUE CIDADE", pts: 30,  col: "#4ade80", glow: "#16a34a", icon: "🌳" },
  { id: "vicentina",lbl: "VICENTINA",     pts: 30,  col: "#86efac", glow: "#22c55e", icon: "🌺" },
];

const CTYPES_PW: CollectibleType[] = [
  { id: "shield",      lbl: "ESCUDO",        pts: 0, col: "#34d399", glow: "#10b981", icon: "🛡️", pw: "shield"   },
  { id: "boost",       lbl: "BOOST",         pts: 0, col: "#fb923c", glow: "#ea580c", icon: "⚡", pw: "boost"    },
  { id: "14bis",       lbl: "14-BIS",        pts: 0, col: "#ffd700", glow: "#f59e0b", icon: "🛩️", pw: "14bis", rare: true },
  { id: "avibras_pw",  lbl: "PULSO AVIBRAS", pts: 0, col: "#f97316", glow: "#ea580c", icon: "🚀", pw: "avibras"  },
  { id: "inpe_sat",    lbl: "SATÉLITE INPE", pts: 0, col: "#60a5fa", glow: "#3b82f6", icon: "📡", pw: "inpe_sat" },
  { id: "revap_pw",    lbl: "REVAP SHOCK",   pts: 0, col: "#bfdbfe", glow: "#60a5fa", icon: "❄️", pw: "revap"    },
  { id: "delta_pw",    lbl: "ASA DELTA",     pts: 0, col: "#a78bfa", glow: "#7c3aed", icon: "🪂", pw: "delta"    },
  { id: "ericsson_pw", lbl: "WINGMAN 5G",    pts: 0, col: "#818cf8", glow: "#6366f1", icon: "📶", pw: "ericsson" },
  { id: "hp_up",       lbl: "VIDA +1",       pts: 0, col: "#f472b6", glow: "#db2777", icon: "❤️", pw: "hp_up", rare: true },
];

export const CTYPES: CollectibleType[] = [...CTYPES_SCORE, ...CTYPES_PW];

export const DROP_TABLE: Record<string, Record<string, number>> = {
  cloud:  { shield: 0.06, boost: 0.03, "14bis": 0.003, avibras_pw: 0.01, inpe_sat: 0.01, revap_pw: 0.01, delta_pw: 0.01, ericsson_pw: 0.01, embraer: 0.04, inpe: 0.04, dcta: 0.03, ita: 0.03, tech: 0.03, fccr: 0.02, sesc: 0.02, parque: 0.02 },
  drone:  { shield: 0.09, boost: 0.05, "14bis": 0.004, avibras_pw: 0.02, inpe_sat: 0.02, revap_pw: 0.02, delta_pw: 0.015, ericsson_pw: 0.02, embraer: 0.06, inpe: 0.05, dcta: 0.05, ita: 0.04, tech: 0.04, jj: 0.02, gm: 0.02, ericsson: 0.03 },
  arara:  { shield: 0.05, boost: 0.04, "14bis": 0.003, avibras_pw: 0.01, inpe_sat: 0.015, revap_pw: 0.01, delta_pw: 0.02, ericsson_pw: 0.01, embraer: 0.03, inpe: 0.03, dcta: 0.02, ita: 0.02, tech: 0.02, parque: 0.03, vicentina: 0.03 },
  ovni:   { shield: 0.11, boost: 0.07, "14bis": 0.012, avibras_pw: 0.04, inpe_sat: 0.05, revap_pw: 0.04, delta_pw: 0.035, ericsson_pw: 0.03, embraer: 0.07, inpe: 0.09, dcta: 0.07, ita: 0.06, tech: 0.05, ericsson: 0.04, fccr: 0.03, sesc: 0.03 },
  tanajura:    { shield: 0.04, boost: 0.03, "14bis": 0.002, embraer: 0.04, inpe: 0.03, dcta: 0.03, tech: 0.03 },
  helicoptero: { shield: 0.10, boost: 0.07, "14bis": 0.009, avibras_pw: 0.035, inpe_sat: 0.035, revap_pw: 0.03, delta_pw: 0.03, ericsson_pw: 0.035, embraer: 0.07, inpe: 0.06, dcta: 0.07, ita: 0.05, tech: 0.04, ericsson: 0.04, fccr: 0.03, parque: 0.02 },
  balao:  { shield: 0.08, boost: 0.06, "14bis": 0.006, avibras_pw: 0.025, inpe_sat: 0.04, revap_pw: 0.025, delta_pw: 0.025, ericsson_pw: 0.025, embraer: 0.05, inpe: 0.07, dcta: 0.05, ita: 0.04, tech: 0.04, sesc: 0.03, parque: 0.03, vicentina: 0.03 },
  boss:   { shield: 0.85, boost: 0.85, "14bis": 0.25, avibras_pw: 0.65, inpe_sat: 0.65, revap_pw: 0.65, delta_pw: 0.60, ericsson_pw: 0.65, hp_up: 0.05, embraer: 0.55, inpe: 0.55, dcta: 0.55, ita: 0.45, tech: 0.45, jj: 0.25, gm: 0.25, ericsson: 0.25, fccr: 0.28, sesc: 0.28, parque: 0.22, vicentina: 0.22 },
  prototipo_x: { shield: 0.80, boost: 0.80, "14bis": 0.22, avibras_pw: 0.60, inpe_sat: 0.60, revap_pw: 0.60, delta_pw: 0.65, ericsson_pw: 0.60, hp_up: 0.05, embraer: 0.50, inpe: 0.46, dcta: 0.55, ita: 0.46, tech: 0.40, fccr: 0.25, parque: 0.20 },
  cemaden_eye: { shield: 0.82, boost: 0.82, "14bis": 0.24, avibras_pw: 0.62, inpe_sat: 0.66, revap_pw: 0.62, delta_pw: 0.57, ericsson_pw: 0.62, hp_up: 0.05, embraer: 0.50, inpe: 0.60, dcta: 0.50, ita: 0.44, tech: 0.40, ericsson: 0.24, fccr: 0.25, parque: 0.20 },
  engrenagem:  { shield: 0.86, boost: 0.86, "14bis": 0.26, avibras_pw: 0.66, inpe_sat: 0.62, revap_pw: 0.66, delta_pw: 0.60, ericsson_pw: 0.66, hp_up: 0.05, embraer: 0.52, inpe: 0.50, dcta: 0.56, ita: 0.47, tech: 0.42, gm: 0.26, ericsson: 0.26, fccr: 0.27, parque: 0.22 },
  cigarra:     { shield: 0.95, boost: 0.95, "14bis": 0.35, avibras_pw: 0.80, inpe_sat: 0.80, revap_pw: 0.80, delta_pw: 0.75, ericsson_pw: 0.80, hp_up: 0.08, embraer: 0.65, inpe: 0.65, dcta: 0.65, ita: 0.55, tech: 0.55, jj: 0.35, gm: 0.35, ericsson: 0.35, fccr: 0.38, sesc: 0.38, parque: 0.32, vicentina: 0.32 },
};
