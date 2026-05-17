# Deja Vu Project Memory Rules

## Protocol identity

- Protocol: Deja Vu Protocol v0.4
- Scope: `project:<project-id>`
- Memory root: `memory/`

After copying this template, replace every `<project-id>` and placeholder memory field before using it in a real project.

Protocol version and package version are separate. Keep this line on the protocol version this project follows.

## Required recall behavior

Before substantial planning, coding, or answering:

1. Run `node scripts/dejavu-scan-memory.mjs "<current task>"` when available.
2. If the result is `not_initialized`, create or ask for the three required files.
3. If the result is `none`, avoid memory reads by default.
4. If the result is `weak`, read `memory/summary.md`.
5. If the result is `strong`, open one to three linked detailed records.
6. If the script is missing, inspect `memory/impressions.jsonl` directly and apply the same budget.

7. Keep the scan output's budget fields visible before loading more memory.

Recall budget:

- impression scan: always allowed
- summary: at most one file
- detailed records: one to three records
- full memory tree: forbidden unless the user explicitly asks

## Required writeback behavior

After meaningful work completes:

1. Write back only durable, reusable memory.
2. Route the outcome through the writeback gate.
3. Update the relevant memory file.
4. Update `memory/impressions.jsonl`.
5. Update `memory/summary.md` when project understanding changes.
6. Update `memory/index.md` if the project uses one.
7. Add a short entry to `memory/events/` only when the work should remain discoverable without becoming durable memory.
8. Append `memory/recall-feedback.jsonl` only when recall was helpful, irrelevant, missed, or overloaded in a way that should tune future memory.

Writeback gate:

- accepted decision -> `memory/decisions/` plus `memory/impressions.jsonl`
- unresolved follow-up -> `memory/open-loops/` plus `memory/impressions.jsonl`
- project-level truth changed -> `memory/summary.md` plus `memory/impressions.jsonl`
- low-value one-off trace -> `memory/events/` or skip
- recall quality signal -> `memory/recall-feedback.jsonl`

Good writeback candidates:

- decisions
- architecture intent
- stable preferences
- unresolved follow-up items
- milestone summaries

Do not store:

- secrets, tokens, credentials, or private keys
- full conversation transcripts
- customer or user PII
- low-signal chatter
- temporary exploration noise
- raw debug logs or build output

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
