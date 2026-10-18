#!/usr/bin/env node
// Synthetic data only. Run against compiled modules; no network or dependencies.
// node scripts/benchmark-recall.mjs /path/to/base/dist/src/index.js ./dist/src/index.js
import { performance } from "node:perf_hooks";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import assert from "node:assert/strict";

const paths = process.argv.slice(2);
if (paths.length !== 2) throw new Error("Usage: benchmark-recall.mjs BASELINE_MODULE CURRENT_MODULE");
const [baseline, current] = await Promise.all(paths.map((path) => import(pathToFileURL(resolve(path)).href)));
const samples = 25;
const report = { node: process.version, samples, warmups: 5, units: "milliseconds", notes: [
  "Micro: storage.searchImpressions only. Scan: engine.scanImpressions.",
  "API end-to-end: resident recall(loadChunks=true) plus JSON.stringify, including query embedding and chunk retrieval.",
  "Excludes process start, index construction, persistence, network, model inference and host/LLM execution.",
  "Baseline/current alternate measurement order. Medians/p95 are descriptive of this small synthetic run.",
], workloads: [], operations: {} };
const stats = (values) => {
  const sorted = values.toSorted((a, b) => a - b);
  return { median: +sorted[Math.floor(sorted.length / 2)].toFixed(4), p95: +sorted[Math.ceil(sorted.length * .95) - 1].toFixed(4) };
};
async function paired(left, right) {
  for (let i = 0; i < 5; i++) { await left(); await right(); }
  const times = [[], []];
  const fns = [left, right];
  for (let i = 0; i < samples; i++) {
    for (const index of (i % 2 ? [1, 0] : [0, 1])) {
      const start = performance.now(); await fns[index](); times[index].push(performance.now() - start);
    }
  }
  return { baseline: stats(times[0]), current: stats(times[1]) };
}
async function fixture(api, n) {
  const storage = new api.InMemoryStorage();
  const chunkVectorStore = new api.InMemoryChunkVectorStore();
  const vector = await new api.MockEmbeddingProvider().embed("shared routing synthetic benchmark");
  for (let i = 0; i < n; i++) {
    const id = `item${i}`;
    await storage.saveFamiliarity({ id, title: id, shortSummary: id, tags: [],
      impressionTokens: ["shared", `topic${i}`, "routing", "synthetic", "benchmark"],
      importance: .5, lastAccessedAt: "2026-01-01T00:00:00Z", embeddingVector: [1] });
    await storage.saveSummary({ id, description: "Synthetic decision", context: "Synthetic rationale", architectureOrIntent: "Synthetic intent", recentUpdates: [], metadata: {}, embeddingVector: vector });
    const chunks = Array.from({ length: 10 }, (_, j) => ({ chunkId: `${id}-${j}`, memoryId: id, type: "note", content: "shared routing synthetic benchmark", createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z", importance: .5, embeddingVector: vector }));
    await storage.saveChunks(chunks); await chunkVectorStore.upsert(chunks);
  }
  return { storage, engine: api.createInMemorySemanticRecallEngine({ storage, chunkVectorStore }) };
}
for (const n of [100, 1000, 10000]) {
  const fixtures = [await fixture(baseline, n), await fixture(current, n)];
  for (const [kind, query] of [["rare", `topic${n - 1}`], ["common", "shared"], ["none", "absentword"]]) {
    const tokens = baseline.extractKeywords(query, 200);
    const hits = await Promise.all(fixtures.map(({ storage }) => storage.searchImpressions(tokens, 5)));
    assert.deepEqual(hits[0].map(h => [h.record.id, h.similarity]), hits[1].map(h => [h.record.id, h.similarity]));
    const micro = await paired(...fixtures.map(({ storage }) => () => storage.searchImpressions(tokens, 5)));
    const scan = await paired(...fixtures.map(({ engine }) => () => engine.scanImpressions(query)));
    const apiEndToEnd = await paired(...fixtures.map(({ engine }) => async () => JSON.stringify(await engine.recall({ text: query, loadChunks: true }))));
    report.workloads.push({ n, kind, micro, scan, apiEndToEnd });
  }
}
async function operations(api, optimized) {
  let calls = 0;
  const mock = new api.MockEmbeddingProvider();
  const counting = { async embed(text) { calls++; return mock.embed(text); } };
  const embeddingProvider = optimized ? new api.CachedEmbeddingProvider(counting, { modelKey: "mock:256:v1" }) : counting;
  const engine = api.createInMemorySemanticRecallEngine({ embeddingProvider, preserveDerivedOnMetadataUpdate: optimized });
  const content = ("Decision: settings sync preserves preferences. " + "Synthetic explanation. ".repeat(14) + "\n\n").repeat(5);
  await engine.addMemory({ id: "synthetic", title: "settings sync", tags: ["preferences"], content });
  const addCalls = calls; calls = 0;
  let result;
  for (let i = 0; i < 5; i++) result = await engine.recall({ text: "settings sync", loadChunks: true });
  const repeatedRecallCalls = calls; calls = 0;
  await engine.updateMemory("synthetic", { importance: .9 });
  return { addCalls, repeatedRecallCalls, metadataUpdateCalls: calls,
    rawRecallBytes: Buffer.byteLength(JSON.stringify(result)),
    ...(optimized ? { projectedBytes: api.projectRecallForPrompt(result).bytes } : {}) };
}
report.operations.baseline = await operations(baseline, false);
report.operations.currentOptIn = await operations(current, true);
console.log(JSON.stringify(report, null, 2));
