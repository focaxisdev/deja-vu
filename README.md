# Deja Vu

**Persistent project memory for AI coding agents, stored in your repo as Markdown and JSONL.**

Deja Vu helps Codex, Claude Code, Cursor, Windsurf, and other coding agents remember project decisions, architecture context, open loops, and team preferences across new chats.

It does not require a database, vector store, embedding model, hosted memory service, or npm package.

```text
problem: every new agent session forgets why the project works the way it does
result:  the agent scans tiny repo-local cues, recalls only relevant memory, and writes back durable context
```

Start with three files:

- `AGENTS.md`
- `memory/summary.md`
- `memory/impressions.jsonl`

Use Deja Vu if your team keeps repeating:

- "We already decided this."
- "The agent forgot the architecture again."
- "Do not load the whole repo history into context."
- "We want memory in git, not in a vendor service."

Most agent memory tools start by storing more text. Deja Vu starts by asking a cheaper question: does this task feel familiar enough to justify loading memory at all?

The core loop is intentionally small:

```text
task cue -> familiarity score -> minimal recall -> durable writeback
```

It is packaged as three project-local assets:

- rules
- workflow
- tiny memory files

No server. No hidden state. No required npm package. The base protocol works with Markdown and JSONL files that live beside the code.

If you found this on npm: the package is only the optional TypeScript engine and CLI tooling. The main product is the repo-local memory protocol you can copy into any project.

Use Deja Vu when you want:

- project memory that survives a new chat or agent session
- low-token recall before planning, coding, or answering
- observable recall budget and recall outcome feedback
- durable decisions, preferences, open loops, and architecture intent in plain files
- an optional TypeScript semantic engine only when the project outgrows the file-first protocol

## What Deja Vu Is

Deja Vu defines a shared memory behavior for agents working inside one project.

It answers:

- what should count as durable memory
- when an agent should recall existing memory
- how memory should be stored in ordinary project files
- when memory should be updated, compacted, or retired

The minimum viable setup uses two project-local plain text files, with one optional feedback ledger when recall results should change future behavior:

- `memory/summary.md`
- `memory/impressions.jsonl`

- `memory/recall-feedback.jsonl`

No npm package, embeddings, vector search, or database is required.

## Start Here

If you want to adopt Deja Vu in a project without extra infrastructure:

1. Read [docs/protocol.md](./docs/protocol.md).
2. Read [docs/workflow.md](./docs/workflow.md).
3. Read [docs/impression-layer.md](./docs/impression-layer.md).
4. Read [docs/scripted-recall.md](./docs/scripted-recall.md).
5. Copy the minimum templates from [docs/templates](./docs/templates).
6. Add optional decision, open-loop, event, and context records only when the project needs them.

Recommended first files:

- [docs/templates/AGENTS.template.md](./docs/templates/AGENTS.template.md)
- [docs/templates/memory/summary.md](./docs/templates/memory/summary.md)
- [docs/templates/memory/impressions.jsonl](./docs/templates/memory/impressions.jsonl)
- [docs/templates/memory/decisions/decision-template.md](./docs/templates/memory/decisions/decision-template.md)
- [docs/templates/memory/open-loops/open-loop-template.md](./docs/templates/memory/open-loops/open-loop-template.md)

## The Protocol in One Page

Deja Vu follows a cue-first lifecycle:

1. Scan a tiny impression index before substantial planning, coding, or answering.
2. Load no memory when the scan finds no familiarity.
3. Load the project summary when the scan finds weak familiarity.
4. Load one to three detailed records only when the scan finds strong familiarity or the task requires depth.
5. Write back only durable outcomes that should change a future agent's behavior.
6. Record whether recall was helpful, irrelevant, missed, or overloaded when that feedback should tune future memory.

7. Compact or supersede memories when detail becomes repetitive or stale.

This keeps memory project-local, readable, and easy to maintain across new conversations.

## Canonical Project Layout

```text
memory/
  summary.md
  impressions.jsonl
  recall-feedback.jsonl
  decisions/
  open-loops/
  events/
  context/
  index.md
```

The canonical layout and field rules are specified in [docs/storage-markdown.md](./docs/storage-markdown.md).

## Core Rules

- Use a single-project scope only in MVP: `project:<project-id>`.
- Recall before substantial work, but follow a strict recall budget.
- Prefer scripted impression scans first; open summary or detailed records only when needed.
- Keep impression cues sparse, specific, and linted so the first recall step stays cheap.
- Write back only durable memory:
  - decisions
  - architecture intent
  - stable preferences
  - unresolved follow-up items
  - milestone summaries
- Default recall budget:
  - impression scan: always allowed
  - summary: at most one file
  - detail: one to three records
  - full memory tree: forbidden unless explicitly requested
- Never store:
  - raw secrets or credentials
  - full turn-by-turn transcripts
  - low-signal chatter
  - disposable exploration noise

## Why This Exists

Most agent memory systems fail in one of two ways:

- they remember too little because nothing is written down in a reusable shape
- they remember too much because every conversation turn is treated like durable knowledge

Deja Vu stays closer to first principles:

- memory should be explicit
- memory should be scoped
- memory should be cheap to inspect
- memory should be easy to revise
- memory behavior should survive a new conversation window

## Optional Engine Layer

This repository still includes the existing TypeScript semantic recall engine.

Use it when you want:

- stronger familiarity scoring
- threshold-gated summary and chunk loading
- embedding and vector ranking
- an engine-backed implementation of the Deja Vu protocol

Do not treat the engine as the product center. It is an optional acceleration layer.

Start here if you want that path:

- [docs/engine/semantic-engine.md](./docs/engine/semantic-engine.md)
- [docs/engine/protocol-to-engine.md](./docs/engine/protocol-to-engine.md)
- [docs/agent-handshake.md](./docs/agent-handshake.md)

## Optional npm Install

```bash
npm install @focaxisdev/deja-vu
```

The npm package provides the optional TypeScript engine. It is not required for base protocol adoption.

## Engine API

```ts
const engine = new SemanticRecallEngine(config);

await engine.addMemory(input);
await engine.scanImpressions(query);
await engine.recall(query);
await engine.getSummary(id);
await engine.getChunks(id);
await engine.updateMemory(id, input);
await engine.deleteMemory(id);
```

The public TypeScript exports remain intact for hosts that want semantic recall.

`scanImpressions()` performs token-only familiarity scanning and does not load summaries or chunks.

The default engine helpers preserve low-token recall quality by generating decision/rationale/trigger summaries and by chunking Markdown or paragraph boundaries before falling back to character splits.

## Examples

- Protocol-first example: [examples/protocol-project](./examples/protocol-project)
- Engine example: `npm run example:basic`
- Engine example: `npm run example:agent-pm`
- Engine example: `npm run example:chat-memory`
- Engine example: `npm run example:task-assistant`

## Repo Structure

```text
deja-vu/
  docs/
    protocol.md
    workflow.md
    storage-markdown.md
    templates/
    engine/
  examples/
    protocol-project/
    basic/
    agent-pm/
    chat-memory/
    task-assistant/
  src/
  tests/
```

## Development

```bash
npm install
npm run build
npm run test:src
npm run lint:memory
```

## References

- [docs/protocol.md](./docs/protocol.md)
- [docs/workflow.md](./docs/workflow.md)
- [docs/storage-markdown.md](./docs/storage-markdown.md)
- [docs/impression-layer.md](./docs/impression-layer.md)
- [docs/scripted-recall.md](./docs/scripted-recall.md)
- [docs/bootstrap-instructions.md](./docs/bootstrap-instructions.md)
- [docs/project-rules-template.md](./docs/project-rules-template.md)
- [docs/release-v0.3.1.md](./docs/release-v0.3.1.md)
- [docs/release-v0.4.0.md](./docs/release-v0.4.0.md)
- [llms.txt](./llms.txt)
