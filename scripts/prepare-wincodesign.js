#!/usr/bin/env node
// Pre-seed the electron-builder winCodeSign cache.
//
// Why: `npm run build` (electron-builder --win) downloads winCodeSign-2.6.0.7z and
// extracts it with 7-Zip's `-snld` flag, which tries to create the archive's two
// macOS symlinks (darwin/10.12/lib/libcrypto.dylib, libssl.dylib) as REAL Windows
// symlinks. That needs the symlink-create privilege (admin or Developer Mode), which
// the dev machine doesn't have, so extraction aborts (exit 2) before the cache dir is
// finalized — and every build re-downloads and re-fails. Those mac libs are never used
// on a Windows build.
//
// Fix: extract the archive OURSELVES without `-snld` (and skipping the darwin/ folder)
// into the exact dir electron-builder looks for. The Go `app-builder.exe` then treats
// that populated dir as a cache hit and skips its own (failing) download + extraction.
//
// Standalone + idempotent: safe to run directly (`node scripts/prepare-wincodesign.js`)
// or via scripts/launch.js --build. See CLAUDE.md "Gotchas".

const fs = require('fs');
const os = require('os');
const path = require('path');
const https = require('https');

const VERSION = 'winCodeSign-2.6.0';
const URL = `https://github.com/electron-userland/electron-builder-binaries/releases/download/${VERSION}/${VERSION}.7z`;

function log(msg) {
  console.log(`[prepare-wincodesign] ${msg}`);
}

function isPopulated(dir) {
  // app-builder extracts a "windows-10" folder among others; its presence is a good
  // signal the cache is complete enough for a Windows build.
  return fs.existsSync(path.join(dir, 'windows-10')) ||
    (fs.existsSync(dir) && fs.readdirSync(dir).length > 0);
}

function download(url, dest, redirectsLeft = 5) {
  return new Promise((resolve, reject) => {
    if (redirectsLeft < 0) {
      reject(new Error('too many redirects'));
      return;
    }
    https.get(url, (res) => {
      // GitHub release assets 302 to objects.githubusercontent.com; Node's https
      // does not auto-follow, so chase the Location header ourselves.
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume();
        download(res.headers.location, dest, redirectsLeft - 1).then(resolve, reject);
        return;
      }
      if (res.statusCode !== 200) {
        res.resume();
        reject(new Error(`download failed: HTTP ${res.statusCode} for ${url}`));
        return;
      }
      const out = fs.createWriteStream(dest);
      res.pipe(out);
      out.on('finish', () => out.close(resolve));
      out.on('error', reject);
    }).on('error', reject);
  });
}

function extract(archive, dest) {
  // Locate 7za. require('7zip-bin') is the robust path (it's an app-builder dep);
  // fall back to the conventional location just in case.
  let path7za;
  try {
    path7za = require('7zip-bin').path7za;
  } catch {
    path7za = path.join(__dirname, '..', 'node_modules', '7zip-bin', 'win', 'x64', '7za.exe');
  }
  if (!fs.existsSync(path7za)) {
    throw new Error(`7za not found at ${path7za}`);
  }

  // NOTE: deliberately NO `-snld` (that's the flag that fails). `-xr!darwin` skips the
  // entire mac folder so no symlink entries are ever processed — we don't need it on
  // Windows. `-y` assume-yes, `-bd` no progress bar.
  const args = ['x', archive, `-o${dest}`, '-xr!darwin', '-y', '-bd'];
  const { status, error } = require('child_process').spawnSync(path7za, args, {
    stdio: 'inherit',
  });
  if (error) throw error;
  // 7-Zip exit codes: 0 = OK, 1 = warning (non-fatal), 2+ = fatal.
  if (status > 1) {
    throw new Error(`7za exited with code ${status}`);
  }
}

async function main() {
  if (process.platform !== 'win32') {
    log('not win32 — nothing to do.');
    return;
  }
  const localAppData = process.env.LOCALAPPDATA;
  if (!localAppData) {
    log('LOCALAPPDATA not set — skipping (let electron-builder handle the cache).');
    return;
  }

  const dest = path.join(localAppData, 'electron-builder', 'Cache', 'winCodeSign', VERSION);
  if (isPopulated(dest)) {
    log(`cache present at ${dest} — skipping.`);
    return;
  }

  fs.mkdirSync(dest, { recursive: true });
  const tmp = path.join(os.tmpdir(), `${VERSION}-${process.pid}.7z`);

  try {
    log(`downloading ${URL}`);
    await download(URL, tmp);
    log(`extracting to ${dest} (without -snld, skipping darwin/)`);
    extract(tmp, dest);
    log('done — winCodeSign cache seeded.');
  } catch (err) {
    // Don't leave a half-written cache that would poison the real build.
    try {
      fs.rmSync(dest, { recursive: true, force: true });
    } catch { /* best effort */ }
    throw err;
  } finally {
    try {
      fs.rmSync(tmp, { force: true });
    } catch { /* best effort */ }
  }
}

main().catch((err) => {
  console.error(`[prepare-wincodesign] FAILED: ${err.message}`);
  process.exit(1);
});
