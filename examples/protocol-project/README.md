# Protocol-First Example

This example shows how to adopt Deja Vu without npm or the optional TypeScript engine.

## Files

- `AGENTS.md`
- `memory/index.md`
- `memory/summary.md`
- `memory/impressions.jsonl`
- `memory/events/`
- `memory/context/project-context.md`
- `memory/decisions/`
- `memory/open-loops/`

## Flow

1. Add the rules file to the project.
2. Add the memory directory.
3. Run the impression scan script before substantial work.
4. Use `memory/summary.md` and detailed records only when the scan justifies it.
5. Update detailed memory files only when new durable information appears.

From this example directory, the repository script can be tested with:

```bash
node ../../scripts/dejavu-scan-memory.mjs "protocol impression memory"
```
