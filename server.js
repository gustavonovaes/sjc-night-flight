// SJC Night Flight — Bun server
// HTTP estático + WebSocket para multiplayer co-op.
import { join } from "path";

const PORT = parseInt(process.env.PORT || "3000");
const W = 800, H = 450;

const BOSS_TYPES = ["boss", "prototipo_x", "cemaden_eye", "engrenagem", "cigarra"];

const ENEMY_HP = {
  cloud: 4, drone: 1, arara: 1, ovni: 3, helicoptero: 2,
  tanajura: 2, balao: 1,
  boss: 42, prototipo_x: 28, cemaden_eye: 35, engrenagem: 55, cigarra: 90,
};
const ENEMY_PTS = {
  cloud: 80, drone: 50, arara: 70, ovni: 320, helicoptero: 140,
  tanajura: 190, balao: 40,
  boss: 2500, prototipo_x: 3000, cemaden_eye: 2800, engrenagem: 2600, cigarra: 5000,
};
const BOSS_ROTATION = ["boss", "cemaden_eye", "engrenagem", "cigarra", "prototipo_x"];
const SCORE_TYPES  = ["embraer", "inpe", "ita", "tech", "dcta", "jj", "gm", "ericsson"];
const PW_TYPES     = ["shield", "boost", "avibras_pw", "delta_pw", "ericsson_pw", "revap_pw", "inpe_sat", "14bis"];

// ── State ─────────────────────────────────────────────────────────────────────
const lobbies     = new Map(); // id → Lobby
const wsToPlayer  = new Map(); // ws → Player

function genId(len = 6) {
  return Math.random().toString(36).slice(2, 2 + len).toUpperCase();
}

function getOrCreateLobby(id) {
  if (lobbies.has(id)) return lobbies.get(id);
  const lobby = {
    id,
    players: new Map(),      // ws → playerState
    host: null,
    gameRunning: false,
    frame: 0,
    wave: 0,
    bossAlive: false,
    spawnT: 180,
    collectT: 100,
    ovniEventT: 2200,
    hordeQueue: [],
    hordeSpawnT: 0,
    enemies: new Map(),      // mpId → { id, type, x, y, hp }
    collectibles: new Map(), // mpId → { id, ctype, x, y, life }
    sosItems: new Map(),     // mpId → { id, x, y, deadId, life }
    bossTargets: new Map(),  // bossId → targetPlayerId
    formationPairs: new Map(),
    tickInterval: null,
    eidC: 0,
    cidC: 0,
  };
  lobbies.set(id, lobby);
  return lobby;
}

// ── Broadcast helpers ─────────────────────────────────────────────────────────
function send(ws, msg) {
  if (ws.readyState === 1) ws.send(JSON.stringify(msg));
}
function broadcast(lobby, msg, excludeWs = null) {
  const data = JSON.stringify(msg);
  for (const [ws] of lobby.players) {
    if (ws !== excludeWs && ws.readyState === 1) ws.send(data);
  }
}
function broadcastAll(lobby, msg) { broadcast(lobby, msg, null); }

function lobbyPlayerList(lobby) {
  return [...lobby.players.values()].map(p => ({
    id: p.id, name: p.name, planeId: p.planeId,
    ready: p.ready, host: p.host,
  }));
}

// ── Game tick (30 fps) ────────────────────────────────────────────────────────
function tickLobby(lobby) {
  lobby.frame++;
  const f = lobby.frame;
  const w = lobby.wave;

  // Enemy spawn
  if (--lobby.spawnT <= 0) {
    const base = 170 - w * 5 - f / 300;
    lobby.spawnT = Math.max(22, base);
    spawnServerEnemy(lobby);
  }

  // Horde
  if (lobby.hordeQueue.length > 0 && --lobby.hordeSpawnT <= 0) {
    const h = lobby.hordeQueue.shift();
    const id = `e_${f}_${lobby.eidC++}`;
    const x  = W + 42 + Math.random() * 60;
    const y  = 55 + Math.random() * (H - 110);
    const hp = getEnemyHp(h.type, w);
    lobby.enemies.set(id, { id, type: h.type, x, y, hp });
    broadcastAll(lobby, { type: "enemy_spawn", id, etype: h.type, x, y, hp });
    lobby.hordeSpawnT = 14;
  }

  // Boss spawn (~4800 ticks ≈ 160s at 30 tps)
  if (!lobby.bossAlive && f > 0 && f % 4800 === 0) {
    spawnServerBoss(lobby);
  }

  // Collectible spawn
  if (--lobby.collectT <= 0) {
    lobby.collectT = Math.floor(220 + Math.random() * 160);
    spawnServerCollectible(lobby);
  }

  // Enemy simple cleanup (move left)
  for (const [id, e] of lobby.enemies) {
    e.x -= 2;
    if (e.x < -250) {
      lobby.enemies.delete(id);
      if (BOSS_TYPES.includes(e.type)) lobby.bossAlive = false;
    }
  }

  // Collectible cleanup
  for (const [id, c] of lobby.collectibles) {
    c.x -= 2; c.life--;
    if (c.life <= 0 || c.x < -50) {
      lobby.collectibles.delete(id);
      broadcastAll(lobby, { type: "collect_expire", id });
    }
  }

  // SOS lifetime
  for (const [id, sos] of lobby.sosItems) {
    sos.life--;
    if (sos.life <= 0) {
      lobby.sosItems.delete(id);
      broadcastAll(lobby, { type: "sos_expire", id });
    }
  }

  // Boss targeting — alternate every 120 ticks
  if (lobby.bossAlive && f % 120 === 0) {
    const alive = [...lobby.players.values()].filter(p => p.inGame && !p.dead);
    if (alive.length > 0) {
      for (const [eid, e] of lobby.enemies) {
        if (BOSS_TYPES.includes(e.type)) {
          const prev = lobby.bossTargets.get(eid);
          const pool = alive.filter(p => p.id !== prev);
          const tgt  = (pool.length > 0 ? pool : alive)[Math.floor(Math.random() * (pool.length || alive.length))];
          lobby.bossTargets.set(eid, tgt.id);
          broadcastAll(lobby, { type: "boss_target", bossId: eid, targetId: tgt.id });
        }
      }
    }
  }

  // Formation check — every 10 ticks
  if (f % 10 === 0) {
    const alive = [...lobby.players.values()].filter(p => p.inGame && !p.dead);
    for (let i = 0; i < alive.length; i++) {
      for (let j = i + 1; j < alive.length; j++) {
        const pa = alive[i], pb = alive[j];
        const dx = pa.x - pb.x, dy = pa.y - pb.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const key  = [pa.id, pb.id].sort().join("-");
        const prev = lobby.formationPairs.get(key) || 0;
        if (dist < 80) {
          const next = prev + 10;
          lobby.formationPairs.set(key, next);
          if (next >= 180 && prev < 180) {
            broadcastAll(lobby, { type: "formation", playerIds: [pa.id, pb.id], active: true });
          }
        } else {
          if (dist > 120 && prev >= 180) {
            broadcastAll(lobby, { type: "formation", playerIds: [pa.id, pb.id], active: false });
          }
          lobby.formationPairs.set(key, Math.max(0, prev - 5));
        }
      }
    }
  }
}

function getEnemyHp(type, wave) {
  const base = ENEMY_HP[type] || 1;
  if (!BOSS_TYPES.includes(type)) return base;
  const waveMult = { boss: 12, prototipo_x: 6, cemaden_eye: 5, engrenagem: 6, cigarra: 10 }[type] || 6;
  return base + wave * waveMult;
}

function spawnServerEnemy(lobby) {
  const { wave: w, frame: f } = lobby;
  const r = Math.random();
  const y = 55 + Math.random() * (H - 110);
  const x = W + 42 + Math.random() * 60;
  let type;
  if      (w === 0) type = r < 0.52 ? "cloud"  : "drone";
  else if (w === 1) type = r < 0.30 ? "cloud"  : r < 0.75 ? "drone"       : "arara";
  else if (w === 2) type = r < 0.18 ? "cloud"  : r < 0.45 ? "drone"       : "arara";
  else if (w === 3) type = r < 0.15 ? "cloud"  : r < 0.38 ? "drone"       : r < 0.68 ? "arara"       : "drone";
  else if (w <= 5)  type = r < 0.12 ? "cloud"  : r < 0.32 ? "drone"       : r < 0.58 ? "arara"       : r < 0.78 ? "ovni" : "helicoptero";
  else              type = r < 0.08 ? "cloud"  : r < 0.22 ? "drone"       : r < 0.46 ? "arara"       : r < 0.68 ? "ovni" : "helicoptero";

  const id = `e_${f}_${lobby.eidC++}`;
  const hp = getEnemyHp(type, w);
  lobby.enemies.set(id, { id, type, x, y, hp });
  broadcastAll(lobby, { type: "enemy_spawn", id, etype: type, x, y, hp });
}

function spawnServerBoss(lobby) {
  lobby.bossAlive = true;
  const bossType = BOSS_ROTATION[Math.floor(lobby.wave) % BOSS_ROTATION.length];
  const id = `boss_${lobby.frame}`;
  const hp = getEnemyHp(bossType, lobby.wave);
  lobby.enemies.set(id, { id, type: bossType, x: W + 200, y: H / 2, hp, isBoss: true });
  broadcastAll(lobby, { type: "enemy_spawn", id, etype: bossType, x: W + 200, y: H / 2, hp, isBoss: true });
  lobby.wave++;
  broadcastAll(lobby, { type: "wave", num: lobby.wave });

  // Horde for new wave
  const hordeDefs = [
    [["cloud",3],["drone",3]],
    [["drone",5],["cloud",2],["arara",2]],
    [["arara",5],["drone",3],["cloud",1]],
    [["ovni",3],["arara",3],["drone",2]],
    [["ovni",4],["arara",3],["drone",3],["helicoptero",2]],
    [["ovni",4],["arara",4],["drone",3],["helicoptero",2]],
    [["ovni",5],["arara",4],["drone",4],["helicoptero",3],["tanajura",3]],
    [["ovni",6],["arara",5],["drone",4],["helicoptero",3],["tanajura",4]],
  ];
  const def = hordeDefs[Math.min(lobby.wave - 1, hordeDefs.length - 1)] || hordeDefs[hordeDefs.length - 1];
  const arr = [];
  for (const [t, n] of def) for (let i = 0; i < n; i++) arr.push({ type: t });
  lobby.hordeQueue = arr.sort(() => Math.random() - 0.5);
  lobby.hordeSpawnT = 70;

  if (lobby.wave > 18) {
    setTimeout(() => {
      if (!lobby.gameRunning) return;
      const second = BOSS_ROTATION[(Math.floor(lobby.wave) + 2) % BOSS_ROTATION.length];
      const id2 = `boss2_${lobby.frame}`;
      const hp2 = getEnemyHp(second, lobby.wave);
      lobby.enemies.set(id2, { id: id2, type: second, x: W + 300, y: H / 3, hp: hp2, isBoss: true });
      broadcastAll(lobby, { type: "enemy_spawn", id: id2, etype: second, x: W + 300, y: H / 3, hp: hp2, isBoss: true });
    }, 4000);
  }
}

function spawnServerCollectible(lobby) {
  const id  = `c_${lobby.frame}_${lobby.cidC++}`;
  const x   = W + 22;
  const y   = 48 + Math.random() * (H - 96);
  const isPw = Math.random() < 0.30;
  const pool = isPw ? PW_TYPES : SCORE_TYPES;
  const ctype = pool[Math.floor(Math.random() * pool.length)];
  lobby.collectibles.set(id, { id, ctype, x, y, life: 300 });
  broadcastAll(lobby, { type: "collect_spawn", id, ctype, x, y });
}

// ── Message handler ───────────────────────────────────────────────────────────
function handleMessage(ws, msg) {
  if (msg.type === "join") {
    const lobbyId = msg.lobbyId || genId();
    const lobby   = getOrCreateLobby(lobbyId);

    if (lobby.gameRunning) {
      send(ws, { type: "error", msg: "Partida em andamento — aguarde próxima sessão" });
      return;
    }

    const pid    = "p_" + genId(8);
    const isHost = lobby.players.size === 0;
    const pState = {
      id: pid, ws, name: msg.name || `Piloto ${lobby.players.size + 1}`,
      planeId: 0, ready: false, host: isHost, lobbyId,
      x: 110, y: H / 2, vx: 0, vy: 0, tilt: 0,
      lives: 3, dead: false, shield: 0, inGame: false,
    };
    lobby.players.set(ws, pState);
    if (isHost) lobby.host = ws;
    wsToPlayer.set(ws, pState);

    const host = process.env.HOST || `localhost:${PORT}`;
    send(ws, {
      type: "joined", playerId: pid, lobbyId, isHost,
      shareUrl: `http://${host}/?lobby=${lobbyId}`,
      players: lobbyPlayerList(lobby),
    });
    broadcast(lobby, { type: "player_join", id: pid, name: pState.name, planeId: 0 }, ws);
    return;
  }

  const player = wsToPlayer.get(ws);
  if (!player) return;
  const lobby = lobbies.get(player.lobbyId);
  if (!lobby) return;

  switch (msg.type) {
    case "ship": {
      player.planeId = msg.planeId | 0;
      broadcast(lobby, { type: "player_ship", id: player.id, planeId: player.planeId });
      break;
    }
    case "ready": {
      player.ready = !player.ready;
      broadcastAll(lobby, { type: "player_ready", id: player.id, ready: player.ready });
      break;
    }
    case "start": {
      if (ws !== lobby.host || lobby.players.size < 1) break;
      startLobbyGame(lobby);
      break;
    }
    case "pos": {
      player.x = msg.x ?? player.x;
      player.y = msg.y ?? player.y;
      player.vx = msg.vx ?? 0;
      player.vy = msg.vy ?? 0;
      player.tilt = msg.tilt ?? 0;
      player.shield = msg.shield || 0;
      broadcast(lobby, {
        type: "player_update",
        id: player.id, x: player.x, y: player.y,
        vx: player.vx, vy: player.vy, tilt: player.tilt,
        lives: player.lives, dead: player.dead, buffs: msg.buffs,
      }, ws);
      break;
    }
    case "hit": {
      const enemy = lobby.enemies.get(msg.enemyId);
      if (!enemy) break;
      const dmg = Math.min(msg.dmg || 1, 4);
      enemy.hp -= dmg;
      if (enemy.hp <= 0) {
        lobby.enemies.delete(msg.enemyId);
        if (BOSS_TYPES.includes(enemy.type)) {
          lobby.bossAlive = false;
          lobby.bossTargets.delete(msg.enemyId);
        }
        const pts = ENEMY_PTS[enemy.type] || 50;
        broadcastAll(lobby, { type: "enemy_die", id: msg.enemyId, pts, killedBy: player.id, x: enemy.x, y: enemy.y });
        // Boss kill: spawn boss loot server-side
        if (BOSS_TYPES.includes(enemy.type)) {
          for (let i = 0; i < 4; i++) {
            setTimeout(() => { if (lobby.gameRunning) spawnServerCollectible(lobby); }, i * 300);
          }
        }
      } else {
        broadcastAll(lobby, { type: "enemy_hp", id: msg.enemyId, hp: enemy.hp });
      }
      break;
    }
    case "collect": {
      const c = lobby.collectibles.get(msg.collectibleId);
      if (c) {
        lobby.collectibles.delete(msg.collectibleId);
        broadcastAll(lobby, { type: "collect_take", id: msg.collectibleId, playerId: player.id, ctype: c.ctype });
        break;
      }
      const sos = lobby.sosItems.get(msg.collectibleId);
      if (sos && sos.deadId !== player.id) {
        lobby.sosItems.delete(msg.collectibleId);
        const dead = [...lobby.players.values()].find(p => p.id === sos.deadId);
        if (dead) {
          dead.dead = false; dead.lives = 1;
          dead.x = player.x; dead.y = player.y;
          broadcastAll(lobby, { type: "player_revive", id: sos.deadId, x: player.x, y: player.y, revivedBy: player.id });
          broadcastAll(lobby, { type: "sos_take", id: msg.collectibleId });
        }
      }
      break;
    }
    case "dead": {
      if (player.dead) break;
      player.dead = true; player.lives = 0;
      broadcastAll(lobby, { type: "player_dead", id: player.id });

      // SOS balloon
      const sosId = `sos_${lobby.frame}_${player.id}`;
      lobby.sosItems.set(sosId, { id: sosId, x: player.x, y: player.y, deadId: player.id, life: 1500 });
      broadcastAll(lobby, { type: "sos_spawn", id: sosId, x: player.x, y: player.y, deadId: player.id });

      const alive = [...lobby.players.values()].filter(p => p.inGame && !p.dead);
      if (alive.length === 0) {
        broadcastAll(lobby, { type: "game_over" });
        stopLobbyGame(lobby);
      }
      break;
    }
    case "shield_relay_used": {
      // Player used partner's shield to absorb a hit
      broadcast(lobby, { type: "shield_relay", shielderId: msg.partnerId, protectedId: player.id });
      break;
    }
  }
}

function startLobbyGame(lobby) {
  lobby.gameRunning = true;
  lobby.frame = 0; lobby.wave = 0; lobby.bossAlive = false;
  lobby.spawnT = 180; lobby.collectT = 100;
  lobby.enemies.clear(); lobby.collectibles.clear(); lobby.sosItems.clear();
  lobby.bossTargets.clear(); lobby.formationPairs.clear();
  lobby.hordeQueue = []; lobby.eidC = 0; lobby.cidC = 0;
  for (const p of lobby.players.values()) {
    p.inGame = true; p.dead = false; p.lives = 3; p.x = 110; p.y = H / 2;
  }
  broadcastAll(lobby, { type: "start" });
  lobby.tickInterval = setInterval(() => tickLobby(lobby), 1000 / 30);
}

function stopLobbyGame(lobby) {
  lobby.gameRunning = false;
  if (lobby.tickInterval) { clearInterval(lobby.tickInterval); lobby.tickInterval = null; }
}

function handleOpen(ws) { ws.data = {}; }

function handleClose(ws) {
  const player = wsToPlayer.get(ws);
  if (!player) return;
  const lobby = lobbies.get(player.lobbyId);
  if (lobby) {
    lobby.players.delete(ws);
    broadcast(lobby, { type: "player_leave", id: player.id });
    if (lobby.host === ws && lobby.players.size > 0) {
      const newHostWs     = lobby.players.keys().next().value;
      const newHostPlayer = lobby.players.get(newHostWs);
      lobby.host = newHostWs;
      newHostPlayer.host = true;
      broadcastAll(lobby, { type: "new_host", id: newHostPlayer.id });
    }
    if (lobby.players.size === 0) { stopLobbyGame(lobby); lobbies.delete(player.lobbyId); }
  }
  wsToPlayer.delete(ws);
}

// ── Static file serving ───────────────────────────────────────────────────────
const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js":   "application/javascript; charset=utf-8",
  ".css":  "text/css",
  ".png":  "image/png",
  ".ico":  "image/x-icon",
  ".json": "application/json",
  ".webmanifest": "application/manifest+json",
};

async function serveStatic(req) {
  const url  = new URL(req.url);
  let   path = url.pathname === "/" ? "/index.html" : url.pathname;
  // Strip query string and prevent path traversal
  path = path.split("?")[0].replace(/\.\./g, "");
  const filePath = join(import.meta.dir, path);
  try {
    const file   = Bun.file(filePath);
    const exists = await file.exists();
    if (!exists) {
      const idx = Bun.file(join(import.meta.dir, "index.html"));
      return new Response(idx, { headers: { "Content-Type": "text/html; charset=utf-8" } });
    }
    const ext = "." + filePath.split(".").pop();
    return new Response(file, { headers: { "Content-Type": MIME[ext] || "application/octet-stream" } });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}

// ── Bun.serve ─────────────────────────────────────────────────────────────────
const server = Bun.serve({
  port: PORT,
  async fetch(req, srv) {
    if (srv.upgrade(req, { data: {} })) return;
    return serveStatic(req);
  },
  websocket: {
    message(ws, data) {
      try { handleMessage(ws, JSON.parse(data)); } catch (e) { console.error("WS error:", e.message); }
    },
    open:  handleOpen,
    close: handleClose,
  },
});

console.log(`SJC Night Flight — servidor rodando em http://localhost:${PORT}`);
