# Changelog

All notable changes to this project will be documented in this file.

## [0.3.1] - 2026-04-23

- Added impression cue quality warnings to `deja-vu-lint-memory` for sparse, oversized, duplicate, generic, and repeated keyword sets.
- Updated the default summary generator to preserve decision, rationale, and trigger gist cues instead of only truncating source content.
- Updated the default chunker to preserve Markdown heading and paragraph boundaries before falling back to hard splitting.
- Added source tests for cue lint warnings, gist summaries, and boundary-aware chunking.
- Updated package metadata for the 0.3.1 patch release.

## [0.3.0] - 2026-04-22

- Repositioned Deja Vu as a cue-first memory protocol centered on `task cue -> familiarity score -> minimal recall -> durable writeback`.
- Reduced the minimum adoption surface to `memory/summary.md`, `memory/impressions.jsonl`, and project rules.
- Reclassified `memory/decisions/`, `memory/open-loops/`, `memory/events/`, `memory/context/`, and `memory/index.md` as recommended or optional artifacts.
- Added a default recall budget: scan always, summary at most one file, details one to three records, and no full memory-tree loads unless explicitly requested.
- Updated protocol, workflow, storage, bootstrap, scripted recall, template, example, and AI-readable docs around low-token cue-first recall.
- Updated package metadata to version 0.3.0.

## [0.2.2] - 2026-04-21

- Made engine impression scans token-only so query embeddings are deferred until chunk retrieval is needed.
- Added CLI `--memory-root` and `--file` options and aligned `matched` with weak/strong scan levels.
- Added `deja-vu-scan-memory` and `deja-vu-lint-memory` package binaries.
- Added memory linting for impression schema, duplicate ids, and linked record paths.
- Updated adoption docs, handshake, templates, and example project to make impression-first recall the default path.
- Updated protocol naming to v0.2 and clarified project-local plain text storage.

## [0.2.1] - 2026-04-21

- Added a protocol-level impression layer for compact keyword-first familiarity scans.
- Added scripted recall documentation and a default `scripts/dejavu-scan-memory.mjs` scanner.
- Added `memory/impressions.jsonl` and `memory/events/` templates for cheap long-term continuity.
- Updated workflow, protocol, storage, bootstrap, and AGENTS templates around impression-first recall.
- Extended the optional TypeScript engine with `impressionTokens` and `scanImpressions()`.
- Added tests for scanning impressions without loading deeper memory.

## [0.2.0] - 2026-04-20

- Repositioned Deja Vu as a protocol-first memory system for AI agents.
- Rewrote the root README around rules, workflow, and Markdown memory as the primary adoption path.
- Added the core protocol references:
  - `docs/protocol.md`
  - `docs/workflow.md`
  - `docs/storage-markdown.md`
- Added copyable project rules and memory templates under `docs/templates/`.
- Added `examples/protocol-project/` as a repo-first example that works without npm or the optional engine.
- Moved the semantic TypeScript engine into an explicitly optional documentation path under `docs/engine/`.
- Rewrote handshake, bootstrap, release, and AI-readable docs to match the new protocol-first framing.
- Updated package metadata to describe the npm package as an optional semantic recall layer.
- Fixed `npm run test:src` for the current Node.js v24 environment by switching to a compatible `ts-node` registration path.

## [0.1.0] - 2026-04-19

- Initial public release of Deja Vu.
- Added the familiarity-first semantic recall engine core.
- Added in-memory storage and vector adapters for zero-infrastructure local trials.
- Added runnable examples for basic recall, agent PM, chat memory, and task assistant flows.
- Added AI-readable integration docs, handshake guidance, and project rules templates.
