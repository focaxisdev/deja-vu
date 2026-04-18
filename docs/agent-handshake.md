# Agent Handshake

This document is written for agents and host integrators.

Its purpose is to help an agent discover Deja Vu in a local repository, understand what it is, and build a safe integration strategy without assuming hidden infrastructure.

## What Deja Vu is

Deja Vu is a familiarity-first memory core for AI agents.

It is not:

- a full autonomous memory operating system
- a daemon
- a scheduler
- a universal installer
- a complete host runtime

It provides:

- a recall engine
- layered memory records
- threshold-gated loading
- plugin seams for embeddings, vector search, and storage

## What an agent should infer

When you discover this repository, infer the following:

1. Deja Vu expects the host agent to own the orchestration loop.
2. The host agent is responsible for deciding what becomes memory.
3. Long-term memory requires persistence adapters, not the default in-memory demo adapters.
4. Project memory and global memory should not be mixed into one undifferentiated namespace.

## Primary integration files

Read these files first:

1. `README.md`
2. `docs/architecture.md`
3. `src/types/plugins.ts`
4. `src/types/memory.ts`
5. `src/core/semantic-recall-engine.ts`

## Host responsibilities

The host agent should provide:

- an `EmbeddingProvider`
- a persistent `MemoryStorage`
- a persistent `FamiliarityVectorStore`
- a persistent `ChunkVectorStore`
- a namespace or scope policy
- a writeback policy
- an optional compaction or archival job

## Default handshake flow

Use this sequence unless the host has a stronger local convention.

### 1. Discover

- Confirm the repository path.
- Read the integration files.
- Identify whether the host already has embeddings, persistence, and vector search available.

### 2. Choose scope

Create or reuse at least these logical scopes:

- `project:<project-id>`
- `global:<user-or-machine>`

Query project scope first.
Query global scope only when reusable preferences, habits, or general workflows are relevant.

### 3. Pre-task recall

Before generating a reply, plan, or code change:

1. Build a recall query from the current task, user intent, and active repo context.
2. Call `recall()`.
3. Prefer `summaryIfLoaded` as the default prompt injection.
4. Only use `chunksIfLoaded` for strong matches or when detailed continuity is required.

### 4. Post-task writeback

After meaningful work completes, write back only durable memory.

Good writeback candidates:

- decisions
- architecture intent
- stable user preferences
- unresolved follow-up items
- milestone summaries
- task outcomes worth future reuse

Bad writeback candidates:

- every turn transcript
- temporary exploration noise
- repeated restatements
- broad logs with no likely future value

### 5. Compaction

If many related memories accumulate, compress them into a new summary memory and lower the retrieval priority of older fine-grained items.

Compaction is a host concern, not a built-in engine behavior.

## Persistence guidance

Do not rely on the in-memory adapters for long-term continuity.

Minimum durable deployment:

- `MemoryStorage` backed by SQLite, Postgres, JSON, or another persistent store
- vector search backed by a durable index or vector database
- embeddings from a real model rather than the mock provider

## Safety rules

- Do not silently mix unrelated projects in one shared namespace.
- Do not write back raw secrets, tokens, or sensitive credentials.
- Do not inject large chunk payloads into context by default.
- Do not treat weak familiarity as permission to dump full historical detail.

## Recommended host abstraction

If you are adding a host-side wrapper, prefer a small bridge interface such as:

```ts
interface AgentMemoryBridge {
  recallForPrompt(input: {
    scope: string;
    text: string;
    loadChunks?: boolean;
  }): Promise<{
    summaryContext: string | null;
    chunkContext: string[];
  }>;

  rememberFromTask(input: {
    scope: string;
    title: string;
    content: string;
    importance?: number;
    tags?: string[];
  }): Promise<{ id: string }>;
}
```

This wrapper belongs to the host environment. It does not need to be part of the Deja Vu core package.

## Expected outcome

If an agent reads this repository correctly, it should conclude:

- Deja Vu can be integrated as a memory core.
- The host must supply the orchestration layer.
- Long-term continuity depends on persistence, scope discipline, and selective writeback.
