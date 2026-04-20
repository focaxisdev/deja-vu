# Protocol-to-Engine Mapping

This document explains how the optional TypeScript engine maps onto the protocol-first Deja Vu workflow.

## Stable rule

The protocol stays the same whether or not the engine is present.

## Mapping

### Protocol recall

Protocol behavior:

- read summary memory first
- load only the minimum detailed records needed

Engine-assisted behavior:

- call `recall()`
- use `summaryIfLoaded` as the first prompt injection
- load `chunksIfLoaded` only for strong matches or deeper follow-up work

### Protocol writeback

Protocol behavior:

- decide whether new information is durable
- update the canonical memory files

Engine-assisted behavior:

- mirror durable records into engine storage with `addMemory()` or `updateMemory()`
- keep Markdown records as the authoritative human-readable source

### Protocol compaction

Protocol behavior:

- write new summaries or decisions
- mark older records as superseded

Engine-assisted behavior:

- lower retrieval priority or delete obsolete engine-backed detail records if the host chooses
- keep compaction policy in the host workflow, not inside the engine core

## Migration path

1. Start with Markdown-only Deja Vu.
2. Stabilize the project rules and memory layout.
3. Add the optional engine when recall volume or memory depth justifies it.
4. Preserve the same workflow and canonical Markdown records.

## Important boundary

The engine accelerates Deja Vu. It does not redefine Deja Vu.
