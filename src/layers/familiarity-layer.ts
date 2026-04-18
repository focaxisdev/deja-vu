import type { FamiliarityRecord } from "../types/memory.js";
import type { FamiliarityVectorStore, MemoryStorage } from "../types/plugins.js";

export class FamiliarityLayer {
  constructor(
    private readonly storage: MemoryStorage,
    private readonly vectorStore: FamiliarityVectorStore,
  ) {}

  async save(record: FamiliarityRecord): Promise<void> {
    await this.storage.saveFamiliarity(record);
    await this.vectorStore.upsert(record);
  }

  async get(id: string): Promise<FamiliarityRecord | null> {
    return this.storage.getFamiliarity(id);
  }

  async search(vector: number[], topK: number) {
    return this.vectorStore.search(vector, topK);
  }

  async remove(id: string): Promise<void> {
    await this.vectorStore.remove(id);
  }
}
