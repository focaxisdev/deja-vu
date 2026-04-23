# Deja Vu v0.3.1

Deja Vu v0.3.1 is a recall-quality patch for the cue-first protocol release.

## Highlights

- `deja-vu-lint-memory` now warns when impression cues are too sparse, too large, duplicated, too generic, or repeated across records.
- Default engine summaries now preserve gist cues as decision, rationale, and trigger fields when those labels are available.
- Default engine chunking now respects Markdown headings and paragraph boundaries before using hard character splits.
- The patch keeps the v0.3 protocol surface unchanged while making low-token recall routes cleaner and less noisy.

## Validation

- `npm run test:src`
- `npm run lint:memory`
