# Deja Vu Starter Kit

Copy this folder into any repo root to add Deja Vu project memory.

```bash
cp -R starter-kit/. .
```

The minimum useful setup is three files:

- `AGENTS.md`
- `memory/summary.md`
- `memory/impressions.jsonl`

This starter kit also includes optional empty scale-up surfaces:

- `memory/recall-feedback.jsonl`
- `memory/decisions/`
- `memory/open-loops/`
- `prompts/`

Use the optional files only when they help future agents recall less, better.

## First Agent Prompt

Paste one prompt from `prompts/` into your agent session, then ask for real work.

The agent should:

1. read `AGENTS.md`
2. scan `memory/impressions.jsonl`
3. read `memory/summary.md` only when useful
4. read at most 1-3 detailed records for strong matches
5. write back only durable memory

Do not store secrets, API keys, PII, full transcripts, or low-value chatter.

If this is a public repo, memory files can be committed and shared like any other project file. Run `deja-vu doctor` when available, but still review memory manually because doctor only catches obvious sensitive content.
