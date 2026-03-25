# img-tile-viewer

A local, offline image viewer that displays multiple images in a margin-less tile grid. No install, no server, no internet connection required.

## Getting started

1. Download or clone the repository
2. Open `index.html` in any modern browser (Chrome, Firefox, Edge, Safari)
3. That's it — you're running

## Usage

### Loading images

When you open the app you'll see a drop zone. You have two ways to load images:

- **Drag and drop** — drag image files from your file manager directly onto the drop zone
- **Click to browse** — click anywhere on the drop zone to open a file picker

You can load as many images as you like, and you can add more at any time while viewing.

### Viewing the grid

Images are arranged in a tile grid that fills the viewport edge-to-edge with no margins or gaps. Each image preserves its original aspect ratio — nothing is cropped. Rows are sized so the tallest (most portrait) image in each row fills its cell height, with the grid scaled to fit the viewport.

Images are sorted in natural filename order (e.g. `img2` before `img10`).

### Controls

Controls appear when you move your mouse and fade out after ~2 seconds of inactivity. They stay visible while you hover over them.

| Control | Location | Action |
|---------|----------|--------|
| **x** | Top-right | Clear all images and return to the drop zone |
| **+** | Top-left | Open file picker to add more images |
| **Column slider** | Bottom-center | Adjust the number of columns (1–10) |
| **Esc** | Keyboard | Same as **x** — clear all images |

### Column layout

When you first load images the column count is chosen automatically:

- 1 image → 1 column
- 2 or more images → `ceil(n / 2)` columns, capped at 10

You can override this at any time with the slider. The slider resets to auto when you clear all images.

### Adding more images

Drag and drop additional images onto the grid at any time, or click **+**. New images are merged into the existing set and the grid re-sorts by filename.

## Notes

- **All local** — images are never uploaded anywhere. The browser reads them directly from your filesystem.
- **No install** — a single HTML file with no external dependencies, no npm, no build step.
- **Desktop only** — designed for desktop browsers; not optimised for touch or mobile.
