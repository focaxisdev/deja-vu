# Deja Vu v0.1.0

Deja Vu is now framed as a protocol-first memory system for AI agents.

This release centers the repo-first adoption path:

- rules
- workflow
- Markdown memory templates
- project-scoped continuity

The optional TypeScript engine remains included for hosts that want semantic recall and threshold-gated loading.

## Primary adoption path

Start with:

- `docs/protocol.md`
- `docs/workflow.md`
- `docs/storage-markdown.md`
- `docs/templates/`

This path does not require npm or engine-backed retrieval.

## Optional engine path

If a host wants semantic recall:

```bash
npm install @focaxisdev/deja-vu
```

Use the TypeScript engine as an enhancement layer, not as the full product definition.

## Included in this release

- protocol spec
- workflow spec
- Markdown storage contract
- copyable project rules template
- copyable memory templates
- protocol-first example project
- optional `SemanticRecallEngine` package and engine examples

## Current limits

- base protocol compaction is workflow-driven, not automated
- the engine still ships only in-memory demo adapters by default
- persistent engine-backed deployment still requires host-supplied adapters

## Links

- Repo: https://github.com/focaxisdev/deja-vu
- Docs: https://github.com/focaxisdev/deja-vu/tree/main/docs
- Changelog: https://github.com/focaxisdev/deja-vu/blob/main/CHANGELOG.md
