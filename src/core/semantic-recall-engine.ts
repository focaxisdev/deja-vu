import { ChunkLayer } from "../layers/chunk-layer.js";
import { FamiliarityLayer } from "../layers/familiarity-layer.js";
import { SummaryLayer } from "../layers/summary-layer.js";
import { DefaultChunker } from "../memory/default-chunker.js";
import { DefaultSummaryGenerator } from "../memory/default-summary-generator.js";
import { resolveFamiliarityLevel } from "../retrieval/threshold-gate.js";
import { HybridScoringStrategy } from "../scoring/hybrid-scoring-strategy.js";
import type {
  AddMemoryInput,
  FamiliarityRecord,
  RecallBudgetReport,
  ImpressionScanResult,
  MemoryChunk,
  RecallInput,
  RecallResult,
  SummaryRecord,
  UpdateMemoryInput,
} from "../types/memory.js";
import type { SemanticRecallEngineConfig } from "../types/plugins.js";
import { createId } from "../utils/id.js";
import { extractKeywords } from "../utils/text.js";
import { isoNow } from "../utils/time.js";

export class SemanticRecallEngine {
  private readonly familiarityLayer: FamiliarityLayer;
  private readonly summaryLayer: SummaryLayer;
  private readonly chunkLayer: ChunkLayer;
  private readonly chunker;
  private readonly summaryGenerator;
  private readonly thresholds;
  private readonly scoringStrategy;

  constructor(private readonly config: SemanticRecallEngineConfig) {
    this.familiarityLayer = new FamiliarityLayer(config.storage, config.familiarityVectorStore);
    this.summaryLayer = new SummaryLayer(config.storage);
    this.chunkLayer = new ChunkLayer(config.storage, config.chunkVectorStore);
    this.chunker = config.chunker ?? new DefaultChunker();
    this.summaryGenerator = config.summaryGenerator ?? new DefaultSummaryGenerator();
    this.thresholds = config.thresholds ?? { strong: 0.85, weak: 0.75 };
    this.scoringStrategy = config.scoringStrategy ?? new HybridScoringStrategy();
  }

  async addMemory(input: AddMemoryInput): Promise<{ id: string }> {
    const id = input.id ?? createId("memory");
    const now = isoNow();
    const shortSummary = await this.summaryGenerator.generateShortSummary(input);
    const structuredSummary = await this.summaryGenerator.generateStructuredSummary(input);
    const chunkSeeds = this.chunker.chunk(input, now);

    const familiarityVector = await this.config.embeddingProvider.embed(
      [input.title, shortSummary, ...(input.tags ?? [])].join("\n"),
    );
    const summaryVector = await this.config.embeddingProvider.embed(
      `${structuredSummary.description}\n${structuredSummary.context}\n${structuredSummary.architectureOrIntent}`,
    );

    const chunks: MemoryChunk[] = [];
    for (const seed of chunkSeeds) {
      chunks.push({
        chunkId: createId("chunk"),
        memoryId: id,
        type: seed.type,
        content: seed.content,
        createdAt: now,
        updatedAt: now,
        importance: seed.importance ?? input.importance ?? 0.5,
        embeddingVector: await this.config.embeddingProvider.embed(seed.content),
      });
    }

    const familiarity: FamiliarityRecord = {
      id,
      title: input.title,
      shortSummary,
      tags: input.tags ?? [],
      impressionTokens: extractKeywords([input.title, shortSummary, ...(input.tags ?? [])].join("\n")),
      lastAccessedAt: now,
      importance: input.importance ?? 0.5,
      embeddingVector: familiarityVector,
    };

    const summary: SummaryRecord = {
      id,
      description: structuredSummary.description,
      context: structuredSummary.context,
      architectureOrIntent: structuredSummary.architectureOrIntent,
      recentUpdates: structuredSummary.recentUpdates,
      metadata: structuredSummary.metadata,
      embeddingVector: summaryVector,
    };

    await this.familiarityLayer.save(familiarity);
    await this.summaryLayer.save(summary);
    await this.chunkLayer.save(chunks);
    await this.config.storage.saveRawContent(id, input.content, now, now);

    return { id };
  }

  async recall(query: RecallInput | string): Promise<RecallResult> {
    const normalized: RecallInput = typeof query === "string" ? { text: query } : query;
    const chunkLimit = normalized.chunkLimit ?? 3;
    const scan = await this.scanImpressions(normalized);
    const topMatch = scan.topMatch;
    const familiarityLevel = scan.familiarityLevel;
    const budget: RecallBudgetReport = {
      ...scan.budget,
      whyLoaded: [...scan.budget.whyLoaded],
    };

    let summaryIfLoaded: SummaryRecord | null = null;
    let chunksIfLoaded: MemoryChunk[] = [];

    if (topMatch && familiarityLevel !== "none") {
      const fullSummary = await this.summaryLayer.get(topMatch.id);
      if (familiarityLevel === "strong") {
        summaryIfLoaded = fullSummary;
        if (fullSummary) {
          budget.summariesLoaded = 1;
          budget.whyLoaded.push("strong familiarity loaded the full summary");
        }
      } else if (fullSummary) {
        summaryIfLoaded = {
          ...fullSummary,
          description: fullSummary.description.slice(0, 120),
          context: fullSummary.context.slice(0, 120),
          architectureOrIntent: fullSummary.architectureOrIntent.slice(0, 120),
          recentUpdates: fullSummary.recentUpdates.slice(0, 1),
        };
        budget.summariesLoaded = 1;
        budget.whyLoaded.push("weak familiarity loaded a clipped summary");
      }

      if (familiarityLevel === "strong" && normalized.loadChunks) {
        const vector = await this.config.embeddingProvider.embed(normalized.text);
        const chunkHits = await this.chunkLayer.search(topMatch.id, vector, chunkLimit);
        const allChunks = await this.chunkLayer.get(topMatch.id);
        const chunkMap = new Map(allChunks.map((chunk) => [chunk.chunkId, chunk]));
        chunksIfLoaded = chunkHits
          .map((hit) => chunkMap.get(hit.id))
          .filter((chunk): chunk is MemoryChunk => chunk !== undefined);
        budget.chunksLoaded = chunksIfLoaded.length;
        budget.detailRecordsLoaded = chunksIfLoaded.length > 0 ? 1 : 0;
        if (chunksIfLoaded.length > 0) {
          budget.whyLoaded.push("loadChunks requested detail chunks for the strong match");
        }
      }

      await this.config.storage.touchMemory(topMatch.id, isoNow());
    }

    return {
      matched: familiarityLevel !== "none",
      candidates: scan.candidates,
      topMatch,
      score: scan.score,
      familiarityLevel,
      summaryIfLoaded,
      chunksIfLoaded,
      budget,
    };
  }

  async scanImpressions(query: RecallInput | string): Promise<ImpressionScanResult> {
    const normalized: RecallInput = typeof query === "string" ? { text: query } : query;
    const topK = normalized.topK ?? 5;
    const queryTokens = extractKeywords(normalized.text, 200);
    const hits = await this.config.storage.searchImpressions(queryTokens, topK);

    const candidates = this.scoringStrategy.rank(
      hits.map((hit) => ({
        record: hit.record,
        similarity: hit.similarity,
      })),
    ).map((candidate) => ({
      ...candidate,
      familiarityLevel: resolveFamiliarityLevel(candidate.semanticSimilarity, this.thresholds),
    }));

    const topMatch = candidates[0] ?? null;
    const familiarityLevel = topMatch
      ? resolveFamiliarityLevel(topMatch.semanticSimilarity, this.thresholds)
      : "none";

    return {
      matched: familiarityLevel !== "none",
      candidates,
      topMatch,
      score: topMatch?.score ?? 0,
      familiarityLevel,
      budget: {
        impressionScan: 1,
        summariesLoaded: 0,
        chunksLoaded: 0,
        detailRecordsLoaded: 0,
        whyLoaded:
          familiarityLevel === "none"
            ? ["cue scan found no match; no memory loaded"]
            : [`cue scan found a ${familiarityLevel} familiarity match`],
      },
    };
  }

  async getSummary(id: string): Promise<SummaryRecord | null> {
    return this.summaryLayer.get(id);
  }

  async getChunks(id: string): Promise<MemoryChunk[]> {
    return this.chunkLayer.get(id);
  }

  async updateMemory(id: string, input: UpdateMemoryInput): Promise<{ id: string }> {
    const existingSummary = await this.summaryLayer.get(id);
    const rawContent = await this.config.storage.getRawContent(id);
    if (!existingSummary || rawContent === null) {
      throw new Error(`Memory not found: ${id}`);
    }

    await this.deleteMemory(id);
    return this.addMemory({
      id,
      title: input.title ?? String(existingSummary.metadata.title ?? id),
      content: input.content ?? rawContent,
      tags: (input.tags as string[] | undefined) ?? (existingSummary.metadata.tags as string[] | undefined),
      context: input.context ?? existingSummary.context,
      architectureOrIntent: input.architectureOrIntent ?? existingSummary.architectureOrIntent,
      recentUpdates: input.recentUpdates ?? existingSummary.recentUpdates,
      importance: input.importance,
      metadata: {
        ...existingSummary.metadata,
        ...(input.metadata ?? {}),
      },
      chunkStrategy: input.chunkStrategy,
    });
  }

  async deleteMemory(id: string): Promise<void> {
    await this.familiarityLayer.remove(id);
    await this.chunkLayer.remove(id);
    await this.config.storage.deleteMemory(id);
  }
}
