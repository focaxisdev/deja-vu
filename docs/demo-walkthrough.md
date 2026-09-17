# Demo Walkthrough

This walkthrough uses fictional, sanitized data. The checked-in
[summary](examples/settings-project/memory/summary.md),
[cue index](examples/settings-project/memory/impressions.jsonl),
[decision](examples/settings-project/memory/decisions/settings-sync.md), and
[follow-up](examples/settings-project/memory/open-loops/settings-migration.md)
make the example reproducible.

## Before Deja Vu

New agent session:

```text
User: We need to continue the settings refactor.
Agent: I can help. What is the architecture?
User: We already decided not to move preferences into localStorage because settings sync is server-backed.
User: Also do not break the IME workaround from last week.
User: And there is still an unresolved follow-up to migrate old setting names.
```

The user spends the first minutes reconstructing project memory.

## Add Deja Vu

The repo has:

```text
AGENTS.md
memory/summary.md
memory/impressions.jsonl
memory/decisions/settings-sync.md
memory/open-loops/settings-migration.md
```

`memory/impressions.jsonl` contains tiny cue routes:

```json
{"schema_version":1,"id":"decision-settings-sync","scope":"project:demo","title":"Settings sync stays server-backed","keywords":["settings","sync","localstorage","preferences"],"record_path":"memory/decisions/settings-sync.md","updated":"2026-05-16","weight":0.9,"status":"active"}
{"schema_version":1,"id":"open-loop-settings-migration","scope":"project:demo","title":"Migrate old setting names","keywords":["settings","migration","legacy","names"],"record_path":"memory/open-loops/settings-migration.md","updated":"2026-05-16","weight":0.8,"status":"active"}
```

## After Deja Vu

New agent session:

```text
User: Continue the settings refactor.
Agent: I will follow AGENTS.md and scan memory/impressions.jsonl before planning.
```

That exact request does **not** produce a strong scripted match: it returns
`level: "none"` and a top score of `0.2437`. The lexical scanner does not infer
the word "sync" from "refactor". No detail should be loaded on that result.

When the task supplies the explicit cues `settings sync`, the scanner returns
`strong`, score `0.975`, with the settings decision first. The second route is
the migration follow-up (score `0.475`).

Run both from the repository root:

```bash
node scripts/dejavu-scan-memory.mjs --memory-root docs/examples/settings-project/memory "Continue the settings refactor."
node scripts/dejavu-scan-memory.mjs --memory-root docs/examples/settings-project/memory "settings sync"
```

These exact outcomes are regression-tested. This demonstrates cue-based
retrieval, not measured improvements in agent task success.

For the explicit-cue task, the agent can read the decision and its relevant
migration link, within the one-to-three-record budget:

- `memory/decisions/settings-sync.md`
- `memory/open-loops/settings-migration.md`

Then it plans with the right constraints:

- do not move synced preferences to localStorage
- preserve the IME composition guard documented in the settings decision
- continue the legacy setting-name migration

## Post-Task Writeback

If the work creates durable memory, the agent writes back only that signal:

- accepted decision -> `memory/decisions/`
- unresolved follow-up -> `memory/open-loops/`
- project-level truth -> `memory/summary.md`
- recall quality signal -> `memory/recall-feedback.jsonl`

It does not store the whole chat.

## Dogfooding Deja Vu

Deja Vu should use Deja Vu on itself:

- keep product positioning decisions in `memory/decisions/`
- keep release follow-ups in `memory/open-loops/`
- keep the current project story in `memory/summary.md`
- keep only sparse cue routes in `memory/impressions.jsonl`

Public examples must be sanitized. Do not include private chat transcripts, secrets, customer data, or internal-only project facts.
