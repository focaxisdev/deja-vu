# Deja Vu Project Memory Rules

## Memory Identity

- Protocol: Deja Vu Protocol v0.4
- Scope: `project:deja-vu`
- Memory root: `memory/`

For the full protocol details, see docs/protocol.md.

## Recall Before Substantial Work

Before substantial planning, coding, release preparation, or documentation changes:

1. Inspect `memory/impressions.jsonl` for familiar cues.
2. If there is no familiarity, do not load memory by default.
3. If familiarity is weak, read `memory/summary.md`.
4. If familiarity is strong, read only the 1-3 linked records needed for the task.
5. Do not load the whole memory tree unless the user explicitly asks.

## Durable Writeback Only

Write back only durable project memory:

- accepted product positioning
- protocol or starter-kit decisions
- CLI scope decisions
- release readiness notes
- unresolved follow-ups
- safety or privacy constraints

Never store secrets, full transcripts, PII, raw logs, low-signal chatter, or disposable exploration noise.

## Verification Loop

For implementation or repair work:

1. Define the scope, exclusions, baseline revision and acceptance checklist before changing code. Preserve unrelated user changes and original requirements.
2. Make acceptance observable: include relevant source and compiled tests, types, package/install/use checks, regression coverage, behavior/quality checks and accurate documentation. Distinguish case counts from file-level summaries.
3. Keep evidence for each failure: command, environment, revision, exit status, original error/cause and the smallest reproducible example. Do not replace an operational error with a secondary parsing error.
4. Follow failure -> diagnosis -> focused correction -> affected regression tests -> full acceptance. State the hypothesis and use a check that can distinguish it from alternatives.
5. After two iterations without new evidence or improvement, change the hypothesis or strategy. Do not endlessly retry the same failure or spend the loop on unrelated polish.
6. Never weaken assertions, skip failing cases, hide errors or change security controls to obtain a green result. Use runtime/execution alternatives only when authorized and established not to bypass restrictions.
7. Finish only when acceptance passes or a genuine external blocker is demonstrated. For a blocker, preserve a reproducible checkpoint, identify the blocked gates and exact resource/permission needed, and report it as blocked rather than passed.
8. Review the final diff, document measured effects and limitations, and verify repository status. Commit, push, merge or publish only within the user's authorization. Task-specific data/privacy constraints take precedence over a generic verification command.
