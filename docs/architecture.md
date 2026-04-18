# Architecture

Deja Vu is built around a familiarity gate instead of an eager retrieval loop.

## Flow

1. `addMemory(input)` runs a write pipeline.
2. The pipeline creates a short summary for the familiarity layer.
3. It creates a structured summary for the summary layer.
4. It chunks the raw content for detail-level recall.
5. Each layer gets its own embeddings and storage writes.
6. `recall(query)` searches the familiarity layer first.
7. Thresholds decide whether summary or chunks can be loaded.

## Layer model

- Familiarity Index: fast ANN-friendly metadata and short summaries only.
- Summary Layer: compact agent-readable understanding of the memory.
- Memory Chunks: detailed recall units scoped to a single memory id.

## Plugin seams

- `EmbeddingProvider`
- `FamiliarityVectorStore`
- `ChunkVectorStore`
- `MemoryStorage`
- `ScoringStrategy`
- `Chunker`
- `SummaryGenerator`
