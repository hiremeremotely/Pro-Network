/**
 * Pure Node.js ZIP packager for the HMR extension.
 * Creates dist/ → hmr-extension.zip (or hmr-extension-firefox.zip)
 * using only built-in modules (no external deps).
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from "fs";
import { join, relative, sep, posix } from "path";
import { deflateRawSync, crc32 } from "zlib";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const isFirefox = process.argv.includes("--firefox");
const outName = isFirefox ? "hmr-extension-firefox.zip" : "hmr-extension.zip";

const DIST = join(__dirname, "dist");
const OUT = join(__dirname, outName);

// ── Walk directory ──────────────────────────────────────────────────────────
function walk(dir, base = dir) {
  const entries = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      entries.push(...walk(full, base));
    } else {
      const rel = relative(base, full).split(sep).join(posix.sep);
      entries.push({ path: full, name: rel });
    }
  }
  return entries;
}

// ── DOS time encoding ────────────────────────────────────────────────────────
function dosTime() {
  const d = new Date();
  const t = ((d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1)) & 0xffff;
  const dt =
    (((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate()) & 0xffff;
  return { time: t, date: dt };
}

// ── Build ZIP ────────────────────────────────────────────────────────────────
function buildZip(files) {
  const parts = [];
  const centralDir = [];
  let offset = 0;

  const { time: modTime, date: modDate } = dosTime();

  for (const { path, name } of files) {
    const raw = readFileSync(path);
    const compressed = deflateRawSync(raw, { level: 6 });
    const useDeflate = compressed.length < raw.length;
    const data = useDeflate ? compressed : raw;
    const method = useDeflate ? 8 : 0;
    const crc = crc32(raw) >>> 0;
    const nameBytes = Buffer.from(name, "utf8");

    // Local file header
    const lhSize = 30 + nameBytes.length;
    const lh = Buffer.alloc(lhSize);
    lh.writeUInt32LE(0x04034b50, 0);  // signature
    lh.writeUInt16LE(20, 4);          // version needed
    lh.writeUInt16LE(0, 6);           // general purpose flags
    lh.writeUInt16LE(method, 8);      // compression method
    lh.writeUInt16LE(modTime, 10);    // last mod time
    lh.writeUInt16LE(modDate, 12);    // last mod date
    lh.writeUInt32LE(crc, 14);        // CRC-32
    lh.writeUInt32LE(data.length, 18); // compressed size
    lh.writeUInt32LE(raw.length, 22); // uncompressed size
    lh.writeUInt16LE(nameBytes.length, 26); // filename length
    lh.writeUInt16LE(0, 28);          // extra field length
    nameBytes.copy(lh, 30);

    // Central directory entry
    const cdSize = 46 + nameBytes.length;
    const cd = Buffer.alloc(cdSize);
    cd.writeUInt32LE(0x02014b50, 0);  // signature
    cd.writeUInt16LE(20, 4);          // version made by
    cd.writeUInt16LE(20, 6);          // version needed
    cd.writeUInt16LE(0, 8);           // flags
    cd.writeUInt16LE(method, 10);     // compression
    cd.writeUInt16LE(modTime, 12);    // mod time
    cd.writeUInt16LE(modDate, 14);    // mod date
    cd.writeUInt32LE(crc, 16);        // CRC-32
    cd.writeUInt32LE(data.length, 20); // compressed size
    cd.writeUInt32LE(raw.length, 24); // uncompressed size
    cd.writeUInt16LE(nameBytes.length, 28); // filename length
    cd.writeUInt16LE(0, 30);          // extra field length
    cd.writeUInt16LE(0, 32);          // comment length
    cd.writeUInt16LE(0, 34);          // disk number start
    cd.writeUInt16LE(0, 36);          // internal attributes
    cd.writeUInt32LE(0, 38);          // external attributes
    cd.writeUInt32LE(offset, 42);     // relative offset of local header
    nameBytes.copy(cd, 46);

    parts.push(lh, data);
    centralDir.push(cd);
    offset += lhSize + data.length;
  }

  const cdBuf = Buffer.concat(centralDir);
  const cdOffset = offset;
  const cdSize = cdBuf.length;

  // End of central directory
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);  // signature
  eocd.writeUInt16LE(0, 4);           // disk number
  eocd.writeUInt16LE(0, 6);           // start disk
  eocd.writeUInt16LE(files.length, 8);  // entries on disk
  eocd.writeUInt16LE(files.length, 10); // total entries
  eocd.writeUInt32LE(cdSize, 12);     // central dir size
  eocd.writeUInt32LE(cdOffset, 16);   // central dir offset
  eocd.writeUInt16LE(0, 20);          // comment length

  return Buffer.concat([...parts, cdBuf, eocd]);
}

const files = walk(DIST);
const zip = buildZip(files);
writeFileSync(OUT, zip);
console.log(`✓ Packaged ${files.length} files → ${outName} (${(zip.length / 1024).toFixed(1)} KB)`);
