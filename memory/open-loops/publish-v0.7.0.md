---
id: publish-v0.7.0
title: Publish and verify Deja Vu v0.7.0
status: archived
scope: project:deja-vu
updated: 2026-08-09
closed: 2026-08-09
---

# Publish and Verify Deja Vu v0.7.0

## Why it matters

npm `latest` was v0.1.0 and did not include the unified `deja-vu` CLI, leaving the public quick start unusable.

## Owner

Repository maintainer.

## Opened

2026-08-09.

## Resolution

Resolved on 2026-08-09:

- PR #9 was squash-merged to `main` as commit `32ce3c5`.
- `@focaxisdev/deja-vu@0.7.0` was published publicly with npm `latest` pointing to v0.7.0.
- Registry metadata exposes `deja-vu`, `deja-vu-scan-memory`, `deja-vu-lint-memory`, and `deja-vu-feedback-report`.
- A fresh public-registry `npx ... init --dry-run --json` returned `ok: true` and `ready: true`.
- GitHub Release `v0.7.0` was published from the verified merge commit.

The prepared launch copy remains available for a separately authorized promotion step.

## Next trigger

None. Keep this record archived; track any future release or promotion work in a new open-loop record.
