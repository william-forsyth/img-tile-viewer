# img-tile-viewer

Local, offline image viewer that displays multiple images in a margin-less tile grid. Desktop only. Never hosted online.

## Quick Start

Open `index.html` in any modern browser. No server, no build step, no install.

## Architecture

Single self-contained HTML file (`index.html`) with inline CSS and JS. Zero external dependencies — no CDNs, no web fonts, no icon libraries, no npm packages.

Images are loaded via `URL.createObjectURL()` from dropped/selected files. **Images are never copied into the project folder** — they are referenced directly from the user's filesystem via browser object URLs.

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

## Design Guidelines

When making UI changes, use the frontend design skill:
`C:\Users\wfors\.claude\skills\frontend-design.skill`

Key principles from the skill:
- Bold aesthetic direction — industrial-minimal dark tool
- No generic AI aesthetics (no Inter, no purple gradients)
- CSS-only animations preferred
- Commit to the dark, utilitarian tone
