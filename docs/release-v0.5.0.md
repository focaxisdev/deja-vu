# Deja Vu v0.5.0

Deja Vu now treats remember and recall as equal parts of the protocol loop.

Earlier releases made cue-first recall cheap and observable. This release closes the loop after work completes: agents now get clearer routing for what to remember, where to write it, when to skip it, and how recall feedback should become future memory maintenance.

## Highlights

- Added post-task writeback routing to the README, protocol, workflow, and AGENTS template.
- Added `writeback_hint` to `deja-vu-scan-memory` output.
- Added `deja-vu-feedback-report` for aggregating recall feedback into maintenance suggestions.
- Expanded `deja-vu-lint-memory` to inspect Markdown memory lifecycle records, not only JSONL cues.
- Added tests for writeback hints, feedback reporting, Markdown linting, and package binary inclusion.

## Why it matters

Recall without disciplined writeback eventually goes stale. Writeback without disciplined recall turns into noise.

Deja Vu v0.5.0 keeps the base product small while making the full loop explicit:

```text
task cue -> familiarity score -> minimal recall -> durable writeback -> feedback-guided maintenance
```

## Upgrade notes

No existing memory layout migration is required.

Recommended additions:

- Use the README writeback routing table after meaningful work.
- Run `deja-vu-lint-memory` to catch Markdown lifecycle issues.
- Run `deja-vu-feedback-report` when `memory/recall-feedback.jsonl` starts to accumulate actionable recall outcomes.
