"use strict";

// Tipos que contam como "boss vivo" — usados em múltiplos pontos do jogo
const BOSS_TYPES = ["boss", "prototipo_x", "cemaden_eye", "engrenagem", "cigarra"];

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

// Hordas temáticas por fase — cada fase apresenta novos inimigos gradualmente.
// Fase 1: apenas nuvens e drones. Fase 2: araras e OVNIs noturnos.
// Fase 3: invasão coordenada com helicópteros. Fase 4: caos total.
const WAVE_DEFS = [
  // ── Fase 1: patrulha diurna ──────────────────────────────────────────────
  { name: "Frente Fria da Mantiqueira",    phase: 1, horde: _buildHorde([["cloud",3],["drone",3]]) },
  { name: "Patrulha de Drones DCTA",       phase: 1, horde: _buildHorde([["drone",5],["cloud",2],["arara",2]]) },
  // ── Fase 2: araras + primeira noite com OVNIs ────────────────────────────
  { name: "Bando de Araras Furiosas",      phase: 2, horde: _buildHorde([["arara",5],["drone",3],["cloud",1],["balao",1]]) },
  { name: "Noite dos Discos Voadores",     phase: 2, horde: _buildHorde([["ovni",3],["arara",3],["drone",2],["balao",1]]) },
  // ── Fase 3: invasão coordenada com helicópteros ──────────────────────────
  { name: "Invasão Coordenada",            phase: 3, horde: _buildHorde([["ovni",4],["arara",3],["drone",3],["cloud",1],["helicoptero",2]]) },
  { name: "Tempestade Total",              phase: 3, horde: _buildHorde([["ovni",4],["arara",4],["drone",3],["cloud",2],["helicoptero",2],["balao",2]]) },
  // ── Fase 4: caos total — todos os inimigos ───────────────────────────────
  { name: "Alerta CEMADEN — Nível Máximo", phase: 4, horde: _buildHorde([["ovni",5],["arara",4],["drone",4],["cloud",2],["helicoptero",3],["tanajura",3],["balao",2]]) },
  { name: "Caos Sobre o Vale",             phase: 4, horde: _buildHorde([["ovni",6],["arara",5],["drone",4],["cloud",3],["helicoptero",3],["tanajura",4],["balao",2]]) },
  { name: "Batalha Final do Guardião",     phase: 4, horde: _buildHorde([["ovni",7],["arara",6],["drone",5],["cloud",3],["helicoptero",4],["tanajura",5],["balao",3]]) },
];

// Anuncia uma nova onda: exibe texto, monta a fila de horda embaralhada e troca a música.
function announce(n) {
  const def = WAVE_DEFS[Math.min(n, WAVE_DEFS.length - 1)];
  waveText = `ONDA ${n + 1}: ${def.name.toUpperCase()}`;
  waveT = 200;
  hordeQueue = [...def.horde].sort(() => Math.random() - 0.5); // embaralha para variedade
  hordeSpawnT = 70;
  switchMusicForPhase(n);
  if (def.phase !== currentPhase) currentPhase = def.phase;
  const msg = RADIO_MSGS[`wave_${n}`];
  if (msg) radioSay(msg, 100);
}

// Inicializa uma nova partida: reseta todos os estados globais e começa a onda 0.
function startGame() {
  ensureAC();
  for (const k in keys) delete keys[k];
  diffCfg = DIFFICULTIES[selectedDifficulty];
  HS_KEY = diffCfg.hsKey;
  const pl = PLANES[selectedPlane];
  const totalPts = parseInt(localStorage.getItem(TOTAL_KEY) || "0");
  // usa o avião selecionado apenas se desbloqueado; caso contrário, usa o padrão
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
  off1 = 0; off2 = 0; off3 = 0; offSky = 0;
  radioText = ""; radioT = 0; radioQueue = [];
  grazeCount = 0; cbersMission = null; cbersMissionT = 3800;
  playerStats = { pw: {}, kills: 0, hits: 0, grazes: 0, maxCombo: 1, shotsFired: 0, shotsHit: 0,
    bossKills: 0, shieldBlocks: 0, nearDeathHits: 0, comboKills: 0,
    longestGrazeStreak: 0, wavesWithoutHit: 0, startTime: Date.now() };
  _curGrazeStreak = 0;
  _waveHits = 0;
  ddaStress = 0.5;
  gState = ST.PLAY;
  stopMusic();
  startMusic();
  announce(0);
}

const keys = {};

const JOY_MAX = 82;
const touch = { active: false, vx: 0, vy: 0, cx: 0, cy: 0, kx: 0, ky: 0 };

// Loop de lógica principal — chamado a cada frame pelo requestAnimationFrame.
// Atualiza física, spawns, colisões, power-ups e eventos atmosféricos.
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
  if (gState !== ST.PLAY && gState !== ST.MULTI) return;
  if (gState === ST.MULTI) mpUpdate();

  // radio queue
  if (radioT > 0) radioT--;
  if (radioT === 0 && radioQueue.length > 0) {
    const next = radioQueue[0];
    if (--next.delay <= 0) { radioQueue.shift(); radioText = next.text; radioT = 200; }
  }

  const isNight = dayPhase < 0.26 || dayPhase > 0.84;

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
  // DDA — Flow Theory: stress decai com o tempo; combo alto acelera a recuperação
  ddaStress = Math.max(0, ddaStress - 0.0007);
  if (combo >= 5) ddaStress = Math.max(0, ddaStress - 0.0004);

  const nb = player.update(keys);
  playerStats.shotsFired += nb.length;
  bullets.push(...nb);
  bullets.forEach((b) => b.update());
  bullets = bullets.filter((b) => !b.dead);

  if (player.revap > 0) {
    const revapR = player.revap === REVAP_DUR ? 300 : (player.shield > 0 ? 120 : 80);
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
      playerStats.shotsFired += 2;
    } else {
      bullets.push(new Bullet(player.x + 30, player.y + offY, 0));
      playerStats.shotsFired++;
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
  // cap de partículas para evitar picos de GC em explosões encadeadas
  if (particles.length > 180) particles.length = 180;
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

  if (gState !== ST.MULTI) {
    if (--spawnT <= 0) {
      spawnEnemy();
      const baseSpawnT = diffCfg.spawnBase - waveNum * diffCfg.spawnWaveMult - frame / diffCfg.spawnTimeMult;
      const ddaAdjust = diffCfg.id === "aventura" ? 1 + (ddaStress - 0.5) * 0.40 : 1;
      spawnT = Math.max(diffCfg.spawnMin, baseSpawnT * ddaAdjust);
    }
    if (--collectT <= 0) {
      collectT = 220 + Math.floor(Math.random() * 160);
      collectibles.push(new Collectible(W + 22, 48 + Math.random() * (H - 96)));
    }
    if (!bossAlive && frame > 0 && frame % diffCfg.bossInterval === 0) spawnBoss();
    if (!bossAlive && --ovniEventT <= 0) {
      ovniEventT = 2600 + Math.floor(Math.random() * 1800);
      spawnOvniEvent();
    }
  }
  if (gState !== ST.MULTI && hordeQueue.length > 0 && --hordeSpawnT <= 0) {
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
        playerStats.shotsHit++;
        if (gState === ST.MULTI && e.mpId) {
          const dmg = player && player.boost > 0 && player.shield > 0 ? 2 : 1;
          mpSend({ type: "hit", enemyId: e.mpId, dmg });
          spark(e.x, e.y);
        } else {
          const dmg = player && player.boost > 0 && player.shield > 0 ? 2 : 1;
          const pts = e.hit(dmg);
          if (pts > 0) {
            score += pts * combo;
            floatText(
              `+${pts * combo}${combo > 1 ? " ×" + combo : ""}`,
              e.x, e.y, "#60a5fa",
            );
            combo = Math.min(combo + 1, diffCfg.comboMax);
            comboT = 130;
            playerStats.kills++;
            if (combo >= 3) playerStats.comboKills++;
            if (combo > playerStats.maxCombo) playerStats.maxCombo = combo;
            if (BOSS_TYPES.includes(e.type)) { shakeAmt += 9; playerStats.bossKills++; }
            if (BOSS_TYPES.includes(e.type)) bossAlive = false;
            dropCollectibles(e.x, e.y, e.type);
          }
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
        playerStats.grazes++;
        _curGrazeStreak++;
        if (_curGrazeStreak > playerStats.longestGrazeStreak) playerStats.longestGrazeStreak = _curGrazeStreak;
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
      // Shield relay: check if a nearby partner can absorb the hit
      if (gState === ST.MULTI && player.inv <= 0 && player.bis <= 0 && player.shield <= 0) {
        const relayPartnerId = mpCheckShieldRelay();
        if (relayPartnerId) {
          mpSend({ type: "shield_relay_used", partnerId: relayPartnerId });
          shakeAmt += 4;
          return; // skip tryHit, continue to next bullet
        }
      }
      const h = player.tryHit();
      if (h) {
        playerStats.hits++;
        _waveHits++;
        _curGrazeStreak = 0;
        if (player.lives === 1) playerStats.nearDeathHits++;
        ddaStress = Math.min(1, ddaStress + 0.20);
        shakeAmt += 10;
        combo = 1; comboT = 0;
        if (player.lives <= 0) {
          if (gState === ST.MULTI) { mpSend({ type: "dead" }); mp.localDead = true; }
          else endGame();
        } else if (player.lives === 1) radioSay(RADIO_MSGS.hit_low);
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
          if (BOSS_TYPES.includes(e.type)) bossAlive = false;
        }
        if (player.lives <= 0) {
          if (gState === ST.MULTI) { mpSend({ type: "dead" }); mp.localDead = true; }
          else endGame();
        }
      }
    }
  });

  // coleta de power-ups e itens de pontuação
  collectibles.forEach((c) => {
    if (c.dead) return;
    if (mp.localDead) return;
    if (circ({ x: c.x, y: c.y, r: c.r }, { x: player.x, y: player.y, r: 20 })) {
      c.dead = true;
      if (gState === ST.MULTI && c.mpId) mpSend({ type: "collect", collectibleId: c.mpId });
      sfxCollect();
      if (c.type.pw) playerStats.pw[c.type.id] = (playerStats.pw[c.type.id] ?? 0) + 1;
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
      } else if (c.type.pw === "hp_up") {
        player.lives = Math.min(player.lives + 1, player.maxLives + 2);
        sfxPowerup();
        floatText("❤️ VIDA +1!", player.x, player.y, "#f472b6");
        radioSay("Torre SJC: Reforço recebido! HP restaurado, Guardião!");
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

// Spawna um inimigo avulso conforme a onda atual — reforça o spawn contínuo entre hordas.
// Cada onda tem uma distribuição de probabilidade diferente para introduzir inimigos gradualmente.
function spawnEnemy() {
  const y = 55 + Math.random() * (H - 110);
  const r = Math.random();
  const isNight = dayPhase < 0.26 || dayPhase > 0.84;
  const w = waveNum;

  // Ondas 0-1 (Fase 1): só nuvens e drones — sem OVNIs
  if (w === 0) {
    if (r < 0.52) enemies.push(new Enemy("cloud", W + 85, y));
    else                enemies.push(new Enemy("drone", W + 42, y));
  } else if (w === 1) {
    if      (r < 0.30) enemies.push(new Enemy("cloud", W + 85, y));
    else if (r < 0.75) enemies.push(new Enemy("drone", W + 42, y));
    else                     enemies.push(new Enemy("arara", W + 32, y));
  // Ondas 2-3 (Fase 2): araras dominam; OVNIs apenas à noite a partir da onda 3
  } else if (w === 2) {
    if      (r < 0.18) enemies.push(new Enemy("cloud", W + 85, y));
    else if (r < 0.45) enemies.push(new Enemy("drone", W + 42, y));
    else                     enemies.push(new Enemy("arara", W + 32, y));
  } else if (w === 3) {
    if      (r < 0.15) enemies.push(new Enemy("cloud", W + 85, y));
    else if (r < 0.38) enemies.push(new Enemy("drone", W + 42, y));
    else if (r < 0.68) enemies.push(new Enemy("arara", W + 32, y));
    else if (isNight)        enemies.push(new Enemy("ovni",  W + 55, y));
    else                     enemies.push(new Enemy("drone", W + 42, y));
  // Ondas 4-5 (Fase 3): todos os inimigos comuns + helicópteros
  } else if (w === 4) {
    if      (r < 0.12) enemies.push(new Enemy("cloud",      W + 85, y));
    else if (r < 0.32) enemies.push(new Enemy("drone",      W + 42, y));
    else if (r < 0.58) enemies.push(new Enemy("arara",      W + 32, y));
    else if (r < 0.78) enemies.push(new Enemy("ovni",       W + 55, y));
    else                     enemies.push(new Enemy("helicoptero", W + 60, y));
  } else if (w === 5) {
    if      (r < 0.10) enemies.push(new Enemy("cloud",      W + 85, y));
    else if (r < 0.26) enemies.push(new Enemy("drone",      W + 42, y));
    else if (r < 0.50) enemies.push(new Enemy("arara",      W + 32, y));
    else if (r < 0.74) enemies.push(new Enemy("ovni",       W + 55, y));
    else                     enemies.push(new Enemy("helicoptero", W + 60, y));
    // chance de spawn duplo para aumentar pressão na fase 3
    if (Math.random() < 0.22) {
      const y2 = 55 + Math.random() * (H - 110);
      enemies.push(new Enemy("drone", W + 42 + Math.random() * 60, y2));
    }
  // Ondas 6+ (Fase 4): caos total — todos os tipos incluindo tanajura
  } else {
    if      (r < 0.08) enemies.push(new Enemy("cloud",      W + 85, y));
    else if (r < 0.22) enemies.push(new Enemy("drone",      W + 42, y));
    else if (r < 0.46) enemies.push(new Enemy("arara",      W + 32, y));
    else if (r < 0.68) enemies.push(new Enemy("ovni",       W + 55, y));
    else                     enemies.push(new Enemy("helicoptero", W + 60, y));
    if (Math.random() < 0.30) {
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

// Spawna o próximo chefe da rotação e incrementa waveNum.
function spawnBoss() {
  if (_waveHits === 0 && waveNum > 0) playerStats.wavesWithoutHit++;
  _waveHits = 0;
  bossAlive = true;
  // prototipo_x fica por último: é o mais difícil de matar e ganha velocidade a cada lap
  const BOSS_ROTATION = ["boss", "cemaden_eye", "engrenagem", "cigarra", "prototipo_x"];
  const bossType = BOSS_ROTATION[Math.floor(waveNum) % BOSS_ROTATION.length];
  enemies.push(new Enemy(bossType, W + 200, H / 2));
  waveText = `⚠️ CHEFE: ${BOSS_LABELS[bossType] || bossType.toUpperCase()} ⚠️`;
  waveT = 240;
  sfxBossIn();
  shakeAmt = 14;
  waveNum++;
  radioSay(RADIO_MSGS.boss);
  if (waveNum > diffCfg.doubleBossWave) {
    const second = BOSS_ROTATION[(Math.floor(waveNum) + 2) % BOSS_ROTATION.length];
    setTimeout(() => { if (gState === ST.PLAY) enemies.push(new Enemy(second, W + 300, H / 3)); }, 7000);
  }
}

// Encerra a partida: salva recorde individual, pontuação acumulada e estatísticas da partida.
function endGame() {
  gState = ST.OVER;
  shakeAmt = 0;
  playerStats.timeSurvived = Math.floor((Date.now() - playerStats.startTime) / 1000);
  sfxDestroy();
  stopMusic();
  const prev = parseInt(localStorage.getItem(HS_KEY) || "0");
  if (score > prev) localStorage.setItem(HS_KEY, String(score));
  hiScore = Math.max(score, prev);
  const totalPrev = parseInt(localStorage.getItem(TOTAL_KEY) || "0");
  localStorage.setItem(TOTAL_KEY, String(totalPrev + score));
  // Salva estatísticas da partida para achievements futuros
  const snapshot = {
    score,
    wave: waveNum,
    difficulty: diffCfg.id,
    kills: playerStats.kills,
    hits: playerStats.hits,
    grazes: playerStats.grazes,
    maxCombo: playerStats.maxCombo,
    shotsFired: playerStats.shotsFired,
    shotsHit: playerStats.shotsHit,
    timeSurvived: playerStats.timeSurvived,
    bossKills: playerStats.bossKills,
    shieldBlocks: playerStats.shieldBlocks,
    nearDeathHits: playerStats.nearDeathHits,
    comboKills: playerStats.comboKills,
    longestGrazeStreak: playerStats.longestGrazeStreak,
    wavesWithoutHit: playerStats.wavesWithoutHit,
    pw: { ...playerStats.pw },
    ts: Date.now(),
  };
  localStorage.setItem("sjc_last_stats", JSON.stringify(snapshot));
  // acumula totais de vida para achievements globais
  const totals = JSON.parse(localStorage.getItem("sjc_totals") || "{}");
  totals.kills  = (totals.kills  || 0) + playerStats.kills;
  totals.grazes = (totals.grazes || 0) + playerStats.grazes;
  totals.games  = (totals.games  || 0) + 1;
  localStorage.setItem("sjc_totals", JSON.stringify(totals));
  startMenuMusic(selectedDifficulty);
}

function render() {
  const sx = shakeAmt > 0.5 ? (Math.random() - 0.5) * shakeAmt * 2 : 0;
  const sy = shakeAmt > 0.5 ? (Math.random() - 0.5) * shakeAmt * 2 : 0;
  ctx.clearRect(0, 0, W, H);
  if (gState === ST.MENU)  { drawMenu();  return; }
  if (gState === ST.SOBRE) { drawSobre(); return; }
  if (gState === ST.LOBBY) { drawLobby(); return; }
  ctx.save();
  if (gState === ST.OVER) {
    ctx.filter = "grayscale(1)";
  } else if (shakeAmt > 0.5) {
    ctx.translate(sx, sy);
  }
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
  if (!mp.localDead) player.draw();
  mpDrawAll();
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
  mpDrawHUD();
  if (touch.active) drawJoystick();
  if (gState === ST.PAUSE) drawPause();
  if (gState === ST.OVER) drawOver();
  if (dev.open) drawDevPanel();
  drawDevButton();
}

function drawDevButton() {
  if (gState !== ST.PLAY && gState !== ST.PAUSE && gState !== ST.MULTI) return;
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

  // Lobby controls
  if (gState === ST.LOBBY) {
    if (e.code === "Escape") { mpDisconnect(); gState = ST.MENU; return; }
    if (e.code === "ArrowLeft"  || e.code === "KeyA") {
      selectedPlane = (selectedPlane - 1 + PLANES.length) % PLANES.length;
      mpSend({ type: "ship", planeId: selectedPlane });
      const _lrp = mp.players.get(mp.playerId); if (_lrp) _lrp.planeId = selectedPlane;
      return;
    }
    if (e.code === "ArrowRight" || e.code === "KeyD") {
      selectedPlane = (selectedPlane + 1) % PLANES.length;
      mpSend({ type: "ship", planeId: selectedPlane });
      const _lrp = mp.players.get(mp.playerId); if (_lrp) _lrp.planeId = selectedPlane;
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

  keys[e.code] = true;
  if (e.code === "Escape" || e.code === "KeyP") {
    if (gState === ST.PLAY || gState === ST.MULTI) gState = ST.PAUSE;
    else if (gState === ST.PAUSE) gState = mp.connected && mp.gameStarted ? ST.MULTI : ST.PLAY;
  }
  if (e.code === "KeyM" && gState === ST.PAUSE) {
    mpDisconnect();
    gState = ST.MENU;
    startMenuMusic(selectedDifficulty);
    return;
  }
  if (e.code === "KeyI" && gState === ST.MENU) { gState = ST.SOBRE; return; }
  if (gState === ST.MENU) {
    ensureAC();
    if (!mActive) startMenuMusic(selectedDifficulty);
    if (e.code === "ArrowLeft" || e.code === "KeyA")
      selectedPlane = (selectedPlane - 1 + PLANES.length) % PLANES.length;
    if (e.code === "ArrowRight" || e.code === "KeyD")
      selectedPlane = (selectedPlane + 1) % PLANES.length;
    if (e.code === "ArrowUp" || e.code === "ArrowDown" || e.code === "KeyW" || e.code === "KeyS") {
      selectedDifficulty = (selectedDifficulty + 1) % DIFFICULTIES.length;
      startMenuMusic(selectedDifficulty);
    }
    if (e.code === "KeyM") { ensureAC(); mpConnect(); return; }
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

// MULTIPLAYER button rect in the menu (below difficulty selector)
// Matches the position drawn in renderer.js: psx = W/2-118, mby = dsy+48 = (H/2+90+46)+48 = H/2+184
const _MP_BTN_RECT = { x: W / 2 - 118, y: H / 2 + 184, w: 236, h: 22 };

function _hitMpBtn(p) {
  return p.x >= _MP_BTN_RECT.x && p.x <= _MP_BTN_RECT.x + _MP_BTN_RECT.w &&
         p.y >= _MP_BTN_RECT.y && p.y <= _MP_BTN_RECT.y + _MP_BTN_RECT.h;
}

canvas.addEventListener("click", (e) => {
  const p = toCanvas(e);
  if (gState === ST.MENU) {
    ensureAC();
    if (!mActive) startMenuMusic(selectedDifficulty);
    if (_hitMpBtn(p)) { mpConnect(); return; }
    return;
  }
  if (gState === ST.LOBBY) {
    const action = mpLobbyHit(p);
    if (action === "plane_left")  { selectedPlane = (selectedPlane - 1 + PLANES.length) % PLANES.length; mpSend({ type: "ship", planeId: selectedPlane }); const _lrp = mp.players.get(mp.playerId); if (_lrp) _lrp.planeId = selectedPlane; }
    if (action === "plane_right") { selectedPlane = (selectedPlane + 1) % PLANES.length; mpSend({ type: "ship", planeId: selectedPlane }); const _lrp = mp.players.get(mp.playerId); if (_lrp) _lrp.planeId = selectedPlane; }
    if (action === "start")  mpSend({ type: "start" });
    if (action === "ready")  mpSend({ type: "ready" });
    if (action === "back")   { mpDisconnect(); gState = ST.MENU; }
    if (action === "copy_link") navigator.clipboard?.writeText(mp.shareUrl || "").catch(() => {});
    return;
  }
  if ((gState === ST.PLAY || gState === ST.PAUSE || gState === ST.MULTI) && _hitDevBtn(p)) {
    if (!dev.open) { dev.open = true; dev.openCooldown = 20; }
    else if (dev.openCooldown <= 0) dev.open = false;
  }
});

canvas.addEventListener("touchstart", (e) => {
  e.preventDefault();
  if (gState === ST.SOBRE) { gState = ST.MENU; return; }
  if (gState === ST.LOBBY) {
    const p = toCanvas(e.changedTouches[0]);
    const action = mpLobbyHit(p);
    if (action === "plane_left")  { selectedPlane = (selectedPlane - 1 + PLANES.length) % PLANES.length; mpSend({ type: "ship", planeId: selectedPlane }); }
    if (action === "plane_right") { selectedPlane = (selectedPlane + 1) % PLANES.length; mpSend({ type: "ship", planeId: selectedPlane }); }
    if (action === "start")  mpSend({ type: "start" });
    if (action === "ready")  mpSend({ type: "ready" });
    if (action === "back")   { mpDisconnect(); gState = ST.MENU; }
    return;
  }
  if (gState === ST.MENU || gState === ST.OVER) {
    ensureAC();
    const p = toCanvas(e.changedTouches[0]);
    if (gState === ST.MENU && _hitMpBtn(p)) { mpConnect(); return; }
    startGame(); return;
  }
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

// Contadores de FPS — atualizados a cada segundo
let fps = 0;
let _fpsCount = 0;
let _fpsTs = 0;

(function loop(ts) {
  // calcula FPS a cada 1s
  _fpsCount++;
  if (ts - _fpsTs >= 1000) {
    fps = _fpsCount;
    _fpsCount = 0;
    _fpsTs = ts;
  }
  update();
  render();
  requestAnimationFrame(loop);
})(0);
