/**
 * Hire Me Remotely — Logo Generator
 * Outputs clean PNG files using Plus Jakarta Sans (the app's brand font).
 *
 * Usage: node scripts/src/generate-logo.mjs
 * Output: ./logo/ directory in workspace root
 */

import { createCanvas, GlobalFonts } from "@napi-rs/canvas";
import { writeFileSync, mkdirSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join, resolve } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../..");
const FONTS = join(__dirname, "../node_modules/@fontsource/plus-jakarta-sans/files");
const OUT = join(ROOT, "logo");

// ── Fonts ────────────────────────────────────────────────────────────────────
const registered = GlobalFonts.registerFromPath(
  join(FONTS, "plus-jakarta-sans-latin-800-normal.woff"),
  "PlusJakartaSans"
);
GlobalFonts.registerFromPath(
  join(FONTS, "plus-jakarta-sans-latin-700-normal.woff"),
  "PlusJakartaSans"
);
GlobalFonts.registerFromPath(
  join(FONTS, "plus-jakarta-sans-latin-600-normal.woff"),
  "PlusJakartaSans"
);
if (!registered) {
  console.warn("⚠ Font registration failed — output will use fallback font");
}

// ── Brand colours ─────────────────────────────────────────────────────────────
const INDIGO   = "#4f46e5";
const WHITE    = "#ffffff";
const SLATE    = "#0f172a";

mkdirSync(OUT, { recursive: true });

function save(canvas, name) {
  const buf = canvas.toBuffer("image/png");
  writeFileSync(join(OUT, name), buf);
  console.log(`✓ logo/${name}  (${canvas.width}×${canvas.height})`);
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function roundedRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

/**
 * Draw the HR monogram icon into a square region.
 *   x,y  = top-left corner of the square
 *   size = side length in px
 */
function drawIcon(ctx, x, y, size) {
  const r = Math.round(size * 0.21);
  roundedRect(ctx, x, y, size, size, r);
  ctx.fillStyle = INDIGO;
  ctx.fill();

  const fz = Math.round(size * 0.46);
  ctx.fillStyle = WHITE;
  ctx.font = `800 ${fz}px "PlusJakartaSans", "DejaVu Sans", sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  // very slight optical downward shift
  ctx.fillText("HR", x + size / 2, y + size * 0.52);
}

/**
 * Draw wordmark text.
 * Returns measured text width so callers can size their canvases.
 */
function drawWordmark(ctx, text, x, y, size, color, weight = 700) {
  ctx.fillStyle = color;
  ctx.font = `${weight} ${size}px "PlusJakartaSans", "DejaVu Sans", sans-serif`;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(text, x, y);
  return ctx.measureText(text).width;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 1. ICON — transparent background  512 × 512
// ═══════════════════════════════════════════════════════════════════════════════
{
  const W = 512;
  const c = createCanvas(W, W);
  const ctx = c.getContext("2d");
  drawIcon(ctx, 0, 0, W);
  save(c, "icon-512.png");
}

// ═══════════════════════════════════════════════════════════════════════════════
// 2. ICON SMALL — 192 × 192 (for favicons, browser UI)
// ═══════════════════════════════════════════════════════════════════════════════
{
  const W = 192;
  const c = createCanvas(W, W);
  const ctx = c.getContext("2d");
  drawIcon(ctx, 0, 0, W);
  save(c, "icon-192.png");
}

// ═══════════════════════════════════════════════════════════════════════════════
// 3. HORIZONTAL LOCKUP — icon + wordmark side by side (transparent bg)
// ═══════════════════════════════════════════════════════════════════════════════
{
  const ICON_SIZE = 96;
  const FONT_SIZE = 42;
  const GAP = 22;
  const PAD = 0;

  // Measure text first with a temp canvas
  const tmp = createCanvas(1, 1);
  const tCtx = tmp.getContext("2d");
  tCtx.font = `700 ${FONT_SIZE}px "PlusJakartaSans", "DejaVu Sans", sans-serif`;
  const textW = tCtx.measureText("Hire Me Remotely").width;
  const textH = FONT_SIZE * 1.2;

  const W = PAD + ICON_SIZE + GAP + Math.ceil(textW) + PAD;
  const H = Math.max(ICON_SIZE, textH) + PAD * 2;
  const textY = H / 2;

  const c = createCanvas(W, H);
  const ctx = c.getContext("2d");
  drawIcon(ctx, PAD, (H - ICON_SIZE) / 2, ICON_SIZE);
  drawWordmark(ctx, "Hire Me Remotely", PAD + ICON_SIZE + GAP, textY, FONT_SIZE, INDIGO);
  save(c, "logo-horizontal.png");
}

// ═══════════════════════════════════════════════════════════════════════════════
// 4. HORIZONTAL LOCKUP — white background (for presentations, docs)
// ═══════════════════════════════════════════════════════════════════════════════
{
  const ICON_SIZE = 96;
  const FONT_SIZE = 42;
  const GAP = 22;
  const PAD = 32;

  const tmp = createCanvas(1, 1);
  const tCtx = tmp.getContext("2d");
  tCtx.font = `700 ${FONT_SIZE}px "PlusJakartaSans", "DejaVu Sans", sans-serif`;
  const textW = tCtx.measureText("Hire Me Remotely").width;

  const W = PAD + ICON_SIZE + GAP + Math.ceil(textW) + PAD;
  const H = ICON_SIZE + PAD * 2;
  const textY = H / 2;

  const c = createCanvas(W, H);
  const ctx = c.getContext("2d");
  ctx.fillStyle = WHITE;
  ctx.fillRect(0, 0, W, H);
  drawIcon(ctx, PAD, PAD, ICON_SIZE);
  drawWordmark(ctx, "Hire Me Remotely", PAD + ICON_SIZE + GAP, textY, FONT_SIZE, INDIGO);
  save(c, "logo-horizontal-white.png");
}

// ═══════════════════════════════════════════════════════════════════════════════
// 5. HORIZONTAL LOCKUP — dark background
// ═══════════════════════════════════════════════════════════════════════════════
{
  const ICON_SIZE = 96;
  const FONT_SIZE = 42;
  const GAP = 22;
  const PAD = 32;

  const tmp = createCanvas(1, 1);
  const tCtx = tmp.getContext("2d");
  tCtx.font = `700 ${FONT_SIZE}px "PlusJakartaSans", "DejaVu Sans", sans-serif`;
  const textW = tCtx.measureText("Hire Me Remotely").width;

  const W = PAD + ICON_SIZE + GAP + Math.ceil(textW) + PAD;
  const H = ICON_SIZE + PAD * 2;
  const textY = H / 2;

  const c = createCanvas(W, H);
  const ctx = c.getContext("2d");
  ctx.fillStyle = SLATE;
  ctx.fillRect(0, 0, W, H);
  drawIcon(ctx, PAD, PAD, ICON_SIZE);
  drawWordmark(ctx, "Hire Me Remotely", PAD + ICON_SIZE + GAP, textY, FONT_SIZE, WHITE);
  save(c, "logo-horizontal-dark.png");
}

// ═══════════════════════════════════════════════════════════════════════════════
// 6. VERTICAL LOCKUP — icon above wordmark (transparent bg)
// ═══════════════════════════════════════════════════════════════════════════════
{
  const ICON_SIZE = 128;
  const FONT_SIZE = 40;
  const GAP = 20;

  const tmp = createCanvas(1, 1);
  const tCtx = tmp.getContext("2d");
  tCtx.font = `700 ${FONT_SIZE}px "PlusJakartaSans", "DejaVu Sans", sans-serif`;
  const textW = tCtx.measureText("Hire Me Remotely").width;

  const W = Math.max(ICON_SIZE, Math.ceil(textW));
  const H = ICON_SIZE + GAP + Math.ceil(FONT_SIZE * 1.3);

  const c = createCanvas(W, H);
  const ctx = c.getContext("2d");

  // Centre icon
  drawIcon(ctx, (W - ICON_SIZE) / 2, 0, ICON_SIZE);

  // Centre wordmark
  ctx.fillStyle = INDIGO;
  ctx.font = `700 ${FONT_SIZE}px "PlusJakartaSans", "DejaVu Sans", sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillText("Hire Me Remotely", W / 2, ICON_SIZE + GAP);

  save(c, "logo-vertical.png");
}

// ═══════════════════════════════════════════════════════════════════════════════
// 7. WORDMARK ONLY — transparent background
// ═══════════════════════════════════════════════════════════════════════════════
{
  const FONT_SIZE = 60;

  const tmp = createCanvas(1, 1);
  const tCtx = tmp.getContext("2d");
  tCtx.font = `700 ${FONT_SIZE}px "PlusJakartaSans", "DejaVu Sans", sans-serif`;
  const textW = Math.ceil(tCtx.measureText("Hire Me Remotely").width);

  const W = textW + 4; // tiny breathing room
  const H = Math.ceil(FONT_SIZE * 1.4);

  const c = createCanvas(W, H);
  const ctx = c.getContext("2d");
  ctx.fillStyle = INDIGO;
  ctx.font = `700 ${FONT_SIZE}px "PlusJakartaSans", "DejaVu Sans", sans-serif`;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText("Hire Me Remotely", 2, H / 2);
  save(c, "wordmark.png");
}

// ═══════════════════════════════════════════════════════════════════════════════
// 8. ICON only for extension / favicon  — 128 × 128
// ═══════════════════════════════════════════════════════════════════════════════
{
  const W = 128;
  const c = createCanvas(W, W);
  const ctx = c.getContext("2d");
  drawIcon(ctx, 0, 0, W);
  save(c, "icon-128.png");
}

console.log(`\n✓ All done → ${OUT}`);
