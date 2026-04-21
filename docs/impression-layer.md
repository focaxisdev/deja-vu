# Impression Layer

The impression layer is the thinnest Deja Vu memory surface.

Its job is not to explain a memory. Its job is to answer one cheap question:

> Does this task feel familiar enough to justify opening deeper memory?

## Position in the Memory Stack

Deja Vu keeps the optional engine's three-layer memory model:

1. Impression or familiarity index
2. Summary layer
3. Detailed chunks or records

The protocol-first path now mirrors that model with project files:

1. `memory/impressions.jsonl`
2. `memory/summary.md` and linked summaries
3. detailed records under `memory/context/`, `memory/decisions/`, and `memory/open-loops/`

## Impression Record

Use JSON Lines so a host script can scan records without parsing the whole memory tree.

Required fields:

- `schema_version`
- `id`
- `scope`
- `title`
- `keywords`
- `record_path`
- `updated`

Optional fields:

- `aliases`
- `weight`
- `status`

Example:

```json
{"schema_version":1,"id":"decision-protocol-first","scope":"project:example-project","title":"Protocol-first positioning","keywords":["protocol","workflow","markdown","memory"],"aliases":["repo-first"],"record_path":"memory/decisions/protocol-first-positioning.md","updated":"2026-04-21","weight":0.9,"status":"active"}
```

## Recall Behavior

Before substantial work:

1. Run the impression scan script against the current user request.
2. If there is no match, avoid opening detailed memory by default.
3. If there is a weak match, open only the active summary or one linked summary record.
4. If there is a strong match, open the linked detailed record.
5. Load chunks or raw detail only when the task explicitly needs deeper recall.

## Writeback Behavior

When durable memory is created or updated, update the impression record at the same time.

Keep impression keywords short and reusable:

- project terms
- stable feature names
- decision names
- architecture nouns
- user preference terms
- unresolved follow-up names

Do not store full summaries, transcripts, secrets, or long prose in the impression layer.

## Retention Behavior

The impression layer may grow over time, but it should remain cheap to scan.

Ask the host whether to prune impressions, compact durable records, or archive stale records when:

- too many impression records match the same query
- many records repeat the same keyword set
- `memory/events/` grows without promotion into durable memory
- detailed records are no longer needed after a newer summary supersedes them

Impression pruning may remove low-value keyword routes. Durable record compaction should preserve historical links through supersession or archival records.
