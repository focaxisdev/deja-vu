# Deja Vu Compared

Deja Vu is not trying to store more.
Deja Vu is trying to recall less, better.

| Approach | Setup cost | Token cost | Privacy | Portability | Works across agents | Human readable | Git-friendly | Risk of memory noise | Best use case |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Deja Vu | Copy three files, optional CLI | Low: cue scan first, summary only when needed | Repo-local; user controls files | High: Markdown and JSONL | High for agents that read files and follow instructions | High | High | Medium-low if cues stay sparse | Project memory for AI coding work |
| Vector DB memory | Database, embeddings, indexing, retrieval code | Medium: retrieval can overfetch | Depends on hosting and data flow | Medium-low: tied to stack choices | Medium: usually app/framework specific | Low-medium | Low | Medium-high if chunks are noisy | Large semantic retrieval over many documents |
| Hosted memory service | Account, API key, SDK, integration | Medium: service decides retrieved context | Depends on vendor | Low-medium: vendor-specific | Medium: usually API/client specific | Low | Low | Medium: hidden memory can drift | Production user or agent memory with managed infra |
| Screen/context capture memory | Desktop/app permissions and capture pipeline | High: captured context can be broad | Sensitive by default | Low: tool-specific | Low-medium | Low | Low | High: captures too much | Recovering UI/session state |
| Agent runtime framework | Framework install, app architecture, tools | Medium-high | Depends on framework and storage | Medium-low | Low-medium: runtime-specific | Low-medium | Medium | Medium | Building full agent applications |
| Simple project notes | Create a notes file | Medium: humans or agents may load too much | Repo-local | High | High | High | High | Medium-high: no recall discipline | Small teams needing informal project notes |
| Full chat transcript archive | Export or save chats | Very high if loaded | Risky: often contains sensitive data | Medium | Medium | Medium | Medium-low | Very high | Audit trail, not active recall |

## Core Distinction

Most memory systems start with storage:

```text
capture more -> index more -> retrieve more
```

Deja Vu starts with recognition:

```text
task cue -> tiny scan -> minimal recall -> durable writeback
```

The base product is intentionally small:

- one repo memory
- any capable coding agent
- three files first
- no database
- no vector store
- no embeddings
- no SaaS
- no daemon
- no required npm install

Use Deja Vu when the problem is not "search my entire knowledge base." Use it when the problem is "stop making me re-explain why this repo works the way it does."
