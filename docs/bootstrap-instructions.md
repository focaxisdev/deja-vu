# Bootstrap Instructions

This document tells an agent how to bootstrap Deja Vu into a single project so new conversations can keep using the same memory discipline.

## Goal

Turn Deja Vu from a discovered local repository into a project-level memory integration with stable rules.

## Trigger conditions

Bootstrap when at least one of these is true:

- the user asks to integrate Deja Vu into the current project
- the current project rules explicitly reference Deja Vu
- the user says the project should retain memory across new conversations

## Bootstrap checklist

### 1. Confirm repository paths

- confirm the active project path
- confirm the Deja Vu repository path

### 2. Read the contract files

Read:

1. `README.md`
2. `docs/agent-handshake.md`
3. `docs/project-rules-template.md`
4. `src/types/plugins.ts`
5. `src/types/memory.ts`

### 3. Decide whether integration already exists

Check whether the host project already has:

- a project rules file such as `AGENTS.md`
- a memory bridge or middleware
- persistent storage for memory
- an embedding provider
- vector search support

If these already exist, integrate with the existing host shape instead of creating a competing path.

### 4. Establish project scope

Use a stable scope id:

- `project:<project-id>`

Do not mix this scope with other projects.

### 5. Ensure rules persistence across new conversations

If the project lacks explicit memory rules, create or update project rules so future conversations can discover:

- where Deja Vu lives
- which scope to use
- when to recall
- when to write back
- what not to store

### 6. Connect the host workflow

The host integration should support:

1. pre-task recall
2. summary-first prompt injection
3. chunk loading only when justified
4. selective post-task writeback
5. persistent storage across new conversations

### 7. Report gaps clearly

If integration cannot be completed, report the exact missing pieces, such as:

- no persistent storage adapter
- no embedding provider
- no vector store
- no writable project rules file

## Expected result

After bootstrap, a new conversation in the same project should not depend on the previous chat transcript alone. It should be able to rediscover Deja Vu through project rules and reuse the same project memory scope.
