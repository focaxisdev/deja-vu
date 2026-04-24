# Cue-First Protocol Example

This example shows how to adopt Deja Vu without npm or the optional TypeScript engine.

## Minimum Files

- `AGENTS.md`
- `memory/summary.md`
- `memory/impressions.jsonl`

- `memory/recall-feedback.jsonl`

## Optional Scale-Up Files

- `memory/index.md`
- `memory/events/`
- `memory/context/project-context.md`
- `memory/decisions/`
- `memory/open-loops/`

## Flow

1. Add the rules file to the project.
2. Add the minimum memory files.
3. Run the impression scan script before substantial work.
4. Use `memory/summary.md` for weak matches and one to three detailed records for strong matches.
5. Update detailed memory files only when new durable information appears.

6. Add recall feedback only when a helpful, irrelevant, missed, or overloaded recall should tune future cues.

From this example directory, the repository script can be tested with:

```bash
node ../../scripts/dejavu-scan-memory.mjs "protocol impression memory"
```
