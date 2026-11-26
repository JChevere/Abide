# Abide art library

All painted artwork lives here, one folder per collection.

- `registry.js` — generated list of every drawing (do not edit by hand). The app reads it through `abArt('category/name', {size, alt, cls, eager, sizes, fit})`, which returns an `<img>` tag or `''` when a drawing is missing, so callers can keep a fallback: `abArt('objects/scroll',{size:48}) || oldIcon`.
- `<collection>/collection.json` — collection title, size rules per category, the size saved for offline use, and English/Spanish alt text and tags per drawing.
- `<collection>/masters/<category>/<name>.png` — transparent PNG masters. `masters/source/` keeps the original sheets; `masters/alternates/` keeps duplicate versions that are not used in the app.
- `<collection>/<category>/<name>-<width>.webp` — web sizes.

## Adding a collection
1. Create `assets/art/<new-id>/masters/<category>/<name>.png`.
2. Write `assets/art/<new-id>/collection.json` (copy `biblical-v1/collection.json` as a template).
3. Run `python3 tools/build_art.py`. It builds the WebP sizes and rewrites `registry.js`. The offline worker saves each drawing's offline size automatically.

## Scope of biblical-v1
Vintage hand-painted biblical art, used in the Bible section only (Bible home, Encyclopedia, Hymns, Reading Plans, Study guide, Bible notes, Bible Panorama). The core Abide app keeps its own art.
