# World of Coins

A personal numismatic collection — 743 coins from 94 countries and 8 historical/regional
currency issues — browsable by flag. Pick a country, and the drawer opens: every coin
photographed front and back, background removed, with denomination, year and a short
write-up on what's distinctive about that country's coinage.

Static site, no build step. `index.html` + `assets/app.js` render everything client-side
from `data/coins.json`.

## Hierarchy

Coins are organised **Country → Issuer → Ruling authority**, because a country
is often not the thing that actually struck the coin. India alone covers eight
issuers — the Chola dynasty, British India, five princely states and the
Republic. The United Kingdom and Gibraltar are separate issuers; Gibraltar is a
British Overseas Territory with its own pound, not a Royal Mint issue.

A country with more than one issuer shows its issuers rather than a flat pile of
coins. A country with one issuer goes straight to the coins.

Within a tray, coins default to **denomination order** — the way a collector
lays a run out, smallest to largest — grouped by the ruler who issued them.
Denominations are shown exactly as struck (¼ Anna, 1 Pice, 1 Rupee); the
normalised value from the export is used only as a hidden sort key.

## Structure

```
index.html            entry point
assets/style.css       design system
assets/app.js          routing + rendering, guilloché generator
assets/coins/          processed coin images (WebP, transparent background)
data/collection.json   generated — the full Country > Issuer > Authority tree
data/speciality.json   hand-written per-country write-ups, merged in at build time
data/annotations.json  specimen-level corrections keyed by N# (restrikes, replicas)
scripts/registry.js    country/issuer -> ISO2 flag, badge, era and context
scripts/build-data.js  reads the Numista CSV export, builds data/collection.json
scripts/process-images.js  background removal + resize + WebP encoding
```

## Regenerating the data

The Numista CSV export and raw photos live outside this repo. To rebuild:

```bash
npm install
npm run process-images   # trims, removes background, writes assets/coins/*.webp
npm run build-data       # reads the CSV export, writes data/collection.json
npm run serve            # http://localhost:4321
```

`build-data` reads the CSV path from `$COINS_CSV`, defaulting to the export in
`~/Downloads`. The export has duplicate column names (`Grade`, `Weight` and
`Size` each appear twice — once for the coin, once for third-party slab
grading), so it is parsed positionally rather than by header name.

Coins whose photo hasn't been captured yet render a shape outline and "Photo to
come" rather than being hidden, so the tray stays complete.

## Checking the prose

Everything on the site is derived from the export except `data/speciality.json`,
the hand-written country write-ups — which makes that file the one place a claim
can be wrong on its own. `npm run check-prose` (also run by `build-data`)
cross-checks it against the generated data and fails on:

- a material named in prose that no coin in that country is recorded as
  (this caught a write-up calling a copper Chola massa "gold")
- a hardcoded coin count that no longer matches the collection
- a write-up keyed to a country slug that doesn't exist

It knows that mints name their alloys, so explaining that Italy's *bronzital* is
an aluminium bronze is not treated as a contradiction.

## When the specimen isn't the type

Numista describes a coin *type*. The piece actually in a collection is
sometimes not that type — a restrike, a replica, a different alloy. Presenting
the catalogue's figures for those would be a straightforward falsehood: the
Prussia 5 Mark here is a restrike and is not the .900 silver the catalogue
records.

`data/annotations.json` records those differences, keyed by N#. A coin marked
`restrike` or `replica` gets a visible mark on its card, and its remaining
catalogue figures are labelled as describing the original type rather than the
piece in hand. `compositionUnknown` suppresses the composition outright rather
than asserting a figure that doesn't apply.

## Design

The hero carries a **guilloché rosette** — the engine-turned figure a rose lathe
cuts into a coin die, the ornamental language of minting and security printing
since the 18th century. It is drawn live from a hypotrochoid, the same curve the
lathe traces mechanically. The header sits on a **reeded edge**, the fine
milling cut into a coin's rim to make clipping detectable.

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
