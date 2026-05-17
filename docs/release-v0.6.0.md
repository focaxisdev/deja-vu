# Deja Vu v0.6.0 Candidate Checklist

v0.6.0 is the adoption release: Deja Vu becomes a copy-first, three-file project memory starter kit with optional CLI support.

## Product Surface

- README first screen leads with "A 3-file memory system for any capable AI coding agent."
- Starter kit can be copied into a repo root.
- Per-agent prompts exist for Codex, Claude Code, Cursor, Windsurf, ChatGPT, and Gemini CLI.
- npm package remains optional.
- TypeScript engine remains below the fold as an acceleration layer.

## CLI Surface

- `deja-vu init` creates missing starter files only.
- `deja-vu init --dry-run` previews file operations.
- `deja-vu init --agents all` adds per-agent prompts.
- `deja-vu doctor` checks required files, JSONL, feedback routes, memory bloat, transcript-like content, and obvious secrets.
- `deja-vu explain` prints a short protocol explanation.

## Release Verification

Run before tagging or publishing:

```bash
npm run test:src:readonly
npm run lint:memory
npm run report:feedback
npm run build
npm run test:pack
```

`npm run test:pack` may rebuild `dist` through `prepack`. Do not treat it as a read-only test.

## Version Policy

- Package version can move to `0.6.0` only after release approval.
- Protocol remains `Deja Vu Protocol v0.4` unless the normative behavior changes.
- `schema_version` values in JSONL remain independent from package and protocol versions.

## Pre-Release Checks

- Confirm README links resolve.
- Confirm `starter-kit/` is included in npm pack output.
- Confirm `package-lock.json` bin metadata matches `package.json`.
- Confirm `.gitignore` keeps `SNS/` ignored and launch copy lives in `docs/`.
- Confirm examples pass memory lint.
- Confirm no public memory sample contains secrets, PII, or raw transcripts.
- Decide whether to add GitHub Actions before release.
