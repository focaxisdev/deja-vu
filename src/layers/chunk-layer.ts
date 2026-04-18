import type { MemoryChunk } from "../types/memory.js";
import type { ChunkVectorStore, MemoryStorage } from "../types/plugins.js";

export class ChunkLayer {
  constructor(
    private readonly storage: MemoryStorage,
    private readonly vectorStore: ChunkVectorStore,
  ) {}

  async save(chunks: MemoryChunk[]): Promise<void> {
    await this.storage.saveChunks(chunks);
    await this.vectorStore.upsert(chunks);
  }

  async get(memoryId: string): Promise<MemoryChunk[]> {
    return this.storage.getChunks(memoryId);
  }

  async search(memoryId: string, vector: number[], topK: number) {
    return this.vectorStore.searchByMemoryId(memoryId, vector, topK);
  }

  async remove(memoryId: string): Promise<void> {
    await this.vectorStore.removeByMemoryId(memoryId);
  }
}
