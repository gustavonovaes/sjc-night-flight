"use strict";

const FIRE_N = 24;
const FIRE_B = 7;
const SHIELD_DUR = 240;
const BOOST_DUR = 280;
const BIS_DUR = 420;
const AVIBRAS_DUR = 480;   // Pulso Avibras — mísseis perseguidores
const INPE_DUR = 360;      // Satélite INPE — ímã + revelar HP
const REVAP_DUR = 180;     // Revap — onda de choque (limpa projéteis)
const DELTA_DUR = 400;     // Asa Delta — agilidade máxima + combo
const ERICSSON_DUR = 500;  // 5G Ericsson — drone wingman
const INV = 120;
const MAX_LIVES = 3;

const PLANES = [
  { id: "tucano", name: "EMB-314 Super Tucano", icon: "✈",  accel: 0.45, maxSpd: 5.5, fireN: FIRE_N, lives: 3, unlock: 0 },
  { id: "e2",     name: "Embraer E2",           icon: "🛫", accel: 0.38, maxSpd: 6.8, fireN: 20,     lives: 2, unlock: 3000 },
  { id: "c390",   name: "C-390 Millennium",     icon: "🚀", accel: 0.30, maxSpd: 4.2, fireN: 30,     lives: 4, unlock: 8000 },
];
let selectedPlane = 0;
const TOTAL_KEY = "sjc_total_score";

function circ(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const sr = a.r + b.r;
  return dx * dx + dy * dy < sr * sr;
}

function explode(x, y, col, n) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const spd = 1 + Math.random() * 6;
    particles.push({
      x,
      y,
      vx: Math.cos(a) * spd,
      vy: Math.sin(a) * spd,
      life: 1,
      size: 2 + Math.random() * 5,
      col,
    });
  }
}
function spark(x, y) {
  for (let i = 0; i < 5; i++) {
    const a = Math.random() * Math.PI * 2;
    const spd = 1 + Math.random() * 3;
    particles.push({
      x,
      y,
      vx: Math.cos(a) * spd,
      vy: Math.sin(a) * spd,
      life: 1,
      size: 1.5 + Math.random() * 2.5,
      col: "#ffcc44",
    });
  }
}
function floatText(txt, x, y, col) {
  floaters.push({ txt, x, y: y - 10, vy: -1.2, life: 1, col });
}

class Player {
  constructor(planeCfg) {
    const cfg = planeCfg || PLANES[0];
    this.x = 110;
    this.y = H / 2;
    this.vx = 0;
    this.vy = 0;
    this.pullX = 0;
    this.pullY = 0;
    this.tilt = 0;
    this.planeId = cfg.id;
    this.lives = cfg.lives;
    this.accel = cfg.accel;
    this.topSpd = cfg.maxSpd;
    this._fireN = cfg.fireN;
    this.shield = 0;
    this.boost = 0;
    this.bis = 0;
    this.avibras = 0;
    this.inpe = 0;
    this.revap = 0;
    this.delta = 0;
    this.ericsson = 0;
    this.inv = 0;
    this.inverted = 0;
    this.fireT = 0;
    this.missileT = 0;
    this.trail = [];
  }
  update(k) {
    const spd = this.topSpd;
    const up = k.ArrowUp || k.KeyW;
    const dn = k.ArrowDown || k.KeyS;
    const lt = k.ArrowLeft || k.KeyA;
    const rt = k.ArrowRight || k.KeyD;
    const inv = this.inverted > 0;
    // Asa Delta: aceleração e frenagem quase instantâneas
    const accel = this.delta > 0 ? this.accel * 4 : this.accel;
    const friction = this.delta > 0 ? 0.22 : 0.84;
    if (touch.active) {
      this.vx = touch.vx * spd * (inv ? -1 : 1);
      this.vy = touch.vy * spd * (inv ? -1 : 1);
    } else {
      const eu = inv ? dn : up, ed = inv ? up : dn;
      const el = inv ? rt : lt, er = inv ? lt : rt;
      if (eu) this.vy = Math.max(this.vy - accel, -spd);
      if (ed) this.vy = Math.min(this.vy + accel,  spd);
      if (!eu && !ed) this.vy *= friction;
      if (el) this.vx = Math.max(this.vx - accel, -spd);
      if (er) this.vx = Math.min(this.vx + accel,  spd);
      if (!el && !er) this.vx *= friction;
    }
    this.x = Math.max(40, Math.min(W * 0.65, this.x + this.vx + this.pullX));
    this.y = Math.max(26, Math.min(H - 46, this.y + this.vy + this.pullY));
    this.pullX = 0;
    this.pullY = 0;
    this.tilt = Math.max(-0.32, Math.min(0.32, this.vy * 0.07));
    for (let i = 0; i < 2; i++)
      this.trail.push({
        x: this.x - 46 + Math.random() * 4,
        y: this.y + (Math.random() - 0.5) * 8,
        vx: -(0.7 + Math.random() * 1.4),
        vy: (Math.random() - 0.5) * 0.5,
        life: 1,
        size: 2 + Math.random() * 3,
        // Asa Delta: rastro arco-íris vibrante
        hue: this.delta > 0 ? (frame * 6) % 360 : 185 + Math.random() * 55,
      });
    this.trail.forEach((p) => {
      p.x += p.vx;
      p.y += p.vy;
      p.life -= 0.055;
    });
    this.trail = this.trail.filter((p) => p.life > 0);
    if (this.shield > 0) this.shield--;
    if (this.boost > 0) this.boost--;
    if (this.bis > 0) this.bis--;
    if (this.avibras > 0) this.avibras--;
    if (this.inpe > 0) this.inpe--;
    if (this.revap > 0) this.revap--;
    if (this.delta > 0) this.delta--;
    if (this.ericsson > 0) this.ericsson--;
    if (this.inv > 0) this.inv--;
    if (this.inverted > 0) this.inverted--;

    // Asa Delta: combo não reseta enquanto ativo
    if (this.delta > 0 && comboT <= 0) { combo = Math.max(combo, 1); comboT = 1; }

    const rate = this.boost > 0 ? FIRE_B : this._fireN;
    const shots = [];
    if (--this.fireT <= 0) {
      this.fireT = rate;
      shots.push(...this._shoot());
    }
    // Avibras: dispara míssil a cada 90 frames
    if (this.avibras > 0 && --this.missileT <= 0) {
      this.missileT = 90;
      const target = _findMissileTarget();
      if (target) {
        shots.push(new HomingMissile(this.x + 20, this.y - 12, target));
        shots.push(new HomingMissile(this.x + 20, this.y + 12, target));
      }
    }
    return shots;
  }
  _shoot() {
    sfxShoot();
    if (this.boost > 0)
      return [
        new Bullet(this.x + 44, this.y - 10, -0.08),
        new Bullet(this.x + 44, this.y, 0),
        new Bullet(this.x + 44, this.y + 10, 0.08),
      ];
    return [new Bullet(this.x + 44, this.y, 0)];
  }
  tryHit() {
    if (dev.godMode || this.bis > 0) return false;
    if (this.inv > 0) return false;
    if (this.shield > 0) {
      this.shield = 0;
      this.inv = 80;
      sfxHit();
      return false;
    }
    this.lives--;
    this.inv = INV;
    sfxHit();
    explode(this.x, this.y, "#ff4444", 14);
    return true;
  }
  draw() {
    this.trail.forEach((p) => {
      ctx.globalAlpha = p.life * 0.5;
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * p.life);
      g.addColorStop(0, `hsla(${p.hue},100%,78%,1)`);
      g.addColorStop(1, `hsla(${p.hue},100%,60%,0)`);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;
    if (this.shield > 0) {
      const pulse = 0.22 + Math.sin(frame * 0.15) * 0.1;
      ctx.globalAlpha = pulse;
      ctx.strokeStyle = "#00eeff";
      ctx.lineWidth = 3;
      ctx.shadowColor = "#00eeff";
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.ellipse(this.x - 2, this.y, 62, 28, this.tilt, 0, Math.PI * 2);
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
    }
    if (this.inv > 0 && Math.floor(this.inv / 8) % 2) return;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.tilt);

    if (this.bis > 0) {
      const pa   = frame * 0.38;              // ângulo hélice
      const glow = 0.55 + Math.sin(frame * 0.12) * 0.35;
      const pulse = Math.sin(frame * 0.18);

      ctx.shadowColor = "#ffd700";
      ctx.shadowBlur  = 18 + glow * 14;

      // ── disco de hélice (atrás) ──────────────────────────────────────────
      ctx.globalAlpha = 0.22 + Math.abs(Math.sin(pa * 2)) * 0.18;
      ctx.fillStyle   = "#ffe080";
      ctx.beginPath(); ctx.ellipse(-54, 0, 18, 18, 0, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;

      // ── pás da hélice (2 pás, gira rápido) ──────────────────────────────
      for (let b = 0; b < 2; b++) {
        ctx.save();
        ctx.translate(-54, 0);
        ctx.rotate(pa + b * Math.PI);
        ctx.fillStyle = "#7a3e06";
        ctx.beginPath();
        ctx.ellipse(0, 0, 16, 3, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // ── estrutura caixa-pipa — 4 painéis de asa ─────────────────────────
      const wingColors = ["#b87010", "#d49020", "#c07818", "#e0a828"];
      const panels = [
        [-48, -34, 56, 9],   // asa sup externa
        [-46, -24, 54, 9],   // asa sup interna
        [-46,  15, 54, 9],   // asa inf interna
        [-48,  25, 56, 9],   // asa inf externa
      ];
      panels.forEach(([x, y, w, h], i) => {
        ctx.fillStyle = wingColors[i];
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(x, y, w, h, 3);
        else ctx.rect(x, y, w, h);
        ctx.fill();
      });

      // ── cabos de tensão diagonais ────────────────────────────────────────
      ctx.strokeStyle = "#6b3808";
      ctx.lineWidth = 1.2;
      const wires = [
        [-48, -25, -8, -15], [-8, -25, -48, -15],   // sup esq
        [ -8, -25,  8, -15], [ 8, -25,  -8, -15],   // sup dir
        [-48,  15, -8,  25], [-8,  15, -48,  25],   // inf esq
        [ -8,  15,  8,  25], [ 8,  15,  -8,  25],   // inf dir
      ];
      wires.forEach(([x1,y1,x2,y2]) => {
        ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke();
      });

      // ── montantes verticais (3 pares) ────────────────────────────────────
      ctx.strokeStyle = "#5a3004";
      ctx.lineWidth = 3;
      [-46, -8, 8].forEach(x => {
        ctx.beginPath(); ctx.moveTo(x, -34); ctx.lineTo(x, 34); ctx.stroke();
      });

      // ── fuselagem principal (gondola) ────────────────────────────────────
      ctx.shadowBlur = 10 + glow * 8;
      const fgrad = ctx.createLinearGradient(-10, -10, -10, 10);
      fgrad.addColorStop(0, "#f0c040");
      fgrad.addColorStop(0.4, "#d08010");
      fgrad.addColorStop(1, "#8a4a04");
      ctx.fillStyle = fgrad;
      ctx.beginPath();
      ctx.moveTo(28, 0);
      ctx.bezierCurveTo(20, -12, -8, -11, -40, -8);
      ctx.lineTo(-40, 8);
      ctx.bezierCurveTo(-8, 11, 20, 12, 28, 0);
      ctx.closePath();
      ctx.fill();

      // contorno fuselagem
      ctx.strokeStyle = "#7a4e08";
      ctx.lineWidth = 1.2;
      ctx.stroke();

      // ── nariz / cauda cônicos ────────────────────────────────────────────
      ctx.fillStyle = "#c87010";
      ctx.beginPath();
      ctx.moveTo(28, 0); ctx.lineTo(46, -3); ctx.lineTo(46, 3); ctx.closePath();
      ctx.fill();

      // ── janela do piloto ─────────────────────────────────────────────────
      ctx.fillStyle = "#1e3a5a";
      ctx.beginPath(); ctx.ellipse(10, -4, 7, 5, -0.2, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = `rgba(150,220,255,${0.55 + pulse * 0.25})`;
      ctx.beginPath(); ctx.ellipse(11, -5, 4, 3, -0.2, 0, Math.PI * 2); ctx.fill();

      // ── piloto (cabeça + capacete) ───────────────────────────────────────
      ctx.fillStyle = "#f0c070";
      ctx.beginPath(); ctx.arc(8, -10, 5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#7a3010";
      ctx.beginPath(); ctx.ellipse(8, -13, 6, 4, 0, Math.PI, 0); ctx.fill();
      ctx.fillStyle = "#b05020";
      ctx.beginPath(); ctx.ellipse(8, -13, 5, 2, 0, Math.PI, 0); ctx.fill();
      // óculos
      ctx.fillStyle = "rgba(80,180,255,0.7)";
      ctx.beginPath(); ctx.ellipse(5, -10, 2.5, 2, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(11, -10, 2.5, 2, 0, 0, Math.PI * 2); ctx.fill();

      // ── leme de profundidade (canard dianteiro) ──────────────────────────
      ctx.fillStyle = "#c07010";
      ctx.beginPath();
      ctx.moveTo(44, 0); ctx.lineTo(50, -10); ctx.lineTo(58, -8); ctx.lineTo(50, 0); ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(44, 0); ctx.lineTo(50,  10); ctx.lineTo(58,  8); ctx.lineTo(50, 0); ctx.closePath();
      ctx.fill();

      // ── aura invencível pulsante ─────────────────────────────────────────
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 0.18 + pulse * 0.14;
      ctx.strokeStyle = `hsl(${45 + pulse * 15},100%,65%)`;
      ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.ellipse(-2, 0, 72, 42, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = 0.08 + Math.abs(pulse) * 0.10;
      ctx.fillStyle = "#ffe566";
      ctx.beginPath(); ctx.ellipse(-2, 0, 72, 42, 0, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
    } else if (this.planeId === "e2") {
      // Embraer E2: jato comercial, fuselagem longa branca/cinza
      ctx.fillStyle = "#e0f2fe";
      ctx.beginPath(); ctx.ellipse(0, 0, 50, 10, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#bae6fd";
      ctx.beginPath();
      ctx.moveTo(44, -3); ctx.bezierCurveTo(56, -3, 66, -1, 68, 0);
      ctx.bezierCurveTo(66, 1, 56, 3, 44, 3); ctx.closePath(); ctx.fill();
      // asas em flecha traseira
      ctx.fillStyle = "#7dd3fc";
      ctx.beginPath();
      ctx.moveTo(4, -3); ctx.lineTo(-16, -28); ctx.lineTo(-32, -22); ctx.lineTo(-14, -3);
      ctx.closePath(); ctx.fill();
      ctx.beginPath();
      ctx.moveTo(4,  3); ctx.lineTo(-16,  28); ctx.lineTo(-32,  22); ctx.lineTo(-14,  3);
      ctx.closePath(); ctx.fill();
      // winglets nas pontas
      ctx.fillStyle = "#0ea5e9";
      ctx.beginPath(); ctx.ellipse(-26, -23, 6, 2, -0.5, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(-26,  23, 6, 2,  0.5, 0, Math.PI * 2); ctx.fill();
      // motores sob as asas
      ctx.fillStyle = "#38bdf8";
      ctx.beginPath(); ctx.ellipse(-10, -20, 9, 3, -0.2, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(-10,  20, 9, 3,  0.2, 0, Math.PI * 2); ctx.fill();
      // cauda estabilizador
      ctx.fillStyle = "#0284c7";
      ctx.beginPath();
      ctx.moveTo(-40, 0); ctx.lineTo(-48, -14); ctx.lineTo(-54, -12); ctx.lineTo(-44, 0);
      ctx.closePath(); ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-40, 0); ctx.lineTo(-48,  14); ctx.lineTo(-54,  12); ctx.lineTo(-44, 0);
      ctx.closePath(); ctx.fill();
      // fuselagem stripe azul
      ctx.fillStyle = "#0369a1";
      ctx.fillRect(-38, -4, 74, 8);
      // janelas
      for (let i = -20; i < 38; i += 9) {
        ctx.fillStyle = "#e0f2fe";
        ctx.beginPath(); ctx.ellipse(i, 0, 2.5, 2, 0, 0, Math.PI * 2); ctx.fill();
      }
      ctx.fillStyle = "#7dd3fc";
      ctx.fillRect(-36, -10, 72, 3);
    } else if (this.planeId === "c390") {
      // C-390 Millennium: cargueiro militar verde, corpo largo, asas altas
      ctx.fillStyle = "#d1fae5";
      ctx.beginPath(); ctx.ellipse(-4, 0, 46, 13, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#a7f3d0";
      ctx.beginPath();
      ctx.moveTo(36, -5); ctx.bezierCurveTo(46, -5, 54, -2, 56, 0);
      ctx.bezierCurveTo(54, 2, 46, 5, 36, 5); ctx.closePath(); ctx.fill();
      // asas altas retas
      ctx.fillStyle = "#6ee7b7";
      ctx.beginPath();
      ctx.moveTo(4, -4); ctx.lineTo(-8, -30); ctx.lineTo(-24, -27); ctx.lineTo(-10, -4);
      ctx.closePath(); ctx.fill();
      ctx.beginPath();
      ctx.moveTo(4,  4); ctx.lineTo(-8,  30); ctx.lineTo(-24,  27); ctx.lineTo(-10,  4);
      ctx.closePath(); ctx.fill();
      // 2 motores por asa
      ctx.fillStyle = "#34d399";
      ctx.beginPath(); ctx.ellipse(-4, -24, 9, 3, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(-4,  24, 9, 3, 0, 0, Math.PI * 2); ctx.fill();
      // cauda T alta
      ctx.fillStyle = "#059669";
      ctx.beginPath();
      ctx.moveTo(-36, 0); ctx.lineTo(-44, -18); ctx.lineTo(-50, -15); ctx.lineTo(-40, 0);
      ctx.closePath(); ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-36, 0); ctx.lineTo(-44,  18); ctx.lineTo(-50,  15); ctx.lineTo(-40, 0);
      ctx.closePath(); ctx.fill();
      // fuselagem escura
      ctx.fillStyle = "#065f46";
      ctx.fillRect(-34, -5, 66, 10);
      // marcações militares
      for (let i = -18; i < 30; i += 12) {
        ctx.fillStyle = "#a7f3d0";
        ctx.beginPath(); ctx.ellipse(i, 0, 2, 1.5, 0, 0, Math.PI * 2); ctx.fill();
      }
      ctx.fillStyle = "#10b981";
      ctx.fillRect(-32, -11, 64, 3);
    } else {
      // Tucano / padrão: caça leve azul
      ctx.fillStyle = "#dbeafe";
      ctx.beginPath();
      ctx.ellipse(0, 0, 44, 9, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#bfdbfe";
      ctx.beginPath();
      ctx.moveTo(40, -4);
      ctx.bezierCurveTo(52, -4, 62, -2, 64, 0);
      ctx.bezierCurveTo(62, 2, 52, 4, 40, 4);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#93c5fd";
      ctx.beginPath();
      ctx.moveTo(8, -3); ctx.lineTo(-8, -26); ctx.lineTo(-30, -23); ctx.lineTo(-20, -3);
      ctx.closePath(); ctx.fill();
      ctx.beginPath();
      ctx.moveTo(8, 3); ctx.lineTo(-8, 26); ctx.lineTo(-30, 23); ctx.lineTo(-20, 3);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = "#60a5fa";
      ctx.beginPath(); ctx.ellipse(-14, -18, 11, 4, -0.15, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(-14,  18, 11, 4,  0.15, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#1e3a8a";
      ctx.beginPath(); ctx.arc(-22, -18, 3, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(-22,  18, 3, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#93c5fd";
      ctx.beginPath();
      ctx.moveTo(-38, -1); ctx.lineTo(-44, -11); ctx.lineTo(-52, -9); ctx.lineTo(-42, -1);
      ctx.closePath(); ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-38, 1); ctx.lineTo(-44, 11); ctx.lineTo(-52, 9); ctx.lineTo(-42, 1);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = "#2563eb";
      ctx.beginPath();
      ctx.moveTo(-38, 0); ctx.lineTo(-46, -20); ctx.lineTo(-54, -17); ctx.lineTo(-44, 0);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = "#1e40af";
      ctx.fillRect(-32, -3.5, 68, 7);
      for (let i = -22; i < 40; i += 9) {
        ctx.fillStyle = "#fffbeb";
        ctx.beginPath(); ctx.ellipse(i, 0, 2.5, 2, 0, 0, Math.PI * 2); ctx.fill();
      }
      ctx.fillStyle = "#3b82f6";
      ctx.fillRect(-30, -9, 70, 3);
    }

    // Avibras: chamas de míssil nas asas
    if (this.avibras > 0) {
      const fp = (frame * 0.25) % (Math.PI * 2);
      ctx.shadowColor = "#f97316";
      ctx.shadowBlur = 8;
      ctx.fillStyle = "#fbbf24";
      ctx.beginPath(); ctx.ellipse(-14, -20, 4, 2, -0.3, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(-14,  20, 4, 2,  0.3, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 0.6 + Math.sin(fp) * 0.3;
      ctx.fillStyle = "#ef4444";
      ctx.beginPath(); ctx.ellipse(-22, -20, 3 + Math.sin(fp) * 2, 2, -0.3, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(-22,  20, 3 + Math.sin(fp) * 2, 2,  0.3, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;
    }

    // INPE: ondas de rádio circulares
    if (this.inpe > 0) {
      const rp = (frame * 0.05) % 1;
      for (let w = 0; w < 3; w++) {
        const t = (rp + w / 3) % 1;
        ctx.globalAlpha = (1 - t) * 0.35;
        ctx.strokeStyle = "#60a5fa";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(0, 0, 30 + t * 90, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }

    // Revap: névoa de vapor pulsante
    if (this.revap > 0) {
      const vp = 0.3 + Math.sin(frame * 0.15) * 0.2;
      ctx.globalAlpha = vp;
      ctx.shadowColor = "#bfdbfe";
      ctx.shadowBlur = 18;
      ctx.strokeStyle = "#e0f2fe";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, 80, 0, Math.PI * 2);
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
    }

    // Ericsson: drone wingman
    if (this.ericsson > 0) {
      ctx.save();
      ctx.translate(0, 38);
      ctx.shadowColor = "#818cf8";
      ctx.shadowBlur = 8;
      ctx.fillStyle = "#6366f1";
      ctx.beginPath(); ctx.ellipse(0, 0, 14, 5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#a5b4fc";
      ctx.beginPath(); ctx.ellipse(0, -3, 6, 4, 0, Math.PI, 0); ctx.fill();
      // hélices
      ctx.fillStyle = "#c7d2fe";
      ctx.fillRect(-12, -2, 4, 2);
      ctx.fillRect( 8,  -2, 4, 2);
      ctx.shadowBlur = 0;
      ctx.restore();
    }

    ctx.restore();

    // Ericsson: anel orbital que intercepta projéteis
    if (this.ericsson > 0) {
      const angle = (frame * 0.09) % (Math.PI * 2);
      const ox = this.x + Math.cos(angle) * 44;
      const oy = this.y + Math.sin(angle) * 28;
      ctx.save();
      ctx.strokeStyle = "#818cf8";
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.75;
      ctx.shadowColor = "#818cf8";
      ctx.shadowBlur = 8;
      ctx.beginPath(); ctx.arc(ox, oy, 11, 0, Math.PI * 2); ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.restore();
    }
  }
}

class Bullet {
  constructor(x, y, vy) {
    this.x = x;
    this.y = y;
    this.vy = vy || 0;
    this.vx = 11;
    this.r = 4;
    this.dead = false;
    this.hist = [];
  }
  update() {
    this.hist.push({ x: this.x, y: this.y });
    if (this.hist.length > 6) this.hist.shift();
    this.x += this.vx;
    this.y += this.vy * this.vx;
    if (this.x > W + 12) this.dead = true;
  }
  draw() {
    this.hist.forEach((p, i) => {
      ctx.globalAlpha = (i / this.hist.length) * 0.45;
      ctx.fillStyle = "#60a5fa";
      ctx.beginPath();
      ctx.arc(p.x, p.y, this.r * (i / this.hist.length) * 0.8, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;
    ctx.shadowColor = "#93c5fd";
    ctx.shadowBlur = 8;
    ctx.fillStyle = "#dbeafe";
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }
}

function _findMissileTarget() {
  if (!enemies || !enemies.length) return null;
  // prioriza ovni > boss > qualquer inimigo mais próximo do jogador
  const byPriority = [...enemies].sort((a, b) => {
    const prio = { ovni: 0, boss: 1 };
    const pa = prio[a.type] ?? 2, pb = prio[b.type] ?? 2;
    if (pa !== pb) return pa - pb;
    const da = (a.x - player.x) ** 2 + (a.y - player.y) ** 2;
    const db = (b.x - player.x) ** 2 + (b.y - player.y) ** 2;
    return da - db;
  });
  return byPriority[0];
}

class HomingMissile {
  constructor(x, y, target) {
    this.x = x;
    this.y = y;
    this.target = target;
    this.vx = 7;
    this.vy = 0;
    this.r = 5;
    this.dead = false;
    this.smoke = [];
  }
  update() {
    this.smoke.push({ x: this.x, y: this.y, life: 1 });
    if (this.smoke.length > 12) this.smoke.shift();
    // ajusta direção gradualmente em direção ao alvo
    if (!this.target.dead) {
      const dx = this.target.x - this.x;
      const dy = this.target.y - this.y;
      const len = Math.sqrt(dx * dx + dy * dy) || 1;
      this.vx += (dx / len) * 1.1 - this.vx * 0.04;
      this.vy += (dy / len) * 1.1 - this.vy * 0.04;
    }
    const spd = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
    if (spd > 10) { this.vx = (this.vx / spd) * 10; this.vy = (this.vy / spd) * 10; }
    this.x += this.vx;
    this.y += this.vy;
    if (this.x > W + 20 || this.x < -20 || this.y < -20 || this.y > H + 20) this.dead = true;
  }
  draw() {
    this.smoke.forEach((s, i) => {
      ctx.globalAlpha = s.life * 0.35 * (i / this.smoke.length);
      ctx.fillStyle = "#e5e7eb";
      ctx.beginPath();
      ctx.arc(s.x, s.y, 3 + (1 - i / this.smoke.length) * 3, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(Math.atan2(this.vy, this.vx));
    ctx.shadowColor = "#f97316";
    ctx.shadowBlur = 10;
    ctx.fillStyle = "#fbbf24";
    ctx.beginPath();
    ctx.ellipse(0, 0, 8, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ef4444";
    ctx.beginPath();
    ctx.moveTo(-8, 0); ctx.lineTo(-14, -4); ctx.lineTo(-14, 4); ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.restore();
  }
}

class Enemy {
  constructor(type, x, y) {
    this.type = type;
    this.x = x;
    this.y = y;
    this.dead = false;
    this.phase = Math.random() * Math.PI * 2;
    switch (type) {
      case "cloud": {
        const cScale = 1 + Math.min(waveNum, 6) * 0.12;
        this.vx = -(0.9 + Math.random() * 0.5) * (1 + waveNum * 0.04);
        this.hp = this.mhp = Math.ceil(4 * cScale);
        this.r = 38;
        // começa sem atirar (wave 0-1), acumula cadência gradualmente
        this.shootT = waveNum < 2
          ? 9999
          : Math.max(45, 110 - waveNum * 6) + Math.floor(Math.random() * 40);
        this.blobs = Array.from({ length: 7 }, () => ({
          ox: (Math.random() - 0.5) * 34,
          oy: (Math.random() - 0.5) * 22,
          r: 14 + Math.random() * 14,
        }));
        break;
      }
      case "drone": {
        const dSpeed = 1 + Math.min(waveNum, 8) * 0.08;
        this.vx = -(2.4 + Math.random() * 1.4) * dSpeed;
        this.hp = this.mhp = waveNum >= 5 ? 2 : 1;
        this.r = 17;
        this.amp = 28 + Math.random() * 60;
        break;
      }
      case "arara": {
        const aSpeed = 1 + Math.min(waveNum, 8) * 0.07;
        this.vx = -(3.8 + Math.random() * 2) * aSpeed;
        this.vy = (Math.random() - 0.5) * (2.8 + waveNum * 0.2);
        this.hp = this.mhp = waveNum >= 6 ? 2 : 1;
        this.r = 13;
        this.wingP = Math.random() * Math.PI * 2;
        break;
      }
      case "ovni": {
        const oSpeed = 1 + Math.min(waveNum, 6) * 0.06;
        this.vx = -(1.6 + Math.random() * 1.2) * oSpeed;
        this.hp = this.mhp = Math.min(3 + Math.floor(waveNum / 2), 7);
        this.r = 26;
        this.shootT = Math.max(40, 90 - waveNum * 5) + Math.floor(Math.random() * 30);
        this.beamActive = 0;
        break;
      }
      case "tanajura": {
        const tSpd = 1 + Math.min(waveNum, 8) * 0.1;
        this.vx = -(2.6 + Math.random() * 1.6) * tSpd;
        this.vy = (Math.random() < 0.5 ? 1 : -1) * (1.2 + Math.random() * 1.4);
        this.hp = this.mhp = 1;
        this.r = 10;
        break;
      }
      case "helicoptero": {
        const hSpd = 0.8 + Math.min(waveNum, 6) * 0.07;
        this.vx = -(1.1 + Math.random() * 0.6) * hSpd;
        this.hp = this.mhp = Math.min(5 + Math.floor(waveNum / 2), 14);
        this.r = 28;
        this.shootT = Math.max(50, 100 - waveNum * 5) + Math.floor(Math.random() * 40);
        this.rotorA = Math.random() * Math.PI * 2;
        break;
      }
      case "balao": {
        this.vx = -(0.45 + Math.random() * 0.35);
        this.vy = (Math.random() - 0.5) * 0.6;
        this.hp = this.mhp = Math.min(6 + Math.floor(waveNum / 2), 16);
        this.r = 22;
        break;
      }
      case "boss": {
        this.vx = -0.9;
        this.hp = this.mhp = 42 + waveNum * 12;
        this.r = 72;
        this.shootT = Math.max(12, 50 - waveNum * 4);
        this.blobs = Array.from({ length: 11 }, () => ({
          ox: (Math.random() - 0.5) * 68,
          oy: (Math.random() - 0.5) * 44,
          r: 26 + Math.random() * 24,
        }));
        break;
      }
      case "prototipo_x": {
        this.vx = -6;
        this.hp = this.mhp = 28 + waveNum * 6;
        this.r = 26;
        this.shootT = Math.max(30, 80 - waveNum * 4);
        this.phase = 0;
        this.laps = 0;
        this.dashT = 0;
        this.dashing = false;
        break;
      }
      case "cemaden_eye": {
        this.y = H / 2; this.vx = 0;
        this.hp = this.mhp = 35 + waveNum * 8;
        this.r = 44;
        this.shootT = Math.max(20, 45 - waveNum * 2);
        this.phase = 0;
        this.vulnerable = false;
        this.shieldT = Math.max(70, 150 - waveNum * 8);
        this.laserAngle = 0;
        this.attackMode = 0;
        this.attackCount = 0;
        break;
      }
      case "engrenagem": {
        this.y = H * 0.25; this.vx = 0;
        this.vy = 1.8 + waveNum * 0.18;
        this.hp = this.mhp = 55 + waveNum * 10;
        this.r = 78;
        this.shootT = Math.max(20, 48 - waveNum * 3);
        this.gearAngle = 0;
        this.attackCount = 0;
        break;
      }
      case "cigarra": {
        this.vx = -0.5;
        this.hp = this.mhp = 90 + waveNum * 15;
        this.r = 58;
        this.shootT = Math.max(10, 22 - waveNum);
        this.morphT = 280;
        this.morphShape = 0;
        this.beamHue = 0;
        break;
      }
    }
    this.ox = x;
  }
  update() {
    const nb = [];
    if (this.type === "cloud") {
      this.x += this.vx;
      this.y += Math.sin(frame * 0.014 + this.ox * 0.01) * 0.45;
      this.y = Math.max(58, Math.min(H - 78, this.y));
      if (--this.shootT <= 0) {
        this.shootT = 75 + Math.floor(Math.random() * 40);
        nb.push(new EBullet(this.x - this.r, this.y, "bolt"));
      }
    } else if (this.type === "drone") {
      this.x += this.vx;
      this.phase += 0.06;
      this.y += Math.sin(this.phase) * 1.2;
      this.y = Math.max(38, Math.min(H - 58, this.y));
    } else if (this.type === "arara") {
      this.x += this.vx;
      this.y += this.vy;
      this.wingP += 0.22;
      if (player) {
        const dy = player.y - this.y;
        this.vy += dy * 0.005;
        this.vy = Math.max(-3, Math.min(3, this.vy));
      }
      this.y = Math.max(28, Math.min(H - 48, this.y));
    } else if (this.type === "ovni") {
      this.x += this.vx;
      this.phase += 0.038;
      this.y += Math.sin(this.phase * 2.2) * 1.9 + Math.cos(this.phase * 1.1) * 0.8;
      this.y = Math.max(36, Math.min(H * 0.62, this.y));
      if (this.beamActive > 0) this.beamActive--;
      // raio trator: atrai o jogador quando dentro do alcance (sem escudo/bis)
      if (player && player.shield <= 0 && player.bis <= 0) {
        const dx = this.x - player.x;
        const dy = this.y - player.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const PULL_R = 160;
        if (dist < PULL_R && dist > 1) {
          const strength = (1 - dist / PULL_R) * 2.4;
          player.pullX += (dx / dist) * strength;
          player.pullY += (dy / dist) * strength;
          this.beamActive = Math.max(this.beamActive, 4);
        }
      }
      if (--this.shootT <= 0) {
        this.shootT = 110 + Math.floor(Math.random() * 80);
        this.beamActive = 38;
        if (player) {
          const dx = player.x - this.x;
          const dy = player.y - this.y;
          const len = Math.sqrt(dx * dx + dy * dy) || 1;
          nb.push(new EBullet(this.x, this.y, "beam", (dx / len) * 3.8, (dy / len) * 3.8));
        }
      }
    } else if (this.type === "tanajura") {
      this.x += this.vx;
      this.phase += 0.14;
      this.y += this.vy * Math.abs(Math.sin(this.phase));
      this.y = Math.max(24, Math.min(H - 24, this.y));
    } else if (this.type === "helicoptero") {
      this.x += this.vx;
      this.phase += 0.022;
      this.y += Math.sin(this.phase) * 0.65;
      this.y = Math.max(48, Math.min(H - 68, this.y));
      this.rotorA += 0.32;
      if (--this.shootT <= 0) {
        this.shootT = 85 + Math.floor(Math.random() * 40);
        if (player) {
          const dx = player.x - this.x, dy = player.y - this.y;
          const ang = Math.atan2(dy, dx);
          const spd = 3.0;
          for (const a of [ang - 0.28, ang, ang + 0.28])
            nb.push(new EBullet(this.x - this.r, this.y, "orb", Math.cos(a) * spd, Math.sin(a) * spd));
        }
      }
    } else if (this.type === "balao") {
      this.x += this.vx;
      this.phase += 0.016;
      this.y += Math.sin(this.phase) * 0.45 + this.vy * 0.25;
      this.y = Math.max(36, Math.min(H - 58, this.y));
    } else if (this.type === "boss") {
      this.x = Math.max(W - 210, this.x + this.vx);
      this.phase += 0.019;
      this.y = H / 2 + Math.sin(this.phase) * 105;
      if (--this.shootT <= 0) {
        this.shootT = Math.max(18, 50 - waveNum * 3);
        sfxBossIn();
        if (player) {
          const dx = player.x - this.x;
          const dy = player.y - this.y;
          const len = Math.sqrt(dx * dx + dy * dy) || 1;
          nb.push(new EBullet(this.x - this.r, this.y, "orb", (dx / len) * 4.2, (dy / len) * 4.2));
        }
      }
    } else if (this.type === "prototipo_x") {
      this.phase += 0.06;
      if (this.dashing) {
        this.x += this.vx;
        if (this.x < -80) {
          this.x = W + 100;
          this.laps++;
          this.dashing = false;
          this.dashT = Math.max(60, 140 - this.laps * 12);
          this.vx = -(6 + this.laps * 1.5);
        }
        if (player && Math.abs(this.x - player.x) < 36) {
          player.pullX += (this.x < player.x ? -1 : 1) * 4;
        }
      } else {
        // hover at right side, weave vertically
        const tx = W - 150 - Math.sin(this.phase * 0.4) * 60;
        this.x += (tx - this.x) * 0.04;
        this.y = H / 2 + Math.sin(this.phase) * (80 + this.laps * 15);
        this.y = Math.max(36, Math.min(H - 36, this.y));
        if (--this.dashT <= 0) {
          this.dashing = true;
        }
      }
      if (--this.shootT <= 0) {
        this.shootT = Math.max(16, 55 - this.laps * 6 - waveNum * 2);
        sfxBossIn();
        if (player) {
          const baseAng = Math.atan2(player.y - this.y, player.x - this.x);
          const spread = 0.22 + this.laps * 0.04;
          const spd = 4.5 + this.laps * 0.3;
          for (let a = -2; a <= 2; a++)
            nb.push(new EBullet(this.x, this.y, "orb", Math.cos(baseAng + a * spread) * spd, Math.sin(baseAng + a * spread) * spd));
        }
      }
    } else if (this.type === "cemaden_eye") {
      if (this.x > W - 130) this.x -= 3.5;
      this.phase += 0.025;
      this.y = H / 2 + Math.sin(this.phase) * 40;
      this.laserAngle += 0.015;
      if (--this.shieldT <= 0) {
        this.vulnerable = !this.vulnerable;
        this.shieldT = this.vulnerable ? 120 : 150;
      }
      if (--this.shootT <= 0) {
        this.shootT = this.vulnerable ? 30 : 50;
        this.attackMode = (this.attackMode + 1) % 3;
        this.attackCount++;
        sfxBossIn();
        if (this.attackMode === 0) {
          for (let i = 0; i < 3; i++)
            nb.push(new EBullet(W * 0.3 + Math.random() * W * 0.4, 0, "orb", (Math.random() - 0.5) * 2, 3 + Math.random() * 2));
        } else if (this.attackMode === 1) {
          for (let i = 0; i < 5; i++) {
            const a = this.laserAngle + i * 0.15;
            nb.push(new EBullet(this.x, this.y, "beam", Math.cos(a) * 4, Math.sin(a) * 4));
          }
        } else if (player) {
          for (let i = 0; i < 3; i++)
            nb.push(new EBullet(player.x + (i - 1) * 22, 0, "orb", (Math.random() - 0.5) * 0.5, 4.5));
        }
      }
    } else if (this.type === "engrenagem") {
      if (this.x > W - 110) this.x -= 3.5;
      this.y += this.vy;
      this.gearAngle += 0.022;
      if (this.y < H * 0.18 || this.y > H * 0.82) this.vy *= -1;
      this.y = Math.max(H * 0.18, Math.min(H * 0.82, this.y));
      if (--this.shootT <= 0) {
        this.shootT = Math.max(25, 50 - waveNum * 2);
        this.attackCount++;
        sfxBossIn();
        for (let i = -1; i <= 1; i++)
          nb.push(new EBullet(this.x - this.r, this.y + i * 30, "bolt"));
        if (this.attackCount % 5 === 0)
          setTimeout(() => { if (gState === ST.PLAY) enemies.push(new Enemy("drone", this.x, H * 0.5)); }, 200);
        if (this.attackCount % 3 === 0) {
          const bo = new EBullet(this.x - this.r, this.y, "orb", -3, (Math.random() - 0.5) * 3);
          bo.bouncing = true;
          nb.push(bo);
        }
      }
    } else if (this.type === "cigarra") {
      this.x += this.vx;
      this.x = Math.max(W - 250, this.x);
      this.phase += 0.022;
      this.y = H / 2 + Math.sin(this.phase) * 100;
      this.beamHue = (this.beamHue + 2) % 360;
      if (--this.morphT <= 0) {
        this.morphT = 280;
        this.morphShape = (this.morphShape + 1) % 3;
        if (player) player.inverted = 180;
        shakeAmt += 8;
        if (collectibles) {
          collectibles.forEach(c => {
            const dx = this.x - c.x, dy = this.y - c.y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            if (dist < 300) { c.x += (dx / dist) * 6; c.y += (dy / dist) * 6; }
          });
        }
      }
      if (--this.shootT <= 0) {
        this.shootT = 18;
        if (player) {
          const dx = player.x - this.x, dy = player.y - this.y;
          const len = Math.sqrt(dx * dx + dy * dy) || 1;
          const b = new EBullet(this.x, this.y, "beam", (dx / len) * 4, (dy / len) * 4);
          b.hue = this.beamHue;
          nb.push(b);
        }
      }
    }
    const isBoss = this.type === "boss" || this.type === "prototipo_x" ||
                   this.type === "cemaden_eye" || this.type === "engrenagem" || this.type === "cigarra";
    if (!isBoss && this.x < -220) this.dead = true;
    return nb;
  }
  hit() {
    if (this.type === "cemaden_eye" && !this.vulnerable) return 0;
    this.hp--;
    spark(this.x, this.y);
    if (this.hp <= 0) {
      sfxBang();
      explode(this.x, this.y,
        this.type === "boss" ? "#ff8800" : this.type === "balao" ? "#bfdbfe" : "#ff6600",
        this.type === "boss" ? 32 : 13);
      this.dead = true;
      // balão libera 2 drones ao morrer
      if (this.type === "balao") {
        const bx = this.x, by = this.y;
        for (let i = 0; i < 2 + Math.floor(Math.random() * 2); i++) {
          setTimeout(() => {
            if (gState === ST.PLAY)
              enemies.push(new Enemy("drone", bx + Math.random() * 30, by + (Math.random() - 0.5) * 40));
          }, i * 220);
        }
      }
      return this._pts();
    }
    return 0;
  }
  _pts() {
    return { cloud: 80, drone: 150, arara: 100, ovni: 320, boss: 2500,
             tanajura: 90, helicoptero: 280, balao: 180,
             prototipo_x: 3000, cemaden_eye: 3500, engrenagem: 4000, cigarra: 5000 }[this.type] || 50;
  }
  hb() {
    return { x: this.x, y: this.y, r: this.r * 0.78 };
  }
  draw() {
    if (this.type === "cloud" || this.type === "boss") {
      const isB = this.type === "boss";
      const hp = this.hp / this.mhp;
      ctx.shadowColor = isB ? "rgba(255,100,0,.5)" : "rgba(80,120,220,.3)";
      ctx.shadowBlur = isB ? 28 : 12;
      this.blobs.forEach((b) => {
        ctx.fillStyle = isB
          ? `rgba(${60 + hp * 90},${20},${8},.9)`
          : `rgba(${82 + hp * 55},${95 + hp * 55},${145 + hp * 55},.82)`;
        ctx.beginPath();
        ctx.arc(this.x + b.ox, this.y + b.oy, b.r, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.shadowBlur = 0;
      if (isB) this._drawHPBar("MONSTRO CLIMÁTICO");
    } else if (this.type === "drone") {
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.fillStyle = "#1a1a2e";
      ctx.beginPath();
      ctx.moveTo(18, 0);
      ctx.lineTo(-8, -10);
      ctx.lineTo(-20, 0);
      ctx.lineTo(-8, 10);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#2d2d4e";
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(-4, -22);
      ctx.lineTo(-16, -20);
      ctx.lineTo(-10, 0);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(-4, 22);
      ctx.lineTo(-16, 20);
      ctx.lineTo(-10, 0);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#ff3333";
      ctx.shadowColor = "#ff0000";
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.arc(8, 0, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.restore();
    } else if (this.type === "arara") {
      ctx.save();
      ctx.translate(this.x, this.y);
      const wf = Math.sin(this.wingP) * 9;
      ctx.fillStyle = "#1d4ed8";
      ctx.beginPath();
      ctx.ellipse(0, 0, 12, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#2563eb";
      ctx.beginPath();
      ctx.arc(12, -2, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#fbbf24";
      ctx.beginPath();
      ctx.moveTo(16, -3);
      ctx.lineTo(22, -2);
      ctx.lineTo(16, -1);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#16a34a";
      ctx.beginPath();
      ctx.moveTo(-2, 0);
      ctx.lineTo(-8, -8 - wf);
      ctx.lineTo(-18, -4 - wf * 0.5);
      ctx.lineTo(-8, 0);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-2, 0);
      ctx.lineTo(-8, 8 + wf);
      ctx.lineTo(-18, 4 + wf * 0.5);
      ctx.lineTo(-8, 0);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#ef4444";
      ctx.beginPath();
      ctx.moveTo(-10, 0);
      ctx.lineTo(-20, -4);
      ctx.lineTo(-18, 0);
      ctx.lineTo(-20, 4);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    } else if (this.type === "ovni") {
      ctx.save();
      ctx.translate(this.x, this.y);
      const pulse = 0.55 + Math.sin(frame * 0.13) * 0.38;
      // raio trator: aponta para o jogador quando em alcance
      if (this.beamActive > 0 && player) {
        const ba = this.beamActive / 38;
        const tx = player.x - this.x;
        const ty = player.y - this.y;
        const dist = Math.sqrt(tx * tx + ty * ty) || 1;
        const bLen = Math.min(dist, 200);
        ctx.save();
        const angle = Math.atan2(ty, tx);
        ctx.rotate(angle - Math.PI / 2);
        const bg = ctx.createLinearGradient(0, 10, 0, bLen);
        bg.addColorStop(0, `rgba(0,255,110,${ba * 0.5})`);
        bg.addColorStop(1, "rgba(0,255,110,0)");
        ctx.fillStyle = bg;
        ctx.beginPath();
        ctx.moveTo(-14, 10); ctx.lineTo(-28, bLen);
        ctx.lineTo(28, bLen); ctx.lineTo(14, 10);
        ctx.closePath(); ctx.fill();
        ctx.restore();
      }
      ctx.shadowColor = "#00ff88";
      ctx.shadowBlur = 14 * pulse;
      ctx.fillStyle = `rgba(160,255,170,${0.78 * pulse})`;
      ctx.beginPath();
      ctx.ellipse(0, 2, 26, 9, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = `rgba(100,255,140,${0.88 * pulse})`;
      ctx.beginPath();
      ctx.ellipse(0, -3, 13, 10, 0, Math.PI, 0);
      ctx.fill();
      ctx.shadowBlur = 6;
      [-17, -9, 0, 9, 17].forEach((lx, i) => {
        ctx.fillStyle = `hsl(${110 + i * 28},100%,65%)`;
        ctx.beginPath(); ctx.arc(lx, 3, 2.2, 0, Math.PI * 2); ctx.fill();
      });
      ctx.shadowBlur = 0;
      ctx.restore();
    } else if (this.type === "tanajura") {
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.globalAlpha = 0.52;
      ctx.fillStyle = "#d4cefa";
      ctx.beginPath(); ctx.ellipse(-2, -5, 7, 3, -0.3, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(-2, 5, 7, 3, 0.3, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = "#92400e";
      ctx.beginPath(); ctx.ellipse(0, 0, 9, 5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#b45309";
      ctx.beginPath(); ctx.arc(9, 0, 4, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "#78350f"; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(9, -4); ctx.lineTo(14, -8); ctx.moveTo(9, -4); ctx.lineTo(15, -4); ctx.stroke();
      ctx.restore();
    } else if (this.type === "helicoptero") {
      ctx.save();
      ctx.translate(this.x, this.y);
      const hp = this.hp / this.mhp;
      ctx.fillStyle = `rgb(${30 + (1-hp)*55},${58 + (1-hp)*20},${22})`;
      ctx.beginPath(); ctx.ellipse(-4, 0, 24, 10, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#2d4a18";
      ctx.beginPath(); ctx.moveTo(-24, 0); ctx.lineTo(-40, -5); ctx.lineTo(-38, 0); ctx.lineTo(-40, 5); ctx.closePath(); ctx.fill();
      ctx.fillStyle = "rgba(120,210,255,0.45)";
      ctx.beginPath(); ctx.ellipse(13, -2, 9, 7, 0.2, 0, Math.PI * 2); ctx.fill();
      ctx.save();
      ctx.rotate(this.rotorA);
      ctx.strokeStyle = "#3a5c20"; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(-24, 0); ctx.lineTo(24, 0); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, -24); ctx.lineTo(0, 24); ctx.stroke();
      ctx.restore();
      ctx.fillStyle = "#6b7280";
      ctx.beginPath(); ctx.arc(0, 0, 3, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    } else if (this.type === "balao") {
      ctx.save();
      ctx.translate(this.x, this.y);
      const hp = this.hp / this.mhp;
      ctx.shadowColor = "rgba(190,210,255,0.35)"; ctx.shadowBlur = 10;
      ctx.fillStyle = `rgba(${200 + (1-hp)*50},${215},${240},.86)`;
      ctx.beginPath(); ctx.ellipse(0, 0, 22, 27, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "rgba(160,175,210,.4)"; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(-22, 0); ctx.lineTo(22, 0); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, -27); ctx.lineTo(0, 27); ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = "#94a3b8"; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(-7, 23); ctx.lineTo(-5, 35); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(7, 23); ctx.lineTo(5, 35); ctx.stroke();
      ctx.fillStyle = "#78563a";
      ctx.fillRect(-8, 33, 16, 8);
      ctx.restore();
    }
    const isBossType = this.type === "boss" || this.type === "prototipo_x" ||
                       this.type === "cemaden_eye" || this.type === "engrenagem" || this.type === "cigarra";
    if (this.type === "prototipo_x") {
      ctx.save();
      ctx.translate(this.x, this.y);
      const hpR = this.hp / this.mhp;
      ctx.shadowColor = `hsl(${hpR * 30 + 200},90%,55%)`;
      ctx.shadowBlur = 16;
      ctx.fillStyle = `hsl(${hpR * 30 + 200},70%,28%)`;
      ctx.beginPath();
      ctx.moveTo(28, 0); ctx.lineTo(-8, -10); ctx.lineTo(-26, -6); ctx.lineTo(-26, 6); ctx.lineTo(-8, 10); ctx.closePath();
      ctx.fill();
      ctx.fillStyle = `hsl(${hpR * 30 + 200},60%,38%)`;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-20, -28); ctx.lineTo(-30, -20); ctx.lineTo(-8, 0); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-20, 28); ctx.lineTo(-30, 20); ctx.lineTo(-8, 0); ctx.closePath(); ctx.fill();
      ctx.fillStyle = "#ff3333"; ctx.shadowColor = "#ff0000"; ctx.shadowBlur = 8;
      ctx.beginPath(); ctx.arc(12, -6, 3, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(12, 6, 3, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;
      ctx.restore();
      this._drawHPBar("PROTÓTIPO X");
    } else if (this.type === "cemaden_eye") {
      ctx.save();
      ctx.translate(this.x, this.y);
      const hpR = this.hp / this.mhp;
      if (!this.vulnerable) {
        const sAngle = frame * 0.03;
        for (let i = 0; i < 6; i++) {
          const a = sAngle + i * (Math.PI * 2 / 6);
          ctx.fillStyle = "rgba(100,130,200,0.65)";
          ctx.beginPath(); ctx.arc(Math.cos(a) * 55, Math.sin(a) * 55, 16, 0, Math.PI * 2); ctx.fill();
        }
      }
      ctx.shadowColor = this.vulnerable ? "#ff4444" : "#6688cc";
      ctx.shadowBlur = 20;
      ctx.fillStyle = this.vulnerable ? `rgba(${Math.round(200 + hpR * 55)},60,60,.9)` : "rgba(40,60,140,.85)";
      ctx.beginPath(); ctx.ellipse(0, 0, 44, 28, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = this.vulnerable ? "#fff" : "#1a2a6e";
      ctx.beginPath(); ctx.ellipse(0, 0, 20, 26, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = this.vulnerable ? "#ff4444" : "#4488ff";
      ctx.beginPath(); ctx.arc(0, 0, 14, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#000";
      ctx.beginPath(); ctx.arc(0, 0, 8, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;
      ctx.restore();
      this._drawHPBar("OLHO DO CEMADEN");
    } else if (this.type === "engrenagem") {
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(this.gearAngle);
      const hpR = this.hp / this.mhp;
      ctx.shadowColor = "#c87020"; ctx.shadowBlur = 18;
      ctx.fillStyle = `rgba(${Math.round(80 + hpR * 60)},60,40,.9)`;
      ctx.beginPath(); ctx.arc(0, 0, this.r * 0.65, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = `rgba(${Math.round(100 + hpR * 80)},70,30,.88)`;
      for (let i = 0; i < 8; i++) {
        ctx.save(); ctx.rotate(i * Math.PI / 4);
        ctx.fillRect(-8, -(this.r * 0.65), 16, 24);
        ctx.restore();
      }
      ctx.fillStyle = "#1a0a00";
      ctx.beginPath(); ctx.arc(0, 0, this.r * 0.28, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;
      ctx.restore();
      this._drawHPBar("GRANDE ENGRENAGEM");
    } else if (this.type === "cigarra") {
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.shadowColor = `hsl(${this.beamHue},100%,60%)`;
      ctx.shadowBlur = 24;
      ctx.strokeStyle = `hsl(${this.beamHue},100%,60%)`;
      ctx.lineWidth = 3;
      ctx.fillStyle = `hsla(${this.beamHue},80%,18%,.88)`;
      if (this.morphShape === 0) {
        ctx.beginPath(); ctx.arc(0, 0, this.r * 0.7, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      } else if (this.morphShape === 1) {
        ctx.beginPath();
        for (let i = 0; i < 3; i++) {
          const a = i * Math.PI * 2 / 3 - Math.PI / 2;
          if (i === 0) ctx.moveTo(Math.cos(a) * this.r * 0.8, Math.sin(a) * this.r * 0.8);
          else ctx.lineTo(Math.cos(a) * this.r * 0.8, Math.sin(a) * this.r * 0.8);
        }
        ctx.closePath(); ctx.fill(); ctx.stroke();
      } else {
        ctx.beginPath(); ctx.ellipse(0, 0, this.r * 0.9, this.r * 0.3, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      }
      ctx.shadowBlur = 0;
      ctx.restore();
      this._drawHPBar("A CIGARRA");
    }
    const showHp = (this.hp < this.mhp || (player && player.inpe > 0)) && !isBossType;
    if (showHp) {
      const bw = this.r * 1.4;
      const bx = this.x - bw / 2;
      const by = this.y - this.r - 8;
      ctx.fillStyle = "rgba(0,0,0,.55)";
      ctx.fillRect(bx, by, bw, 4);
      ctx.fillStyle = `hsl(${(this.hp / this.mhp) * 118},80%,50%)`;
      ctx.fillRect(bx, by, bw * (this.hp / this.mhp), 4);
    }
  }
  _drawHPBar(label) {
    const hp = this.hp / this.mhp;
    const bw = 150, bx = this.x - bw / 2, by = this.y - this.r - 22;
    ctx.fillStyle = "rgba(0,0,0,.55)"; ctx.fillRect(bx, by, bw, 9);
    ctx.fillStyle = `hsl(${hp * 118},80%,50%)`; ctx.fillRect(bx, by, bw * hp, 9);
    if (label) {
      ctx.fillStyle = "#fff"; ctx.font = "bold 10px Courier New";
      ctx.textAlign = "center"; ctx.fillText(label, this.x, by - 4); ctx.textAlign = "left";
    }
  }
}

class EBullet {
  constructor(x, y, kind, vx, vy) {
    this.x = x;
    this.y = y;
    this.kind = kind;
    this.vx = vx || -5;
    this.vy = vy || 0;
    this.dead = false;
    this.age = 0;
    this.grazed = false;
    this.bouncing = false;
    this.bounceCount = 0;
    this.hue = null;
  }
  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.age++;
    if (this.bouncing) {
      if (this.x <= 0 || this.x >= W) { this.vx *= -1; this.x = Math.max(1, Math.min(W - 1, this.x)); this.bounceCount++; }
      if (this.y <= 0 || this.y >= H) { this.vy *= -1; this.y = Math.max(1, Math.min(H - 1, this.y)); this.bounceCount++; }
      if (this.bounceCount >= 12) this.dead = true;
      return;
    }
    if (this.x < -30 || this.y < -30 || this.y > H + 30) this.dead = true;
  }
  hb() {
    return { x: this.x, y: this.y, r: this.kind === "orb" ? 11 : this.kind === "beam" ? 9 : 8 };
  }
  draw() {
    ctx.save();
    ctx.translate(this.x, this.y);
    if (this.kind === "bolt") {
      ctx.strokeStyle = `rgba(255,255,80,${0.6 + Math.sin(this.age * 0.55) * 0.3})`;
      ctx.lineWidth = 2.5;
      ctx.shadowColor = "#ffff00";
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(-7, 6);
      ctx.lineTo(-13, -4);
      ctx.lineTo(-20, 7);
      ctx.lineTo(-30, 0);
      ctx.stroke();
    } else if (this.kind === "beam") {
      const h = this.hue !== null ? this.hue : 145;
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 9);
      g.addColorStop(0, `hsla(${h},100%,70%,.92)`);
      g.addColorStop(1, `hsla(${h},100%,50%,0)`);
      ctx.fillStyle = g;
      ctx.shadowColor = `hsl(${h},100%,60%)`;
      ctx.shadowBlur = 12;
      ctx.beginPath(); ctx.arc(0, 0, 9, 0, Math.PI * 2); ctx.fill();
    } else {
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 11);
      g.addColorStop(0, "#ff9999");
      g.addColorStop(1, "rgba(200,0,0,0)");
      ctx.fillStyle = g;
      ctx.shadowColor = "#ff4444";
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.arc(0, 0, 11, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.shadowBlur = 0;
    ctx.restore();
  }
}

// Coletáveis de pontuação — empresas e lugares de SJC
const CTYPES_SCORE = [
  { id: "embraer",  lbl: "EMBRAER",        pts: 120, col: "#fbbf24", glow: "#f59e0b", icon: "✈️" },
  { id: "inpe",     lbl: "INPE",           pts: 80,  col: "#60a5fa", glow: "#3b82f6", icon: "🛰️" },
  { id: "ita",      lbl: "ITA",            pts: 80,  col: "#f87171", glow: "#ef4444", icon: "🎓" },
  { id: "dcta",     lbl: "DCTA",           pts: 80,  col: "#c4b5fd", glow: "#7c3aed", icon: "🚀" },
  { id: "avibras",  lbl: "AVIBRAS",        pts: 60,  col: "#fb923c", glow: "#ea580c", icon: "🛡️" },
  { id: "tech",     lbl: "TECHPARK",       pts: 50,  col: "#a78bfa", glow: "#7c3aed", icon: "💎" },
  { id: "jj",       lbl: "J&J",           pts: 50,  col: "#f9a8d4", glow: "#ec4899", icon: "💊" },
  { id: "gm",       lbl: "GM",            pts: 50,  col: "#6ee7b7", glow: "#10b981", icon: "🚗" },
  { id: "ericsson", lbl: "ERICSSON",       pts: 50,  col: "#7dd3fc", glow: "#0ea5e9", icon: "📡" },
  { id: "panasonic",lbl: "PANASONIC",      pts: 40,  col: "#93c5fd", glow: "#3b82f6", icon: "📺" },
  { id: "hitachi",  lbl: "HITACHI",        pts: 40,  col: "#fca5a5", glow: "#ef4444", icon: "⚡" },
  { id: "nestle",   lbl: "NESTLÉ",         pts: 35,  col: "#fde68a", glow: "#f59e0b", icon: "☕" },
  { id: "bayer",    lbl: "BAYER",          pts: 35,  col: "#86efac", glow: "#22c55e", icon: "🌿" },
  { id: "parker",   lbl: "PARKER",         pts: 30,  col: "#d8b4fe", glow: "#a855f7", icon: "🔧" },
  { id: "eaton",    lbl: "EATON",          pts: 30,  col: "#fdba74", glow: "#f97316", icon: "⚙️" },
  { id: "caoa",     lbl: "CAOA CHERY",     pts: 30,  col: "#bfdbfe", glow: "#60a5fa", icon: "🚙" },
  { id: "revap",    lbl: "REVAP",          pts: 30,  col: "#fcd34d", glow: "#eab308", icon: "🛢️" },
  { id: "ball",     lbl: "BALL CORP",      pts: 25,  col: "#c7d2fe", glow: "#6366f1", icon: "🧪" },
  { id: "lanxess",  lbl: "LANXESS",        pts: 25,  col: "#a3e635", glow: "#84cc16", icon: "🔬" },
  { id: "ardagh",   lbl: "ARDAGH",         pts: 25,  col: "#94a3b8", glow: "#64748b", icon: "🏭" },
  { id: "fccr",     lbl: "FCCR",          pts: 40,  col: "#f0abfc", glow: "#e879f9", icon: "🎨" },
  { id: "sesc",     lbl: "SESC SJC",       pts: 40,  col: "#34d399", glow: "#10b981", icon: "🎭" },
  { id: "museu",    lbl: "MUSEU FOLCLORE", pts: 40,  col: "#fbbf24", glow: "#f59e0b", icon: "🎪" },
  { id: "arena",    lbl: "FARMA CONDE",    pts: 40,  col: "#f87171", glow: "#ef4444", icon: "🏟️" },
  { id: "parque",   lbl: "PARQUE CIDADE",  pts: 30,  col: "#4ade80", glow: "#16a34a", icon: "🌳" },
  { id: "vicentina",lbl: "VICENTINA",      pts: 30,  col: "#86efac", glow: "#22c55e", icon: "🌺" },
];

// Power-ups
const CTYPES_PW = [
  { id: "shield",   lbl: "ESCUDO",       pts: 0, col: "#34d399", glow: "#10b981", icon: "🛡️", pw: "shield"   },
  { id: "boost",    lbl: "BOOST",        pts: 0, col: "#fb923c", glow: "#ea580c", icon: "⚡", pw: "boost"    },
  { id: "14bis",    lbl: "14-BIS",       pts: 0, col: "#ffd700", glow: "#f59e0b", icon: "🛩️", pw: "14bis",   rare: true  },
  { id: "avibras_pw",  lbl: "PULSO AVIBRAS",pts: 0, col: "#f97316", glow: "#ea580c", icon: "🚀", pw: "avibras"  },
  { id: "inpe_sat",    lbl: "SATÉLITE INPE",pts: 0, col: "#60a5fa", glow: "#3b82f6", icon: "📡", pw: "inpe_sat" },
  { id: "revap_pw",    lbl: "REVAP SHOCK",  pts: 0, col: "#bfdbfe", glow: "#60a5fa", icon: "❄️", pw: "revap"    },
  { id: "delta_pw",    lbl: "ASA DELTA",    pts: 0, col: "#a78bfa", glow: "#7c3aed", icon: "🪂", pw: "delta"    },
  { id: "ericsson_pw", lbl: "WINGMAN 5G",   pts: 0, col: "#818cf8", glow: "#6366f1", icon: "📶", pw: "ericsson" },
];

const CTYPES = [...CTYPES_SCORE, ...CTYPES_PW];

// Tabela de drops por inimigo: { coletável_id: chance 0..1 }
// Soma das chances não precisa ser 1 — cada entrada é checada independentemente
const DROP_TABLE = {
  // pw IDs usam sufixo _pw para não colidir com score IDs homônimos
  cloud:  { shield: 0.12, boost: 0.06, "14bis": 0.005,
            avibras_pw: 0.02, inpe_sat: 0.02, revap_pw: 0.02, delta_pw: 0.02, ericsson_pw: 0.02,
            embraer: 0.08, inpe: 0.08, dcta: 0.06, ita: 0.06, avibras: 0.04,
            tech: 0.06, jj: 0.04, gm: 0.04, ericsson: 0.04, panasonic: 0.03,
            hitachi: 0.03, nestle: 0.03, bayer: 0.03, parker: 0.03, eaton: 0.03,
            caoa: 0.02, revap: 0.02, ball: 0.02, lanxess: 0.02, ardagh: 0.02,
            fccr: 0.04, sesc: 0.04, museu: 0.03, arena: 0.03, parque: 0.03, vicentina: 0.03 },
  drone:  { shield: 0.18, boost: 0.10, "14bis": 0.008,
            avibras_pw: 0.04, inpe_sat: 0.04, revap_pw: 0.04, delta_pw: 0.03, ericsson_pw: 0.05,
            embraer: 0.12, inpe: 0.10, dcta: 0.10, ita: 0.08, avibras: 0.07,
            tech: 0.08, jj: 0.05, gm: 0.05, ericsson: 0.06, panasonic: 0.04,
            hitachi: 0.04, nestle: 0.04, bayer: 0.04, parker: 0.04, eaton: 0.04,
            caoa: 0.03, revap: 0.03, ball: 0.03, lanxess: 0.03, ardagh: 0.03,
            fccr: 0.05, sesc: 0.05, museu: 0.04, arena: 0.04, parque: 0.04, vicentina: 0.04 },
  arara:  { shield: 0.10, boost: 0.08, "14bis": 0.006,
            avibras_pw: 0.02, inpe_sat: 0.03, revap_pw: 0.02, delta_pw: 0.04, ericsson_pw: 0.02,
            embraer: 0.06, inpe: 0.06, dcta: 0.05, ita: 0.05, avibras: 0.04,
            tech: 0.05, jj: 0.04, gm: 0.04, ericsson: 0.04, panasonic: 0.03,
            hitachi: 0.03, nestle: 0.04, bayer: 0.04, parker: 0.03, eaton: 0.03,
            caoa: 0.03, revap: 0.02, ball: 0.02, lanxess: 0.02, ardagh: 0.02,
            fccr: 0.05, sesc: 0.05, museu: 0.04, arena: 0.04, parque: 0.05, vicentina: 0.05 },
  ovni:   { shield: 0.22, boost: 0.15, "14bis": 0.025,
            avibras_pw: 0.08, inpe_sat: 0.10, revap_pw: 0.08, delta_pw: 0.07, ericsson_pw: 0.06,
            embraer: 0.15, inpe: 0.18, dcta: 0.15, ita: 0.12, avibras: 0.10,
            tech: 0.10, jj: 0.06, gm: 0.06, ericsson: 0.08, panasonic: 0.05,
            hitachi: 0.05, nestle: 0.04, bayer: 0.04, parker: 0.05, eaton: 0.04,
            caoa: 0.03, revap: 0.04, ball: 0.04, lanxess: 0.04, ardagh: 0.03,
            fccr: 0.06, sesc: 0.06, museu: 0.05, arena: 0.05, parque: 0.04, vicentina: 0.04 },
  tanajura: { shield: 0.08, boost: 0.07, "14bis": 0.004,
            avibras_pw: 0.02, inpe_sat: 0.02, revap_pw: 0.02, delta_pw: 0.03, ericsson_pw: 0.02,
            embraer: 0.08, inpe: 0.07, dcta: 0.07, ita: 0.06, tech: 0.06, avibras: 0.05,
            jj: 0.03, gm: 0.03, ericsson: 0.04, panasonic: 0.02 },
  helicoptero: { shield: 0.20, boost: 0.14, "14bis": 0.018,
            avibras_pw: 0.07, inpe_sat: 0.07, revap_pw: 0.06, delta_pw: 0.06, ericsson_pw: 0.07,
            embraer: 0.14, inpe: 0.12, dcta: 0.14, ita: 0.10, avibras: 0.10,
            tech: 0.09, jj: 0.06, gm: 0.06, ericsson: 0.07, panasonic: 0.05,
            fccr: 0.06, sesc: 0.05, museu: 0.04, arena: 0.04, parque: 0.04, vicentina: 0.04 },
  balao:  { shield: 0.16, boost: 0.12, "14bis": 0.012,
            avibras_pw: 0.05, inpe_sat: 0.08, revap_pw: 0.05, delta_pw: 0.05, ericsson_pw: 0.05,
            embraer: 0.10, inpe: 0.14, dcta: 0.10, ita: 0.09, avibras: 0.08,
            tech: 0.08, jj: 0.05, gm: 0.05, ericsson: 0.05, panasonic: 0.04,
            fccr: 0.05, sesc: 0.05, museu: 0.05, arena: 0.04, parque: 0.05, vicentina: 0.05 },
  boss:   { shield: 0.90, boost: 0.90, "14bis": 0.60,
            avibras_pw: 0.70, inpe_sat: 0.70, revap_pw: 0.70, delta_pw: 0.65, ericsson_pw: 0.70,
            embraer: 0.60, inpe: 0.60, dcta: 0.60, ita: 0.50, avibras: 0.50,
            tech: 0.50, jj: 0.30, gm: 0.30, ericsson: 0.30, panasonic: 0.20,
            hitachi: 0.20, nestle: 0.20, bayer: 0.20, parker: 0.20, eaton: 0.20,
            caoa: 0.20, revap: 0.20, ball: 0.20, lanxess: 0.20, ardagh: 0.20,
            fccr: 0.30, sesc: 0.30, museu: 0.25, arena: 0.25, parque: 0.25, vicentina: 0.25 },
  prototipo_x: { shield: 0.85, boost: 0.85, "14bis": 0.55,
            avibras_pw: 0.65, inpe_sat: 0.65, revap_pw: 0.65, delta_pw: 0.70, ericsson_pw: 0.65,
            embraer: 0.55, inpe: 0.50, dcta: 0.60, ita: 0.50, avibras: 0.50,
            tech: 0.45, jj: 0.28, gm: 0.28, ericsson: 0.28, panasonic: 0.18,
            fccr: 0.28, sesc: 0.28, museu: 0.22, arena: 0.22, parque: 0.22, vicentina: 0.22 },
  cemaden_eye: { shield: 0.88, boost: 0.88, "14bis": 0.58,
            avibras_pw: 0.68, inpe_sat: 0.72, revap_pw: 0.68, delta_pw: 0.62, ericsson_pw: 0.68,
            embraer: 0.55, inpe: 0.65, dcta: 0.55, ita: 0.48, avibras: 0.45,
            tech: 0.45, jj: 0.28, gm: 0.28, ericsson: 0.28, panasonic: 0.18,
            fccr: 0.28, sesc: 0.28, museu: 0.22, arena: 0.22, parque: 0.22, vicentina: 0.22 },
  engrenagem:  { shield: 0.92, boost: 0.92, "14bis": 0.62,
            avibras_pw: 0.72, inpe_sat: 0.68, revap_pw: 0.72, delta_pw: 0.66, ericsson_pw: 0.72,
            embraer: 0.58, inpe: 0.55, dcta: 0.62, ita: 0.52, avibras: 0.52,
            tech: 0.48, jj: 0.30, gm: 0.30, ericsson: 0.30, panasonic: 0.20,
            fccr: 0.30, sesc: 0.30, museu: 0.24, arena: 0.24, parque: 0.24, vicentina: 0.24 },
  cigarra:     { shield: 1.00, boost: 1.00, "14bis": 0.80,
            avibras_pw: 0.85, inpe_sat: 0.85, revap_pw: 0.85, delta_pw: 0.80, ericsson_pw: 0.85,
            embraer: 0.70, inpe: 0.70, dcta: 0.70, ita: 0.60, avibras: 0.60,
            tech: 0.60, jj: 0.40, gm: 0.40, ericsson: 0.40, panasonic: 0.30,
            hitachi: 0.30, nestle: 0.30, bayer: 0.30, parker: 0.30, eaton: 0.30,
            caoa: 0.30, revap: 0.30, ball: 0.30, lanxess: 0.30, ardagh: 0.30,
            fccr: 0.40, sesc: 0.40, museu: 0.35, arena: 0.35, parque: 0.35, vicentina: 0.35 },
};

class Collectible {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.r = 16;
    this.dead = false;
    this.age = 0;
    this.type = CTYPES[Math.floor(Math.random() * CTYPES.length)];
    this.vx = -(1 + Math.random() * 0.5);
  }
  update() {
    this.x += this.vx;
    this.y += Math.sin(this.age * 0.04) * 0.8;
    this.age++;
    if (this.x < -35) this.dead = true;
  }
  draw() {
    ctx.save();
    ctx.translate(this.x, this.y);
    const pulse = 0.55 + Math.sin(this.age * 0.1) * 0.35;
    ctx.shadowColor = this.type.glow;
    ctx.shadowBlur = 16 * pulse;
    ctx.globalAlpha = 0.88;
    ctx.fillStyle = this.type.col;
    ctx.beginPath();
    ctx.arc(0, 0, this.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.shadowBlur = 0;
    if (this.type.pw) {
      // power-up: ícone emoji centralizado
      ctx.font = "13px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(this.type.icon, 0, 1);
    } else {
      // pontuação: nome da empresa centralizado
      ctx.fillStyle = "#fff";
      ctx.font = "bold 6px Courier New";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(this.type.lbl, 0, 0);
    }
    ctx.strokeStyle = `rgba(255,255,255,${0.22 + pulse * 0.25})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(0, 0, this.r + 5 + pulse * 3, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

function dropCollectibles(x, y, enemyType) {
  const table = DROP_TABLE[enemyType] ?? DROP_TABLE.cloud;
  CTYPES.forEach(ct => {
    const base = table[ct.id] ?? 0;
    if (base === 0) return;
    const boost = ct.id === "14bis" ? 1 + Math.max(0, combo - 5) * 0.9 : 1;
    if (Math.random() < base * boost) {
      const c = new Collectible(x, y);
      c.type = ct;
      collectibles.push(c);
    }
  });
}
