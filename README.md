# Deja Vu

**A protocol-first memory system for AI agents**

Deja Vu is a lightweight memory protocol built around three things:

- rules
- workflow
- project-local memory files

The goal is not to give every agent a heavy runtime. The goal is to give any agent a repeatable discipline for remembering the right things, reloading only what matters, and keeping memory useful as a project grows.

## What Deja Vu Is

Deja Vu defines a shared memory behavior for agents working inside one project.

It answers:

- what should count as durable memory
- when an agent should recall existing memory
- how memory should be stored in ordinary project files
- when memory should be updated, compacted, or retired

The minimum viable setup uses project-local plain text files. No npm package, embeddings, vector search, or database is required.

## Start Here

If you want to adopt Deja Vu in a project without extra infrastructure:

1. Read [docs/protocol.md](./docs/protocol.md).
2. Read [docs/workflow.md](./docs/workflow.md).
3. Read [docs/impression-layer.md](./docs/impression-layer.md).
4. Read [docs/scripted-recall.md](./docs/scripted-recall.md).
5. Copy the templates from [docs/templates](./docs/templates).
6. Add the generated rules and memory files to your project.

Recommended first files:

- [docs/templates/AGENTS.template.md](./docs/templates/AGENTS.template.md)
- [docs/templates/memory/index.md](./docs/templates/memory/index.md)
- [docs/templates/memory/summary.md](./docs/templates/memory/summary.md)
- [docs/templates/memory/impressions.jsonl](./docs/templates/memory/impressions.jsonl)
- [docs/templates/memory/events/YYYY-MM.md](./docs/templates/memory/events/YYYY-MM.md)
- [docs/templates/memory/decisions/decision-template.md](./docs/templates/memory/decisions/decision-template.md)
- [docs/templates/memory/open-loops/open-loop-template.md](./docs/templates/memory/open-loops/open-loop-template.md)

## The Protocol in One Page

Deja Vu follows a simple lifecycle:

1. Scan a tiny impression index before substantial planning, coding, or answering.
2. Load summaries only when the scan finds weak familiarity.
3. Load detailed records only when the scan finds strong familiarity or the task requires depth.
4. Write back durable outcomes and a cheap event trace.
5. Compact or supersede memories when detail becomes repetitive or stale.

This keeps memory project-local, readable, and easy to maintain across new conversations.

## Canonical Project Layout

```text
memory/
  index.md
  summary.md
  impressions.jsonl
  events/
  context/
    project-context.md
  decisions/
    decision-template.md
  open-loops/
    open-loop-template.md
```

The canonical layout and field rules are specified in [docs/storage-markdown.md](./docs/storage-markdown.md).

## Core Rules

- Use a single-project scope only in MVP: `project:<project-id>`.
- Recall before substantial work.
- Prefer scripted impression scans first; open summary or detailed records only when needed.
- Write back only durable memory:
  - decisions
  - architecture intent
  - stable preferences
  - unresolved follow-up items
  - milestone summaries
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
- [llms.txt](./llms.txt)
