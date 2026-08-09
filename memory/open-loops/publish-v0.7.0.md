---
id: publish-v0.7.0
title: Publish and verify Deja Vu v0.7.0
status: active
scope: project:deja-vu
updated: 2026-08-09
---

# Publish and Verify Deja Vu v0.7.0

## Why it matters

npm `latest` is v0.1.0 and does not include the unified `deja-vu` CLI. The public quick start remains broken until a package containing the current starter kit and binaries is published.

## Owner

Repository maintainer.

## Opened

2026-08-09.

## Next trigger

After the v0.7.0 pull request is reviewed and merged:

1. run the clean release verification in `docs/release-v0.7.0.md`
2. publish v0.7.0 to npm with public access
3. verify package version, bin metadata, and a fresh `npx ... init --dry-run`
4. create the matching GitHub release
5. update repository metadata and begin the prepared launch sequence

Do not announce the quick start before the public package smoke test passes.
