import type { FamiliarityRecord, MemoryChunk, SummaryRecord, StoredMemory } from "../types/memory.js";
import type { ImpressionSearchHit, MemoryStorage } from "../types/plugins.js";
import { extractKeywords } from "../utils/text.js";
import { boundedInteger, MAX_RECALL_LIMIT } from "../utils/limits.js";

function copyFamiliarity(record: FamiliarityRecord): FamiliarityRecord {
  return { ...record, impressionTokens: [...record.impressionTokens], tags: [...record.tags], embeddingVector: [...record.embeddingVector] };
}

function copySummary(record: SummaryRecord): SummaryRecord {
  return { ...record, embeddingVector: [...record.embeddingVector],
    metadata: Object.fromEntries(Object.entries(record.metadata).map(([key, value]) => [key, Array.isArray(value) ? [...value] : value])) };
}
function copyChunks(chunks: MemoryChunk[]): MemoryChunk[] {
  return chunks.map(chunk => ({ ...chunk, embeddingVector: [...chunk.embeddingVector] }));
}

interface RawMemoryRecord {
  content: string;
  createdAt: string;
  updatedAt: string;
}

export class InMemoryStorage implements MemoryStorage {
  private readonly familiarities = new Map<string, FamiliarityRecord>();
  private readonly impressionTokenIndex = new Map<string, Set<string>>();
  private readonly scoringTokens = new Map<string, Set<string>>();
  private readonly summaries = new Map<string, SummaryRecord>();
  private readonly chunks = new Map<string, MemoryChunk[]>();
  private readonly raw = new Map<string, RawMemoryRecord>();

  async getMemorySnapshot(id: string): Promise<StoredMemory | null> {
    const familiarity = this.familiarities.get(id);
    const summary = this.summaries.get(id);
    const raw = this.raw.get(id);
    const chunks = this.chunks.get(id) ?? [];
    if (!familiarity && !summary && !raw && chunks.length === 0) return null;
    if (!familiarity || !summary || !raw) throw new Error(`Incomplete memory: ${id}`);
    return structuredClone({
      familiarity, summary, chunks, rawContent: raw.content,
      createdAt: raw.createdAt, updatedAt: raw.updatedAt,
    });
  }

  async saveFamiliarity(record: FamiliarityRecord): Promise<void> {
    this.removeFromImpressionIndex(record.id);
    this.familiarities.set(record.id, copyFamiliarity(record));
    this.scoringTokens.set(record.id, new Set(extractKeywords(record.impressionTokens.join(" "), 200)));
    for (const token of record.impressionTokens) {
      const ids = this.impressionTokenIndex.get(token) ?? new Set<string>();
      ids.add(record.id);
      this.impressionTokenIndex.set(token, ids);
    }
  }

  async saveSummary(record: SummaryRecord): Promise<void> {
    this.summaries.set(record.id, copySummary(record));
  }

  async saveChunks(chunks: MemoryChunk[]): Promise<void> {
    if (chunks.length === 0) return;
    this.chunks.set(chunks[0].memoryId, copyChunks(chunks));
  }

  async saveRawContent(memoryId: string, content: string, createdAt: string, updatedAt: string): Promise<void> {
    this.raw.set(memoryId, { content, createdAt, updatedAt });
  }

  async getFamiliarity(id: string): Promise<FamiliarityRecord | null> {
    const record = this.familiarities.get(id);
    return record ? copyFamiliarity(record) : null;
  }

  async getSummary(id: string): Promise<SummaryRecord | null> {
    const record = this.summaries.get(id);
    return record ? copySummary(record) : null;
  }

  async getChunks(id: string): Promise<MemoryChunk[]> {
    return copyChunks(this.chunks.get(id) ?? []);
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
    return [...this.familiarities.values()].map(copyFamiliarity);
  }

  async searchImpressions(tokens: string[], topK: number): Promise<ImpressionSearchHit[]> {
    boundedInteger("topK", topK, MAX_RECALL_LIMIT);
    if (topK === 0) return [];
    const candidateIds = new Set<string>();
    for (const token of tokens) {
      for (const id of this.impressionTokenIndex.get(token) ?? []) {
        candidateIds.add(id);
      }
    }

    if (candidateIds.size === 0) return [];
    const queryTokens = new Set(extractKeywords(tokens.join(" "), 200));
    return [...candidateIds]
      .map((id) => {
        const record = this.familiarities.get(id);
        if (!record) return null;
        const recordTokens = this.scoringTokens.get(id)!;
        let overlap = 0;
        for (const token of queryTokens) if (recordTokens.has(token)) overlap++;
        const denominator = Math.min(queryTokens.size, recordTokens.size);
        return { record, similarity: denominator ? overlap / denominator : 0 };
      })
      .filter((hit): hit is ImpressionSearchHit => hit !== null)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, topK)
      .map((hit) => ({ ...hit, record: copyFamiliarity(hit.record) }));
  }

  async touchMemory(id: string, lastAccessedAt: string): Promise<void> {
    const record = this.familiarities.get(id);
    if (!record) return;
    this.familiarities.set(id, { ...record, lastAccessedAt });
  }

  private removeFromImpressionIndex(id: string): void {
    this.scoringTokens.delete(id);
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
