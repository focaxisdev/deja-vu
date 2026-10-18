# Deja Vu v0.7.1: historical release preparation

This unpublished patch candidate is superseded by the [v0.8.0 preparation](release-v0.8.0.md),
which includes these fixes and the later optional engine APIs. The current package
manifest is 0.8.0; this page preserves the earlier candidate and its historical checks.

This patch candidate contains the reliability fixes merged in PR #12 at
`f9c5704`. Deja Vu Protocol remains v0.4. No runtime dependency is added.

## Included fixes

- Prepare engine writes before mutation and compensate failures, preserving
  update metadata and exposing recovery details.
- Back up and stage initialization changes, with preflight and recovery checks.
- Validate schemas, route targets, lifecycle successors, project identity and
  readiness consistently across CLI tools.
- Bind identity to the validated rules block and avoid raw record snippets in
  JSONL parse errors.
- Test executable demo claims and installed CLI/API behavior, including injected
  failures and Windows/Linux CI.

## Upgrade notes

These changes intentionally reject inputs that previously appeared successful:

- Invalid scans now exit nonzero with `error` or `not_initialized`; do not treat
  them as a successful `none` result. `--file` remains explicitly cue-only.
- `init` can report `ok: true, ready: false` when manual review is needed.
- Duplicate `addMemory` IDs are rejected; use `updateMemory` instead.
- A storage adapter can implement optional `getMemorySnapshot` for exact timestamp
  preservation. The legacy getter fallback cannot preserve them exactly.

Compensating recovery is not a crash-safe transaction or multi-instance lock.
The later engine implementation also compensates failed deletions by attempting
to restore the snapshot and indexes. Adapter failures during recovery are reported
through `MemoryWriteError`; recovery is not guaranteed. Backups and recovery
snapshots can contain private data; keep them out of telemetry and public files.
See [reliability and recovery](reliability.md) and the
[engine contract](engine/semantic-engine.md).

## Historical local verification

Run from the release-preparation checkout:

```bash
npm test
node scripts/deja-vu.mjs doctor --json
node scripts/dejavu-lint-memory.mjs --memory-root starter-kit/memory
node scripts/dejavu-lint-memory.mjs --memory-root examples/protocol-project/memory
node scripts/dejavu-lint-memory.mjs --memory-root docs/examples/settings-project/memory
```

- [x] Package manifest, lockfile, tarball and installed-package versions agree.
- [x] Source, compiled, installed-package and Markdown-link tests pass.
- [x] Project doctor and example/starter memory checks pass.

Validated locally on 2026-09-20: 65 source tests, 65 compiled tests, one
installed-package test and 65 Markdown link checks passed. Keep any exported
candidate tarball and its checksum outside the repository; they are not a
published release or a substitute for testing the final release commit.

## Historical checklist (superseded)

Use the v0.8.0 checklist for the current candidate. The unchecked items below
record the state of the abandoned 0.7.1 preparation, not current authorization.

- [ ] Review and commit the release-preparation changes.
- [ ] Push a release-preparation PR and pass its Windows/Linux CI.
- [ ] Merge only after approval, then pin the exact release commit and verify a clean checkout.
- [ ] Recheck registry versions and existing tags immediately before publishing.
- [ ] Obtain explicit approval for npm publishing and GitHub tagging/release creation.
- [ ] Set the actual release date, rebuild/test the final artifact, and record its integrity.
- [ ] After approved publication, verify registry metadata and fresh version-pinned CLI installation.

The green CI from PR #12 covers the reliability implementation, not these new
version-preparation changes. Do not reuse an earlier local tarball if release
files change. Public-registry and GitHub checks on 2026-09-20 found npm latest at
0.7.0 and no v0.7.1 tag; this availability must be checked again at release time.
