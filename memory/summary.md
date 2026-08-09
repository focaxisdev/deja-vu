---
id: summary
title: Deja Vu Project Summary
status: active
scope: project:deja-vu
updated: 2026-08-09
---

# Deja Vu Project Summary

## Product positioning

Deja Vu is positioned as "A 3-file memory system for any capable AI coding agent."

## Product structure

- Protocol is the spec.
- Starter-kit is the main product.
- CLI is an optional helper.

## Core promise

Deja Vu provides repo-local, low-cost, human-readable, git-friendly, cross-agent project memory.

Base use does not require a database, vector store, embeddings, SaaS, daemon, or npm install.

## v0.7.0 adoption hardening

v0.7.0 closes the gap between the repository story and the installable product:

- README leads with one-command setup and concrete before/after proof.
- `deja-vu init --merge-agents` preserves existing project rules and appends an idempotent Deja Vu block.
- `init` reports incomplete setup and `doctor` rejects rules files that do not actually configure Deja Vu.
- Package verification installs the built tarball and runs its CLI.
- Local Markdown links are validated in CI.

Released on 2026-08-09, npm `latest` now resolves to v0.7.0 and exposes the unified CLI plus all four declared binaries. A fresh public-registry `npx @focaxisdev/deja-vu@0.7.0 init --dry-run --json` run returned `ok: true` and `ready: true`. The matching GitHub release points to verified merge commit `32ce3c5`.

## Open loops

- No v0.7.0 release blockers remain.

## Boundaries

- Say "any capable coding agent can follow the protocol."
- Do not overclaim that all agents automatically support Deja Vu.
- Do not turn Deja Vu into a heavy memory framework.
- Keep npm publishing, GitHub tagging, and public launch copy behind a verified release checkpoint.
