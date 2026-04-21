import type { FamiliarityRecord, MemoryChunk, SummaryRecord } from "../types/memory.js";
import type { ImpressionSearchHit, MemoryStorage } from "../types/plugins.js";
import { lexicalSimilarity } from "../utils/text.js";

interface RawMemoryRecord {
  content: string;
  createdAt: string;
  updatedAt: string;
}

export class InMemoryStorage implements MemoryStorage {
  private readonly familiarities = new Map<string, FamiliarityRecord>();
  private readonly impressionTokenIndex = new Map<string, Set<string>>();
  private readonly summaries = new Map<string, SummaryRecord>();
  private readonly chunks = new Map<string, MemoryChunk[]>();
  private readonly raw = new Map<string, RawMemoryRecord>();

  async saveFamiliarity(record: FamiliarityRecord): Promise<void> {
    this.removeFromImpressionIndex(record.id);
    this.familiarities.set(record.id, record);
    for (const token of record.impressionTokens) {
      const ids = this.impressionTokenIndex.get(token) ?? new Set<string>();
      ids.add(record.id);
      this.impressionTokenIndex.set(token, ids);
    }
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
    this.removeFromImpressionIndex(id);
    this.familiarities.delete(id);
    this.summaries.delete(id);
    this.chunks.delete(id);
    this.raw.delete(id);
  }

  async listFamiliarities(): Promise<FamiliarityRecord[]> {
    return [...this.familiarities.values()];
  }

  async searchImpressions(tokens: string[], topK: number): Promise<ImpressionSearchHit[]> {
    const candidateIds = new Set<string>();
    for (const token of tokens) {
      for (const id of this.impressionTokenIndex.get(token) ?? []) {
        candidateIds.add(id);
      }
    }

    return [...candidateIds]
      .map((id) => {
        const record = this.familiarities.get(id);
        if (!record) return null;
        return {
          record,
          similarity: lexicalSimilarity(tokens.join(" "), record.impressionTokens.join(" ")),
        };
      })
      .filter((hit): hit is ImpressionSearchHit => hit !== null)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, topK);
  }

  async touchMemory(id: string, lastAccessedAt: string): Promise<void> {
    const record = this.familiarities.get(id);
    if (!record) return;
    this.familiarities.set(id, { ...record, lastAccessedAt });
  }

  private removeFromImpressionIndex(id: string): void {
    const existing = this.familiarities.get(id);
    if (!existing) return;
    for (const token of existing.impressionTokens) {
      const ids = this.impressionTokenIndex.get(token);
      if (!ids) continue;
      ids.delete(id);
      if (ids.size === 0) {
        this.impressionTokenIndex.delete(token);
      }
    }
  }
}
