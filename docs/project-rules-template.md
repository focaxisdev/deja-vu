# Project Rules Template

This document is a copyable template for a project-level `AGENTS.md` or equivalent rules file.

Use it when integrating Deja Vu as the long-term memory system for one project.

## Template

```md
# Deja Vu Project Memory Rules

## Memory engine location

- Deja Vu repository path: `<ABSOLUTE_PATH_TO_DEJA_VU_REPO>`
- Handshake reference: `<ABSOLUTE_PATH_TO_DEJA_VU_REPO>\\docs\\agent-handshake.md`
- Bootstrap reference: `<ABSOLUTE_PATH_TO_DEJA_VU_REPO>\\docs\\bootstrap-instructions.md`

## Scope

- This project uses single-project memory scope only.
- Use a stable scope id in the form `project:<project-id>`.
- Do not mix this project's memory with other repositories.

## Required memory flow

Before substantial planning, coding, or answering:

1. Build a recall query from the current task, user request, and active repository context.
2. Query the Deja Vu memory system for this project's scope.
3. Inject summary-level memory by default.
4. Load chunk-level memory only for strong matches or when detailed continuity is required.

After meaningful work completes:

1. Write back only durable, reusable memory.
2. Prefer decisions, architecture intent, unresolved follow-up items, milestone summaries, and stable user preferences.
3. Do not store every conversational turn.
4. Do not store low-signal chatter or temporary exploration noise.

## Persistence

- Use persistent storage for project memory.
- Do not rely on in-memory-only adapters for continuity across new conversations.

## Safety

- Do not write secrets, tokens, or credentials into memory.
- Do not inject large historical chunks into prompt context by default.
- Do not treat weak similarity as permission to load full historical detail.

## Bootstrap behavior

If Deja Vu is present but not yet integrated:

1. Read the Deja Vu README and handshake documents.
2. Propose or create the required project memory bridge.
3. Reuse existing persistent adapters if the host project already has them.
4. If no integration exists yet, tell the user exactly what must be added.
```

## How to use this template

1. Replace `<ABSOLUTE_PATH_TO_DEJA_VU_REPO>`.
2. Replace `<project-id>` with a stable repository identifier.
3. Copy the template into the target project's `AGENTS.md` or equivalent rule file.
4. Adjust host-specific adapter paths if the project already has a memory bridge.
