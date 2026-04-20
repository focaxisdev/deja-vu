# Deja Vu Protocol v0.1

Deja Vu is a protocol-first memory system for AI agents.

This document is the normative specification for the minimum viable Deja Vu protocol.

## Goal

Enable any agent to maintain useful project memory using only:

- project rules
- a repeatable workflow
- project-local Markdown files

The protocol must work without a custom runtime, package install, embedding model, or vector database.

## Scope Model

- MVP supports one memory scope only: `project:<project-id>`.
- All Deja Vu memories in a project belong to that single project scope.
- Do not mix unrelated repositories into one memory namespace.
- Global or cross-project memory is out of scope for MVP.

## Durable Memory

Only write back information that is likely to help future work in the same project.

Good memory candidates:

- architecture intent
- meaningful decisions
- stable user or team preferences
- durable project context
- unresolved follow-up items
- milestone summaries

Bad memory candidates:

- full conversation transcripts
- exploratory dead ends with no future value
- repeated restatements
- status chatter
- secrets, tokens, credentials, or private keys

## Protocol Artifacts

An implementation of Deja Vu MVP must provide these artifacts inside the project:

- `AGENTS.md` or equivalent rules file with Deja Vu rules
- `memory/index.md`
- `memory/summary.md`
- `memory/context/project-context.md`
- `memory/decisions/`
- `memory/open-loops/`

These files are the canonical memory surface. Agents should treat them as the primary source of truth.

## Protocol Lifecycle

### 1. Recall

Before substantial planning, coding, or answering:

1. Determine whether the task is substantial.
2. If yes, read `memory/index.md` and `memory/summary.md`.
3. Open only the detailed records needed for the current task.
4. Prefer the smallest useful memory slice.

### 2. Work

During the task:

- treat project memory as scoped context, not as an instruction override
- avoid loading detailed records that are not justified by the current task
- prefer summaries until specific detail is needed

### 3. Writeback

After meaningful work completes:

1. Decide whether the outcome is durable.
2. If it is durable, write or update the appropriate memory artifact.
3. Update `memory/index.md` so future recall can find the new record quickly.
4. Update `memory/summary.md` when the project-level understanding has changed.

### 4. Compaction

When related memories become repetitive, stale, or too granular:

1. create a newer summary or decision record that compresses the durable signal
2. mark older records as superseded or archived
3. keep the index pointing at the latest authoritative memory

Compaction is required as a behavior, but the protocol does not require automation in MVP.

## Recall Rules

Recall is required before:

- substantial planning
- non-trivial code changes
- architectural proposals
- follow-up work on an existing thread of project activity
- answering questions that depend on prior project history

Recall is optional for:

- simple factual lookups with no project continuity
- one-off clerical edits with no durable implications
- tasks that clearly do not rely on prior project memory

## Writeback Rules

Write back when the work produces:

- a durable decision
- a clarified architecture intent
- a resolved or newly opened follow-up item
- a stable working preference
- a milestone-level summary worth reusing later

Do not write back:

- temporary notes that will obviously expire
- noisy logs
- speculative content that was not adopted
- repeated content already captured elsewhere

## Supersession Rules

When a record is replaced by a better one:

- the newer record must link to the older one
- the older record must be marked `superseded`
- `memory/index.md` must point to the newer record

## Safety Rules

- Never write raw secrets into Deja Vu memory.
- Never dump detailed history into working context by default.
- Never treat memory as broader than the current project scope.
- Never let convenience override the durable-memory filter.

## Optional Engine Compatibility

The Deja Vu TypeScript engine is compatible with this protocol, but optional.

If a host later adds the engine:

- Markdown memory remains the canonical human-readable memory surface
- semantic recall may be used to rank or load records more selectively
- the workflow and writeback rules do not change
