# Deja Vu v0.7.0 Release Candidate

v0.7.0 is the first release candidate whose public npm package includes the three-file starter kit and unified CLI.

## Why this release matters

The repository reached v0.6.0, but npm `latest` remained at v0.1.0. That published package does not expose the `deja-vu` CLI, so the README's `npx @focaxisdev/deja-vu init` path cannot work until a new package is published.

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

## Publish sequence

1. Merge the reviewed v0.7.0 changes.
2. Confirm npm authentication with `npm whoami`.
3. Publish with `npm publish --access public`.
4. Verify `npm view @focaxisdev/deja-vu version bin --json` reports v0.7.0 and all four binaries.
5. Test `npx @focaxisdev/deja-vu init --dry-run` from an empty temporary directory.
6. Create the v0.7.0 GitHub release from the verified commit.
7. Update the GitHub description, topics, and social preview.
8. Use the prepared launch copy only after the public quick start succeeds.

Do not publish, tag, or announce from an unverified working tree.
