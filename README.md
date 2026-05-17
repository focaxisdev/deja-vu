# Deja Vu

**A 3-file memory system for any capable AI coding agent.**

Stop re-explaining your repo every time you start a new Codex, Claude Code, Cursor, Windsurf, ChatGPT, or Gemini CLI session.

Deja Vu gives your project a tiny, repo-local memory layer:

- `AGENTS.md` tells agents how to recall and write memory.
- `memory/summary.md` keeps durable project context.
- `memory/impressions.jsonl` stores tiny recall cues.

No database. No vector store. No embeddings. No SaaS. No daemon. No required npm install.

Just copy three files into your repo.

```text
Task
  -> scan tiny cues
  -> no familiarity: load nothing
  -> weak familiarity: load summary
  -> strong familiarity: load 1-3 linked records
  -> work
  -> write back durable memory only
```

Deja Vu is not trying to store more.
Deja Vu is trying to recall less, better.

## 2-Minute Start

Copy the starter kit into any repo:

```bash
cp -R starter-kit/. .
```

Or use the optional CLI:

```bash
npx @focaxisdev/deja-vu init --agents all
```

Then paste this into your next agent session:

```text
Follow AGENTS.md. Before substantial planning or code changes, scan memory/impressions.jsonl for familiar cues. If familiarity is weak, read memory/summary.md. If familiarity is strong, read only the 1-3 linked detailed records needed for this task. Do not load the whole memory tree unless I ask. After the task, write back only durable decisions, architecture intent, stable preferences, unresolved follow-ups, or milestone summaries. Never store secrets, full transcripts, low-signal chatter, or disposable exploration noise.
```

That is the base product. Scripts, feedback, decision records, open loops, and the TypeScript engine are optional scale-up paths.

## Before / After

Before Deja Vu:

- "Remember, we already decided not to use X because Y..."
- "Here is the architecture again..."
- "Please do not break the IME workaround we fixed last week..."
- "The agent forgot the open issue from the previous session..."

After Deja Vu:

- "Follow AGENTS.md and scan memory/impressions.jsonl before planning."
- The agent loads only relevant project memory.
- Durable decisions survive across new chats.
- Low-value chat noise is not stored.

## What It Is

Deja Vu is a repo-level memory convention:

| It is | It is not |
| --- | --- |
| three repo-local files first | a vector database |
| Markdown and JSONL | a hosted memory service |
| agent-readable project rules | an agent runtime |
| git-friendly durable memory | a required npm package |
| low-token recall discipline | a full chat transcript archive |

The memory lives in the repo, not inside one vendor.

Any capable coding agent can follow the protocol when it can read project files, follow instructions, respect a memory budget, and update files. For chat-only agents, paste the prompt and provide the relevant memory files manually.

## The Three Files

### `AGENTS.md`

Tells agents how to use Deja Vu:

- read project instructions first
- scan cues before substantial work
- load summary only when needed
- load 1-3 detailed records for strong matches
- write back only durable memory
- never store sensitive or noisy content

### `memory/summary.md`

Keeps compact project truth:

- current objective
- durable constraints
- active priorities
- linked decisions
- unresolved follow-ups

It is not a chat log.

### `memory/impressions.jsonl`

Keeps tiny cue routes:

```json
{"schema_version":1,"id":"summary","scope":"project:your-repo","title":"Project summary","keywords":["architecture","constraints","priorities"],"record_path":"memory/summary.md","updated":"2026-05-16","weight":0.7,"status":"active"}
```

Agents scan these cues before spending tokens on bigger memory files.

## Agent Prompts

Copy a short prompt for the tool you use:

- [Codex](./starter-kit/prompts/codex.md)
- [Claude Code](./starter-kit/prompts/claude-code.md)
- [Cursor](./starter-kit/prompts/cursor.md)
- [Windsurf](./starter-kit/prompts/windsurf.md)
- [ChatGPT](./starter-kit/prompts/chatgpt.md)
- [Gemini CLI](./starter-kit/prompts/gemini-cli.md)

The prompts all enforce the same budget:

- scan `memory/impressions.jsonl` first
- read `memory/summary.md` only for weak familiarity
- read at most 1-3 detailed records for strong familiarity
- never load the whole memory tree by default
- write back only durable memory

## Optional CLI

The CLI exists to support the three-file protocol. It is not required.

```bash
npx @focaxisdev/deja-vu init --dry-run
npx @focaxisdev/deja-vu init --agents codex,claude-code
npx @focaxisdev/deja-vu doctor --json
npx @focaxisdev/deja-vu explain
```

`init` creates missing files only. It does not overwrite existing files unless you pass `--force`.

`doctor` checks whether a repo has a usable Deja Vu setup, validates JSONL, warns about memory bloat and transcript-like content, and flags obvious secrets.

For public repos, remember that tracked memory files are public project files. `doctor` can catch obvious risks, but it is not a complete secret or PII scanner.

Existing focused tools still work:

```bash
deja-vu-scan-memory "current task"
deja-vu-lint-memory --memory-root memory
deja-vu-feedback-report --memory-root memory
```

## Protocol

The Deja Vu lifecycle is:

1. Scan tiny cues.
2. Classify familiarity: none, weak, or strong.
3. Load the smallest useful memory.
4. Work normally.
5. Write back durable memory only.
6. Compact or retire stale memory when recall gets noisy.

Default recall budget:

- impression scan: always allowed
- summary: at most one file
- detailed records: one to three files
- full memory tree: forbidden unless explicitly requested

Write back only:

- accepted decisions
- architecture intent
- stable preferences
- unresolved follow-ups
- milestone summaries
- recall feedback that should tune future cues

Never write back:

- secrets, tokens, credentials, or private keys
- full turn-by-turn transcripts
- customer/user PII
- low-signal chatter
- disposable exploration noise

Read the full spec in [docs/protocol.md](./docs/protocol.md).

## Docs

- [Starter kit](./starter-kit/README.md)
- [Comparison](./docs/comparison.md)
- [Agent compatibility](./docs/agent-compatibility.md)
- [Flow diagram](./docs/diagrams/deja-vu-flow.md)
- [Demo walkthrough](./docs/demo-walkthrough.md)
- [Protocol](./docs/protocol.md)
- [Workflow](./docs/workflow.md)
- [Markdown storage contract](./docs/storage-markdown.md)
- [Impression layer](./docs/impression-layer.md)
- [Scripted recall](./docs/scripted-recall.md)
- [Launch copy](./docs/launch-copy.md)
- [llms.txt](./llms.txt)

## Optional Engine Layer

This repository still includes the existing TypeScript semantic recall engine.

Use it when you want:

- stronger familiarity scoring
- threshold-gated summary and chunk loading
- embedding and vector ranking
- an engine-backed implementation of the Deja Vu protocol

Do not treat the engine as the product center. It is an optional acceleration layer after the repo-local memory protocol is already useful.

```bash
npm install @focaxisdev/deja-vu
```

```ts
const engine = new SemanticRecallEngine(config);

await engine.addMemory(input);
await engine.scanImpressions(query);
await engine.recall(query);
await engine.getSummary(id);
await engine.getChunks(id);
await engine.updateMemory(id, input);
await engine.deleteMemory(id);
```

## Examples

- Protocol-first example: [examples/protocol-project](./examples/protocol-project)
- Engine example: `npm run example:basic`
- Engine example: `npm run example:agent-pm`
- Engine example: `npm run example:chat-memory`
- Engine example: `npm run example:task-assistant`

## Development

```bash
npm install
npm run build
npm run test:src:readonly
npm run lint:memory
npm run report:feedback
```

`npm run test` rebuilds `dist`. Use `test:src:readonly` when you want source tests without build output side effects.
