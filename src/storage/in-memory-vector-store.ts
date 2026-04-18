import type { FamiliarityRecord, MemoryChunk } from "../types/memory.js";
import type { ChunkVectorStore, FamiliarityVectorStore, VectorSearchHit } from "../types/plugins.js";
import { cosineSimilarity } from "../utils/math.js";

export class InMemoryFamiliarityVectorStore implements FamiliarityVectorStore {
  private readonly records = new Map<string, FamiliarityRecord>();

  async upsert(record: FamiliarityRecord): Promise<void> {
    this.records.set(record.id, record);
  }

  async remove(id: string): Promise<void> {
    this.records.delete(id);
  }

  async search(vector: number[], topK: number): Promise<VectorSearchHit[]> {
    return [...this.records.values()]
      .map((record) => ({
        id: record.id,
        similarity: cosineSimilarity(vector, record.embeddingVector),
      }))
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, topK);
  }
}

export class InMemoryChunkVectorStore implements ChunkVectorStore {
  private readonly chunksByMemoryId = new Map<string, MemoryChunk[]>();

  async upsert(chunks: MemoryChunk[]): Promise<void> {
    if (chunks.length === 0) return;
    this.chunksByMemoryId.set(chunks[0].memoryId, chunks);
  }

  async removeByMemoryId(memoryId: string): Promise<void> {
    this.chunksByMemoryId.delete(memoryId);
  }

  async searchByMemoryId(memoryId: string, vector: number[], topK: number): Promise<VectorSearchHit[]> {
    return (this.chunksByMemoryId.get(memoryId) ?? [])
      .map((chunk) => ({
        id: chunk.chunkId,
        similarity: cosineSimilarity(vector, chunk.embeddingVector),
      }))
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, topK);
  }
}
