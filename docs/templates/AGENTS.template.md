# Deja Vu Project Memory Rules

## Protocol identity

- Protocol: Deja Vu Protocol v0.1
- Scope: `project:<project-id>`
- Memory root: `memory/`

## Required recall behavior

Before substantial planning, coding, or answering:

1. Read `memory/index.md`.
2. Read `memory/summary.md`.
3. Open only the detailed records justified by the task.
4. Prefer summaries before detailed records.

## Required writeback behavior

After meaningful work completes:

1. Write back only durable, reusable memory.
2. Update the relevant memory file.
3. Update `memory/index.md`.
4. Update `memory/summary.md` when project understanding changes.

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
