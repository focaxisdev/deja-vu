# Markdown Storage Contract

This document defines the canonical Markdown storage layout for Deja Vu MVP.

## Required Layout

```text
memory/
  index.md
  summary.md
  impressions.jsonl
  events/
  context/
    project-context.md
  decisions/
  open-loops/
```

Agents may add more files, but these paths are the stable minimum.

## File Roles

### `memory/index.md`

Purpose:

- quick discovery
- top-level recall entrypoint
- map from topics to detailed records

Required sections:

- current project scope
- active summary pointer
- active decisions list
- active open loops list
- superseded or archived record references

### `memory/summary.md`

Purpose:

- compact project understanding
- first document to inject or read during recall

Required fields:

- project id
- status
- last updated
- current objective
- key constraints
- active priorities
- linked decisions
- linked open loops

### `memory/impressions.jsonl`

Purpose:

- cheap familiarity scanning
- keyword-to-record routing
- avoiding unnecessary summary or detail reads

Each line must be one JSON object with:

- `id`
- `scope`
- `title`
- `keywords`
- `record_path`
- `updated`

### `memory/events/`

Purpose:

- cheap long-term trace of meaningful work
- support "we did this before" discovery without promoting every event into durable memory

Event entries should stay short. Promote only reusable decisions, context, preferences, and open loops into durable memory records.

### `memory/context/project-context.md`

Purpose:

- stable facts that describe the project
- background that changes slower than individual tasks

Recommended fields:

- project identity
- current product definition
- major constraints
- known boundaries
- terminology

### `memory/decisions/*.md`

Purpose:

- record durable decisions and their reasoning

Required fields:

- id
- title
- status
- date
- scope
- decision
- rationale
- consequences
- related records

### `memory/open-loops/*.md`

Purpose:

- track unresolved follow-up work that should survive chat resets

Required fields:

- id
- title
- status
- owner
- opened
- next trigger
- why it matters
- related records

## Canonical Metadata Style

Use simple YAML frontmatter for deterministic parsing.

Required frontmatter keys:

- `id`
- `title`
- `status`
- `scope`
- `updated`

Additional keys are allowed when they improve clarity.

## Linking Rules

- `memory/index.md` must link to every active decision and open loop.
- `memory/summary.md` must link to the currently authoritative records.
- Detailed records should link back to summary or sibling records when useful.

## Supersession Rules

When a record is replaced:

- set the older record status to `superseded`
- add a `superseded_by` reference in the older record
- add a `supersedes` reference in the newer record
- update `memory/index.md` to highlight the newer record

## Human-First Rule

Markdown is the primary storage contract because it is:

- readable by humans
- readable by agents
- portable across tools
- easy to diff and review

Do not require JSON as a parallel source of truth in MVP.
