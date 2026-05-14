"use strict";

const ST = Object.freeze({ MENU: 0, PLAY: 1, PAUSE: 2, OVER: 3, SOBRE: 4 });
let gState = ST.MENU;
const DEV_BTN = { x: W - 50, y: H - 24, w: 46, h: 20 };

let player, bullets, enemies, eBullets, collectibles, particles, floaters;
let frame = 0;
let score = 0;
let combo = 1;
let comboT = 0;
let hiScore = 0;
let scrollSpd = 2;
let spawnT = 60;
let collectT = 100;
let shakeAmt = 0;
let bossAlive = false;
let waveText = "";
let waveT = 0;
let waveNum = 0;
let ovniEventT = 2200;
let hordeQueue = [];
let hordeSpawnT = 0;
let currentPhase = 0;

const HS_KEY = "sjc_flight_hs";

const dev = {
  open: false,
  escHold: 0,
  openCooldown: 0,
  godMode: false,
  noProj: false,
  daySpeed: 1,
  selectedScene: 0,
  cursor: 0,
};

const DEV_SCENES = [
  { lbl: "Auto",    phase: -1 },
  { lbl: "Madrugada", phase: 0.05 },
  { lbl: "Nascer",  phase: 0.28 },
  { lbl: "Manhã",   phase: 0.40 },
  { lbl: "Tarde",   phase: 0.60 },
  { lbl: "Pôr do sol", phase: 0.73 },
  { lbl: "Noite",   phase: 0.90 },
];

const DEV_ITEMS = [
  { lbl: "God Mode",        type: "toggle",  col: 0, get: () => dev.godMode, set: v => { dev.godMode = v; } },
  { lbl: "Sem projéteis",   type: "toggle",  col: 0, get: () => dev.noProj,  set: v => { dev.noProj = v;  } },
  { lbl: "── BUFFS ──",     type: "header",  col: 0 },
  { lbl: "Escudo",          type: "action",  col: 0, run: () => { if (player) player.shield   = SHIELD_DUR   * 3; } },
  { lbl: "Boost",           type: "action",  col: 0, run: () => { if (player) player.boost    = BOOST_DUR    * 3; } },
  { lbl: "14-BIS",          type: "action",  col: 0, run: () => { if (player) player.bis      = BIS_DUR;          } },
  { lbl: "Pulso Avibras",   type: "action",  col: 0, run: () => { if (player) { player.avibras = AVIBRAS_DUR * 2; player.missileT = 0; } } },
  { lbl: "Satélite INPE",   type: "action",  col: 0, run: () => { if (player) player.inpe     = INPE_DUR     * 2; } },
  { lbl: "Revap Shock",     type: "action",  col: 0, run: () => { if (player) player.revap    = REVAP_DUR;        } },
  { lbl: "Asa Delta",       type: "action",  col: 0, run: () => { if (player) player.delta    = DELTA_DUR    * 2; } },
  { lbl: "Wingman 5G",      type: "action",  col: 0, run: () => { if (player) player.ericsson = ERICSSON_DUR * 2; } },
  { lbl: "── SPAWN ──",     type: "header",  col: 1 },
  { lbl: "Frente Fria",     type: "action",  col: 1, run: () => { if (enemies) enemies.push(new Enemy("cloud", W * 0.8, H / 2)); } },
  { lbl: "Drone",           type: "action",  col: 1, run: () => { if (enemies) enemies.push(new Enemy("drone", W * 0.8, H / 2)); } },
  { lbl: "Arara",           type: "action",  col: 1, run: () => { if (enemies) enemies.push(new Enemy("arara", W * 0.8, H / 2)); } },
  { lbl: "OVNI",            type: "action",  col: 1, run: () => { if (enemies) enemies.push(new Enemy("ovni",  W * 0.8, H / 2)); } },
  { lbl: "Boss",            type: "action",  col: 1, run: () => { spawnBoss(); } },
  { lbl: "── DIA/CENA ──",  type: "header",  col: 1 },
  { lbl: "Vel. dia −",      type: "action",  col: 1, run: () => { dev.daySpeed = Math.max(0, dev.daySpeed - 0.5); } },
  { lbl: "Vel. dia +",      type: "action",  col: 1, run: () => { dev.daySpeed += 0.5; } },
  { lbl: "Cenário ◀",      type: "action",  col: 1, run: () => { dev.selectedScene = (dev.selectedScene - 1 + DEV_SCENES.length) % DEV_SCENES.length; applyDevScene(); } },
  { lbl: "Cenário ▶",      type: "action",  col: 1, run: () => { dev.selectedScene = (dev.selectedScene + 1) % DEV_SCENES.length; applyDevScene(); } },
  { lbl: "Música ◀",       type: "action",  col: 1, run: () => { playlistIdx = (playlistIdx - 1 + PLAYLISTS.length) % PLAYLISTS.length; mIdx = 0; } },
  { lbl: "Música ▶",       type: "action",  col: 1, run: () => { playlistIdx = (playlistIdx + 1) % PLAYLISTS.length; mIdx = 0; } },
  { lbl: "Próxima fase",    type: "action",  col: 1, run: () => { if (typeof waveNum !== "undefined") { waveNum++; spawnBoss(); } } },
  { lbl: "Protótipo X",    type: "action",  col: 1, run: () => { spawnBossType("prototipo_x"); } },
  { lbl: "Olho CEMADEN",   type: "action",  col: 1, run: () => { spawnBossType("cemaden_eye"); } },
  { lbl: "Engrenagem",     type: "action",  col: 1, run: () => { spawnBossType("engrenagem");  } },
  { lbl: "Cigarra",        type: "action",  col: 1, run: () => { spawnBossType("cigarra");     } },
  { lbl: "── ──",           type: "header",  col: 1 },
  { lbl: "Fechar DEV",      type: "action",  col: 1, run: () => { dev.open = false; } },
];

function applyDevScene() {
  const s = DEV_SCENES[dev.selectedScene];
  if (s?.phase >= 0) dayPhase = s.phase;
}

let devItemRects = [];

function drawDevPanel() {
  const COL_W = 192, PAD = 10;
  const PW = COL_W * 2 + PAD * 3;
  const ROW = 18;
  const col0 = DEV_ITEMS.filter(it => it.col === 0);
  const col1 = DEV_ITEMS.filter(it => it.col === 1);
  const PH = Math.max(col0.length, col1.length) * ROW + 70;
  const px = Math.max(4, W - PW - 4), py = 4;
  devItemRects = [];

  ctx.save();
  ctx.fillStyle = "rgba(0,0,16,0.94)";
  ctx.strokeStyle = "#00ff88";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(px, py, PW, PH, 6);
  else ctx.rect(px, py, PW, PH);
  ctx.fill(); ctx.stroke();

  ctx.fillStyle = "#00ff88";
  ctx.font = "bold 11px monospace";
  ctx.textAlign = "left";
  ctx.fillText("⚙ DEV  [toque item ou ↑↓+Enter]", px + PAD, py + 14);
  ctx.font = "8px monospace";
  ctx.fillStyle = "#555";
  const sceneLbl = DEV_SCENES[dev.selectedScene]?.lbl ?? "Auto";
  const isNight = dayPhase < 0.26 || dayPhase > 0.84;
  ctx.fillText(
    `wave:${waveNum} fase:${currentPhase}  dia:${dayPhase.toFixed(2)}×${dev.daySpeed.toFixed(1)}  cena:${sceneLbl}${isNight ? "🌙" : "☀️"}`,
    px + PAD, py + 26,
  );
  ctx.fillText(`♪ ${PLAYLIST_LABELS[playlistIdx]}  score:${score}`, px + PAD, py + 37);

  const divX = px + PAD + COL_W + PAD / 2;
  ctx.strokeStyle = "rgba(0,255,136,0.18)";
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(divX, py + 44); ctx.lineTo(divX, py + PH - 6); ctx.stroke();

  const drawCol = (items, ox) => {
    items.forEach((item, i) => {
      const iy = py + 50 + i * ROW;
      const globalIdx = DEV_ITEMS.indexOf(item);
      const selected = dev.cursor === globalIdx;

      if (item.type === "header") {
        ctx.fillStyle = "rgba(0,255,136,0.07)";
        ctx.fillRect(ox - 2, iy - ROW + 4, COL_W, ROW - 1);
        ctx.fillStyle = "#00aa55";
        ctx.font = "bold 8px monospace";
        ctx.fillText(item.lbl, ox + 2, iy - 2);
        return;
      }

      devItemRects.push({ i: globalIdx, x: ox - 4, y: iy - ROW + 4, w: COL_W + 4, h: ROW - 1 });

      if (selected) {
        ctx.fillStyle = "rgba(0,255,136,0.18)";
        ctx.fillRect(ox - 4, iy - ROW + 4, COL_W + 4, ROW - 1);
      }
      ctx.fillStyle = selected ? "#00ff88" : "#d0d0d0";
      ctx.font = selected ? "bold 9.5px monospace" : "9.5px monospace";
      let label = item.lbl;
      if (item.type === "toggle") label += item.get() ? " ●ON" : " ○OFF";
      ctx.fillText((selected ? "▶ " : "  ") + label, ox, iy - 2);
    });
  };

  drawCol(col0, px + PAD);
  drawCol(col1, px + PAD * 2 + COL_W);

  ctx.font = "7.5px monospace";
  ctx.fillStyle = "#3a3a3a";
  ctx.textAlign = "center";
  ctx.fillText("ESC fecha", px + PW / 2, py + PH - 4);
  ctx.textAlign = "left";
  ctx.restore();
}

function devHandleKey(code) {
  if (!dev.open) return false;
  const actionItems = DEV_ITEMS.map((it, i) => ({ it, i })).filter(x => x.it.type !== "header");
  const curPos = actionItems.findIndex(x => x.i === dev.cursor);
  if (code === "ArrowUp" || code === "ArrowDown") {
    const dir = code === "ArrowUp" ? -1 : 1;
    const next = (curPos + dir + actionItems.length) % actionItems.length;
    dev.cursor = actionItems[next].i;
    return true;
  }
  if (code === "Enter" || code === "Space") {
    const item = DEV_ITEMS[dev.cursor];
    if (!item || item.type === "header") return true;
    if (item.type === "toggle") item.set(!item.get());
    else item.run();
    return true;
  }
  return false;
}

let radioText = "";
let radioT = 0;
let radioQueue = [];
let windX = 0;
let windTimer = 1800;
let grazeCount = 0;
let cbersMission = null;
let cbersMissionT = 3800;
