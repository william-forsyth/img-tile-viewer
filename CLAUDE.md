# img-tile-viewer

Local, offline image viewer that displays multiple images in a margin-less tile grid. Desktop only. Never hosted online.

## Quick Start

Two ways to run, both offline:

1. **Browser** — open `index.html` directly in any modern browser. No server, no build, no install. All Electron-specific code is feature-detected behind `if (window.electronAPI)`, so the file still works standalone.
2. **Desktop app** — `npm install` once, then `npm start` to launch the Electron build (frameless window pinnable to the taskbar). See [Desktop App (Electron)](#desktop-app-electron).

## Architecture

The UI is a **single self-contained `index.html`** with inline CSS and JS. The viewer logic itself has **zero runtime dependencies** — no CDNs, no web fonts, no icon libraries, no JS frameworks. This is a hard constraint and must stay true: anything bundled into the shipped app is the Electron runtime only, never a web library inside `index.html`.

Images are loaded via `URL.createObjectURL()` from dropped/selected files. **Images are never copied into the project folder** — they are referenced directly from the user's filesystem via browser object URLs.

### Electron wrapper (desktop app)

`index.html` is wrapped in Electron so it can ship as a standalone Windows `.exe` (no third-party browser needed — Electron bundles its own Chromium). The wrapper is thin:

| File | Role |
|---|---|
| `main.js` | Main process: creates the frameless `BrowserWindow`, registers `window:*` IPC handlers, persists window size/position to a JSON file in `app.getPath('userData')`, suppresses the default menu |
| `preload.js` | Exposes a minimal `window.electronAPI` (minimize/maximize/close/fullscreen + maximize/fullscreen change callbacks) via `contextBridge`. `contextIsolation: true`, `nodeIntegration: false` |
| `package.json` | Electron + electron-builder devDeps, `start`/`build` scripts, NSIS + portable build targets |
| `scripts/launch.js` | Dev launcher for `npm start` — spawns Electron with `ELECTRON_RUN_AS_NODE` stripped (see [Gotchas](#gotchas)) |
| `scripts/gen-icon.js` | One-shot generator for `assets/icon.ico` (3×2 tile-grid motif). Already run; kept for reproducibility |
| `assets/icon.ico` | App icon (taskbar, Alt+Tab, window) |

The `index.html` ↔ main-process boundary is IPC only. The renderer never touches Node. Window-chrome markup/CSS/JS lives inline in `index.html` like everything else, guarded by `if (window.electronAPI)`.

## Constraints

- **Offline only** — no network requests, no external resources
- **Dark theme** — matte dark background (#0e0e0e), muted controls
- **Desktop optimised** — no mobile/touch considerations
- **No web libraries** — no fonts, icons, or JS frameworks from the web
- **Font stack**: `"SF Mono", "Cascadia Code", "Fira Code", "JetBrains Mono", "Consolas", monospace` (system-installed only)

## UI States

### 1. Drop Zone (initial)
Full-screen dark canvas with a centered dashed-border box. Accepts drag-and-drop or click-to-browse. Transitions to grid view once images are loaded.

### 2. Image Grid (viewing)
- CSS Grid fills the viewport with a margin-less tile layout
- Images use `object-fit: contain` — no cropping, aspect ratios preserved
- Grid is centered with `position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%)`
- Row heights are computed from image aspect ratios via `fitGrid()` so rows pack tightly with letterboxing only above/below the entire grid
- Additional images can be dropped onto the grid at any time

### 3. Controls Overlay
Appears on mouse movement, fades out after ~2 seconds of inactivity. Stays visible while hovered.

| Control | Position | Action |
|---------|----------|--------|
| **x** | Top-right | Clear all images, return to drop zone |
| **+** | Top-left | Open file picker to add more images |
| **Slider** | Bottom-center | Adjust columns per row (1–10) |
| **Esc** | Keyboard | Same as x — clear all |

### 4. Window Chrome (Electron only)
A frameless-window drag strip (`#drag-strip`) with custom min/maximize/close buttons (`#win-controls`), hidden when running in a plain browser. `F11` toggles fullscreen and shows a brief fading hint; window chrome hides in fullscreen. The maximize glyph swaps between `□`/`❐` via the `onMaximizeChange` callback.

## Grid Layout Rules

Auto-column logic (`defaultColumns`):
- 1 image = 1 column
- 2+ images = `ceil(n / 2)` columns, capped at 10

The slider overrides auto-columns when adjusted. Clearing images resets to auto.

Row heights are aspect-ratio-aware: `fitGrid()` waits for all images to load, computes the minimum aspect ratio per row, sizes rows so the most-portrait image in each row fills its cell height, then scales the whole grid down if it exceeds the viewport.

## Code Conventions

- All JS is wrapped in an IIFE — no globals
- CSS custom properties defined in `:root` for theming
- Images sorted by natural filename order on add (`localeCompare` with `numeric: true`)
- Controls use `backdrop-filter: blur(12px)` with semi-transparent backgrounds
- Grid rebuilds DOM on every render (image count is small, simplicity over optimisation)

## Desktop App (Electron)

### Develop / run
```
npm install      # once
npm start        # launches the Electron app (via scripts/launch.js)
```
`npm start` goes through `scripts/launch.js`, **not** `electron .` directly — that launcher is what makes startup reliable (see [Gotchas](#gotchas)).

### Build a distributable
```
npm run build    # electron-builder --win → dist/
```
Produces two artifacts in `dist/` (gitignored):
- **NSIS installer** (`...Setup.exe`) — install once, appears in Start Menu, pin to taskbar
- **Portable** `.exe` — single-file, no install, for quick testing

### Updating the app (it's no longer just an HTML file)
The shipped `.exe` embeds a **copy** of `index.html` taken at build time. Editing `index.html` does **not** update an already-installed app. To roll out a change:

1. Edit `index.html` (and/or `main.js`/`preload.js`).
2. Bump `version` in `package.json` (electron-builder/electron-updater compare on this).
3. `npm run build`.
4. Run the new NSIS installer (or replace the portable `.exe`).

For quick iteration during development, just use `npm start` — it loads `index.html` live from disk, so no rebuild is needed to see changes (restart the app to pick them up). Rebuild only when you need a new installer.

When changing `main.js`/`preload.js`/`package.json`, also confirm they're listed in the electron-builder `build.files` array in `package.json` or they won't be bundled.

## Gotchas

- **`ELECTRON_RUN_AS_NODE` breaks `npm start`.** If this env var is set in the shell (it is on the dev's machine), the `electron` binary runs as plain Node, so `require('electron')` returns the binary *path string* instead of the API — `app`/`BrowserWindow` come back `undefined` and the app crashes with `Cannot read properties of undefined (reading 'whenReady')`. **This cannot be fixed inside `main.js`** (by then Electron has already booted as Node with no GUI). `scripts/launch.js` is the fix: it spawns Electron with the var stripped. Always launch via `npm start`, never `electron .` directly. If `npm run build` ever misbehaves the same way, apply the same env strip.
- **Renderer has no Node.** `contextIsolation: true` / `nodeIntegration: false`. The renderer can only reach the main process through the `electronAPI` surface in `preload.js`; add new IPC there, don't expose Node.
- **Keep `index.html` dependency-free.** The zero-web-library rule still holds for the renderer. Electron/electron-builder are dev/runtime wrappers; never pull a web font, icon set, or JS framework into `index.html`.
- **Browser fallback must keep working.** Every Electron call in `index.html` is guarded by `if (window.electronAPI)` — preserve that so the file still opens standalone in a browser. Test both modes after UI changes.
- **Window-state persistence is best-effort.** `main.js` writes bounds to `userData/window-state.json` on resize/move (skipped while maximized/fullscreen). A corrupt file falls back to defaults silently.
- **`npm run build` winCodeSign symlink failure.** electron-builder downloads `winCodeSign-2.6.0.7z` and extracts it with 7-Zip's `-snld` flag, which tries to create the archive's two macOS `.dylib` symlinks as real Windows symlinks — that needs the symlink-create privilege (admin or Developer Mode), which the dev machine lacks, so the build aborts with `Cannot create symbolic link : A required privilege is not held by the client`. Fix: `scripts/prepare-wincodesign.js` (run automatically by `npm run build` via the npm `prebuild` hook) pre-seeds `%LOCALAPPDATA%\electron-builder\Cache\winCodeSign\winCodeSign-2.6.0\` by extracting the archive *without* `-snld` (and skipping the unused `darwin/` folder), so electron-builder gets a cache hit and never runs the failing extraction. It's idempotent — re-running the build re-uses the seeded cache. Alternative one-time fix: enable Windows Developer Mode (Settings → System → For developers), which grants the privilege.

## Design Guidelines

When making UI changes, use the frontend design skill:
`C:\Users\wfors\.claude\skills\frontend-design.skill`

Key principles from the skill:
- Bold aesthetic direction — industrial-minimal dark tool
- No generic AI aesthetics (no Inter, no purple gradients)
- CSS-only animations preferred
- Commit to the dark, utilitarian tone

## Handover Procedure

When asked to hand over work to another agent, create a handover document in `docs/handovers/` with the format `YYYY-MM-DD-brief-description.md`.

**Handover to Senior Agent** (usually Claude Opus)
- Document the specific problem encountered
- List all approaches tried and their results
- Provide your hypothesis for resolution
- Include current branch state, relevant errors, and reproduction steps
- Assume the senior agent is unfamiliar with the context and needs to ramp up quickly

**Handover to Junior Agent** (usually Claude Haiku or Sonnet)
- Treat as offloading non-critical grunt work for a cheaper resource
- Clearly delineate the discrete task(s) to complete
- Provide context on what's already done and why
- List acceptance criteria or definition of done
- Include any blockers or gotchas learned so far

**Handover to Peer** (same model, next shift)
- Treat like handing off to the next shift the next day
- Summarize progress made and current state
- List next steps in order of priority
- Document any decisions made and their rationale
- Include fresh perspective notes if something seemed off
