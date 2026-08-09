# Launch Copy

Use this copy only after the public npm quick start has been verified. Keep the promise precise: capable file-aware agents can follow Deja Vu; support is not automatic in every tool.

Project URL: <https://github.com/focaxisdev/deja-vu>

## Short post

I got tired of re-explaining the same repo to every new AI coding-agent session.

Deja Vu gives the repo its own memory using three files:

- `AGENTS.md`
- `memory/summary.md`
- `memory/impressions.jsonl`

It scans tiny cues first, loads only matching context, and writes back durable decisions—not entire chats.

No database, embeddings, SaaS, daemon, or required install.

`npx @focaxisdev/deja-vu init`

<https://github.com/focaxisdev/deja-vu>

## LinkedIn

Every new coding-agent session starts with a context tax: explain the architecture, repeat old decisions, restate constraints, and warn the agent about workarounds it must not break.

I built Deja Vu around a smaller idea than most memory systems: the repository should carry its own durable memory.

The base system is only three human-readable files. A tiny cue index decides whether the agent should load nothing, one compact summary, or one to three relevant records. The project stays portable across capable file-aware agents, and the memory stays reviewable in Git.

No vector database. No hosted memory service. No transcript archive.

Quick start: `npx @focaxisdev/deja-vu init`

<https://github.com/focaxisdev/deja-vu>

## Show HN

Title:

> Show HN: Deja Vu – three-file project memory for AI coding agents

First comment:

> I built Deja Vu because coding agents kept losing the reasoning that lives between commits: rejected approaches, architecture intent, fragile workarounds, and unresolved follow-ups.
>
> The minimum setup is `AGENTS.md`, `memory/summary.md`, and `memory/impressions.jsonl`. The impressions file is a tiny cue router: no match loads nothing, a weak match loads one summary, and a strong match loads one to three linked records. The agent writes back only durable context after the task.
>
> It is intentionally a file convention first. The CLI only creates and checks those files; npm, embeddings, and the optional TypeScript engine are not required. I would especially value feedback on the three-file boundary, the recall budget, and whether the existing-AGENTS merge behavior feels safe.

## GitHub release intro

Deja Vu v0.7.0 makes the public quick start real: the npm package now includes the unified CLI and starter kit, while the protocol remains file-first and package-optional.

This release adds safe merging for existing `AGENTS.md` files, stricter setup diagnostics, cross-platform onboarding, link validation, isolated package verification, and a clearer before/after product story.

## Alternate titles

- Show HN: Stop re-explaining your repo to every new coding-agent session
- Show HN: Repo-local memory for Codex, Claude Code, Cursor, and Windsurf
- Deja Vu: project memory that fits in a pull request
- Store less, recall better: a file-first memory protocol for coding agents

## Taglines

- Three files. Durable project memory. Any capable coding agent.
- Your repo should remember the why.
- Long-term project memory that fits in a pull request.
- Stop re-explaining your repo to every new agent session.
- Memory should feel like recognition, not replay.
- Store less. Recall better.
