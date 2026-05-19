import { version } from "../package.json";

import type { SkyKeyframeProcessed, SkyValues } from "./types";
import { SKY_KF } from "./constants";

export const VERSION =
  `v${version}-` + Date.now().toString(36).slice(-4);

export const canvas = document.getElementById("c") as HTMLCanvasElement;
export const ctx = canvas.getContext("2d")!;
export const W = 800;
export const H = 450;

// Scale canvas by DPR for crisp rendering on HiDPI/Retina displays. Cap at 2×.
export const DPR = Math.min(window.devicePixelRatio || 1, 2);
canvas.width = W * DPR;
canvas.height = H * DPR;
ctx.scale(DPR, DPR);

export function hexRgb(h: string): [number, number, number] {
  return [
    parseInt(h.slice(1, 3), 16),
    parseInt(h.slice(3, 5), 16),
    parseInt(h.slice(5, 7), 16),
  ];
}

export function lerpC(
  a: [number, number, number],
  b: [number, number, number],
  t: number,
): string {
  return `rgb(${(a[0] + (b[0] - a[0]) * t) | 0},${(a[1] + (b[1] - a[1]) * t) | 0},${(a[2] + (b[2] - a[2]) * t) | 0})`;
}

const KFP: SkyKeyframeProcessed[] = SKY_KF.map((k) => ({
  ...k,
  cr: k.c.map(hexRgb) as [number, number, number][],
}));

export function getSky(dayPhase: number): SkyValues {
  let i = 0;
  while (i < KFP.length - 2 && KFP[i + 1].t <= dayPhase) i++;
  const a = KFP[i];
  const b = KFP[i + 1];
  const t = Math.max(0, Math.min(1, (dayPhase - a.t) / (b.t - a.t)));
  return {
    zenith: lerpC(a.cr[0], b.cr[0], t),
    midhi: lerpC(a.cr[1], b.cr[1], t),
    midlo: lerpC(a.cr[2], b.cr[2], t),
    horizon: lerpC(a.cr[3], b.cr[3], t),
    sun: a.sun + (b.sun - a.sun) * t,
    moon: a.moon + (b.moon - a.moon) * t,
    st: a.st + (b.st - a.st) * t,
  };
}
