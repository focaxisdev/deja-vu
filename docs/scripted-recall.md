# Scripted Recall

Scripted recall lets a host scan for familiarity before spending tokens on memory files.

The default script is:

```bash
node scripts/dejavu-scan-memory.mjs "current task or user request"
```

After npm installation, the same scanner can be exposed as:

```bash
deja-vu-scan-memory "current task or user request"
```

The unified optional CLI also provides setup and health checks:

```bash
deja-vu init --dry-run
deja-vu doctor
deja-vu explain
```

The companion linter checks whether the impression index is structurally usable:

```bash
deja-vu-lint-memory
```

The linter also warns about low-quality cue routes that make future recall more expensive:

- too few or too many keywords
- duplicate keywords inside one record
- too many generic keywords
- duplicate keyword sets across records
- invalid recall feedback outcomes
- invalid weight, status, scope, date, or unsafe record paths

## Inputs

The script reads:

- `memory/impressions.jsonl`

Use `--memory-root` or `--file` when the memory directory is not under the current working directory:

```bash
node scripts/dejavu-scan-memory.mjs --memory-root ./examples/protocol-project/memory "protocol memory"
node scripts/dejavu-scan-memory.mjs --file ./memory/impressions.jsonl "protocol memory"
```

Each line is one impression record as defined in `docs/impression-layer.md`.

## Output

The script prints JSON:

```json
{
  "matched": true,
  "level": "weak",
  "score": 0.5,
  "matches": [
    {
      "id": "decision-protocol-first",
      "title": "Protocol-first positioning",
      "record_path": "memory/decisions/protocol-first-positioning.md",
      "score": 0.5,
      "matched_keywords": ["protocol", "memory"]
    }
  ],
  "budget": {
    "impression_scan": 1,
    "summaries_loaded": 0,
    "detail_records_loaded": 0,
    "why_loaded": ["cue scan found a weak familiarity match"]
  },
  "feedback_hint": {
    "outcomes": ["helpful", "irrelevant", "missed", "overloaded"],
    "write_to": "memory/recall-feedback.jsonl"
  },
  "diagnostics": []
}
```

If `memory/impressions.jsonl` is missing, the script returns `level: "not_initialized"` with a bootstrap hint instead of pretending the task had no familiarity match.

## Host Workflow

1. Run the script before substantial planning, coding, or answering.
2. Treat `none` as permission to avoid detailed memory reads.
3. Treat `not_initialized` as a setup problem and create the three required files.
4. Treat `weak` as a reason to read `memory/summary.md`.
5. Treat `strong` as a reason to open one to three linked records before planning.
6. Watch `budget` before loading more memory.
7. Record recall feedback only when the result should tune future cue quality.
8. Continue to apply normal writeback and compaction rules after work completes.

## Bootstrap Rule

When installing Deja Vu into a project, copy or create the three required files:

- `AGENTS.md`
- `memory/impressions.jsonl`
- `memory/summary.md`

Optional scale-up files:

- `memory/recall-feedback.jsonl`
- `memory/decisions/`
- `memory/open-loops/`

The script is intentionally small and optional. Hosts may replace it with a faster native implementation, but the input and output contract should stay stable.

Add `memory/decisions/`, `memory/open-loops/`, `memory/events/`, or `memory/index.md` only when the project has enough durable memory to justify them.

Run the linter after bootstrap and after memory file migrations:

```bash
node scripts/dejavu-lint-memory.mjs
```

## Recall Feedback

Use `memory/recall-feedback.jsonl` as a small reward signal for the memory system.

Each line is one JSON object:

```json
{"schema_version":1,"query":"release feedback memory","matched_id":"decision-protocol-first","outcome":"helpful","created":"2026-04-24T12:00:00Z","note":"The decision record prevented a duplicate engine-first proposal."}
```

Allowed outcomes:

- `helpful`
- `irrelevant`
- `missed`
- `overloaded`

Do not log every scan. Add feedback only when it should change future keywords, weights, summaries, thresholds, or supersession.
