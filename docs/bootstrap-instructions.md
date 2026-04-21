# Bootstrap Instructions

This document tells an agent how to bootstrap Deja Vu into a project using the protocol-first path.

## Goal

Give a project durable memory continuity using only:

- project rules
- a Markdown memory directory
- the Deja Vu workflow

## Trigger conditions

Bootstrap when at least one of these is true:

- the user asks for project memory across new conversations
- the user asks to integrate Deja Vu
- the project rules already reference Deja Vu

## Bootstrap checklist

### 1. Confirm the project path

- confirm the active project path
- choose a stable `project:<project-id>` scope

### 2. Read the protocol files

Read:

1. `README.md`
2. `docs/protocol.md`
3. `docs/workflow.md`
4. `docs/storage-markdown.md`
5. `docs/impression-layer.md`
6. `docs/scripted-recall.md`
7. `docs/templates/AGENTS.template.md`

### 3. Check whether memory already exists

Look for:

- `AGENTS.md` or equivalent rules
- a `memory/` directory
- existing decision or summary files

Reuse and align existing structures when possible instead of creating a competing memory tree.

### 4. Install the minimum protocol artifacts

Create or update:

- `AGENTS.md`
- `memory/index.md`
- `memory/summary.md`
- `memory/impressions.jsonl`
- `memory/events/`
- `memory/context/project-context.md`
- `memory/decisions/`
- `memory/open-loops/`
- `scripts/dejavu-scan-memory.mjs`

### 5. Apply the workflow

Ensure future work follows:

1. pre-task recall through the impression scan script
2. minimal summary and detailed reads based on scan strength
3. selective post-task writeback plus a cheap event trace
4. compaction when records become repetitive or stale

After bootstrap, run:

```bash
node scripts/dejavu-lint-memory.mjs
```

### 6. Optional engine adoption

Only if the host needs semantic recall at higher scale:

1. read `docs/engine/semantic-engine.md`
2. keep Markdown memory as canonical
3. add the engine as an enhancement layer

## Expected result

After bootstrap, a new conversation in the same project should be able to regain continuity by discovering the rules file and reading the project memory directory.
