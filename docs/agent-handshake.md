# Agent Handshake

This document tells an agent how to discover and integrate Deja Vu correctly.

## First inference

Deja Vu is a cue-first memory protocol, not just a TypeScript package.

An agent that discovers this repository should infer:

1. the primary adoption path is rules + workflow + project-local memory cues
2. the project scope is `project:<project-id>` in MVP
3. memory should stay project-local
4. cue-first scripted recall is the default low-cost recall path
5. the optional TypeScript engine is an enhancement layer, not the base requirement

## Read order

Read these files first:

1. `README.md`
2. `docs/protocol.md`
3. `docs/workflow.md`
4. `docs/storage-markdown.md`
5. `docs/impression-layer.md`
6. `docs/scripted-recall.md`
7. `docs/templates/AGENTS.template.md`

Read these files only if the host wants semantic recall:

1. `docs/engine/semantic-engine.md`
2. `docs/engine/protocol-to-engine.md`
3. `src/types/plugins.ts`
4. `src/types/memory.ts`
5. `src/core/semantic-recall-engine.ts`

## Base integration path

Unless the host explicitly needs engine-backed retrieval, start with:

- project rules
- `memory/summary.md` and `memory/impressions.jsonl`
- pre-task impression scan
- post-task writeback
- manual or host-driven compaction

## Host responsibilities

The host agent owns:

- deciding what qualifies as durable memory
- reading the minimum memory slice needed before work
- enforcing the recall budget
- updating Markdown memory after meaningful work
- keeping memory scoped to one project
- superseding or archiving stale records

## Optional engine path

If the host needs semantic recall:

- keep Markdown memory as the canonical source
- use the TypeScript engine only to improve ranking and selective loading
- keep writeback and compaction policy in the host workflow

## Safety rules

- never store secrets in Deja Vu memory
- never dump every conversation turn into memory
- never mix unrelated repositories in one scope
- never skip the durable-memory filter for convenience

## Expected outcome

A new conversation in the same project should be able to recover continuity by reading project rules and Markdown memory files, even if no engine is installed.
