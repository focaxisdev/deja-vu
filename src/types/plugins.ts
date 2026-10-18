import type {
  AddMemoryInput,
  FamiliarityRecord,
  MemoryChunk,
  RecallInput,
  ScoredCandidate,
  SummaryRecord,
  StoredMemory,
} from "./memory.js";

export interface EmbeddingScope {
  embed(text: string): Promise<number[]>;
  /** Must synchronously release this scope and prevent late cache insertion; must not throw. */
  dispose(): void;
}

export interface EmbeddingProvider {
  embed(text: string): Promise<number[]>;
  /** Optional independent cache ownership; implementations must not share entries across scopes. */
  createScope?(): EmbeddingScope;
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

export interface ImpressionSearchHit {
  record: FamiliarityRecord;
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
  /** Optional complete snapshot, including raw timestamps, for recoverable updates. */
  getMemorySnapshot?(id: string): Promise<StoredMemory | null>;
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
  searchImpressions(tokens: string[], topK: number): Promise<ImpressionSearchHit[]>;
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
  /** Opt in to preserving summaries/chunks/vectors for importance/metadata-only updates. */
  preserveDerivedOnMetadataUpdate?: boolean;
  /** Exact, bounded, host-authored query routing. No automatic translation. */
  cueAliases?: readonly import("../retrieval/cue-aliases.js").CueAlias[];
  /** Opt in to per-memory/revision cache ownership and serialized reads; requires provider.createScope. */
  manageEmbeddingCache?: boolean;
  /** Serialize this engine instance's reads with writes; adapters shared by other engines need transactions. */
  consistentReads?: boolean;
  thresholds?: {
    strong: number;
    weak: number;
  };
}
