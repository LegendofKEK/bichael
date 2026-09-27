import * as THREE from "three";

export function isMagentaKey(r: number, g: number, b: number): boolean {
  // Hot pink (R≈246 G≈6 B≈141), classic #FF00FF, and near-fuchsia
  if (r > 200 && g < 50 && b > 80 && r - g > 140) return true;
  if (r > 160 && b > 160 && g < 140 && r - g > 35 && b - g > 35) return true;
  if (r > 200 && b > 170 && g < 170 && r - g > 30) return true;
  // dark crimson / hot-pink gens
  if (r > 140 && g < 60 && b > 60 && r - g > 80 && b - g > 40) return true;
  // soft magenta fringe
  if (r > 180 && g < 80 && b > 100 && r - g > 90) return true;
  // anti-aliased pink edge
  if (r > 190 && g < 110 && b > 140 && r - g > 70 && b - g > 40) return true;
  return false;
}

const keyedUrlCache = new Map<string, string>();
const keyedUrlPending = new Map<string, Promise<string>>();

/**
 * Return a blob URL with magenta/hot-pink knocked to alpha (cached per src).
 * Source PNGs stay on disk unchanged — only the displayed pixels are keyed.
 */
export function chromaKeyIconUrl(src: string): Promise<string> {
  const hit = keyedUrlCache.get(src);
  if (hit) return Promise.resolve(hit);
  const pending = keyedUrlPending.get(src);
  if (pending) return pending;

  const work = new Promise<string>((resolve) => {
    const img = new Image();
    img.decoding = "async";
    img.onload = () => {
      try {
        const w = img.naturalWidth || img.width;
        const h = img.naturalHeight || img.height;
        if (!w || !h) {
          keyedUrlCache.set(src, src);
          resolve(src);
          return;
        }
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) {
          keyedUrlCache.set(src, src);
          resolve(src);
          return;
        }
        ctx.drawImage(img, 0, 0);
        const corner = ctx.getImageData(0, 0, 1, 1).data;
        // Pre-baked icons: skip full pixel walk
        if (corner[3]! < 8) {
          keyedUrlCache.set(src, src);
          resolve(src);
          return;
        }
        const imageData = ctx.getImageData(0, 0, w, h);
        const d = imageData.data;
        let keyed = 0;
        for (let i = 0; i < d.length; i += 4) {
          if (d[i + 3]! === 0) continue;
          if (isMagentaKey(d[i]!, d[i + 1]!, d[i + 2]!)) {
            d[i + 3] = 0;
            keyed++;
          }
        }
        if (keyed === 0) {
          keyedUrlCache.set(src, src);
          resolve(src);
          return;
        }
        ctx.putImageData(imageData, 0, 0);
        canvas.toBlob((blob) => {
          if (!blob) {
            keyedUrlCache.set(src, src);
            resolve(src);
            return;
          }
          const url = URL.createObjectURL(blob);
          keyedUrlCache.set(src, url);
          resolve(url);
        }, "image/png");
      } catch {
        keyedUrlCache.set(src, src);
        resolve(src);
      }
    };
    img.onerror = () => {
      keyedUrlCache.set(src, src);
      resolve(src);
    };
    img.src = src;
  }).finally(() => {
    keyedUrlPending.delete(src);
  });

  keyedUrlPending.set(src, work);
  return work;
}

/** Cache keyed textures by image src so remounts / new URL arrays do not reprocess 1M+ pixels. */
const chromaTexCache = new Map<string, THREE.Texture>();

function configureSpriteTex(out: THREE.Texture): THREE.Texture {
  out.needsUpdate = true;
  out.colorSpace = THREE.SRGBColorSpace;
  out.magFilter = THREE.LinearFilter;
  out.minFilter = THREE.LinearFilter;
  out.generateMipmaps = false;
  out.wrapS = out.wrapT = THREE.ClampToEdgeWrapping;
  return out;
}

/**
 * Knock out magenta / hot-pink on world sprites.
 * Results are cached by image src. Pre-baked sprites (transparent corners + little
 * leftover key) skip the full pixel walk.
 */
export function applyMagentaChroma(tex: THREE.Texture): THREE.Texture {
  const img = tex.image as HTMLImageElement | HTMLCanvasElement | ImageBitmap | undefined;
  if (!img || !("width" in img) || !img.width) {
    return configureSpriteTex(tex.clone());
  }

  const src =
    typeof (img as HTMLImageElement).src === "string" && (img as HTMLImageElement).src
      ? (img as HTMLImageElement).src
      : "";
  if (src) {
    const hit = chromaTexCache.get(src);
    if (hit) return hit;
  }

  const w = img.width;
  const h = img.height;

  // Fast path: pre-baked sprites already have transparent corners — skip CPU scan.
  const probe = document.createElement("canvas");
  probe.width = 1;
  probe.height = 1;
  const pctx = probe.getContext("2d", { willReadFrequently: true })!;
  pctx.drawImage(img as CanvasImageSource, 0, 0, 1, 1, 0, 0, 1, 1);
  const c0 = pctx.getImageData(0, 0, 1, 1).data;
  pctx.clearRect(0, 0, 1, 1);
  pctx.drawImage(img as CanvasImageSource, w - 1, 0, 1, 1, 0, 0, 1, 1);
  const c1 = pctx.getImageData(0, 0, 1, 1).data;
  if (c0[3]! < 8 && c1[3]! < 8) {
    const out = configureSpriteTex(tex.clone());
    if (src) chromaTexCache.set(src, out);
    return out;
  }

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(img as CanvasImageSource, 0, 0);
  const imageData = ctx.getImageData(0, 0, w, h);
  const d = imageData.data;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3]! === 0) continue;
    if (isMagentaKey(d[i]!, d[i + 1]!, d[i + 2]!)) d[i + 3] = 0;
  }
  ctx.putImageData(imageData, 0, 0);
  const out = tex.clone();
  out.image = canvas;
  configureSpriteTex(out);
  if (src) chromaTexCache.set(src, out);
  return out;
}
