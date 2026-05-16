import { state } from "./state";
import { canvas, ctx, W, H } from "./world";
import {
  PLANES, DIFFICULTIES, TOTAL_KEY, BOSS_TYPES, BOSS_ROTATION, BOSS_LABELS,
  WAVE_DEFS, RADIO_MSGS, MT1, MT2, MT3, STARS, DEV_SCENES,
  SHIELD_DUR, BOOST_DUR, BIS_DUR, AVIBRAS_DUR, INPE_DUR, REVAP_DUR,
  DELTA_DUR, ERICSSON_DUR, DEV_BTN, _MP_BTN_RECT,
} from "./constants";
import { ST } from "./types";
import {
  Player, Bullet, Enemy, Collectible,
  circ, explode, floatText, spark, dropCollectibles,
} from "./entities";
import {
  ensureAC, sfxCollect, sfxPowerup, sfxBossIn, sfxDestroy,
  startMusic, stopMusic, startMenuMusic, switchMusicForPhase,
} from "./audio";
import {
  drawBg, drawHUD, drawMenu, drawOver, drawPause, drawSobre,
  drawDevButton, drawJoystick,
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
  radioSay(RADIO_MSGS.boss);
  if (state.waveNum > state.diffCfg.doubleBossWave) {
    const second = BOSS_ROTATION[(Math.floor(state.waveNum) + 2) % BOSS_ROTATION.length];
    setTimeout(() => {
      if (state.gState === ST.PLAY)
        state.enemies.push(new Enemy(second, W + 300, H / 3));
    }, 7000);
  }
}

// ── Game lifecycle ─────────────────────────────────────────────────────────────
export function startGame(): void {
  ensureAC();
  for (const k in state.keys) delete state.keys[k];
  state.diffCfg = DIFFICULTIES[state.selectedDifficulty];
  state.hsKey = state.diffCfg.hsKey;
  const pl = PLANES[state.selectedPlane];
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
    else if (r < 0.75) state.enemies.push(new Enemy("drone", W + 42, y));
    else               state.enemies.push(new Enemy("arara", W + 32, y));
  } else if (w === 2) {
    if      (r < 0.18) state.enemies.push(new Enemy("cloud", W + 85, y));
    else if (r < 0.45) state.enemies.push(new Enemy("drone", W + 42, y));
    else               state.enemies.push(new Enemy("arara", W + 32, y));
  } else if (w === 3) {
    if      (r < 0.15) state.enemies.push(new Enemy("cloud", W + 85, y));
    else if (r < 0.38) state.enemies.push(new Enemy("drone", W + 42, y));
    else if (r < 0.68) state.enemies.push(new Enemy("arara", W + 32, y));
    else if (isNight)  state.enemies.push(new Enemy("ovni",  W + 55, y));
    else               state.enemies.push(new Enemy("drone", W + 42, y));
  } else if (w === 4) {
    if      (r < 0.12) state.enemies.push(new Enemy("cloud",       W + 85, y));
    else if (r < 0.32) state.enemies.push(new Enemy("drone",       W + 42, y));
    else if (r < 0.58) state.enemies.push(new Enemy("arara",       W + 32, y));
    else if (r < 0.78) state.enemies.push(new Enemy("ovni",        W + 55, y));
    else               state.enemies.push(new Enemy("helicoptero", W + 60, y));
  } else if (w === 5) {
    if      (r < 0.10) state.enemies.push(new Enemy("cloud",       W + 85, y));
    else if (r < 0.26) state.enemies.push(new Enemy("drone",       W + 42, y));
    else if (r < 0.50) state.enemies.push(new Enemy("arara",       W + 32, y));
    else if (r < 0.74) state.enemies.push(new Enemy("ovni",        W + 55, y));
    else               state.enemies.push(new Enemy("helicoptero", W + 60, y));
    if (Math.random() < 0.22) {
      const y2 = 55 + Math.random() * (H - 110);
      state.enemies.push(new Enemy("drone", W + 42 + Math.random() * 60, y2));
    }
  } else {
    if      (r < 0.08) state.enemies.push(new Enemy("cloud",       W + 85, y));
    else if (r < 0.22) state.enemies.push(new Enemy("drone",       W + 42, y));
    else if (r < 0.46) state.enemies.push(new Enemy("arara",       W + 32, y));
    else if (r < 0.68) state.enemies.push(new Enemy("ovni",        W + 55, y));
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
  if (state.keys["Escape"] && !state.dev.open) {
    state.dev.escHold++;
    if (state.dev.escHold === 240) {
      state.dev.open = true; state.dev.escHold = 0; state.dev.openCooldown = 60;
    }
  }
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
  state.ddaStress = Math.max(0, state.ddaStress - 0.0007);
  if (state.combo >= 5) state.ddaStress = Math.max(0, state.ddaStress - 0.0004);

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

  if (player.ericsson > 0 && player.fireT === 1) {
    const offY = 38;
    if (player.boost > 0) {
      state.bullets.push(new Bullet(player.x + 30, player.y + offY, -0.18));
      state.bullets.push(new Bullet(player.x + 30, player.y + offY,  0.18));
      state.playerStats.shotsFired += 2;
    } else {
      state.bullets.push(new Bullet(player.x + 30, player.y + offY, 0));
      state.playerStats.shotsFired++;
    }
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
      const ddaAdjust = state.diffCfg.id === "aventura" ? 1 + (state.ddaStress - 0.5) * 0.40 : 1;
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
    state.cbersMission = { x: W + 40, y: 55 + Math.random() * (H * 0.4), hp: 3, bonus: 800 };
    state.waveText = "🛰️ MISSÃO: Escorte o Satélite CBERS-4!";
    state.waveT = 160;
    radioSay("INPE: Satélite CBERS em rota. Proteja a missão!");
  }
  if (state.cbersMission) {
    state.cbersMission.x -= 1.4;
    let cbersHit = false;
    state.enemies.forEach(e => {
      if (!e.dead && state.cbersMission && circ(e.hb(), { x: state.cbersMission.x, y: state.cbersMission.y, r: 14 })) {
        if (--state.cbersMission.hp <= 0) cbersHit = true;
      }
    });
    if (cbersHit) {
      explode(state.cbersMission.x, state.cbersMission.y, "#ef4444", 10);
      floatText("🛰️ MISSÃO FALHOU", W / 2, H / 2 - 30, "#ef4444");
      state.cbersMission = null; state.cbersMissionT = 5400;
    } else if (state.cbersMission && state.cbersMission.x < -30) {
      state.score += state.cbersMission.bonus;
      floatText(`🛰️ CBERS SEGURO! +${state.cbersMission.bonus}`, W / 2, H / 2 - 30, "#34d399");
      sfxPowerup();
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
          const dmg = player.boost > 0 && player.shield > 0 ? 2 : 1;
          mpSend({ type: "hit", enemyId: e.mpId, dmg });
          spark(e.x, e.y);
        } else {
          const dmg = player.boost > 0 && player.shield > 0 ? 2 : 1;
          const pts = e.hit(dmg);
          if (pts > 0) {
            state.score += pts * state.combo;
            floatText(
              `+${pts * state.combo}${state.combo > 1 ? " ×" + state.combo : ""}`,
              e.x, e.y, "#60a5fa",
            );
            state.combo = Math.min(state.combo + 1, state.diffCfg.comboMax);
            state.comboT = 130;
            state.playerStats.kills++;
            if (state.combo >= 3) state.playerStats.comboKills++;
            if (state.combo > state.playerStats.maxCombo) state.playerStats.maxCombo = state.combo;
            if ((BOSS_TYPES as readonly string[]).includes(e.type)) {
              state.shakeAmt += 9; state.playerStats.bossKills++;
              state.bossAlive = false;
            }
            dropCollectibles(e.x, e.y, e.type);
          }
        }
      }
    });
  });

  const GRAZE_R = 22;
  if (player.inv <= 0 && player.bis <= 0) {
    state.eBullets.forEach(b => {
      if (b.dead || b.grazed) return;
      const dx = b.x - player.x, dy = b.y - player.y;
      const d2 = dx * dx + dy * dy;
      if (d2 < GRAZE_R * GRAZE_R && d2 > 14 * 14) {
        b.grazed = true;
        const pts = 6 * state.combo;
        state.score += pts;
        state.grazeCount++;
        state.playerStats.grazes++;
        state._curGrazeStreak++;
        if (state._curGrazeStreak > state.playerStats.longestGrazeStreak)
          state.playerStats.longestGrazeStreak = state._curGrazeStreak;
        floatText(`✦ ${pts}`, player.x, player.y - 18, "#fde68a");
        if (player.avibras > 0) player.missileT = Math.max(0, player.missileT - 14);
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
        radioSay(RADIO_MSGS.collect_avibras);
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
    }
  });
}

function render(): void {
  const sx = state.shakeAmt > 0.5 ? (Math.random() - 0.5) * state.shakeAmt * 2 : 0;
  const sy = state.shakeAmt > 0.5 ? (Math.random() - 0.5) * state.shakeAmt * 2 : 0;
  ctx.clearRect(0, 0, W, H);
  if (state.gState === ST.MENU)  { drawMenu();  return; }
  if (state.gState === ST.ABOUT) { drawSobre(); return; }
  if (state.gState === ST.LOBBY) { drawLobby(); return; }
  ctx.save();
  if (state.gState === ST.OVER) {
    ctx.filter = "grayscale(1)";
  } else if (state.shakeAmt > 0.5) {
    ctx.translate(sx, sy);
  }
  drawBg();
  state.collectibles.forEach((c) => c.draw());
  if (state.cbersMission) {
    const cm = state.cbersMission;
    ctx.save();
    ctx.translate(cm.x, cm.y);
    ctx.fillStyle = "#60a5fa"; ctx.shadowColor = "#60a5fa"; ctx.shadowBlur = 12;
    ctx.fillRect(-8, -5, 16, 10);
    ctx.fillStyle = "#bfdbfe";
    ctx.fillRect(-22, -3, 12, 6);
    ctx.fillRect(10, -3, 12, 6);
    ctx.shadowBlur = 0;
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
  drawHUD();
  mpDrawHUD();
  if (state.touch.active) drawJoystick();
  if (state.gState === ST.PAUSE) drawPause();
  if (state.gState === ST.OVER) drawOver();
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
  if (state.dev.open) {
    if (devHandleKey(e.code)) { e.preventDefault(); return; }
    if (e.code === "Escape" && state.dev.openCooldown <= 0) { state.dev.open = false; return; }
    return;
  }
  if (state.gState === ST.ABOUT) { state.gState = ST.MENU; return; }

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
  if ((e.code === "Enter" || e.code === "Space") &&
      (state.gState === ST.MENU || state.gState === ST.OVER))
    startGame();
});

document.addEventListener("keyup", (e) => {
  delete state.keys[e.code];
  if (e.code === "Escape") state.dev.escHold = 0;
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
  if ((state.gState === ST.PLAY || state.gState === ST.PAUSE) && _hitDevBtn(p)) {
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

// ── RAF loop ───────────────────────────────────────────────────────────────────
export function startLoop(): void {
  mpAutoJoin();
  startMenuMusic(0);
  (function loop(ts: number): void {
    state._fpsCount++;
    if (ts - state._fpsTs >= 1000) {
      state.fps = state._fpsCount;
      state._fpsCount = 0;
      state._fpsTs = ts;
    }
    update();
    render();
    requestAnimationFrame(loop);
  })(0);
}
