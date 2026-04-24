import test from "node:test";
import assert from "node:assert/strict";

import { createInMemorySemanticRecallEngine } from "../src/index.js";
import { DefaultChunker } from "../src/memory/default-chunker.js";
import { DefaultSummaryGenerator } from "../src/memory/default-summary-generator.js";
import type { EmbeddingProvider } from "../src/index.js";

class CountingEmbeddingProvider implements EmbeddingProvider {
  calls = 0;

  async embed(text: string): Promise<number[]> {
    this.calls += 1;
    const value = text.length === 0 ? 0 : 1;
    return [value];
  }
}

test("loads summary and chunks for strong familiarity matches", async () => {
  const engine = createInMemorySemanticRecallEngine({
    thresholds: {
      strong: 0.75,
      weak: 0.6,
    },
  });

  await engine.addMemory({
    title: "Agent project memory",
    importance: 1,
    content: `
Project context: build a familiarity-first recall engine.
Decision: summaries load before chunks.
Task: keep the API small and extensible.
    `.trim(),
  });

  const result = await engine.recall({
    text: "Agent project memory: Project context: build a familiarity-first recall engine. Decision: summaries load before chunks. Task: keep the API small and extensible.",
    loadChunks: true,
  });

  assert.equal(result.matched, true);
  assert.equal(result.familiarityLevel, "strong");
  assert.ok(result.summaryIfLoaded);
  assert.ok(result.chunksIfLoaded.length > 0);
  assert.equal(result.budget.impressionScan, 1);
  assert.equal(result.budget.summariesLoaded, 1);
  assert.equal(result.budget.detailRecordsLoaded, 1);
  assert.ok(result.budget.whyLoaded.includes("strong familiarity loaded the full summary"));
});

test("does not load memory for low familiarity matches", async () => {
  const engine = createInMemorySemanticRecallEngine();

  await engine.addMemory({
    title: "Frontend redesign sprint",
    content: "Decision: use an editorial design system with dense navigation cleanup.",
  });

  const result = await engine.recall({
    text: "Need a bioinformatics pipeline for protein folding datasets.",
  });

  assert.equal(result.familiarityLevel, "none");
  assert.equal(result.matched, false);
  assert.equal(result.summaryIfLoaded, null);
  assert.equal(result.budget.summariesLoaded, 0);
  assert.deepEqual(result.budget.whyLoaded, ["cue scan found no match; no memory loaded"]);
});

test("scans impressions without loading deeper memory", async () => {
  const engine = createInMemorySemanticRecallEngine({
    thresholds: {
      strong: 0.75,
      weak: 0.4,
    },
  });

  await engine.addMemory({
    title: "Scripted impression recall",
    tags: ["impression", "scripted-recall", "tokens"],
    content: "Decision: scan compact impression tokens before opening summaries or chunks.",
  });

  const scan = await engine.scanImpressions("Should scripted recall check impression tokens first?");

  assert.equal(scan.matched, true);
  assert.ok(scan.topMatch);
  assert.equal(scan.topMatch.title, "Scripted impression recall");
  assert.ok(scan.topMatch.impressionTokens.includes("impression"));
  assert.equal(scan.budget.impressionScan, 1);
  assert.equal(scan.budget.summariesLoaded, 0);
});

test("impression scans do not call the embedding provider", async () => {
  const embeddingProvider = new CountingEmbeddingProvider();
  const engine = createInMemorySemanticRecallEngine({
    embeddingProvider,
    thresholds: {
      strong: 0.75,
      weak: 0.4,
    },
  });

  await engine.addMemory({
    title: "Token only scan",
    tags: ["token", "impression"],
    content: "Decision: scan impressions before embedding queries.",
  });

  embeddingProvider.calls = 0;

  const scan = await engine.scanImpressions("token impression");
  const recall = await engine.recall("token impression");

  assert.equal(scan.matched, true);
  assert.equal(recall.matched, true);
  assert.equal(embeddingProvider.calls, 0);
});

test("default summaries preserve gist cues instead of only truncating content", async () => {
  const generator = new DefaultSummaryGenerator();

  const summary = await generator.generateStructuredSummary({
    title: "Cue-first recall",
    content: `
Decision: scan impressions before loading detailed records.
Rationale: cheap cue scans protect the context budget.
Trigger: use this when a task may depend on project memory.
Implementation note: details can stay in separate records.
    `.trim(),
  });

  assert.equal(summary.description, "Decision: scan impressions before loading detailed records.");
  assert.equal(summary.context, "Rationale: cheap cue scans protect the context budget.");
  assert.equal(summary.architectureOrIntent, "Trigger: use this when a task may depend on project memory.");
});

test("default chunker preserves markdown and paragraph boundaries first", () => {
  const chunker = new DefaultChunker();

  const chunks = chunker.chunk({
    title: "Boundary chunking",
    content: `
# Decision
Decision: keep recall cheap.

# Rationale
Rationale: boundary-aware chunks reduce later disambiguation.

# Trigger
Task: use when memory content has structured sections.
    `.trim(),
    chunkStrategy: {
      maxCharacters: 90,
      overlapCharacters: 10,
    },
  });

  assert.equal(chunks.length, 3);
  assert.ok(chunks[0].content.startsWith("# Decision"));
  assert.ok(chunks[1].content.startsWith("# Rationale"));
  assert.ok(chunks[2].content.startsWith("# Trigger"));
});
