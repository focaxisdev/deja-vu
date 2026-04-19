# Deja Vu

**Your AI doesn't need better memory**  
**It needs a sense of familiarity**

**A familiarity-first memory engine for AI agents.**

Keywords: `AI memory`, `agent memory`, `long-term memory`, `semantic recall`, `RAG alternative`, `TypeScript memory engine`.

Deja Vu is a plugin-first memory module that helps agents decide whether something feels familiar before they load old context.

It is designed for:

- AI agents that need long-term memory without stuffing full history into every prompt
- single-project memory systems with persistent recall
- host runtimes that want an embeddable memory core instead of an always-on retrieval stack

If you are evaluating this repository quickly, the core idea is simple:

> Deja Vu helps an agent decide whether something is familiar before loading old context, so memory stays compact, selective, and cheaper in tokens.

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

## Memory granularity policy

Deja Vu is designed to remember project context, not to mirror every file in the repository.

Use this rule of thumb:

- the repository is the source of truth for detailed implementation facts
- Deja Vu is the source of truth for cross-conversation context

Good memory granularity:

- project goals
- architecture intent
- module responsibilities
- major design decisions
- active task lines
- milestone summaries
- unresolved risks or blockers
- stable user preferences

Bad memory granularity:

- full file contents
- line-by-line code edits
- every small refactor detail
- routine terminal output
- low-value conversational turns
- facts that can be cheaply re-read from the repository

For large projects with many layers or many parallel tasks, prefer one memory per durable thread of work, such as:

- one subsystem
- one decision stream
- one roadmap branch
- one risk cluster
- one milestone

Do not create one memory per small file unless that file represents a durable project concept that will matter again later.

## If you are an agent

If a user tells you this repository exists and asks you to use it for one project, your next step should be to bootstrap a project-local memory integration.

Use this default plan unless the host project already has a stronger memory convention:

1. Confirm the active project path and the Deja Vu repository path.
2. Read `README.md`, `docs/agent-handshake.md`, `src/types/plugins.ts`, and `src/types/memory.ts`.
3. Treat Deja Vu as a memory core, not a full memory operating system.
4. Create or reuse a single-project scope in the form `project:<project-id>`.
5. Keep all memory data inside the target project directory.
6. Add or update persistent project rules so future conversations can rediscover the same memory setup.
7. Use pre-task `recall()` and post-task selective writeback as the default workflow.

For single-project isolation, prefer a layout like:

```text
<project-root>/
  AGENTS.md
  .memory/
    deja-vu/
      storage/
      vectors/
      snapshots/
```

The memory system for one project should not read from or write to another project's memory directory.

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

For the current maturity level of this repository, the recommended deployment target is:

- one project
- one project-local memory directory
- one project scope
- one set of persistent rules for future conversations

## Keeping memory across new conversations

If you want Deja Vu to keep working when you open a new conversation for the same repository, do not rely on the current chat transcript alone.

Instead, put the Deja Vu integration rules into the target project's persistent project rules, such as `AGENTS.md` or an equivalent host rules file.

Recommended references:

- `docs/agent-handshake.md`
- `docs/project-rules-template.md`
- `docs/bootstrap-instructions.md`

The project rules should tell future agents:

- where the Deja Vu repository lives
- which project scope id to use
- when to run recall
- when to write back memory
- what kinds of memory are safe and useful to store

At minimum, future agents should be able to infer these project rules from the repository or host setup:

- use only project-local memory storage
- do not mix memory with other repositories
- inject summary-level memory by default
- load chunks only when the match is strong or the task is deep
- write back only durable, reusable memory

If the host project has no persistent rules file yet, create one before claiming the memory integration is complete.

## Handshake contract

If an agent is self-integrating Deja Vu into a host environment, it should treat these files as the primary contract:

- `README.md`
- `docs/architecture.md`
- `docs/agent-handshake.md`
- `src/types/plugins.ts`
- `src/types/memory.ts`

The detailed handshake guidance for agents lives in `docs/agent-handshake.md`.

## AI-readable repo files

These files are intentionally useful for AI agents, repository summarizers, and human evaluators:

- `README.md`
- `llms.txt`
- `docs/architecture.md`
- `docs/agent-handshake.md`
- `docs/project-rules-template.md`
- `docs/bootstrap-instructions.md`
- `src/types/plugins.ts`
- `src/types/memory.ts`

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
