# Bootstrap Instructions

This document tells an agent how to bootstrap Deja Vu into a project using the protocol-first path.

## Goal

Give a project durable memory continuity using only:

- project rules
- minimum Markdown and JSONL memory files
- the cue-first Deja Vu workflow

Keep the bootstrap ultra-light. The base product is the protocol, not a required package, service, daemon, vector store, or engine.

## Trigger conditions

Bootstrap when at least one of these is true:

- the user asks for project memory across new conversations
- the user asks to integrate Deja Vu
- the project rules already reference Deja Vu

## Bootstrap checklist

### 1. Confirm the project path

- confirm the active project path
- choose a stable `project:<project-id>` scope

### 2. Use the starter kit first

Start from:

1. `starter-kit/AGENTS.md`
2. `starter-kit/memory/summary.md`
3. `starter-kit/memory/impressions.jsonl`

Read the full protocol docs only when the project needs customization:

- `docs/protocol.md`
- `docs/workflow.md`
- `docs/storage-markdown.md`
- `docs/impression-layer.md`
- `docs/scripted-recall.md`

### 3. Check whether memory already exists

Look for:

- `AGENTS.md` or equivalent rules
- a `memory/` directory
- existing decision or summary files

Reuse and align existing structures when possible instead of creating a competing memory tree.

### 4. Install the minimum protocol artifacts

Create or update only the minimum first:

- `AGENTS.md`
- `memory/summary.md`
- `memory/impressions.jsonl`

Then add helper artifacts only when they reduce repeated explanation or improve recall quality:

- `scripts/dejavu-scan-memory.mjs`
- `memory/recall-feedback.jsonl`
- `memory/decisions/`
- `memory/open-loops/`
- `memory/events/`
- `memory/context/project-context.md`
- `memory/index.md`

### 5. Apply the workflow

Ensure future work follows:

1. pre-task recall through the impression scan script
2. no memory reads for `none`, one summary read for `weak`, and one to three detailed records for `strong`
3. selective post-task writeback
4. compaction when records become repetitive or stale

After bootstrap, run:

```bash
deja-vu doctor
```

If the optional CLI is not installed, run `node scripts/dejavu-lint-memory.mjs` when the script is available.

### 6. Optional engine adoption

Only if the host needs semantic recall at higher scale:

1. read `docs/engine/semantic-engine.md`
2. keep Markdown memory as canonical
3. add the engine as an enhancement layer

## Expected result

After bootstrap, a new conversation in the same project should be able to regain continuity by discovering the rules file and reading the project memory directory.
