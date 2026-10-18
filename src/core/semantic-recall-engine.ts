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
  StoredMemory,
  UpdateMemoryInput,
} from "../types/memory.js";
import type { EmbeddingProvider, EmbeddingScope, SemanticRecallEngineConfig } from "../types/plugins.js";
import { createId } from "../utils/id.js";
import { extractKeywords } from "../utils/text.js";
import { boundedInteger, MAX_RECALL_LIMIT } from "../utils/limits.js";
import { compileCueAliases, normalizeCue } from "../retrieval/cue-aliases.js";
import { isoNow } from "../utils/time.js";

/** Includes a recovery copy if an adapter fails during compensation. Do not log its contents. */
export class MemoryWriteError extends Error {
  constructor(
    message: string,
    cause: unknown,
    readonly recoverySnapshot: StoredMemory | null,
    readonly recoveryErrors: unknown[],
    readonly memoryId: string,
  ) {
    super(message, { cause });
    this.name = "MemoryWriteError";
  }
}

/** A successor cleanup failure is explicit; inspect both IDs before retrying. */
export class MemorySupersedeError extends Error {
  constructor(cause: unknown, readonly memoryId: string, readonly replacementId: string,
    readonly recoveryErrors: unknown[]) {
    super(recoveryErrors.length ? "Supersede failed; recovery requires adapter repair" : "Supersede failed; previous state restored", { cause });
    this.name = "MemorySupersedeError";
  }
}

export class SemanticRecallEngine {
  private readonly familiarityLayer: FamiliarityLayer;
  private readonly summaryLayer: SummaryLayer;
  private readonly chunkLayer: ChunkLayer;
  private readonly chunker;
  private readonly summaryGenerator;
  private readonly thresholds;
  private readonly scoringStrategy;
  private readonly cueAliases;
  private readonly embeddingScopes = new Map<string, EmbeddingScope>();
  private mutationQueue: Promise<unknown> = Promise.resolve();

  private mutate<T>(operation: () => Promise<T>): Promise<T> {
    const result = this.mutationQueue.then(operation);
    this.mutationQueue = result.catch(() => undefined);
    return result;
  }

  constructor(private readonly config: SemanticRecallEngineConfig) {
    this.cueAliases = compileCueAliases(config.cueAliases);
    if (config.manageEmbeddingCache && typeof config.embeddingProvider.createScope !== "function") {
      throw new TypeError("manageEmbeddingCache requires embeddingProvider.createScope");
    }
    this.familiarityLayer = new FamiliarityLayer(config.storage, config.familiarityVectorStore);
    this.summaryLayer = new SummaryLayer(config.storage);
    this.chunkLayer = new ChunkLayer(config.storage, config.chunkVectorStore);
    this.chunker = config.chunker ?? new DefaultChunker();
    this.summaryGenerator = config.summaryGenerator ?? new DefaultSummaryGenerator();
    this.thresholds = { ...(config.thresholds ?? { strong: 0.85, weak: 0.75 }) };
    const { weak, strong } = this.thresholds;
    if (!Number.isFinite(weak) || !Number.isFinite(strong) || weak < 0 || strong > 1 || weak > strong) {
      throw new RangeError("thresholds must satisfy 0 <= weak <= strong <= 1");
    }
    this.scoringStrategy = config.scoringStrategy ?? new HybridScoringStrategy();
  }

  async addMemory(input: AddMemoryInput): Promise<{ id: string }> {
    return this.mutate(async () => {
      const id = input.id ?? createId("memory");
      if (await this.snapshot(id)) throw new Error(`Memory already exists: ${id}; use updateMemory`);
      await this.writeMemory({ ...input, id }, null);
      return { id };
    });
  }

  private async writeMemory(input: AddMemoryInput & { id: string }, previous: StoredMemory | null): Promise<void> {
    const scope = this.config.manageEmbeddingCache ? this.config.embeddingProvider.createScope!() : undefined;
    try {
      const prepared = await this.prepareMemory(input, scope ?? this.config.embeddingProvider);
      if (previous) prepared.createdAt = previous.createdAt;
      await this.commitMemory(prepared, previous);
    } catch (error) {
      scope?.dispose();
      throw error;
    }
    this.embeddingScopes.get(input.id)?.dispose();
    if (scope) this.embeddingScopes.set(input.id, scope);
  }

  private async prepareMemory(input: AddMemoryInput, provider: Pick<EmbeddingProvider, "embed">): Promise<StoredMemory> {
    const id = input.id ?? createId("memory");
    const now = isoNow();
    const shortSummary = await this.summaryGenerator.generateShortSummary(input);
    const structuredSummary = await this.summaryGenerator.generateStructuredSummary(input);
    const chunkSeeds = this.chunker.chunk(input, now);

    const familiarityVector = await provider.embed(
      [input.title, shortSummary, ...(input.tags ?? [])].join("\n"),
    );
    const summaryVector = await provider.embed(
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
        embeddingVector: await provider.embed(seed.content),
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

    return { familiarity, summary, chunks, rawContent: input.content, createdAt: now, updatedAt: now };
  }

  private async snapshot(id: string): Promise<StoredMemory | null> {
    if (this.config.storage.getMemorySnapshot) {
      return structuredClone(await this.config.storage.getMemorySnapshot(id));
    }
    const familiarity = await this.config.storage.getFamiliarity(id);
    const summary = await this.config.storage.getSummary(id);
    const rawContent = await this.config.storage.getRawContent(id);
    const chunks = await this.config.storage.getChunks(id);
    if (!familiarity && !summary && rawContent === null && chunks.length === 0) return null;
    if (!familiarity || !summary || rawContent === null) {
      throw new Error(`Incomplete memory: ${id}; repair storage before writing`);
    }
    // Legacy adapters do not expose raw timestamps. They can implement getMemorySnapshot to preserve them.
    const createdAt = chunks[0]?.createdAt ?? familiarity.lastAccessedAt;
    return structuredClone({ familiarity, summary, rawContent, chunks, createdAt, updatedAt: createdAt });
  }

  private async commitMemory(next: StoredMemory, previous: StoredMemory | null): Promise<void> {
    const id = next.familiarity.id;
    try {
      // Generation has already completed and a detached recovery snapshot exists.
      // Remove the old chunks too, including when the replacement has zero chunks.
      if (previous) {
        await this.config.storage.deleteMemory(id);
        await this.config.chunkVectorStore.removeByMemoryId(id);
      }
      await this.summaryLayer.save(next.summary);
      await this.chunkLayer.save(next.chunks);
      await this.config.storage.saveRawContent(id, next.rawContent, next.createdAt, next.updatedAt);
      await this.familiarityLayer.save(next.familiarity);
    } catch (cause) {
      const recoveryErrors: unknown[] = [];
      const attempt = async (operation: () => Promise<void>) => {
        try { await operation(); } catch (error) { recoveryErrors.push(error); }
      };
      await attempt(() => this.config.storage.deleteMemory(id));
      await attempt(() => this.config.familiarityVectorStore.remove(id));
      await attempt(() => this.config.chunkVectorStore.removeByMemoryId(id));
      if (previous) {
        await attempt(() => this.config.storage.saveSummary(previous.summary));
        await attempt(() => this.config.storage.saveChunks(previous.chunks));
        await attempt(() => this.config.storage.saveRawContent(
          id, previous.rawContent, previous.createdAt, previous.updatedAt,
        ));
        await attempt(() => this.config.storage.saveFamiliarity(previous.familiarity));
        await attempt(() => this.config.familiarityVectorStore.upsert(previous.familiarity));
        await attempt(() => this.config.chunkVectorStore.upsert(previous.chunks));
      }
      throw new MemoryWriteError(
        recoveryErrors.length ? "Memory write failed; recovery requires adapter repair" : "Memory write failed; previous state restored",
        cause, previous, recoveryErrors, id,
      );
    }
  }

  async recall(query: RecallInput | string): Promise<RecallResult> {
    return this.config.consistentReads || this.config.manageEmbeddingCache ? this.mutate(() => this.recallInternal(query)) : this.recallInternal(query);
  }

  private async recallInternal(query: RecallInput | string): Promise<RecallResult> {
    const normalized: RecallInput = typeof query === "string" ? { text: query } : query;
    const chunkLimit = boundedInteger("chunkLimit", normalized.chunkLimit ?? 3, MAX_RECALL_LIMIT);
    const scan = await this.scanImpressionsInternal(normalized);
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

      if (familiarityLevel === "strong" && normalized.loadChunks && chunkLimit > 0) {
        let scope = this.embeddingScopes.get(topMatch.id);
        if (this.config.manageEmbeddingCache && !scope) {
          scope = this.config.embeddingProvider.createScope!();
          this.embeddingScopes.set(topMatch.id, scope);
        }
        const vector = await (scope ?? this.config.embeddingProvider).embed(normalized.text);
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
    return this.config.consistentReads || this.config.manageEmbeddingCache ? this.mutate(() => this.scanImpressionsInternal(query)) : this.scanImpressionsInternal(query);
  }

  private async scanImpressionsInternal(query: RecallInput | string): Promise<ImpressionScanResult> {
    const normalized: RecallInput = typeof query === "string" ? { text: query } : query;
    if (typeof normalized.text !== "string") throw new TypeError("text must be a string");
    const topK = boundedInteger("topK", normalized.topK ?? 5, MAX_RECALL_LIMIT);
    const candidateLimit = boundedInteger("candidateLimit", normalized.candidateLimit ?? topK, MAX_RECALL_LIMIT, topK);
    boundedInteger("chunkLimit", normalized.chunkLimit ?? 3, MAX_RECALL_LIMIT);
    const cue = this.cueAliases.size ? this.cueAliases.get(normalizeCue(normalized.text)) ?? normalized.text : normalized.text;
    const queryTokens = extractKeywords(cue, 200);
    const hits = topK === 0 ? [] : await this.config.storage.searchImpressions(queryTokens, candidateLimit);

    const ranked = this.scoringStrategy.rank(
      hits.map((hit) => ({
        record: hit.record,
        similarity: hit.similarity,
      })),
    ).map((candidate) => ({
      ...candidate,
      familiarityLevel: resolveFamiliarityLevel(candidate.semanticSimilarity, this.thresholds),
    }));

    // Eligibility precedes hybrid preference. Keep hybrid ordering within each group,
    // including weak vs strong, and retain ineligible candidates for diagnostics.
    const candidates = [
      ...ranked.filter((candidate) => candidate.familiarityLevel !== "none"),
      ...ranked.filter((candidate) => candidate.familiarityLevel === "none"),
    ].slice(0, topK);
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
    return this.config.consistentReads || this.config.manageEmbeddingCache ? this.mutate(() => this.summaryLayer.get(id)) : this.summaryLayer.get(id);
  }

  async getChunks(id: string): Promise<MemoryChunk[]> {
    return this.config.consistentReads || this.config.manageEmbeddingCache ? this.mutate(() => this.chunkLayer.get(id)) : this.chunkLayer.get(id);
  }

  /** Explicit full raw-content retrieval; never loaded by prompt projection automatically. */
  async getRawContent(id: string): Promise<string | null> {
    return this.config.consistentReads || this.config.manageEmbeddingCache ? this.mutate(() => this.config.storage.getRawContent(id)) : this.config.storage.getRawContent(id);
  }

  async updateMemory(id: string, input: UpdateMemoryInput): Promise<{ id: string }> {
    return this.mutate(async () => {
      const previous = await this.snapshot(id);
      if (!previous) throw new Error(`Memory not found: ${id}`);
      if (this.config.preserveDerivedOnMetadataUpdate &&
          Object.keys(input).every((key) => key === "importance" || key === "metadata")) {
        // Explicitly preserve derived fields even for custom generators/chunkers.
        // Reuse the existing compensated write path and detached snapshot.
        const next = structuredClone(previous);
        next.updatedAt = isoNow();
        next.familiarity.importance = input.importance ?? previous.familiarity.importance;
        next.summary.metadata = {
          ...previous.summary.metadata, ...input.metadata,
          title: previous.familiarity.title, tags: [...previous.familiarity.tags],
        };
        await this.commitMemory(next, previous);
        return { id };
      }
      const existingSummary = previous.summary;
      await this.writeMemory({
        id,
        title: input.title ?? previous.familiarity.title,
        content: input.content ?? previous.rawContent,
        tags: input.tags ?? previous.familiarity.tags,
        context: input.context ?? existingSummary.context,
        architectureOrIntent: input.architectureOrIntent ?? existingSummary.architectureOrIntent,
        recentUpdates: input.recentUpdates ?? existingSummary.recentUpdates,
        importance: input.importance ?? previous.familiarity.importance,
        metadata: {
          ...existingSummary.metadata,
          ...(input.metadata ?? {}),
          title: input.title ?? previous.familiarity.title,
          tags: input.tags ?? previous.familiarity.tags,
        },
        chunkStrategy: input.chunkStrategy,
      }, previous);
      return { id };
    });
  }

  /** Replace a live memory with a new ID. No historical redirect is stored by this optional engine. */
  async supersedeMemory(id: string, replacement: AddMemoryInput): Promise<{ id: string; supersededId: string }> {
    return this.mutate(async () => {
      const previous = await this.snapshot(id);
      if (!previous) throw new Error(`Memory not found: ${id}`);
      const nextId = replacement.id ?? createId("memory");
      if (nextId === id || await this.snapshot(nextId)) throw new Error(`Replacement memory already exists: ${nextId}`);
      await this.writeMemory({ ...replacement, id: nextId }, null);
      try {
        await this.deleteInternal(id, previous);
      } catch (cause) {
        const recoveryErrors: unknown[] = cause instanceof MemoryWriteError ? [...cause.recoveryErrors] : [cause];
        try { await this.deleteInternal(nextId, await this.snapshot(nextId)); }
        catch (error) { recoveryErrors.push(error); }
        throw new MemorySupersedeError(cause, id, nextId, recoveryErrors);
      }
      return { id: nextId, supersededId: id };
    });
  }

  async deleteMemory(id: string): Promise<void> {
    return this.mutate(async () => this.deleteInternal(id, await this.snapshot(id)));
  }

  private async deleteInternal(id: string, previous: StoredMemory | null): Promise<void> {
    try {
      await this.familiarityLayer.remove(id);
      await this.chunkLayer.remove(id);
      await this.config.storage.deleteMemory(id);
    } catch (cause) {
      const recoveryErrors: unknown[] = [];
      const attempt = async (operation: () => Promise<void>) => {
        try { await operation(); } catch (error) { recoveryErrors.push(error); }
      };
      if (previous) {
        await attempt(() => this.config.storage.saveSummary(previous.summary));
        await attempt(() => this.config.storage.saveChunks(previous.chunks));
        await attempt(() => this.config.storage.saveRawContent(id, previous.rawContent, previous.createdAt, previous.updatedAt));
        await attempt(() => this.config.storage.saveFamiliarity(previous.familiarity));
        await attempt(() => this.config.familiarityVectorStore.upsert(previous.familiarity));
        await attempt(() => this.config.chunkVectorStore.upsert(previous.chunks));
      }
      throw new MemoryWriteError(recoveryErrors.length ? "Memory delete failed; recovery requires adapter repair" : "Memory delete failed; previous state restored",
        cause, previous, recoveryErrors, id);
    }
    this.embeddingScopes.get(id)?.dispose();
    this.embeddingScopes.delete(id);
  }
}
