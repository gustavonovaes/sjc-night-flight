import { state } from "./state";
import { ctx, W, H, getSky, VERSION } from "./world";
import {
  STARS, PLANES, DIFFICULTIES, BLDGS, MT1, MT2, MT3, CARS, PARQUE_TREES,
  TOTAL_KEY, DEV_BTN, SHIELD_DUR, BOOST_DUR, BIS_DUR, AVIBRAS_DUR,
  INPE_DUR, REVAP_DUR, DELTA_DUR, ERICSSON_DUR, JOY_MAX, CTYPES, PERKS,
} from "./constants";
import { ST } from "./types";
import type { TreeData } from "./types";

function rng(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

function drawTree(cx: number, cy: number, h: number): void {
  ctx.fillStyle = "#040a04";
  ctx.fillRect(cx - 2, cy - h * 0.26, 4, h * 0.26);
  ctx.fillStyle = "rgba(6,32,7,.96)";
  ctx.beginPath(); ctx.arc(cx, cy - h * 0.72, h * 0.31, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "rgba(9,44,10,.92)";
  ctx.beginPath(); ctx.arc(cx, cy - h * 0.50, h * 0.25, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "rgba(14,58,16,.88)";
  ctx.beginPath(); ctx.arc(cx, cy - h * 0.30, h * 0.18, 0, Math.PI * 2); ctx.fill();
}

function drawSun(sunVis: number): void {
  if (sunVis < 0.01) return;
  const p = Math.max(0, Math.min(1, (state.dayPhase - 0.27) / 0.46));
  const sx = W * 0.85 - p * W * 0.70;
  const sy = H * 0.52 - Math.sin(p * Math.PI) * H * 0.40;
  const nearHoriz = p < 0.14 || p > 0.86;
  const sr = nearHoriz ? 14 : 20;
  const gc = nearHoriz ? [255, 70, 0] : [255, 220, 80];
  const sc = nearHoriz ? [255, 120, 20] : [255, 248, 160];

  const g2 = ctx.createRadialGradient(sx, sy, sr, sx, sy, 160);
  g2.addColorStop(0,   `rgba(${gc[0]},${gc[1]},${gc[2]},${sunVis * (nearHoriz ? 0.28 : 0.14)})`);
  g2.addColorStop(0.5, `rgba(${gc[0]},${gc[1] >> 1},${gc[2]},${sunVis * 0.05})`);
  g2.addColorStop(1,   "rgba(0,0,0,0)");
  ctx.fillStyle = g2;
  ctx.beginPath(); ctx.arc(sx, sy, 160, 0, Math.PI * 2); ctx.fill();

  if (nearHoriz && sunVis > 0.25) {
    ctx.save();
    ctx.translate(sx, sy);
    const rayCount = 12;
    for (let i = 0; i < rayCount; i++) {
      const angle = (i / rayCount) * Math.PI * 2 + (state.frame * 0.0006);
      const len = 110 + (i % 3) * 30;
      const width = 0.06 + (i % 2) * 0.04;
      const rg = ctx.createLinearGradient(0, 0, Math.cos(angle) * len, Math.sin(angle) * len);
      rg.addColorStop(0,   `rgba(${gc[0]},${gc[1] + 40},0,${sunVis * 0.22})`);
      rg.addColorStop(1,   "rgba(0,0,0,0)");
      ctx.fillStyle = rg;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, len, angle - width, angle + width);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  const g = ctx.createRadialGradient(sx, sy, 2, sx, sy, sr * 2.2);
  g.addColorStop(0, `rgba(${sc[0]},${sc[1]},${sc[2]},${sunVis})`);
  g.addColorStop(0.6, `rgba(${gc[0]},${gc[1]},${gc[2]},${sunVis * 0.7})`);
  g.addColorStop(1, `rgba(${gc[0]},${gc[1]},${gc[2]},0)`);
  ctx.fillStyle = g;
  ctx.shadowColor = `rgb(${gc[0]},${gc[1]},${gc[2]})`;
  ctx.shadowBlur = (nearHoriz ? 32 : 18) * sunVis;
  ctx.beginPath(); ctx.arc(sx, sy, sr * 2.2, 0, Math.PI * 2); ctx.fill();
  ctx.shadowBlur = 0;
}

function drawMoon(moonVis: number): void {
  if (moonVis < 0.01) return;
  const raw = state.dayPhase < 0.30 ? state.dayPhase + 0.22 : state.dayPhase - 0.78;
  const p = Math.max(0, Math.min(1, raw / 0.52));
  const mx = W * 0.85 - p * W * 0.70;
  const my = H * 0.50 - Math.sin(p * Math.PI) * H * 0.38;
  const g2 = ctx.createRadialGradient(mx, my, 14, mx, my, 72);
  g2.addColorStop(0, `rgba(200,190,120,${moonVis * 0.15})`);
  g2.addColorStop(0.5, `rgba(160,150,90,${moonVis * 0.07})`);
  g2.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g2;
  ctx.beginPath(); ctx.arc(mx, my, 72, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = `rgba(228,218,168,${moonVis})`;
  ctx.shadowColor = "#ffe8b0";
  ctx.shadowBlur = 14 * moonVis;
  ctx.beginPath(); ctx.arc(mx, my, 13, 0, Math.PI * 2); ctx.fill();
  ctx.shadowBlur = 0;
  ctx.globalAlpha = moonVis;
  ctx.fillStyle = "#08061e";
  ctx.beginPath(); ctx.arc(mx + 7, my - 2, 11, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "rgba(0,0,0,0.18)";
  ([
    [mx - 4, my + 3, 2.5], [mx + 2, my - 5, 1.8], [mx - 1, my + 1, 1.2],
  ] as [number, number, number][]).forEach(([cx2, cy2, cr]) => {
    ctx.beginPath(); ctx.arc(cx2, cy2, cr, 0, Math.PI * 2); ctx.fill();
  });
  ctx.globalAlpha = 1;
}

function drawNebula(starVis: number): void {
  if (starVis < 0.05) return;
  ([
    { y: H * 0.16, h: H * 0.18, r: 90,  g: 12, b: 155, a: starVis * 0.11 },
    { y: H * 0.36, h: H * 0.12, r: 55,  g: 4,  b: 110, a: starVis * 0.07 },
    { y: H * 0.54, h: H * 0.08, r: 160, g: 40, b: 80,  a: starVis * 0.06 },
  ] as { y: number; h: number; r: number; g: number; b: number; a: number }[]).forEach(({ y, h, r, g, b, a }) => {
    const gr = ctx.createLinearGradient(0, y, 0, y + h);
    gr.addColorStop(0, "rgba(0,0,0,0)");
    gr.addColorStop(0.5, `rgba(${r},${g},${b},${a})`);
    gr.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = gr;
    ctx.fillRect(0, y, W, h);
  });
}

function drawParqueDaCidade(off: number): void {
  const tile = W * 4.0;
  const FADE = 200;
  const base = H - 58;
  for (let rep = 0; rep <= 1; rep++) {
    const px = W * 0.5 - (off % tile) + rep * tile;
    if (px > W + 240 || px < -240) continue;
    const fade = px > W - FADE ? Math.max(0, (W - px + 155) / FADE) : 1;
    if (fade < 0.01) continue;
    ctx.save();
    ctx.globalAlpha = fade;
    ctx.fillStyle = "#060e07";
    ctx.beginPath();
    ctx.moveTo(px - 155, base);
    ctx.bezierCurveTo(px - 110, base - 82, px - 32, base - 115, px, base - 122);
    ctx.bezierCurveTo(px + 32, base - 115, px + 110, base - 82, px + 155, base);
    ctx.closePath();
    ctx.fill();
    PARQUE_TREES.forEach(({ ox, h }: TreeData) => {
      const u = ox / 155;
      const hillY = (base - 122) + 122 * u * u;
      drawTree(px + ox, hillY + 6, h);
    });
    ctx.fillStyle = "#0d1c10";
    ctx.fillRect(px - 5, base - 162, 10, 52);
    ctx.fillStyle = "#152618";
    ctx.fillRect(px - 9, base - 166, 18, 7);
    const blink = Math.floor(state.frame / 22) % 2;
    ctx.fillStyle = blink ? "#ff4444" : "rgba(160,16,16,.4)";
    ctx.shadowColor = "#ff2222";
    ctx.shadowBlur = blink ? 9 : 2;
    ctx.beginPath();
    ctx.arc(px, base - 172, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.restore();
  }
}

function drawAnelViario(off: number): void {
  const ry = H - 62;
  ctx.fillStyle = "#040a14";
  ctx.fillRect(0, ry - 5, W, 10);
  ctx.fillStyle = "rgba(255,200,50,.055)";
  for (let x = -(off * 0.9 % 46); x < W + 50; x += 46)
    ctx.fillRect(x, ry - 1, 20, 2);
  CARS.forEach((c) => {
    const pos = (c.offset + off * c.spd * 0.4) % (W * 5);
    const cx = c.lane === 0 ? pos % (W + 60) - 30 : W - (pos % (W + 60) - 30);
    if (cx < -14 || cx > W + 14) return;
    const cy = ry + (c.lane === 0 ? -2.5 : 2.5);
    ctx.fillStyle = c.lane === 0 ? "rgba(255,55,55,.72)" : "rgba(255,235,185,.78)";
    ctx.shadowColor = c.lane === 0 ? "#ff2020" : "#fff8c8";
    ctx.shadowBlur = 5;
    ctx.fillRect(cx - 4, cy - 1.5, 8, 3);
    ctx.shadowBlur = 0;
  });
}

function drawMtRange(pts: number[], off: number, fill: string, alpha: number): void {
  const n = pts.length;
  const step = W / n;
  const tile = n * step;
  const shift = -(off % tile);
  ctx.globalAlpha = alpha || 1;
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.moveTo(shift - 1, H);
  for (let i = 0; i < n; i++) ctx.lineTo(shift + i * step, pts[i]);
  for (let i = 0; i < n; i++) ctx.lineTo(shift + tile + i * step, pts[i]);
  ctx.lineTo(shift + tile * 2 + 1, H);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1;
}

function drawSkyline(off: number): void {
  const TILE = W * 3 + 500;
  const FADE = 160;
  const shift = -(off % TILE);

  for (const b of BLDGS) {
    for (let rep = 0; rep <= 1; rep++) {
      const bx = b.x + shift + rep * TILE;
      if (bx > W + 8 || bx + b.w < -4) continue;

      const fade = bx > W - FADE ? Math.max(0, (W - bx) / FADE) : 1;
      if (fade < 0.01) continue;

      ctx.save();
      ctx.globalAlpha = fade;

      if (b.type === "inpe") {
        ctx.fillStyle = "#0a1a3e";
        ctx.fillRect(bx, H - 58 - b.h, b.w, b.h);
        ctx.fillStyle = "#0f2a5e";
        ctx.beginPath();
        ctx.ellipse(bx + b.w / 2, H - 58 - b.h, 22, 11, 0, Math.PI, 0);
        ctx.fill();
        if (Math.floor(state.frame / 28) % 2) {
          ctx.fillStyle = "#ff4444";
          ctx.shadowColor = "#ff4444";
          ctx.shadowBlur = 7;
          ctx.beginPath();
          ctx.arc(bx + b.w / 2, H - 58 - b.h - 6, 3, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      } else if (b.type === "tech") {
        ctx.fillStyle = "#061020";
        ctx.fillRect(bx, H - 58 - b.h, b.w, b.h);
        ctx.fillStyle = "rgba(28,58,120,.6)";
        for (let r = 0; r < b.h - 10; r += 11)
          ctx.fillRect(bx + 4, H - 58 - b.h + r, b.w - 8, 7);
        ctx.fillStyle = "#3b82f6";
        ctx.shadowColor = "#3b82f6";
        ctx.shadowBlur = 8;
        ctx.fillRect(bx, H - 58 - b.h, b.w, 4);
        ctx.shadowBlur = 0;
      } else if (b.type === "praca") {
        const base = H - 58;
        const top = base - b.h;
        ctx.fillStyle = "#060f08";
        ctx.fillRect(bx, top, b.w, b.h);
        const fx = bx + b.w / 2;
        const fy = base - b.h * 0.55;
        const fg = ctx.createRadialGradient(fx, fy, 0, fx, fy, 20);
        fg.addColorStop(0, `rgba(40,160,255,${0.12 + Math.sin(state.frame * 0.07) * 0.06})`);
        fg.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = fg;
        ctx.beginPath(); ctx.arc(fx, fy, 20, 0, Math.PI * 2); ctx.fill();
        const nt = Math.max(2, Math.floor(b.w / 22));
        for (let i = 0; i < nt; i++)
          drawTree(bx + 10 + (i * (b.w - 20)) / Math.max(nt - 1, 1), base, b.h + 12);
      } else if (b.type === "vincentino") {
        const base = H - 58;
        const top = base - b.h;
        ctx.fillStyle = "#1c0e08";
        ctx.fillRect(bx, top, b.w, b.h);
        ctx.fillStyle = "rgba(50,25,12,.55)";
        for (let ry = 0; ry < b.h; ry += 9)
          ctx.fillRect(bx, top + ry, b.w, 3);
        const arcW = 9;
        const arcSpacing = 14;
        const arcCount = Math.floor((b.w - 14) / arcSpacing);
        for (let i = 0; i < arcCount; i++) {
          const ax = bx + 7 + i * arcSpacing;
          const ay = top + b.h * 0.22;
          const ah = b.h * 0.52;
          ctx.fillStyle = `rgba(255,175,55,${0.20 + Math.sin(state.frame * 0.04 + i * 0.8) * 0.06})`;
          ctx.beginPath();
          ctx.arc(ax + arcW / 2, ay, arcW / 2, Math.PI, 0);
          ctx.rect(ax, ay, arcW, ah);
          ctx.fill();
        }
        ctx.fillStyle = "#2c1810";
        ctx.fillRect(bx - 4, top, b.w + 8, 6);
        ctx.fillStyle = "#3a2015";
        ctx.fillRect(bx - 2, top + 6, b.w + 4, 3);
        const gt = Math.floor(b.w / 26);
        for (let i = 0; i < gt; i++)
          drawTree(bx + 13 + i * ((b.w - 26) / Math.max(gt - 1, 1)), base, 20);
      } else {
        ctx.fillStyle = "#050c18";
        ctx.fillRect(bx, H - 58 - b.h, b.w, b.h);
        const litR = rng(b.litSeed);
        const cols = Math.floor(b.w / 10);
        const rows = Math.floor(b.h / 13);
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            const v = litR();
            if (v > 0.38) {
              ctx.fillStyle = v > 0.72
                ? `rgba(255,220,140,${0.35 + v * 0.38})`
                : `rgba(140,195,255,${0.18 + v * 0.28})`;
              ctx.fillRect(bx + 3 + c * 10, H - 58 - b.h + 3 + r * 13, 6, 7);
            }
          }
        }
      }

      ctx.restore();
    }
  }
}

export function drawBg(): void {
  const sky = getSky(state.dayPhase);
  const sg = ctx.createLinearGradient(0, 0, 0, H);
  sg.addColorStop(0,    sky.zenith);
  sg.addColorStop(0.38, sky.midhi);
  sg.addColorStop(0.68, sky.midlo);
  sg.addColorStop(1,    sky.horizon);
  ctx.fillStyle = sg;
  ctx.fillRect(0, 0, W, H);
  const hg = ctx.createLinearGradient(0, H * 0.70, 0, H);
  hg.addColorStop(0, "rgba(0,0,0,0)");
  hg.addColorStop(1, sky.sun > 0.4
    ? `rgba(220,140,40,${sky.sun * 0.18})`
    : "rgba(180,50,100,.22)");
  ctx.fillStyle = hg;
  ctx.fillRect(0, H * 0.70, W, H * 0.30);
  drawSun(sky.sun);
  drawMoon(sky.moon);
  drawNebula(sky.st);
  if (sky.st > 0.02) {
    const maxA = sky.st;
    STARS.forEach((s) => {
      ctx.globalAlpha = (0.28 + Math.sin(s.tw + state.frame * s.spd) * 0.44) * maxA;
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;
  }
  const isSunrise = state.dayPhase > 0.24 && state.dayPhase < 0.36;
  const isSunset  = state.dayPhase > 0.68 && state.dayPhase < 0.82;
  const isDay     = sky.st < 0.3;

  if (isSunrise || isSunset) {
    const p2 = isSunrise
      ? Math.max(0, Math.min(1, (state.dayPhase - 0.24) / 0.12))
      : Math.max(0, Math.min(1, (state.dayPhase - 0.68) / 0.14));
    const gInt = Math.sin(p2 * Math.PI) * 0.55;
    const hg2 = ctx.createLinearGradient(0, H * 0.42, 0, H * 0.72);
    hg2.addColorStop(0, "rgba(0,0,0,0)");
    hg2.addColorStop(0.5, `rgba(255,90,10,${gInt * 0.28})`);
    hg2.addColorStop(1, `rgba(255,50,0,${gInt * 0.12})`);
    ctx.fillStyle = hg2;
    ctx.fillRect(0, H * 0.42, W, H * 0.30);
    const hStrip = ctx.createLinearGradient(0, H * 0.68, 0, H * 0.75);
    hStrip.addColorStop(0, `rgba(255,160,30,${gInt * 0.5})`);
    hStrip.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = hStrip;
    ctx.fillRect(0, H * 0.68, W, H * 0.07);
  }

  const m1 = isSunrise || isSunset ? "#2a1218" : isDay ? "#1a2c18" : "#16194a";
  const m2 = isSunrise || isSunset ? "#1a0a10" : isDay ? "#102016" : "#0e183c";
  const m3 = isSunrise || isSunset ? "#100608" : isDay ? "#080e0a" : "#080c22";
  drawMtRange(MT1, state.off1, m1, 0.72);
  drawMtRange(MT2, state.off2, m2, 0.88);
  drawMtRange(MT3, state.off3, m3, 1);
  drawSkyline(state.offSky);
  drawAnelViario(state.offSky);
  const gd = ctx.createLinearGradient(0, H - 58, 0, H);
  gd.addColorStop(0, isDay ? "#0e1810" : "#080e18");
  gd.addColorStop(1, isDay ? "#060c08" : "#030910");
  ctx.fillStyle = gd;
  ctx.fillRect(0, H - 58, W, 58);
  ctx.fillStyle = "rgba(255,210,90,.09)";
  for (let x = -(state.offSky % 55); x < W + 55; x += 55)
    ctx.fillRect(x, H - 30, 28, 4);
}

export function drawHUD(): void {
  const { score, hiScore, combo, frame, player, waveT, waveText, dev, diffCfg, audioFailed, fps } = state;
  if (!player) return;

  ctx.fillStyle = "#fff";
  ctx.font = "bold 15px Courier New";
  ctx.textAlign = "left";
  ctx.fillText(`SCORE: ${score}`, 12, 24);
  ctx.fillStyle = "#fbbf24";
  ctx.font = "10px Courier New";
  ctx.fillText(`HI: ${Math.max(hiScore, score)}`, 12, 38);
  if (combo > 1) {
    ctx.fillStyle = combo >= 5 ? "#fbbf24" : "#60a5fa";
    ctx.font = `bold ${11 + combo}px Courier New`;
    ctx.shadowColor = ctx.fillStyle;
    ctx.shadowBlur = 6;
    ctx.fillText(`×${combo} COMBO`, 12, 54);
    ctx.shadowBlur = 0;
  }
  ctx.textAlign = "right";
  for (let i = 0; i < Math.max(player.maxLives, player.lives); i++) {
    ctx.globalAlpha = i < player.lives ? 1 : 0.18;
    ctx.font = "17px sans-serif";
    ctx.fillText("✈", W - 10 - i * 22, 24);
  }
  ctx.globalAlpha = 1;
  if (player.shield > 0) {
    const stacks = Math.min(3, Math.ceil(player.shield / SHIELD_DUR));
    const lifeSlots = Math.max(player.maxLives, player.lives);
    ctx.shadowColor = "#00eeff";
    ctx.shadowBlur = 8 + Math.sin(frame * 0.18) * 4;
    ctx.font = "13px sans-serif";
    for (let i = 0; i < stacks; i++) {
      ctx.globalAlpha = 0.85 + Math.sin(frame * 0.18 + i) * 0.12;
      ctx.fillText("🛡", W - 10 - (lifeSlots + i) * 22, 24);
    }
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
  }
  const BUFFS = [
    { val: player.shield,   max: SHIELD_DUR   * 3, col: "#34d399", icon: "🛡️" },
    { val: player.boost,    max: BOOST_DUR    * 3, col: "#fb923c", icon: "⚡" },
    { val: player.bis,      max: BIS_DUR,           col: "#ffd700", icon: "🛩️" },
    { val: player.avibras,  max: AVIBRAS_DUR  * 2,  col: "#f97316", icon: "🚀" },
    { val: player.inpe,     max: INPE_DUR     * 2,  col: "#60a5fa", icon: "📡" },
    { val: player.revap,    max: REVAP_DUR,          col: "#bfdbfe", icon: "❄️" },
    { val: player.delta,    max: DELTA_DUR    * 2,  col: "#a78bfa", icon: "🪂" },
    { val: player.ericsson, max: ERICSSON_DUR * 2,  col: "#818cf8", icon: "📶" },
  ];
  let buffY = 40;
  const BW = 70;
  BUFFS.forEach(b => {
    if (b.val <= 0) return;
    const secs = Math.ceil(b.val / 60);
    const prog = b.val / b.max;
    ctx.save();
    ctx.textAlign = "right";
    ctx.font = "bold 10px Courier New";
    ctx.fillStyle = b.col;
    ctx.shadowColor = b.col;
    ctx.shadowBlur = 4;
    ctx.fillText(`${b.icon} ${secs}s`, W - 10, buffY);
    ctx.shadowBlur = 0;
    ctx.fillStyle = "rgba(0,0,0,0.4)";
    ctx.fillRect(W - 10 - BW, buffY + 2, BW, 4);
    ctx.fillStyle = b.col;
    ctx.fillRect(W - 10 - BW, buffY + 2, BW * prog, 4);
    ctx.restore();
    buffY += 18;
  });
  // Sinergias de power-up: exibidas abaixo da lista de buffs (lado direito, junto com eles)
  const activeCombos: { name: string; col: string }[] = [];
  if (player.boost > 0 && player.shield > 0)   activeCombos.push({ name: "⚡🛡️ FORTALEZA",      col: "#fbbf24" });
  if (player.avibras > 0 && player.inpe > 0)    activeCombos.push({ name: "🚀📡 RADAR AVIBRAS",   col: "#f97316" });
  if (player.delta > 0 && player.boost > 0)     activeCombos.push({ name: "🪂⚡ HIPERSÔNICO",     col: "#a78bfa" });
  if (player.revap > 0 && player.shield > 0)    activeCombos.push({ name: "❄️🛡️ ESCUDO GLACIAL", col: "#bfdbfe" });
  if (activeCombos.length > 0) {
    if (buffY > 40) buffY += 4; // pequena separação visual após os buffs
    activeCombos.forEach(c => {
      ctx.save();
      ctx.textAlign = "right";
      ctx.font = "bold 9px Courier New";
      ctx.fillStyle = c.col;
      ctx.shadowColor = c.col;
      ctx.shadowBlur = 6;
      ctx.fillText(c.name, W - 10, buffY);
      ctx.shadowBlur = 0;
      ctx.restore();
      buffY += 13;
    });
  }
  ctx.textAlign = "left";
  if (waveT > 0) {
    const a = Math.min(1, waveT / 40);
    ctx.globalAlpha = a;
    ctx.textAlign = "center";
    ctx.fillStyle = "#fbbf24";
    ctx.font = "bold 20px Courier New";
    ctx.shadowColor = "#f59e0b";
    ctx.shadowBlur = 18;
    ctx.fillText(waveText, W / 2, H / 2 - 12);
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
    ctx.textAlign = "left";
  }
  if (dev.escHold > 10) {
    const prog = dev.escHold / 240;
    ctx.save();
    ctx.globalAlpha = 0.7;
    ctx.fillStyle = "#222";
    ctx.fillRect(W / 2 - 55, H - 18, 110, 8);
    ctx.fillStyle = "#00ff88";
    ctx.fillRect(W / 2 - 55, H - 18, 110 * prog, 8);
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = "#00ff88";
    ctx.font = "9px monospace";
    ctx.textAlign = "center";
    ctx.fillText("⚙ DEV", W / 2, H - 22);
    ctx.restore();
  }
  if (diffCfg && diffCfg.id === "radical") {
    ctx.save();
    ctx.fillStyle = "#ef4444";
    ctx.font = "bold 10px monospace";
    ctx.textAlign = "left";
    ctx.shadowColor = "#ef4444";
    ctx.shadowBlur = 6;
    ctx.fillText("🔥 RADICAL", 12, H - 8);
    ctx.shadowBlur = 0;
    ctx.restore();
  }
  if (dev.godMode) {
    ctx.save();
    ctx.fillStyle = "#00ff88";
    ctx.font = "bold 10px monospace";
    ctx.textAlign = "right";
    ctx.fillText("⚙ GOD", W - 8, H - 8);
    ctx.restore();
  }
  if (audioFailed) {
    ctx.save();
    ctx.font = "11px monospace";
    ctx.textAlign = "left";
    ctx.fillStyle = "#fbbf24";
    ctx.shadowColor = "#f59e0b";
    ctx.shadowBlur = 6;
    ctx.fillText("🔇 !", 8, H - 8);
    ctx.shadowBlur = 0;
    ctx.restore();
  }
  ctx.save();
  ctx.font = "9px monospace";
  ctx.textAlign = "right";
  const fpsColor = fps >= 55 ? "#4ade80" : fps >= 40 ? "#fbbf24" : "#f87171";
  ctx.fillStyle = fpsColor;
  ctx.globalAlpha = 0.75;
  ctx.fillText(`${fps} fps`, W - 4, H - 28);
  ctx.globalAlpha = 1;
  ctx.restore();
  drawRadio();
}

export function drawMenu(): void {
  const { frame, selectedPlane, selectedDifficulty, audioFailed } = state;
  const s = ctx.createLinearGradient(0, 0, 0, H);
  s.addColorStop(0, "#020212");
  s.addColorStop(0.5, "#090935");
  s.addColorStop(1, "#16104e");
  ctx.fillStyle = s;
  ctx.fillRect(0, 0, W, H);
  STARS.forEach((st) => {
    ctx.globalAlpha = 0.35 + Math.sin(st.tw + frame * 0.03) * 0.42;
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(st.x, st.y, st.r, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalAlpha = 1;
  STARS.forEach((st) => (st.tw += 0.03));
  ctx.textAlign = "center";
  ctx.fillStyle = "#fff";
  ctx.font = "bold 40px Courier New";
  ctx.shadowColor = "#3b82f6";
  ctx.shadowBlur = 30;
  ctx.fillText("SJC NIGHT FLIGHT", W / 2, H / 2 - 82);
  ctx.shadowBlur = 0;
  ctx.fillStyle = "#60a5fa";
  ctx.font = "bold 14px Courier New";
  ctx.fillText("GUARDIÃO DO VALE DO PARAÍBA", W / 2, H / 2 - 52);
  ctx.save();
  ctx.translate(
    W / 2 + Math.sin(frame * 0.04) * 70,
    H / 2 + Math.cos(frame * 0.04) * 22 - 6,
  );
  ctx.rotate(Math.cos(frame * 0.04) * 0.1);
  drawMiniPlane();
  ctx.restore();
  ctx.fillStyle = "#64748b";
  ctx.font = "10px Courier New";
  ctx.fillText("WASD/Setas — mover  ·  I — sobre o jogo", W / 2, H / 2 + 50);
  ctx.fillStyle = Math.floor(frame / 18) % 2 ? "#fbbf24" : "#f59e0b";
  ctx.font = "bold 15px Courier New";
  ctx.shadowColor = "#fbbf24";
  ctx.shadowBlur = 10;
  const startHint = "ontouchstart" in window
    ? "TOQUE NA TELA PARA DECOLAR"
    : "PRESSIONE ENTER PARA DECOLAR";
  ctx.fillText(startHint, W / 2, H / 2 + 70);
  ctx.shadowBlur = 0;

  const total = parseInt(localStorage.getItem(TOTAL_KEY) || "0");
  const pl = PLANES[selectedPlane];
  const unlocked = total >= pl.unlock;
  const psx = W / 2 - 118, psy = H / 2 + 90;
  ctx.fillStyle = "#1e293b";
  ctx.fillRect(psx, psy, 236, 42);
  ctx.strokeStyle = unlocked ? "#334155" : "#7f1d1d";
  ctx.lineWidth = 1;
  ctx.strokeRect(psx, psy, 236, 42);
  ctx.fillStyle = unlocked ? "#f1f5f9" : "#64748b";
  ctx.font = "bold 10px Courier New";
  ctx.fillText(`◀  ${unlocked ? pl.icon : "🔒"} ${pl.name}  ▶`, W / 2, psy + 14);
  ctx.font = "8.5px Courier New";
  ctx.fillStyle = "#94a3b8";
  ctx.fillText(`SPD ${pl.maxSpd.toFixed(1)}  HP ${pl.lives}  CAD ${pl.fireN}`, W / 2, psy + 27);
  if (!unlocked) {
    ctx.fillStyle = "#fbbf24";
    ctx.font = "7.5px Courier New";
    ctx.fillText(`Desbloqueie com ${pl.unlock} pts totais  (você: ${total})`, W / 2, psy + 38);
  } else {
    ctx.fillStyle = "#334155";
    ctx.font = "7.5px Courier New";
    ctx.fillText("◀ ▶  ou  A D  para trocar", W / 2, psy + 38);
  }

  const diff = DIFFICULTIES[selectedDifficulty];
  const dsy = psy + 46;
  ctx.fillStyle = "#1e293b";
  ctx.fillRect(psx, dsy, 236, 44);
  ctx.strokeStyle = diff.col + "88";
  ctx.lineWidth = 1;
  ctx.strokeRect(psx, dsy, 236, 44);
  ctx.fillStyle = diff.col;
  ctx.shadowColor = diff.col;
  ctx.shadowBlur = 6;
  ctx.font = "bold 11px Courier New";
  ctx.fillText(`↑↓  ${diff.icon} ${diff.name}  ↑↓`, W / 2, dsy + 16);
  ctx.shadowBlur = 0;
  ctx.fillStyle = "#94a3b8";
  ctx.font = "8px Courier New";
  ctx.fillText(diff.desc, W / 2, dsy + 29);
  const hs = parseInt(localStorage.getItem(diff.hsKey) || "0");
  ctx.fillStyle = hs > 0 ? "#fbbf24" : "#334155";
  ctx.font = "8px Courier New";
  ctx.fillText(hs > 0 ? `RECORDE: ${hs}` : "Sem recorde ainda", W / 2, dsy + 40);

  const mby = dsy + 48;
  const mbPulse = Math.abs(Math.sin(frame * 0.04));
  ctx.fillStyle = `rgba(30,10,50,0.9)`;
  ctx.strokeStyle = `rgba(244,114,182,${0.5 + mbPulse * 0.5})`;
  ctx.lineWidth = 1.5;
  if (ctx.roundRect) ctx.roundRect(psx, mby, 236, 22, 4);
  else ctx.rect(psx, mby, 236, 22);
  ctx.fill(); ctx.stroke();
  ctx.fillStyle = `rgb(${200 + (mbPulse * 44 | 0)},${114 - (mbPulse * 30 | 0)},182)`;
  ctx.shadowColor = "#f472b6"; ctx.shadowBlur = mbPulse * 10;
  ctx.font = "bold 10px Courier New";
  ctx.fillText("🌐  MULTIJOGADOR", W / 2, mby + 14);
  ctx.shadowBlur = 0;

  ctx.textAlign = "left";
  if (audioFailed) {
    ctx.save();
    ctx.font = "11px monospace";
    ctx.fillStyle = "#fbbf24";
    ctx.shadowColor = "#f59e0b";
    ctx.shadowBlur = 6;
    ctx.fillText("🔇 !", 8, H - 8);
    ctx.shadowBlur = 0;
    ctx.restore();
  }
  ctx.save();
  ctx.textAlign = "right";
  ctx.font = "8px Courier New";
  ctx.fillStyle = "#334155";
  ctx.fillText(VERSION, W - 6, H - 6);
  ctx.restore();
}

function drawMiniPlane(): void {
  const pid = PLANES[state.selectedPlane]?.id || "tucano";
  if (pid === "e2") {
    ctx.fillStyle = "#bfdbfe";
    ctx.beginPath(); ctx.ellipse(0, 0, 30, 6, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#93c5fd";
    ctx.beginPath();
    ctx.moveTo(-2, -2); ctx.lineTo(-18, -18); ctx.lineTo(-26, -14); ctx.lineTo(-8, -2);
    ctx.closePath(); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-2, 2); ctx.lineTo(-18, 18); ctx.lineTo(-26, 14); ctx.lineTo(-8, 2);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#60a5fa";
    ctx.beginPath(); ctx.ellipse(-10, -16, 5, 2, -0.4, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(-10, 16, 5, 2, 0.4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#3b82f6";
    ctx.beginPath();
    ctx.moveTo(-26, 0); ctx.lineTo(-32, -10); ctx.lineTo(-36, -8); ctx.lineTo(-28, 0);
    ctx.closePath(); ctx.fill();
  } else if (pid === "c390") {
    ctx.fillStyle = "#d1fae5";
    ctx.beginPath(); ctx.ellipse(-2, 0, 26, 8, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#6ee7b7";
    ctx.beginPath();
    ctx.moveTo(2, -2); ctx.lineTo(-10, -24); ctx.lineTo(-20, -22); ctx.lineTo(-6, -2);
    ctx.closePath(); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(2, 2); ctx.lineTo(-10, 24); ctx.lineTo(-20, 22); ctx.lineTo(-6, 2);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#34d399";
    ctx.beginPath(); ctx.ellipse(-8, -18, 6, 2.5, -0.2, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(-8, 18, 6, 2.5, 0.2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#10b981";
    ctx.beginPath();
    ctx.moveTo(-22, 0); ctx.lineTo(-28, -11); ctx.lineTo(-32, -10); ctx.lineTo(-24, 0);
    ctx.closePath(); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-22, 0); ctx.lineTo(-28, 11); ctx.lineTo(-32, 10); ctx.lineTo(-24, 0);
    ctx.closePath(); ctx.fill();
  } else {
    ctx.fillStyle = "#dbeafe";
    ctx.beginPath(); ctx.ellipse(0, 0, 22, 5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#93c5fd";
    ctx.beginPath();
    ctx.moveTo(4, -1); ctx.lineTo(-4, -13); ctx.lineTo(-14, -11); ctx.lineTo(-10, -1);
    ctx.closePath(); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(4, 1); ctx.lineTo(-4, 13); ctx.lineTo(-14, 11); ctx.lineTo(-10, 1);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#2563eb";
    ctx.beginPath();
    ctx.moveTo(-20, 0); ctx.lineTo(-24, -9); ctx.lineTo(-28, -7); ctx.lineTo(-22, 0);
    ctx.closePath(); ctx.fill();
  }
}

export function drawOver(): void {
  const { score, hiScore, frame, waveNum, diffCfg, playerStats } = state;
  ctx.fillStyle = "rgba(0,0,0,.88)";
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = "center";

  const nr = score >= hiScore && score > 0;
  if (nr) {
    ctx.fillStyle = "#fbbf24";
    ctx.shadowColor = "#fbbf24";
    ctx.shadowBlur = 18;
    ctx.font = "bold 12px Courier New";
    ctx.fillText("★ NOVO RECORDE! ★", W / 2, 30);
    ctx.shadowBlur = 0;
  }
  ctx.fillStyle = "#ef4444";
  ctx.shadowColor = "#ef4444";
  ctx.shadowBlur = 14;
  ctx.font = "bold 30px Courier New";
  ctx.fillText("GAME OVER", W / 2, nr ? 58 : 44);
  ctx.shadowBlur = 0;

  const baseY = nr ? 58 : 44;
  ctx.fillStyle = "#fff";
  ctx.font = "bold 17px Courier New";
  ctx.fillText(`PONTUAÇÃO: ${score}`, W / 2, baseY + 32);
  ctx.fillStyle = "#fbbf24";
  ctx.font = "11px Courier New";
  ctx.fillText(`RECORDE: ${Math.max(hiScore, score)}  ·  ONDA ${waveNum + 1}  ·  ${diffCfg.icon} ${diffCfg.name}`, W / 2, baseY + 50);

  const px = 180, pw = W - 360, py = baseY + 66, ph = 224;
  ctx.fillStyle = "#0f172a";
  ctx.fillRect(px, py, pw, ph);
  ctx.strokeStyle = "#1e293b";
  ctx.lineWidth = 1;
  ctx.strokeRect(px, py, pw, ph);

  ctx.fillStyle = "#475569";
  ctx.font = "9px Courier New";
  ctx.fillText("─── ESTATÍSTICAS DA MISSÃO ───", W / 2, py + 14);

  const totalPw = Object.values(playerStats.pw || {}).reduce((a: number, v: number) => a + v, 0);
  const shots = playerStats.shotsFired ?? 0;
  const acc = shots > 0 ? Math.round((playerStats.shotsHit ?? 0) / shots * 100) : 0;
  const survived = playerStats.timeSurvived ?? 0;
  const mm = String(Math.floor(survived / 60)).padStart(2, "0");
  const ss = String(survived % 60).padStart(2, "0");

  const rows: [string, string | number, string, string | number][] = [
    ["Abates",            playerStats.kills ?? 0,               "Tempo de missão",        `${mm}:${ss}`],
    ["Precisão",          `${acc}%`,                            "Ondas perfeitas",        playerStats.wavesWithoutHit ?? 0],
    ["Chefes abatidos",   playerStats.bossKills ?? 0,           "Abates em combo",        playerStats.comboKills ?? 0],
    ["Bloq. de escudo",   playerStats.shieldBlocks ?? 0,        "Quase mortes",           playerStats.nearDeathHits ?? 0],
    ["Rasantes",          playerStats.grazes ?? 0,              "Power-ups coletados",    totalPw],
  ];

  const col1x = px + pw * 0.26;
  const col2x = px + pw * 0.76;
  const colMid = px + pw / 2;

  rows.forEach(([l1, v1, l2, v2], i) => {
    const ry = py + 36 + i * 36;
    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth = 1;
    if (i > 0) { ctx.beginPath(); ctx.moveTo(px + 12, ry - 10); ctx.lineTo(px + pw - 12, ry - 10); ctx.stroke(); }
    ctx.beginPath(); ctx.moveTo(colMid, ry - 8); ctx.lineTo(colMid, ry + 18); ctx.stroke();

    ctx.fillStyle = "#64748b";
    ctx.font = "8px Courier New";
    ctx.textAlign = "center";
    ctx.fillText(String(l1), col1x, ry);
    ctx.fillText(String(l2), col2x, ry);

    ctx.fillStyle = "#e2e8f0";
    ctx.font = "bold 14px Courier New";
    ctx.fillText(String(v1), col1x, ry + 16);
    ctx.fillText(String(v2), col2x, ry + 16);
  });

  const pwEntries = Object.entries(playerStats.pw || {}).sort((a, b) => b[1] - a[1]);
  if (pwEntries.length > 0) {
    const [topId, topN] = pwEntries[0];
    const pwType = CTYPES.find(t => t.id === topId);
    const pwLabel = pwType ? `${pwType.icon} ${pwType.lbl}` : topId;
    ctx.fillStyle = "#475569";
    ctx.font = "8px Courier New";
    ctx.fillText(`FAVORITO: ${pwLabel} ×${topN}`, W / 2, py + ph - 8);
  }

  const msg = score > 6000 ? "Excelente! SJC está orgulhosa!"
    : score > 2500 ? "Bom trabalho, Guardião do Vale!"
    : "SJC precisa de você... Tente de novo!";
  ctx.fillStyle = "#64748b";
  ctx.font = "11px Courier New";
  ctx.fillText(msg, W / 2, py + ph + 20);

  ctx.fillStyle = Math.floor(frame / 18) % 2 ? "#60a5fa" : "#3b82f6";
  ctx.shadowColor = "#3b82f6";
  ctx.shadowBlur = 10;
  ctx.font = "bold 12px Courier New";
  ctx.fillText("ENTER para jogar novamente", W / 2, H - 16);
  ctx.shadowBlur = 0;
  ctx.textAlign = "left";
}

export function drawPause(): void {
  ctx.fillStyle = "rgba(0,0,0,.62)";
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = "center";
  ctx.fillStyle = "#fff";
  ctx.shadowColor = "#60a5fa";
  ctx.shadowBlur = 14;
  ctx.font = "bold 30px Courier New";
  ctx.fillText("PAUSADO", W / 2, H / 2 - 24);
  ctx.shadowBlur = 0;
  ctx.fillStyle = "#94a3b8";
  ctx.font = "13px Courier New";
  ctx.fillText("P ou ESC — continuar", W / 2, H / 2 + 12);
  ctx.fillStyle = "#f87171";
  ctx.font = "12px Courier New";
  ctx.fillText("M — menu principal", W / 2, H / 2 + 34);
  ctx.textAlign = "left";
}

export function drawRadio(): void {
  const { radioT, radioText } = state;
  if (radioT <= 0) return;
  const alpha = Math.min(1, radioT / 30);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = "rgba(0,12,4,0.88)";
  ctx.strokeStyle = "#00ff88";
  ctx.lineWidth = 1;
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(8, H - 52, 320, 42, 4);
  else ctx.rect(8, H - 52, 320, 42);
  ctx.fill(); ctx.stroke();
  ctx.fillStyle = "#00ff88";
  ctx.font = "bold 9px monospace";
  ctx.textAlign = "left";
  ctx.fillText("📻 RÁDIO", 16, H - 38);
  ctx.fillStyle = "#a3e635";
  ctx.font = "8.5px monospace";
  ctx.fillText(radioText.slice(0, 52), 16, H - 25);
  if (radioText.length > 52) ctx.fillText(radioText.slice(52, 104), 16, H - 14);
  ctx.restore();
}

export function drawSobre(): void {
  const { frame } = state;
  ctx.save();
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, "#010118");
  bg.addColorStop(1, "#0a0830");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
  STARS.forEach(s => {
    ctx.globalAlpha = (0.12 + Math.sin(s.tw + frame * 0.02) * 0.15);
    ctx.fillStyle = "#fff";
    ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill();
  });
  ctx.globalAlpha = 1;

  const CX = W / 2;
  const SIDE = 36, GAP = 10, CPAD = 10;
  const LINE_H = 14, TITLE_H = 20;
  const colW = (W - SIDE * 2 - GAP) / 2;

  ctx.textAlign = "center";
  ctx.font = "bold 22px Courier New";
  ctx.shadowColor = "#3b82f6"; ctx.shadowBlur = 18;
  ctx.fillStyle = "#fff";
  ctx.fillText("✈ SJC NIGHT FLIGHT", CX, 34);
  ctx.shadowBlur = 0;
  ctx.font = "10px Courier New";
  ctx.fillStyle = "#60a5fa";
  ctx.fillText("Guardião do Vale do Paraíba", CX, 50);
  ctx.strokeStyle = "rgba(99,102,241,0.35)"; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(SIDE, 58); ctx.lineTo(W - SIDE, 58); ctx.stroke();

  const sections = [
    { title: "🎮 MECÂNICAS", col: "#60a5fa", lines: [
      "WASD / Setas: mover em qualquer direção",
      "Tiro automático — foque em desviar",
      "Combo: destruir seguidos = multiplicador",
      "Rasante: passe perto de bala sem levar dano",
      "Missão CBERS: escorte o satélite até sair",
      "🌅 AVENTURA: diversão garantida, combo 10×, mais powerups",
      "🔥 RADICAL: spawns agressivos, chefes duros, combo 50×",
    ]},
    { title: "🚀 POWER-UPS", col: "#fb923c", lines: [
      "🛡️ Escudo — absorve 1 acerto (acumula ×3)",
      "⚡ Boost — tiro triplo + cadência máx",
      "🛩️ 14-BIS — invencível, biplano Santos-Dumont",
      "🚀 Avibras — mísseis teleguiados a cada 90f",
      "📡 INPE — ímã de coletáveis + barras de HP",
      "❄️ Revap Shock — ondachoque 300px de raio",
      "🪂 Asa Delta — aceleração instantânea",
      "📶 Wingman 5G — drone aliado + escudo orbital",
    ]},
    { title: "👾 INIMIGOS", col: "#f472b6", lines: [
      "☁️ Frente Fria — lenta, atira raios",
      "🔺 Drone DCTA — rápido, movim. oscilatório",
      "🦜 Arara Real — persegue o jogador",
      "🐜 Tanajura — enxame, zigzag",
      "🚁 Helicóptero — spread 3 tiros",
      "🎈 Balão — lento, libera drones ao morrer",
      "🛸 OVNI — raio trator, só à noite",
    ]},
    { title: "💀 CHEFES", col: "#f87171", lines: [
      "⚠️ Monstro Climático — orbes em spread",
      "🚀 Protótipo X — passes rasantes + aceleração",
      "👁️ Olho do CEMADEN — escudo giratório, 3 fases",
      "⚙️ Grande Engrenagem — prensa + orbes ricochete",
      "🦗 A Cigarra — morfa forma, inverte controles",
    ]},
  ];

  function drawCard(sec: { title: string; col: string; lines: string[] }, x: number, y: number, w: number): number {
    const h = TITLE_H + CPAD + sec.lines.length * LINE_H + CPAD;
    ctx.save();
    ctx.fillStyle = "rgba(4,6,24,0.92)";
    ctx.strokeStyle = sec.col + "66";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, w, h, 5);
    else ctx.rect(x, y, w, h);
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = sec.col;
    ctx.font = "bold 10px Courier New";
    ctx.textAlign = "left";
    ctx.shadowColor = sec.col; ctx.shadowBlur = 6;
    ctx.fillText(sec.title, x + CPAD, y + TITLE_H - 2);
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#e2e8f0";
    ctx.font = "9.5px Courier New";
    sec.lines.forEach((l, i) => ctx.fillText(l, x + CPAD, y + TITLE_H + CPAD + i * LINE_H + 2));
    ctx.restore();
    return h;
  }

  const startY = 64;
  const lx = SIDE, rx = SIDE + colW + GAP;
  const h0 = drawCard(sections[0], lx, startY, colW);
  const h1 = drawCard(sections[1], rx, startY, colW);
  const row2Y = startY + Math.max(h0, h1) + GAP;
  drawCard(sections[2], lx, row2Y, colW);
  drawCard(sections[3], rx, row2Y, colW);

  ctx.textAlign = "center";
  ctx.fillStyle = "rgba(251,191,36,0.72)";
  ctx.font = "italic 8px Courier New";
  ctx.fillText(
    "19/05/1986 — A FAB interceptou 21 OVNIs sobre o Vale do Paraíba numa noite que entrou para a história.",
    CX, H - 28,
  );
  const blink = Math.floor(frame / 20) % 2;
  ctx.shadowColor = blink ? "#fbbf24" : "#f59e0b";
  ctx.shadowBlur = blink ? 12 : 4;
  ctx.fillStyle = blink ? "#fbbf24" : "#d97706";
  ctx.font = "bold 11px Courier New";
  ctx.fillText("[ TOQUE OU PRESSIONE QUALQUER TECLA PARA VOLTAR ]", CX, H - 12);
  ctx.shadowBlur = 0;
  ctx.restore();
}

export function drawDevButton(): void {
  const { gState, dev } = state;
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

export function drawJoystick(): void {
  const { cx, cy, kx, ky } = state.touch;
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

// ── Level-up screen ───────────────────────────────────────────────────────────
export function drawLevelUp(): void {
  const cards = state.levelUpCards;
  if (!cards) return;

  // Overlay escuro
  ctx.globalAlpha = 0.78;
  ctx.fillStyle = "#0a0a1a";
  ctx.fillRect(0, 0, W, H);
  ctx.globalAlpha = 1;

  // Cabeçalho
  ctx.textAlign = "center";
  ctx.font = "bold 22px Courier New";
  ctx.fillStyle = "#fde68a";
  ctx.shadowColor = "#fde68a";
  ctx.shadowBlur = 18;
  ctx.fillText(`⭐ NÍVEL ${state.playerLevel} ⭐`, W / 2, 62);
  ctx.shadowBlur = 0;
  ctx.font = "12px Courier New";
  ctx.fillStyle = "#94a3b8";
  ctx.fillText("escolha um aprimoramento permanente", W / 2, 84);

  // Cards
  const CW = 180, CH = 145, GAP = 20;
  const startX = (W - (CW * 3 + GAP * 2)) / 2;
  const startY = 108;

  cards.forEach((perk, i) => {
    const cx = startX + i * (CW + GAP);
    const cy = startY;

    // Fundo
    ctx.globalAlpha = 0.92;
    ctx.fillStyle = "#1e1e2e";
    ctx.beginPath();
    (ctx as CanvasRenderingContext2D & { roundRect: (...a: unknown[]) => void }).roundRect(cx, cy, CW, CH, 10);
    ctx.fill();
    ctx.globalAlpha = 1;

    // Borda
    ctx.strokeStyle = perk.col;
    ctx.lineWidth = 2;
    ctx.shadowColor = perk.col;
    ctx.shadowBlur = 10;
    ctx.beginPath();
    (ctx as CanvasRenderingContext2D & { roundRect: (...a: unknown[]) => void }).roundRect(cx, cy, CW, CH, 10);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Número do card
    ctx.textAlign = "center";
    ctx.font = "bold 11px Courier New";
    ctx.fillStyle = perk.col;
    ctx.fillText(`[ ${i + 1} ]`, cx + CW / 2, cy + 20);

    // Ícone
    ctx.font = "28px sans-serif";
    ctx.fillStyle = "#ffffff";
    ctx.fillText(perk.icon, cx + CW / 2, cy + 53);

    // Nome
    ctx.font = "bold 12px Courier New";
    ctx.fillStyle = "#f1f5f9";
    ctx.shadowColor = perk.col;
    ctx.shadowBlur = 4;
    ctx.fillText(perk.name, cx + CW / 2, cy + 76);
    ctx.shadowBlur = 0;

    // Descrição (duas linhas separadas por \n)
    ctx.font = "10px Courier New";
    ctx.fillStyle = "#94a3b8";
    perk.desc.split("\n").forEach((line, li) => {
      ctx.fillText(line, cx + CW / 2, cy + 97 + li * 14);
    });
  });

  // Dica de tecla
  ctx.font = "10px Courier New";
  ctx.fillStyle = "#475569";
  ctx.textAlign = "center";
  ctx.fillText("pressione 1 · 2 · 3 ou clique no card", W / 2, startY + CH + 26);
  ctx.textAlign = "left";
}

