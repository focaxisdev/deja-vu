import type {
  AddMemoryInput,
  FamiliarityRecord,
  MemoryChunk,
  RecallInput,
  ScoredCandidate,
  SummaryRecord,
} from "./memory.js";

export interface EmbeddingProvider {
  embed(text: string): Promise<number[]>;
}

export interface Chunker {
  chunk(input: AddMemoryInput, now: string): MemoryChunkSeed[];
}

export interface MemoryChunkSeed {
  type: MemoryChunk["type"];
  content: string;
  importance?: number;
}

export interface SummaryGenerator {
  generateShortSummary(input: AddMemoryInput): Promise<string>;
  generateStructuredSummary(input: AddMemoryInput): Promise<{
    description: string;
    context: string;
    architectureOrIntent: string;
    recentUpdates: string[];
    metadata: SummaryRecord["metadata"];
  }>;
}

export interface VectorSearchHit {
  id: string;
  similarity: number;
}

export interface FamiliarityVectorStore {
  upsert(record: FamiliarityRecord): Promise<void>;
  remove(id: string): Promise<void>;
  search(vector: number[], topK: number): Promise<VectorSearchHit[]>;
}

export interface ChunkVectorStore {
  upsert(chunks: MemoryChunk[]): Promise<void>;
  removeByMemoryId(memoryId: string): Promise<void>;
  searchByMemoryId(memoryId: string, vector: number[], topK: number): Promise<VectorSearchHit[]>;
}

export interface MemoryStorage {
  saveFamiliarity(record: FamiliarityRecord): Promise<void>;
  saveSummary(record: SummaryRecord): Promise<void>;
  saveChunks(chunks: MemoryChunk[]): Promise<void>;
  saveRawContent(memoryId: string, content: string, createdAt: string, updatedAt: string): Promise<void>;
  getFamiliarity(id: string): Promise<FamiliarityRecord | null>;
  getSummary(id: string): Promise<SummaryRecord | null>;
  getChunks(id: string): Promise<MemoryChunk[]>;
  getRawContent(id: string): Promise<string | null>;
  deleteMemory(id: string): Promise<void>;
  listFamiliarities(): Promise<FamiliarityRecord[]>;
  touchMemory(id: string, lastAccessedAt: string): Promise<void>;
}

export interface ScoringBreakdown {
  semanticSimilarity: number;
  recencyWeight: number;
  importanceWeight: number;
  score: number;
}

export interface ScoringStrategy {
  score(record: FamiliarityRecord, similarity: number): ScoringBreakdown;
  rank(records: Array<{ record: FamiliarityRecord; similarity: number }>): ScoredCandidate[];
}

export interface SemanticRecallEngineConfig {
  embeddingProvider: EmbeddingProvider;
  familiarityVectorStore: FamiliarityVectorStore;
  chunkVectorStore: ChunkVectorStore;
  storage: MemoryStorage;
  scoringStrategy?: ScoringStrategy;
  chunker?: Chunker;
  summaryGenerator?: SummaryGenerator;
  thresholds?: {
    strong: number;
    weak: number;
  };
}
