# Deja Vu v0.1.0

Deja Vu is a familiarity-first memory engine for AI agents.

This first public release is aimed at developers who want to try a staged memory model instead of always-on retrieval:

- familiarity detection before context loading
- threshold-gated summary access
- chunk retrieval only when the match is strong enough
- plugin-first architecture for embeddings, storage, and scoring
- in-memory adapters for quick local evaluation

## Install

```bash
npm install deja-vu
```

## Try It In 3 Minutes

```ts
import { createInMemorySemanticRecallEngine } from "deja-vu";

const engine = createInMemorySemanticRecallEngine();

await engine.addMemory({
  title: "Launch strategy",
  content: "Use familiarity-first recall before loading long project history.",
  tags: ["launch", "memory"],
});

const result = await engine.recall({
  text: "This sounds like the launch plan for the memory engine.",
  loadChunks: true,
});

console.log({
  matched: result.matched,
  familiarityLevel: result.familiarityLevel,
  score: result.score,
});
```

## Included In v0.1.0

- `SemanticRecallEngine` public API
- hybrid scoring with semantic, recency, and importance signals
- summary and chunk gating thresholds
- in-memory storage and vector stores
- mock embedding provider for deterministic local demos
- examples and integration documentation

## Current Scope

Deja Vu is a memory core, not a full hosted memory platform. This release is best suited for:

- coding agents
- project memory
- long-running task assistants
- host runtimes that want an embeddable memory module

## Current Limitations

- the default adapters are in-memory only
- production use still needs persistent storage and a real embedding provider
- the bundled mock embedding provider is for demos, not semantic accuracy at scale

## Links

- Repo: https://github.com/focaxisdev/deja-vu
- Docs: https://github.com/focaxisdev/deja-vu/tree/main/docs
- Changelog: https://github.com/focaxisdev/deja-vu/blob/main/CHANGELOG.md

