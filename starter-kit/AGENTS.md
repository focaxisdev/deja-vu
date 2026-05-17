# Deja Vu Project Memory Rules

## Memory Identity

- Protocol: Deja Vu Protocol v0.4
- Scope: `project:your-project`
- Memory root: `memory/`

Replace `project:your-project` with a stable repo-local project id.

## Recall Before Substantial Work

Before substantial planning, coding, refactoring, debugging, or architecture discussion:

1. Inspect `memory/impressions.jsonl` for familiar cues.
2. If there is no familiarity, do not load memory by default.
3. If familiarity is weak, read `memory/summary.md`.
4. If familiarity is strong, read only the 1-3 linked detailed records needed for the task.
5. Do not load the whole memory tree unless the user explicitly asks.

Default budget:

- impression scan: always allowed
- summary: at most one file
- detailed records: one to three files
- full memory tree: forbidden unless explicitly requested

## Durable Writeback Only

After meaningful work, write back only memory that should change future agent behavior:

- accepted decisions
- architecture intent
- stable preferences
- unresolved follow-ups
- milestone summaries
- recall feedback that should improve future cue quality

Route durable writeback:

- project-level truth -> `memory/summary.md` plus `memory/impressions.jsonl`
- accepted decision -> `memory/decisions/` plus `memory/impressions.jsonl`
- unresolved follow-up -> `memory/open-loops/` plus `memory/impressions.jsonl`
- recall quality signal -> `memory/recall-feedback.jsonl`

## Never Store

- secrets, tokens, credentials, or private keys
- full chat transcripts
- customer or user PII
- low-signal chatter
- disposable exploration noise
- raw debug logs or build output

Memory should feel like recognition, not replay.
