import { state } from "./state";
import { ctx, W, H } from "./world";
import {
  SHIELD_DUR, BOOST_DUR, BIS_DUR, AVIBRAS_DUR, INPE_DUR, REVAP_DUR,
  DELTA_DUR, ERICSSON_DUR, INV, FIRE_N, FIRE_B, BOSS_TYPES,
  CTYPES, DROP_TABLE, PLANES,
} from "./constants";
import { sfxShoot, sfxHit, sfxBang, sfxPowerup, sfxBossIn } from "./audio";
import type { Circle, Particle, FloatText, TrailParticle, CollectibleType } from "./types";

// ── Collision helpers ─────────────────────────────────────────────────────────

export function circ(a: Circle, b: Circle): boolean {
  const dx = a.x - b.x, dy = a.y - b.y, sr = a.r + b.r;
  return dx * dx + dy * dy < sr * sr;
}

export function explode(x: number, y: number, col: string, n: number): void {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const spd = 1 + Math.random() * 6;
    (state.particles as Particle[]).push({
      x, y,
      vx: Math.cos(a) * spd, vy: Math.sin(a) * spd,
      life: 1, size: 2 + Math.random() * 5, col,
    });
  }
}

export function spark(x: number, y: number): void {
  for (let i = 0; i < 5; i++) {
    const a = Math.random() * Math.PI * 2;
    const spd = 1 + Math.random() * 3;
    (state.particles as Particle[]).push({
      x, y,
      vx: Math.cos(a) * spd, vy: Math.sin(a) * spd,
      life: 1, size: 1.5 + Math.random() * 2.5, col: "#ffcc44",
    });
  }
}

export function floatText(txt: string, x: number, y: number, col: string): void {
  (state.floaters as FloatText[]).push({ txt, x, y: y - 10, vy: -1.2, lifetime: 1, col });
}

// ── Player ────────────────────────────────────────────────────────────────────

export class Player {
  x: number; y: number;
  vx = 0; vy = 0;
  pullX = 0; pullY = 0;
  tilt = 0;
  planeId: string;
  lives: number; maxLives: number;
  accel: number; topSpd: number;
  _fireN: number;
  shield = 0; boost = 0; bis = 0; avibras = 0;
  inpe = 0; revap = 0; delta = 0; ericsson = 0;
  inv = 0; inverted = 0;
  fireT = 0; missileT = 0;
  trail: TrailParticle[] = [];

  constructor(planeCfg = PLANES[0]) {
    this.x = 110;
    this.y = H / 2;
    this.planeId  = planeCfg.id;
    this.lives    = planeCfg.lives;
    this.maxLives = planeCfg.lives;
    this.accel    = planeCfg.accel;
    this.topSpd   = planeCfg.maxSpd;
    this._fireN   = planeCfg.fireN;
  }

  update(k: Record<string, boolean>): (Bullet | HomingMissile)[] {
    const spd = this.topSpd;
    const up = k.ArrowUp || k.KeyW, dn = k.ArrowDown || k.KeyS;
    const lt = k.ArrowLeft || k.KeyA, rt = k.ArrowRight || k.KeyD;
    const inv = this.inverted > 0;
    const accel = this.delta > 0 ? this.accel * 4 : this.accel;
    const friction = this.delta > 0 ? 0.22 : 0.84;

    if (state.touch.active) {
      this.vx = state.touch.vx * spd * 0.65 * (inv ? -1 : 1);
      this.vy = state.touch.vy * spd * 0.65 * (inv ? -1 : 1);
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
    this.y = Math.max(26, Math.min(H - 46,   this.y + this.vy + this.pullY));
    this.pullX = 0; this.pullY = 0;
    this.tilt = Math.max(-0.32, Math.min(0.32, this.vy * 0.07));

    for (let i = 0; i < 2; i++) {
      this.trail.push({
        x: this.x - 46 + Math.random() * 4,
        y: this.y + (Math.random() - 0.5) * 8,
        vx: -(0.7 + Math.random() * 1.4),
        vy: (Math.random() - 0.5) * 0.5,
        life: 1, size: 2 + Math.random() * 3,
        hue: this.delta > 0 ? (state.frame * 6) % 360 : 185 + Math.random() * 55,
      });
    }
    if (this.lives === 1) {
      this.trail.push({
        x: this.x - 30 + Math.random() * 20,
        y: this.y + (Math.random() - 0.5) * 18,
        vx: -(0.2 + Math.random() * 0.6),
        vy: (Math.random() - 0.5) * 1.5 - 0.4,
        life: 1, size: 8 + Math.random() * 10, smoke: true,
      });
    }
    this.trail.forEach(p => { p.x += p.vx; p.y += p.vy; p.life -= 0.055; });
    this.trail = this.trail.filter(p => p.life > 0);

    if (this.shield   > 0) this.shield--;
    if (this.boost    > 0) this.boost--;
    if (this.bis      > 0) this.bis--;
    if (this.avibras  > 0) this.avibras--;
    if (this.inpe     > 0) this.inpe--;
    if (this.revap    > 0) this.revap--;
    if (this.delta    > 0) this.delta--;
    if (this.ericsson > 0) this.ericsson--;
    if (this.inv      > 0) this.inv--;
    if (this.inverted > 0) this.inverted--;

    if (this.delta > 0 && state.comboT <= 0) { state.combo = Math.max(state.combo, 1); state.comboT = 1; }

    const rate = this.boost > 0 ? FIRE_B : this._fireN;
    const shots: (Bullet | HomingMissile)[] = [];
    if (--this.fireT <= 0) { this.fireT = rate; shots.push(...this._shoot()); }

    if (this.avibras > 0 && --this.missileT <= 0) {
      this.missileT = this.inpe > 0 ? 45 : 90;
      const target = _findMissileTarget();
      if (target) {
        shots.push(new HomingMissile(this.x + 20, this.y - 12, target));
        shots.push(new HomingMissile(this.x + 20, this.y + 12, target));
      }
    }
    return shots;
  }

  _shoot(): Bullet[] {
    sfxShoot();
    if (this.boost > 0 && this.delta > 0)
      return [
        new Bullet(this.x + 44, this.y - 18, -0.16),
        new Bullet(this.x + 44, this.y - 9,  -0.08),
        new Bullet(this.x + 44, this.y,       0),
        new Bullet(this.x + 44, this.y + 9,   0.08),
        new Bullet(this.x + 44, this.y + 18,  0.16),
      ];
    if (this.boost > 0)
      return [
        new Bullet(this.x + 44, this.y - 10, -0.08),
        new Bullet(this.x + 44, this.y,       0),
        new Bullet(this.x + 44, this.y + 10,  0.08),
      ];
    return [new Bullet(this.x + 44, this.y, 0)];
  }

  tryHit(): boolean {
    if (state.dev.godMode || this.bis > 0) return false;
    if (this.inv > 0) return false;
    if (this.shield > 0) {
      this.shield = Math.max(0, this.shield - SHIELD_DUR);
      this.inv = 80;
      sfxHit();
      state.playerStats.shieldBlocks++;
      return false;
    }
    this.lives--;
    this.inv = INV;
    sfxHit();
    explode(this.x, this.y, "#ff4444", 14);
    return true;
  }

  draw(): void {
    this.trail.forEach(p => {
      if (p.smoke) {
        ctx.globalAlpha = p.life * 0.75;
        const v = Math.floor(120 + p.life * 80);
        ctx.fillStyle = `rgb(${v},${Math.floor(v * 0.6)},${Math.floor(v * 0.4)})`;
      } else {
        ctx.globalAlpha = p.life * 0.42;
        ctx.fillStyle = `hsl(${p.hue ?? 185},88%,70%)`;
      }
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2); ctx.fill();
    });
    ctx.globalAlpha = 1;

    if (this.shield > 0) {
      const pulse = 0.22 + Math.sin(state.frame * 0.15) * 0.1;
      ctx.globalAlpha = pulse;
      ctx.strokeStyle = "#00eeff"; ctx.lineWidth = 3;
      ctx.shadowColor = "#00eeff"; ctx.shadowBlur = 14;
      ctx.beginPath(); ctx.ellipse(this.x - 2, this.y, 62, 28, this.tilt, 0, Math.PI * 2); ctx.stroke();
      ctx.shadowBlur = 0; ctx.globalAlpha = 1;
    }

    if (this.inv > 0 && Math.floor(this.inv / 8) % 2) return;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.tilt);

    if (this.bis > 0) {
      const pa = state.frame * 0.38;
      const glow = 0.55 + Math.sin(state.frame * 0.12) * 0.35;
      const pulse = Math.sin(state.frame * 0.18);
      ctx.shadowColor = "#ffd700"; ctx.shadowBlur = 18 + glow * 14;
      ctx.globalAlpha = 0.22 + Math.abs(Math.sin(pa * 2)) * 0.18;
      ctx.fillStyle = "#ffe080";
      ctx.beginPath(); ctx.ellipse(-54, 0, 18, 18, 0, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
      for (let b = 0; b < 2; b++) {
        ctx.save(); ctx.translate(-54, 0); ctx.rotate(pa + b * Math.PI);
        ctx.fillStyle = "#7a3e06";
        ctx.beginPath(); ctx.ellipse(0, 0, 16, 3, 0, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }
      const wingColors = ["#b87010","#d49020","#c07818","#e0a828"];
      [[-48,-34,56,9],[-46,-24,54,9],[-46,15,54,9],[-48,25,56,9]].forEach(([x,y,w,h],i) => {
        ctx.fillStyle = wingColors[i];
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(x,y,w,h,3); else ctx.rect(x,y,w,h);
        ctx.fill();
      });
      ctx.strokeStyle = "#6b3808"; ctx.lineWidth = 1.2;
      [[-48,-25,-8,-15],[-8,-25,-48,-15],[-8,-25,8,-15],[8,-25,-8,-15],
       [-48,15,-8,25],[-8,15,-48,25],[-8,15,8,25],[8,15,-8,25]].forEach(([x1,y1,x2,y2]) => {
        ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke();
      });
      ctx.strokeStyle = "#5a3004"; ctx.lineWidth = 3;
      [-46,-8,8].forEach(x => { ctx.beginPath(); ctx.moveTo(x,-34); ctx.lineTo(x,34); ctx.stroke(); });
      ctx.shadowBlur = 10 + glow * 8;
      const fgrad = ctx.createLinearGradient(-10,-10,-10,10);
      fgrad.addColorStop(0,"#f0c040"); fgrad.addColorStop(0.4,"#d08010"); fgrad.addColorStop(1,"#8a4a04");
      ctx.fillStyle = fgrad;
      ctx.beginPath();
      ctx.moveTo(28,0); ctx.bezierCurveTo(20,-12,-8,-11,-40,-8);
      ctx.lineTo(-40,8); ctx.bezierCurveTo(-8,11,20,12,28,0); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = "#7a4e08"; ctx.lineWidth = 1.2; ctx.stroke();
      ctx.fillStyle = "#c87010";
      ctx.beginPath(); ctx.moveTo(28,0); ctx.lineTo(46,-3); ctx.lineTo(46,3); ctx.closePath(); ctx.fill();
      ctx.fillStyle = "#1e3a5a";
      ctx.beginPath(); ctx.ellipse(10,-4,7,5,-0.2,0,Math.PI*2); ctx.fill();
      ctx.fillStyle = `rgba(150,220,255,${0.55+pulse*0.25})`;
      ctx.beginPath(); ctx.ellipse(11,-5,4,3,-0.2,0,Math.PI*2); ctx.fill();
      ctx.fillStyle="#f0c070"; ctx.beginPath(); ctx.arc(8,-10,5,0,Math.PI*2); ctx.fill();
      ctx.fillStyle="#7a3010"; ctx.beginPath(); ctx.ellipse(8,-13,6,4,0,Math.PI,0); ctx.fill();
      ctx.fillStyle="#b05020"; ctx.beginPath(); ctx.ellipse(8,-13,5,2,0,Math.PI,0); ctx.fill();
      ctx.fillStyle="rgba(80,180,255,0.7)";
      ctx.beginPath(); ctx.ellipse(5,-10,2.5,2,0,0,Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(11,-10,2.5,2,0,0,Math.PI*2); ctx.fill();
      ctx.fillStyle="#c07010";
      ctx.beginPath(); ctx.moveTo(44,0); ctx.lineTo(50,-10); ctx.lineTo(58,-8); ctx.lineTo(50,0); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(44,0); ctx.lineTo(50,10); ctx.lineTo(58,8); ctx.lineTo(50,0); ctx.closePath(); ctx.fill();
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 0.18 + pulse * 0.14;
      ctx.strokeStyle = `hsl(${45+pulse*15},100%,65%)`; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.ellipse(-2,0,72,42,0,0,Math.PI*2); ctx.stroke();
      ctx.globalAlpha = 0.08 + Math.abs(pulse) * 0.10;
      ctx.fillStyle = "#ffe566";
      ctx.beginPath(); ctx.ellipse(-2,0,72,42,0,0,Math.PI*2); ctx.fill();
      ctx.globalAlpha = 1;
    } else if (this.planeId === "e2") {
      ctx.fillStyle = "#e0f2fe";
      ctx.beginPath(); ctx.ellipse(0,0,50,10,0,0,Math.PI*2); ctx.fill();
      ctx.fillStyle = "#bae6fd";
      ctx.beginPath(); ctx.moveTo(44,-3); ctx.bezierCurveTo(56,-3,66,-1,68,0);
      ctx.bezierCurveTo(66,1,56,3,44,3); ctx.closePath(); ctx.fill();
      ctx.fillStyle = "#7dd3fc";
      ctx.beginPath(); ctx.moveTo(4,-3); ctx.lineTo(-16,-28); ctx.lineTo(-32,-22); ctx.lineTo(-14,-3); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(4,3); ctx.lineTo(-16,28); ctx.lineTo(-32,22); ctx.lineTo(-14,3); ctx.closePath(); ctx.fill();
      ctx.fillStyle = "#0ea5e9";
      ctx.beginPath(); ctx.ellipse(-26,-23,6,2,-0.5,0,Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(-26,23,6,2,0.5,0,Math.PI*2); ctx.fill();
      ctx.fillStyle = "#38bdf8";
      ctx.beginPath(); ctx.ellipse(-10,-20,9,3,-0.2,0,Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(-10,20,9,3,0.2,0,Math.PI*2); ctx.fill();
      ctx.fillStyle = "#0284c7";
      ctx.beginPath(); ctx.moveTo(-40,0); ctx.lineTo(-48,-14); ctx.lineTo(-54,-12); ctx.lineTo(-44,0); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-40,0); ctx.lineTo(-48,14); ctx.lineTo(-54,12); ctx.lineTo(-44,0); ctx.closePath(); ctx.fill();
      ctx.fillStyle = "#0369a1"; ctx.fillRect(-38,-4,74,8);
      for (let i = -20; i < 38; i += 9) {
        ctx.fillStyle="#e0f2fe"; ctx.beginPath(); ctx.ellipse(i,0,2.5,2,0,0,Math.PI*2); ctx.fill();
      }
      ctx.fillStyle = "#7dd3fc"; ctx.fillRect(-36,-10,72,3);
    } else if (this.planeId === "c390") {
      ctx.fillStyle = "#d1fae5";
      ctx.beginPath(); ctx.ellipse(-4,0,46,13,0,0,Math.PI*2); ctx.fill();
      ctx.fillStyle = "#a7f3d0";
      ctx.beginPath(); ctx.moveTo(36,-5); ctx.bezierCurveTo(46,-5,54,-2,56,0);
      ctx.bezierCurveTo(54,2,46,5,36,5); ctx.closePath(); ctx.fill();
      ctx.fillStyle = "#6ee7b7";
      ctx.beginPath(); ctx.moveTo(4,-4); ctx.lineTo(-8,-30); ctx.lineTo(-24,-27); ctx.lineTo(-10,-4); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(4,4); ctx.lineTo(-8,30); ctx.lineTo(-24,27); ctx.lineTo(-10,4); ctx.closePath(); ctx.fill();
      ctx.fillStyle = "#34d399";
      ctx.beginPath(); ctx.ellipse(-4,-24,9,3,0,0,Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(-4,24,9,3,0,0,Math.PI*2); ctx.fill();
      ctx.fillStyle = "#059669";
      ctx.beginPath(); ctx.moveTo(-36,0); ctx.lineTo(-44,-18); ctx.lineTo(-50,-15); ctx.lineTo(-40,0); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-36,0); ctx.lineTo(-44,18); ctx.lineTo(-50,15); ctx.lineTo(-40,0); ctx.closePath(); ctx.fill();
      ctx.fillStyle = "#065f46"; ctx.fillRect(-34,-5,66,10);
      for (let i = -18; i < 30; i += 12) {
        ctx.fillStyle="#a7f3d0"; ctx.beginPath(); ctx.ellipse(i,0,2,1.5,0,0,Math.PI*2); ctx.fill();
      }
      ctx.fillStyle = "#10b981"; ctx.fillRect(-32,-11,64,3);
    } else {
      // Tucano / default
      ctx.fillStyle = "#dbeafe";
      ctx.beginPath(); ctx.ellipse(0,0,44,9,0,0,Math.PI*2); ctx.fill();
      ctx.fillStyle = "#bfdbfe";
      ctx.beginPath(); ctx.moveTo(40,-4); ctx.bezierCurveTo(52,-4,62,-2,64,0);
      ctx.bezierCurveTo(62,2,52,4,40,4); ctx.closePath(); ctx.fill();
      ctx.fillStyle = "#93c5fd";
      ctx.beginPath(); ctx.moveTo(8,-3); ctx.lineTo(-8,-26); ctx.lineTo(-30,-23); ctx.lineTo(-20,-3); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(8,3); ctx.lineTo(-8,26); ctx.lineTo(-30,23); ctx.lineTo(-20,3); ctx.closePath(); ctx.fill();
      ctx.fillStyle = "#60a5fa";
      ctx.beginPath(); ctx.ellipse(-14,-18,11,4,-0.15,0,Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(-14,18,11,4,0.15,0,Math.PI*2); ctx.fill();
      ctx.fillStyle = "#1e3a8a";
      ctx.beginPath(); ctx.arc(-22,-18,3,0,Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(-22,18,3,0,Math.PI*2); ctx.fill();
      ctx.fillStyle = "#93c5fd";
      ctx.beginPath(); ctx.moveTo(-38,-1); ctx.lineTo(-44,-11); ctx.lineTo(-52,-9); ctx.lineTo(-42,-1); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-38,1); ctx.lineTo(-44,11); ctx.lineTo(-52,9); ctx.lineTo(-42,1); ctx.closePath(); ctx.fill();
      ctx.fillStyle = "#2563eb";
      ctx.beginPath(); ctx.moveTo(-38,0); ctx.lineTo(-46,-20); ctx.lineTo(-54,-17); ctx.lineTo(-44,0); ctx.closePath(); ctx.fill();
      ctx.fillStyle = "#1e40af"; ctx.fillRect(-32,-3.5,68,7);
      for (let i = -22; i < 40; i += 9) {
        ctx.fillStyle="#fffbeb"; ctx.beginPath(); ctx.ellipse(i,0,2.5,2,0,0,Math.PI*2); ctx.fill();
      }
      ctx.fillStyle = "#3b82f6"; ctx.fillRect(-30,-9,70,3);
    }

    if (this.avibras > 0) {
      const fp = (state.frame * 0.25) % (Math.PI * 2);
      ctx.shadowColor = "#f97316"; ctx.shadowBlur = 8; ctx.fillStyle = "#fbbf24";
      ctx.beginPath(); ctx.ellipse(-14,-20,4,2,-0.3,0,Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(-14,20,4,2,0.3,0,Math.PI*2); ctx.fill();
      ctx.globalAlpha = 0.6 + Math.sin(fp) * 0.3; ctx.fillStyle = "#ef4444";
      ctx.beginPath(); ctx.ellipse(-22,-20,3+Math.sin(fp)*2,2,-0.3,0,Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(-22,20,3+Math.sin(fp)*2,2,0.3,0,Math.PI*2); ctx.fill();
      ctx.globalAlpha = 1; ctx.shadowBlur = 0;
    }
    if (this.inpe > 0) {
      const rp = (state.frame * 0.05) % 1;
      for (let w = 0; w < 3; w++) {
        const t = (rp + w / 3) % 1;
        ctx.globalAlpha = (1 - t) * 0.35; ctx.strokeStyle = "#60a5fa"; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(0, 0, 30 + t * 90, 0, Math.PI * 2); ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
    if (this.revap > 0) {
      const vp = 0.3 + Math.sin(state.frame * 0.15) * 0.2;
      ctx.globalAlpha = vp; ctx.shadowColor = "#bfdbfe"; ctx.shadowBlur = 18;
      ctx.strokeStyle = "#e0f2fe"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(0,0,80,0,Math.PI*2); ctx.stroke();
      ctx.shadowBlur = 0; ctx.globalAlpha = 1;
    }
    if (this.ericsson > 0) {
      ctx.save(); ctx.translate(0,38);
      ctx.shadowColor = "#818cf8"; ctx.shadowBlur = 8; ctx.fillStyle = "#6366f1";
      ctx.beginPath(); ctx.ellipse(0,0,14,5,0,0,Math.PI*2); ctx.fill();
      ctx.fillStyle = "#a5b4fc"; ctx.beginPath(); ctx.ellipse(0,-3,6,4,0,Math.PI,0); ctx.fill();
      ctx.fillStyle = "#c7d2fe"; ctx.fillRect(-12,-2,4,2); ctx.fillRect(8,-2,4,2);
      ctx.shadowBlur = 0; ctx.restore();
    }
    ctx.restore();

    if (this.ericsson > 0) {
      const angle = (state.frame * 0.09) % (Math.PI * 2);
      const ox = this.x + Math.cos(angle) * 44;
      const oy = this.y + Math.sin(angle) * 28;
      ctx.save();
      ctx.strokeStyle = "#818cf8"; ctx.lineWidth = 2; ctx.globalAlpha = 0.75;
      ctx.shadowColor = "#818cf8"; ctx.shadowBlur = 8;
      ctx.beginPath(); ctx.arc(ox,oy,11,0,Math.PI*2); ctx.stroke();
      ctx.shadowBlur = 0; ctx.restore();
    }
  }
}

// ── Bullet ────────────────────────────────────────────────────────────────────

export class Bullet {
  x: number; y: number;
  vy: number; vx = 11;
  r = 4; dead = false;
  hist: { x: number; y: number }[] = [];

  constructor(x: number, y: number, vy: number) {
    this.x = x; this.y = y; this.vy = vy || 0;
  }

  update(): void {
    this.hist.push({ x: this.x, y: this.y });
    if (this.hist.length > 6) this.hist.shift();
    this.x += this.vx;
    this.y += this.vy * this.vx;
    if (this.x > W + 12) this.dead = true;
  }

  draw(): void {
    this.hist.forEach((p, i) => {
      ctx.globalAlpha = (i / this.hist.length) * 0.45;
      ctx.fillStyle = "#60a5fa";
      ctx.beginPath(); ctx.arc(p.x, p.y, this.r * (i / this.hist.length) * 0.8, 0, Math.PI * 2); ctx.fill();
    });
    ctx.globalAlpha = 1;
    ctx.shadowColor = "#93c5fd"; ctx.shadowBlur = 8; ctx.fillStyle = "#dbeafe";
    ctx.beginPath(); ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
  }
}

// ── HomingMissile ─────────────────────────────────────────────────────────────

function _findMissileTarget(): Enemy | null {
  const enemies = state.enemies as Enemy[];
  if (!enemies.length) return null;
  const PRIO: Record<string, number> = { ovni: 0, boss: 1 };
  return enemies.reduce<Enemy | null>((best, e) => {
    if (!best) return e;
    const pm = PRIO[best.type] ?? 2, pe = PRIO[e.type] ?? 2;
    if (pe !== pm) return pe < pm ? e : best;
    const player = state.player as Player;
    if (!player) return best;
    const db = (best.x - player.x) ** 2 + (best.y - player.y) ** 2;
    const de = (e.x    - player.x) ** 2 + (e.y    - player.y) ** 2;
    return de < db ? e : best;
  }, null);
}

export class HomingMissile {
  x: number; y: number;
  target: Enemy;
  vx = 7; vy = 0;
  r = 5; dead = false;
  smoke: { x: number; y: number; life: number }[] = [];

  constructor(x: number, y: number, target: Enemy) {
    this.x = x; this.y = y; this.target = target;
  }

  update(): void {
    this.smoke.push({ x: this.x, y: this.y, life: 1 });
    if (this.smoke.length > 12) this.smoke.shift();
    if (!this.target.dead) {
      const dx = this.target.x - this.x, dy = this.target.y - this.y;
      const len = Math.sqrt(dx * dx + dy * dy) || 1;
      this.vx += (dx / len) * 1.1 - this.vx * 0.04;
      this.vy += (dy / len) * 1.1 - this.vy * 0.04;
    }
    const spd = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
    if (spd > 10) { this.vx = (this.vx / spd) * 10; this.vy = (this.vy / spd) * 10; }
    this.x += this.vx; this.y += this.vy;
    if (this.x > W + 20 || this.x < -20 || this.y < -20 || this.y > H + 20) this.dead = true;
  }

  draw(): void {
    this.smoke.forEach((s, i) => {
      ctx.globalAlpha = 0.35 * (i / this.smoke.length);
      ctx.fillStyle = "#e5e7eb";
      ctx.beginPath(); ctx.arc(s.x, s.y, 3 + (1 - i / this.smoke.length) * 3, 0, Math.PI * 2); ctx.fill();
    });
    ctx.globalAlpha = 1;
    ctx.save();
    ctx.translate(this.x, this.y); ctx.rotate(Math.atan2(this.vy, this.vx));
    ctx.shadowColor = "#f97316"; ctx.shadowBlur = 10; ctx.fillStyle = "#fbbf24";
    ctx.beginPath(); ctx.ellipse(0,0,8,3,0,0,Math.PI*2); ctx.fill();
    ctx.fillStyle = "#ef4444";
    ctx.beginPath(); ctx.moveTo(-8,0); ctx.lineTo(-14,-4); ctx.lineTo(-14,4); ctx.closePath(); ctx.fill();
    ctx.shadowBlur = 0; ctx.restore();
  }
}

// ── Enemy ─────────────────────────────────────────────────────────────────────

export class Enemy {
  type: string;
  x: number; y: number;
  dead = false;
  phase: number;
  vx = 0; vy = 0;
  hp = 1; mhp = 1; r = 20;
  ox: number;
  // type-specific props (initialised to safe defaults)
  shootT = 9999; amp = 0; wingP = 0;
  beamActive = 0; rotorA = 0;
  gearAngle = 0; attackMode = 0; attackCount = 0;
  vulnerable = false; shieldT = 0; laserAngle = 0;
  morphT = 0; morphShape = 0; beamHue = 0;
  dashing = false; dashT = 0; laps = 0;
  blobs: { ox: number; oy: number; r: number }[] = [];
  mpId?: string;

  constructor(type: string, x: number, y: number) {
    this.type = type; this.x = x; this.y = y; this.ox = x;
    this.phase = Math.random() * Math.PI * 2;
    const w = state.waveNum;

    switch (type) {
      case "cloud": {
        const cScale = 1 + Math.min(w, 6) * 0.12;
        this.vx = -(0.9 + Math.random() * 0.5) * (1 + w * 0.04);
        this.hp = this.mhp = Math.ceil(4 * cScale);
        this.r = 38;
        this.shootT = w < 2 ? 9999 : Math.max(45, 110 - w * 6) + Math.floor(Math.random() * 40);
        this.blobs = Array.from({ length: 7 }, () => ({
          ox: (Math.random() - 0.5) * 34, oy: (Math.random() - 0.5) * 22, r: 14 + Math.random() * 14,
        }));
        break;
      }
      case "drone": {
        const dSpeed = 1 + Math.min(w, 8) * 0.08;
        this.vx = -(2.4 + Math.random() * 1.4) * dSpeed;
        this.hp = this.mhp = w >= 5 ? 2 : 1; this.r = 17;
        this.amp = 28 + Math.random() * 60;
        break;
      }
      case "arara": {
        const aSpeed = 1 + Math.min(w, 8) * 0.07;
        this.vx = -(3.8 + Math.random() * 2) * aSpeed;
        this.vy = (Math.random() - 0.5) * (2.8 + w * 0.2);
        this.hp = this.mhp = w >= 6 ? 2 : 1; this.r = 13;
        this.wingP = Math.random() * Math.PI * 2;
        break;
      }
      case "ovni": {
        const oSpeed = 1 + Math.min(w, 6) * 0.06;
        this.vx = -(1.6 + Math.random() * 1.2) * oSpeed;
        this.hp = this.mhp = Math.min(3 + Math.floor(w / 2), 7); this.r = 26;
        this.shootT = Math.max(40, 90 - w * 5) + Math.floor(Math.random() * 30);
        this.beamActive = 0;
        break;
      }
      case "tanajura": {
        const tSpd = 1 + Math.min(w, 8) * 0.1;
        this.vx = -(2.6 + Math.random() * 1.6) * tSpd;
        this.vy = (Math.random() < 0.5 ? 1 : -1) * (1.2 + Math.random() * 1.4);
        this.hp = this.mhp = 1; this.r = 10;
        break;
      }
      case "helicoptero": {
        const hSpd = 0.8 + Math.min(w, 6) * 0.07;
        this.vx = -(1.1 + Math.random() * 0.6) * hSpd;
        this.hp = this.mhp = Math.min(5 + Math.floor(w / 2), 14); this.r = 28;
        this.shootT = Math.max(50, 100 - w * 5) + Math.floor(Math.random() * 40);
        this.rotorA = Math.random() * Math.PI * 2;
        break;
      }
      case "balao": {
        this.vx = -(0.45 + Math.random() * 0.35);
        this.vy = (Math.random() - 0.5) * 0.6;
        this.hp = this.mhp = Math.min(6 + Math.floor(w / 2), 16); this.r = 22;
        break;
      }
      case "boss": {
        this.vx = -0.9;
        this.hp = this.mhp = 42 + w * 12; this.r = 72;
        this.shootT = Math.max(12, 50 - w * 4);
        this.blobs = Array.from({ length: 11 }, () => ({
          ox: (Math.random() - 0.5) * 68, oy: (Math.random() - 0.5) * 44, r: 26 + Math.random() * 24,
        }));
        break;
      }
      case "prototipo_x": {
        this.vx = -5.5; this.hp = this.mhp = 28 + w * 6; this.r = 26;
        this.shootT = Math.max(28, 85 - w * 3); this.phase = 0;
        this.laps = 0; this.dashT = 60; this.dashing = false;
        break;
      }
      case "cemaden_eye": {
        this.y = H / 2; this.vx = 0;
        this.hp = this.mhp = 35 + w * 8; this.r = 44;
        this.shootT = Math.max(20, 45 - w * 2); this.phase = 0;
        this.vulnerable = false; this.shieldT = Math.max(70, 150 - w * 8);
        this.laserAngle = 0; this.attackMode = 0; this.attackCount = 0;
        break;
      }
      case "engrenagem": {
        this.y = H * 0.25; this.vx = 0;
        this.vy = 1.8 + w * 0.18;
        this.hp = this.mhp = 55 + w * 10; this.r = 78;
        this.shootT = Math.max(20, 48 - w * 3);
        this.gearAngle = 0; this.attackCount = 0;
        break;
      }
      case "cigarra": {
        this.vx = -0.5;
        this.hp = this.mhp = 90 + w * 15; this.r = 58;
        this.shootT = Math.max(10, 22 - w);
        this.morphT = 280; this.morphShape = 0; this.beamHue = 0;
        break;
      }
    }

    const dc = state.diffCfg;
    if (dc && dc.hpMult !== 1) {
      this.hp = this.mhp = Math.max(1, Math.ceil(this.mhp * dc.hpMult));
    }
  }

  update(): EBullet[] {
    const nb: EBullet[] = [];
    const player = state.player as Player | null;
    const f = state.frame;

    if (this.type === "cloud") {
      this.x += this.vx;
      this.y += Math.sin(f * 0.014 + this.ox * 0.01) * 0.45;
      this.y = Math.max(58, Math.min(H - 78, this.y));
      if (--this.shootT <= 0) {
        this.shootT = 120 + Math.floor(Math.random() * 60);
        nb.push(new EBullet(this.x - this.r, this.y, "bolt"));
      }
    } else if (this.type === "drone") {
      this.x += this.vx; this.phase += 0.06;
      this.y += Math.sin(this.phase) * 1.2;
      this.y = Math.max(38, Math.min(H - 58, this.y));
    } else if (this.type === "arara") {
      this.x += this.vx; this.y += this.vy; this.wingP += 0.22;
      if (player) {
        const dy = player.y - this.y;
        this.vy += dy * 0.005;
        this.vy = Math.max(-3, Math.min(3, this.vy));
      }
      this.y = Math.max(28, Math.min(H - 48, this.y));
    } else if (this.type === "ovni") {
      this.x += this.vx; this.phase += 0.038;
      this.y += Math.sin(this.phase * 2.2) * 1.9 + Math.cos(this.phase * 1.1) * 0.8;
      this.y = Math.max(36, Math.min(H * 0.62, this.y));
      if (this.beamActive > 0) this.beamActive--;
      if (player && player.shield <= 0 && player.bis <= 0) {
        const dx = this.x - player.x, dy = this.y - player.y;
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
          const dx = player.x - this.x, dy = player.y - this.y;
          const len = Math.sqrt(dx * dx + dy * dy) || 1;
          nb.push(new EBullet(this.x, this.y, "beam", (dx / len) * 3.8, (dy / len) * 3.8));
        }
      }
    } else if (this.type === "tanajura") {
      this.x += this.vx; this.phase += 0.14;
      this.y += this.vy * Math.abs(Math.sin(this.phase));
      this.y = Math.max(24, Math.min(H - 24, this.y));
    } else if (this.type === "helicoptero") {
      this.x += this.vx; this.phase += 0.022;
      this.y += Math.sin(this.phase) * 0.65;
      this.y = Math.max(48, Math.min(H - 68, this.y));
      this.rotorA += 0.32;
      if (--this.shootT <= 0) {
        this.shootT = 130 + Math.floor(Math.random() * 60);
        if (player) {
          const dx = player.x - this.x, dy = player.y - this.y;
          const ang = Math.atan2(dy, dx), spd = 3.0;
          for (const a of [ang - 0.28, ang, ang + 0.28])
            nb.push(new EBullet(this.x - this.r, this.y, "orb", Math.cos(a) * spd, Math.sin(a) * spd));
        }
      }
    } else if (this.type === "balao") {
      this.x += this.vx; this.phase += 0.016;
      this.y += Math.sin(this.phase) * 0.45 + this.vy * 0.25;
      this.y = Math.max(36, Math.min(H - 58, this.y));
    } else if (this.type === "boss") {
      this.x = Math.max(W - 210, this.x + this.vx);
      this.phase += 0.019;
      this.y = H / 2 + Math.sin(this.phase) * 105;
      if (--this.shootT <= 0) {
        this.shootT = Math.max(18, 50 - state.waveNum * 3);
        sfxBossIn();
        if (player) {
          const dx = player.x - this.x, dy = player.y - this.y;
          const len = Math.sqrt(dx * dx + dy * dy) || 1;
          nb.push(new EBullet(this.x - this.r, this.y, "orb", (dx / len) * 4.2, (dy / len) * 4.2));
        }
      }
    } else if (this.type === "prototipo_x") {
      this.phase += 0.06;
      if (this.dashing) {
        this.x += this.vx;
        if (this.x < -80) {
          this.x = W + 100; this.laps++;
          this.dashing = false;
          this.dashT = Math.max(80, 170 - this.laps * 10);
          this.vx = -(5.5 + this.laps * 0.7);
        }
        if (player && Math.abs(this.x - player.x) < 36) {
          player.pullX += (this.x < player.x ? -1 : 1) * 4;
        }
      } else {
        const tx = W - 150 - Math.sin(this.phase * 0.4) * 60;
        this.x += (tx - this.x) * 0.04;
        this.y = H / 2 + Math.sin(this.phase) * (80 + this.laps * 12);
        this.y = Math.max(36, Math.min(H - 36, this.y));
        if (--this.dashT <= 0) this.dashing = true;
      }
      if (--this.shootT <= 0) {
        this.shootT = Math.max(22, 65 - this.laps * 5 - state.waveNum * 2);
        sfxBossIn();
        if (player) {
          const baseAng = Math.atan2(player.y - this.y, player.x - this.x);
          const spread = 0.18 + this.laps * 0.025;
          const spd = 4.0 + this.laps * 0.2;
          for (let a = -2; a <= 2; a++)
            nb.push(new EBullet(this.x, this.y, "orb",
              Math.cos(baseAng + a * spread) * spd, Math.sin(baseAng + a * spread) * spd));
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
            nb.push(new EBullet(W * 0.3 + Math.random() * W * 0.4, 0, "orb",
              (Math.random() - 0.5) * 2, 3 + Math.random() * 2));
        } else if (this.attackMode === 1) {
          for (let i = 0; i < 5; i++) {
            const a = this.laserAngle + i * 0.15;
            nb.push(new EBullet(this.x, this.y, "beam", Math.cos(a) * 4, Math.sin(a) * 4));
          }
        } else if (player) {
          for (let i = 0; i < 3; i++)
            nb.push(new EBullet(player.x + (i - 1) * 22, 0, "orb",
              (Math.random() - 0.5) * 0.5, 4.5));
        }
      }
    } else if (this.type === "engrenagem") {
      if (this.x > W - 110) this.x -= 3.5;
      this.y += this.vy; this.gearAngle += 0.022;
      if (this.y < H * 0.18 || this.y > H * 0.82) this.vy *= -1;
      this.y = Math.max(H * 0.18, Math.min(H * 0.82, this.y));
      if (--this.shootT <= 0) {
        this.shootT = Math.max(25, 50 - state.waveNum * 2);
        this.attackCount++; sfxBossIn();
        for (let i = -1; i <= 1; i++)
          nb.push(new EBullet(this.x - this.r, this.y + i * 30, "bolt"));
        if (this.attackCount % 5 === 0)
          setTimeout(() => {
            if (state.gState === 1) (state.enemies as Enemy[]).push(new Enemy("drone", this.x, H * 0.5));
          }, 200);
        if (this.attackCount % 3 === 0) {
          const bo = new EBullet(this.x - this.r, this.y, "orb", -3, (Math.random() - 0.5) * 3);
          bo.bouncing = true;
          nb.push(bo);
        }
      }
    } else if (this.type === "cigarra") {
      this.x += this.vx; this.x = Math.max(W - 250, this.x);
      this.phase += 0.022;
      this.y = H / 2 + Math.sin(this.phase) * 100;
      this.beamHue = (this.beamHue + 2) % 360;
      if (--this.morphT <= 0) {
        this.morphT = 280; this.morphShape = (this.morphShape + 1) % 3;
        if (player) player.inverted = 180;
        state.shakeAmt += 8;
        for (const c of (state.collectibles as Collectible[])) {
          const dx = this.x - c.x, dy = this.y - c.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          if (dist < 300) { c.x += (dx / dist) * 6; c.y += (dy / dist) * 6; }
        }
      }
      if (--this.shootT <= 0) {
        this.shootT = 28;
        if (player) {
          const dx = player.x - this.x, dy = player.y - this.y;
          const len = Math.sqrt(dx * dx + dy * dy) || 1;
          const b = new EBullet(this.x, this.y, "beam", (dx / len) * 4, (dy / len) * 4);
          b.hue = this.beamHue;
          nb.push(b);
        }
      }
    }

    const isBoss = BOSS_TYPES.includes(this.type as typeof BOSS_TYPES[number]);
    if (!isBoss && this.x < -220) this.dead = true;
    return nb;
  }

  hit(dmg = 1): number {
    if (this.type === "cemaden_eye" && !this.vulnerable) return 0;
    this.hp -= dmg;
    spark(this.x, this.y);
    if (this.hp <= 0) {
      sfxBang();
      explode(this.x, this.y,
        this.type === "boss" ? "#ff8800" : this.type === "balao" ? "#bfdbfe" : "#ff6600",
        this.type === "boss" ? 32 : 13);
      this.dead = true;
      if (this.type === "balao") {
        const bx = this.x, by = this.y;
        for (let i = 0; i < 2 + Math.floor(Math.random() * 2); i++) {
          setTimeout(() => {
            if (state.gState === 1)
              (state.enemies as Enemy[]).push(new Enemy("drone", bx + Math.random() * 30, by + (Math.random() - 0.5) * 40));
          }, i * 220);
        }
      }
      return this._pts();
    }
    return 0;
  }

  private _pts(): number {
    return ({
      cloud: 80, drone: 150, arara: 100, ovni: 320, boss: 2500,
      tanajura: 90, helicoptero: 280, balao: 180,
      prototipo_x: 3000, cemaden_eye: 3500, engrenagem: 4000, cigarra: 5000,
    } as Record<string, number>)[this.type] ?? 50;
  }

  hb(): { x: number; y: number; r: number } {
    return { x: this.x, y: this.y, r: this.r * 0.78 };
  }

  draw(): void {
    if (this.type === "cloud" || this.type === "boss") {
      const isB = this.type === "boss";
      const hp = this.hp / this.mhp;
      ctx.shadowColor = isB ? "rgba(255,100,0,.5)" : "rgba(80,120,220,.3)";
      ctx.shadowBlur = isB ? 28 : 12;
      this.blobs.forEach(b => {
        ctx.fillStyle = isB
          ? `rgba(${60 + hp * 90},${20},${8},.9)`
          : `rgba(${82 + hp * 55},${95 + hp * 55},${145 + hp * 55},.82)`;
        ctx.beginPath(); ctx.arc(this.x + b.ox, this.y + b.oy, b.r, 0, Math.PI * 2); ctx.fill();
      });
      ctx.shadowBlur = 0;
      if (isB) this._drawHPBar("MONSTRO CLIMÁTICO");
    } else if (this.type === "drone") {
      ctx.save(); ctx.translate(this.x, this.y);
      ctx.fillStyle = "#1a1a2e";
      ctx.beginPath(); ctx.moveTo(18,0); ctx.lineTo(-8,-10); ctx.lineTo(-20,0); ctx.lineTo(-8,10); ctx.closePath(); ctx.fill();
      ctx.fillStyle = "#2d2d4e";
      ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(-4,-22); ctx.lineTo(-16,-20); ctx.lineTo(-10,0); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(-4,22); ctx.lineTo(-16,20); ctx.lineTo(-10,0); ctx.closePath(); ctx.fill();
      ctx.fillStyle = "#ff3333"; ctx.shadowColor = "#ff0000"; ctx.shadowBlur = 6;
      ctx.beginPath(); ctx.arc(8,0,4,0,Math.PI*2); ctx.fill();
      ctx.shadowBlur = 0; ctx.restore();
    } else if (this.type === "arara") {
      ctx.save(); ctx.translate(this.x, this.y);
      const wf = Math.sin(this.wingP) * 9;
      ctx.fillStyle = "#1d4ed8"; ctx.beginPath(); ctx.ellipse(0,0,12,5,0,0,Math.PI*2); ctx.fill();
      ctx.fillStyle = "#2563eb"; ctx.beginPath(); ctx.arc(12,-2,5,0,Math.PI*2); ctx.fill();
      ctx.fillStyle = "#fbbf24";
      ctx.beginPath(); ctx.moveTo(16,-3); ctx.lineTo(22,-2); ctx.lineTo(16,-1); ctx.closePath(); ctx.fill();
      ctx.fillStyle = "#16a34a";
      ctx.beginPath(); ctx.moveTo(-2,0); ctx.lineTo(-8,-8-wf); ctx.lineTo(-18,-4-wf*0.5); ctx.lineTo(-8,0); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-2,0); ctx.lineTo(-8,8+wf); ctx.lineTo(-18,4+wf*0.5); ctx.lineTo(-8,0); ctx.closePath(); ctx.fill();
      ctx.fillStyle = "#ef4444";
      ctx.beginPath(); ctx.moveTo(-10,0); ctx.lineTo(-20,-4); ctx.lineTo(-18,0); ctx.lineTo(-20,4); ctx.closePath(); ctx.fill();
      ctx.restore();
    } else if (this.type === "ovni") {
      ctx.save(); ctx.translate(this.x, this.y);
      const player = state.player as Player | null;
      const pulse = 0.55 + Math.sin(state.frame * 0.13) * 0.38;
      if (this.beamActive > 0 && player) {
        const ba = this.beamActive / 38;
        const tx = player.x - this.x, ty = player.y - this.y;
        const dist = Math.sqrt(tx * tx + ty * ty) || 1;
        const bLen = Math.min(dist, 200);
        ctx.save();
        ctx.rotate(Math.atan2(ty, tx) - Math.PI / 2);
        const bg = ctx.createLinearGradient(0,10,0,bLen);
        bg.addColorStop(0, `rgba(0,255,110,${ba*0.5})`);
        bg.addColorStop(1, "rgba(0,255,110,0)");
        ctx.fillStyle = bg;
        ctx.beginPath(); ctx.moveTo(-14,10); ctx.lineTo(-28,bLen); ctx.lineTo(28,bLen); ctx.lineTo(14,10); ctx.closePath(); ctx.fill();
        ctx.restore();
      }
      ctx.shadowColor = "#00ff88"; ctx.shadowBlur = 14 * pulse;
      ctx.fillStyle = `rgba(160,255,170,${0.78 * pulse})`;
      ctx.beginPath(); ctx.ellipse(0,2,26,9,0,0,Math.PI*2); ctx.fill();
      ctx.fillStyle = `rgba(100,255,140,${0.88 * pulse})`;
      ctx.beginPath(); ctx.ellipse(0,-3,13,10,0,Math.PI,0); ctx.fill();
      ctx.shadowBlur = 6;
      [-17,-9,0,9,17].forEach((lx, i) => {
        ctx.fillStyle = `hsl(${110+i*28},100%,65%)`;
        ctx.beginPath(); ctx.arc(lx,3,2.2,0,Math.PI*2); ctx.fill();
      });
      ctx.shadowBlur = 0; ctx.restore();
    } else if (this.type === "tanajura") {
      ctx.save(); ctx.translate(this.x, this.y);
      ctx.globalAlpha = 0.52; ctx.fillStyle = "#d4cefa";
      ctx.beginPath(); ctx.ellipse(-2,-5,7,3,-0.3,0,Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(-2,5,7,3,0.3,0,Math.PI*2); ctx.fill();
      ctx.globalAlpha = 1; ctx.fillStyle = "#92400e";
      ctx.beginPath(); ctx.ellipse(0,0,9,5,0,0,Math.PI*2); ctx.fill();
      ctx.fillStyle = "#b45309"; ctx.beginPath(); ctx.arc(9,0,4,0,Math.PI*2); ctx.fill();
      ctx.strokeStyle = "#78350f"; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(9,-4); ctx.lineTo(14,-8); ctx.moveTo(9,-4); ctx.lineTo(15,-4); ctx.stroke();
      ctx.restore();
    } else if (this.type === "helicoptero") {
      ctx.save(); ctx.translate(this.x, this.y);
      const hp = this.hp / this.mhp;
      ctx.fillStyle = `rgb(${30+(1-hp)*55},${58+(1-hp)*20},22)`;
      ctx.beginPath(); ctx.ellipse(-4,0,24,10,0,0,Math.PI*2); ctx.fill();
      ctx.fillStyle = "#2d4a18";
      ctx.beginPath(); ctx.moveTo(-24,0); ctx.lineTo(-40,-5); ctx.lineTo(-38,0); ctx.lineTo(-40,5); ctx.closePath(); ctx.fill();
      ctx.fillStyle = "rgba(120,210,255,0.45)"; ctx.beginPath(); ctx.ellipse(13,-2,9,7,0.2,0,Math.PI*2); ctx.fill();
      ctx.save(); ctx.rotate(this.rotorA); ctx.strokeStyle = "#3a5c20"; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(-24,0); ctx.lineTo(24,0); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0,-24); ctx.lineTo(0,24); ctx.stroke();
      ctx.restore();
      ctx.fillStyle = "#6b7280"; ctx.beginPath(); ctx.arc(0,0,3,0,Math.PI*2); ctx.fill();
      ctx.restore();
    } else if (this.type === "balao") {
      ctx.save(); ctx.translate(this.x, this.y);
      const hp = this.hp / this.mhp;
      ctx.shadowColor = "rgba(190,210,255,0.35)"; ctx.shadowBlur = 10;
      ctx.fillStyle = `rgba(${200+(1-hp)*50},215,240,.86)`;
      ctx.beginPath(); ctx.ellipse(0,0,22,27,0,0,Math.PI*2); ctx.fill();
      ctx.strokeStyle = "rgba(160,175,210,.4)"; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(-22,0); ctx.lineTo(22,0); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0,-27); ctx.lineTo(0,27); ctx.stroke();
      ctx.shadowBlur = 0; ctx.strokeStyle = "#94a3b8"; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(-7,23); ctx.lineTo(-5,35); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(7,23); ctx.lineTo(5,35); ctx.stroke();
      ctx.fillStyle = "#78563a"; ctx.fillRect(-8,33,16,8);
      ctx.restore();
    }

    const isBossType = BOSS_TYPES.includes(this.type as typeof BOSS_TYPES[number]);

    if (this.type === "prototipo_x") {
      ctx.save(); ctx.translate(this.x, this.y);
      const hpR = this.hp / this.mhp;
      ctx.shadowColor = `hsl(${hpR*30+200},90%,55%)`; ctx.shadowBlur = 16;
      ctx.fillStyle = `hsl(${hpR*30+200},70%,28%)`;
      ctx.beginPath(); ctx.moveTo(28,0); ctx.lineTo(-8,-10); ctx.lineTo(-26,-6); ctx.lineTo(-26,6); ctx.lineTo(-8,10); ctx.closePath(); ctx.fill();
      ctx.fillStyle = `hsl(${hpR*30+200},60%,38%)`;
      ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(-20,-28); ctx.lineTo(-30,-20); ctx.lineTo(-8,0); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(-20,28); ctx.lineTo(-30,20); ctx.lineTo(-8,0); ctx.closePath(); ctx.fill();
      ctx.fillStyle = "#ff3333"; ctx.shadowColor = "#ff0000"; ctx.shadowBlur = 8;
      ctx.beginPath(); ctx.arc(12,-6,3,0,Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(12,6,3,0,Math.PI*2); ctx.fill();
      ctx.shadowBlur = 0; ctx.restore();
      this._drawHPBar("PROTÓTIPO X");
    } else if (this.type === "cemaden_eye") {
      ctx.save(); ctx.translate(this.x, this.y);
      const hpR = this.hp / this.mhp;
      if (!this.vulnerable) {
        const sAngle = state.frame * 0.03;
        for (let i = 0; i < 6; i++) {
          const a = sAngle + i * (Math.PI * 2 / 6);
          ctx.fillStyle = "rgba(100,130,200,0.65)";
          ctx.beginPath(); ctx.arc(Math.cos(a)*55, Math.sin(a)*55, 16, 0, Math.PI*2); ctx.fill();
        }
      }
      ctx.shadowColor = this.vulnerable ? "#ff4444" : "#6688cc"; ctx.shadowBlur = 20;
      ctx.fillStyle = this.vulnerable ? `rgba(${Math.round(200+hpR*55)},60,60,.9)` : "rgba(40,60,140,.85)";
      ctx.beginPath(); ctx.ellipse(0,0,44,28,0,0,Math.PI*2); ctx.fill();
      ctx.fillStyle = this.vulnerable ? "#fff" : "#1a2a6e";
      ctx.beginPath(); ctx.ellipse(0,0,20,26,0,0,Math.PI*2); ctx.fill();
      ctx.fillStyle = this.vulnerable ? "#ff4444" : "#4488ff";
      ctx.beginPath(); ctx.arc(0,0,14,0,Math.PI*2); ctx.fill();
      ctx.fillStyle = "#000"; ctx.beginPath(); ctx.arc(0,0,8,0,Math.PI*2); ctx.fill();
      ctx.shadowBlur = 0; ctx.restore();
      this._drawHPBar("OLHO DO CEMADEN");
    } else if (this.type === "engrenagem") {
      ctx.save(); ctx.translate(this.x, this.y); ctx.rotate(this.gearAngle);
      const hpR = this.hp / this.mhp;
      ctx.shadowColor = "#c87020"; ctx.shadowBlur = 18;
      ctx.fillStyle = `rgba(${Math.round(80+hpR*60)},60,40,.9)`;
      ctx.beginPath(); ctx.arc(0,0,this.r*0.65,0,Math.PI*2); ctx.fill();
      ctx.fillStyle = `rgba(${Math.round(100+hpR*80)},70,30,.88)`;
      for (let i = 0; i < 8; i++) {
        ctx.save(); ctx.rotate(i * Math.PI/4);
        ctx.fillRect(-8,-this.r*0.65,16,24);
        ctx.restore();
      }
      ctx.fillStyle = "#1a0a00"; ctx.beginPath(); ctx.arc(0,0,this.r*0.28,0,Math.PI*2); ctx.fill();
      ctx.shadowBlur = 0; ctx.restore();
      this._drawHPBar("GRANDE ENGRENAGEM");
    } else if (this.type === "cigarra") {
      ctx.save(); ctx.translate(this.x, this.y);
      ctx.shadowColor = `hsl(${this.beamHue},100%,60%)`; ctx.shadowBlur = 24;
      ctx.strokeStyle = `hsl(${this.beamHue},100%,60%)`; ctx.lineWidth = 3;
      ctx.fillStyle = `hsla(${this.beamHue},80%,18%,.88)`;
      if (this.morphShape === 0) {
        ctx.beginPath(); ctx.arc(0,0,this.r*0.7,0,Math.PI*2); ctx.fill(); ctx.stroke();
      } else if (this.morphShape === 1) {
        ctx.beginPath();
        for (let i = 0; i < 3; i++) {
          const a = i * Math.PI*2/3 - Math.PI/2;
          if (i === 0) ctx.moveTo(Math.cos(a)*this.r*0.8, Math.sin(a)*this.r*0.8);
          else ctx.lineTo(Math.cos(a)*this.r*0.8, Math.sin(a)*this.r*0.8);
        }
        ctx.closePath(); ctx.fill(); ctx.stroke();
      } else {
        ctx.beginPath(); ctx.ellipse(0,0,this.r*0.9,this.r*0.3,0,0,Math.PI*2); ctx.fill(); ctx.stroke();
      }
      ctx.shadowBlur = 0; ctx.restore();
      this._drawHPBar("A CIGARRA");
    }

    if (!isBossType) {
      const bw = this.r * 1.4, bx = this.x - bw / 2, by = this.y - this.r - 8;
      ctx.fillStyle = "rgba(0,0,0,.55)"; ctx.fillRect(bx, by, bw, 4);
      ctx.fillStyle = "#ef4444"; ctx.fillRect(bx, by, bw * (this.hp / this.mhp), 4);
    }
  }

  private _drawHPBar(label: string): void {
    const hp = this.hp / this.mhp;
    const bw = 150, bx = this.x - bw / 2, by = this.y - this.r - 22;
    ctx.fillStyle = "rgba(0,0,0,.55)"; ctx.fillRect(bx, by, bw, 9);
    ctx.fillStyle = "#ef4444"; ctx.fillRect(bx, by, bw * hp, 9);
    ctx.fillStyle = "#fff"; ctx.font = "bold 10px Courier New";
    ctx.textAlign = "center"; ctx.fillText(label, this.x, by - 4); ctx.textAlign = "left";
  }
}

// ── EBullet ───────────────────────────────────────────────────────────────────

export class EBullet {
  x: number; y: number; kind: string;
  vx: number; vy: number;
  dead = false; age = 0; grazed = false;
  bouncing = false; bounceCount = 0;
  hue: number | null = null;

  constructor(x: number, y: number, kind: string, vx?: number, vy?: number) {
    this.x = x; this.y = y; this.kind = kind;
    this.vx = vx ?? -5; this.vy = vy ?? 0;
  }

  update(): void {
    this.x += this.vx; this.y += this.vy; this.age++;
    if (this.bouncing) {
      if (this.x <= 0 || this.x >= W) { this.vx *= -1; this.x = Math.max(1, Math.min(W-1, this.x)); this.bounceCount++; }
      if (this.y <= 0 || this.y >= H) { this.vy *= -1; this.y = Math.max(1, Math.min(H-1, this.y)); this.bounceCount++; }
      if (this.bounceCount >= 12) this.dead = true;
      return;
    }
    if (this.x < -30 || this.y < -30 || this.y > H + 30) this.dead = true;
  }

  hb(): { x: number; y: number; r: number } {
    return { x: this.x, y: this.y, r: this.kind === "orb" ? 11 : this.kind === "beam" ? 9 : 8 };
  }

  draw(): void {
    ctx.save(); ctx.translate(this.x, this.y);
    if (this.kind === "bolt") {
      ctx.strokeStyle = `rgba(255,255,80,${0.6 + Math.sin(this.age * 0.55) * 0.3})`;
      ctx.lineWidth = 2.5; ctx.shadowColor = "#ffff00"; ctx.shadowBlur = 10;
      ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(-7,6); ctx.lineTo(-13,-4); ctx.lineTo(-20,7); ctx.lineTo(-30,0); ctx.stroke();
    } else if (this.kind === "beam") {
      const h = this.hue !== null ? this.hue : 145;
      const g = ctx.createRadialGradient(0,0,0,0,0,9);
      g.addColorStop(0, `hsla(${h},100%,70%,.92)`);
      g.addColorStop(1, `hsla(${h},100%,50%,0)`);
      ctx.fillStyle = g; ctx.shadowColor = `hsl(${h},100%,60%)`; ctx.shadowBlur = 12;
      ctx.beginPath(); ctx.arc(0,0,9,0,Math.PI*2); ctx.fill();
    } else {
      ctx.fillStyle = "#ff7777"; ctx.shadowColor = "#ff4444"; ctx.shadowBlur = 10;
      ctx.beginPath(); ctx.arc(0,0,9,0,Math.PI*2); ctx.fill();
    }
    ctx.shadowBlur = 0; ctx.restore();
  }
}

// ── Collectible ───────────────────────────────────────────────────────────────

export class Collectible {
  x: number; y: number;
  r = 16; dead = false; age = 0;
  type: CollectibleType;
  vx: number;
  mpId?: string;

  constructor(x: number, y: number) {
    this.x = x; this.y = y;
    this.type = CTYPES[Math.floor(Math.random() * CTYPES.length)];
    this.vx = -(1 + Math.random() * 0.5);
  }

  update(): void {
    this.x += this.vx;
    this.y += Math.sin(this.age * 0.04) * 0.8;
    this.age++;
    if (this.x < -35) this.dead = true;
  }

  draw(): void {
    ctx.save(); ctx.translate(this.x, this.y);
    const pulse = 0.55 + Math.sin(this.age * 0.1) * 0.35;
    ctx.shadowColor = this.type.glow; ctx.shadowBlur = 16 * pulse;
    ctx.globalAlpha = 0.88; ctx.fillStyle = this.type.col;
    ctx.beginPath(); ctx.arc(0,0,this.r,0,Math.PI*2); ctx.fill();
    ctx.globalAlpha = 1; ctx.strokeStyle = "#fff"; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.shadowBlur = 0;
    if (this.type.pw) {
      ctx.font = "13px sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(this.type.icon, 0, 1);
    } else {
      ctx.fillStyle = "#fff"; ctx.font = "bold 6px Courier New";
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(this.type.lbl, 0, 0);
    }
    ctx.strokeStyle = `rgba(255,255,255,${0.22 + pulse * 0.25})`; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(0,0,this.r + 5 + pulse * 3, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  }
}

// ── Drop table ────────────────────────────────────────────────────────────────

export function dropCollectibles(x: number, y: number, enemyType: string): void {
  const table = DROP_TABLE[enemyType] ?? DROP_TABLE["cloud"]!;
  const maxDrops = BOSS_TYPES.includes(enemyType as typeof BOSS_TYPES[number]) ? 6 : 2;
  let dropped = 0;
  for (const ct of CTYPES) {
    if (dropped >= maxDrops) break;
    const base = table[ct.id] ?? 0;
    if (base === 0) continue;
    let chance = base;
    if (ct.pw) {
      const picks = state.playerStats.pw[ct.id] ?? 0;
      chance *= (state.diffCfg.dropMult ?? 1) / (1 + picks * 0.14);
    }
    const boost = ct.id === "14bis" ? 1 + Math.max(0, state.combo - 5) * 0.9 : 1;
    if (Math.random() < chance * boost) {
      const c = new Collectible(x, y);
      c.type = ct;
      (state.collectibles as Collectible[]).push(c);
      dropped++;
    }
  }
}

// Re-export sfxBossIn for use in game.ts / entities internally
export { sfxBossIn };
