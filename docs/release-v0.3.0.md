# Deja Vu v0.3.0

Deja Vu v0.3.0 is the cue-first protocol release.

## Highlights

- The product definition now centers on cue-first recall: `task cue -> familiarity score -> minimal recall -> durable writeback`.
- Minimum adoption now requires only project rules, `memory/summary.md`, and `memory/impressions.jsonl`.
- Decision records and open loops are recommended once a project has durable memory worth routing to.
- Event ledgers, context records, and memory indexes are optional scale-up tools, not setup requirements.
- The protocol now defines a recall budget:
  - impression scan: always allowed
  - summary: at most one file
  - detailed records: one to three records
  - full memory tree: only when explicitly requested
- Impression records now emphasize short cue routes instead of mini summaries.

## Validation

- `npm run lint:memory`
- `npm test`
