import { state } from "./state";
import { ctx, W, H } from "./world";
import { sprites, getOrBake } from "./assets";
import { drawPlayer } from "./renderer";
import {
  SHIELD_DUR, BOOST_DUR, BIS_DUR, AVIBRAS_DUR, INPE_DUR, REVAP_DUR,
  DELTA_DUR, ERICSSON_DUR, INV, FIRE_N, FIRE_B, BOSS_TYPES,
  CTYPES, DROP_TABLE, PLANES,
} from "./constants";
import { sfxShoot, sfxHit, sfxShieldHit, sfxBang, sfxPowerup, sfxBossIn } from "./audio";
import type { Circle, Particle, FloatText, TrailParticle, CollectibleType, PlayerPerks } from "./types";

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
  inpe = 0; revap = 0; delta = 0; ericsson = 0; fabJet = 0;
  inv = 0; inverted = 0;
  specialCD = 0; specialActive = 0; specialMaxCD = 0;
  fireT = 0; missileT = 0;
  trail: TrailParticle[] = [];
  perks: PlayerPerks = {
    bulletEvasion:   0,
    impactEvasion:   0,
    dmgBonus:        0,
    grazeRadiusMult: 1.0,
    comboTimeMult:   1.0,
    invMult:         1.0,
    spreadShots:     0,
  };

  constructor(planeCfg = PLANES[0]) {
    this.x = 110;
    this.y = H / 2;
    this.planeId    = planeCfg.id;
    this.lives      = planeCfg.lives;
    this.maxLives   = planeCfg.lives;
    this.accel      = planeCfg.accel;
    this.topSpd     = planeCfg.maxSpd;
    this._fireN     = planeCfg.fireN;
    this.specialMaxCD = planeCfg.specialMaxCD;
  }

  update(k: Record<string, boolean>): (Bullet | HomingMissile)[] {
    const spd = this.topSpd * (this.specialActive > 0 && this.planeId === "e2" ? 1.6 : 1);
    const up = k.ArrowUp || k.KeyW, dn = k.ArrowDown || k.KeyS;
    const lt = k.ArrowLeft || k.KeyA, rt = k.ArrowRight || k.KeyD;
    const inv = this.inverted > 0;
    const accel = this.delta > 0 ? this.accel * 4 : this.accel;
    const friction = this.delta > 0 ? 0.22 : 0.84;

    if (state.touch.active) {
      this.vx = state.touch.vx * spd * 0.65;
      this.vy = state.touch.vy * spd * 0.65 * (inv ? -1 : 1);
    } else {
      const eu = inv ? dn : up, ed = inv ? up : dn;
      const el = lt, er = rt;
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
    if (this.fabJet   > 0) this.fabJet--;
    if (this.inv          > 0) this.inv--;
    if (this.inverted     > 0) this.inverted--;
    if (this.specialCD    > 0) this.specialCD--;
    if (this.specialActive > 0) this.specialActive--;

    if (this.delta > 0 && state.comboT <= 0) { state.combo = Math.max(state.combo, 1); state.comboT = 1; }

    const rate = this.boost > 0 || (this.specialActive > 0 && this.planeId === "tucano") ? FIRE_B : this._fireN;
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
    const mk = (dy: number, ang: number) => new Bullet(this.x + 44, this.y + dy, ang);
    let bullets: Bullet[];
    if (this.specialActive > 0 && this.planeId === "tucano" && this.boost <= 0 && this.delta <= 0)
      bullets = [mk(-10, -0.08), mk(0, 0), mk(10, 0.08)];
    else if (this.boost > 0 && this.delta > 0)
      bullets = [mk(-18, -0.16), mk(-9, -0.08), mk(0, 0), mk(9, 0.08), mk(18, 0.16)];
    else if (this.boost > 0)
      bullets = [mk(-10, -0.08), mk(0, 0), mk(10, 0.08)];
    else
      bullets = [mk(0, 0)];
    for (let i = 0; i < this.perks.spreadShots; i++) {
      const side = i % 2 === 0 ? 1 : -1;
      const lvl = Math.floor(i / 2) + 1;
      bullets.push(mk(side * 12 * lvl, side * 0.12 * lvl));
    }
    return bullets;
  }

  tryHit(): boolean {
    if (state.dev.godMode || this.bis > 0) return false;
    if (this.inv > 0) return false;
    if (this.shield > 0) {
      this.shield = Math.max(0, this.shield - SHIELD_DUR);
      this.inv = 80;
      sfxShieldHit();
      state.playerStats.shieldBlocks++;
      return false;
    }
    this.lives--;
    this.inv = Math.round(INV * this.perks.invMult);
    sfxHit();
    explode(this.x, this.y, "#ff4444", 14);
    return true;
  }

  _drawSprite(name: string): boolean {
    const img = sprites[name];
    if (!img) return false;
    ctx.drawImage(img, -img.width / 2, -img.height / 2);
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
      const f     = state.frame;
      const stacks = Math.min(3, Math.ceil(this.shield / SHIELD_DUR));
      const pulse  = Math.sin(f * 0.12);
      const rot    = f * 0.007;

      ctx.save();
      ctx.translate(this.x - 2, this.y);
      ctx.rotate(this.tilt + rot);

      // Fresnel glow (brilho nas bordas, escuro no centro)
      const radG = ctx.createRadialGradient(0, 0, 14, 0, 0, 64);
      radG.addColorStop(0,    "rgba(0,238,255,0)");
      radG.addColorStop(0.78, "rgba(0,238,255,0.03)");
      radG.addColorStop(0.92, `rgba(0,238,255,${0.10 + pulse * 0.05})`);
      radG.addColorStop(1,    `rgba(0,238,255,${0.22 + pulse * 0.08})`);
      ctx.fillStyle = radG;
      ctx.beginPath(); ctx.ellipse(0, 0, 64, 29, 0, 0, Math.PI * 2); ctx.fill();

      // Grid hexagonal (clippado na ellipse)
      ctx.save();
      ctx.beginPath(); ctx.ellipse(0, 0, 61, 26, 0, 0, Math.PI * 2); ctx.clip();
      ctx.strokeStyle = `rgba(0,238,255,${0.13 + Math.abs(pulse) * 0.05})`;
      ctx.lineWidth = 0.5;
      const S = 13;
      for (let i = -7; i <= 7; i++) {
        ctx.beginPath(); ctx.moveTo(-75, i * S);              ctx.lineTo(75, i * S);              ctx.stroke();
        ctx.beginPath(); ctx.moveTo(i * S * 0.87 - 50, -35); ctx.lineTo(i * S * 0.87 + 50, 35); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-(i * S * 0.87) + 50,-35); ctx.lineTo(-(i * S * 0.87) - 50, 35); ctx.stroke();
      }
      ctx.restore();

      // Anel externo principal
      ctx.shadowColor = "#00eeff"; ctx.shadowBlur = 14 + Math.abs(pulse) * 10;
      ctx.strokeStyle = `rgba(0,238,255,${0.65 + pulse * 0.25})`;
      ctx.lineWidth = 1.2 + stacks * 0.5;
      ctx.beginPath(); ctx.ellipse(0, 0, 63, 28, 0, 0, Math.PI * 2); ctx.stroke();

      // Anel interno (counter-rotate)
      ctx.rotate(-rot * 2.8);
      ctx.strokeStyle = `rgba(120,240,255,${0.25 + Math.abs(pulse) * 0.15})`;
      ctx.lineWidth = 0.7; ctx.shadowBlur = 4;
      ctx.beginPath(); ctx.ellipse(0, 0, 55, 22, 0, 0, Math.PI * 2); ctx.stroke();

      // Nós de energia ao longo do perímetro
      ctx.shadowBlur = 10; ctx.fillStyle = "#00ffff";
      const nNodes = 6 + stacks * 2;
      for (let i = 0; i < nNodes; i++) {
        const na = (i / nNodes) * Math.PI * 2 + rot * 3;
        const nx = Math.cos(na) * 63, ny = Math.sin(na) * 28;
        const nr = 0.7 + Math.abs(Math.sin(f * 0.18 + i * 1.3)) * 1.8;
        ctx.globalAlpha = 0.5 + Math.sin(f * 0.18 + i * 1.3) * 0.35;
        ctx.beginPath(); ctx.arc(nx, ny, nr, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1; ctx.shadowBlur = 0;
      ctx.restore();
    }

    if (this.inv > 0 && Math.floor(this.inv / 8) % 2) return;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.tilt);

    drawPlayer(ctx, this);

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
    ctx.restore(); // matches ctx.save() at translate(this.x, this.y)

    if (this.ericsson > 0) {
      const angle = (state.frame * 0.09) % (Math.PI * 2);
      const ox = this.x + Math.cos(angle) * 44;
      const oy = this.y + Math.sin(angle) * 28;
      ctx.save();
      ctx.translate(ox, oy);
      ctx.shadowColor = "#818cf8"; ctx.shadowBlur = 10;
      ctx.fillStyle = "#6366f1";
      ctx.beginPath(); ctx.ellipse(0, 0, 14, 5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#a5b4fc";
      ctx.beginPath(); ctx.ellipse(0, -3, 6, 4, 0, Math.PI, 0); ctx.fill();
      ctx.fillStyle = "#c7d2fe";
      ctx.fillRect(-12, -2, 4, 2); ctx.fillRect(8, -2, 4, 2);
      ctx.strokeStyle = "#818cf8"; ctx.lineWidth = 1.5; ctx.globalAlpha = 0.6;
      ctx.beginPath(); ctx.arc(0, 0, 13, 0, Math.PI * 2); ctx.stroke();
      ctx.shadowBlur = 0; ctx.restore();
    }

    if (this.fabJet > 0) {
      const jx = this.x + 10 + Math.cos(state.frame * 0.04) * 8;
      const jy = this.y - 36 + Math.sin(state.frame * 0.07) * 6;
      const fade = Math.min(1, this.fabJet / 90);
      ctx.save();
      ctx.globalAlpha = fade;
      ctx.translate(jx, jy);
      // fuselagem
      const fg = ctx.createLinearGradient(-22, 0, 22, 0);
      fg.addColorStop(0, "#374151"); fg.addColorStop(0.5, "#9ca3af"); fg.addColorStop(1, "#374151");
      ctx.fillStyle = fg;
      ctx.shadowColor = "#60a5fa"; ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.moveTo(26, 0); ctx.bezierCurveTo(14, -4, -8, -3, -22, -2);
      ctx.lineTo(-22, 2); ctx.bezierCurveTo(-8, 3, 14, 4, 26, 0);
      ctx.closePath(); ctx.fill();
      // asas delta
      ctx.fillStyle = "#4b5563";
      ctx.beginPath(); ctx.moveTo(4, -2); ctx.lineTo(-16, -14); ctx.lineTo(-18, -2); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(4, 2); ctx.lineTo(-16, 14); ctx.lineTo(-18, 2); ctx.closePath(); ctx.fill();
      // cauda
      ctx.beginPath(); ctx.moveTo(-18, -2); ctx.lineTo(-24, -8); ctx.lineTo(-22, -2); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-18, 2); ctx.lineTo(-24, 8); ctx.lineTo(-22, 2); ctx.closePath(); ctx.fill();
      // cockpit
      ctx.fillStyle = "#bfdbfe"; ctx.globalAlpha = fade * 0.85;
      ctx.beginPath(); ctx.ellipse(14, -1, 5, 3, 0, 0, Math.PI * 2); ctx.fill();
      // roundel FAB
      ctx.globalAlpha = fade;
      ctx.fillStyle = "#1d4ed8"; ctx.beginPath(); ctx.arc(2, 0, 4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#f8fafc"; ctx.beginPath(); ctx.arc(2, 0, 2.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#15803d"; ctx.beginPath(); ctx.arc(2, 0, 1.2, 0, Math.PI * 2); ctx.fill();
      // rastro de motor
      ctx.shadowBlur = 0;
      const ex = -22, trail = 0.5 + Math.sin(state.frame * 0.18) * 0.3;
      ctx.globalAlpha = fade * trail;
      ctx.strokeStyle = "#fbbf24"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(ex, -1); ctx.lineTo(ex - 10, -1); ctx.stroke();
      ctx.strokeStyle = "#f97316";
      ctx.beginPath(); ctx.moveTo(ex, 1); ctx.lineTo(ex - 7, 1); ctx.stroke();
      ctx.restore();
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

  _drawSprite(name: string): boolean {
    const img = sprites[name];
    if (!img) return false;
    ctx.drawImage(img, -img.width / 2, -img.height / 2);
    return true;
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

  _drawSprite(name: string): boolean {
    const img = sprites[name];
    if (!img) return false;
    ctx.drawImage(img, -img.width / 2, -img.height / 2);
    return true;
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
        const aSpeed = 1 + Math.min(w, 8) * 0.04;
        this.vx = -(2.8 + Math.random() * 1.4) * aSpeed;
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
        this.hp = this.mhp = 35 + w * 5; this.r = 58;
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
          this.dashT = Math.max(90, 190 - this.laps * 8);
          this.vx = -(5.5 + this.laps * 0.4);
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
        this.shootT = Math.max(30, 85 - this.laps * 4 - state.waveNum * 2);
        sfxBossIn();
        if (player) {
          const baseAng = Math.atan2(player.y - this.y, player.x - this.x);
          const spread = 0.18 + this.laps * 0.025;
          const spd = 4.0 + this.laps * 0.2;
          for (let a = -1; a <= 1; a++)
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
        if (player) { player.inverted = 180; player.inv = Math.max(player.inv, 180); }
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

  _drawSprite(name: string, scale = 1): boolean {
    const img = sprites[name];
    if (!img) return false;
    const w = img.width * scale, h = img.height * scale;
    ctx.drawImage(img, this.x - w / 2, this.y - h / 2, w, h);
    return true;
  }

  draw(): void {
    if (this.type === "cloud" || this.type === "boss") {
      const isB = this.type === "boss";
      const hp = this.hp / this.mhp;
      if (isB) {
        ctx.shadowColor = "rgba(255,100,0,.5)"; ctx.shadowBlur = 28;
        this.blobs.forEach(b => {
          ctx.fillStyle = `rgba(${60 + hp * 90},${20},${8},.9)`;
          ctx.beginPath(); ctx.arc(this.x + b.ox, this.y + b.oy, b.r, 0, Math.PI * 2); ctx.fill();
        });
        ctx.shadowBlur = 0;
        this._drawHPBar("MONSTRO CLIMÁTICO");
      } else {
        const r0 = Math.floor(82 + hp * 55), g0 = Math.floor(95 + hp * 55), b0 = Math.floor(145 + hp * 55);
        const cloudSprite = sprites["cloud"];
        if (cloudSprite) {
          const scale = (this.r * 2.4) / cloudSprite.width;
          const sw = cloudSprite.width * scale, sh = cloudSprite.height * scale;
          ctx.globalAlpha = 0.88;
          ctx.drawImage(cloudSprite, this.x - sw / 2, this.y - sh / 2, sw, sh);
          ctx.globalAlpha = 1;
          this._drawHPBar("", this.y - sh / 2 - 14);
        } else {
          ctx.save(); ctx.translate(this.x, this.y);
          ctx.shadowColor = `rgba(80,120,220,0.3)`; ctx.shadowBlur = 12;
          ctx.fillStyle = `rgba(${r0},${g0},${b0},0.85)`;
          ctx.beginPath(); ctx.ellipse(0,4,36,26,0,0,Math.PI*2); ctx.fill();
          [[-20,-22,20],[2,-30,22],[22,-22,18],[34,-12,14],[-34,-12,14]].forEach(([bx,by,br]) => {
            ctx.beginPath(); ctx.arc(bx,by,br,0,Math.PI*2); ctx.fill();
          });
          ctx.shadowBlur = 0;
          ctx.fillStyle = `rgba(30,58,138,0.8)`;
          ctx.beginPath(); ctx.moveTo(-9,-4); ctx.lineTo(-17,6); ctx.lineTo(-1,6); ctx.closePath(); ctx.fill();
          ctx.beginPath(); ctx.moveTo(9,-4); ctx.lineTo(1,6); ctx.lineTo(17,6); ctx.closePath(); ctx.fill();
          ctx.strokeStyle = "rgba(30,58,138,0.7)"; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(-10,10); ctx.quadraticCurveTo(0,17,10,10); ctx.stroke();
          ctx.restore();
          this._drawHPBar("");
        }
      }
    } else if (this.type === "drone") {
      ctx.save(); ctx.translate(this.x, this.y);
      // baked: arms + body + shadow camera (static parts)
      const D_O = 30, D_S = 60;
      const droneBaked = getOrBake("drone_body", D_S, D_S, c => {
        c.translate(D_O, D_O);
        c.strokeStyle = "#374151"; c.lineWidth = 3; c.lineCap = "round";
        c.beginPath(); c.moveTo(-3,-3); c.lineTo(-15,-15); c.stroke();
        c.beginPath(); c.moveTo(3,-3); c.lineTo(15,-15); c.stroke();
        c.beginPath(); c.moveTo(-3,3); c.lineTo(-15,15); c.stroke();
        c.beginPath(); c.moveTo(3,3); c.lineTo(15,15); c.stroke();
        c.fillStyle = "#1f2937"; c.fillRect(-5,-5,10,10);
        c.fillStyle = "#111827"; c.beginPath(); c.arc(0,0,4,0,Math.PI*2); c.fill();
        c.fillStyle = "#ef4444"; c.shadowColor = "#ff0000"; c.shadowBlur = 7;
        c.beginPath(); c.arc(0,0,2.2,0,Math.PI*2); c.fill();
        c.shadowBlur = 0;
      });
      ctx.drawImage(droneBaked, -D_O, -D_O);
      // spinning rotors (animated — not baked)
      const dra = state.frame * 0.45;
      [[-15,-15],[15,-15],[-15,15],[15,15]].forEach(([rx,ry]) => {
        ctx.save(); ctx.translate(rx,ry); ctx.rotate(dra);
        ctx.strokeStyle = "rgba(180,210,255,0.75)"; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(-6,0); ctx.lineTo(6,0); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0,-6); ctx.lineTo(0,6); ctx.stroke();
        ctx.restore();
      });
      // blinking status light (cheap, dynamic)
      const dblink = Math.floor(state.frame/20)%2 === 0;
      ctx.fillStyle = dblink ? "#22c55e" : "#166534";
      ctx.shadowColor = "#22c55e"; ctx.shadowBlur = dblink ? 7 : 2;
      ctx.beginPath(); ctx.arc(5,-5,2,0,Math.PI*2); ctx.fill();
      ctx.shadowBlur = 0; ctx.restore();
    } else if (this.type === "arara") {
      ctx.save(); ctx.translate(this.x, this.y);
      const wf = Math.sin(this.wingP) * 10;
      // tail feathers
      ctx.fillStyle = "#1d4ed8";
      ctx.beginPath(); ctx.moveTo(-12,0); ctx.lineTo(-20,-3); ctx.lineTo(-18,0); ctx.lineTo(-20,3); ctx.closePath(); ctx.fill();
      ctx.fillStyle = "#facc15";
      ctx.beginPath(); ctx.moveTo(-16,-1); ctx.lineTo(-20,-0.5); ctx.lineTo(-20,0.5); ctx.lineTo(-16,1); ctx.closePath(); ctx.fill();
      // red body
      ctx.fillStyle = "#dc2626";
      ctx.beginPath(); ctx.ellipse(0,0,10,5,0,0,Math.PI*2); ctx.fill();
      // head
      ctx.fillStyle = "#ef4444";
      ctx.beginPath(); ctx.arc(10,-1,6,0,Math.PI*2); ctx.fill();
      // cheek patch
      ctx.fillStyle = "#fef2f2";
      ctx.beginPath(); ctx.ellipse(11,1,3,2,0.3,0,Math.PI*2); ctx.fill();
      // hooked beak
      ctx.fillStyle = "#fbbf24";
      ctx.beginPath(); ctx.moveTo(14,-2); ctx.lineTo(20,-1); ctx.lineTo(18,2); ctx.lineTo(14,1); ctx.closePath(); ctx.fill();
      ctx.fillStyle = "#f59e0b";
      ctx.beginPath(); ctx.moveTo(16,1); ctx.lineTo(18,2); ctx.lineTo(14,1); ctx.closePath(); ctx.fill();
      // eye
      ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(10,-2,2.5,0,Math.PI*2); ctx.fill();
      ctx.fillStyle = "#1c1917"; ctx.beginPath(); ctx.arc(10.5,-2,1.5,0,Math.PI*2); ctx.fill();
      // blue wings, animated
      ctx.fillStyle = "#2563eb";
      ctx.beginPath(); ctx.moveTo(4,-2); ctx.lineTo(-2,-6-wf); ctx.lineTo(-12,-4-wf*0.6); ctx.lineTo(-3,0); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(4,2); ctx.lineTo(-2,6+wf); ctx.lineTo(-12,4+wf*0.6); ctx.lineTo(-3,0); ctx.closePath(); ctx.fill();
      // yellow shoulders
      ctx.fillStyle = "#fbbf24";
      ctx.beginPath(); ctx.moveTo(5,-2); ctx.lineTo(1,-4-wf*0.2); ctx.lineTo(-2,-1); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(5,2); ctx.lineTo(1,4+wf*0.2); ctx.lineTo(-2,1); ctx.closePath(); ctx.fill();
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
      // saucer rim with gradient
      const rimG = ctx.createLinearGradient(-26,0,26,12);
      rimG.addColorStop(0, `rgba(70,180,120,${0.85*pulse})`);
      rimG.addColorStop(0.5, `rgba(160,255,170,${pulse})`);
      rimG.addColorStop(1, `rgba(50,140,90,${0.75*pulse})`);
      ctx.shadowColor = "#00ff88"; ctx.shadowBlur = 16 * pulse;
      ctx.fillStyle = rimG;
      ctx.beginPath(); ctx.ellipse(0,4,26,9,0,0,Math.PI*2); ctx.fill();
      // dome with radial gradient
      const domeG = ctx.createRadialGradient(-4,-6,1,0,-2,14);
      domeG.addColorStop(0, `rgba(200,255,215,${0.95*pulse})`);
      domeG.addColorStop(0.6, `rgba(100,220,140,${0.85*pulse})`);
      domeG.addColorStop(1, `rgba(30,150,80,${0.65*pulse})`);
      ctx.fillStyle = domeG;
      ctx.beginPath(); ctx.ellipse(0,-2,13,11,0,Math.PI,0); ctx.fill();
      // dome highlight
      ctx.fillStyle = `rgba(255,255,255,${0.45*pulse})`;
      ctx.beginPath(); ctx.ellipse(-4,-5,5,3,-0.3,0,Math.PI*2); ctx.fill();
      // animated rim lights
      ctx.shadowBlur = 8;
      [-17,-9,0,9,17].forEach((lx, i) => {
        ctx.fillStyle = `hsl(${110+i*28+state.frame*2},100%,65%)`;
        ctx.beginPath(); ctx.arc(lx,5,2.5,0,Math.PI*2); ctx.fill();
      });
      // underside port
      ctx.fillStyle = `rgba(0,80,40,${0.7*pulse})`;
      ctx.beginPath(); ctx.ellipse(0,9,7,3,0,0,Math.PI*2); ctx.fill();
      ctx.shadowBlur = 0; ctx.restore();
    } else if (this.type === "tanajura") {
      // fully static — bake once, drawImage every frame
      const T_OX = 18, T_OY = 16, T_W = 42, T_H = 28;
      const tanBaked = getOrBake("tanajura", T_W, T_H, c => {
        c.translate(T_OX, T_OY);
        c.globalAlpha = 0.55; c.fillStyle = "#ddd6fe";
        c.beginPath(); c.ellipse(-2,-7,9,4,-0.35,0,Math.PI*2); c.fill();
        c.beginPath(); c.ellipse(-2,7,9,4,0.35,0,Math.PI*2); c.fill();
        c.fillStyle = "#c4b5fd";
        c.beginPath(); c.ellipse(-7,-5,5,3,-0.3,0,Math.PI*2); c.fill();
        c.beginPath(); c.ellipse(-7,5,5,3,0.3,0,Math.PI*2); c.fill();
        c.globalAlpha = 1;
        c.fillStyle = "#92400e"; c.beginPath(); c.ellipse(-6,0,7,4,0,0,Math.PI*2); c.fill();
        c.fillStyle = "#b45309"; c.beginPath(); c.ellipse(1,0,5,4,0,0,Math.PI*2); c.fill();
        c.fillStyle = "#78350f"; c.beginPath(); c.arc(8,0,5,0,Math.PI*2); c.fill();
        c.fillStyle = "#1c1917";
        c.beginPath(); c.ellipse(9,-4,3,2,0.3,0,Math.PI*2); c.fill();
        c.beginPath(); c.ellipse(9,4,3,2,-0.3,0,Math.PI*2); c.fill();
        c.fillStyle = "rgba(255,255,255,0.5)";
        c.beginPath(); c.arc(9,-4,1,0,Math.PI*2); c.fill();
        c.beginPath(); c.arc(9,4,1,0,Math.PI*2); c.fill();
        c.strokeStyle = "#451a03"; c.lineWidth = 1;
        c.beginPath(); c.moveTo(11,-2); c.quadraticCurveTo(15,-10,18,-14); c.stroke();
        c.beginPath(); c.moveTo(11,-1); c.quadraticCurveTo(16,-5,20,-7); c.stroke();
        c.strokeStyle = "#92400e"; c.lineWidth = 1.5;
        c.beginPath(); c.moveTo(12,-1); c.lineTo(15,-3); c.stroke();
        c.beginPath(); c.moveTo(12,1); c.lineTo(15,3); c.stroke();
        c.strokeStyle = "#451a03"; c.lineWidth = 1;
        [-4,0,4].forEach(lx => {
          c.beginPath(); c.moveTo(lx,-4); c.lineTo(lx-3,-9); c.stroke();
          c.beginPath(); c.moveTo(lx,4); c.lineTo(lx-3,9); c.stroke();
        });
      });
      ctx.drawImage(tanBaked, this.x - T_OX, this.y - T_OY);
    } else if (this.type === "helicoptero") {
      ctx.save(); ctx.translate(this.x, this.y);
      const hp = this.hp / this.mhp;
      const hbodyCol = `rgb(${30+(1-hp)*55},${58+(1-hp)*20},22)`;
      // tail boom
      ctx.fillStyle = "#2d4a18";
      ctx.beginPath(); ctx.moveTo(-10,-4); ctx.lineTo(-44,-2); ctx.lineTo(-44,2); ctx.lineTo(-10,4); ctx.closePath(); ctx.fill();
      // tail fin
      ctx.beginPath(); ctx.moveTo(-36,-1); ctx.lineTo(-30,-13); ctx.lineTo(-26,-1); ctx.closePath(); ctx.fill();
      // tail rotor
      ctx.save(); ctx.translate(-44,0); ctx.rotate(this.rotorA*3);
      ctx.strokeStyle = "#4a6528"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(0,-10); ctx.lineTo(0,10); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-7,-7); ctx.lineTo(7,7); ctx.stroke();
      ctx.restore();
      // fuselage
      ctx.fillStyle = hbodyCol;
      ctx.beginPath();
      ctx.moveTo(24,0); ctx.quadraticCurveTo(28,-5,22,-12);
      ctx.lineTo(-10,-12); ctx.quadraticCurveTo(-16,-6,-16,0);
      ctx.quadraticCurveTo(-16,6,-10,12); ctx.lineTo(22,12);
      ctx.quadraticCurveTo(28,5,24,0); ctx.closePath(); ctx.fill();
      // nose cone
      ctx.fillStyle = "#2d4a18";
      ctx.beginPath(); ctx.moveTo(22,-4); ctx.lineTo(30,0); ctx.lineTo(22,4); ctx.closePath(); ctx.fill();
      // cockpit window
      ctx.fillStyle = "rgba(100,200,255,0.55)";
      ctx.beginPath(); ctx.ellipse(14,-2,9,7,0.15,0,Math.PI*2); ctx.fill();
      ctx.fillStyle = "rgba(200,240,255,0.35)";
      ctx.beginPath(); ctx.ellipse(11,-4,4,2.5,-0.2,0,Math.PI*2); ctx.fill();
      // weapon pylons
      ctx.fillStyle = "#374151"; ctx.fillRect(-2,-18,3,7); ctx.fillRect(-2,11,3,7);
      ctx.fillStyle = "#1f2937"; ctx.fillRect(-5,-19,10,3); ctx.fillRect(-5,16,10,3);
      // landing skids
      ctx.strokeStyle = "#4a6528"; ctx.lineWidth = 2; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(14,12); ctx.lineTo(14,20); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-4,12); ctx.lineTo(-4,20); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-12,20); ctx.lineTo(22,20); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-10,18); ctx.lineTo(24,18); ctx.stroke();
      // main rotor
      ctx.save(); ctx.translate(4,-8); ctx.rotate(this.rotorA);
      ctx.strokeStyle = "#3a5c20"; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(-28,0); ctx.lineTo(28,0); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0,-28); ctx.lineTo(0,28); ctx.stroke();
      ctx.restore();
      ctx.fillStyle = "#6b7280"; ctx.beginPath(); ctx.arc(4,-8,4,0,Math.PI*2); ctx.fill();
      ctx.shadowBlur = 0; ctx.restore();
    } else if (this.type === "balao") {
      ctx.save(); ctx.translate(this.x, this.y);
      const hp = this.hp / this.mhp;
      // teardrop body with radial gradient
      const balG = ctx.createRadialGradient(-6,-8,2,0,0,25);
      balG.addColorStop(0, "rgba(255,255,255,0.95)");
      balG.addColorStop(0.3, `rgba(${200+(1-hp)*55},215,240,0.9)`);
      balG.addColorStop(0.8, `rgba(${170+(1-hp)*40},190,220,0.85)`);
      balG.addColorStop(1, "rgba(130,160,200,0.7)");
      ctx.shadowColor = "rgba(190,210,255,0.45)"; ctx.shadowBlur = 14;
      ctx.fillStyle = balG;
      ctx.beginPath();
      ctx.moveTo(0,-24);
      ctx.bezierCurveTo(22,-24,24,0,24,4);
      ctx.bezierCurveTo(24,14,12,24,0,28);
      ctx.bezierCurveTo(-12,24,-24,14,-24,4);
      ctx.bezierCurveTo(-24,0,-22,-24,0,-24);
      ctx.closePath(); ctx.fill();
      // seam lines
      ctx.shadowBlur = 0; ctx.strokeStyle = "rgba(140,165,200,0.5)"; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(0,-24); ctx.lineTo(0,28); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(0,2,24,8,0,0,Math.PI*2); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(0,-10,16,6,0,0,Math.PI*2); ctx.stroke();
      // specular highlight
      ctx.fillStyle = "rgba(255,255,255,0.6)";
      ctx.beginPath(); ctx.ellipse(-7,-12,6,4,-0.4,0,Math.PI*2); ctx.fill();
      // tie-off and rigging
      ctx.fillStyle = "#64748b"; ctx.beginPath(); ctx.arc(0,28,3,0,Math.PI*2); ctx.fill();
      ctx.strokeStyle = "#94a3b8"; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(-6,28); ctx.lineTo(-8,38); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(6,28); ctx.lineTo(8,38); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0,28); ctx.lineTo(0,40); ctx.stroke();
      // gondola
      ctx.fillStyle = "#78563a"; ctx.fillRect(-9,36,18,8);
      ctx.strokeStyle = "#5c4027"; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(-4,36); ctx.lineTo(-4,44); ctx.moveTo(4,36); ctx.lineTo(4,44); ctx.stroke();
      ctx.restore();
    }

    const isBossType = BOSS_TYPES.includes(this.type as typeof BOSS_TYPES[number]);

    if (this.type === "prototipo_x") {
      ctx.save(); ctx.translate(this.x, this.y);
      const hpR = this.hp / this.mhp;
      const phue = Math.round(hpR*30+200);
      // exhaust glow
      const exG = ctx.createLinearGradient(-26,0,-52,0);
      exG.addColorStop(0, `hsla(${phue},100%,55%,0.6)`);
      exG.addColorStop(1, `hsla(${phue},100%,55%,0)`);
      ctx.fillStyle = exG;
      ctx.beginPath(); ctx.ellipse(-34,0,18,8,0,0,Math.PI*2); ctx.fill();
      // delta wings
      ctx.shadowColor = `hsl(${phue},90%,55%)`; ctx.shadowBlur = 18;
      ctx.fillStyle = `hsl(${phue},58%,28%)`;
      ctx.beginPath(); ctx.moveTo(10,0); ctx.lineTo(-20,-32); ctx.lineTo(-28,-22); ctx.lineTo(-10,0); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(10,0); ctx.lineTo(-20,32); ctx.lineTo(-28,22); ctx.lineTo(-10,0); ctx.closePath(); ctx.fill();
      // wing leading edge lines
      ctx.strokeStyle = `hsl(${phue},80%,48%)`; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(8,-2); ctx.lineTo(-18,-30); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(8,2); ctx.lineTo(-18,30); ctx.stroke();
      // fuselage
      ctx.fillStyle = `hsl(${phue},63%,26%)`;
      ctx.beginPath();
      ctx.moveTo(30,0); ctx.lineTo(16,-8); ctx.lineTo(-26,-8); ctx.lineTo(-26,8); ctx.lineTo(16,8); ctx.closePath(); ctx.fill();
      // canopy
      ctx.fillStyle = `hsl(${phue},68%,38%)`;
      ctx.beginPath(); ctx.ellipse(12,-4,12,5,0,Math.PI,0); ctx.fill();
      ctx.fillStyle = "rgba(160,220,255,0.45)";
      ctx.beginPath(); ctx.ellipse(12,-4,10,4,0,Math.PI,0); ctx.fill();
      // sensor dome
      ctx.fillStyle = "#111827"; ctx.beginPath(); ctx.arc(28,0,5,0,Math.PI*2); ctx.fill();
      ctx.fillStyle = "#374151"; ctx.beginPath(); ctx.arc(27,-1,2,0,Math.PI*2); ctx.fill();
      // engine intakes
      ctx.fillStyle = "#0f172a";
      ctx.beginPath(); ctx.ellipse(-26,-4,4,3,0,0,Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(-26,4,4,3,0,0,Math.PI*2); ctx.fill();
      // weapon hardpoints
      ctx.fillStyle = "#ff3333"; ctx.shadowColor = "#ff0000"; ctx.shadowBlur = 10;
      ctx.beginPath(); ctx.arc(10,-16,4,0,Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(10,16,4,0,Math.PI*2); ctx.fill();
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
          ctx.strokeStyle = "rgba(150,180,255,0.4)"; ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.arc(Math.cos(a)*55, Math.sin(a)*55, 12, 0, Math.PI*2); ctx.stroke();
        }
      }
      // sclera
      ctx.shadowColor = this.vulnerable ? "#ff4444" : "#6688cc"; ctx.shadowBlur = 22;
      ctx.fillStyle = this.vulnerable ? `rgba(${Math.round(200+hpR*55)},60,60,.9)` : "rgba(240,240,250,.88)";
      ctx.beginPath(); ctx.ellipse(0,0,44,44,0,0,Math.PI*2); ctx.fill();
      // veins when vulnerable
      if (this.vulnerable) {
        ctx.strokeStyle = `rgba(255,${Math.round(hpR*80)},${Math.round(hpR*80)},0.5)`;
        ctx.lineWidth = 1.5;
        [[0,-30],[20,-20],[30,5],[-25,15],[-10,-28]].forEach(([vx,vy]) => {
          ctx.beginPath(); ctx.moveTo(0,0); ctx.quadraticCurveTo(vx*0.5,vy*0.5,vx,vy); ctx.stroke();
        });
      }
      // iris
      ctx.fillStyle = this.vulnerable ? `rgba(${Math.round(180+hpR*75)},30,30,.95)` : "rgba(40,80,180,.9)";
      ctx.beginPath(); ctx.arc(0,0,30,0,Math.PI*2); ctx.fill();
      // iris rings
      for (let i = 1; i <= 3; i++) {
        ctx.strokeStyle = this.vulnerable ? `rgba(255,100,100,${0.18+i*0.1})` : `rgba(100,150,255,${0.15+i*0.08})`;
        ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0,0,i*9,0,Math.PI*2); ctx.stroke();
      }
      // pupil
      ctx.fillStyle = "#000"; ctx.beginPath(); ctx.arc(0,0,14,0,Math.PI*2); ctx.fill();
      // highlights
      ctx.fillStyle = "rgba(255,255,255,0.4)";
      ctx.beginPath(); ctx.ellipse(-5,-5,5,3,-0.5,0,Math.PI*2); ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.12)";
      ctx.beginPath(); ctx.ellipse(-10,-10,14,9,-0.4,0,Math.PI*2); ctx.fill();
      ctx.shadowBlur = 0; ctx.restore();
      this._drawHPBar("OLHO DO CEMADEN");
    } else if (this.type === "engrenagem") {
      ctx.save(); ctx.translate(this.x, this.y); ctx.rotate(this.gearAngle);
      const hpR = this.hp / this.mhp;
      const outerR = this.r * 0.65;
      const toothH = this.r * 0.17;
      const toothCount = 12;
      ctx.shadowColor = "#c87020"; ctx.shadowBlur = 20;
      // gear body with mathematically correct teeth
      ctx.fillStyle = `rgba(${Math.round(80+hpR*60)},60,40,.95)`;
      ctx.beginPath();
      for (let i = 0; i < toothCount; i++) {
        const aStart = i * (Math.PI*2/toothCount);
        const half = (Math.PI/toothCount)*0.55;
        ctx.lineTo(Math.cos(aStart-half)*outerR, Math.sin(aStart-half)*outerR);
        ctx.lineTo(Math.cos(aStart-half)*(outerR+toothH), Math.sin(aStart-half)*(outerR+toothH));
        ctx.lineTo(Math.cos(aStart+half)*(outerR+toothH), Math.sin(aStart+half)*(outerR+toothH));
        ctx.lineTo(Math.cos(aStart+half)*outerR, Math.sin(aStart+half)*outerR);
        const aEnd = (i+1) * (Math.PI*2/toothCount);
        ctx.lineTo(Math.cos(aEnd-half)*outerR, Math.sin(aEnd-half)*outerR);
      }
      ctx.closePath(); ctx.fill();
      // inner face
      ctx.fillStyle = `rgba(${Math.round(100+hpR*80)},70,30,.9)`;
      ctx.beginPath(); ctx.arc(0,0,this.r*0.5,0,Math.PI*2); ctx.fill();
      // structural holes
      for (let i = 0; i < 6; i++) {
        const a = i * (Math.PI/3);
        ctx.fillStyle = "#1a0a00";
        ctx.beginPath(); ctx.arc(Math.cos(a)*this.r*0.35, Math.sin(a)*this.r*0.35, this.r*0.12, 0, Math.PI*2); ctx.fill();
      }
      // spokes
      ctx.strokeStyle = `rgba(${Math.round(70+hpR*50)},50,25,.6)`; ctx.lineWidth = 3;
      for (let i = 0; i < 6; i++) {
        const a = i*(Math.PI/3)+Math.PI/6;
        ctx.beginPath(); ctx.moveTo(Math.cos(a)*this.r*0.18, Math.sin(a)*this.r*0.18);
        ctx.lineTo(Math.cos(a)*this.r*0.5, Math.sin(a)*this.r*0.5); ctx.stroke();
      }
      // center hub
      ctx.fillStyle = `rgba(${Math.round(60+hpR*40)},40,20,.95)`;
      ctx.beginPath(); ctx.arc(0,0,this.r*0.18,0,Math.PI*2); ctx.fill();
      ctx.fillStyle = "#1a0a00"; ctx.beginPath(); ctx.arc(0,0,this.r*0.09,0,Math.PI*2); ctx.fill();
      ctx.shadowBlur = 0; ctx.restore();
      this._drawHPBar("GRANDE ENGRENAGEM");
    } else if (this.type === "cigarra") {
      ctx.save(); ctx.translate(this.x, this.y);
      ctx.shadowColor = `hsl(${this.beamHue},100%,60%)`; ctx.shadowBlur = 28;
      ctx.strokeStyle = `hsl(${this.beamHue},100%,65%)`; ctx.lineWidth = 3;
      ctx.fillStyle = `hsla(${this.beamHue},80%,18%,.9)`;
      if (this.morphShape === 0) {
        // crystal orb with facets
        ctx.beginPath(); ctx.arc(0,0,this.r*0.7,0,Math.PI*2); ctx.fill(); ctx.stroke();
        ctx.strokeStyle = `hsla(${this.beamHue},100%,70%,.4)`; ctx.lineWidth = 1.5;
        for (let i = 0; i < 6; i++) {
          const a = i*Math.PI/3;
          ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(Math.cos(a)*this.r*0.7, Math.sin(a)*this.r*0.7); ctx.stroke();
        }
        ctx.beginPath(); ctx.arc(0,0,this.r*0.4,0,Math.PI*2); ctx.stroke();
        const coreG = ctx.createRadialGradient(0,0,0,0,0,this.r*0.28);
        coreG.addColorStop(0, `hsla(${this.beamHue},100%,82%,.85)`);
        coreG.addColorStop(1, `hsla(${this.beamHue},100%,60%,0)`);
        ctx.fillStyle = coreG; ctx.beginPath(); ctx.arc(0,0,this.r*0.28,0,Math.PI*2); ctx.fill();
      } else if (this.morphShape === 1) {
        // energy prism
        ctx.beginPath();
        for (let i = 0; i < 3; i++) {
          const a = i * Math.PI*2/3 - Math.PI/2;
          if (i === 0) ctx.moveTo(Math.cos(a)*this.r*0.8, Math.sin(a)*this.r*0.8);
          else ctx.lineTo(Math.cos(a)*this.r*0.8, Math.sin(a)*this.r*0.8);
        }
        ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.strokeStyle = `hsla(${this.beamHue},100%,70%,.5)`; ctx.lineWidth = 1.5;
        ctx.beginPath();
        for (let i = 0; i < 3; i++) {
          const a = i * Math.PI*2/3 - Math.PI/2;
          if (i === 0) ctx.moveTo(Math.cos(a)*this.r*0.45, Math.sin(a)*this.r*0.45);
          else ctx.lineTo(Math.cos(a)*this.r*0.45, Math.sin(a)*this.r*0.45);
        }
        ctx.closePath(); ctx.stroke();
        for (let i = 0; i < 3; i++) {
          const a = i * Math.PI*2/3 - Math.PI/2;
          ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(Math.cos(a)*this.r*0.8, Math.sin(a)*this.r*0.8); ctx.stroke();
        }
      } else {
        // energy blade
        ctx.beginPath(); ctx.ellipse(0,0,this.r*0.9,this.r*0.3,0,0,Math.PI*2); ctx.fill(); ctx.stroke();
        ctx.strokeStyle = `hsla(${this.beamHue},100%,70%,.5)`; ctx.lineWidth = 1.5;
        for (let i = -2; i <= 2; i++) {
          const sx = i*(this.r*0.9/2.5);
          ctx.beginPath(); ctx.moveTo(sx,-this.r*0.28); ctx.lineTo(sx,this.r*0.28); ctx.stroke();
        }
        ctx.beginPath(); ctx.moveTo(-this.r*0.88,0); ctx.lineTo(this.r*0.88,0); ctx.stroke();
        // tip glow
        [this.r*0.9, -this.r*0.9].forEach(tx => {
          const tG = ctx.createRadialGradient(tx,0,0,tx,0,this.r*0.22);
          tG.addColorStop(0, `hsla(${this.beamHue},100%,82%,.9)`);
          tG.addColorStop(1, `hsla(${this.beamHue},100%,60%,0)`);
          ctx.fillStyle = tG; ctx.beginPath(); ctx.arc(tx,0,this.r*0.22,0,Math.PI*2); ctx.fill();
        });
      }
      ctx.shadowBlur = 0; ctx.restore();
      this._drawHPBar("A CIGARRA");
    }

    if (!isBossType && this.type !== "cloud") {
      const bw = Math.round(this.r * 2.2), bx = this.x - bw / 2, by = this.y - this.r * 2 - 4;
      ctx.fillStyle = "rgba(0,0,0,.55)"; ctx.fillRect(bx, by, bw, 5);
      ctx.fillStyle = "#ef4444"; ctx.fillRect(bx, by, bw * (this.hp / this.mhp), 5);
    }
  }

  private _drawHPBar(label: string, overrideTopY?: number): void {
    const hp = this.hp / this.mhp;
    const bw = Math.round(this.r * 2.2), bx = this.x - bw / 2;
    const by = overrideTopY !== undefined ? overrideTopY : this.y - this.r - 14;
    ctx.fillStyle = "rgba(0,0,0,.55)"; ctx.fillRect(bx, by, bw, 5);
    ctx.fillStyle = "#ef4444"; ctx.fillRect(bx, by, bw * hp, 5);
    if (label) {
      ctx.fillStyle = "#fff"; ctx.font = "bold 9px Courier New";
      ctx.textAlign = "center"; ctx.fillText(label, this.x, by - 3); ctx.textAlign = "left";
    }
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

  _drawSprite(name: string): boolean {
    const img = sprites[name];
    if (!img) return false;
    ctx.drawImage(img, -img.width / 2, -img.height / 2);
    return true;
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

  _drawSprite(name: string): boolean {
    const img = sprites[name];
    if (!img) return false;
    ctx.drawImage(img, -img.width / 2, -img.height / 2);
    return true;
  }

  draw(): void {
    ctx.save(); ctx.translate(this.x, this.y);
    const pulse = 0.55 + Math.sin(this.age * 0.1) * 0.35;
    // bake circle + glow + icon per type (shadowBlur=16 is expensive to recompute each frame)
    const C_S = 64, C_O = 32;
    const collBaked = getOrBake(`coll_${this.type.id}`, C_S, C_S, c => {
      c.translate(C_O, C_O);
      c.shadowColor = this.type.glow; c.shadowBlur = 16;
      c.globalAlpha = 0.88; c.fillStyle = this.type.col;
      c.beginPath(); c.arc(0,0,this.r,0,Math.PI*2); c.fill();
      c.globalAlpha = 1; c.strokeStyle = "#fff"; c.lineWidth = 1.5; c.stroke();
      c.shadowBlur = 0;
      if (this.type.pw) {
        c.font = "13px sans-serif"; c.textAlign = "center"; c.textBaseline = "middle";
        c.fillText(this.type.icon, 0, 1);
      } else {
        c.fillStyle = "#fff"; c.font = "bold 6px Courier New";
        c.textAlign = "center"; c.textBaseline = "middle";
        c.fillText(this.type.lbl, 0, 0);
      }
    });
    // modulate overall brightness with pulse via globalAlpha
    ctx.globalAlpha = 0.55 + pulse * 0.45;
    ctx.drawImage(collBaked, -C_O, -C_O);
    ctx.globalAlpha = 1;
    // dynamic outer ring (cheap path, not worth baking)
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
    const boost = ct.id === "14bis" ? 1 + Math.max(0, state.combo - 5) * 0.18 : 1;
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
