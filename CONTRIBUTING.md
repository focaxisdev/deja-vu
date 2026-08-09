# Contributing to Deja Vu

Thanks for helping make project memory simpler and safer for coding agents.

## Product boundary

Deja Vu is protocol-first:

- the three-file starter kit is the main product
- Markdown and JSONL remain canonical and human-readable
- the CLI is an optional helper
- the TypeScript engine is an optional scale-up layer

Changes should reduce repeated explanation, recall cost, or memory noise without turning the base product into a hosted service or heavy framework.

## Before opening a pull request

1. Keep the change focused and explain the user problem it solves.
2. Add or update tests for behavior changes.
3. Keep public examples sanitized; never add secrets, PII, raw transcripts, or private project facts.
4. Run the relevant verification:

```bash
npm ci
npm run test:src:readonly
npm run check:links
npm run lint:memory
npm run report:feedback
npm test
```

`npm test` rebuilds `dist` and runs npm package verification. `npm run test:src:readonly` is the read-only source-test path.

## Good first contributions

- clearer starter-kit instructions
- compatibility notes backed by actual agent behavior
- safer memory lint rules with low false-positive rates
- small, sanitized protocol examples
- documentation fixes and reproducible bug reports

For larger protocol or architecture changes, open an issue first so the behavior and compatibility impact can be discussed before implementation.
