"use strict";

const canvas = document.getElementById("c");
const ctx = canvas.getContext("2d");
const W = 800;
const H = 450;

// Escala o canvas pelo DPR para renderização nítida em displays HiDPI/Retina.
// Cap em 2 para não dobrar o custo de fill em displays 3×/4×.
const DPR = Math.min(window.devicePixelRatio || 1, 2);
canvas.width  = W * DPR;
canvas.height = H * DPR;
ctx.scale(DPR, DPR);

function rng(seed) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}
const r1 = rng(42);
const r2 = rng(137);
const r3 = rng(99);
const rSky = rng(777);

let dayPhase = 0.02;

function hexRgb(h) {
  return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
}
function lerpC(a, b, t) {
  return `rgb(${a[0] + (b[0] - a[0]) * t | 0},${a[1] + (b[1] - a[1]) * t | 0},${a[2] + (b[2] - a[2]) * t | 0})`;
}

const SKY_KF = [
  { t: 0.00, c: ["#010112", "#05053a", "#1a1060", "#c84860"], sun: 0,    moon: 1.0, st: 1.0 },
  { t: 0.18, c: ["#010110", "#040435", "#160e50", "#a02c55"], sun: 0,    moon: 0.7, st: 0.9 },
  { t: 0.24, c: ["#080418", "#1c0840", "#401430", "#f04010"], sun: 0,    moon: 0.2, st: 0.4 },
  { t: 0.29, c: ["#120a3a", "#2c1258", "#601808", "#ff7822"], sun: 0.45, moon: 0,   st: 0.1 },
  { t: 0.36, c: ["#0838c0", "#1458d8", "#2880e0", "#90c8ff"], sun: 0.92, moon: 0,   st: 0   },
  { t: 0.50, c: ["#0050cc", "#1068e0", "#2890f0", "#98d0ff"], sun: 1.0,  moon: 0,   st: 0   },
  { t: 0.64, c: ["#0040b0", "#1850c0", "#4878d8", "#a8b8f0"], sun: 0.9,  moon: 0,   st: 0   },
  { t: 0.72, c: ["#100828", "#2a0e50", "#601410", "#ff5010"], sun: 0.55, moon: 0,   st: 0   },
  { t: 0.79, c: ["#080320", "#180838", "#300a1a", "#c03850"], sun: 0,    moon: 0,   st: 0.15 },
  { t: 0.88, c: ["#010114", "#040430", "#141055", "#a03060"], sun: 0,    moon: 0.5, st: 0.7  },
  { t: 1.00, c: ["#010112", "#05053a", "#1a1060", "#c84860"], sun: 0,    moon: 1.0, st: 1.0  },
];
const _KFP = SKY_KF.map(k => ({ ...k, cr: k.c.map(hexRgb) }));

function getSky() {
  let i = 0;
  while (i < _KFP.length - 2 && _KFP[i + 1].t <= dayPhase) i++;
  const a = _KFP[i];
  const b = _KFP[i + 1];
  const t = Math.max(0, Math.min(1, (dayPhase - a.t) / (b.t - a.t)));
  return {
    zenith:  lerpC(a.cr[0], b.cr[0], t),
    midhi:   lerpC(a.cr[1], b.cr[1], t),
    midlo:   lerpC(a.cr[2], b.cr[2], t),
    horizon: lerpC(a.cr[3], b.cr[3], t),
    sun:  a.sun  + (b.sun  - a.sun)  * t,
    moon: a.moon + (b.moon - a.moon) * t,
    st:   a.st   + (b.st   - a.st)   * t,
  };
}

const STARS = Array.from({ length: 130 }, () => ({
  x: Math.random() * W,
  y: Math.random() * H * 0.7,
  r: Math.random() * 1.6 + 0.3,
  tw: Math.random() * Math.PI * 2,
  spd: 0.08 + Math.random() * 0.2,
}));

function makeMountains(r, baseY, amp, rough) {
  const pts = [];
  const n = 160;
  let h = baseY;
  for (let i = 0; i < n; i++) {
    h += (r() - 0.5) * rough;
    h = Math.max(baseY - amp, Math.min(baseY, h));
    pts.push(h);
  }
  return pts;
}
const MT1 = makeMountains(r1, H * 0.52, H * 0.22, 14);
const MT2 = makeMountains(r2, H * 0.64, H * 0.2,  18);
const MT3 = makeMountains(r3, H * 0.75, H * 0.18, 12);

const BLDGS = (() => {
  const arr = [];
  let x = 0;
  while (x < W * 3) {
    const roll = rSky();
    let w, h, type;
    if (roll < 0.04) {
      type = "inpe";       w = 22 + rSky() * 50; h = 28 + rSky() * 100;
    } else if (roll < 0.08) {
      type = "tech";       w = 20 + rSky() * 50; h = 28 + rSky() * 100;
    } else if (roll < 0.13) {
      type = "praca";      w = 58 + rSky() * 42; h = 14 + rSky() * 20;
    } else if (roll < 0.17) {
      type = "vincentino"; w = 72 + rSky() * 22; h = 58 + rSky() * 22;
    } else {
      type = "regular";    w = 18 + rSky() * 55; h = 18 + rSky() * 110;
    }
    arr.push({ x, w, h, type, litSeed: Math.floor(rSky() * 9999) });
    x += w + 2 + rSky() * 10;
  }
  return arr;
})();

const PARQUE_TREES = [-100, -74, -50, -26, -2, 22, 46, 70, 98].map((ox, i) => ({
  ox, h: 24 + (i % 3) * 5 + (Math.abs(ox) % 17),
}));

const CARS = Array.from({ length: 28 }, (_, i) => ({
  lane: i % 2,
  offset: (i * 193.7) % (W * 5),
  spd: 1.5 + (i % 6) * 0.48,
}));
