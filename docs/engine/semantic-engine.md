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
