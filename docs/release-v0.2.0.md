# Deja Vu v0.2.0

Deja Vu v0.2.0 is the protocol-first reboot release.

This release changes the product center from an engine-first TypeScript package to a project memory protocol built on:

- rules
- workflow
- Markdown memory

## Highlights

- Added the Deja Vu protocol spec in `docs/protocol.md`.
- Added the workflow spec in `docs/workflow.md`.
- Added the canonical Markdown storage contract in `docs/storage-markdown.md`.
- Added copyable rules and memory templates in `docs/templates/`.
- Added `examples/protocol-project/` as the repo-first adoption example.
- Reframed the npm package as an optional semantic recall engine layer.
- Kept the existing TypeScript engine API intact.
- Updated the source-test script for compatibility with the current Node.js v24 environment.

## Recommended adoption path

Start with:

- `README.md`
- `docs/protocol.md`
- `docs/workflow.md`
- `docs/storage-markdown.md`
- `docs/templates/`

Use the npm package only if the host later needs semantic recall and threshold-gated loading.

## Validation

- `npm run build`
- `npm run test:src`
- `npm test`
