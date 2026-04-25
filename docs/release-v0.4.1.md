# Deja Vu v0.4.1: Protocol-First Activation

Deja Vu remains an ultra-light, repo-local memory protocol for AI coding agents.

v0.4.1 sharpens the adoption path around the smallest useful product: three files, one workflow, and optional helper tooling only when a project grows enough to justify it.

## Why It Matters

The core problem is not that agents need another memory platform. The problem is that every new coding-agent chat starts without the project decisions, architecture intent, open loops, and stable preferences that already exist.

Deja Vu keeps the fix small: scan tiny repo-local cues, load the least memory that preserves continuity, and write back only durable context.

## Highlights

- README opening now leads with the concrete pain: stop re-explaining the repo to every new coding-agent chat.
- Added a 2-minute start path centered on `AGENTS.md`, `memory/summary.md`, and `memory/impressions.jsonl`.
- Reaffirmed that the base product is the protocol, not an npm package, service, daemon, vector database, or engine.
- Clarified that scripts, recall feedback, detailed records, and the TypeScript engine are optional scale-up layers.

## Upgrade Notes

No protocol migration is required.

Existing v0.4.0 projects can keep using the same minimum files:

- `AGENTS.md`
- `memory/summary.md`
- `memory/impressions.jsonl`

Use `memory/recall-feedback.jsonl`, decision records, open loops, events, and engine helpers only when they reduce repeated explanation or improve recall quality.

## Suggested GitHub Release Title

Deja Vu v0.4.1: Protocol-First Activation

## Suggested Tagline

Stop re-explaining your repo to every new coding-agent chat.
