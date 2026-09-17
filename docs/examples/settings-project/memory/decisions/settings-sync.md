---
id: decision-settings-sync
title: Settings sync stays server-backed
status: active
scope: project:demo
updated: 2026-05-16
---

# Settings sync

## Decision

Keep synced preferences on the server; do not move them to localStorage.
Preserve the input-method editor (IME) composition guard: do not submit
unfinished text while composition is active.

## Rationale

The fictional application shares settings across devices. Premature submission
during IME composition can persist incomplete text.

## Consequences

The refactor must retain server-backed persistence and composition handling.
Track old setting names in the [migration follow-up](../open-loops/settings-migration.md).
