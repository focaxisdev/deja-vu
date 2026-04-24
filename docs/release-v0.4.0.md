# Deja Vu v0.4.0: Feedback-Aware Memory for AI Coding Agents

Deja Vu stores persistent project memory for AI coding agents in repo-local Markdown and JSONL, without a database, vector store, embedding model, or hosted memory service.

v0.4.0 turns recall into an observable feedback loop. Agents can now see why memory was loaded, how much recall budget was spent, and whether the result was helpful, irrelevant, missed, or overloaded.

## Why It Matters

AI coding agents lose useful project context between chats. Most memory systems answer by storing and retrieving more text. Deja Vu keeps the first step cheap: scan tiny cues, load only what the task justifies, and write back durable context that belongs in git.

This release adds the missing reward signal. A project can now learn which memory routes are worth keeping, which ones are noisy, and which cues missed important context.

## Highlights

- Recall budget output for scripted scans and the optional TypeScript engine.
- Recall feedback outcomes: `helpful`, `irrelevant`, `missed`, and `overloaded`.
- New `memory/recall-feedback.jsonl` template and example records.
- Stronger memory linting for feedback, weights, statuses, dates, scopes, and record paths.
- README and package metadata tuned for AI coding agent memory discovery.
- Protocol, workflow, scripted recall, storage, templates, and examples updated to Deja Vu Protocol v0.4.

## Upgrade Notes

The minimum protocol still works with:

- `AGENTS.md`
- `memory/summary.md`
- `memory/impressions.jsonl`

Add `memory/recall-feedback.jsonl` when recall quality should tune future memory behavior. Do not log every scan; record feedback only when it changes what the project should remember, ignore, lower in weight, or revise.

## Suggested GitHub Release Title

Deja Vu v0.4.0: Feedback-Aware Memory for AI Coding Agents

## Suggested Tagline

Repo-local Markdown memory for AI coding agents, now with observable recall budgets and feedback outcomes.
