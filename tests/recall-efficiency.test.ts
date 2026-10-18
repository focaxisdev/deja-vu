import test from "node:test";
import assert from "node:assert/strict";
import {
  createInMemorySemanticRecallEngine, InMemoryStorage, InMemoryChunkVectorStore,
  InMemoryFamiliarityVectorStore, CachedEmbeddingProvider, MockEmbeddingProvider,
  DefaultChunker, DefaultSummaryGenerator, projectRecallForPrompt, lexicalSimilarity,
  type FamiliarityRecord, type EmbeddingProvider, type RecallResult, type RecallInput,
} from "../src/index.js";

const now = () => new Date().toISOString();
function familiarity(id: string, tokens: string[], importance = 0.5, lastAccessedAt = now()): FamiliarityRecord {
  return { id, title: id, shortSummary: id, tags: [], impressionTokens: tokens, importance, lastAccessedAt, embeddingVector: [1] };
}
class CountingProvider extends MockEmbeddingProvider {
  calls = 0;
  async embed(text: string): Promise<number[]> { this.calls++; return super.embed(text); }
}

test("eligible lexical match cannot be hidden by a recent ineligible hybrid winner", async () => {
  const storage = new InMemoryStorage();
  const query = Array.from({ length: 10 }, (_, i) => `aa${i}`);
  await storage.saveFamiliarity(familiarity("perfect-old", query, 0, "2000-01-01T00:00:00Z"));
  await storage.saveFamiliarity(familiarity("partial-new", [...query.slice(0, 7), "xx1", "xx2", "xx3"], 1));
  const engine = createInMemorySemanticRecallEngine({ storage });
  const scan = await engine.scanImpressions(query.join(" "));
  assert.equal(scan.familiarityLevel, "strong");
  assert.equal(scan.topMatch?.id, "perfect-old");
  assert.equal(scan.candidates[1].familiarityLevel, "none");
  assert.ok(scan.candidates[1].score > scan.candidates[0].score);
  assert.equal((await engine.recall(query.join(" "))).matched, true);
});

test("candidateLimit widens search without widening output; default breadth stays compatible", async (t) => {
  // These candidates must tie on recency as well as lexical score. Wall-clock
  // changes during setup otherwise make the tie0 assertion timing-dependent.
  t.mock.timers.enable({ apis: ["Date"], now: new Date("2026-01-01T00:00:00Z") });
  const storage = new InMemoryStorage();
  for (let i = 0; i < 6; i++) await storage.saveFamiliarity(familiarity(`tie${i}`, ["alpha"], i === 5 ? 1 : 0));
  const engine = createInMemorySemanticRecallEngine({ storage });
  assert.equal((await engine.scanImpressions("alpha")).topMatch?.id, "tie0");
  const wider = await engine.scanImpressions({ text: "alpha", topK: 1, candidateLimit: 6 });
  assert.equal(wider.topMatch?.id, "tie5");
  assert.equal(wider.candidates.length, 1);
  const none = await engine.scanImpressions("absent");
  assert.equal(none.matched, false);
  assert.equal(none.topMatch, null);
});

test("hybrid order remains intact among eligible weak and strong candidates", async () => {
  const storage = new InMemoryStorage();
  const query = Array.from({ length: 10 }, (_, i) => `aa${i}`);
  await storage.saveFamiliarity(familiarity("strong", query, 0, "2000-01-01T00:00:00Z"));
  await storage.saveFamiliarity(familiarity("weak", [...query.slice(0, 8), "xx1", "xx2"], 1));
  const scan = await createInMemorySemanticRecallEngine({ storage }).scanImpressions(query.join(" "));
  assert.equal(scan.topMatch?.id, "weak");
  assert.equal(scan.familiarityLevel, "weak");
});

for (const limit of [-1, NaN, Infinity, -Infinity, 1.5, 1001, Number.MAX_SAFE_INTEGER]) {
  test(`rejects invalid recall limits before I/O: ${limit}`, async () => {
    const engine = createInMemorySemanticRecallEngine({ storage: new Proxy(new InMemoryStorage(), {
      get() { throw new Error("unexpected storage access"); },
    }) });
    for (const key of ["topK", "candidateLimit", "chunkLimit"] as const) {
      const query: RecallInput = { text: "alpha", [key]: limit };
      await assert.rejects(engine.scanImpressions(query), RangeError);
      await assert.rejects(engine.recall(query), RangeError);
    }
    await assert.rejects(new InMemoryStorage().searchImpressions([], limit), RangeError);
    await assert.rejects(new InMemoryFamiliarityVectorStore().search([1], limit), RangeError);
    await assert.rejects(new InMemoryChunkVectorStore().searchByMemoryId("id", [1], limit), RangeError);
  });
}

test("zero limits are empty and avoid unnecessary embedding; inconsistent breadth rejects", async () => {
  const provider = new CountingProvider();
  const engine = createInMemorySemanticRecallEngine({ embeddingProvider: provider });
  await engine.addMemory({ id: "alpha", title: "alpha", content: "alpha details" });
  provider.calls = 0;
  const empty = await engine.recall({ text: "alpha", topK: 0, loadChunks: true });
  assert.equal(empty.matched, false);
  assert.deepEqual(empty.candidates, []);
  const summary = await engine.recall({ text: "alpha", loadChunks: true, chunkLimit: 0 });
  assert.ok(summary.summaryIfLoaded);
  assert.deepEqual(summary.chunksIfLoaded, []);
  assert.equal(provider.calls, 0);
  await assert.rejects(engine.scanImpressions({ text: "alpha", topK: 5, candidateLimit: 4 }), RangeError);
  await assert.rejects(engine.scanImpressions({ text: 42 } as unknown as RecallInput), TypeError);
});

test("thresholds and chunk sizes reject unsafe numeric inputs without retuning defaults", () => {
  for (const thresholds of [{ weak: NaN, strong: 1 }, { weak: 0.9, strong: 0.8 }, { weak: -1, strong: 1 }, { weak: 0, strong: Infinity }]) {
    assert.throws(() => createInMemorySemanticRecallEngine({ thresholds }), RangeError);
  }
  const chunker = new DefaultChunker();
  for (const value of [-1, 0, Infinity, NaN, 1.5, 1_000_001]) {
    assert.throws(() => chunker.chunk({ title: "test", content: "alpha", chunkStrategy: { maxCharacters: value } }), RangeError);
  }
  assert.throws(() => chunker.chunk({ title: "test", content: "alpha", chunkStrategy: { maxCharacters: 10, overlapCharacters: 10 } }), RangeError);
});

test("cached token scoring equals legacy lexical scoring across multilingual inputs", async () => {
  const storage = new InMemoryStorage();
  const tokenSets = [
    ["alpha", "beta", "beta"], ["設定同步", "資料"], ["café", "naïve"],
    ["東京", "sync"], ["Über", "STRASSE", "sync"], ["e\u0301", "é", "sync"],
    ["a", "b", "sync"], ["alpha-beta", "sync"],
  ];
  for (const [i, tokens] of tokenSets.entries()) await storage.saveFamiliarity(familiarity(`r${i}`, tokens));
  for (const query of [...tokenSets, ["sync"], ["設定同步", "sync"], ["missing"], []]) {
    const expected = tokenSets.map((tokens, i) => ({ id: `r${i}`, tokens }))
      .filter((r) => query.some((t) => r.tokens.includes(t)))
      .map((r) => ({ id: r.id, similarity: lexicalSimilarity(query.join(" "), r.tokens.join(" ")) }))
      .sort((a, b) => b.similarity - a.similarity);
    const actual = await storage.searchImpressions(query, 100);
    // For equal scores, postings order (first query token, then insertion) is preserved.
    assert.deepEqual(actual.map((h) => ({ id: h.record.id, similarity: h.similarity })).sort((a, b) => a.id.localeCompare(b.id)),
      expected.sort((a, b) => a.id.localeCompare(b.id)));
  }
});

test("token cache is replaced on save, removed on delete, and isolated from returned mutations", async () => {
  const storage = new InMemoryStorage();
  const original = familiarity("id", ["old", "設定同步"]);
  await storage.saveFamiliarity(original);
  original.impressionTokens.push("external");
  const returned = (await storage.searchImpressions(["old"], 5))[0].record;
  returned.impressionTokens.push("mutated");
  (await storage.getFamiliarity("id"))!.impressionTokens.push("getter");
  (await storage.listFamiliarities())[0].impressionTokens.push("list");
  assert.deepEqual((await storage.getFamiliarity("id"))!.impressionTokens, ["old", "設定同步"]);
  await storage.saveFamiliarity(familiarity("id", ["new", "東京"]));
  assert.deepEqual(await storage.searchImpressions(["old", "設定同步"], 5), []);
  assert.equal((await storage.searchImpressions(["new", "東京"], 5))[0].similarity, 1);
  await storage.deleteMemory("id");
  assert.deepEqual(await storage.searchImpressions(["new", "東京"], 5), []);
  await storage.saveFamiliarity(familiarity("id", ["replacement"]));
  assert.deepEqual(await storage.searchImpressions(["new"], 5), []);
});

async function richRecall(): Promise<RecallResult> {
  const engine = createInMemorySemanticRecallEngine();
  await engine.addMemory({ id: "synthetic", title: "settings sync", content: "Decision: settings sync. " + "設定同步 café 😀資料 ".repeat(150),
    metadata: { privateExtra: "DO_NOT_PROJECT" }, recentUpdates: ["更新😀".repeat(1000)] });
  return engine.recall({ text: "settings sync", loadChunks: true });
}

test("prompt projection allowlists data, enforces whole-output bytes and preserves Unicode", async () => {
  const result = await richRecall();
  const original = JSON.stringify(result);
  const projection = projectRecallForPrompt(result, { maxBytes: 512 });
  assert.ok(projection.truncated);
  assert.ok(projection.bytes <= 512);
  assert.equal(projection.bytes, Buffer.byteLength(projection.text));
  assert.ok(!projection.text.includes("embeddingVector"));
  assert.ok(!projection.text.includes("DO_NOT_PROJECT"));
  assert.ok(!projection.text.includes("candidates"));
  for (const line of projection.text.split("\n")) {
    const record = JSON.parse(line);
    assert.ok(["summary", "chunk"].includes(record.kind));
    assert.ok(!/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/u.test(record.text));
  }
  assert.equal(JSON.stringify(result), original);
  const full = projectRecallForPrompt(result, { maxBytes: 100_000 });
  assert.equal(full.truncated, false);
  assert.ok(full.text.includes('"kind":"chunk"'));
});

test("prompt budgets cover framing, tokenizer counts, tiny budgets and hostile lengths", async () => {
  const result = await richRecall();
  const countTokens = (text: string) => Array.from(text).length;
  for (const maxTokens of [0, 1, 80, 250]) {
    const projected = projectRecallForPrompt(result, { maxBytes: 500, maxTokens, countTokens });
    assert.ok(projected.tokens! <= maxTokens);
    assert.equal(projected.tokens, countTokens(projected.text));
    assert.ok(Buffer.byteLength(projected.text) <= 500);
  }
  assert.equal(projectRecallForPrompt(result, { maxBytes: 0 }).text, "");
  assert.equal(projectRecallForPrompt(result, { maxBytes: 1 }).text, "");
  result.summaryIfLoaded!.id = "x".repeat(100_000);
  assert.equal(projectRecallForPrompt(result, { maxBytes: 100 }).text, "");
  assert.throws(() => projectRecallForPrompt(result, { maxTokens: 10 }), TypeError);
  for (const value of [-1, NaN, Infinity, 0.5, 1_048_577]) {
    assert.throws(() => projectRecallForPrompt(result, { maxBytes: value }), RangeError);
    assert.throws(() => projectRecallForPrompt(result, { maxTokens: value, countTokens }), RangeError);
  }
  assert.throws(() => projectRecallForPrompt(result, { countTokens: () => NaN }), RangeError);
  const empty = await createInMemorySemanticRecallEngine().recall("absent");
  assert.deepEqual(projectRecallForPrompt(empty), { text: "", bytes: 0, truncated: false });
});

test("opt-in metadata updates preserve vectors/chunk IDs and use zero generation calls", async () => {
  const provider = new CountingProvider();
  const storage = new InMemoryStorage();
  const engine = createInMemorySemanticRecallEngine({ storage, embeddingProvider: provider, preserveDerivedOnMetadataUpdate: true });
  await engine.addMemory({ id: "id", title: "alpha", content: "Decision: alpha. " + "details ".repeat(100) });
  const before = await storage.getMemorySnapshot("id");
  provider.calls = 0;
  await engine.updateMemory("id", { importance: 0.9, metadata: { source: "synthetic", title: "cannot override" } });
  const after = await storage.getMemorySnapshot("id");
  assert.equal(provider.calls, 0);
  assert.deepEqual(after!.chunks, before!.chunks);
  assert.deepEqual(after!.summary.embeddingVector, before!.summary.embeddingVector);
  assert.equal(after!.createdAt, before!.createdAt);
  assert.equal(after!.familiarity.importance, 0.9);
  assert.equal(after!.summary.metadata.title, "alpha");
  assert.equal(after!.summary.metadata.source, "synthetic");
  await engine.updateMemory("id", { content: "beta replacement", title: "beta" });
  assert.ok(provider.calls > 0);
  assert.equal((await engine.recall("alpha")).matched, false);
  assert.equal((await engine.recall("beta")).matched, true);
  await engine.deleteMemory("id");
  assert.equal((await engine.recall("beta")).matched, false);
});

test("default metadata updates still invoke custom generators", async () => {
  const provider = new CountingProvider();
  const generator = new DefaultSummaryGenerator();
  let calls = 0;
  const engine = createInMemorySemanticRecallEngine({ embeddingProvider: provider, summaryGenerator: {
    generateShortSummary: (input) => generator.generateShortSummary(input),
    generateStructuredSummary: async (input) => { calls++; return generator.generateStructuredSummary(input); },
  } });
  await engine.addMemory({ id: "id", title: "alpha", content: "alpha" });
  provider.calls = 0; calls = 0;
  await engine.updateMemory("id", { metadata: { value: "new" } });
  assert.equal(calls, 1);
  assert.ok(provider.calls > 0);
});

test("metadata fast path retains compensated rollback", async () => {
  const storage = new InMemoryStorage();
  let armed = false;
  const adapter = new Proxy(storage, { get(target, key) {
    const value = Reflect.get(target, key);
    if (key === "saveSummary") return async (...args: Parameters<InMemoryStorage["saveSummary"]>) => {
      if (armed) { armed = false; throw new Error("injected write failure"); }
      return target.saveSummary(...args);
    };
    return typeof value === "function" ? value.bind(target) : value;
  } });
  const engine = createInMemorySemanticRecallEngine({ storage: adapter, preserveDerivedOnMetadataUpdate: true });
  await engine.addMemory({ id: "id", title: "alpha", content: "alpha" });
  const before = await storage.getMemorySnapshot("id");
  armed = true;
  await assert.rejects(engine.updateMemory("id", { importance: 0.9 }), /previous state restored/);
  assert.deepEqual(await storage.getMemorySnapshot("id"), before);
  assert.equal((await engine.recall("alpha")).matched, true);
});

test("embedding cache keys exact content and model version, isolates vector mutation and evicts LRU", async () => {
  let version = "provider/model:v1";
  let calls = 0;
  const provider: EmbeddingProvider = { async embed(text) { calls++; return [text.length, calls]; } };
  const cache = new CachedEmbeddingProvider(provider, { modelKey: () => version, maxEntries: 2 });
  const first = await cache.embed("設定同步"); first[0] = 999;
  assert.notEqual((await cache.embed("設定同步"))[0], 999);
  assert.equal(calls, 1);
  await cache.embed("alpha"); await cache.embed("設定同步"); await cache.embed("beta");
  await cache.embed("alpha"); assert.equal(calls, 4); // alpha was LRU
  version = "provider/model:v2";
  await cache.embed("alpha"); assert.equal(calls, 5);
  await cache.embed("Alpha"); assert.equal(calls, 6);
  cache.clear(); await cache.embed("alpha"); assert.equal(calls, 7);
});

test("embedding cache bounds bytes, bypasses oversized entries and does not cache failures", async () => {
  let calls = 0;
  // SHA-256 hex digest accounts for 128 bytes; two vector values add 16.
  // One entry fits exactly. Oversized vectors still bypass retention.
  const cache = new CachedEmbeddingProvider({ async embed(text) { calls++; return text.length > 10 ? Array(100).fill(1) : [1, 2]; } }, { modelKey: "v1", maxBytes: 144 });
  await cache.embed("a"); await cache.embed("a"); assert.equal(calls, 1);
  await cache.embed("b"); await cache.embed("a"); assert.equal(calls, 3);
  await cache.embed("x".repeat(100)); await cache.embed("x".repeat(100)); assert.equal(calls, 5);
  let attempt = 0;
  const failing = new CachedEmbeddingProvider({ async embed() { if (++attempt === 1) throw new Error("retry"); return [1]; } }, { modelKey: "v1" });
  await assert.rejects(failing.embed("same"), /retry/);
  await failing.embed("same"); await failing.embed("same"); assert.equal(attempt, 2);
  for (const vector of [[], [NaN], [Infinity], new Array<number>(3)]) {
    const invalid = new CachedEmbeddingProvider({ async embed() { return vector; } }, { modelKey: "v1" });
    await assert.rejects(invalid.embed("x"), TypeError);
  }
  for (const value of [-1, NaN, Infinity, 1.5, Number.MAX_SAFE_INTEGER]) {
    assert.throws(() => new CachedEmbeddingProvider(new MockEmbeddingProvider(), { modelKey: "v1", maxEntries: value }), RangeError);
    assert.throws(() => new CachedEmbeddingProvider(new MockEmbeddingProvider(), { modelKey: "v1", maxBytes: value }), RangeError);
  }
  assert.throws(() => new CachedEmbeddingProvider(new MockEmbeddingProvider(), { modelKey: "" }), TypeError);
});

test("clear or model changes while embedding is pending cannot populate an obsolete cache", async () => {
  let complete!: (vector: number[]) => void;
  let calls = 0;
  let model = "v1";
  const cache = new CachedEmbeddingProvider({ embed: async () => {
    calls++;
    if (calls <= 2) return new Promise<number[]>((resolve) => { complete = resolve; });
    return [calls];
  } }, { modelKey: () => model });
  const pending = cache.embed("text"); cache.clear(); complete([1]); await pending;
  const pending2 = cache.embed("text"); model = "v2"; complete([2]); await pending2;
  model = "v1"; await cache.embed("text"); assert.equal(calls, 3);
});

test("cached embeddings do not resurrect updated or deleted memory", async () => {
  const provider = new CountingProvider();
  const cache = new CachedEmbeddingProvider(provider, { modelKey: "mock:v1", maxEntries: 32 });
  const engine = createInMemorySemanticRecallEngine({ embeddingProvider: cache });
  await engine.addMemory({ id: "id", title: "alpha", content: "alpha" });
  provider.calls = 0;
  await engine.recall({ text: "alpha", loadChunks: true });
  await engine.recall({ text: "alpha", loadChunks: true });
  assert.ok(provider.calls <= 1);
  await engine.updateMemory("id", { title: "beta", content: "beta" });
  assert.equal((await engine.recall("alpha")).matched, false);
  assert.equal((await engine.recall({ text: "beta", loadChunks: true })).chunksIfLoaded[0].content, "beta");
  await engine.deleteMemory("id");
  assert.equal((await engine.recall("beta")).matched, false);
});

test("cached scoring preserves exact scores and posting tie order on seeded mixed-language queries", async () => {
  let seed = 42;
  const pick = (n: number) => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed % n; };
  const terms = ["alpha", "beta", "café", "設定同步", "東京", "данные", "sync", "c++", "a", "e\u0301"];
  const storage = new InMemoryStorage();
  const rows = Array.from({ length: 40 }, (_, i) => familiarity(`id${i}`, Array.from({ length: 12 }, () => terms[pick(terms.length)])));
  for (const row of rows) await storage.saveFamiliarity(row);
  for (let i = 0; i < 100; i++) {
    const query = Array.from({ length: 6 }, () => terms[pick(terms.length)]);
    const ids = new Set<string>();
    for (const token of query) for (const row of rows) if (row.impressionTokens.includes(token)) ids.add(row.id);
    const expected = [...ids].map((id) => {
      const row = rows.find((r) => r.id === id)!;
      return [id, lexicalSimilarity(query.join(" "), row.impressionTokens.join(" "))] as const;
    }).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const actual = (await storage.searchImpressions(query, 5)).map((hit) => [hit.record.id, hit.similarity]);
    assert.deepEqual(actual, expected);
  }
});

test("concurrent embedding misses remain bounded and disabled caches never retain entries", async () => {
  let calls = 0;
  const provider = { async embed(text: string) { calls++; await Promise.resolve(); return [text.length]; } };
  const disabled = new CachedEmbeddingProvider(provider, { modelKey: "v1", maxEntries: 0 });
  await disabled.embed("a"); await disabled.embed("a"); assert.equal(calls, 2);
  const cache = new CachedEmbeddingProvider(provider, { modelKey: "v1", maxEntries: 1 });
  await Promise.all([cache.embed("a"), cache.embed("a"), cache.embed("b")]);
  const before = calls;
  await cache.embed("b"); assert.equal(calls, before);
  await cache.embed("a"); assert.equal(calls, before + 1);
});
