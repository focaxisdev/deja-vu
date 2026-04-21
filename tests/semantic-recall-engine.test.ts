import test from "node:test";
import assert from "node:assert/strict";

import { createInMemorySemanticRecallEngine } from "../src/index.js";
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
