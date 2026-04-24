export type MemoryChunkType =
  | "task"
  | "decision"
  | "note"
  | "issue"
  | "spec"
  | "prompt"
  | "conversation"
  | "roadmap";

export interface MemoryMetadata {
  [key: string]: string | number | boolean | string[] | undefined;
}

export interface AddMemoryInput {
  id?: string;
  title: string;
  content: string;
  tags?: string[];
  context?: string;
  architectureOrIntent?: string;
  recentUpdates?: string[];
  importance?: number;
  metadata?: MemoryMetadata;
  chunkStrategy?: {
    maxCharacters?: number;
    overlapCharacters?: number;
    preferredTypes?: MemoryChunkType[];
  };
}

export interface UpdateMemoryInput extends Partial<AddMemoryInput> {
  content?: string;
}

export interface FamiliarityRecord {
  id: string;
  title: string;
  shortSummary: string;
  tags: string[];
  impressionTokens: string[];
  lastAccessedAt: string;
  importance: number;
  embeddingVector: number[];
}

export interface SummaryRecord {
  id: string;
  description: string;
  context: string;
  architectureOrIntent: string;
  recentUpdates: string[];
  metadata: MemoryMetadata;
  embeddingVector: number[];
}

export interface MemoryChunk {
  chunkId: string;
  memoryId: string;
  type: MemoryChunkType;
  content: string;
  createdAt: string;
  updatedAt: string;
  importance: number;
  embeddingVector: number[];
}

export interface StoredMemory {
  familiarity: FamiliarityRecord;
  summary: SummaryRecord;
  chunks: MemoryChunk[];
  rawContent: string;
  createdAt: string;
  updatedAt: string;
}

export interface ScoredCandidate {
  id: string;
  title: string;
  shortSummary: string;
  impressionTokens: string[];
  semanticSimilarity: number;
  recencyWeight: number;
  importanceWeight: number;
  score: number;
  familiarityLevel: FamiliarityLevel;
}

export type FamiliarityLevel = "strong" | "weak" | "none";
export type RecallOutcome = "helpful" | "irrelevant" | "missed" | "overloaded";

export interface RecallBudgetReport {
  impressionScan: 1;
  summariesLoaded: number;
  chunksLoaded: number;
  detailRecordsLoaded: number;
  whyLoaded: string[];
}

export interface ImpressionScanResult {
  matched: boolean;
  candidates: ScoredCandidate[];
  topMatch: ScoredCandidate | null;
  score: number;
  familiarityLevel: FamiliarityLevel;
  budget: RecallBudgetReport;
}

export interface RecallInput {
  text: string;
  topK?: number;
  loadChunks?: boolean;
  chunkLimit?: number;
}

export interface RecallResult {
  matched: boolean;
  candidates: ScoredCandidate[];
  topMatch: ScoredCandidate | null;
  score: number;
  familiarityLevel: FamiliarityLevel;
  summaryIfLoaded: SummaryRecord | null;
  chunksIfLoaded: MemoryChunk[];
  budget: RecallBudgetReport;
}
