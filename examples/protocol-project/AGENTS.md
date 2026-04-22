# Example Project Rules

This example shows the minimum Deja Vu protocol adoption path with no engine.

## Memory system

- Protocol: Deja Vu Protocol v0.3
- Scope: `project:example-protocol-project`
- Memory root: `memory/`

## Recall workflow

Before substantial planning, coding, or answering:

1. Run `node ../../scripts/dejavu-scan-memory.mjs "<current task>"` when using this example from its own directory.
2. If the result is `none`, avoid memory reads by default.
3. If the result is `weak`, read `memory/summary.md`.
4. If the result is `strong`, open the linked detailed record.
5. If the script is unavailable, fall back to `memory/summary.md` and then `memory/index.md` when present.

Recall budget:

- impression scan: always allowed
- summary: at most one file
- detailed records: one to three records
- full memory tree: forbidden unless the user explicitly asks

## Writeback workflow

After meaningful work completes:

1. Write back only durable memory.
2. Update the relevant detailed memory file.
3. Update `memory/impressions.jsonl`.
4. Update `memory/summary.md` if project understanding changed.
5. Update `memory/index.md` if the project uses one.
6. Add a short entry to `memory/events/` only when the work should remain discoverable without becoming durable memory.

## Safety

- Do not store secrets.
- Do not store full chat transcripts.
- Do not store low-value exploration noise.
