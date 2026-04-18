import test from "node:test";
import assert from "node:assert/strict";

import { createInMemorySemanticRecallEngine } from "../src/index.js";

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
