# Scripted Recall

Scripted recall lets a host scan for familiarity before spending context on memory files.

The default script is:

```bash
node scripts/dejavu-scan-memory.mjs "current task or user request"
```

After npm installation, the same scanner can be exposed as:

```bash
deja-vu-scan-memory "current task or user request"
```

The companion linter checks whether the impression index is structurally usable:

```bash
deja-vu-lint-memory
```

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
  "diagnostics": []
}
```

## Host Workflow

1. Run the script before substantial planning, coding, or answering.
2. Treat `none` as permission to avoid detailed memory reads.
3. Treat `weak` as a reason to read `memory/summary.md` and maybe one linked record.
4. Treat `strong` as a reason to open the linked record before planning.
5. Continue to apply normal writeback and compaction rules after work completes.

## Bootstrap Rule

When installing Deja Vu into a project, copy or create:

- `scripts/dejavu-scan-memory.mjs`
- `memory/impressions.jsonl`
- `memory/events/`

The script is intentionally small. Hosts may replace it with a faster native implementation, but the input and output contract should stay stable.

Run the linter after bootstrap and after memory file migrations:

```bash
node scripts/dejavu-lint-memory.mjs
```
