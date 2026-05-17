# Deja Vu Flow

```mermaid
flowchart TD
  A["Task"] --> B["Tiny cue scan<br/>memory/impressions.jsonl"]
  B --> C{"Familiarity?"}
  C -->|None| D["Load no memory by default"]
  C -->|Weak| E["Load memory/summary.md"]
  C -->|Strong| F["Load 1-3 linked detailed records"]
  D --> G["Work"]
  E --> G
  F --> G
  G --> H{"Durable outcome?"}
  H -->|No| I["Skip writeback"]
  H -->|Yes| J["Write durable memory only"]
  J --> K["Update summary, impressions,<br/>decision, open-loop, or feedback"]
```

ASCII fallback:

```text
Task
  |
  v
Tiny cue scan
  |
  v
No familiarity   -> load nothing
Weak familiarity -> load summary
Strong familiarity -> load 1-3 detailed records
  |
  v
Work
  |
  v
Durable writeback only
```

The point is not to replay old context. The point is to recognize when a task deserves more context.
