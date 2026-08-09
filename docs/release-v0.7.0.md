# Deja Vu v0.7.0 Release

v0.7.0 is the first public npm release that includes the three-file starter kit and unified CLI.

## Why this release matters

Before v0.7.0, the repository had reached v0.6.0 while npm `latest` remained at v0.1.0. That published package did not expose the `deja-vu` CLI, so the README's `npx @focaxisdev/deja-vu init` path could not work.

v0.7.0 closes that adoption gap and hardens the first-run experience for repos with existing project rules.

## Included

- one-command starter setup
- safe `AGENTS.md` merge mode
- setup-readiness diagnostics
- cross-platform copy instructions
- README product proof and social-preview asset
- local Markdown link validation
- isolated-cache npm pack verification

The protocol remains Deja Vu Protocol v0.4 because the normative recall budget and writeback lifecycle have not changed.

## Release verification

Run from a clean checkout:

```bash
npm ci
npm run test:src:readonly
npm run check:links
npm run lint:memory
npm run report:feedback
npm run build
npm run test:pack
npm pack --dry-run
```

Verify the packed file list contains:

- `scripts/deja-vu.mjs`
- `starter-kit/AGENTS.md`
- `starter-kit/memory/summary.md`
- `starter-kit/memory/impressions.jsonl`
- all declared package binaries

## Published result

Completed on 2026-08-09:

- PR #9 was squash-merged to `main` as commit `32ce3c5`.
- [`@focaxisdev/deja-vu@0.7.0`](https://www.npmjs.com/package/@focaxisdev/deja-vu/v/0.7.0) was published publicly and assigned npm `latest`.
- Registry metadata reports all four package binaries.
- A fresh public-registry `npx @focaxisdev/deja-vu@0.7.0 init --dry-run --json` run returned `ok: true` and `ready: true`.
- [GitHub Release v0.7.0](https://github.com/focaxisdev/deja-vu/releases/tag/v0.7.0) was published from the verified merge commit.

Prepared promotion copy remains in `docs/launch-copy.md` for a separate launch step.
