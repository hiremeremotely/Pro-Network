/**
 * HMR Extension build script.
 * Usage:
 *   node build.mjs           — Chrome (default)
 *   node build.mjs --firefox — Firefox-compatible build
 *
 * Output: dist/
 */

import { build } from "esbuild";
import { readFileSync, writeFileSync, copyFileSync, mkdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { deflateSync, crc32 as _crc32 } from "zlib";

const __dirname = dirname(fileURLToPath(import.meta.url));
const isFirefox = process.argv.includes("--firefox");

const OUT = join(__dirname, "dist");
const SRC = join(__dirname, "src");

// ── Ensure output dirs ──────────────────────────────────────────────────────
for (const dir of [OUT, join(OUT, "content"), join(OUT, "popup"), join(OUT, "icons")]) {
  mkdirSync(dir, { recursive: true });
}

// ── Generate PNG icons ───────────────────────────────────────────────────────
// Writes a minimal valid PNG (solid indigo square) for each icon size.

function crc32(buf) {
  let crc = 0xffffffff;
  for (const byte of buf) {
    crc ^= byte;
    for (let i = 0; i < 8; i++) {
      crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function makePngChunk(type, data) {
  const typeBytes = Buffer.from(type, "ascii");
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);
  const crcInput = Buffer.concat([typeBytes, data]);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(crcInput), 0);
  return Buffer.concat([lenBuf, typeBytes, data, crcBuf]);
}

function createSolidPng(size, r, g, b) {
  // PNG signature
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(size, 0);   // width
  ihdrData.writeUInt32BE(size, 4);   // height
  ihdrData[8] = 8;  // bit depth
  ihdrData[9] = 2;  // color type: RGB
  ihdrData[10] = 0; // compression
  ihdrData[11] = 0; // filter
  ihdrData[12] = 0; // interlace

  // Raw image data: each row = [filter_byte, R, G, B, R, G, B, ...]
  const rowLen = size * 3;
  const raw = Buffer.alloc(size * (rowLen + 1));
  for (let y = 0; y < size; y++) {
    raw[y * (rowLen + 1)] = 0; // filter: None
    for (let x = 0; x < size; x++) {
      const off = y * (rowLen + 1) + 1 + x * 3;
      // Rounded-corner mask: darken corners
      const cx = x - size / 2, cy = y - size / 2;
      const radius = size * 0.28;
      const corner =
        (Math.abs(cx) > size / 2 - radius && Math.abs(cy) > size / 2 - radius)
          ? Math.sqrt((Math.abs(cx) - (size / 2 - radius)) ** 2 + (Math.abs(cy) - (size / 2 - radius)) ** 2) > radius
          : false;
      raw[off] = corner ? 255 : r;
      raw[off + 1] = corner ? 255 : g;
      raw[off + 2] = corner ? 255 : b;
    }
  }
  const compressed = deflateSync(raw);

  return Buffer.concat([
    sig,
    makePngChunk("IHDR", ihdrData),
    makePngChunk("IDAT", compressed),
    makePngChunk("IEND", Buffer.alloc(0)),
  ]);
}

// Indigo brand color: #4f46e5 → R=79, G=70, B=229
for (const size of [16, 32, 48, 128]) {
  const png = createSolidPng(size, 79, 70, 229);
  writeFileSync(join(OUT, "icons", `icon${size}.png`), png);
}
console.log("✓ Icons generated");

// ── Build entrypoints ────────────────────────────────────────────────────────
const sharedOptions = {
  bundle: true,
  minify: false,
  sourcemap: false,
  target: ["chrome100", "firefox109"],
  define: {
    "process.env.NODE_ENV": '"production"',
  },
};

// Firefox: replace chrome.* with browser.* via a polyfill preamble
const firefoxBanner = isFirefox
  ? { js: "if(typeof browser!=='undefined'&&typeof chrome==='undefined'){var chrome=browser;}" }
  : undefined;

async function buildAll() {
  await Promise.all([
    // Background service worker
    build({
      ...sharedOptions,
      entryPoints: [join(SRC, "background.ts")],
      outfile: join(OUT, "background.js"),
      format: "esm",
      platform: "browser",
      banner: firefoxBanner,
    }),

    // HMR session sync content script
    build({
      ...sharedOptions,
      entryPoints: [join(SRC, "content", "hmr-session.ts")],
      outfile: join(OUT, "content", "hmr-session.js"),
      format: "iife",
      platform: "browser",
      banner: firefoxBanner,
    }),

    // Per-site content scripts
    ...["linkedin", "indeed", "glassdoor", "wellfound", "generic"].map((site) =>
      build({
        ...sharedOptions,
        entryPoints: [join(SRC, "content", `${site}.ts`)],
        outfile: join(OUT, "content", `${site}.js`),
        format: "iife",
        platform: "browser",
        banner: firefoxBanner,
      })
    ),

    // Popup
    build({
      ...sharedOptions,
      entryPoints: [join(SRC, "popup", "index.tsx")],
      outfile: join(OUT, "popup", "popup.js"),
      format: "esm",
      platform: "browser",
      jsx: "automatic",
      banner: firefoxBanner,
    }),
  ]);

  // Copy popup HTML (update script src path relative to popup dir)
  let html = readFileSync(join(SRC, "popup", "index.html"), "utf8");
  html = html.replace('src="popup.js"', 'src="popup.js"');
  writeFileSync(join(OUT, "popup", "index.html"), html);

  // Copy & patch manifest
  const manifest = JSON.parse(readFileSync(join(__dirname, "manifest.json"), "utf8"));

  if (isFirefox) {
    // Firefox MV3 requires browser_specific_settings + background as scripts array
    manifest.browser_specific_settings = {
      gecko: { id: "hmr-extension@hiremeremotely.com", strict_min_version: "109.0" },
    };
    // Firefox doesn't support "type: module" in background service_worker yet
    manifest.background = { scripts: ["background.js"] };
  }

  writeFileSync(join(OUT, "manifest.json"), JSON.stringify(manifest, null, 2));

  const buildType = isFirefox ? "Firefox" : "Chrome";
  console.log(`✓ Built ${buildType} extension → dist/`);
  console.log("");
  console.log("Load unpacked in Chrome:");
  console.log("  1. Open chrome://extensions");
  console.log("  2. Enable 'Developer mode'");
  console.log('  3. Click "Load unpacked" → select the dist/ folder');
}

buildAll().catch((err) => {
  console.error(err);
  process.exit(1);
});
