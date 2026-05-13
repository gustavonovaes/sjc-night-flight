"use strict";

let _prevTickerState = null;

const RADIO_MSGS = {
  wave_0: "Torre SJC: Frente fria detectada sobre a Dutra. Proteja o Vale!",
  wave_1: "DCTA Controle: Contatos radar múltiplos. Drones hostis confirmados.",
  wave_2: "Torre SJC: Bando de araras-azuis em rota de colisão!",
  wave_3: "FAB 1986: Objetos não identificados na frequência. Situação OVNI.",
  wave_4: "Comandante FAB: Invasão coordenada detectada. Todos os sistemas ativos.",
  wave_5: "CEMADEN: Tempestade de categoria máxima. Evacuação imediata!",
  boss: "Torre SJC: ⚠️ CONTATO DE GRANDE PORTE. Fogo à vontade.",
  ovni: "FAB Radar: Objetos de 19/05/1986 confirmados. Interceptar!",
  collect_avibras: "Avibras: Mísseis ASTROS carregados. Fogo livre!",
  collect_14bis: "ITA: Sistema 14-BIS ativado. Invencibilidade total.",
  hit_low: "Torre SJC: Piloto, último HP! Encontre escudo urgente!",
};
function radioSay(text, delay = 0) {
  if (delay === 0) { radioText = text; radioT = 200; }
  else radioQueue.push({ text, delay });
}

const BOSS_LABELS = {
  boss: "MONSTRO CLIMÁTICO",
  prototipo_x: "PROTÓTIPO X",
  cemaden_eye: "OLHO DO CEMADEN",
  engrenagem: "GRANDE ENGRENAGEM",
  cigarra: "A CIGARRA",
};
function spawnBossType(t) { bossAlive = true; enemies.push(new Enemy(t, W + 200, H / 2)); }

function _buildHorde(spec) {
  const arr = [];
  for (const [type, n] of spec) {
    for (let i = 0; i < n; i++) arr.push({ type });
  }
  return arr;
}

const WAVE_DEFS = [
  { name: "Frente Fria da Mantiqueira",    phase: 1, horde: _buildHorde([["cloud",3],["drone",4],["tanajura",3]]) },
  { name: "Patrulha de Drones DCTA",       phase: 1, horde: _buildHorde([["drone",5],["cloud",2],["arara",3],["tanajura",4]]) },
  { name: "Bando de Araras Furiosas",      phase: 2, horde: _buildHorde([["arara",6],["drone",4],["cloud",2],["balao",2],["tanajura",4]]) },
  { name: "Noite dos Discos Voadores",     phase: 2, horde: _buildHorde([["ovni",4],["arara",4],["drone",3],["cloud",1],["balao",2]]) },
  { name: "Invasão Coordenada",            phase: 3, horde: _buildHorde([["ovni",5],["arara",4],["drone",4],["cloud",2],["helicoptero",2],["tanajura",5]]) },
  { name: "Tempestade Total",              phase: 3, horde: _buildHorde([["ovni",5],["arara",5],["drone",4],["cloud",3],["helicoptero",3],["balao",3]]) },
  { name: "Alerta CEMADEN — Nível Máximo", phase: 4, horde: _buildHorde([["ovni",6],["arara",6],["drone",5],["cloud",3],["helicoptero",4],["tanajura",6],["balao",2]]) },
  { name: "Caos Sobre o Vale",             phase: 4, horde: _buildHorde([["ovni",7],["arara",6],["drone",5],["cloud",4],["helicoptero",4],["tanajura",7],["balao",3]]) },
  { name: "Batalha Final do Guardião",     phase: 4, horde: _buildHorde([["ovni",8],["arara",7],["drone",6],["cloud",4],["helicoptero",5],["tanajura",8],["balao",4]]) },
];

function announce(n) {
  const def = WAVE_DEFS[Math.min(n, WAVE_DEFS.length - 1)];
  waveText = `ONDA ${n + 1}: ${def.name.toUpperCase()}`;
  waveT = 200;
  hordeQueue = [...def.horde].sort(() => Math.random() - 0.5);
  hordeSpawnT = 70;
  switchMusicForPhase(n);
  if (def.phase !== currentPhase) {
    currentPhase = def.phase;
  }
  const msg = RADIO_MSGS[`wave_${n}`];
  if (msg) radioSay(msg, 100);
}

function startGame() {
  ensureAC();
  const pl = PLANES[selectedPlane];
  const totalPts = parseInt(localStorage.getItem(TOTAL_KEY) || "0");
  player = new Player(totalPts >= pl.unlock ? pl : PLANES[0]);
  bullets = [];
  enemies = [];
  eBullets = [];
  collectibles = [];
  particles = [];
  floaters = [];
  frame = 0;
  score = 0;
  combo = 1;
  comboT = 0;
  hiScore = parseInt(localStorage.getItem(HS_KEY) || "0");
  scrollSpd = 2;
  spawnT = 180;
  collectT = 100;
  shakeAmt = 0;
  bossAlive = false;
  waveNum = 0;
  ovniEventT = 2200;
  hordeQueue = [];
  hordeSpawnT = 0;
  currentPhase = 0;
  playlistIdx = 6;
  off1 = 0;
  off2 = 0;
  off3 = 0;
  offSky = 0;
  radioText = ""; radioT = 0; radioQueue = [];
  windX = 0; windTimer = 1800; lightningT = 0;
  grazeCount = 0; cbersMission = null; cbersMissionT = 3800;
  gState = ST.PLAY;
  startMusic();
  announce(0);
}

const keys = {};

const JOY_MAX = 82;
const touch = { active: false, vx: 0, vy: 0, cx: 0, cy: 0, kx: 0, ky: 0 };

function update() {
  frame++;
  if (dev.openCooldown > 0) dev.openCooldown--;
  if (keys["Escape"] && !dev.open) {
    dev.escHold++;
    if (dev.escHold === 240) { dev.open = true; dev.escHold = 0; dev.openCooldown = 60; }
  }
  const activeScene = DEV_SCENES[dev.selectedScene];
  if (!activeScene || activeScene.phase < 0) {
    dayPhase = (dayPhase + 0.000034 * dev.daySpeed) % 1;
  }
  if (gState !== ST.PLAY) return;

  // radio queue
  if (radioT > 0) radioT--;
  if (radioT === 0 && radioQueue.length > 0) {
    const next = radioQueue[0];
    if (--next.delay <= 0) { radioQueue.shift(); radioText = next.text; radioT = 200; }
  }

  // wind
  if (--windTimer <= 0) {
    windX = (Math.random() - 0.5) * 0.65;
    windTimer = 1400 + Math.floor(Math.random() * 1200);
    setTimeout(() => { windX = 0; }, 9000);
  }
  if (player) player.vx += windX * 0.1;

  // lightning at night
  const isNight = dayPhase < 0.26 || dayPhase > 0.84;
  if (isNight && lightningT <= 0 && Math.random() < 0.0006) {
    lightningT = 3;
    shakeAmt += 4;
  }
  if (lightningT > 0) lightningT--;

  scrollSpd = 2 + frame / 2200;
  off1 = (off1 + scrollSpd * 0.18) % (MT1.length * (W / MT1.length));
  off2 = (off2 + scrollSpd * 0.42) % (MT2.length * (W / MT2.length));
  off3 = (off3 + scrollSpd * 0.72) % (MT3.length * (W / MT3.length));
  offSky = (offSky + scrollSpd) % (W * 3 + 500);
  STARS.forEach((s) => {
    s.x -= s.spd;
    if (s.x < 0) s.x = W;
    s.tw += 0.04;
  });
  shakeAmt *= 0.84;
  if (comboT > 0 && --comboT === 0) combo = 1;
  if (waveT > 0) waveT--;

  const nb = player.update(keys);
  bullets.push(...nb);
  bullets.forEach((b) => b.update());
  bullets = bullets.filter((b) => !b.dead);

  if (player.revap > 0) {
    const revapR = player.revap === REVAP_DUR ? 300 : 80;
    eBullets = eBullets.filter(b => {
      const dx = b.x - player.x, dy = b.y - player.y;
      if (dx * dx + dy * dy < revapR * revapR) {
        explode(b.x, b.y, "#bfdbfe", 3);
        return false;
      }
      return true;
    });
  }

  if (player.inpe > 0) {
    collectibles.forEach(c => {
      const dx = player.x - c.x, dy = player.y - c.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      if (dist < 220) {
        c.x += (dx / dist) * 3.5;
        c.y += (dy / dist) * 3.5;
      }
    });
  }

  if (player.ericsson > 0 && player.fireT === 1) {
    const offY = 38;
    if (player.boost > 0) {
      bullets.push(new Bullet(player.x + 30, player.y + offY, -0.18));
      bullets.push(new Bullet(player.x + 30, player.y + offY,  0.18));
    } else {
      bullets.push(new Bullet(player.x + 30, player.y + offY, 0));
    }
  }

  eBullets.forEach((b) => b.update());
  eBullets = eBullets.filter((b) => !b.dead);
  const newEB = [];
  enemies.forEach((e) => {
    const r = e.update();
    if (!dev.noProj) newEB.push(...r);
  });
  eBullets.push(...newEB);
  enemies = enemies.filter((e) => !e.dead);
  collectibles.forEach((c) => c.update());
  collectibles = collectibles.filter((c) => !c.dead);
  particles.forEach((p) => {
    p.x += p.vx;
    p.y += p.vy;
    p.vx *= 0.91;
    p.vy *= 0.91;
    p.life -= 0.028;
  });
  particles = particles.filter((p) => p.life > 0);
  floaters.forEach((f) => {
    f.y += f.vy;
    f.life -= 0.022;
  });
  floaters = floaters.filter((f) => f.life > 0);

  if (--spawnT <= 0) {
    spawnEnemy();
    // gradual: começa lento e acelera com o tempo e as waves
    spawnT = Math.max(22, 120 - waveNum * 8 - frame / 180);
  }
  if (--collectT <= 0) {
    collectT = 95 + Math.floor(Math.random() * 85);
    collectibles.push(new Collectible(W + 22, 48 + Math.random() * (H - 96)));
  }
  if (!bossAlive && frame > 0 && frame % 1800 === 0) {
    spawnBoss();
  }
  if (!bossAlive && --ovniEventT <= 0) {
    ovniEventT = 2600 + Math.floor(Math.random() * 1800);
    spawnOvniEvent();
  }
  if (hordeQueue.length > 0 && --hordeSpawnT <= 0) {
    const h = hordeQueue.shift();
    const hy = 55 + Math.random() * (H - 110);
    enemies.push(new Enemy(h.type, W + 42 + Math.random() * 60, hy));
    hordeSpawnT = 14;
  }

  // CBERS mission
  if (--cbersMissionT <= 0 && !cbersMission) {
    cbersMission = { x: W + 40, y: 55 + Math.random() * (H * 0.4), hp: 3, bonus: 800 };
    waveText = "🛰️ MISSÃO: Escorte o Satélite CBERS-4!";
    waveT = 160;
    radioSay("INPE: Satélite CBERS em rota. Proteja a missão!");
  }
  if (cbersMission) {
    cbersMission.x -= 1.4;
    let cbersHit = false;
    enemies.forEach(e => {
      if (!e.dead && circ(e.hb(), { x: cbersMission.x, y: cbersMission.y, r: 14 })) {
        if (--cbersMission.hp <= 0) cbersHit = true;
      }
    });
    if (cbersHit) {
      explode(cbersMission.x, cbersMission.y, "#ef4444", 10);
      floatText("🛰️ MISSÃO FALHOU", W / 2, H / 2 - 30, "#ef4444");
      cbersMission = null; cbersMissionT = 5400;
    } else if (cbersMission && cbersMission.x < -30) {
      score += cbersMission.bonus;
      floatText(`🛰️ CBERS SEGURO! +${cbersMission.bonus}`, W / 2, H / 2 - 30, "#34d399");
      sfxPowerup();
      cbersMission = null; cbersMissionT = 5400;
    }
  }

  bullets.forEach((b) => {
    enemies.forEach((e) => {
      if (b.dead || e.dead) return;
      if (circ({ x: b.x, y: b.y, r: b.r }, e.hb())) {
        b.dead = true;
        const pts = e.hit();
        if (pts > 0) {
          score += pts * combo;
          floatText(
            `+${pts * combo}${combo > 1 ? " ×" + combo : ""}`,
            e.x,
            e.y,
            "#60a5fa",
          );
          combo = Math.min(combo + 1, 10);
          comboT = 130;
          const _bossTypes = ["boss","prototipo_x","cemaden_eye","engrenagem","cigarra"];
          if (_bossTypes.includes(e.type)) shakeAmt += 9;
          if (_bossTypes.includes(e.type)) bossAlive = false;
          dropCollectibles(e.x, e.y, e.type);
        }
      }
    });
  });

  // grazing
  const GRAZE_R = 22;
  if (player.inv <= 0 && player.bis <= 0) {
    eBullets.forEach(b => {
      if (b.dead || b.grazed) return;
      const dx = b.x - player.x, dy = b.y - player.y;
      const d2 = dx * dx + dy * dy;
      if (d2 < GRAZE_R * GRAZE_R && d2 > 14 * 14) {
        b.grazed = true;
        const pts = 6 * combo;
        score += pts;
        grazeCount++;
        floatText(`✦ ${pts}`, player.x, player.y - 18, "#fde68a");
        if (player.avibras > 0) player.missileT = Math.max(0, player.missileT - 14);
      }
    });
  }

  eBullets.forEach((b) => {
    if (b.dead) return;
    // orbital shield intercept
    if (player.ericsson > 0) {
      const angle = (frame * 0.09) % (Math.PI * 2);
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
      const h = player.tryHit();
      if (h) {
        shakeAmt += 10;
        combo = 1;
        comboT = 0;
        if (player.lives <= 0) endGame();
        else if (player.lives === 1) radioSay(RADIO_MSGS.hit_low);
      }
    }
  });

  enemies.forEach((e) => {
    if (e.dead) return;
    if (circ(e.hb(), { x: player.x, y: player.y, r: 13 })) {
      const h = player.tryHit();
      if (h) {
        shakeAmt += 8;
        combo = 1;
        comboT = 0;
        e.hp -= 2;
        if (e.hp <= 0 && !e.dead) {
          e.dead = true;
          if (["boss","prototipo_x","cemaden_eye","engrenagem","cigarra"].includes(e.type)) bossAlive = false;
        }
        if (player.lives <= 0) endGame();
      }
    }
  });

  collectibles.forEach((c) => {
    if (c.dead) return;
    if (circ({ x: c.x, y: c.y, r: c.r }, { x: player.x, y: player.y, r: 20 })) {
      c.dead = true;
      sfxCollect();
      if (c.type.pw === "shield") {
        player.shield = Math.min(player.shield + SHIELD_DUR, SHIELD_DUR * 3);
        sfxPowerup();
        floatText("🛡️ ESCUDO!", player.x, player.y, "#34d399");
      } else if (c.type.pw === "boost") {
        player.boost = Math.min(player.boost + BOOST_DUR, BOOST_DUR * 3);
        sfxPowerup();
        floatText("⚡ BOOST!", player.x, player.y, "#fb923c");
      } else if (c.type.pw === "14bis") {
        player.bis = BIS_DUR;
        sfxPowerup();
        floatText("🛩️ 14-BIS!", player.x, player.y, "#ffd700");
        radioSay(RADIO_MSGS.collect_14bis);
      } else if (c.type.pw === "avibras") {
        player.avibras = Math.min(player.avibras + AVIBRAS_DUR, AVIBRAS_DUR * 2);
        player.missileT = 0;
        sfxPowerup();
        floatText("🚀 PULSO AVIBRAS!", player.x, player.y, "#f97316");
        radioSay(RADIO_MSGS.collect_avibras);
      } else if (c.type.pw === "inpe_sat") {
        player.inpe = Math.min(player.inpe + INPE_DUR, INPE_DUR * 2);
        sfxPowerup();
        floatText("📡 SATÉLITE INPE!", player.x, player.y, "#60a5fa");
      } else if (c.type.pw === "revap") {
        player.revap = REVAP_DUR;
        sfxPowerup();
        floatText("❄️ REVAP SHOCK!", player.x, player.y, "#bfdbfe");
      } else if (c.type.pw === "delta") {
        player.delta = Math.min(player.delta + DELTA_DUR, DELTA_DUR * 2);
        sfxPowerup();
        floatText("🪂 ASA DELTA!", player.x, player.y, "#a78bfa");
      } else if (c.type.pw === "ericsson") {
        player.ericsson = Math.min(player.ericsson + ERICSSON_DUR, ERICSSON_DUR * 2);
        sfxPowerup();
        floatText("📶 WINGMAN 5G!", player.x, player.y, "#818cf8");
      } else {
        score += c.type.pts * combo;
        floatText(
          `${c.type.icon} +${c.type.pts * combo}`,
          c.x,
          c.y,
          c.type.col,
        );
      }
    }
  });
}

function spawnEnemy() {
  const y = 55 + Math.random() * (H - 110);
  const r = Math.random();
  const isNight = dayPhase < 0.26 || dayPhase > 0.84;
  const w = waveNum;

  if (w === 0) {
    if (r < 0.52) enemies.push(new Enemy("cloud", W + 85, y));
    else           enemies.push(new Enemy("drone", W + 42, y));
  } else if (w === 1) {
    if      (r < 0.30) enemies.push(new Enemy("cloud", W + 85, y));
    else if (r < 0.75) enemies.push(new Enemy("drone", W + 42, y));
    else               enemies.push(new Enemy("arara", W + 32, y));
  } else if (w === 2) {
    if      (r < 0.18) enemies.push(new Enemy("cloud", W + 85, y));
    else if (r < 0.45) enemies.push(new Enemy("drone", W + 42, y));
    else               enemies.push(new Enemy("arara", W + 32, y));
  } else if (w === 3) {
    if      (r < 0.15) enemies.push(new Enemy("cloud", W + 85, y));
    else if (r < 0.38) enemies.push(new Enemy("drone", W + 42, y));
    else if (r < 0.68) enemies.push(new Enemy("arara", W + 32, y));
    else if (isNight)  enemies.push(new Enemy("ovni",  W + 55, y));
    else               enemies.push(new Enemy("drone", W + 42, y));
  } else if (w === 4) {
    if      (r < 0.12) enemies.push(new Enemy("cloud", W + 85, y));
    else if (r < 0.35) enemies.push(new Enemy("drone", W + 42, y));
    else if (r < 0.62) enemies.push(new Enemy("arara", W + 32, y));
    else if (r < 0.82) enemies.push(new Enemy("ovni",  W + 55, y));
    else               enemies.push(new Enemy("drone", W + 42, y));
  } else if (w === 5) {
    if      (r < 0.10) enemies.push(new Enemy("cloud", W + 85, y));
    else if (r < 0.28) enemies.push(new Enemy("drone", W + 42, y));
    else if (r < 0.55) enemies.push(new Enemy("arara", W + 32, y));
    else               enemies.push(new Enemy("ovni",  W + 55, y));
    if (Math.random() < 0.25) {
      const y2 = 55 + Math.random() * (H - 110);
      enemies.push(new Enemy("drone", W + 42 + Math.random() * 60, y2));
    }
  } else {
    if      (r < 0.08) enemies.push(new Enemy("cloud", W + 85, y));
    else if (r < 0.24) enemies.push(new Enemy("drone", W + 42, y));
    else if (r < 0.50) enemies.push(new Enemy("arara", W + 32, y));
    else               enemies.push(new Enemy("ovni",  W + 55, y));
    if (Math.random() < 0.35) {
      const y2 = 55 + Math.random() * (H - 110);
      const extraType = isNight && Math.random() < 0.5 ? "ovni" : "arara";
      enemies.push(new Enemy(extraType, W + 60 + Math.random() * 80, y2));
    }
  }
}

function spawnOvniEvent() {
  if (!(dayPhase < 0.26 || dayPhase > 0.84)) { ovniEventT = 600; return; }
  waveText = "🛸 INCIDENTE 19/05/1986 — DISCOS VOADORES! 🛸";
  waveT = 230;
  sfxBossIn();
  shakeAmt = 8;
  radioSay(RADIO_MSGS.ovni);
  const n = 3 + Math.floor(Math.random() * 3);
  for (let i = 0; i < n; i++) {
    const delay = i * 420;
    setTimeout(() => {
      if (gState === ST.PLAY)
        enemies.push(new Enemy("ovni", W + 50 + i * 60, 50 + Math.random() * (H * 0.52)));
    }, delay);
  }
}

function spawnBoss() {
  bossAlive = true;
  const BOSS_ROTATION = ["boss", "prototipo_x", "cemaden_eye", "engrenagem", "cigarra"];
  const bossType = BOSS_ROTATION[Math.floor(waveNum) % BOSS_ROTATION.length];
  enemies.push(new Enemy(bossType, W + 200, H / 2));
  waveText = `⚠️ CHEFE: ${BOSS_LABELS[bossType] || bossType.toUpperCase()} ⚠️`;
  waveT = 240;
  sfxBossIn();
  shakeAmt = 14;
  waveNum++;
  radioSay(RADIO_MSGS.boss);
  if (waveNum > 8) {
    const second = BOSS_ROTATION[(Math.floor(waveNum) + 2) % BOSS_ROTATION.length];
    setTimeout(() => { if (gState === ST.PLAY) enemies.push(new Enemy(second, W + 300, H / 3)); }, 4000);
  }
}

function endGame() {
  gState = ST.OVER;
  stopMusic();
  const prev = parseInt(localStorage.getItem(HS_KEY) || "0");
  if (score > prev) localStorage.setItem(HS_KEY, String(score));
  hiScore = Math.max(score, prev);
  const totalPrev = parseInt(localStorage.getItem(TOTAL_KEY) || "0");
  localStorage.setItem(TOTAL_KEY, String(totalPrev + score));
}

function render() {
  if (gState !== _prevTickerState) {
    _prevTickerState = gState;
    const t = document.getElementById("ticker");
    if (t) t.style.display = gState === ST.MENU ? "" : "none";
  }
  const sx = shakeAmt > 0.5 ? (Math.random() - 0.5) * shakeAmt * 2 : 0;
  const sy = shakeAmt > 0.5 ? (Math.random() - 0.5) * shakeAmt * 2 : 0;
  ctx.clearRect(0, 0, W, H);
  if (gState === ST.MENU) { drawMenu(); return; }
  if (gState === ST.SOBRE) { drawSobre(); return; }
  ctx.save();
  if (shakeAmt > 0.5) ctx.translate(sx, sy);
  drawBg();
  collectibles.forEach((c) => c.draw());
  if (cbersMission) {
    ctx.save();
    ctx.translate(cbersMission.x, cbersMission.y);
    ctx.fillStyle = "#60a5fa"; ctx.shadowColor = "#60a5fa"; ctx.shadowBlur = 12;
    ctx.fillRect(-8, -5, 16, 10);
    ctx.fillStyle = "#bfdbfe";
    ctx.fillRect(-22, -3, 12, 6);
    ctx.fillRect(10, -3, 12, 6);
    ctx.shadowBlur = 0;
    ctx.restore();
  }
  enemies.forEach((e) => e.draw());
  eBullets.forEach((b) => b.draw());
  bullets.forEach((b) => b.draw());
  particles.forEach((p) => {
    ctx.globalAlpha = p.life;
    ctx.fillStyle = p.col;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalAlpha = 1;
  player.draw();
  floaters.forEach((f) => {
    ctx.globalAlpha = f.life;
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
  if (touch.active) drawJoystick();
  if (gState === ST.PAUSE) drawPause();
  if (gState === ST.OVER) drawOver();
  if (dev.open) drawDevPanel();
  drawDevButton();
}

function drawDevButton() {
  if (gState !== ST.PLAY && gState !== ST.PAUSE) return;
  const { x, y, w, h } = DEV_BTN;
  ctx.save();
  ctx.fillStyle = dev.open ? "rgba(0,255,136,0.18)" : "rgba(0,12,4,0.78)";
  ctx.strokeStyle = dev.open ? "#00ff88" : "rgba(0,255,136,0.55)";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(x, y, w, h, 4);
  else ctx.rect(x, y, w, h);
  ctx.fill(); ctx.stroke();
  ctx.fillStyle = dev.open ? "#00ff88" : "#4ade80";
  ctx.font = "bold 9px monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("⚙ DEV", x + w / 2, y + h / 2);
  ctx.textBaseline = "alphabetic";
  ctx.restore();
}

function drawJoystick() {
  const { cx, cy, kx, ky } = touch;
  let dx = kx - cx;
  let dy = ky - cy;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len > JOY_MAX) { dx = (dx / len) * JOY_MAX; dy = (dy / len) * JOY_MAX; }
  ctx.save();
  ctx.globalAlpha = 0.28;
  ctx.strokeStyle = "#60a5fa";
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(cx, cy, JOY_MAX, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = 0.55;
  ctx.fillStyle = "#3b82f6";
  ctx.beginPath();
  ctx.arc(cx + dx, cy + dy, 26, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 0.8;
  ctx.strokeStyle = "#93c5fd";
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();
}

function toCanvas(t) {
  const r = canvas.getBoundingClientRect();
  return {
    x: ((t.clientX - r.left) / r.width) * W,
    y: ((t.clientY - r.top) / r.height) * H,
  };
}

function _hitDevBtn(p) {
  return p.x >= DEV_BTN.x && p.x <= DEV_BTN.x + DEV_BTN.w &&
         p.y >= DEV_BTN.y && p.y <= DEV_BTN.y + DEV_BTN.h;
}

document.addEventListener("keydown", (e) => {
  if (dev.open) {
    if (devHandleKey(e.code)) { e.preventDefault(); return; }
    if (e.code === "Escape" && dev.openCooldown <= 0) { dev.open = false; return; }
    return;
  }
  if (gState === ST.SOBRE) { gState = ST.MENU; return; }
  keys[e.code] = true;
  if (e.code === "Escape" || e.code === "KeyP") {
    if (gState === ST.PLAY) gState = ST.PAUSE;
    else if (gState === ST.PAUSE) gState = ST.PLAY;
  }
  if (e.code === "KeyM" && gState === ST.PAUSE) {
    stopMusic();
    gState = ST.MENU;
    return;
  }
  if (e.code === "KeyI" && gState === ST.MENU) { gState = ST.SOBRE; return; }
  if (gState === ST.MENU) {
    if (e.code === "ArrowLeft" || e.code === "KeyA")
      selectedPlane = (selectedPlane - 1 + PLANES.length) % PLANES.length;
    if (e.code === "ArrowRight" || e.code === "KeyD")
      selectedPlane = (selectedPlane + 1) % PLANES.length;
  }
  if (
    (e.code === "Enter" || e.code === "Space") &&
    (gState === ST.MENU || gState === ST.OVER)
  )
    startGame();
});

document.addEventListener("keyup", (e) => {
  delete keys[e.code];
  if (e.code === "Escape") dev.escHold = 0;
});

canvas.addEventListener("click", (e) => {
  const p = toCanvas(e);
  if ((gState === ST.PLAY || gState === ST.PAUSE) && _hitDevBtn(p)) {
    if (!dev.open) { dev.open = true; dev.openCooldown = 20; }
    else if (dev.openCooldown <= 0) dev.open = false;
  }
});

canvas.addEventListener("touchstart", (e) => {
  e.preventDefault();
  if (gState === ST.SOBRE) { gState = ST.MENU; return; }
  if (gState === ST.MENU || gState === ST.OVER) { ensureAC(); startGame(); return; }
  const p = toCanvas(e.changedTouches[0]);
  if ((gState === ST.PLAY || gState === ST.PAUSE) && _hitDevBtn(p)) {
    if (!dev.open) { dev.open = true; dev.openCooldown = 20; }
    else if (dev.openCooldown <= 0) dev.open = false;
    return;
  }
  if (dev.open) {
    const hit = devItemRects.find(r => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h);
    if (hit) {
      const item = DEV_ITEMS[hit.i];
      if (item && item.type !== "header") {
        dev.cursor = hit.i;
        if (item.type === "toggle") item.set(!item.get());
        else item.run();
      }
      return;
    }
    dev.open = false;
    return;
  }
  if (gState === ST.PAUSE) { gState = ST.PLAY; return; }
  touch.active = true;
  touch.cx = p.x; touch.cy = p.y;
  touch.kx = p.x; touch.ky = p.y;
  touch.vx = 0; touch.vy = 0;
}, { passive: false });

canvas.addEventListener("touchmove", (e) => {
  e.preventDefault();
  if (!touch.active) return;
  const p = toCanvas(e.changedTouches[0]);
  touch.kx = p.x; touch.ky = p.y;
  let dx = p.x - touch.cx;
  let dy = p.y - touch.cy;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  const clamped = Math.min(len, JOY_MAX);
  touch.vx = (dx / len) * (clamped / JOY_MAX);
  touch.vy = (dy / len) * (clamped / JOY_MAX);
}, { passive: false });

canvas.addEventListener("touchend", (e) => {
  e.preventDefault();
  touch.active = false;
  touch.vx = 0; touch.vy = 0;
}, { passive: false });

document.getElementById("btn-pause-mobile")?.addEventListener("click", () => {
  if (gState === ST.PLAY) gState = ST.PAUSE;
  else if (gState === ST.PAUSE) gState = ST.PLAY;
});

(function loop() {
  update();
  render();
  requestAnimationFrame(loop);
})();
