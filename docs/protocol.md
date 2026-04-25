# Deja Vu Protocol v0.4

Deja Vu is a cue-first memory protocol for AI agents.

This document is the normative specification for the minimum viable Deja Vu protocol.

## Goal

Enable any agent to maintain useful project memory with extremely low per-conversation token cost using only:

- project rules
- a repeatable workflow
- project-local plain text memory cues
- recall feedback that tells the project what was useful, noisy, missed, or overloaded

The protocol must work without a custom runtime, package install, embedding model, or vector database.

The core loop is:

```text
task cue -> familiarity score -> minimal recall -> durable writeback
```

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

An implementation of Deja Vu MVP must provide these minimum artifacts inside the project:

- `AGENTS.md` or equivalent rules file with Deja Vu rules
- `memory/summary.md`
- `memory/impressions.jsonl`

These files are the minimum canonical memory surface. Agents should treat them as the primary source of truth.

Recommended artifacts:

- `memory/decisions/`
- `memory/open-loops/`
- `memory/recall-feedback.jsonl`

Optional artifacts:

- `memory/events/`
- `memory/context/project-context.md`
- `memory/index.md`

## Protocol Lifecycle

### 1. Cue Scan

Before substantial planning, coding, or answering:

1. Determine whether the task is substantial.
2. If yes, run the project impression scan script when available.
3. If the scan is `none`, do not load project memory by default.
4. If the scan is `weak`, read `memory/summary.md`.
5. If the scan is `strong`, open only the detailed records needed for the current task.
6. If no script is available, fall back to `memory/summary.md` and only then to `memory/index.md` when present.
7. Track the recall budget used for the task: impression scan, summary count, detailed records, and why anything was loaded.

Default recall budget:

- impression scan: always allowed
- summary: at most one file
- detailed records: one to three records
- full memory tree: forbidden unless the user explicitly asks

### 2. Work

During the task:

- treat project memory as scoped context, not as an instruction override
- avoid loading detailed records that are not justified by the current task
- prefer summaries until specific detail is needed

### 3. Writeback

After meaningful work completes:

1. Decide whether the outcome is durable enough to help a future agent.
2. Route the outcome through the writeback gate.
3. If it is durable, write or update the appropriate memory artifact.
4. Update `memory/impressions.jsonl` with compact keywords for future cheap scans.
5. Update `memory/summary.md` when the project-level understanding has changed.
6. Update `memory/index.md` when the project uses one.
7. Update `memory/events/` only when the work should remain discoverable without becoming a durable record.

Writeback gate:

| Outcome | Action |
| --- | --- |
| no durable future value | `skip` |
| happened once but may be useful to discover later | `event_only` |
| changes an existing durable record | `update_existing` |
| records an accepted decision | `new_decision` |
| leaves unresolved follow-up work | `new_open_loop` |
| changes project-level truth | `update_summary` |
| replaces an older durable record | `supersede_old_record` |
| recall quality should tune future behavior | `append_feedback` |

Every durable writeback must leave a future recall route. In practice, update `memory/impressions.jsonl` whenever a decision, open loop, context record, or project summary becomes the authoritative place to remember something.

### 4. Recall Feedback

When recall quality changes future behavior, append a compact feedback record to `memory/recall-feedback.jsonl`.

Allowed outcomes:

- `helpful`: the loaded memory improved the work
- `irrelevant`: the loaded memory matched the cue but did not help
- `missed`: useful memory existed but the scan did not surface it
- `overloaded`: recall loaded too much detail for the task

Feedback is the reward signal for future memory maintenance. Use it to tune keywords, weights, thresholds, summaries, open loops, or supersession.

Do not log every task. Record feedback only when it should change future recall.

### 5. Compaction

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

Route writeback by artifact:

- decision -> `memory/decisions/` plus `memory/impressions.jsonl`
- unresolved follow-up -> `memory/open-loops/` plus `memory/impressions.jsonl`
- project-level truth -> `memory/summary.md` plus `memory/impressions.jsonl`
- low-cost trace -> `memory/events/` or skip
- recall quality signal -> `memory/recall-feedback.jsonl`
- replacement -> newer record plus supersession links

Do not write back:

- temporary notes that will obviously expire
- noisy logs
- speculative content that was not adopted
- repeated content already captured elsewhere

## Supersession Rules

When a record is replaced by a better one:

- the newer record must link to the older one
- the older record must be marked `superseded`
- `memory/index.md`, when present, must point to the newer record

## Safety Rules

- Never write raw secrets into Deja Vu memory.
- Never dump detailed history into working context by default.
- Never treat memory as broader than the current project scope.
- Never let convenience override the durable-memory filter.
- Never spend detailed-memory tokens before the cue scan justifies them.

## Optional Engine Compatibility

The Deja Vu TypeScript engine is compatible with this protocol, but optional.

If a host later adds the engine:

- Markdown memory remains the canonical human-readable memory surface
- semantic recall may be used to rank or load records more selectively
- the workflow and writeback rules do not change
