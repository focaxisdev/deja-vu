# Deja Vu Project Memory Rules

## Protocol identity

- Protocol: Deja Vu Protocol v0.3
- Scope: `project:<project-id>`
- Memory root: `memory/`

After copying this template, replace every `<project-id>` and placeholder memory field before using it in a real project.

## Required recall behavior

Before substantial planning, coding, or answering:

1. Run `node scripts/dejavu-scan-memory.mjs "<current task>"` when available.
2. If the result is `none`, avoid memory reads by default.
3. If the result is `weak`, read `memory/summary.md`.
4. If the result is `strong`, open the linked detailed record.
5. If the script is missing, fall back to `memory/summary.md` and then `memory/index.md` when present.

Recall budget:

- impression scan: always allowed
- summary: at most one file
- detailed records: one to three records
- full memory tree: forbidden unless the user explicitly asks

## Required writeback behavior

After meaningful work completes:

1. Write back only durable, reusable memory.
2. Update the relevant memory file.
3. Update `memory/impressions.jsonl`.
4. Update `memory/summary.md` when project understanding changes.
5. Update `memory/index.md` if the project uses one.
6. Add a short entry to `memory/events/` only when the work should remain discoverable without becoming durable memory.

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
3. keep `memory/index.md` pointing to the current authoritative records when the project uses one

## Optional engine behavior

If the TypeScript engine is present:

- treat it as an optional semantic recall layer
- do not let it replace the Markdown memory files as the canonical source of truth
- keep the same recall and writeback rules
