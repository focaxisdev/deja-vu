# Deja Vu Starter Kit

Add this starter kit to any repo root to give coding agents durable project memory.

## Fastest Setup

The optional CLI creates the starter files without replacing existing files:

```bash
npx @focaxisdev/deja-vu init
```

If the repo already has `AGENTS.md`, preserve it and append a marked, idempotent Deja Vu rules block:

```bash
npx @focaxisdev/deja-vu init --merge-agents
```

## Copy Without npm

After cloning Deja Vu, copy this directory into the target repo root.

macOS or Linux:

```bash
cp -R starter-kit/. /path/to/your-repo/
```

PowerShell:

```powershell
Copy-Item -Path .\starter-kit\* -Destination C:\path\to\your-repo -Recurse -Force
```

If the target already has `AGENTS.md`, merge the Deja Vu sections manually instead of replacing its current project rules.

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
