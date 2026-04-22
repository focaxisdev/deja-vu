# Deja Vu Workflow

This document defines the exact workflow an agent should follow when using Deja Vu in a project.

## Operating Principle

Use the smallest amount of memory that preserves continuity.

Deja Vu should feel like recognition, not replay. A task cue earns more context only when it matches a reusable project memory route.

## Task Lifecycle

### Pre-task recall

Before substantial planning, coding, or answering:

1. Run `node scripts/dejavu-scan-memory.mjs "<task>"` when the script exists.
2. If the scan level is `none`, avoid detailed memory reads by default.
3. If the scan level is `weak`, read `memory/summary.md`.
4. If the scan level is `strong`, read the linked detailed record before planning.
5. If no script exists, fall back to `memory/summary.md` and then `memory/index.md` when present.

Recall budget:

- impression scan: always allowed
- summary: at most one file
- detailed records: one to three records
- full memory tree: forbidden unless the user explicitly asks

Default detailed reads:

- decision records for architecture or policy questions
- open-loop records for unresolved follow-up work
- context records for stable project facts

### During-task discipline

- keep detailed memory reads narrowly scoped
- prefer summary memory unless precise details are required
- avoid reopening the entire memory tree during normal work

### Post-task writeback

After meaningful work completes:

1. decide whether the outcome is durable
2. create or update the relevant durable memory file
3. update `memory/impressions.jsonl`
4. update `memory/summary.md` if project understanding changed
5. update `memory/index.md` if the project uses one
6. add a short event ledger entry only when the work should remain discoverable without promotion into durable memory

## Decision Rules

### When recall is mandatory

- ongoing feature work
- refactors with prior context
- bug investigation with historical decisions
- documentation changes that alter project intent
- user questions about why something is the way it is

### When recall is usually unnecessary

- trivial formatting
- isolated typo fixes
- simple shell lookups with no continuity impact

### When writeback is mandatory

- a meaningful decision was made
- a new durable constraint was discovered
- a previously open loop changed status
- a project summary now needs to reflect new truth

### When writeback is forbidden

- the information is secret
- the information is transient and low value
- the information duplicates an authoritative record with no new signal

## Compaction Workflow

Compaction should happen when:

- several records now repeat the same conclusion
- old implementation details are no longer the main thing future work needs
- too many low-level memories are required to understand one area

Compaction steps:

1. write a newer summary or decision record
2. mark older records as `superseded` or `archived`
3. keep historical links intact
4. update the index so recall lands on the new authoritative record first

## Default Memory Priorities

Read priority:

1. `memory/impressions.jsonl` through the scan script
2. `memory/summary.md` for weak matches
3. linked detailed records for strong matches
4. the minimum number of additional records needed

Write priority:

1. impression index updates
2. open-loop status changes
3. durable decisions
4. project summary changes
5. supporting context records
6. event ledger entries

## Expected Outcome

A new conversation in the same project should be able to:

- discover the project memory rules
- load a compact project summary
- find the right detailed memory quickly
- continue work without depending on the previous chat transcript
