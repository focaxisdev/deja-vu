---
id: decision-protocol-first-positioning
title: Position Deja Vu as a protocol-first memory system
status: active
scope: project:example-protocol-project
updated: 2026-04-20
---

# Position Deja Vu as a protocol-first memory system

## Date

2026-04-20

## Decision

The primary Deja Vu adoption path uses rules, workflow, and Markdown memory files. The TypeScript engine remains optional.

## Rationale

This keeps the system simpler, more portable, and usable across more agent environments.

## Consequences

- the repo is the primary product surface
- Markdown memory becomes the canonical default storage shape
- the engine is documented as an optional enhancement layer

## Related records

- [Example summary](../summary.md)
- [Project context](../context/project-context.md)
