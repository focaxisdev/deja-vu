# Architecture

This document describes the optional engine architecture inside the protocol-first Deja Vu repository.

## Product layering

Deja Vu now has two layers:

1. the protocol layer
2. the optional semantic engine layer

The protocol layer defines:

- rules
- workflow
- Markdown memory conventions

The engine layer adds:

- familiarity scoring
- threshold-gated summary loading
- chunk retrieval
- plugin seams for embeddings, storage, and vector search

This is product layering, not a reduction of the memory model.

## Engine flow

1. `addMemory(input)` runs a write pipeline.
2. The pipeline creates a short summary for the familiarity layer.
3. It creates a structured summary for the summary layer.
4. It chunks the raw content for detail-level recall.
5. Each layer gets its own embeddings and storage writes.
6. `recall(query)` searches the familiarity layer first.
7. Thresholds decide whether summary or chunks can be loaded.

## Layer model

- Impression/Familiarity Index: fast ANN-friendly metadata, short summaries, and compact keyword tokens.
- Summary Layer: compact agent-readable understanding of the memory.
- Memory Chunks: detailed recall units scoped to a single memory id.

The protocol-first path mirrors this with `memory/impressions.jsonl`, `memory/summary.md`, and detailed Markdown records.

## Plugin seams

- `EmbeddingProvider`
- `FamiliarityVectorStore`
- `ChunkVectorStore`
- `MemoryStorage`
- `ScoringStrategy`
- `Chunker`
- `SummaryGenerator`

## Important boundary

The engine architecture does not replace the Deja Vu protocol.

The host still owns:

- project scope discipline
- pre-task recall behavior
- post-task writeback judgment
- compaction and supersession policy
