import type { FamiliarityRecord, ScoredCandidate } from "../types/memory.js";
import type { ScoringBreakdown, ScoringStrategy } from "../types/plugins.js";
import { clamp } from "../utils/math.js";
import { daysBetween } from "../utils/time.js";

export interface HybridScoringConfig {
  semanticWeight?: number;
  recencyWeight?: number;
  importanceWeight?: number;
  recencyHalfLifeDays?: number;
}

export class HybridScoringStrategy implements ScoringStrategy {
  private readonly semanticWeight: number;
  private readonly recencyWeightValue: number;
  private readonly importanceWeightValue: number;
  private readonly recencyHalfLifeDays: number;

  constructor(config: HybridScoringConfig = {}) {
    this.semanticWeight = config.semanticWeight ?? 0.6;
    this.recencyWeightValue = config.recencyWeight ?? 0.2;
    this.importanceWeightValue = config.importanceWeight ?? 0.2;
    this.recencyHalfLifeDays = config.recencyHalfLifeDays ?? 14;
  }

  score(record: FamiliarityRecord, similarity: number): ScoringBreakdown {
    const ageDays = daysBetween(record.lastAccessedAt);
    const recency = Math.exp((-Math.log(2) * ageDays) / this.recencyHalfLifeDays);
    const importance = clamp(record.importance);
    const semantic = clamp(similarity);
    const score =
      this.semanticWeight * semantic +
      this.recencyWeightValue * recency +
      this.importanceWeightValue * importance;

    return {
      semanticSimilarity: semantic,
      recencyWeight: recency,
      importanceWeight: importance,
      score: clamp(score),
    };
  }

  rank(records: Array<{ record: FamiliarityRecord; similarity: number }>): ScoredCandidate[] {
    return records
      .map(({ record, similarity }) => {
        const breakdown = this.score(record, similarity);
        return {
          id: record.id,
          title: record.title,
          shortSummary: record.shortSummary,
          impressionTokens: record.impressionTokens,
          ...breakdown,
          familiarityLevel: "none",
        } as ScoredCandidate;
      })
      .sort((a, b) => b.score - a.score);
  }
}
