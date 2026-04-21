# Example Project Rules

This example shows the minimum Deja Vu protocol adoption path with no engine.

## Memory system

- Protocol: Deja Vu Protocol v0.2
- Scope: `project:example-protocol-project`
- Memory root: `memory/`

## Recall workflow

Before substantial planning, coding, or answering:

1. Run `node ../../scripts/dejavu-scan-memory.mjs "<current task>"` when using this example from its own directory.
2. If the result is `none`, avoid detailed memory reads by default.
3. If the result is `weak`, read `memory/summary.md` and at most one linked record.
4. If the result is `strong`, open the linked detailed record.
5. If the script is unavailable, fall back to `memory/index.md` and `memory/summary.md`.

## Writeback workflow

After meaningful work completes:

1. Write back only durable memory.
2. Add a short entry to `memory/events/` when the work should remain discoverable.
3. Update the relevant detailed memory file.
4. Update `memory/impressions.jsonl`.
5. Update `memory/index.md`.
6. Update `memory/summary.md` if project understanding changed.

## Safety

- Do not store secrets.
- Do not store full chat transcripts.
- Do not store low-value exploration noise.
