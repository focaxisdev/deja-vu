# Agent Compatibility

Deja Vu works best with agents that can:

- read repo files
- follow project instructions
- update files
- respect memory budgets
- avoid storing secrets or noisy transcripts

Any capable coding agent can follow the protocol.
The memory lives in the repo, not inside one vendor.

## Strong Fit

Use the normal Deja Vu flow when an agent can inspect and edit project files:

1. read `AGENTS.md`
2. scan `memory/impressions.jsonl`
3. load `memory/summary.md` only for weak familiarity
4. load 1-3 linked detailed records only for strong familiarity
5. write back durable memory only

This is the intended path for file-aware coding agents such as Codex, Claude Code, Cursor, Windsurf, Gemini CLI, and similar tools when they can access the repo.

## Chat-Only Agents

Some chat agents cannot directly read repo files.

Use the manual path:

1. paste `AGENTS.md`
2. paste `memory/impressions.jsonl` or the relevant lines
3. paste `memory/summary.md` only when the task needs project context
4. paste 1-3 detailed records only when the cue strongly matches
5. ask the agent to propose durable writeback, then review before committing it

Do not paste the whole memory tree by default.

## Correct Promise

Say:

> Any capable coding agent can follow the protocol.

Do not say:

> Every agent automatically supports Deja Vu.

Deja Vu is a repo-local convention and memory discipline. Agents still need enough capability and instruction-following reliability to use it.

## Prompt Compatibility

Short prompts are included in [starter-kit/prompts](../starter-kit/prompts):

- Codex
- Claude Code
- Cursor
- Windsurf
- ChatGPT
- Gemini CLI

They are intentionally similar. The protocol should stay stable even when the tool changes.
