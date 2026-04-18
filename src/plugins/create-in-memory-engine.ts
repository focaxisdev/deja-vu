import { SemanticRecallEngine } from "../core/semantic-recall-engine.js";
import { MockEmbeddingProvider } from "./mock-embedding-provider.js";
import { InMemoryStorage } from "../storage/in-memory-storage.js";
import {
  InMemoryChunkVectorStore,
  InMemoryFamiliarityVectorStore,
} from "../storage/in-memory-vector-store.js";
import type { SemanticRecallEngineConfig } from "../types/plugins.js";

export function createInMemorySemanticRecallEngine(
  config: Partial<SemanticRecallEngineConfig> = {},
): SemanticRecallEngine {
  return new SemanticRecallEngine({
    embeddingProvider: config.embeddingProvider ?? new MockEmbeddingProvider(),
    familiarityVectorStore: config.familiarityVectorStore ?? new InMemoryFamiliarityVectorStore(),
    chunkVectorStore: config.chunkVectorStore ?? new InMemoryChunkVectorStore(),
    storage: config.storage ?? new InMemoryStorage(),
    scoringStrategy: config.scoringStrategy,
    chunker: config.chunker,
    summaryGenerator: config.summaryGenerator,
    thresholds: config.thresholds,
  });
}
