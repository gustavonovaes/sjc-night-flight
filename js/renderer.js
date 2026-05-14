"use strict";

let off1 = 0;
let off2 = 0;
let off3 = 0;
let offSky = 0;

function drawTree(cx, cy, h) {
  ctx.fillStyle = "#040a04";
  ctx.fillRect(cx - 2, cy - h * 0.26, 4, h * 0.26);
  ctx.fillStyle = "rgba(6,32,7,.96)";
  ctx.beginPath(); ctx.arc(cx, cy - h * 0.72, h * 0.31, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "rgba(9,44,10,.92)";
  ctx.beginPath(); ctx.arc(cx, cy - h * 0.50, h * 0.25, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "rgba(14,58,16,.88)";
  ctx.beginPath(); ctx.arc(cx, cy - h * 0.30, h * 0.18, 0, Math.PI * 2); ctx.fill();
}

function drawSun(sunVis) {
  if (sunVis < 0.01) return;
  const p = Math.max(0, Math.min(1, (dayPhase - 0.27) / 0.46));
  const sx = W * 0.85 - p * W * 0.70;
  const sy = H * 0.52 - Math.sin(p * Math.PI) * H * 0.40;
  const nearHoriz = p < 0.13 || p > 0.87;
  const sr = nearHoriz ? 15 : 20;
  const gc = nearHoriz ? [255, 80, 0] : [255, 220, 80];
  const sc = nearHoriz ? [255, 110, 30] : [255, 245, 150];
  const g = ctx.createRadialGradient(sx, sy, 2, sx, sy, 88);
  g.addColorStop(0, `rgba(${gc[0]},${gc[1]},${gc[2]},${sunVis * 0.38})`);
  g.addColorStop(0.4, `rgba(${gc[0]},${gc[1]},${gc[2]},${sunVis * 0.08})`);
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(sx, sy, 88, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = `rgba(${sc[0]},${sc[1]},${sc[2]},${sunVis})`;
  ctx.shadowColor = `rgb(${gc[0]},${gc[1]},${gc[2]})`;
  ctx.shadowBlur = 22 * sunVis;
  ctx.beginPath(); ctx.arc(sx, sy, sr, 0, Math.PI * 2); ctx.fill();
  ctx.shadowBlur = 0;
}

function drawMoon(moonVis) {
  if (moonVis < 0.01) return;
  const raw = dayPhase < 0.30 ? dayPhase + 0.22 : dayPhase - 0.78;
  const p = Math.max(0, Math.min(1, raw / 0.52));
  const mx = W * 0.85 - p * W * 0.70;
  const my = H * 0.50 - Math.sin(p * Math.PI) * H * 0.38;
  const g = ctx.createRadialGradient(mx, my, 3, mx, my, 48);
  g.addColorStop(0, `rgba(240,220,150,${moonVis * 0.20})`);
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(mx, my, 48, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = `rgba(216,207,158,${moonVis})`;
  ctx.shadowColor = "#ffe8a8";
  ctx.shadowBlur = 10 * moonVis;
  ctx.beginPath(); ctx.arc(mx, my, 13, 0, Math.PI * 2); ctx.fill();
  ctx.shadowBlur = 0;
  ctx.globalAlpha = moonVis;
  ctx.fillStyle = "#0e0620";
  ctx.beginPath(); ctx.arc(mx + 6, my - 3, 11, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 1;
}

function drawNebula(starVis) {
  if (starVis < 0.05) return;
  [
    { y: H * 0.16, h: H * 0.18, r: 90,  g: 12, b: 155, a: starVis * 0.11 },
    { y: H * 0.36, h: H * 0.12, r: 55,  g: 4,  b: 110, a: starVis * 0.07 },
    { y: H * 0.54, h: H * 0.08, r: 160, g: 40, b: 80,  a: starVis * 0.06 },
  ].forEach(({ y, h, r, g, b, a }) => {
    const gr = ctx.createLinearGradient(0, y, 0, y + h);
    gr.addColorStop(0, "rgba(0,0,0,0)");
    gr.addColorStop(0.5, `rgba(${r},${g},${b},${a})`);
    gr.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = gr;
    ctx.fillRect(0, y, W, h);
  });
}

function drawParqueDaCidade(off) {
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
    PARQUE_TREES.forEach(({ ox, h }) => {
      // aproximação parabólica da superfície do morro para enraizar as árvores corretamente
      const u = ox / 155;
      const hillY = (base - 122) + 122 * u * u;
      drawTree(px + ox, hillY + 6, h);
    });
    ctx.fillStyle = "#0d1c10";
    ctx.fillRect(px - 5, base - 162, 10, 52);
    ctx.fillStyle = "#152618";
    ctx.fillRect(px - 9, base - 166, 18, 7);
    const blink = Math.floor(frame / 22) % 2;
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

function drawAnelViario(off) {
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

function drawMtRange(pts, off, fill, alpha) {
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

function drawSkyline(off) {
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
        if (Math.floor(frame / 28) % 2) {
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
        fg.addColorStop(0, `rgba(40,160,255,${0.12 + Math.sin(frame * 0.07) * 0.06})`);
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
          ctx.fillStyle = `rgba(255,175,55,${0.20 + Math.sin(frame * 0.04 + i * 0.8) * 0.06})`;
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

function drawBg() {
  const sky = getSky();
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
      ctx.globalAlpha = (0.30 + Math.sin(s.tw) * 0.44) * maxA;
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;
  }
  const isSunrise = dayPhase > 0.24 && dayPhase < 0.36;
  const isSunset  = dayPhase > 0.68 && dayPhase < 0.82;
  const isDay     = sky.st < 0.3;
  const m1 = isSunrise || isSunset ? "#2a1218" : isDay ? "#1a2c18" : "#16194a";
  const m2 = isSunrise || isSunset ? "#1a0a10" : isDay ? "#102016" : "#0e183c";
  const m3 = isSunrise || isSunset ? "#100608" : isDay ? "#080e0a" : "#080c22";
  drawMtRange(MT1, off1, m1, 0.72);
  drawMtRange(MT2, off2, m2, 0.88);
  drawMtRange(MT3, off3, m3, 1);
  drawParqueDaCidade(offSky * 0.62);
  drawSkyline(offSky);
  drawAnelViario(offSky);
  const gd = ctx.createLinearGradient(0, H - 58, 0, H);
  gd.addColorStop(0, isDay ? "#0e1810" : "#080e18");
  gd.addColorStop(1, isDay ? "#060c08" : "#030910");
  ctx.fillStyle = gd;
  ctx.fillRect(0, H - 58, W, 58);
  ctx.fillStyle = "rgba(255,210,90,.09)";
  for (let x = -(offSky % 55); x < W + 55; x += 55)
    ctx.fillRect(x, H - 30, 28, 4);
  if (lightningT > 0) {
    ctx.fillStyle = `rgba(220,230,255,${lightningT * 0.25})`;
    ctx.fillRect(0, 0, W, H);
  }
}

function drawHUD() {
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
  for (let i = 0; i < MAX_LIVES; i++) {
    ctx.globalAlpha = i < player.lives ? 1 : 0.18;
    ctx.font = "17px sans-serif";
    ctx.fillText("✈", W - 10 - i * 22, 24);
  }
  ctx.globalAlpha = 1;
  // Buffs ativos com barra de progresso e tempo restante
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
    // barra de progresso
    ctx.fillStyle = "rgba(0,0,0,0.4)";
    ctx.fillRect(W - 10 - BW, buffY + 2, BW, 4);
    ctx.fillStyle = b.col;
    ctx.fillRect(W - 10 - BW, buffY + 2, BW * prog, 4);
    ctx.restore();
    buffY += 18;
  });
  if (Math.abs(windX) > 0.05) {
    ctx.save();
    ctx.fillStyle = "#93c5fd";
    ctx.font = "10px monospace";
    ctx.textAlign = "center";
    ctx.globalAlpha = 0.75;
    ctx.fillText(`${windX > 0 ? "→→" : "←←"} VENTO`, W / 2, 15);
    ctx.restore();
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
  // barra de progresso ao segurar ESC para abrir painel dev
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
  if (dev.godMode) {
    ctx.save();
    ctx.fillStyle = "#00ff88";
    ctx.font = "bold 10px monospace";
    ctx.textAlign = "right";
    ctx.fillText("⚙ GOD", W - 8, H - 8);
    ctx.restore();
  }
  // FPS — canto inferior direito, acima do botão DEV
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

function drawMenu() {
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
  ctx.fillStyle = "#94a3b8";
  ctx.font = "11px Courier New";
  ctx.fillText(
    "↑↓←→ ou WASD para mover  ·  Destrua inimigos  ·  Colete tokens",
    W / 2,
    H / 2 + 52,
  );
  ctx.fillStyle = "#64748b";
  ctx.font = "10px Courier New";
  ctx.fillText(
    "INIMIGOS: ☁️ Frente Fria  🔺 Drone DCTA  🦜 Arara Real  🛸 Disco Voador  💀 Chefe",
    W / 2,
    H / 2 + 70,
  );
  ctx.fillText(
    "POWER-UPS: 🛡️ Escudo CEMADEN   ⚡ Turbo Embraer",
    W / 2,
    H / 2 + 86,
  );
  ctx.fillStyle = Math.floor(frame / 18) % 2 ? "#fbbf24" : "#f59e0b";
  ctx.font = "bold 15px Courier New";
  ctx.shadowColor = "#fbbf24";
  ctx.shadowBlur = 10;
  const startHint = "ontouchstart" in window
    ? "TOQUE NA TELA PARA DECOLAR"
    : "PRESSIONE ENTER PARA DECOLAR";
  ctx.fillText(startHint, W / 2, H / 2 + 112);
  ctx.shadowBlur = 0;
  ctx.fillStyle = "#475569";
  ctx.font = "9px Courier New";
  ctx.fillText("I — sobre o jogo", W / 2, H / 2 + 126);

  // Plane selector panel
  const total = parseInt(localStorage.getItem(TOTAL_KEY) || "0");
  const pl = PLANES[selectedPlane];
  const unlocked = total >= pl.unlock;
  const psx = W / 2 - 118, psy = H / 2 + 138;
  ctx.fillStyle = "#1e293b";
  ctx.fillRect(psx, psy, 236, 46);
  ctx.strokeStyle = unlocked ? "#334155" : "#7f1d1d";
  ctx.lineWidth = 1;
  ctx.strokeRect(psx, psy, 236, 46);
  ctx.fillStyle = unlocked ? "#f1f5f9" : "#64748b";
  ctx.font = "bold 10px Courier New";
  ctx.fillText(`◀  ${unlocked ? pl.icon : "🔒"} ${pl.name}  ▶`, W / 2, psy + 15);
  ctx.font = "8.5px Courier New";
  ctx.fillStyle = "#94a3b8";
  ctx.fillText(`SPD ${pl.maxSpd.toFixed(1)}  HP ${pl.lives}  CAD ${pl.fireN}`, W / 2, psy + 28);
  if (!unlocked) {
    ctx.fillStyle = "#fbbf24";
    ctx.font = "7.5px Courier New";
    ctx.fillText(`Desbloqueie com ${pl.unlock} pts totais  (você: ${total})`, W / 2, psy + 41);
  } else {
    ctx.fillStyle = "#334155";
    ctx.font = "7.5px Courier New";
    ctx.fillText("◀ ▶  ou  A D  para trocar", W / 2, psy + 41);
  }

  const hs = parseInt(localStorage.getItem(HS_KEY) || "0");
  if (hs > 0) {
    ctx.fillStyle = "#fbbf24";
    ctx.font = "10px Courier New";
    ctx.fillText(`RECORDE: ${hs}`, W / 2, psy + 58);
  }
  ctx.fillStyle = "#2d3748";
  ctx.font = "9px Courier New";
  ctx.fillText(
    "Embraer · INPE · ITA · DCTA · Parque Tecnológico · CEMADEN",
    W / 2,
    H - 8,
  );
  ctx.textAlign = "left";
}

function drawMiniPlane() {
  const pid = PLANES[selectedPlane]?.id || "tucano";
  if (pid === "e2") {
    // Embraer E2: jato comercial, fuselagem longa, asas traseiras em flecha
    ctx.fillStyle = "#bfdbfe";
    ctx.beginPath(); ctx.ellipse(0, 0, 30, 6, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#93c5fd";
    // asa principal varrida para trás
    ctx.beginPath();
    ctx.moveTo(-2, -2); ctx.lineTo(-18, -18); ctx.lineTo(-26, -14); ctx.lineTo(-8, -2);
    ctx.closePath(); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-2, 2); ctx.lineTo(-18, 18); ctx.lineTo(-26, 14); ctx.lineTo(-8, 2);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#60a5fa";
    // winglets e motores
    ctx.beginPath(); ctx.ellipse(-10, -16, 5, 2, -0.4, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(-10, 16, 5, 2, 0.4, 0, Math.PI * 2); ctx.fill();
    // cauda em T
    ctx.fillStyle = "#3b82f6";
    ctx.beginPath();
    ctx.moveTo(-26, 0); ctx.lineTo(-32, -10); ctx.lineTo(-36, -8); ctx.lineTo(-28, 0);
    ctx.closePath(); ctx.fill();
  } else if (pid === "c390") {
    // C-390 Millennium: turbopropulsor militar, corpo largo, cauda alta
    ctx.fillStyle = "#d1fae5";
    ctx.beginPath(); ctx.ellipse(-2, 0, 26, 8, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#6ee7b7";
    // asas altas retas
    ctx.beginPath();
    ctx.moveTo(2, -2); ctx.lineTo(-10, -24); ctx.lineTo(-20, -22); ctx.lineTo(-6, -2);
    ctx.closePath(); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(2, 2); ctx.lineTo(-10, 24); ctx.lineTo(-20, 22); ctx.lineTo(-6, 2);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#34d399";
    // 2 motores sob as asas
    ctx.beginPath(); ctx.ellipse(-8, -18, 6, 2.5, -0.2, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(-8, 18, 6, 2.5, 0.2, 0, Math.PI * 2); ctx.fill();
    // rampa traseira / cauda larga
    ctx.fillStyle = "#10b981";
    ctx.beginPath();
    ctx.moveTo(-22, 0); ctx.lineTo(-28, -11); ctx.lineTo(-32, -10); ctx.lineTo(-24, 0);
    ctx.closePath(); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-22, 0); ctx.lineTo(-28, 11); ctx.lineTo(-32, 10); ctx.lineTo(-24, 0);
    ctx.closePath(); ctx.fill();
  } else {
    // Tucano / padrão: caça azul original
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

function drawOver() {
  ctx.fillStyle = "rgba(0,0,0,.86)";
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = "center";
  const nr = score >= hiScore && score > 0;
  if (nr) {
    ctx.fillStyle = "#fbbf24";
    ctx.shadowColor = "#fbbf24";
    ctx.shadowBlur = 18;
    ctx.font = "bold 13px Courier New";
    ctx.fillText("★ NOVO RECORDE! ★", W / 2, H / 2 - 112);
    ctx.shadowBlur = 0;
  }
  ctx.fillStyle = "#ef4444";
  ctx.shadowColor = "#ef4444";
  ctx.shadowBlur = 14;
  ctx.font = "bold 34px Courier New";
  ctx.fillText("GAME OVER", W / 2, H / 2 - 72);
  ctx.shadowBlur = 0;
  ctx.fillStyle = "#fff";
  ctx.font = "bold 19px Courier New";
  ctx.fillText(`PONTUAÇÃO: ${score}`, W / 2, H / 2 - 32);
  ctx.fillStyle = "#fbbf24";
  ctx.font = "13px Courier New";
  ctx.fillText(`RECORDE: ${Math.max(hiScore, score)}`, W / 2, H / 2 - 8);
  ctx.fillStyle = "#94a3b8";
  ctx.font = "12px Courier New";
  const msg =
    score > 6000
      ? "Excelente! SJC está orgulhosa!"
      : score > 2500
        ? "Bom trabalho, Guardião do Vale!"
        : "SJC precisa de você... Tente de novo!";
  ctx.fillText(msg, W / 2, H / 2 + 22);
  ctx.fillStyle = Math.floor(frame / 18) % 2 ? "#60a5fa" : "#3b82f6";
  ctx.shadowColor = "#3b82f6";
  ctx.shadowBlur = 10;
  ctx.font = "bold 13px Courier New";
  ctx.fillText("ENTER para jogar novamente", W / 2, H / 2 + 62);
  ctx.shadowBlur = 0;
  ctx.textAlign = "left";
}

function drawPause() {
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

function drawRadio() {
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

function drawSobre() {
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

  // título
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
      "Vento lateral e raios à noite",
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

  function drawCard(sec, x, y, w) {
    const h = TITLE_H + CPAD + sec.lines.length * LINE_H + CPAD;
    ctx.save();
    ctx.fillStyle = "rgba(4,6,24,0.92)";
    ctx.strokeStyle = sec.col + "66";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, w, h, 5);
    else ctx.rect(x, y, w, h);
    ctx.fill(); ctx.stroke();
    // título da seção
    ctx.fillStyle = sec.col;
    ctx.font = "bold 10px Courier New";
    ctx.textAlign = "left";
    ctx.shadowColor = sec.col; ctx.shadowBlur = 6;
    ctx.fillText(sec.title, x + CPAD, y + TITLE_H - 2);
    ctx.shadowBlur = 0;
    // linhas de texto
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

  // nota histórica
  ctx.textAlign = "center";
  ctx.fillStyle = "rgba(251,191,36,0.72)";
  ctx.font = "italic 8px Courier New";
  ctx.fillText(
    "19/05/1986 — A FAB interceptou 21 OVNIs sobre o Vale do Paraíba numa noite que entrou para a história.",
    CX, H - 28,
  );
  // botão voltar
  const blink = Math.floor(frame / 20) % 2;
  ctx.shadowColor = blink ? "#fbbf24" : "#f59e0b";
  ctx.shadowBlur = blink ? 12 : 4;
  ctx.fillStyle = blink ? "#fbbf24" : "#d97706";
  ctx.font = "bold 11px Courier New";
  ctx.fillText("[ TOQUE OU PRESSIONE QUALQUER TECLA PARA VOLTAR ]", CX, H - 12);
  ctx.shadowBlur = 0;
  ctx.restore();
}
