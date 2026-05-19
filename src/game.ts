import { state } from "./state";
import { canvas, ctx, W, H } from "./world";
import {
  PLANES, DIFFICULTIES, TOTAL_KEY, BOSS_TYPES, BOSS_ROTATION, BOSS_LABELS,
  WAVE_DEFS, RADIO_MSGS, MT1, MT2, MT3, STARS, DEV_SCENES,
  SHIELD_DUR, BOOST_DUR, BIS_DUR, AVIBRAS_DUR, INPE_DUR, REVAP_DUR,
  DELTA_DUR, ERICSSON_DUR, FAB_JET_DUR, DEV_BTN, _MP_BTN_RECT, PERKS,
} from "./constants";
import { ST } from "./types";
import type { PerkDef } from "./types";
import {
  Player, Bullet, HomingMissile, Enemy, Collectible,
  circ, explode, floatText, spark, dropCollectibles,
} from "./entities";
import {
  ensureAC, sfxCollect, sfxPowerup, sfxBossIn, sfxDestroy, sfxLevelUp,
  startMusic, stopMusic, startMenuMusic, switchMusicForPhase, startLevelUpMusic,
} from "./audio";
import {
  drawBg, drawHUD, drawMenu, drawOver, drawPause, drawSobre,
  drawDevButton, drawJoystick, drawLevelUp, drawDebugOverlay,
} from "./renderer";
import { drawDevPanel, devHandleKey, setDevCallbacks, DEV_ITEMS } from "./dev";
import {
  mp, mpConnect, mpDisconnect, mpSend, mpUpdate,
  mpDrawAll, mpDrawHUD, drawLobby, mpLobbyHit, mpCheckShieldRelay,
  setMpCallbacks, mpAutoJoin,
} from "./multiplayer";

// Wire up circular-dep callbacks
setDevCallbacks({ spawnBoss, spawnBossType });
setMpCallbacks({ startGame, endGame, announce, radioSay });

// ── Radio ─────────────────────────────────────────────────────────────────────
export function radioSay(text: string, delay = 0): void {
  if (delay === 0) { state.radioText = text; state.radioT = 200; }
  else state.radioQueue.push({ text, delay });
}

// ── Wave / boss ───────────────────────────────────────────────────────────────
export function announce(n: number): void {
  const def = WAVE_DEFS[Math.min(n, WAVE_DEFS.length - 1)];
  state.waveText = `ONDA ${n + 1}: ${def.name.toUpperCase()}`;
  state.waveT = 200;
  state.hordeQueue = [...def.horde].sort(() => Math.random() - 0.5);
  state.hordeSpawnT = 70;
  switchMusicForPhase(n);
  if (def.phase !== state.currentPhase) state.currentPhase = def.phase;
  const msg = RADIO_MSGS[`wave_${n}`];
  if (msg) radioSay(msg, 100);
}

export function spawnBossType(t: string): void {
  state.bossAlive = true;
  state.enemies.push(new Enemy(t, W + 200, H / 2));
}

export function spawnBoss(): void {
  if (state._waveHits === 0 && state.waveNum > 0) state.playerStats.wavesWithoutHit++;
  state._waveHits = 0;
  state.bossAlive = true;
  const bossType = BOSS_ROTATION[Math.floor(state.waveNum) % BOSS_ROTATION.length];
  state.enemies.push(new Enemy(bossType, W + 200, H / 2));
  state.waveText = `⚠️ CHEFE: ${BOSS_LABELS[bossType] || bossType.toUpperCase()} ⚠️`;
  state.waveT = 240;
  sfxBossIn();
  state.shakeAmt = 14;
  state.waveNum++;
  console.log(`[BOSS] wave=${state.waveNum} tipo=${bossType}`);
  radioSay(RADIO_MSGS.boss);
  if (state.waveNum > state.diffCfg.doubleBossWave) {
    const second = BOSS_ROTATION[(Math.floor(state.waveNum) + 2) % BOSS_ROTATION.length];
    setTimeout(() => {
      if (state.gState === ST.PLAY)
        state.enemies.push(new Enemy(second, W + 300, H / 3));
    }, 7000);
  }
}

// ── Level-up system ───────────────────────────────────────────────────────────
function pickLevelUpCards(n: number): PerkDef[] {
  const pool = [...PERKS];
  const result: PerkDef[] = [];
  while (result.length < n && pool.length > 0) {
    const idx = Math.floor(Math.random() * pool.length);
    result.push(pool.splice(idx, 1)[0]);
  }
  return result;
}

function activateSpecial(): void {
  const player = state.player;
  if (!player || player.specialCD > 0) return;
  if (state.gState !== ST.PLAY && state.gState !== ST.MULTI) return;
  const planeCfg = PLANES.find(p => p.id === player.planeId)!;
  console.log(`[ESPECIAL] plano=${player.planeId} nome=${planeCfg.specialName} wave=${state.waveNum}`);
  const cdScale = state.diffCfg.specialCDMult * (1 + state.waveNum * state.diffCfg.specialWaveCDMult);
  const scaledCD = (cd: number) => Math.round(cd * cdScale);
  switch (player.planeId) {
    case "tucano":
      player.specialActive = 240;
      player.specialMaxCD = scaledCD(planeCfg.specialMaxCD);
      player.specialCD = player.specialMaxCD;
      sfxPowerup();
      floatText("🔥 RAJADA!", W / 2, H / 2 - 30, "#fb923c");
      break;
    case "e2":
      player.specialActive = 150;
      player.inv = Math.max(player.inv, 150);
      player.vx = player.topSpd * 1.8;
      player.specialMaxCD = scaledCD(planeCfg.specialMaxCD);
      player.specialCD = player.specialMaxCD;
      sfxPowerup();
      floatText("💨 EVASÃO!", W / 2, H / 2 - 30, "#34d399");
      break;
    case "c390": {
      if (state.enemies.filter(e => !e.dead).length === 0) return;
      // Mísseis: 1 por inimigo, sem cap
      const liveEnemies = state.enemies.filter(e => !e.dead);
      liveEnemies.forEach(t => {
        state.bullets.push(new HomingMissile(player.x + 20, player.y - 8, t));
        state.bullets.push(new HomingMissile(player.x + 20, player.y + 8, t));
      });
      state.playerStats.shotsFired += liveEnemies.length * 2;
      // Dano em área a todos os inimigos + apaga projéteis
      state.enemies.forEach(e => {
        if (e.dead) return;
        const pts = e.hit(2);
        if (pts > 0) {
          state.score += pts * state.combo;
          state.playerStats.kills++;
          player.specialCD = Math.max(0, player.specialCD - planeCfg.specialKillCDR);
          dropCollectibles(e.x, e.y, e.type);
        }
        explode(e.x, e.y, "#f97316", 6);
      });
      state.eBullets.forEach(b => { b.dead = true; });
      // Explosões visuais espalhadas pela tela
      for (let i = 0; i < 12; i++) {
        setTimeout(() => {
          explode(80 + Math.random() * 640, 40 + Math.random() * 370, "#f87171", 9);
          explode(80 + Math.random() * 640, 40 + Math.random() * 370, "#fbbf24", 5);
        }, i * 90);
      }
      state.shakeAmt = 20;
      player.specialMaxCD = scaledCD(planeCfg.specialMaxCD);
      player.specialCD = player.specialMaxCD;
      player.specialActive = 120;
      sfxBossIn();
      setTimeout(() => sfxBossIn(), 200);
      floatText("💣 BOMBARDEIO EM ÁREA!", W / 2, H / 2 - 40, "#f87171");
      break;
    }
  }
}

function applyPerk(perk: PerkDef): void {
  const player = state.player!;
  console.log(`[PERK] escolhido=${perk.id} (${perk.name}) nível=${state.playerLevel}`);
  switch (perk.id) {
    case "bullet_resist": player.perks.bulletEvasion   = Math.min(0.9, player.perks.bulletEvasion  + 0.30); break;
    case "impact_resist": player.perks.impactEvasion   = Math.min(0.9, player.perks.impactEvasion  + 0.30); break;
    case "damage_up":     player.perks.dmgBonus++; break;
    case "speed_up":      player.topSpd += 0.8; break;
    case "extra_life":    player.lives++; player.maxLives++; break;
    case "fire_rate":     player._fireN = Math.max(4, Math.round(player._fireN * 0.85)); break;
    case "graze_range":   player.perks.grazeRadiusMult += 0.35; break;
    case "combo_time":    player.perks.comboTimeMult   += 0.30; break;
    case "inv_extend":    player.perks.invMult         += 0.50; break;
    case "spread_shot":   player.perks.spreadShots++; break;
  }
  state.chosenPerks.push(perk);
  if (state.player) state.player.inv = Math.max(state.player.inv, 180);
  floatText(`✦ ${perk.name}`, W / 2, H / 2, perk.col);
  state.levelUpCards = null;
  state.gState = ST.PLAY;
  stopMusic();
  switchMusicForPhase(state.waveNum);
}

// ── Game lifecycle ─────────────────────────────────────────────────────────────
export function startGame(): void {
  ensureAC();
  for (const k in state.keys) delete state.keys[k];
  state.diffCfg = DIFFICULTIES[state.selectedDifficulty];
  state.hsKey = state.diffCfg.hsKey;
  const pl = PLANES[state.selectedPlane];
  console.log(`[START] plano=${pl.id} dificuldade=${state.diffCfg.id} hi=${localStorage.getItem(state.diffCfg.hsKey) ?? 0}`);
  const totalPts = parseInt(localStorage.getItem(TOTAL_KEY) || "0");
  state.player = new Player(totalPts >= pl.unlock ? pl : PLANES[0]);
  state.bullets = [];
  state.enemies = [];
  state.eBullets = [];
  state.collectibles = [];
  state.particles = [];
  state.floaters = [];
  state.frame = 0;
  state.score = 0;
  state.combo = 1;
  state.comboT = 0;
  state.hiScore = parseInt(localStorage.getItem(state.hsKey) || "0");
  state.scrollSpd = 2;
  state.spawnT = 180;
  state.collectT = 100;
  state.shakeAmt = 0;
  state.bossAlive = false;
  state.waveNum = 0;
  state.ovniEventT = 2200;
  state.hordeQueue = [];
  state.hordeSpawnT = 0;
  state.currentPhase = 0;
  state.playlistIdx = 6;
  state.off1 = 0; state.off2 = 0; state.off3 = 0; state.offSky = 0;
  state.radioText = ""; state.radioT = 0; state.radioQueue = [];
  state.grazeCount = 0; state.cbersMission = null; state.cbersMissionT = 3800;
  state.playerStats = {
    pw: {}, kills: 0, hits: 0, grazes: 0, maxCombo: 1,
    shotsFired: 0, shotsHit: 0, bossKills: 0, shieldBlocks: 0,
    nearDeathHits: 0, comboKills: 0, longestGrazeStreak: 0,
    wavesWithoutHit: 0, startTime: Date.now(),
  };
  state._curGrazeStreak = 0;
  state._waveHits = 0;
  state.ddaStress = 0.5;
  state.playerLevel = 0;
  state.levelUpCards = null;
  state.chosenPerks = [];
  state.gState = ST.PLAY;
  stopMusic();
  startMusic();
  announce(0);
}

export function endGame(): void {
  state.gState = ST.OVER;
  state.shakeAmt = 0;
  state.playerStats.timeSurvived = Math.floor((Date.now() - state.playerStats.startTime) / 1000);
  sfxDestroy();
  stopMusic();
  const prev = parseInt(localStorage.getItem(state.hsKey) || "0");
  if (state.score > prev) localStorage.setItem(state.hsKey, String(state.score));
  state.hiScore = Math.max(state.score, prev);
  const totalPrev = parseInt(localStorage.getItem(TOTAL_KEY) || "0");
  localStorage.setItem(TOTAL_KEY, String(totalPrev + state.score));
  const snapshot = {
    score: state.score, wave: state.waveNum, difficulty: state.diffCfg.id,
    kills: state.playerStats.kills, hits: state.playerStats.hits,
    grazes: state.playerStats.grazes, maxCombo: state.playerStats.maxCombo,
    shotsFired: state.playerStats.shotsFired, shotsHit: state.playerStats.shotsHit,
    timeSurvived: state.playerStats.timeSurvived, bossKills: state.playerStats.bossKills,
    shieldBlocks: state.playerStats.shieldBlocks, nearDeathHits: state.playerStats.nearDeathHits,
    comboKills: state.playerStats.comboKills,
    longestGrazeStreak: state.playerStats.longestGrazeStreak,
    wavesWithoutHit: state.playerStats.wavesWithoutHit,
    pw: { ...state.playerStats.pw }, ts: Date.now(),
  };
  localStorage.setItem("sjc_last_stats", JSON.stringify(snapshot));
  const totals = JSON.parse(localStorage.getItem("sjc_totals") || "{}") as Record<string, number>;
  totals.kills  = (totals.kills  || 0) + state.playerStats.kills;
  totals.grazes = (totals.grazes || 0) + state.playerStats.grazes;
  totals.games  = (totals.games  || 0) + 1;
  localStorage.setItem("sjc_totals", JSON.stringify(totals));
  startMenuMusic(state.selectedDifficulty);
}

// ── Spawn helpers ──────────────────────────────────────────────────────────────
function spawnEnemy(): void {
  const y = 55 + Math.random() * (H - 110);
  const r = Math.random();
  const isNight = state.dayPhase < 0.26 || state.dayPhase > 0.84;
  const w = state.waveNum;

  if (w === 0) {
    if (r < 0.52) state.enemies.push(new Enemy("cloud", W + 85, y));
    else          state.enemies.push(new Enemy("drone", W + 42, y));
  } else if (w === 1) {
    if      (r < 0.30) state.enemies.push(new Enemy("cloud", W + 85, y));
    else if (r < 0.82) state.enemies.push(new Enemy("drone", W + 42, y));
    else               state.enemies.push(new Enemy("arara", W + 32, y));
  } else if (w === 2) {
    if      (r < 0.18) state.enemies.push(new Enemy("cloud", W + 85, y));
    else if (r < 0.55) state.enemies.push(new Enemy("drone", W + 42, y));
    else               state.enemies.push(new Enemy("arara", W + 32, y));
  } else if (w === 3) {
    if      (r < 0.15) state.enemies.push(new Enemy("cloud", W + 85, y));
    else if (r < 0.42) state.enemies.push(new Enemy("drone", W + 42, y));
    else if (r < 0.60) state.enemies.push(new Enemy("arara", W + 32, y));
    else if (isNight)  state.enemies.push(new Enemy("ovni",  W + 55, y));
    else               state.enemies.push(new Enemy("drone", W + 42, y));
  } else if (w === 4) {
    if      (r < 0.12) state.enemies.push(new Enemy("cloud",       W + 85, y));
    else if (r < 0.34) state.enemies.push(new Enemy("drone",       W + 42, y));
    else if (r < 0.52) state.enemies.push(new Enemy("arara",       W + 32, y));
    else if (r < 0.76) state.enemies.push(new Enemy("ovni",        W + 55, y));
    else               state.enemies.push(new Enemy("helicoptero", W + 60, y));
  } else if (w === 5) {
    if      (r < 0.10) state.enemies.push(new Enemy("cloud",       W + 85, y));
    else if (r < 0.28) state.enemies.push(new Enemy("drone",       W + 42, y));
    else if (r < 0.44) state.enemies.push(new Enemy("arara",       W + 32, y));
    else if (r < 0.72) state.enemies.push(new Enemy("ovni",        W + 55, y));
    else               state.enemies.push(new Enemy("helicoptero", W + 60, y));
    if (Math.random() < 0.22) {
      const y2 = 55 + Math.random() * (H - 110);
      state.enemies.push(new Enemy("drone", W + 42 + Math.random() * 60, y2));
    }
  } else {
    if      (r < 0.08) state.enemies.push(new Enemy("cloud",       W + 85, y));
    else if (r < 0.24) state.enemies.push(new Enemy("drone",       W + 42, y));
    else if (r < 0.40) state.enemies.push(new Enemy("arara",       W + 32, y));
    else if (r < 0.66) state.enemies.push(new Enemy("ovni",        W + 55, y));
    else               state.enemies.push(new Enemy("helicoptero", W + 60, y));
    if (Math.random() < 0.30) {
      const y2 = 55 + Math.random() * (H - 110);
      const extraType = isNight && Math.random() < 0.5 ? "ovni" : "arara";
      state.enemies.push(new Enemy(extraType, W + 60 + Math.random() * 80, y2));
    }
  }
}

function spawnOvniEvent(): void {
  if (!(state.dayPhase < 0.26 || state.dayPhase > 0.84)) { state.ovniEventT = 600; return; }
  state.waveText = "🛸 INCIDENTE 19/05/1986 — DISCOS VOADORES! 🛸";
  state.waveT = 230;
  sfxBossIn();
  state.shakeAmt = 8;
  radioSay(RADIO_MSGS.ovni);
  const n = 3 + Math.floor(Math.random() * 3);
  for (let i = 0; i < n; i++) {
    setTimeout(() => {
      if (state.gState === ST.PLAY)
        state.enemies.push(new Enemy("ovni", W + 50 + i * 60, 50 + Math.random() * (H * 0.52)));
    }, i * 420);
  }
}

// ── Main loop ─────────────────────────────────────────────────────────────────
function update(): void {
  state.frame++;
  if (state.dev.openCooldown > 0) state.dev.openCooldown--;
  const activeScene = DEV_SCENES[state.dev.selectedScene];
  if (!activeScene || activeScene.phase < 0) {
    state.dayPhase = (state.dayPhase + 0.000034 * state.dev.daySpeed) % 1;
  }
  if (state.gState !== ST.PLAY && state.gState !== ST.MULTI) return;
  if (state.gState === ST.MULTI) mpUpdate();

  if (state.radioT > 0) state.radioT--;
  if (state.radioT === 0 && state.radioQueue.length > 0) {
    const next = state.radioQueue[0];
    if (--next.delay <= 0) { state.radioQueue.shift(); state.radioText = next.text; state.radioT = 200; }
  }

  state.scrollSpd = 2 + state.frame / 2200;
  state.off1 = (state.off1 + state.scrollSpd * 0.18) % (MT1.length * (W / MT1.length));
  state.off2 = (state.off2 + state.scrollSpd * 0.42) % (MT2.length * (W / MT2.length));
  state.off3 = (state.off3 + state.scrollSpd * 0.72) % (MT3.length * (W / MT3.length));
  state.offSky = (state.offSky + state.scrollSpd) % (W * 3 + 500);
  STARS.forEach((s) => {
    s.x -= s.spd;
    if (s.x < 0) s.x = W;
    s.tw += 0.04;
  });
  state.shakeAmt *= 0.84;
  if (state.comboT > 0 && --state.comboT === 0) state.combo = 1;
  if (state.waveT > 0) state.waveT--;
  const _prevStress = state.ddaStress;
  state.ddaStress = Math.max(0, state.ddaStress - 0.0007);
  if (state.combo >= 5) state.ddaStress = Math.max(0, state.ddaStress - 0.0004);
  // log + rádio quando cruza thresholds de 0.25
  const prevQ = Math.floor(_prevStress * 4);
  const curQ  = Math.floor(state.ddaStress * 4);
  if (prevQ !== curQ) {
    console.log(`[DDA] stress=${state.ddaStress.toFixed(2)} spawnT≈${state.spawnT.toFixed(0)} wave=${state.waveNum}`);
    if (curQ > prevQ) {
      const msgs = [RADIO_MSGS.dda_hard_1, RADIO_MSGS.dda_hard_2, RADIO_MSGS.dda_hard_3, RADIO_MSGS.dda_hard_4];
      radioSay(msgs[Math.min(curQ, 3)], 80);
    } else {
      const msgs = [RADIO_MSGS.dda_easy_1, RADIO_MSGS.dda_easy_2, RADIO_MSGS.dda_easy_3];
      radioSay(msgs[Math.min(prevQ - 1, 2)], 80);
    }
  }

  const player = state.player!;
  const nb = player.update(state.keys);
  state.playerStats.shotsFired += nb.length;
  state.bullets.push(...nb);
  state.bullets.forEach((b) => b.update());
  state.bullets = state.bullets.filter((b) => !b.dead);

  if (player.revap > 0) {
    const revapR = player.revap === REVAP_DUR ? 300 : (player.shield > 0 ? 120 : 80);
    state.eBullets = state.eBullets.filter(b => {
      const dx = b.x - player.x, dy = b.y - player.y;
      if (dx * dx + dy * dy < revapR * revapR) {
        explode(b.x, b.y, "#bfdbfe", 3);
        return false;
      }
      return true;
    });
  }

  if (player.inpe > 0) {
    state.collectibles.forEach(c => {
      const dx = player.x - c.x, dy = player.y - c.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      if (dist < 220) { c.x += (dx / dist) * 3.5; c.y += (dy / dist) * 3.5; }
    });
  }

  if (player.ericsson > 0 && state.frame % 22 === 0) {
    const angle = (state.frame * 0.09) % (Math.PI * 2);
    const ox = player.x + Math.cos(angle) * 44;
    const oy = player.y + Math.sin(angle) * 28;
    let vy = 0;
    let nearestDist = Infinity;
    let nearestEnemy: Enemy | null = null;
    for (const e of state.enemies) {
      if (e.dead) continue;
      const dist = Math.hypot(e.x - ox, e.y - oy);
      if (dist < nearestDist) { nearestDist = dist; nearestEnemy = e; }
    }
    if (nearestEnemy !== null) {
      vy = (nearestEnemy.y - oy) / Math.max(1, nearestEnemy.x - ox);
      vy = Math.max(-0.6, Math.min(0.6, vy));
    }
    state.bullets.push(new Bullet(ox, oy, vy));
    state.playerStats.shotsFired++;
  }

  if (player.fabJet > 0 && state.frame % 18 === 0) {
    const jx = player.x + 10 + Math.cos(state.frame * 0.04) * 8;
    const jy = player.y - 36 + Math.sin(state.frame * 0.07) * 6;
    let vy = 0;
    let nearestDist2 = Infinity;
    let nearestEnemy2: Enemy | null = null;
    for (const e of state.enemies) {
      if (e.dead) continue;
      const dist = Math.hypot(e.x - jx, e.y - jy);
      if (dist < nearestDist2) { nearestDist2 = dist; nearestEnemy2 = e; }
    }
    if (nearestEnemy2 !== null) {
      vy = (nearestEnemy2.y - jy) / Math.max(1, nearestEnemy2.x - jx);
      vy = Math.max(-0.6, Math.min(0.6, vy));
    }
    state.bullets.push(new Bullet(jx, jy, vy));
    state.playerStats.shotsFired++;
  }

  state.eBullets.forEach((b) => b.update());
  state.eBullets = state.eBullets.filter((b) => !b.dead);
  const newEB: typeof state.eBullets = [];
  state.enemies.forEach((e) => {
    const r = e.update();
    if (!state.dev.noProj) newEB.push(...r);
  });
  const room = Math.max(0, 22 - state.eBullets.length);
  state.eBullets.push(...newEB.slice(0, room));
  state.enemies = state.enemies.filter((e) => !e.dead);
  state.collectibles.forEach((c) => c.update());
  state.collectibles = state.collectibles.filter((c) => !c.dead);
  if (state.particles.length > 180) state.particles.length = 180;
  state.particles.forEach((p) => {
    p.x += p.vx; p.y += p.vy;
    p.vx *= 0.91; p.vy *= 0.91;
    p.life -= 0.028;
  });
  state.particles = state.particles.filter((p) => p.life > 0);
  state.floaters.forEach((f) => { f.y += f.vy; f.lifetime -= 0.022; });
  state.floaters = state.floaters.filter((f) => f.lifetime > 0);

  if (state.gState !== ST.MULTI) {
    if (--state.spawnT <= 0) {
      spawnEnemy();
      const baseSpawnT = state.diffCfg.spawnBase - state.waveNum * state.diffCfg.spawnWaveMult
        - state.frame / state.diffCfg.spawnTimeMult;
      const ddaAdjust = state.diffCfg.id === "aventura" ? 1 + (state.ddaStress - 0.5) * 0.80 : 1;
      state.spawnT = Math.max(state.diffCfg.spawnMin, baseSpawnT * ddaAdjust);
    }
    if (--state.collectT <= 0) {
      state.collectT = 220 + Math.floor(Math.random() * 160);
      state.collectibles.push(new Collectible(W + 22, 48 + Math.random() * (H - 96)));
    }
    if (!state.bossAlive && state.frame > 0 && state.frame % state.diffCfg.bossInterval === 0) spawnBoss();
    if (!state.bossAlive && --state.ovniEventT <= 0) {
      state.ovniEventT = 2600 + Math.floor(Math.random() * 1800);
      spawnOvniEvent();
    }
  }
  if (state.gState !== ST.MULTI && state.hordeQueue.length > 0 && --state.hordeSpawnT <= 0) {
    const h = state.hordeQueue.shift()!;
    const hy = 55 + Math.random() * (H - 110);
    state.enemies.push(new Enemy(h.type, W + 42 + Math.random() * 60, hy));
    state.hordeSpawnT = 14;
  }

  if (--state.cbersMissionT <= 0 && !state.cbersMission) {
    const VARIANTS = [
      { variant: "cbers4",    name: "CBERS-4",    hp: 5, bonus: 1000, vx: 0.7, msg: "INPE: CBERS-4 em órbita de transferência. Escorte!" },
      { variant: "cbers4a",   name: "CBERS-4A",   hp: 6, bonus: 1400, vx: 0.6, msg: "INPE: CBERS-4A detectado. Missão de observação — proteja!" },
      { variant: "amazonia1", name: "Amazônia-1",  hp: 8, bonus: 2000, vx: 0.5, msg: "INPE: Amazônia-1 em rota crítica! Escolta máxima requerida!" },
    ];
    const cv = VARIANTS[Math.floor(Math.random() * VARIANTS.length)];
    const baseY = 80 + Math.random() * (H - 180);
    state.cbersMission = {
      x: W + 60, y: baseY, baseY, age: 0,
      hp: cv.hp, maxHp: cv.hp, bonus: cv.bonus,
      variant: cv.variant, name: cv.name, vx: cv.vx,
    };
    state.waveText = `🛰️ MISSÃO: Escorte ${cv.name}!`;
    state.waveT = 200;
    radioSay(cv.msg);
  }
  if (state.cbersMission) {
    const cm = state.cbersMission;
    cm.age++;
    cm.x -= cm.vx;
    // movimento senoidal em Y — duas frequências para trajetória orgânica
    cm.y = cm.baseY + Math.sin(cm.age * 0.022) * 38 + Math.sin(cm.age * 0.008) * 18;
    let cbersDestroyed = false;
    const cbersHB = { x: cm.x, y: cm.y, r: 14 };
    state.enemies.forEach(e => {
      if (!e.dead && circ(e.hb(), cbersHB)) {
        cm.hp = Math.max(0, cm.hp - 1);
        explode(cm.x, cm.y, "#ef4444", 4);
        if (cm.hp <= 0) cbersDestroyed = true;
      }
    });
    state.eBullets.forEach(b => {
      if (!b.dead && circ(b.hb(), cbersHB)) {
        b.dead = true;
        cm.hp = Math.max(0, cm.hp - 1);
        if (cm.hp <= 0) cbersDestroyed = true;
      }
    });
    if (cbersDestroyed) {
      explode(cm.x, cm.y, "#ef4444", 14);
      floatText(`🛰️ ${cm.name} DESTRUÍDO`, W / 2, H / 2 - 30, "#ef4444");
      radioSay(`INPE: Perdemos ${cm.name}. Missão fracassou.`);
      state.cbersMission = null; state.cbersMissionT = 5400;
    } else if (cm.x < -50) {
      const bonus = cm.bonus * Math.max(1, state.combo);
      state.score += bonus;
      const player = state.player!;
      player.inpe = Math.min(player.inpe + INPE_DUR, INPE_DUR * 2);
      player.fabJet = Math.min(player.fabJet + FAB_JET_DUR, FAB_JET_DUR * 2);
      sfxPowerup();
      floatText(`🛰️ ${cm.name} SEGURO! +${bonus}`, W / 2, H / 2 - 30, "#34d399");
      floatText("✈ APOIO DA FAB ATIVADO!", player.x, player.y - 44, "#93c5fd");
      radioSay(`FAB: Satélite seguro. Enviando apoio aéreo imediato — proteja os céus do Vale!`);
      state.cbersMission = null; state.cbersMissionT = 5400;
    }
  }

  state.bullets.forEach((b) => {
    state.enemies.forEach((e) => {
      if (b.dead || e.dead) return;
      if (circ({ x: b.x, y: b.y, r: b.r }, e.hb())) {
        b.dead = true;
        state.playerStats.shotsHit++;
        if (state.gState === ST.MULTI && e.mpId) {
          const dmg = (player.boost > 0 && player.shield > 0 ? 2 : 1) + player.perks.dmgBonus;
          mpSend({ type: "hit", enemyId: e.mpId, dmg });
          spark(e.x, e.y);
        } else {
          const dmg = (player.boost > 0 && player.shield > 0 ? 2 : 1) + player.perks.dmgBonus;
          const pts = e.hit(dmg);
          if (pts > 0) {
            state.score += pts * state.combo;
            floatText(
              `+${pts * state.combo}${state.combo > 1 ? " ×" + state.combo : ""}`,
              e.x, e.y, "#60a5fa",
            );
            state.combo = Math.min(state.combo + 1, state.diffCfg.comboMax);
            state.comboT = Math.round(130 * player.perks.comboTimeMult);
            state.playerStats.kills++;
            player.specialCD = Math.max(0, player.specialCD - PLANES.find(p => p.id === player.planeId)!.specialKillCDR);
            if (state.combo >= 3) state.playerStats.comboKills++;
            if (state.combo > state.playerStats.maxCombo) state.playerStats.maxCombo = state.combo;
            if ((BOSS_TYPES as readonly string[]).includes(e.type)) {
              state.shakeAmt += 9; state.playerStats.bossKills++;
              state.bossAlive = false;
              if (e.type === "cigarra") state.slowMoT = 40;
              console.log(`[BOSS KILL] tipo=${e.type} wave=${state.waveNum} score=${state.score} kills=${state.playerStats.kills}`);
              // Pausar para escolha de perk permanente
              state.playerLevel++;
              state.levelUpCards = pickLevelUpCards(3);
              state.shakeAmt = 0;
              sfxLevelUp();
              startLevelUpMusic();
              state.gState = ST.LEVELUP;
            }
            dropCollectibles(e.x, e.y, e.type);
          }
        }
      }
    });
  });

  const GRAZE_R = 18 * player.perks.grazeRadiusMult;
  const ENEMY_GRAZE_R = 52 * player.perks.grazeRadiusMult;
  const _fireGrazeMissile = () => {
    if (state.enemies.length === 0) return;
    const target = state.enemies.reduce((a, b) => {
      const da = (a.x - player.x) ** 2 + (a.y - player.y) ** 2;
      const db = (b.x - player.x) ** 2 + (b.y - player.y) ** 2;
      return da < db ? a : b;
    });
    state.bullets.push(new HomingMissile(player.x + 20, player.y, target));
    state.playerStats.shotsFired++;
  };

  if (player.inv <= 0 && player.bis <= 0) {
    state.eBullets.forEach(b => {
      if (b.dead || b.grazed) return;
      const dx = b.x - player.x, dy = b.y - player.y;
      const d2 = dx * dx + dy * dy;
      const bR = b.hb().r;
      const collDist = 13 + bR; // distância exata de colisão
      if (d2 < (collDist + GRAZE_R) * (collDist + GRAZE_R) && d2 > (collDist + 2) * (collDist + 2)) {
        b.grazed = true;
        const pts = 6 * state.combo;
        state.score += pts;
        state.grazeCount++;
        state.playerStats.grazes++;
        state._curGrazeStreak++;
        if (state._curGrazeStreak > state.playerStats.longestGrazeStreak)
          state.playerStats.longestGrazeStreak = state._curGrazeStreak;
        floatText(`✦ ${pts}`, player.x, player.y - 18, "#fde68a");
        _fireGrazeMissile();
        player.specialCD = Math.max(0, player.specialCD - PLANES.find(p => p.id === player.planeId)!.specialGrazeCDR);
      }
    });

    // Graze de inimigos: dispara míssil ao passar perto de um inimigo (1× por inimigo)
    state.enemies.forEach(e => {
      if ((e as Enemy & { _grazed?: boolean })._grazed) return;
      const dx = e.x - player.x, dy = e.y - player.y;
      const d2 = dx * dx + dy * dy;
      // inner bound = real collision radius + small buffer
      const collisionR = e.r * 0.78 + 13;
      const minD = (collisionR + 4) ** 2;
      if (d2 < ENEMY_GRAZE_R * ENEMY_GRAZE_R && d2 > minD) {
        (e as Enemy & { _grazed?: boolean })._grazed = true;
        state.grazeCount++;
        state.playerStats.grazes++;
        state._curGrazeStreak++;
        if (state._curGrazeStreak > state.playerStats.longestGrazeStreak)
          state.playerStats.longestGrazeStreak = state._curGrazeStreak;
        floatText(`✦ RASANTE`, player.x, player.y - 18, "#fde68a");
        _fireGrazeMissile();
        player.specialCD = Math.max(0, player.specialCD - PLANES.find(p => p.id === player.planeId)!.specialGrazeCDR);
      }
    });
  }

  state.eBullets.forEach((b) => {
    if (b.dead) return;
    if (player.ericsson > 0) {
      const angle = (state.frame * 0.09) % (Math.PI * 2);
      const ox = player.x + Math.cos(angle) * 44;
      const oy = player.y + Math.sin(angle) * 28;
      if (circ(b.hb(), { x: ox, y: oy, r: 13 })) {
        b.dead = true;
        explode(b.x, b.y, "#818cf8", 4);
        return;
      }
    }
    if (circ(b.hb(), { x: player.x, y: player.y, r: 13 })) {
      b.dead = true;
      // Perk: colete balístico — chance de ignorar o projétil
      if (player.perks.bulletEvasion > 0 && Math.random() < player.perks.bulletEvasion) {
        state.floaters.push({ txt: "MISS", x: b.x, y: b.y - 10, vy: -1.2, lifetime: 1, col: "#fbbf24" });
        return;
      }
      if (state.gState === ST.MULTI && player.inv <= 0 && player.bis <= 0 && player.shield <= 0) {
        const relayPartnerId = mpCheckShieldRelay();
        if (relayPartnerId) {
          mpSend({ type: "shield_relay_used", partnerId: relayPartnerId });
          state.shakeAmt += 4;
          return;
        }
      }
      const h = player.tryHit();
      if (h) {
        state.playerStats.hits++;
        state._waveHits++;
        state._curGrazeStreak = 0;
        if (player.lives === 1) state.playerStats.nearDeathHits++;
        state.ddaStress = Math.min(1, state.ddaStress + 0.20);
        state.shakeAmt += 10;
        state.combo = 1; state.comboT = 0;
        console.log(`[HIT] vidas=${player.lives} ddaStress=${state.ddaStress.toFixed(2)} wave=${state.waveNum}`);
        if (player.lives <= 0) {
          if (state.gState === ST.MULTI) { mpSend({ type: "dead" }); mp.localDead = true; }
          else endGame();
        } else if (player.lives === 1) radioSay(RADIO_MSGS.hit_low);
      }
    }
  });

  state.enemies.forEach((e) => {
    if (e.dead) return;
    if (circ(e.hb(), { x: player.x, y: player.y, r: 13 })) {
      // Perk: chassi reforçado — chance de ignorar colisão
      if (player.perks.impactEvasion > 0 && Math.random() < player.perks.impactEvasion) return;
      const h = player.tryHit();
      if (h) {
        state.shakeAmt += 8;
        state.combo = 1; state.comboT = 0;
        e.hp -= 2;
        if (e.hp <= 0 && !e.dead) {
          e.dead = true;
          if ((BOSS_TYPES as readonly string[]).includes(e.type)) state.bossAlive = false;
        }
        if (player.lives <= 0) {
          if (state.gState === ST.MULTI) { mpSend({ type: "dead" }); mp.localDead = true; }
          else endGame();
        }
      }
    }
  });

  state.collectibles.forEach((c) => {
    if (c.dead || mp.localDead) return;
    if (circ({ x: c.x, y: c.y, r: c.r }, { x: player.x, y: player.y, r: 20 })) {
      c.dead = true;
      if (state.gState === ST.MULTI && c.mpId) mpSend({ type: "collect", collectibleId: c.mpId });
      sfxCollect();
      if (c.type.pw) state.playerStats.pw[c.type.id] = (state.playerStats.pw[c.type.id] ?? 0) + 1;
      const pw = c.type.pw;
      if (pw) console.log(`[POWERUP] ${c.type.id} (${c.type.lbl}) wave=${state.waveNum}`);
      // estado ANTES de aplicar — para detectar sinergia nova
      const hadFortaleza     = player.boost > 0 && player.shield > 0;
      const hadRadarAvibras  = player.avibras > 0 && player.inpe > 0;
      const hadHipersonico   = player.delta > 0 && player.boost > 0;
      const hadEscudoGlacial = player.revap > 0 && player.shield > 0;
      if (pw === "shield") {
        player.shield = Math.min(player.shield + SHIELD_DUR, SHIELD_DUR * 3);
        sfxPowerup(); floatText("🛡️ ESCUDO!", player.x, player.y, "#34d399");
      } else if (pw === "boost") {
        player.boost = Math.min(player.boost + BOOST_DUR, BOOST_DUR * 3);
        sfxPowerup(); floatText("⚡ BOOST!", player.x, player.y, "#fb923c");
      } else if (pw === "14bis") {
        player.bis = BIS_DUR;
        sfxPowerup(); floatText("🛩️ 14-BIS!", player.x, player.y, "#ffd700");
        radioSay(RADIO_MSGS.collect_14bis);
      } else if (pw === "avibras") {
        player.avibras = Math.min(player.avibras + AVIBRAS_DUR, AVIBRAS_DUR * 2);
        player.missileT = 0;
        sfxPowerup(); floatText("🚀 PULSO AVIBRAS!", player.x, player.y, "#f97316");
      } else if (pw === "inpe_sat") {
        player.inpe = Math.min(player.inpe + INPE_DUR, INPE_DUR * 2);
        sfxPowerup(); floatText("📡 SATÉLITE INPE!", player.x, player.y, "#60a5fa");
      } else if (pw === "revap") {
        player.revap = REVAP_DUR;
        sfxPowerup(); floatText("❄️ REVAP SHOCK!", player.x, player.y, "#bfdbfe");
      } else if (pw === "delta") {
        player.delta = Math.min(player.delta + DELTA_DUR, DELTA_DUR * 2);
        sfxPowerup(); floatText("🪂 ASA DELTA!", player.x, player.y, "#a78bfa");
      } else if (pw === "ericsson") {
        player.ericsson = Math.min(player.ericsson + ERICSSON_DUR, ERICSSON_DUR * 2);
        sfxPowerup(); floatText("📶 WINGMAN 5G!", player.x, player.y, "#818cf8");
      } else if (pw === "hp_up") {
        player.lives = Math.min(player.lives + 1, player.maxLives + 2);
        sfxPowerup(); floatText("❤️ VIDA +1!", player.x, player.y, "#f472b6");
        radioSay("Torre SJC: Reforço recebido! HP restaurado, Guardião!");
      } else {
        state.score += c.type.pts * state.combo;
        floatText(`${c.type.icon} +${c.type.pts * state.combo}`, c.x, c.y, c.type.col);
      }
      // dispara rádio apenas quando sinergia é NOVA (não estava ativa antes de coletar)
      if (!hadFortaleza     && player.boost > 0   && player.shield > 0)  radioSay(RADIO_MSGS.synergy_fortaleza,     60);
      if (!hadRadarAvibras  && player.avibras > 0 && player.inpe > 0)    radioSay(RADIO_MSGS.synergy_radar_avibras,  60);
      if (!hadHipersonico   && player.delta > 0   && player.boost > 0)   radioSay(RADIO_MSGS.synergy_hipersonico,    60);
      if (!hadEscudoGlacial && player.revap > 0   && player.shield > 0)  radioSay(RADIO_MSGS.synergy_escudo_glacial, 60);
    }
  });
}

function render(): void {
  const noShake = state.gState === ST.LEVELUP || state.gState === ST.PAUSE || state.gState === ST.OVER;
  const sx = !noShake && state.shakeAmt > 0.5 ? (Math.random() - 0.5) * state.shakeAmt * 2 : 0;
  const sy = !noShake && state.shakeAmt > 0.5 ? (Math.random() - 0.5) * state.shakeAmt * 2 : 0;
  ctx.clearRect(0, 0, W, H);
  if (state.gState === ST.MENU)  { drawMenu();  return; }
  if (state.gState === ST.ABOUT) { drawSobre(); return; }
  if (state.gState === ST.LOBBY) { drawLobby(); return; }
  ctx.save();
  if (state.gState === ST.OVER) {
    ctx.filter = "grayscale(1)";
  } else if (!noShake && state.shakeAmt > 0.5) {
    ctx.translate(sx, sy);
  }
  drawBg();
  state.collectibles.forEach((c) => c.draw());
  if (state.cbersMission) {
    const cm = state.cbersMission;
    const pulse = Math.sin(state.frame * 0.14) * 0.5 + 0.5;
    ctx.save();
    ctx.translate(cm.x, cm.y);

    // Barra de HP + nome
    const barW = 56, barH = 5;
    const hpFrac = cm.hp / cm.maxHp;
    const barY = cm.variant === "amazonia1" ? -30 : -24;
    ctx.fillStyle = "rgba(0,0,0,0.55)"; ctx.fillRect(-barW / 2, barY, barW, barH);
    ctx.fillStyle = hpFrac > 0.5 ? "#4ade80" : hpFrac > 0.25 ? "#fbbf24" : "#ef4444";
    ctx.fillRect(-barW / 2, barY, barW * hpFrac, barH);
    ctx.strokeStyle = "#ffffff33"; ctx.lineWidth = 0.5; ctx.strokeRect(-barW / 2, barY, barW, barH);
    ctx.font = "bold 8px monospace"; ctx.textAlign = "center"; ctx.fillStyle = "#94a3b8";
    ctx.fillText(cm.name, 0, barY - 3); ctx.textAlign = "left";

    if (cm.variant === "cbers4") {
      // CBERS-4: corpo retangular, painéis azuis, antena simples
      ctx.strokeStyle = "#94a3b8"; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(0, -6); ctx.lineTo(0, -14); ctx.stroke();
      ctx.fillStyle = `rgba(96,165,250,${0.55 + pulse * 0.45})`;
      ctx.beginPath(); ctx.arc(0, -15, 2.2, 0, Math.PI * 2); ctx.fill();
      const bg = ctx.createLinearGradient(-10, -7, 10, 7);
      bg.addColorStop(0, "#cbd5e1"); bg.addColorStop(1, "#475569");
      ctx.fillStyle = bg; ctx.shadowColor = "#60a5fa"; ctx.shadowBlur = 7 + pulse * 5;
      ctx.fillRect(-10, -7, 20, 14); ctx.shadowBlur = 0;
      ctx.fillStyle = "#1e3a5f"; ctx.fillRect(-7, -5, 14, 4);
      ctx.fillStyle = "#60a5fa55"; ctx.fillRect(-7, 1, 14, 4);
      // painéis
      const pCol = `rgba(30,64,175,1)`, pGlow = `rgba(96,165,250,${0.14 + pulse * 0.14})`;
      [[-30, 18], [12, 18]].forEach(([px, pw]) => {
        ctx.fillStyle = pCol; ctx.fillRect(px, -5, pw, 10);
        for (let i = 1; i < 4; i++) { ctx.strokeStyle = "#3b82f699"; ctx.lineWidth = 0.7; ctx.beginPath(); ctx.moveTo(px + i*(pw/4), -5); ctx.lineTo(px + i*(pw/4), 5); ctx.stroke(); }
        ctx.beginPath(); ctx.moveTo(px, 0); ctx.lineTo(px+pw, 0); ctx.stroke();
        ctx.fillStyle = pGlow; ctx.fillRect(px, -5, pw, 10);
      });
      ctx.fillStyle = "#334155"; ctx.fillRect(-3, 7, 6, 4);
      ctx.fillStyle = `rgba(251,146,60,${0.35 + pulse * 0.35})`; ctx.beginPath(); ctx.arc(0, 12, 2.5, 0, Math.PI*2); ctx.fill();

    } else if (cm.variant === "cbers4a") {
      // CBERS-4A: corpo hexagonal, painéis amarelo-dourado, 2 antenas
      ctx.strokeStyle = "#94a3b8"; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(-5, -7); ctx.lineTo(-5, -15); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(5, -7); ctx.lineTo(5, -13); ctx.stroke();
      ctx.fillStyle = `rgba(251,191,36,${0.6 + pulse * 0.4})`;
      ctx.beginPath(); ctx.arc(-5, -16, 2, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(5, -14, 1.5, 0, Math.PI*2); ctx.fill();
      // hexágono corpo
      ctx.beginPath();
      for (let i = 0; i < 6; i++) { const a = (i/6)*Math.PI*2 - Math.PI/6; const r = 10; i === 0 ? ctx.moveTo(Math.cos(a)*r, Math.sin(a)*r) : ctx.lineTo(Math.cos(a)*r, Math.sin(a)*r); }
      ctx.closePath();
      const hg = ctx.createRadialGradient(0,0,2,0,0,10);
      hg.addColorStop(0, "#e2e8f0"); hg.addColorStop(1, "#64748b");
      ctx.fillStyle = hg; ctx.shadowColor = "#fbbf24"; ctx.shadowBlur = 8 + pulse * 6; ctx.fill(); ctx.shadowBlur = 0;
      ctx.fillStyle = "#78350f88"; ctx.beginPath(); ctx.arc(0, 0, 4, 0, Math.PI*2); ctx.fill();
      // painéis dourados
      const gCol = `rgba(120,80,10,1)`, gGlow = `rgba(251,191,36,${0.2+pulse*0.2})`;
      [[-34, 20], [14, 20]].forEach(([px, pw]) => {
        ctx.fillStyle = gCol; ctx.fillRect(px, -5, pw, 10);
        for (let i = 1; i < 5; i++) { ctx.strokeStyle = "#d9770655"; ctx.lineWidth = 0.7; ctx.beginPath(); ctx.moveTo(px + i*(pw/5), -5); ctx.lineTo(px + i*(pw/5), 5); ctx.stroke(); }
        ctx.fillStyle = gGlow; ctx.fillRect(px, -5, pw, 10);
      });

    } else {
      // Amazônia-1: maior, painéis largos verdes, corpo octogonal, câmera OSIM
      const sides = 8, R = 13;
      ctx.beginPath();
      for (let i = 0; i < sides; i++) { const a = (i/sides)*Math.PI*2 - Math.PI/8; i === 0 ? ctx.moveTo(Math.cos(a)*R, Math.sin(a)*R) : ctx.lineTo(Math.cos(a)*R, Math.sin(a)*R); }
      ctx.closePath();
      const og = ctx.createRadialGradient(0,0,3,0,0,R);
      og.addColorStop(0, "#e2e8f0"); og.addColorStop(1, "#374151");
      ctx.fillStyle = og; ctx.shadowColor = "#34d399"; ctx.shadowBlur = 10 + pulse * 8; ctx.fill(); ctx.shadowBlur = 0;
      // lente câmera OSIM
      ctx.fillStyle = "#0f172a"; ctx.beginPath(); ctx.arc(0, 3, 5, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = `rgba(52,211,153,${0.4+pulse*0.5})`; ctx.beginPath(); ctx.arc(0, 3, 3, 0, Math.PI*2); ctx.fill();
      // antena dish
      ctx.strokeStyle = "#94a3b8"; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(0,-R); ctx.lineTo(0,-R-10); ctx.stroke();
      ctx.beginPath(); ctx.arc(0,-R-10,5,Math.PI,0); ctx.stroke();
      ctx.fillStyle = `rgba(96,165,250,${0.5+pulse*0.5})`; ctx.beginPath(); ctx.arc(0,-R-10,2,0,Math.PI*2); ctx.fill();
      // painéis verdes largos
      const vCol = `rgba(5,71,38,1)`, vGlow = `rgba(52,211,153,${0.15+pulse*0.2})`;
      [[-44, 26], [18, 26]].forEach(([px, pw]) => {
        ctx.fillStyle = vCol; ctx.fillRect(px, -6, pw, 12);
        for (let i = 1; i < 6; i++) { ctx.strokeStyle = "#059669aa"; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(px+i*(pw/6),-6); ctx.lineTo(px+i*(pw/6),6); ctx.stroke(); }
        ctx.beginPath(); ctx.moveTo(px,0); ctx.lineTo(px+pw,0); ctx.stroke();
        ctx.fillStyle = vGlow; ctx.fillRect(px,-6,pw,12);
      });
    }

    ctx.restore();
  }
  state.enemies.forEach((e) => e.draw());
  state.eBullets.forEach((b) => b.draw());
  state.bullets.forEach((b) => b.draw());
  state.particles.forEach((p) => {
    ctx.globalAlpha = p.life;
    ctx.fillStyle = p.col;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalAlpha = 1;
  if (!mp.localDead && state.player) state.player.draw();
  mpDrawAll();
  state.floaters.forEach((f) => {
    ctx.globalAlpha = f.lifetime;
    ctx.fillStyle = f.col;
    ctx.font = "bold 13px Courier New";
    ctx.textAlign = "center";
    ctx.shadowColor = f.col;
    ctx.shadowBlur = 5;
    ctx.fillText(f.txt, f.x, f.y);
    ctx.shadowBlur = 0;
  });
  ctx.globalAlpha = 1;
  ctx.textAlign = "left";
  ctx.restore();

  // Slow-mo cinematic overlay (cigarra alive)
  const _cigarraAlive = state.enemies.some((e) => e.type === "cigarra");
  if (_cigarraAlive || state.slowMoT > 0) {
    const a = state.slowMoT > 0 ? Math.min(state.slowMoT / 20, 1) : 1;
    const grad = ctx.createRadialGradient(W / 2, H / 2, H * 0.25, W / 2, H / 2, H * 0.85);
    grad.addColorStop(0, "rgba(0,0,0,0)");
    grad.addColorStop(1, `rgba(60,0,90,${(a * 0.5).toFixed(2)})`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = a * 0.85;
    ctx.font = "bold 11px Courier New";
    ctx.fillStyle = "#e879f9";
    ctx.textAlign = "center";
    ctx.shadowColor = "#e879f9";
    ctx.shadowBlur = 10;
    ctx.fillText("⏪ CÂMERA LENTA", W / 2, 18);
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
    ctx.textAlign = "left";
  }

  drawHUD();
  drawDebugOverlay();
  mpDrawHUD();
  if (state.touch.active) drawJoystick();
  if (state.gState === ST.PAUSE) drawPause();
  if (state.gState === ST.OVER) drawOver();
  if (state.gState === ST.LEVELUP) drawLevelUp();
  if (state.dev.open) drawDevPanel();
  drawDevButton();
}

// ── Input ─────────────────────────────────────────────────────────────────────
function toCanvas(t: Touch): { x: number; y: number } {
  const r = canvas.getBoundingClientRect();
  return {
    x: ((t.clientX - r.left) / r.width) * W,
    y: ((t.clientY - r.top) / r.height) * H,
  };
}

function _hitDevBtn(p: { x: number; y: number }): boolean {
  return p.x >= DEV_BTN.x && p.x <= DEV_BTN.x + DEV_BTN.w &&
         p.y >= DEV_BTN.y && p.y <= DEV_BTN.y + DEV_BTN.h;
}

function _hitMpBtn(p: { x: number; y: number }): boolean {
  return p.x >= _MP_BTN_RECT.x && p.x <= _MP_BTN_RECT.x + _MP_BTN_RECT.w &&
         p.y >= _MP_BTN_RECT.y && p.y <= _MP_BTN_RECT.y + _MP_BTN_RECT.h;
}

document.addEventListener("keydown", (e) => {
  if (e.code === "F1") {
    state.dev.showDebugOverlay = !state.dev.showDebugOverlay;
    e.preventDefault();
    return;
  }
  if (state.dev.open) {
    if (devHandleKey(e.code)) { e.preventDefault(); return; }
    if (e.code === "Escape" && state.dev.openCooldown <= 0) { state.dev.open = false; return; }
    return;
  }
  if (state.gState === ST.ABOUT) { state.gState = ST.MENU; return; }

  // Level-up: teclas 1/2/3 escolhem o perk
  if (state.gState === ST.LEVELUP && state.levelUpCards) {
    const cards = state.levelUpCards;
    if (e.code === "Digit1" || e.code === "Numpad1") { applyPerk(cards[0]); return; }
    if (e.code === "Digit2" || e.code === "Numpad2") { applyPerk(cards[1]); return; }
    if ((e.code === "Digit3" || e.code === "Numpad3") && cards[2]) { applyPerk(cards[2]); return; }
    return;
  }

  if (state.gState === ST.LOBBY) {
    if (e.code === "Escape") { mpDisconnect(); state.gState = ST.MENU; return; }
    if (e.code === "ArrowLeft" || e.code === "KeyA") {
      state.selectedPlane = (state.selectedPlane - 1 + PLANES.length) % PLANES.length;
      mpSend({ type: "ship", planeId: state.selectedPlane });
      const _lrp = mp.players.get(mp.playerId!); if (_lrp) _lrp.planeId = state.selectedPlane;
      return;
    }
    if (e.code === "ArrowRight" || e.code === "KeyD") {
      state.selectedPlane = (state.selectedPlane + 1) % PLANES.length;
      mpSend({ type: "ship", planeId: state.selectedPlane });
      const _lrp = mp.players.get(mp.playerId!); if (_lrp) _lrp.planeId = state.selectedPlane;
      return;
    }
    if (e.code === "Enter" || e.code === "Space") {
      if (mp.isHost) mpSend({ type: "start" });
      else mpSend({ type: "ready" });
      return;
    }
    if (e.code === "KeyC") {
      navigator.clipboard?.writeText(mp.shareUrl || "").catch(() => {});
      return;
    }
    return;
  }

  state.keys[e.code] = true;
  if (e.code === "Escape" || e.code === "KeyP") {
    if (state.gState === ST.PLAY || state.gState === ST.MULTI) state.gState = ST.PAUSE;
    else if (state.gState === ST.PAUSE)
      state.gState = mp.connected && mp.gameStarted ? ST.MULTI : ST.PLAY;
  }
  if (e.code === "KeyM" && state.gState === ST.PAUSE) {
    mpDisconnect();
    state.gState = ST.MENU;
    startMenuMusic(state.selectedDifficulty);
    return;
  }
  if (e.code === "KeyI" && state.gState === ST.MENU) { state.gState = ST.ABOUT; return; }
  if (state.gState === ST.MENU) {
    ensureAC();
    if (!state.mActive) startMenuMusic(state.selectedDifficulty);
    if (e.code === "ArrowLeft" || e.code === "KeyA")
      state.selectedPlane = (state.selectedPlane - 1 + PLANES.length) % PLANES.length;
    if (e.code === "ArrowRight" || e.code === "KeyD")
      state.selectedPlane = (state.selectedPlane + 1) % PLANES.length;
    if (e.code === "ArrowUp" || e.code === "ArrowDown" || e.code === "KeyW" || e.code === "KeyS") {
      state.selectedDifficulty = (state.selectedDifficulty + 1) % DIFFICULTIES.length;
      startMenuMusic(state.selectedDifficulty);
    }
    if (e.code === "KeyM") { ensureAC(); mpConnect(); return; }
  }
  if (e.code === "Space" && (state.gState === ST.PLAY || state.gState === ST.MULTI)) {
    activateSpecial();
    e.preventDefault();
    return;
  }
  if ((e.code === "Enter" || e.code === "Space") &&
      (state.gState === ST.MENU || state.gState === ST.OVER))
    startGame();
});

document.addEventListener("keyup", (e) => {
  delete state.keys[e.code];
});

canvas.addEventListener("click", (e) => {
  const _cr = canvas.getBoundingClientRect();
  const p = { x: ((e.clientX - _cr.left) / _cr.width) * W, y: ((e.clientY - _cr.top) / _cr.height) * H };
  if (state.gState === ST.MENU) {
    ensureAC();
    if (!state.mActive) startMenuMusic(state.selectedDifficulty);
    if (_hitMpBtn(p)) { mpConnect(); return; }
    return;
  }
  if (state.gState === ST.LOBBY) {
    const action = mpLobbyHit(p);
    if (action === "plane_left")  { state.selectedPlane = (state.selectedPlane - 1 + PLANES.length) % PLANES.length; mpSend({ type: "ship", planeId: state.selectedPlane }); const _lrp = mp.players.get(mp.playerId!); if (_lrp) _lrp.planeId = state.selectedPlane; }
    if (action === "plane_right") { state.selectedPlane = (state.selectedPlane + 1) % PLANES.length; mpSend({ type: "ship", planeId: state.selectedPlane }); const _lrp = mp.players.get(mp.playerId!); if (_lrp) _lrp.planeId = state.selectedPlane; }
    if (action === "start")  mpSend({ type: "start" });
    if (action === "ready")  mpSend({ type: "ready" });
    if (action === "back")   { mpDisconnect(); state.gState = ST.MENU; }
    if (action === "copy_link") navigator.clipboard?.writeText(mp.shareUrl || "").catch(() => {});
    return;
  }
  if ((state.gState === ST.PLAY || state.gState === ST.PAUSE || state.gState === ST.MULTI) && _hitDevBtn(p)) {
    if (!state.dev.open) { state.dev.open = true; state.dev.openCooldown = 20; }
    else if (state.dev.openCooldown <= 0) state.dev.open = false;
  }
  if (state.gState === ST.LEVELUP && state.levelUpCards) {
    const CW = 180, CH = 150, GAP = 20;
    const startX = (W - (CW * 3 + GAP * 2)) / 2;
    const startY = 94;
    state.levelUpCards.forEach((perk, i) => {
      const cx = startX + i * (CW + GAP);
      if (p.x >= cx && p.x <= cx + CW && p.y >= startY && p.y <= startY + CH) applyPerk(perk);
    });
  }
});

canvas.addEventListener("touchstart", (e) => {
  e.preventDefault();
  if (state.gState === ST.ABOUT) { state.gState = ST.MENU; return; }
  if (state.gState === ST.LOBBY) {
    const p = toCanvas(e.changedTouches[0]);
    const action = mpLobbyHit(p);
    if (action === "plane_left")  { state.selectedPlane = (state.selectedPlane - 1 + PLANES.length) % PLANES.length; mpSend({ type: "ship", planeId: state.selectedPlane }); }
    if (action === "plane_right") { state.selectedPlane = (state.selectedPlane + 1) % PLANES.length; mpSend({ type: "ship", planeId: state.selectedPlane }); }
    if (action === "start")  mpSend({ type: "start" });
    if (action === "ready")  mpSend({ type: "ready" });
    if (action === "back")   { mpDisconnect(); state.gState = ST.MENU; }
    return;
  }
  if (state.gState === ST.MENU || state.gState === ST.OVER) {
    ensureAC();
    const p = toCanvas(e.changedTouches[0]);
    if (state.gState === ST.MENU && _hitMpBtn(p)) { mpConnect(); return; }
    startGame(); return;
  }
  const p = toCanvas(e.changedTouches[0]);
  if ((state.gState === ST.PLAY || state.gState === ST.PAUSE || state.gState === ST.MULTI) && _hitDevBtn(p)) {
    if (!state.dev.open) { state.dev.open = true; state.dev.openCooldown = 20; }
    else if (state.dev.openCooldown <= 0) state.dev.open = false;
    return;
  }
  if (state.dev.open) {
    const hit = state.devItemRects.find(r => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h);
    if (hit) {
      const item = DEV_ITEMS[hit.i];
      if (item && item.type !== "header") {
        state.dev.cursor = hit.i;
        if (item.type === "toggle" && item.set && item.get) item.set(!item.get());
        else if (item.run) item.run();
      }
      return;
    }
    state.dev.open = false;
    return;
  }
  if (state.gState === ST.PAUSE) { state.gState = ST.PLAY; return; }
  // Level-up: tap num card seleciona o perk
  if (state.gState === ST.LEVELUP && state.levelUpCards) {
    const CW = 180, CH = 150, GAP = 20;
    const startX = (W - (CW * 3 + GAP * 2)) / 2;
    const startY = 94;
    state.levelUpCards.forEach((perk, i) => {
      const cx = startX + i * (CW + GAP);
      if (p.x >= cx && p.x <= cx + CW && p.y >= startY && p.y <= startY + CH) applyPerk(perk);
    });
    return;
  }
  state.touch.active = true;
  state.touch.cx = p.x; state.touch.cy = p.y;
  state.touch.kx = p.x; state.touch.ky = p.y;
  state.touch.vx = 0; state.touch.vy = 0;
}, { passive: false });

canvas.addEventListener("touchmove", (e) => {
  e.preventDefault();
  if (!state.touch.active) return;
  const p = toCanvas(e.changedTouches[0]);
  state.touch.kx = p.x; state.touch.ky = p.y;
  let dx = p.x - state.touch.cx;
  let dy = p.y - state.touch.cy;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  const clamped = Math.min(len, 82);
  state.touch.vx = (dx / len) * (clamped / 82);
  state.touch.vy = (dy / len) * (clamped / 82);
}, { passive: false });

canvas.addEventListener("touchend", (e) => {
  e.preventDefault();
  state.touch.active = false;
  state.touch.vx = 0; state.touch.vy = 0;
}, { passive: false });

document.getElementById("btn-pause-mobile")?.addEventListener("click", () => {
  if (state.gState === ST.PLAY) state.gState = ST.PAUSE;
  else if (state.gState === ST.PAUSE) state.gState = ST.PLAY;
});

document.getElementById("btn-special-mobile")?.addEventListener("click", () => {
  activateSpecial();
});

// ── RAF loop ───────────────────────────────────────────────────────────────────
export function startLoop(): void {
  mpAutoJoin();
  startMenuMusic(0);
  let _rafSkip = 0;
  (function loop(ts: number): void {
    state._fpsCount++;
    if (ts - state._fpsTs >= 1000) {
      state.fps = state._fpsCount;
      state._fpsCount = 0;
      state._fpsTs = ts;
    }
    if (state.slowMoT > 0) {
      state.slowMoT--;
      _rafSkip = (_rafSkip + 1) % 3;
      if (_rafSkip === 0) update();
    } else {
      const cigarraAlive = (state.gState === ST.PLAY || state.gState === ST.MULTI)
        && state.enemies.some((e) => e.type === "cigarra");
      if (cigarraAlive) {
        _rafSkip = (_rafSkip + 1) % 2;
        if (_rafSkip === 0) update();
      } else {
        update();
      }
    }
    render();
    requestAnimationFrame(loop);
  })(0);
}
