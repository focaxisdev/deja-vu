# Deja Vu Project Memory Rules

## Memory Identity

- Protocol: Deja Vu Protocol v0.4
- Scope: `project:deja-vu`
- Memory root: `memory/`

## Recall Before Substantial Work

Before substantial planning, coding, release preparation, or documentation changes:

1. Inspect `memory/impressions.jsonl` for familiar cues.
2. If there is no familiarity, do not load memory by default.
3. If familiarity is weak, read `memory/summary.md`.
4. If familiarity is strong, read only the 1-3 linked records needed for the task.
5. Do not load the whole memory tree unless the user explicitly asks.

## Durable Writeback Only

Write back only durable project memory:

- accepted product positioning
- protocol or starter-kit decisions
- CLI scope decisions
- release readiness notes
- unresolved follow-ups
- safety or privacy constraints

Never store secrets, full transcripts, PII, raw logs, low-signal chatter, or disposable exploration noise.
