/**
 * Trace the original HMR logo and output clean PNG files at large sizes.
 * Uses @napi-rs/canvas to load + re-render, potrace to vectorize the shape.
 *
 * Usage: node scripts/src/trace-logo.mjs
 * Output: ./logo/traced/
 */

import { createCanvas, loadImage } from "@napi-rs/canvas";
import potrace from "potrace";
import { writeFileSync, mkdirSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join, resolve } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../..");
const OUT = join(ROOT, "logo", "traced");
mkdirSync(OUT, { recursive: true });

const SRC = join(ROOT, "attached_assets", "HmR_logo_1779246815358.png");
const LOGO_COLOR = "#6738e6"; // sampled from original

// ── 1. Load original & extract pixel data ────────────────────────────────────
const img = await loadImage(SRC);
const { width: W, height: H } = img;

const src = createCanvas(W, H);
const sCtx = src.getContext("2d");
sCtx.drawImage(img, 0, 0);
const imgData = sCtx.getImageData(0, 0, W, H);

// ── 2. Build a grayscale bitmap for potrace ──────────────────────────────────
// Potrace works on a pixels object with { width, height, data } where data is
// a Buffer of RGBA bytes. We'll threshold: logo pixels → black (0,0,0,255),
// everything else → white (255,255,255,255).
const bitmapData = Buffer.alloc(W * H * 4);

for (let i = 0; i < W * H; i++) {
  const r = imgData.data[i * 4];
  const g = imgData.data[i * 4 + 1];
  const b = imgData.data[i * 4 + 2];
  const a = imgData.data[i * 4 + 3];

  // A pixel belongs to the logo if it has reasonable opacity AND is in the
  // purple hue range (blue > green, red moderate-high, blue high)
  const isLogo = a > 60 && b > 100 && r > 50 && b > g + 20;

  const v = isLogo ? 0 : 255;
  bitmapData[i * 4]     = v;
  bitmapData[i * 4 + 1] = v;
  bitmapData[i * 4 + 2] = v;
  bitmapData[i * 4 + 3] = 255;
}

// ── 3. Run potrace ────────────────────────────────────────────────────────────
function trace(params) {
  return new Promise((resolve, reject) => {
    const bitmap = { width: W, height: H, data: bitmapData };
    potrace.trace(bitmap, params, (err, svg) => {
      if (err) reject(err);
      else resolve(svg);
    });
  });
}

const rawSvg = await trace({
  color: LOGO_COLOR,
  background: "transparent",
  threshold: 128,
  turdSize: 2,        // remove speckles smaller than 2px
  alphaMax: 1,        // corner threshold (higher = smoother)
  optCurve: true,
  optTolerance: 0.2,
});

// ── 4. Save the SVG ──────────────────────────────────────────────────────────
writeFileSync(join(OUT, "logo-traced.svg"), rawSvg);
console.log(`✓ logo/traced/logo-traced.svg`);

// Extract just the path data from the SVG so we can render it ourselves
// at any size using canvas + path2D
const pathMatch = rawSvg.match(/<path[^>]+d="([^"]+)"/);
if (!pathMatch) throw new Error("No path found in potrace SVG output");
const pathData = pathMatch[1];

// ── 5. Render clean PNGs at multiple sizes using the traced path ──────────────
function renderTraced(scale, bgColor = null) {
  const cw = Math.round(W * scale);
  const ch = Math.round(H * scale);
  const c = createCanvas(cw, ch);
  const ctx = c.getContext("2d");

  if (bgColor) {
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, cw, ch);
  }

  ctx.scale(scale, scale);
  ctx.fillStyle = LOGO_COLOR;

  const p = new (globalThis.Path2D || c.getContext("2d").constructor)();
  // @napi-rs/canvas exposes Path2D via the module
  return { c, ctx, cw, ch };
}

// @napi-rs/canvas Path2D approach
import { Path2D } from "@napi-rs/canvas";

function renderAt(scale, bgColor = null) {
  const cw = Math.round(W * scale);
  const ch = Math.round(H * scale);
  const c = createCanvas(cw, ch);
  const ctx = c.getContext("2d");

  if (bgColor) {
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, cw, ch);
  }

  ctx.scale(scale, scale);
  ctx.fillStyle = LOGO_COLOR;
  const path = new Path2D(pathData);
  ctx.fill(path);
  return c;
}

const sizes = [
  { scale: 8,  name: "logo-traced-1024.png",       bg: null },
  { scale: 4,  name: "logo-traced-512.png",         bg: null },
  { scale: 2,  name: "logo-traced-256.png",         bg: null },
  { scale: 8,  name: "logo-traced-1024-white.png",  bg: "#ffffff" },
  { scale: 8,  name: "logo-traced-1024-dark.png",   bg: "#0f172a" },
];

for (const { scale, name, bg } of sizes) {
  const c = renderAt(scale, bg);
  writeFileSync(join(OUT, name), c.toBuffer("image/png"));
  console.log(`✓ logo/traced/${name}  (${c.width}×${c.height})`);
}

console.log(`\n✓ All traced files → ${OUT}`);
