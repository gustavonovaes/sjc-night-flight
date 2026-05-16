import { state } from "./state";
import { ctx, W, H } from "./world";
import {
  SHIELD_DUR, BOOST_DUR, BIS_DUR, AVIBRAS_DUR, INPE_DUR, REVAP_DUR,
  DELTA_DUR, ERICSSON_DUR, DEV_SCENES, PLAYLIST_LABELS, PLAYLISTS,
} from "./constants";
import { Enemy } from "./entities";
import type { DevItem } from "./types";

// Late-bound callbacks to break circular dep with game.ts
let _spawnBoss: (() => void) | null = null;
let _spawnBossType: ((type: string) => void) | null = null;

export function setDevCallbacks(cbs: {
  spawnBoss: () => void;
  spawnBossType: (type: string) => void;
}): void {
  _spawnBoss = cbs.spawnBoss;
  _spawnBossType = cbs.spawnBossType;
}

export const DEV_ITEMS: DevItem[] = [
  { lbl: "God Mode",       type: "toggle", col: 0, get: () => state.dev.godMode, set: v => { state.dev.godMode = v; } },
  { lbl: "Sem projéteis",  type: "toggle", col: 0, get: () => state.dev.noProj,  set: v => { state.dev.noProj = v;  } },
  { lbl: "── BUFFS ──",    type: "header", col: 0 },
  { lbl: "Escudo",         type: "action", col: 0, run: () => { if (state.player) state.player.shield   = SHIELD_DUR   * 3; } },
  { lbl: "Boost",          type: "action", col: 0, run: () => { if (state.player) state.player.boost    = BOOST_DUR    * 3; } },
  { lbl: "14-BIS",         type: "action", col: 0, run: () => { if (state.player) state.player.bis      = BIS_DUR;          } },
  { lbl: "Pulso Avibras",  type: "action", col: 0, run: () => { if (state.player) { state.player.avibras = AVIBRAS_DUR * 2; state.player.missileT = 0; } } },
  { lbl: "Satélite INPE",  type: "action", col: 0, run: () => { if (state.player) state.player.inpe     = INPE_DUR     * 2; } },
  { lbl: "Revap Shock",    type: "action", col: 0, run: () => { if (state.player) state.player.revap    = REVAP_DUR;        } },
  { lbl: "Asa Delta",      type: "action", col: 0, run: () => { if (state.player) state.player.delta    = DELTA_DUR    * 2; } },
  { lbl: "Wingman 5G",     type: "action", col: 0, run: () => { if (state.player) state.player.ericsson = ERICSSON_DUR * 2; } },
  { lbl: "── SPAWN ──",    type: "header", col: 1 },
  { lbl: "Frente Fria",    type: "action", col: 1, run: () => { state.enemies.push(new Enemy("cloud",       W * 0.8, H / 2)); } },
  { lbl: "Drone",          type: "action", col: 1, run: () => { state.enemies.push(new Enemy("drone",       W * 0.8, H / 2)); } },
  { lbl: "Arara",          type: "action", col: 1, run: () => { state.enemies.push(new Enemy("arara",       W * 0.8, H / 2)); } },
  { lbl: "OVNI",           type: "action", col: 1, run: () => { state.enemies.push(new Enemy("ovni",        W * 0.8, H / 2)); } },
  { lbl: "Boss",           type: "action", col: 1, run: () => { _spawnBoss?.(); } },
  { lbl: "── DIA/CENA ──", type: "header", col: 1 },
  { lbl: "Vel. dia −",     type: "action", col: 1, run: () => { state.dev.daySpeed = Math.max(0, state.dev.daySpeed - 0.5); } },
  { lbl: "Vel. dia +",     type: "action", col: 1, run: () => { state.dev.daySpeed += 0.5; } },
  { lbl: "Cenário ◀",     type: "action", col: 1, run: () => { state.dev.selectedScene = (state.dev.selectedScene - 1 + DEV_SCENES.length) % DEV_SCENES.length; applyDevScene(); } },
  { lbl: "Cenário ▶",     type: "action", col: 1, run: () => { state.dev.selectedScene = (state.dev.selectedScene + 1) % DEV_SCENES.length; applyDevScene(); } },
  { lbl: "Música ◀",      type: "action", col: 1, run: () => { state.playlistIdx = (state.playlistIdx - 1 + PLAYLISTS.length) % PLAYLISTS.length; state.mIdx = 0; } },
  { lbl: "Música ▶",      type: "action", col: 1, run: () => { state.playlistIdx = (state.playlistIdx + 1) % PLAYLISTS.length; state.mIdx = 0; } },
  { lbl: "Próxima fase",   type: "action", col: 1, run: () => { state.waveNum++; _spawnBoss?.(); } },
  { lbl: "Protótipo X",   type: "action", col: 1, run: () => { _spawnBossType?.("prototipo_x"); } },
  { lbl: "Olho CEMADEN",  type: "action", col: 1, run: () => { _spawnBossType?.("cemaden_eye"); } },
  { lbl: "Engrenagem",    type: "action", col: 1, run: () => { _spawnBossType?.("engrenagem");  } },
  { lbl: "Cigarra",       type: "action", col: 1, run: () => { _spawnBossType?.("cigarra");     } },
  { lbl: "── ──",          type: "header", col: 1 },
  { lbl: "Fechar DEV",    type: "action", col: 1, run: () => { state.dev.open = false; } },
];

export function applyDevScene(): void {
  const s = DEV_SCENES[state.dev.selectedScene];
  if (s && s.phase >= 0) state.dayPhase = s.phase;
}

export function drawDevPanel(): void {
  const { dev, dayPhase, waveNum, currentPhase, playlistIdx, score } = state;
  const COL_W = 192, PAD = 10;
  const PW = COL_W * 2 + PAD * 3;
  const ROW = 18;
  const col0 = DEV_ITEMS.filter(it => it.col === 0);
  const col1 = DEV_ITEMS.filter(it => it.col === 1);
  const PH = Math.max(col0.length, col1.length) * ROW + 70;
  const px = Math.max(4, W - PW - 4), py = 4;
  state.devItemRects = [];

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

  const drawCol = (items: DevItem[], ox: number): void => {
    items.forEach((item) => {
      const i = DEV_ITEMS.indexOf(item);
      const iy = py + 50 + items.indexOf(item) * ROW;
      const selected = dev.cursor === i;

      if (item.type === "header") {
        ctx.fillStyle = "rgba(0,255,136,0.07)";
        ctx.fillRect(ox - 2, iy - ROW + 4, COL_W, ROW - 1);
        ctx.fillStyle = "#00aa55";
        ctx.font = "bold 8px monospace";
        ctx.fillText(item.lbl, ox + 2, iy - 2);
        return;
      }

      state.devItemRects.push({ i, x: ox - 4, y: iy - ROW + 4, w: COL_W + 4, h: ROW - 1 });

      if (selected) {
        ctx.fillStyle = "rgba(0,255,136,0.18)";
        ctx.fillRect(ox - 4, iy - ROW + 4, COL_W + 4, ROW - 1);
      }
      ctx.fillStyle = selected ? "#00ff88" : "#d0d0d0";
      ctx.font = selected ? "bold 9.5px monospace" : "9.5px monospace";
      let label = item.lbl;
      if (item.type === "toggle" && item.get) label += item.get() ? " ●ON" : " ○OFF";
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

export function devHandleKey(code: string): boolean {
  if (!state.dev.open) return false;
  const actionItems = DEV_ITEMS.map((it, i) => ({ it, i })).filter(x => x.it.type !== "header");
  const curPos = actionItems.findIndex(x => x.i === state.dev.cursor);
  if (code === "ArrowUp" || code === "ArrowDown") {
    const dir = code === "ArrowUp" ? -1 : 1;
    const next = (curPos + dir + actionItems.length) % actionItems.length;
    state.dev.cursor = actionItems[next].i;
    return true;
  }
  if (code === "Enter" || code === "Space") {
    const item = DEV_ITEMS[state.dev.cursor];
    if (!item || item.type === "header") return true;
    if (item.type === "toggle" && item.set && item.get) item.set(!item.get());
    else if (item.run) item.run();
    return true;
  }
  return false;
}
