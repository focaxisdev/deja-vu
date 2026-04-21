# Deja Vu v0.2.1

Deja Vu v0.2.1 adds scripted impression-first recall.

This release keeps the v0.2.0 product layering:

1. protocol layer
2. optional semantic engine layer

It also makes the memory stack explicit again:

1. impression or familiarity index
2. summary layer
3. detailed records or chunks

## Highlights

- Added `docs/impression-layer.md`.
- Added `docs/scripted-recall.md`.
- Added `scripts/dejavu-scan-memory.mjs`.
- Added `memory/impressions.jsonl` and `memory/events/` templates.
- Updated protocol workflow so hosts scan the impression index before loading summaries or detailed records.
- Added `scanImpressions()` to the optional TypeScript engine.

## Goal

Use the smallest possible memory surface to detect familiarity, then spend context only when the scan justifies deeper recall.

## Validation

- `npm run build`
- `npm run test:src`
- `npm test`
