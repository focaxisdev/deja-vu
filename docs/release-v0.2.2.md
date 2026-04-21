# Deja Vu v0.2.2

Deja Vu v0.2.2 is an alignment release for scripted impression-first recall.

## Highlights

- Engine `scanImpressions()` now performs token-only familiarity scanning.
- Query embeddings are deferred until strong recall needs chunk retrieval.
- The scanner CLI now supports `--memory-root` and `--file`.
- Scanner output now reports `matched` only for weak or strong matches.
- Added `deja-vu-lint-memory` for impression index validation.
- Adoption docs, handshake guidance, and the example project now treat impression-first recall as the default path.
- Protocol naming is updated to v0.2.

## Validation

- `npm test`
- `node ../../scripts/dejavu-scan-memory.mjs "protocol impression memory"` from `examples/protocol-project`
- `node ../../scripts/dejavu-lint-memory.mjs` from `examples/protocol-project`
