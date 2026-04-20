# Changelog

All notable changes to this project will be documented in this file.

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
