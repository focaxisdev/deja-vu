import type { FamiliarityRecord, MemoryChunk, SummaryRecord } from "../types/memory.js";
import type { MemoryStorage } from "../types/plugins.js";

interface RawMemoryRecord {
  content: string;
  createdAt: string;
  updatedAt: string;
}

export class InMemoryStorage implements MemoryStorage {
  private readonly familiarities = new Map<string, FamiliarityRecord>();
  private readonly summaries = new Map<string, SummaryRecord>();
  private readonly chunks = new Map<string, MemoryChunk[]>();
  private readonly raw = new Map<string, RawMemoryRecord>();

  async saveFamiliarity(record: FamiliarityRecord): Promise<void> {
    this.familiarities.set(record.id, record);
  }

  async saveSummary(record: SummaryRecord): Promise<void> {
    this.summaries.set(record.id, record);
  }

  async saveChunks(chunks: MemoryChunk[]): Promise<void> {
    if (chunks.length === 0) return;
    this.chunks.set(chunks[0].memoryId, chunks);
  }

  async saveRawContent(memoryId: string, content: string, createdAt: string, updatedAt: string): Promise<void> {
    this.raw.set(memoryId, { content, createdAt, updatedAt });
  }

  async getFamiliarity(id: string): Promise<FamiliarityRecord | null> {
    return this.familiarities.get(id) ?? null;
  }

  async getSummary(id: string): Promise<SummaryRecord | null> {
    return this.summaries.get(id) ?? null;
  }

  async getChunks(id: string): Promise<MemoryChunk[]> {
    return this.chunks.get(id) ?? [];
  }

  async getRawContent(id: string): Promise<string | null> {
    return this.raw.get(id)?.content ?? null;
  }

  async deleteMemory(id: string): Promise<void> {
    this.familiarities.delete(id);
    this.summaries.delete(id);
    this.chunks.delete(id);
    this.raw.delete(id);
  }

  async listFamiliarities(): Promise<FamiliarityRecord[]> {
    return [...this.familiarities.values()];
  }

  async touchMemory(id: string, lastAccessedAt: string): Promise<void> {
    const record = this.familiarities.get(id);
    if (!record) return;
    this.familiarities.set(id, { ...record, lastAccessedAt });
  }
}
