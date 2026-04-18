import type { SummaryRecord } from "../types/memory.js";
import type { MemoryStorage } from "../types/plugins.js";

export class SummaryLayer {
  constructor(private readonly storage: MemoryStorage) {}

  async save(record: SummaryRecord): Promise<void> {
    await this.storage.saveSummary(record);
  }

  async get(id: string): Promise<SummaryRecord | null> {
    return this.storage.getSummary(id);
  }
}
