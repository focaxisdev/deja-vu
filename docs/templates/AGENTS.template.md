# Deja Vu Project Memory Rules

## Protocol identity

- Protocol: Deja Vu Protocol v0.2
- Scope: `project:<project-id>`
- Memory root: `memory/`

After copying this template, replace every `<project-id>` and placeholder memory field before using it in a real project.

## Required recall behavior

Before substantial planning, coding, or answering:

1. Run `node scripts/dejavu-scan-memory.mjs "<current task>"` when available.
2. If the result is `none`, avoid detailed memory reads by default.
3. If the result is `weak`, read `memory/summary.md` and at most one linked record.
4. If the result is `strong`, open the linked detailed record.
5. If the script is missing, fall back to `memory/index.md` and `memory/summary.md`.

## Required writeback behavior

After meaningful work completes:

1. Write back only durable, reusable memory.
2. Add a short entry to `memory/events/` when the work should remain discoverable.
3. Update the relevant memory file.
4. Update `memory/impressions.jsonl`.
5. Update `memory/index.md`.
6. Update `memory/summary.md` when project understanding changes.

Good writeback candidates:

- decisions
- architecture intent
- stable preferences
- unresolved follow-up items
- milestone summaries

Do not store:

- secrets, tokens, credentials, or private keys
- full conversation transcripts
- low-signal chatter
- temporary exploration noise

## Compaction behavior

When related memories become repetitive or stale:

1. write a newer summary or decision record
2. mark older records as `superseded` or `archived`
3. keep `memory/index.md` pointing to the current authoritative records

## Optional engine behavior

If the TypeScript engine is present:

- treat it as an optional semantic recall layer
- do not let it replace the Markdown memory files as the canonical source of truth
- keep the same recall and writeback rules
