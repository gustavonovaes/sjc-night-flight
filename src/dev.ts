import { state } from "./state";
import { ctx, W, H } from "./world";
import {
  SHIELD_DUR, BOOST_DUR, BIS_DUR, AVIBRAS_DUR, INPE_DUR, REVAP_DUR,
  DELTA_DUR, ERICSSON_DUR, DEV_SCENES, PLAYLIST_LABELS, PLAYLISTS,
  BOSS_ROTATION, BOSS_LABELS, PERKS,
} from "./constants";
import { Enemy } from "./entities";
import { ST } from "./types";
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
  // col 0 — toggles + buffs
  { lbl: "God Mode",       type: "toggle", col: 0, get: () => state.dev.godMode,           set: v => { state.dev.godMode = v; } },
  { lbl: "Sem projéteis",  type: "toggle", col: 0, get: () => state.dev.noProj,            set: v => { state.dev.noProj = v;  } },
  { lbl: "Hitboxes",       type: "toggle", col: 0, get: () => state.dev.showHitboxes,      set: v => { state.dev.showHitboxes = v; } },
  { lbl: "Debug overlay",  type: "toggle", col: 0, get: () => state.dev.showDebugOverlay,  set: v => { state.dev.showDebugOverlay = v; } },
  { lbl: "── BUFFS ──",    type: "header", col: 0 },
  { lbl: "Escudo",         type: "action", col: 0, run: () => { if (state.player) state.player.shield   = SHIELD_DUR   * 3; } },
  { lbl: "Boost",          type: "action", col: 0, run: () => { if (state.player) state.player.boost    = BOOST_DUR    * 3; } },
  { lbl: "14-BIS",         type: "action", col: 0, run: () => { if (state.player) state.player.bis      = BIS_DUR;          } },
  { lbl: "Pulso Avibras",  type: "action", col: 0, run: () => { if (state.player) { state.player.avibras = AVIBRAS_DUR * 2; state.player.missileT = 0; } } },
  { lbl: "Satélite INPE",  type: "action", col: 0, run: () => { if (state.player) state.player.inpe     = INPE_DUR     * 2; } },
  { lbl: "Revap Shock",    type: "action", col: 0, run: () => { if (state.player) state.player.revap    = REVAP_DUR;        } },
  { lbl: "Asa Delta",      type: "action", col: 0, run: () => { if (state.player) state.player.delta    = DELTA_DUR    * 2; } },
  { lbl: "Wingman 5G",     type: "action", col: 0, run: () => { if (state.player) state.player.ericsson = ERICSSON_DUR * 2; } },
  { lbl: "── VIDAS/INV ──", type: "header", col: 0 },
  { lbl: "Full invuln",    type: "action", col: 0, run: () => { if (state.player) state.player.inv = 9999; } },
  // col 1 — spawn + chefes
  { lbl: "── SPAWN INIMIGOS ──", type: "header", col: 1 },
  { lbl: "Frente Fria",    type: "action", col: 1, run: () => { state.enemies.push(new Enemy("cloud",       W * 0.8, H / 2)); } },
  { lbl: "Drone",          type: "action", col: 1, run: () => { state.enemies.push(new Enemy("drone",       W * 0.8, H / 2)); } },
  { lbl: "Tanajura",       type: "action", col: 1, run: () => { state.enemies.push(new Enemy("tanajura",    W * 0.8, H / 2)); } },
  { lbl: "Helicóptero",    type: "action", col: 1, run: () => { state.enemies.push(new Enemy("helicoptero", W * 0.8, H / 2)); } },
  { lbl: "Balão",          type: "action", col: 1, run: () => { state.enemies.push(new Enemy("balao",       W * 0.8, H / 2)); } },
  { lbl: "Arara",          type: "action", col: 1, run: () => { state.enemies.push(new Enemy("arara",       W * 0.8, H / 2)); } },
  { lbl: "OVNI",           type: "action", col: 1, run: () => { state.enemies.push(new Enemy("ovni",        W * 0.8, H / 2)); } },
  { lbl: "── CHEFES ──",   type: "header", col: 1 },
  { lbl: "Boss Climático", type: "action", col: 1, run: () => { _spawnBossType?.("boss"); } },
  { lbl: "Protótipo X",    type: "action", col: 1, run: () => { _spawnBossType?.("prototipo_x"); } },
  { lbl: "Olho CEMADEN",   type: "action", col: 1, run: () => { _spawnBossType?.("cemaden_eye"); } },
  { lbl: "Engrenagem",     type: "action", col: 1, run: () => { _spawnBossType?.("engrenagem");  } },
  { lbl: "Cigarra",        type: "action", col: 1, run: () => { _spawnBossType?.("cigarra");     } },
  { lbl: "── WAVES ──",    type: "header", col: 1 },
  { lbl: "Forçar boss",    type: "action", col: 1, run: () => { _spawnBoss?.(); } },
  { lbl: "Próxima fase",   type: "action", col: 1, run: () => { state.waveNum++; _spawnBoss?.(); } },
  { lbl: "Limpar inimigos",type: "action", col: 1, run: () => { state.enemies.forEach(e => { e.dead = true; }); } },
  // col 2 — mundo + utilidades
  { lbl: "── DIA / CENA ──", type: "header", col: 2 },
  { lbl: "Vel. dia −",     type: "action", col: 2, run: () => { state.dev.daySpeed = Math.max(0, state.dev.daySpeed - 0.5); } },
  { lbl: "Vel. dia +",     type: "action", col: 2, run: () => { state.dev.daySpeed += 0.5; } },
  { lbl: "◀ Cenário",      type: "action", col: 2, run: () => { state.dev.selectedScene = (state.dev.selectedScene - 1 + DEV_SCENES.length) % DEV_SCENES.length; applyDevScene(); } },
  { lbl: "  Cenário ▶",      type: "action", col: 2, run: () => { state.dev.selectedScene = (state.dev.selectedScene + 1) % DEV_SCENES.length; applyDevScene(); } },
  { lbl: "── ÁUDIO ──",    type: "header", col: 2 },
  { lbl: "◀ Música",       type: "action", col: 2, run: () => { state.playlistIdx = (state.playlistIdx - 1 + PLAYLISTS.length) % PLAYLISTS.length; state.mIdx = 0; } },
  { lbl: "  Música ▶",       type: "action", col: 2, run: () => { state.playlistIdx = (state.playlistIdx + 1) % PLAYLISTS.length; state.mIdx = 0; } },
  { lbl: "── SCORE ──",    type: "header", col: 2 },
  { lbl: "+1 000 000 pts", type: "action", col: 2, run: () => { state.score += 1_000_000; } },
  { lbl: "Zerar score",    type: "action", col: 2, run: () => { state.score = 0; } },
  { lbl: "── APRIMORAMENTOS ──", type: "header", col: 2 },
  ...PERKS.map(p => ({
    lbl: `${p.icon} ${p.name}`,
    type: "action" as const,
    col: 2 as const,
    run: () => {
      if (!state.player) return;
      const pl = state.player;
      switch (p.id) {
        case "bullet_resist": pl.perks.bulletEvasion   = Math.min(0.9, pl.perks.bulletEvasion  + 0.30); break;
        case "impact_resist": pl.perks.impactEvasion   = Math.min(0.9, pl.perks.impactEvasion  + 0.30); break;
        case "damage_up":     pl.perks.dmgBonus++;                                                       break;
        case "speed_up":      pl.topSpd               += 0.8;                                            break;
        case "extra_life":    pl.lives++; pl.maxLives++;                                                 break;
        case "fire_rate":     pl._fireN                = Math.max(4, Math.round(pl._fireN * 0.85));      break;
        case "graze_range":   pl.perks.grazeRadiusMult += 0.35;                                          break;
        case "combo_time":    pl.perks.comboTimeMult   += 0.30;                                          break;
        case "inv_extend":    pl.perks.invMult         += 0.50;                                          break;
      }
      state.chosenPerks.push(p);
      state.playerLevel++;
    },
  })),
  { lbl: "── FECHAR ──",     type: "header", col: 2 },
  { lbl: "Fechar DEV",     type: "action", col: 2, run: () => { state.dev.open = false; } },
];

export function applyDevScene(): void {
  const s = DEV_SCENES[state.dev.selectedScene];
  if (s && s.phase >= 0) state.dayPhase = s.phase;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function bar(
  x: number, y: number, w: number, h: number,
  val: number, max: number, col: string, bg = "rgba(255,255,255,0.07)",
): void {
  ctx.fillStyle = bg;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = col;
  ctx.fillRect(x, y, w * Math.min(1, val / max), h);
}

function label(text: string, x: number, y: number, col = "#9ca3af", fnt = "8px monospace"): void {
  ctx.font = fnt;
  ctx.fillStyle = col;
  ctx.fillText(text, x, y);
}

// ── Main panel draw ───────────────────────────────────────────────────────────
export function drawDevPanel(): void {
  const { dev, dayPhase, waveNum, currentPhase, playlistIdx, score, frame, spawnT, collectT,
    bossAlive, bossKills, diffCfg, ddaStress, enemies, eBullets, bullets, particles, floaters,
    playerLevel, playerStats,
  } = state as typeof state & { bossKills?: number };
  const player = state.player;

  const COL_W = 168, PAD = 8;
  const NCOLS = 3;
  const PW = COL_W * NCOLS + PAD * (NCOLS + 1);
  const ROW = 14;
  const col0 = DEV_ITEMS.filter(it => it.col === 0);
  const col1 = DEV_ITEMS.filter(it => it.col === 1);
  const col2 = DEV_ITEMS.filter(it => it.col === 2);
  const maxRows = Math.max(col0.length, col1.length, col2.length);
  const px = Math.max(4, W - PW - 4), py = 4;
  const PH = Math.min(maxRows * ROW + 106, H - py - 2);
  state.devItemRects = [];

  ctx.save();

  // Panel background
  ctx.globalAlpha = 0.97;
  ctx.fillStyle = "#080814";
  ctx.strokeStyle = "#00ff88";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(px, py, PW, PH, 8);
  else ctx.rect(px, py, PW, PH);
  ctx.fill(); ctx.stroke();
  ctx.globalAlpha = 1;

  // Scanline subtle effect
  for (let sy = py + 2; sy < py + PH; sy += 3) {
    ctx.fillStyle = "rgba(0,0,0,0.06)";
    ctx.fillRect(px + 2, sy, PW - 4, 1);
  }

  // ── HEADER ──────────────────────────────────────────────────────────────────
  const headerY = py + 13;
  ctx.fillStyle = "#00ff88";
  ctx.font = "bold 10px monospace";
  ctx.textAlign = "left";
  ctx.fillText("⚙ DEV CONSOLE", px + PAD, headerY);
  ctx.fillStyle = "#374151";
  ctx.font = "8px monospace";
  ctx.fillText("[↑↓+Enter / toque]", px + PAD + 106, headerY);

  // ── TELEMETRY BAR ────────────────────────────────────────────────────────────
  const ty = py + 22;
  const tLineH = 9;

  const isPlaying = state.gState === ST.PLAY || state.gState === ST.MULTI;

  // Row 1: frame/wave/score
  const framesUntilBoss = isPlaying && !bossAlive && diffCfg
    ? (diffCfg.bossInterval - (frame % diffCfg.bossInterval))
    : 0;
  const secsToBoss = (framesUntilBoss / 60).toFixed(1);
  const nextBossType = BOSS_ROTATION[Math.floor(waveNum) % BOSS_ROTATION.length];
  const nextBossLbl = BOSS_LABELS[nextBossType] ?? nextBossType;

  ctx.fillStyle = "rgba(0,255,136,0.06)";
  ctx.fillRect(px + 2, ty - 1, PW - 4, tLineH * 5 + 8);

  const col1x = px + PAD;
  const col2x = px + PAD + Math.floor(PW * 0.38);
  const col3x = px + PAD + Math.floor(PW * 0.70);

  // Row 1
  label(`frame: ${frame}`,            col1x, ty + tLineH * 0);
  label(`wave: ${waveNum}`,           col2x, ty + tLineH * 0, "#93c5fd");
  label(`score: ${score}`,            col3x, ty + tLineH * 0, "#fbbf24");
  // Row 2
  label(`spawnT: ${spawnT}`,          col1x, ty + tLineH * 1, "#94a3b8");
  label(`phase: ${currentPhase}`,     col2x, ty + tLineH * 1, "#94a3b8");
  label(`lvl: ${playerLevel}`,        col3x, ty + tLineH * 1, "#a78bfa");
  // Row 3
  label(`enemies: ${enemies.length}`, col1x, ty + tLineH * 2, "#f87171");
  label(`eBullets: ${eBullets.length}`, col2x, ty + tLineH * 2, "#f87171");
  label(`bullets: ${bullets.length}`,  col3x, ty + tLineH * 2, "#60a5fa");
  // Row 4: boss countdown
  if (!bossAlive && diffCfg) {
    if (!isPlaying) {
      label("⏸ PAUSADO — countdown suspenso", col1x, ty + tLineH * 3 - 1, "#6b7280");
    } else {
      const pct = 1 - framesUntilBoss / diffCfg.bossInterval;
      bar(col1x, ty + tLineH * 3 + 1, PW - PAD * 2, 4, pct, 1, "#ef4444");
      label(
        `⚠ próx. boss: ${secsToBoss}s  [${nextBossLbl}]`,
        col1x, ty + tLineH * 3 - 1, "#ef4444",
      );
    }
  } else if (bossAlive) {
    label("⚔ BOSS VIVO", col1x, ty + tLineH * 3 - 1, "#ef4444", "bold 8px monospace");
  }
  // Row 5: DDA + particles
  if (diffCfg) {
    const ddaOn = diffCfg.id === "aventura";
    bar(col1x, ty + tLineH * 4 + 1, 70, 4, ddaStress, 1,
      !ddaOn ? "#374151" : ddaStress > 0.7 ? "#ef4444" : ddaStress > 0.4 ? "#fbbf24" : "#34d399");
    label(
      ddaOn ? `DDA: ${(ddaStress * 100).toFixed(0)}%` : `DDA: OFF (radical)`,
      col1x, ty + tLineH * 4 - 1, ddaOn ? "#d1d5db" : "#4b5563",
    );
  }
  label(`particles: ${particles.length}`, col2x, ty + tLineH * 4, "#6b7280");
  label(`floaters: ${floaters.length}`,   col3x, ty + tLineH * 4, "#6b7280");

  // ── PLAYER TELEMETRY ─────────────────────────────────────────────────────────
  if (player) {
    const ptY = ty + tLineH * 5 + 10;
    ctx.fillStyle = "rgba(0,100,255,0.07)";
    ctx.fillRect(px + 2, ptY - 1, PW - 4, tLineH * 3 + 6);

    label(`pos: (${player.x.toFixed(0)}, ${player.y.toFixed(0)})`, col1x, ptY + tLineH * 0, "#93c5fd");
    label(`vel: (${player.vx.toFixed(2)}, ${player.vy.toFixed(2)})`, col2x, ptY + tLineH * 0, "#93c5fd");
    label(`inv: ${player.inv}`, col3x, ptY + tLineH * 0, player.inv > 0 ? "#fde68a" : "#4b5563");
    label(`lives: ${player.lives}/${player.maxLives}`, col1x, ptY + tLineH * 1, "#f87171");
    label(`spd: ${player.topSpd.toFixed(1)}  fireN: ${player._fireN}`, col2x, ptY + tLineH * 1, "#d1d5db");
    label(`perks: dmg+${player.perks.dmgBonus} rng×${player.perks.grazeRadiusMult.toFixed(2)}`, col3x, ptY + tLineH * 1, "#c084fc");
    label(`bEvasion: ${(player.perks.bulletEvasion * 100).toFixed(0)}%`, col1x, ptY + tLineH * 2, "#94a3b8");
    label(`iEvasion: ${(player.perks.impactEvasion * 100).toFixed(0)}%  invMult: ×${player.perks.invMult.toFixed(2)}`, col2x, ptY + tLineH * 2, "#94a3b8");
    label(`kills: ${playerStats?.kills ?? 0}  grazes: ${playerStats?.grazes ?? 0}`, col3x, ptY + tLineH * 2, "#64748b");
  }

  // ── SEPARATOR BEFORE ITEMS ───────────────────────────────────────────────────
  const itemsStartY = py + (player ? 100 : 78);
  ctx.strokeStyle = "rgba(0,255,136,0.15)";
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(px + PAD, itemsStartY - 4); ctx.lineTo(px + PW - PAD, itemsStartY - 4); ctx.stroke();

  // column dividers
  for (let c = 1; c < NCOLS; c++) {
    const divX = px + PAD + COL_W * c + PAD * c + PAD / 2;
    ctx.beginPath(); ctx.moveTo(divX, itemsStartY); ctx.lineTo(divX, py + PH - 6); ctx.stroke();
  }

  // ── ITEM COLUMNS ─────────────────────────────────────────────────────────────
  const drawCol = (items: DevItem[], ox: number): void => {
    items.forEach((item) => {
      const i = DEV_ITEMS.indexOf(item);
      const iy = itemsStartY + items.indexOf(item) * ROW;
      const selected = dev.cursor === i;

      if (item.type === "header") {
        ctx.fillStyle = "rgba(0,255,136,0.06)";
        ctx.fillRect(ox - 2, iy - 1, COL_W + 2, ROW - 1);
        ctx.fillStyle = "#00aa55";
        ctx.font = "bold 7.5px monospace";
        ctx.textAlign = "left";
        ctx.fillText(item.lbl, ox + 2, iy + 9);
        return;
      }

      state.devItemRects.push({ i, x: ox - 4, y: iy - 1, w: COL_W + 4, h: ROW - 1 });

      if (selected) {
        ctx.fillStyle = "rgba(0,255,136,0.14)";
        ctx.fillRect(ox - 4, iy - 1, COL_W + 4, ROW - 1);
        ctx.strokeStyle = "rgba(0,255,136,0.4)";
        ctx.lineWidth = 0.5;
        ctx.strokeRect(ox - 4, iy - 1, COL_W + 4, ROW - 1);
      }

      let lclr = selected ? "#00ff88" : "#d1d5db";
      if (item.type === "toggle" && item.get?.()) lclr = "#34d399";

      ctx.fillStyle = lclr;
      ctx.font = selected ? "bold 9px monospace" : "9px monospace";
      ctx.textAlign = "left";
      let lbl = item.lbl;
      if (item.type === "toggle" && item.get) {
        const on = item.get();
        lbl += on ? " ●" : " ○";
        if (!selected) ctx.fillStyle = on ? "#34d399" : "#6b7280";
      }
      ctx.fillText((selected ? "▶ " : "  ") + lbl, ox, iy + 10);
    });
  };

  drawCol(col0, px + PAD);
  drawCol(col1, px + PAD * 2 + COL_W);
  drawCol(col2, px + PAD * 3 + COL_W * 2);

  // footer
  ctx.font = "7px monospace";
  ctx.fillStyle = "#374151";
  ctx.textAlign = "center";
  ctx.fillText("ESC fecha  •  ↑↓ navega  •  Enter/Space activa", px + PW / 2, py + PH - 4);
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
