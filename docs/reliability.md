# Reliability and recovery

## Initialization

`deja-vu init` preflights all target files before writing. It stages replacements
beside their destinations and restores completed writes if a later operation
throws. Existing files overwritten by `--force` or appended by `--merge-agents`
are backed up under `.deja-vu-backups/init-*/`; JSON and text output report the
directory. `manifest.json` maps original paths to byte-for-byte backups.

Backups may contain private rules or memory. Their directory contains a
`*` ignore rule, but Git ignore is not encryption or an access-control boundary.
Keep backups local, inspect them before sharing, and manage retention yourself.

`--dry-run` creates neither files nor backups; readiness is a projection, not
a full validation of the proposed final tree. A successful command can return
`ok: true, ready: false` when existing rules or memory need manual review.
Run `deja-vu doctor --json` after initialization.

Known shipped rules and version-1 generated blocks are recognized structurally.
Mentions of memory filenames alone are not proof of readiness. Partial blocks,
unknown versions, differing scopes, and conflicting existing rules require
manual review. Recognition is not natural-language contradiction detection.

Readiness and scope checks use the same validated block. Scope mentions outside
a marked block do not override its identity; duplicate scopes inside it require
manual review. JSONL parse failures report a fixed code, path and line number,
without echoing the malformed record in the diagnostic.

## Recovering interrupted initialization

Caught write failures return `ok: false`, the backup directory when available,
and any `recovery_errors` in JSON mode. Successful compensation restores original
bytes. The operation does not promise an all-files transaction across a process
crash or concurrent external edits.

After a crash or recovery error, stop writers, inspect the backup manifest,
compare each current file against its backup, and restore only the intended
targets. Do not blindly overwrite newer user edits. Run doctor before resuming.

## Validation boundaries

Doctor and lint reject broken routes, cross-project targets, active cues pointing
to inactive records, missing successors, and supersession cycles. Legacy Markdown
without frontmatter still produces a warning: add metadata to enable complete
lifecycle validation. These checks do not prove the truth of a memory's content.

See [scripted recall](scripted-recall.md) for scan exit codes and cue-only mode,
and the [engine contract](engine/semantic-engine.md) for adapter failure recovery.
