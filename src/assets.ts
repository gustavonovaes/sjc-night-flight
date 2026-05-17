export const sprites: Record<string, HTMLImageElement | OffscreenCanvas> = {
};

export async function preloadImages(manifest: Record<string, string>): Promise<void> {
  const promises = Object.entries(manifest).map(([id, url]) => {
    return new Promise<void>((resolve, reject) => {
      const img = new Image();
      img.src = url;
      img.onload = () => {
        sprites[id] = img;
        resolve();
      };
      img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
    });
  });
  await Promise.all(promises);
}

export function getOrBake(id: string, width: number, height: number, drawFn: (c: OffscreenCanvasRenderingContext2D) => void): OffscreenCanvas {
  if (sprites[id]) return sprites[id] as OffscreenCanvas;

  console.log(`[Baking] Rendering new canvas for: ${id}`);

  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext("2d");
  if (ctx) drawFn(ctx);

  sprites[id] = canvas;
  return canvas;
}

