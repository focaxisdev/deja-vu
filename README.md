# Deja Vu

**A familiarity-first memory engine for AI agents**

Deja Vu helps an agent decide whether something feels familiar before it loads old context. Instead of always retrieving full history, it stages memory access:

1. detect familiarity
2. unlock a summary only when the match is strong enough
3. open detailed chunks only when the interaction goes deeper

This keeps agent memory more selective, cheaper in tokens, and less noisy than always-on retrieval.

## Install

```bash
npm install @focaxisdev/deja-vu
```

If you want to try the repository locally before publishing:

```bash
npm install
npm run build
npm run example:basic
```

## Try It In 3 Minutes

```ts
import { createInMemorySemanticRecallEngine } from "@focaxisdev/deja-vu";

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
  summaryLoaded: Boolean(result.summaryIfLoaded),
  chunkCount: result.chunksIfLoaded?.length ?? 0,
});
```

Expected shape:

```ts
{
  matched: true,
  familiarityLevel: "strong",
  score: 0.8,
  summaryLoaded: true,
  chunkCount: 1
}
```

## When To Use It

Use Deja Vu when you want:

- long-term memory for AI agents without injecting full history every turn
- project-scoped recall that feels selective instead of eager
- an embeddable memory core you can wire into your own host runtime
- a staged alternative to brute-force RAG for persistent agent systems

Do not use Deja Vu as:

- a replacement for your source repository
- a hosted memory platform
- a production persistence layer by itself
- a reason to store every low-value conversational turn

## Why It Is Different

- Familiarity-first recall instead of always-on retrieval
- Three-layer memory model instead of one large context blob
- Threshold gating for summary and chunk loading
- Hybrid ranking with semantic similarity, recency, and importance
- Plugin-first architecture for embeddings, vector stores, storage, and scoring
- In-memory mode for zero-infrastructure local trials

## Architecture

```text
User Input
  |
Embedding
  |
Familiarity Index
  |
Threshold Gate
  |- weak match -> minimal summary only
  |- strong match -> full summary
  |
Scoped Chunk Retrieval
```

## Quick Mental Model

Traditional retrieval asks:

> Is this related enough to pull context?

Deja Vu asks:

> Does this feel familiar enough to unlock memory?

That distinction matters when you want agents to stay disciplined instead of over-retrieving.

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

`recall(query)` returns:

- `matched`
- `candidates`
- `topMatch`
- `score`
- `familiarityLevel`
- `summaryIfLoaded`
- `chunksIfLoaded`

## Threshold Gating

Default recall policy:

- `similarity >= 0.85`: strong match, load full summary
- `0.75 <= similarity < 0.85`: weak match, load minimal summary only
- `similarity < 0.75`: treat as a new topic, load nothing

## Memory Layers

### Layer 1: Familiarity Index

Fast retrieval metadata only:

- `id`
- `title`
- `short_summary`
- `tags`
- `last_accessed_at`
- `importance`
- `embedding_vector`

### Layer 2: Summary Layer

Agent-readable summary context:

- `description`
- `context`
- `architecture_or_intent`
- `recent_updates`
- `structured metadata`

### Layer 3: Memory Chunks

Detailed recall units:

- `chunk_id`
- `memory_id`
- `type`
- `content`
- `created_at`
- `updated_at`
- `importance`
- `embedding_vector`

Supported chunk types:

- `task`
- `decision`
- `note`
- `issue`
- `spec`
- `prompt`
- `conversation`
- `roadmap`

## Examples

- `npm run example:basic`
- `npm run example:agent-pm`
- `npm run example:chat-memory`
- `npm run example:task-assistant`

## Agent Integration

Deja Vu is a memory core, not a full memory operating system.

Recommended host loop:

1. Before each task or reply, call `recall()` with the current user intent or working query.
2. Inject only `summaryIfLoaded` into prompt context by default.
3. Load `chunksIfLoaded` only for strong matches and deeper follow-up work.
4. After the task completes, write back only durable, high-value memory with `addMemory()` or `updateMemory()`.
5. Keep memory project-local and avoid mixing scopes across repositories.

Recommended references:

- `docs/architecture.md`
- `docs/agent-handshake.md`
- `docs/project-rules-template.md`
- `docs/bootstrap-instructions.md`
- `src/types/plugins.ts`
- `src/types/memory.ts`

## Repo Structure

```text
deja-vu/
  src/
    core/
    layers/
    retrieval/
    scoring/
    memory/
    plugins/
    storage/
    types/
    utils/
  examples/
    basic/
    agent-pm/
    chat-memory/
    task-assistant/
  docs/
  tests/
  CHANGELOG.md
  README.md
  package.json
```

## Roadmap

- OpenAI and HuggingFace embedding adapters
- SQLite and JSON-file storage adapters
- chunk-specific reranking
- memory compaction and archival policies
- multi-agent shared familiarity space
- observability hooks and recall traces

## Development

```bash
npm install
npm run build
npm run test:src
```

The bundled mock embedding provider is intentionally optimized for stable local demos, not production-grade semantics. For real deployments, swap in persistent adapters and a real embedding model.
