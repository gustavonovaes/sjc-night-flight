"use strict";
// SJC Night Flight — módulo multiplayer cliente
// WebSocket, lobby, jogadores remotos, mecânicas co-op.

const MP_COLORS = ["#60a5fa", "#f472b6", "#34d399", "#fbbf24"];

const mp = {
  ws:           null,
  lobbyId:      null,
  playerId:     null,
  isHost:       false,
  shareUrl:     null,
  connected:    false,
  error:        null,
  localDead:    false,

  // Lobby
  players: new Map(),   // id → RemotePlayer

  // Game state
  enemies:      new Map(), // mpId → {id,type,x,y,hp}
  collectibles: new Map(), // mpId → {id,ctype,x,y}
  sosItems:     new Map(), // mpId → {id,x,y,deadId,life,maxLife}

  // Co-op state
  formationActive:  false,
  formationPlayers: [],
  bossTargetId:     null, // boss mpId targeting local player

  shieldRelayActive: false,
  shieldRelayT:      0,
  lastSentBuffs:     null,
};

// ── RemotePlayer ──────────────────────────────────────────────────────────────
class RemotePlayer {
  constructor(id, planeId, color) {
    this.id      = id;
    this.planeId = planeId;
    this.color   = color;
    this.name    = "Piloto";
    this.ready   = false;
    this.host    = false;
    this.dead    = false;
    this.lives   = 3;
    this.buffs   = {};
    // Interpolation
    this.snapshots  = [];
    this.displayX   = 110;
    this.displayY   = H / 2;
    this.displayTilt = 0;
    this.x = 110; this.y = H / 2;
    this.vx = 0;  this.vy = 0;
    this.tilt = 0;
  }

  addSnapshot(data) {
    this.snapshots.push({ x: data.x, y: data.y, vx: data.vx || 0, vy: data.vy || 0, tilt: data.tilt || 0, ts: performance.now() });
    if (this.snapshots.length > 8) this.snapshots.shift();
    this.x = data.x; this.y = data.y;
    this.vx = data.vx || 0; this.vy = data.vy || 0;
    this.tilt = data.tilt || 0;
    if (data.lives !== undefined) this.lives = data.lives;
    if (data.dead  !== undefined) this.dead  = data.dead;
    if (data.buffs) this.buffs = data.buffs;
  }

  interpolate() {
    const now   = performance.now() - 100;
    const snaps = this.snapshots;
    if (snaps.length === 0) {
      this.displayX += this.vx; this.displayY += this.vy; return;
    }
    if (snaps.length === 1) {
      this.displayX = snaps[0].x; this.displayY = snaps[0].y; this.displayTilt = snaps[0].tilt; return;
    }
    let a = snaps[0], b = snaps[snaps.length - 1];
    for (let i = 0; i < snaps.length - 1; i++) {
      if (snaps[i].ts <= now && snaps[i + 1].ts >= now) { a = snaps[i]; b = snaps[i + 1]; break; }
    }
    if (b.ts === a.ts) { this.displayX = b.x; this.displayY = b.y; this.displayTilt = b.tilt; return; }
    const t = Math.max(0, Math.min(1, (now - a.ts) / (b.ts - a.ts)));
    this.displayX    = a.x + (b.x - a.x) * t;
    this.displayY    = a.y + (b.y - a.y) * t;
    this.displayTilt = a.tilt + (b.tilt - a.tilt) * t;
  }

  draw() {
    if (this.dead) return;
    this.interpolate();
    ctx.save();
    ctx.translate(this.displayX, this.displayY);
    ctx.rotate(this.displayTilt);
    _drawRemotePlane(this.planeId, this.color);
    ctx.restore();

    // Color marker dot
    ctx.fillStyle = this.color;
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 5;
    ctx.beginPath();
    ctx.arc(this.displayX, this.displayY - 22, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Lives dots
    for (let i = 0; i < this.lives; i++) {
      const lx = this.displayX - (this.lives - 1) * 4 + i * 8;
      ctx.globalAlpha = 0.7;
      ctx.fillStyle   = this.color;
      ctx.beginPath(); ctx.arc(lx, this.displayY + 24, 2.5, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
}

function _drawRemotePlane(planeId, color) {
  ctx.globalAlpha  = 0.88;
  ctx.fillStyle    = color;
  ctx.shadowColor  = color;
  ctx.shadowBlur   = 7;
  if (planeId === 1) { // E2
    ctx.beginPath(); ctx.ellipse(0, 0, 26, 5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-8, 0); ctx.lineTo(-22, -11); ctx.lineTo(-26, 0); ctx.fill();
  } else if (planeId === 2) { // C390
    ctx.beginPath(); ctx.ellipse(0, 0, 21, 7, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-5, -7); ctx.lineTo(-19, -17); ctx.lineTo(-23, -7); ctx.fill();
  } else { // Tucano
    ctx.beginPath(); ctx.ellipse(0, 0, 18, 4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-3, -4); ctx.lineTo(-16, -13); ctx.lineTo(-19, -4); ctx.fill();
  }
  ctx.shadowBlur  = 0;
  ctx.globalAlpha = 1;
}

// ── WebSocket ─────────────────────────────────────────────────────────────────
function mpConnect(lobbyId) {
  if (mp.ws && mp.ws.readyState < 2) mp.ws.close();
  const proto = location.protocol === "https:" ? "wss:" : "ws:";
  mp.ws = new WebSocket(`${proto}//${location.host}`);
  mp.ws.onopen    = () => {
    mp.connected = true;
    mp.ws.send(JSON.stringify({ type: "join", lobbyId: lobbyId || undefined }));
  };
  mp.ws.onmessage = (e) => { try { mpHandleMessage(JSON.parse(e.data)); } catch (err) { console.error("mp msg:", err); } };
  mp.ws.onerror   = ()  => { mp.error = "Falha na conexão WebSocket"; };
  mp.ws.onclose   = ()  => {
    mp.connected = false;
    if (gState === ST.LOBBY || gState === ST.MULTI) gState = ST.MENU;
  };
}

function mpDisconnect() {
  if (mp.ws) { mp.ws.close(); mp.ws = null; }
  mp.connected = false; mp.localDead = false; mp.gameStarted = false;
}

function mpSend(obj) {
  if (mp.ws && mp.ws.readyState === 1) mp.ws.send(JSON.stringify(obj));
}

// ── Message handler ───────────────────────────────────────────────────────────
function mpHandleMessage(msg) {
  switch (msg.type) {
    case "joined": {
      mp.playerId = msg.playerId;
      mp.lobbyId  = msg.lobbyId;
      mp.isHost   = msg.isHost;
      mp.shareUrl = msg.shareUrl;
      mp.error    = null;
      mp.players.clear();
      msg.players.forEach((p, i) => {
        const rp = new RemotePlayer(p.id, p.planeId, MP_COLORS[i % MP_COLORS.length]);
        rp.ready = p.ready; rp.host = p.host; rp.name = p.name;
        mp.players.set(p.id, rp);
      });
      gState = ST.LOBBY;
      break;
    }
    case "player_join": {
      const idx = mp.players.size;
      const rp  = new RemotePlayer(msg.id, msg.planeId || 0, MP_COLORS[idx % MP_COLORS.length]);
      rp.name = msg.name;
      mp.players.set(msg.id, rp);
      break;
    }
    case "player_leave": {
      mp.players.delete(msg.id);
      break;
    }
    case "player_ship": {
      const rp = mp.players.get(msg.id);
      if (rp) rp.planeId = msg.planeId;
      // Sync local selection if it's our player
      if (msg.id === mp.playerId) selectedPlane = msg.planeId;
      break;
    }
    case "player_ready": {
      const rp = mp.players.get(msg.id);
      if (rp) rp.ready = msg.ready;
      break;
    }
    case "new_host": {
      if (msg.id === mp.playerId) mp.isHost = true;
      const rp = mp.players.get(msg.id);
      if (rp) rp.host = true;
      break;
    }
    case "start": {
      mpStartGame();
      break;
    }
    case "player_update": {
      if (msg.id !== mp.playerId) {
        const rp = mp.players.get(msg.id);
        if (rp) rp.addSnapshot(msg);
      }
      break;
    }
    case "player_dead": {
      const rp = mp.players.get(msg.id);
      if (rp) rp.dead = true;
      if (msg.id === mp.playerId) mp.localDead = true;
      break;
    }
    case "player_revive": {
      const rp = mp.players.get(msg.id);
      if (rp) { rp.dead = false; rp.lives = 1; rp.x = msg.x; rp.y = msg.y; rp.displayX = msg.x; rp.displayY = msg.y; }
      if (msg.id === mp.playerId) _mpLocalRevive(msg.x, msg.y, msg.revivedBy);
      break;
    }
    case "enemy_spawn": {
      mp.enemies.set(msg.id, { id: msg.id, type: msg.etype, x: msg.x, y: msg.y, hp: msg.hp, maxHp: msg.hp, isBoss: !!msg.isBoss });
      if (gState === ST.MULTI && typeof enemies !== "undefined") {
        const e = new Enemy(msg.etype, msg.x, msg.y);
        e.mpId = msg.id;
        e.hp   = msg.hp;
        e.mhp  = msg.hp;
        enemies.push(e);
      }
      break;
    }
    case "enemy_hp": {
      const se = mp.enemies.get(msg.id);
      if (se) se.hp = msg.hp;
      if (typeof enemies !== "undefined") {
        const le = enemies.find(e => e.mpId === msg.id);
        if (le) le.hp = msg.hp;
      }
      break;
    }
    case "enemy_die": {
      mp.enemies.delete(msg.id);
      if (typeof enemies !== "undefined") {
        const idx = enemies.findIndex(e => e.mpId === msg.id);
        if (idx !== -1) {
          const e = enemies[idx];
          explode(msg.x || e.x, msg.y || e.y, "#ef4444", 8);
          if (BOSS_TYPES.includes(e.type)) { bossAlive = false; shakeAmt += 9; }
          enemies.splice(idx, 1);
        }
      }
      if (msg.killedBy === mp.playerId && msg.pts > 0) {
        score += msg.pts * combo;
        combo = Math.min(combo + 1, diffCfg.comboMax);
        comboT = 130;
        playerStats.kills++;
        if (combo > playerStats.maxCombo) playerStats.maxCombo = combo;
      }
      break;
    }
    case "collect_spawn": {
      mp.collectibles.set(msg.id, { id: msg.id, ctype: msg.ctype, x: msg.x, y: msg.y });
      if (gState === ST.MULTI && typeof collectibles !== "undefined") {
        const c = new Collectible(msg.x, msg.y);
        c.mpId = msg.id;
        const ctype = CTYPES.find(t => t.id === msg.ctype);
        if (ctype) c.type = ctype;
        collectibles.push(c);
      }
      break;
    }
    case "collect_take":
    case "collect_expire": {
      mp.collectibles.delete(msg.id);
      if (typeof collectibles !== "undefined") {
        const idx = collectibles.findIndex(c => c.mpId === msg.id);
        if (idx !== -1) collectibles.splice(idx, 1);
      }
      break;
    }
    case "sos_spawn": {
      mp.sosItems.set(msg.id, { id: msg.id, x: msg.x, y: msg.y, deadId: msg.deadId, life: 1500, maxLife: 1500 });
      break;
    }
    case "sos_take":
    case "sos_expire": {
      mp.sosItems.delete(msg.id);
      break;
    }
    case "wave": {
      if (gState === ST.MULTI) {
        waveNum = msg.num;
        announce(msg.num - 1);
      }
      break;
    }
    case "boss_target": {
      if (msg.targetId === mp.playerId) {
        mp.bossTargetId = msg.bossId;
        radioSay("⚠️ ALVO DESIGNADO — esquive agora!");
      } else if (mp.bossTargetId === msg.bossId) {
        mp.bossTargetId = null;
      }
      break;
    }
    case "formation": {
      const wasActive = mp.formationActive;
      mp.formationActive  = msg.active;
      mp.formationPlayers = msg.playerIds;
      if (msg.active && !wasActive && msg.playerIds.includes(mp.playerId)) {
        radioSay("◈ FORMAÇÃO — pontos +30%!");
      }
      break;
    }
    case "shield_relay": {
      if (msg.protectedId === mp.playerId) {
        mp.shieldRelayActive = true; mp.shieldRelayT = 90;
        radioSay("FAB: Cobertura de escudo ativada!");
      }
      if (msg.shielderId === mp.playerId && player) {
        player.shield = Math.max(0, player.shield - SHIELD_DUR);
        floatText("🛡️ RELAY!", player.x, player.y - 10, "#34d399");
      }
      break;
    }
    case "game_over": {
      if (gState === ST.MULTI) endGame();
      break;
    }
    case "error": {
      mp.error = msg.msg;
      break;
    }
  }
}

// ── Game start ────────────────────────────────────────────────────────────────
function mpStartGame() {
  mp.enemies.clear(); mp.collectibles.clear();
  mp.sosItems.clear(); mp.bossTargetId = null;
  mp.formationActive = false; mp.localDead = false;
  startGame();          // sets gState = ST.PLAY, creates player, etc.
  gState = ST.MULTI;   // override to multiplayer state
  enemies      = [];   // server controls enemies
  collectibles = [];   // server controls collectibles
  bossAlive    = false;
}

function _mpLocalRevive(x, y, revivedBy) {
  if (!player) return;
  player.x = x; player.y = y;
  player.lives = 1; player.inv = 120;
  mp.localDead = false;
  const reviverRp = revivedBy ? mp.players.get(revivedBy) : null;
  const name = reviverRp?.name || "parceiro";
  floatText("💊 REVIVIDO!", x, y - 20, "#34d399");
  radioSay(`FAB: ${name} te reviveu! Volte ao combate!`);
  sfxPowerup();
}

// ── Per-frame hooks (called from game loop) ───────────────────────────────────
function mpUpdate() {
  if (gState !== ST.MULTI) return;

  // Send position every 3 frames
  if (frame % 3 === 0 && player) {
    const currentBuffs = {
      boost: player.boost > 0, bis: player.bis > 0,
      shield: player.shield > 0, avibras: player.avibras > 0,
    };
    
    // Send full data only if buffs changed, otherwise omit
    const buffsChanged = JSON.stringify(currentBuffs) !== JSON.stringify(mp.lastSentBuffs);
    
    const msg = {
      type: "pos",
      x: Math.round(player.x * 10) / 10,
      y: Math.round(player.y * 10) / 10,
      vx: Math.round(player.vx * 100) / 100,
      vy: Math.round(player.vy * 100) / 100,
      tilt: Math.round(player.tilt * 100) / 100,
      shield: player.shield > 0 ? player.shield : undefined,
    };
    
    if (buffsChanged) {
      msg.buffs = currentBuffs;
      mp.lastSentBuffs = currentBuffs;
    }

    mpSend(msg);
  }

  // SOS pickup detection
  if (player && !mp.localDead) {
    for (const [id, sos] of mp.sosItems) {
      const dx = sos.x - player.x, dy = sos.y - player.y;
      if (dx * dx + dy * dy < 36 * 36) {
        mpSend({ type: "collect", collectibleId: id });
        break;
      }
    }
  }

  // Formation bonus: apply +30% to score when active
  // (score gain happens via combo in enemy_die handler, multiplied there)
}

// Shield relay check: call before tryHit() when enemy bullet hits player in MULTI
function mpCheckShieldRelay() {
  if (!player) return null;
  for (const [id, rp] of mp.players) {
    if (id !== mp.playerId && !rp.dead && rp.buffs && rp.buffs.shield) {
      const dx = rp.displayX - player.x, dy = rp.displayY - player.y;
      if (dx * dx + dy * dy < 100 * 100) return id;
    }
  }
  return null;
}

// ── Draw helpers ──────────────────────────────────────────────────────────────
function mpDrawAll() {
  if (gState !== ST.MULTI) return;
  // Draw remote players
  for (const [id, rp] of mp.players) {
    if (id !== mp.playerId) rp.draw();
  }
  // SOS balloons
  mpDrawSosItems();
  // Boss target ring
  mpDrawBossTarget();
  // Shield relay flash
  mpDrawShieldRelay();
}

function mpDrawHUD() {
  if (gState !== ST.MULTI) return;
  mpDrawFormationHud();
  if (mp.localDead) mpDrawDeadOverlay();
}

function mpDrawSosItems() {
  for (const sos of mp.sosItems.values()) {
    sos.life--;
    if (sos.life <= 0) continue;
    const alpha = Math.min(1, sos.life / 60) * (0.65 + Math.sin(frame * 0.12) * 0.35);
    const deadRp = mp.players.get(sos.deadId);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle  = "#ef4444"; ctx.shadowColor = "#ef4444";
    ctx.shadowBlur = 12 + Math.sin(frame * 0.1) * 6;
    ctx.beginPath(); ctx.arc(sos.x, sos.y, 10, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#fff"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(sos.x, sos.y + 10); ctx.lineTo(sos.x, sos.y + 18); ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.fillStyle  = "#fff"; ctx.font = "bold 5px Courier New"; ctx.textAlign = "center";
    ctx.fillText("SOS", sos.x, sos.y + 3);
    if (deadRp) {
      ctx.fillStyle = "#ef4444"; ctx.font = "6px Courier New";
      ctx.fillText(deadRp.name || "Piloto", sos.x, sos.y - 15);
    }
    const pct = sos.life / sos.maxLife;
    ctx.fillStyle = `rgba(239,68,68,0.5)`;
    ctx.fillRect(sos.x - 12, sos.y + 20, 24 * pct, 2);
    ctx.restore();
  }
}

function mpDrawBossTarget() {
  if (!mp.bossTargetId || !player) return;
  const pulse = 0.5 + Math.sin(frame * 0.18) * 0.5;
  ctx.save();
  ctx.strokeStyle = `rgba(239,68,68,${0.55 + pulse * 0.45})`;
  ctx.lineWidth   = 2;
  ctx.shadowColor = "#ef4444"; ctx.shadowBlur = 8 + pulse * 6;
  ctx.beginPath(); ctx.arc(player.x, player.y, 22 + pulse * 5, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = `rgba(239,68,68,${0.7 + pulse * 0.3})`;
  [[player.x, player.y - 30], [player.x, player.y + 30], [player.x - 30, player.y], [player.x + 30, player.y]].forEach(([px, py]) => {
    ctx.beginPath(); ctx.arc(px, py, 2.5, 0, Math.PI * 2); ctx.fill();
  });
  ctx.shadowBlur = 0;
  ctx.restore();
}

function mpDrawShieldRelay() {
  if (!mp.shieldRelayActive) return;
  if (--mp.shieldRelayT <= 0) { mp.shieldRelayActive = false; return; }
  if (!player) return;
  const a = mp.shieldRelayT / 90;
  ctx.save();
  ctx.strokeStyle = `rgba(52,211,153,${a})`; ctx.lineWidth = 3;
  ctx.shadowColor = "#34d399"; ctx.shadowBlur = 14 * a;
  ctx.beginPath(); ctx.arc(player.x, player.y, 32, 0, Math.PI * 2); ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.restore();
}

function mpDrawFormationHud() {
  if (!mp.formationActive || !mp.formationPlayers.includes(mp.playerId)) return;
  ctx.save();
  ctx.textAlign  = "center";
  ctx.fillStyle  = "rgba(52,211,153,0.16)";
  if (ctx.roundRect) ctx.roundRect(W / 2 - 72, 24, 144, 17, 3);
  else ctx.rect(W / 2 - 72, 24, 144, 17);
  ctx.fill();
  ctx.fillStyle  = "#34d399"; ctx.shadowColor = "#34d399"; ctx.shadowBlur = 5;
  ctx.font       = "bold 9px Courier New";
  ctx.fillText("◈ FORMAÇÃO ×1.3", W / 2, 35);
  ctx.shadowBlur = 0; ctx.restore();
}

function mpDrawDeadOverlay() {
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.45)";
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign  = "center";
  ctx.fillStyle  = "#ef4444"; ctx.shadowColor = "#ef4444"; ctx.shadowBlur = 18;
  ctx.font       = "bold 22px Courier New";
  ctx.fillText("✈ ABATIDO", W / 2, H / 2 - 20);
  ctx.shadowBlur = 0;
  ctx.fillStyle  = "#94a3b8"; ctx.font = "11px Courier New";
  ctx.fillText("Aguardando revive...", W / 2, H / 2 + 8);

  // Count live SOS balloons for local player
  let sosFound = false;
  for (const sos of mp.sosItems.values()) {
    if (sos.deadId === mp.playerId) {
      sosFound = true;
      const pct = sos.life / sos.maxLife;
      ctx.fillStyle = "rgba(239,68,68,0.3)";
      ctx.fillRect(W / 2 - 60, H / 2 + 22, 120, 6);
      ctx.fillStyle = "#ef4444";
      ctx.fillRect(W / 2 - 60, H / 2 + 22, 120 * pct, 6);
      ctx.fillStyle = "#94a3b8"; ctx.font = "8px Courier New";
      ctx.fillText("balão SOS expira em...", W / 2, H / 2 + 40);
      break;
    }
  }
  if (!sosFound) {
    ctx.fillStyle = "#475569"; ctx.font = "8px Courier New";
    ctx.fillText("sem balão SOS ativo", W / 2, H / 2 + 35);
  }
  ctx.restore();
}

// ── Lobby screen ──────────────────────────────────────────────────────────────
function drawLobby() {
  // Background
  const s = ctx.createLinearGradient(0, 0, 0, H);
  s.addColorStop(0, "#020212"); s.addColorStop(0.5, "#090935"); s.addColorStop(1, "#16104e");
  ctx.fillStyle = s; ctx.fillRect(0, 0, W, H);
  STARS.forEach((st) => {
    ctx.globalAlpha = 0.28 + Math.sin(st.tw + frame * 0.03) * 0.28;
    ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(st.x, st.y, st.r, 0, Math.PI * 2); ctx.fill();
  });
  ctx.globalAlpha = 1; STARS.forEach((st) => (st.tw += 0.03));
  ctx.textAlign = "center";

  // Title
  ctx.fillStyle = "#f472b6"; ctx.shadowColor = "#f472b6"; ctx.shadowBlur = 22;
  ctx.font = "bold 22px Courier New";
  ctx.fillText("✈ MODO MULTIPLAYER", W / 2, 46);
  ctx.shadowBlur = 0;

  if (mp.error) {
    ctx.fillStyle = "#ef4444"; ctx.font = "11px Courier New";
    ctx.fillText(`Erro: ${mp.error}`, W / 2, 70);
    _drawLobbyBack(); ctx.textAlign = "left"; return;
  }
  if (!mp.connected) {
    ctx.fillStyle = "#64748b"; ctx.font = "11px Courier New";
    ctx.fillText("Conectando" + ".".repeat(1 + (frame / 20 | 0) % 3), W / 2, 70);
    _drawLobbyBack(); ctx.textAlign = "left"; return;
  }

  // Lobby ID
  ctx.fillStyle = "#94a3b8"; ctx.font = "8px Courier New"; ctx.fillText("LOBBY", W / 2, 66);
  ctx.fillStyle = "#fbbf24"; ctx.shadowColor = "#fbbf24"; ctx.shadowBlur = 7;
  ctx.font = "bold 20px Courier New"; ctx.fillText(mp.lobbyId || "...", W / 2, 84);
  ctx.shadowBlur = 0;
  ctx.fillStyle = "#334155"; ctx.font = "7px Courier New";
  ctx.fillText(mp.shareUrl || "", W / 2, 97);
  ctx.fillStyle = Math.floor(frame / 22) % 2 ? "#60a5fa" : "#3b82f6";
  ctx.font = "7.5px Courier New"; ctx.fillText("[ ENTER = copiar link ]", W / 2, 108);

  // Player list
  const lx = W / 2 - 150, ly = 118, lw = 300, lh = 110;
  ctx.fillStyle = "rgba(10,15,40,0.82)"; ctx.fillRect(lx, ly, lw, lh);
  ctx.strokeStyle = "#1e3a5f"; ctx.lineWidth = 1; ctx.strokeRect(lx, ly, lw, lh);
  ctx.fillStyle = "#60a5fa"; ctx.font = "bold 8px Courier New";
  ctx.fillText(`JOGADORES — ${mp.players.size}/4`, W / 2, ly + 13);

  let pi = 0;
  for (const [pid, rp] of mp.players) {
    const ry    = ly + 24 + pi * 21;
    const isMe  = pid === mp.playerId;
    const col   = MP_COLORS[pi % MP_COLORS.length];
    ctx.fillStyle = col; ctx.shadowColor = col; ctx.shadowBlur = 4;
    ctx.beginPath(); ctx.arc(lx + 12, ry + 4, 4, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
    const plane = PLANES[rp.planeId] || PLANES[0];
    const tags  = [];
    if (rp.host) tags.push("HOST"); if (isMe) tags.push("VOCÊ");
    ctx.fillStyle = isMe ? "#f1f5f9" : "#94a3b8";
    ctx.font      = isMe ? "bold 8.5px Courier New" : "8.5px Courier New";
    ctx.textAlign = "left";
    ctx.fillText(`${plane.icon} ${plane.name}${tags.length ? " [" + tags.join("/") + "]" : ""}`, lx + 24, ry + 8);
    ctx.textAlign = "right";
    ctx.fillStyle = rp.ready ? "#34d399" : "#475569";
    ctx.font = "bold 7.5px Courier New";
    ctx.fillText(rp.ready ? "PRONTO ●" : "aguard ○", lx + lw - 6, ry + 8);
    ctx.textAlign = "center";
    pi++;
  }

  // Ship selector
  const total  = parseInt(localStorage.getItem(TOTAL_KEY) || "0");
  const pl     = PLANES[selectedPlane];
  const unlocked = total >= pl.unlock;
  const sx = W / 2 - 118, sy = ly + lh + 8;
  ctx.fillStyle = "#1e293b"; ctx.fillRect(sx, sy, 236, 36);
  ctx.strokeStyle = unlocked ? "#334155" : "#7f1d1d"; ctx.lineWidth = 1; ctx.strokeRect(sx, sy, 236, 36);
  ctx.fillStyle = unlocked ? "#f1f5f9" : "#64748b"; ctx.font = "bold 10px Courier New";
  ctx.fillText(`◀  ${unlocked ? pl.icon : "🔒"} ${pl.name}  ▶`, W / 2, sy + 13);
  ctx.fillStyle = "#94a3b8"; ctx.font = "8.5px Courier New";
  ctx.fillText(`SPD ${pl.maxSpd.toFixed(1)}  HP ${pl.lives}  CAD ${pl.fireN}`, W / 2, sy + 27);

  // Action buttons
  const btY = sy + 42;
  const localRp  = mp.players.get(mp.playerId);
  const isReady  = localRp?.ready;

  if (mp.isHost) {
    const canStart = mp.players.size >= 1;
    ctx.fillStyle  = canStart ? "rgba(20,60,35,0.9)" : "#1e293b";
    ctx.strokeStyle = canStart ? "#34d399" : "#334155"; ctx.lineWidth = 1.5;
    if (ctx.roundRect) ctx.roundRect(W / 2 - 85, btY, 170, 24, 4);
    else ctx.rect(W / 2 - 85, btY, 170, 24);
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = canStart ? "#f1f5f9" : "#64748b"; ctx.font = "bold 10px Courier New";
    ctx.fillText("▶  INICIAR PARTIDA", W / 2, btY + 15);
  } else {
    ctx.fillStyle  = isReady ? "rgba(10,50,30,0.9)" : "#1e293b";
    ctx.strokeStyle = isReady ? "#34d399" : "#334155"; ctx.lineWidth = 1.5;
    if (ctx.roundRect) ctx.roundRect(W / 2 - 55, btY, 110, 24, 4);
    else ctx.rect(W / 2 - 55, btY, 110, 24);
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = isReady ? "#34d399" : "#94a3b8"; ctx.font = "bold 10px Courier New";
    ctx.fillText(isReady ? "✓  PRONTO" : "MARCAR PRONTO", W / 2, btY + 15);
  }
  _drawLobbyBack(btY + 30);
  ctx.textAlign = "left";
}

function _drawLobbyBack(y = H - 28) {
  ctx.fillStyle = "rgba(10,15,40,0.8)"; ctx.strokeStyle = "#334155"; ctx.lineWidth = 1;
  if (ctx.roundRect) ctx.roundRect(W / 2 - 50, y, 100, 18, 3);
  else ctx.rect(W / 2 - 50, y, 100, 18);
  ctx.fill(); ctx.stroke();
  ctx.fillStyle = "#64748b"; ctx.font = "8.5px Courier New";
  ctx.fillText("ESC — VOLTAR", W / 2, y + 12);
}

// ── Lobby rects for click/touch ───────────────────────────────────────────────
// Called from game.js to check if a point falls on an interactive lobby element.
// Returns action string or null.
function mpLobbyHit(p) {
  if (gState !== ST.LOBBY) return null;
  if (!mp.connected) return null;
  const ly = 118, lh = 110;
  const sy = ly + lh + 8;    // ship selector top
  const btY = sy + 42;       // button top

  // Ship left/right arrows (wide hit area — left half / right half of selector)
  if (p.y >= sy && p.y <= sy + 36) {
    return p.x < W / 2 ? "plane_left" : "plane_right";
  }
  // Action button
  if (p.y >= btY && p.y <= btY + 24) return mp.isHost ? "start" : "ready";
  // Back button
  const backY = btY + 30;
  if (p.y >= backY && p.y <= backY + 18 && Math.abs(p.x - W / 2) < 50) return "back";
  // Copy link
  if (p.y >= 100 && p.y <= 114) return "copy_link";
  return null;
}

// ── Auto-join from URL ────────────────────────────────────────────────────────
// Runs after game.js initialises (deferred via setTimeout).
(function mpAutoJoin() {
  const urlLobby = new URLSearchParams(location.search).get("lobby");
  if (urlLobby) setTimeout(() => mpConnect(urlLobby), 50);
})();
