# Optional Engine Layer

The TypeScript package in this repository is an optional semantic recall layer for Deja Vu.

It is useful when a host wants:

- familiarity scoring
- threshold-gated summary loading
- chunk retrieval for deeper follow-up work
- pluggable embeddings and vector search

It is not required for base Deja Vu adoption.

## What the engine does

The engine provides:

- `SemanticRecallEngine`
- layered memory records
- threshold gating
- scoring and ranking
- in-memory demo adapters
- gist-first default summaries
- Markdown and paragraph boundary-aware default chunking

## What it does not do

The engine does not replace:

- project rules
- memory workflow
- Markdown memory conventions
- writeback judgment
- compaction policy

Those remain part of the Deja Vu protocol.

## Public API

```ts
const engine = new SemanticRecallEngine(config);

await engine.addMemory(input);
await engine.recall(query);
await engine.getSummary(id);
await engine.getChunks(id);
await engine.updateMemory(id, input);
await engine.deleteMemory(id);
```

## Write failure contract

Adds and updates prepare summaries, chunks, and all embeddings before changing
storage. Updates retain importance, tags, and creation time unless explicitly
changed where supported. Adding an existing ID is rejected; use `updateMemory`.
Mutations are serialized within one engine instance.

If a storage or vector write fails, the engine attempts compensating cleanup
and restoration. `MemoryWriteError.memoryId` identifies the affected memory,
including auto-generated IDs on failed adds. `recoveryErrors` is empty when compensation
succeeds. Otherwise, repair the adapter using `recoverySnapshot`; it may contain
private raw content and must not be logged or included in telemetry.

This is **not a durable transaction**. Process termination, persistent adapter
outages, concurrent readers, multiple engine instances, and direct adapter
writes are not isolated by this queue. Deletion is serialized but does not
provide compensating rollback. Production hosts must supply transactional
persistence/coordination where those guarantees are required.

Storage adapters may implement optional `getMemorySnapshot(id)` to return a
complete detached snapshot, including raw creation/update timestamps. The
legacy getter fallback reconstructs those timestamps from chunk or access
metadata and cannot guarantee their exact preservation. The built-in in-memory
adapter implements complete snapshots; it is still not persistent storage.

## Optional npm install

```bash
npm install @focaxisdev/deja-vu
```

## Minimum host responsibilities

If you adopt the engine, the host still owns:

- project scope discipline
- pre-task recall policy
- post-task writeback policy
- persistent adapters for long-term continuity

## Related references

- [docs/agent-handshake.md](../agent-handshake.md)
- [docs/engine/protocol-to-engine.md](./protocol-to-engine.md)
- [src/types/plugins.ts](../../src/types/plugins.ts)
- [src/types/memory.ts](../../src/types/memory.ts)
