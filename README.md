# World Coin Cabinet

A personal numismatic collection — 743 coins from 94 countries and 8 historical/regional
currency issues — browsable by flag. Pick a country, and the drawer opens: every coin
photographed front and back, background removed, with denomination, year and a short
write-up on what's distinctive about that country's coinage.

Static site, no build step. `index.html` + `assets/app.js` render everything client-side
from `data/coins.json`.

## Structure

```
index.html            entry point
assets/style.css       design system
assets/app.js          routing + rendering (hash-based: #/ and #/e/{slug})
assets/coins/          processed coin images (WebP, transparent background)
data/coins.json        generated — one entry per country/historical issue
data/speciality.json   hand-written per-entity write-ups, merged into coins.json at build time
scripts/entities.js    country-name -> ISO2 flag code / historical-entity mapping
scripts/build-data.js  reads the source spreadsheet, builds data/coins.json
scripts/process-images.js  background removal + resize + WebP encoding
```

## Regenerating the data

The source spreadsheet and raw photos live outside this repo (`../../Numesta/`).
To rebuild from scratch:

```bash
npm install
npm run process-images   # trims, removes background, writes assets/coins/*.webp
npm run build-data       # reads the spreadsheet, writes data/coins.json
npm run serve            # http://localhost:4321
```

### How the background removal works

Most coins are round, and `sharp`'s `trim()` crops tightly to the coin's silhouette —
so the trimmed bounding box's diameter *is* the coin. A centered circular alpha mask
handles the overwhelming majority of images cleanly, sidestepping the real difficulty
with color-based cutout: bright silver/nickel coins often have almost no contrast
against white paper, which trips up brightness-threshold or flood-fill approaches.
Non-round coins (a minority — diamond and scalloped issues, mostly) fall back to a
tolerance-chained flood fill from the image border, with a safety check that retries
at stricter tolerances if it ever detects "background" leaking into the center of the
frame, rather than risk eating into the coin face.

## Attribution & licensing note

Coin photographs originate from [Numista](https://en.numista.com), a collaborative
numismatic catalogue, and are processed (background removed, resized) for personal,
non-commercial cataloguing use. Each coin card links back to its Numista catalogue
page. Flag images are served from [flagcdn.com](https://flagcdn.com).
