'use strict';

// One-shot icon generator — run once, commit assets/icon.ico, then delete this file.
// Produces a dark-background 3×2 tile-grid motif icon.

const Jimp = require('jimp');
const pngToIco = require('png-to-ico');
const path = require('path');
const fs = require('fs');

const SIZES = [256, 48, 32, 16];
const OUT_ICO = path.join(__dirname, '..', 'assets', 'icon.ico');
const TMP_DIR = path.join(__dirname, '..', 'assets', '_tmp_ico');

const BG   = 0x0e0e0eff;
const TILE = 0x3a3a3aff;
const GAP  = 0x0e0e0eff;

async function drawIcon(size) {
  const img = new Jimp({ width: size, height: size, color: BG });

  // Draw a 3×2 grid of tile rectangles
  const cols = 3, rows = 2;
  const padding = Math.round(size * 0.12);
  const gapSize = Math.round(size * 0.06);
  const cellW = Math.round((size - padding * 2 - gapSize * (cols - 1)) / cols);
  const cellH = Math.round((size - padding * 2 - gapSize * (rows - 1)) / rows);

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = padding + c * (cellW + gapSize);
      const y = padding + r * (cellH + gapSize);
      for (let py = y; py < y + cellH; py++) {
        for (let px = x; px < x + cellW; px++) {
          if (px >= 0 && px < size && py >= 0 && py < size) {
            img.setPixelColor(TILE, px, py);
          }
        }
      }
    }
  }

  return img.getBuffer('image/png');
}

async function main() {
  fs.mkdirSync(TMP_DIR, { recursive: true });
  fs.mkdirSync(path.dirname(OUT_ICO), { recursive: true });

  const pngPaths = [];
  for (const size of SIZES) {
    const buf = await drawIcon(size);
    const p = path.join(TMP_DIR, `icon-${size}.png`);
    fs.writeFileSync(p, buf);
    pngPaths.push(p);
    console.log(`  drew ${size}×${size}`);
  }

  const ico = await pngToIco(pngPaths);
  fs.writeFileSync(OUT_ICO, ico);
  console.log(`  wrote ${OUT_ICO}`);

  fs.rmSync(TMP_DIR, { recursive: true });
}

main().catch(e => { console.error(e); process.exit(1); });
