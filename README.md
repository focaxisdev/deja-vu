# Deja Vu

**Your AI doesn't need better memory**  
**It needs a sense of familiarity**

**A familiarity-first memory engine for AI agents.**

Deja Vu is a plugin-first memory module that helps agents decide whether something feels familiar before they load old context.

Instead of doing always-retrieve RAG, it uses a layered memory architecture:

- first detect semantic familiarity
- then gate summary access with thresholds
- only open detailed chunks when the interaction truly goes deeper

## Why this exists

Most AI memory systems are too eager to retrieve.

- They pull context just because it looks semantically related.
- They inject too much irrelevant history.
- They train agents into poor memory discipline.

That works for brute-force retrieval, but it is a bad model for how practical recall should feel.

Deja Vu treats memory as a staged process:

1. Something feels familiar.
2. A compact summary is unlocked.
3. Detailed memory is opened only if needed.

## What makes this different

- Familiarity-first recall instead of always-on retrieval
- Three-layer memory model instead of a single blob store
- Threshold-gated loading for summary and chunks
- Hybrid scoring with semantic similarity, recency decay, and importance
- Plugin-first architecture for embeddings, vector stores, storage, and scoring
- Runnable in-memory mode with no external DB

## Quick start

```bash
npm install
npm run example:basic
```

```ts
import { createInMemorySemanticRecallEngine } from "deja-vu";

const engine = createInMemorySemanticRecallEngine();

await engine.addMemory({
  title: "Agent launch memory",
  content: "Decision: use familiarity-first memory instead of always-retrieve RAG.",
});

const result = await engine.recall({
  text: "This looks like the launch plan for the familiarity-first memory system.",
  loadChunks: true,
});
```

## Example

An agent receives a new task:

> "Prepare launch messaging and contributor docs for the memory engine."

The engine does not immediately dump every old project note into context.

It first asks:

- Does this resemble an existing memory?
- Is the similarity strong enough to load a full summary?
- Is the conversation deep enough to justify chunk retrieval?

That means the agent gets memory discipline by default.

## Architecture

```text
User Input
  ↓
Embedding
  ↓
Familiarity Index
  ↓
Threshold Gate
  ├─ weak match  → minimal summary only
  ├─ strong match → full summary
  ↓
Scoped Chunk Retrieval
```

## Memory layers

### Layer 1: Familiarity Index

Fast retrieval metadata only:

- `id`
- `title`
- `short_summary`
- `tags`
- `last_accessed_at`
- `importance`
- `embedding_vector`

This layer is intentionally compact and ANN-friendly.

### Layer 2: Summary Layer

Agent-readable summary context:

- `description`
- `context`
- `architecture_or_intent`
- `recent_updates`
- `structured metadata`

This is not the full source content. It is the recall-friendly middle layer.

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

## Threshold gating

Default recall policy:

- `similarity >= 0.85`: strong match, load full summary
- `0.75 <= similarity < 0.85`: weak match, load minimal summary only
- `similarity < 0.75`: treat as a new topic, load nothing

## Hybrid scoring

Final ranking is not based on embedding similarity alone.

```text
score =
0.6 * semantic_similarity +
0.2 * recency_weight +
0.2 * importance_weight
```

Included by default:

- recency decay
- manual importance
- custom scoring strategy support

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

## Agent integration

Deja Vu is designed to be readable by agents, not just imported by humans.

If an agent is told that this repository exists on the machine, it should be able to:

1. Read this README and the type contracts.
2. Infer that Deja Vu is a memory core, not a full memory operating system.
3. Build a host-side handshake around recall, writeback, persistence, and scope isolation.

Recommended host integration loop:

1. Before each task or reply, call `recall()` with the current user intent or working query.
2. Inject only `summaryIfLoaded` into prompt context by default.
3. Load `chunksIfLoaded` only for strong matches and deeper follow-up work.
4. After the task completes, write back only durable, high-value memory with `addMemory()` or `updateMemory()`.
5. Periodically compact or archive older memories outside the core engine.

Deja Vu itself does not decide what to remember. The host agent should normally write back:

- durable decisions
- project architecture intent
- unresolved tasks or risks
- user preferences that affect future work
- milestone summaries

The host agent should usually avoid writing back:

- every conversational turn
- transient chatter
- duplicate summaries
- low-signal logs with no future recall value

## Scope and persistence

To support long-term memory, agents should replace the default in-memory adapters with persistent implementations.

Recommended minimum production shape:

- persistent `MemoryStorage`
- persistent `FamiliarityVectorStore`
- persistent `ChunkVectorStore`
- real `EmbeddingProvider`
- explicit memory namespace or scope policy

Recommended scope model:

- `project:<project-id>` for repo-specific memory
- `global:<user-or-machine>` for cross-project preferences and reusable habits

Agents should query project scope first, then optionally query global scope if the project scope does not fully explain the current task.

## Handshake contract

If an agent is self-integrating Deja Vu into a host environment, it should treat these files as the primary contract:

- `README.md`
- `docs/architecture.md`
- `docs/agent-handshake.md`
- `src/types/plugins.ts`
- `src/types/memory.ts`

The detailed handshake guidance for agents lives in `docs/agent-handshake.md`.

## Plugin-first design

Every major dependency can be swapped out.

- Embedding Provider
- Vector Store
- Storage Layer
- Scoring Strategy

Examples the current structure is ready for:

- OpenAI embeddings
- local embedding models
- HuggingFace adapters
- FAISS
- SQLite extension search
- external vector DBs
- JSON file storage
- cloud document stores

## Why not RAG

**RAG**: retrieve because relevant  
**SRE**: recall because familiar

RAG is useful when you want broad retrieval.

Deja Vu is useful when you want disciplined memory access.

That distinction matters for:

- long-running agents
- chat assistants
- project memory
- task systems
- coding copilots

## Use cases

- agent pm
- chat memory
- task assistant
- research assistant
- coding assistant

## Examples

- `npm run example:basic`
- `npm run example:agent-pm`
- `npm run example:chat-memory`
- `npm run example:task-assistant`

## Repo structure

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
  README.md
  package.json
  tsconfig.json
  .gitignore
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

This repo ships with an in-memory MVP so you can run it without infrastructure.

For the zero-dependency demo, the bundled mock embedding provider favors stable local testing over deep semantic generalization. Production adapters should replace it with a real embedding model.

The runnable examples use slightly relaxed thresholds so the familiarity flow is visible even with the mock provider. The core engine defaults remain `0.85` and `0.75`.
