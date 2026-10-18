import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  CachedEmbeddingProvider, createInMemorySemanticRecallEngine, InMemoryStorage,
  InMemoryChunkVectorStore, InMemoryFamiliarityVectorStore, MemoryWriteError,
  MemorySupersedeError, projectRecallForPrompt, type EmbeddingProvider, type RecallResult,
} from "../src/index.js";

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(r => { resolve = r; });
  return { promise, resolve };
}
function counted() {
  let calls = 0;
  const cache = new CachedEmbeddingProvider({ async embed(text) { calls++; return [text.length, 1]; } }, { modelKey: "synthetic:v1" });
  return { cache, calls: () => calls };
}
function fault<T extends object>(target: T, method: keyof T, shouldFail: () => boolean): T {
  return new Proxy(target, { get(object, key) {
    const value = Reflect.get(object, key);
    if (key === method) return async (...args: unknown[]) => {
      if (shouldFail()) throw new Error(`injected ${String(method)}`);
      if (typeof value !== "function") throw new TypeError("fault target must be callable");
      return value.apply(object, args);
    };
    return typeof value === "function" ? value.bind(object) : value;
  } });
}

test("aliases are bounded exact queries, copied at construction, and opt-in", async () => {
  const aliases = [{ alias: "還原備份", cue: "restoreroute" }, { alias: "restore archive", cue: "restoreroute" }];
  const engine = createInMemorySemanticRecallEngine({ cueAliases: aliases });
  const plain = createInMemorySemanticRecallEngine();
  for (const e of [engine, plain]) await e.addMemory({ id: "id", title: "restoreroute", content: "synthetic" });
  aliases[0].cue = "changed";
  assert.equal((await engine.recall("還原備份")).topMatch?.id, "id");
  assert.equal((await engine.recall("  RESTORE  archive  ")).topMatch?.id, "id");
  assert.equal((await plain.recall("還原備份")).matched, false);
  for (const query of ["不要還原備份", "do not restore archive", "restore archive price"]) {
    assert.equal((await engine.recall(query)).matched, false);
  }
  await engine.updateMemory("id", { title: "otherroute" });
  assert.equal((await engine.recall("還原備份")).matched, false);
  await engine.deleteMemory("id");
  assert.equal((await engine.recall("還原備份")).matched, false);
  for (const cueAliases of [Array(129).fill({ alias: "a", cue: "b" }), [{ alias: "", cue: "b" }],
    [{ alias: "a", cue: "x".repeat(257) }], [{ alias: "A", cue: "one" }, { alias: " a ", cue: "two" }]]) {
    assert.throws(() => createInMemorySemanticRecallEngine({ cueAliases }));
  }
});

test("scopes isolate identical content; disposing one owner preserves the other and the root", async () => {
  const { cache, calls } = counted();
  const a = cache.createScope(), b = cache.createScope();
  await a.embed("identical"); await b.embed("identical"); await cache.embed("identical");
  assert.equal(calls(), 3); assert.equal(cache.getStats().entries, 3);
  a.dispose(); a.dispose();
  assert.equal(cache.getStats().entries, 2);
  await b.embed("identical"); await cache.embed("identical"); assert.equal(calls(), 3);
  await assert.rejects(a.embed("identical"), /disposed/);
  b.dispose(); cache.clear(); assert.deepEqual(cache.getStats(), { entries: 0, accountedBytes: 0 });
});

test("disposed scopes and global clearing invalidate in-flight retention without pretending to cancel work", async () => {
  const pending = deferred<number[]>();
  const cache = new CachedEmbeddingProvider({ embed: () => pending.promise }, { modelKey: "v1" });
  const scope = cache.createScope();
  const call = scope.embed("pending"); scope.dispose(); pending.resolve([1]);
  assert.deepEqual(await call, [1]); assert.equal(cache.getStats().entries, 0);
  const pending2 = deferred<number[]>();
  const second = new CachedEmbeddingProvider({ embed: () => pending2.promise }, { modelKey: "v1" });
  const scoped = second.createScope(); const call2 = scoped.embed("pending"); second.clear(); pending2.resolve([1]);
  await call2; assert.equal(second.getStats().entries, 0);
});

test("digest keys preserve exact surrogate content and model framing; accounted bounds include digests", async () => {
  let calls = 0; let model = "ab";
  const cache = new CachedEmbeddingProvider({ async embed() { return [++calls]; } }, { modelKey: () => model, maxBytes: 136 });
  await cache.embed("c"); await cache.embed("c"); assert.equal(calls, 1);
  assert.equal(cache.getStats().accountedBytes, 136);
  model = "a"; await cache.embed("bc"); assert.equal(calls, 2);
  await cache.embed("\ud800"); await cache.embed("\ufffd"); assert.equal(calls, 4);
  await cache.embed("\ufffd"); assert.equal(calls, 4);
  assert.ok(cache.getStats().entries <= 1);
  const disabled = new CachedEmbeddingProvider({ async embed() { return [++calls]; } }, { modelKey: "v1", maxBytes: 135 });
  await disabled.embed("large".repeat(10_000)); await disabled.embed("large".repeat(10_000));
  assert.equal(calls, 6); assert.equal(disabled.getStats().entries, 0);
});

test("engine ownership releases update/delete revisions without clearing another memory", async () => {
  const { cache, calls } = counted();
  const engine = createInMemorySemanticRecallEngine({ embeddingProvider: cache, manageEmbeddingCache: true, preserveDerivedOnMetadataUpdate: true });
  for (const id of ["a", "b"]) await engine.addMemory({ id, title: "identical", content: "identical" });
  const entries = cache.getStats().entries;
  assert.ok(entries > 0 && entries % 2 === 0);
  const before = calls(); await engine.updateMemory("a", { importance: 0.9 });
  assert.equal(calls(), before); assert.equal(cache.getStats().entries, entries);
  await engine.updateMemory("a", { title: "changed", content: "changed" });
  assert.ok(calls() > before); assert.equal(cache.getStats().entries, entries);
  await engine.deleteMemory("a"); assert.equal(cache.getStats().entries, entries / 2);
  const beforeB = calls(); await engine.recall({ text: "identical", loadChunks: true });
  assert.equal(calls(), beforeB); // The chunk text is already retained in b's scope.
  await engine.deleteMemory("b"); assert.equal(cache.getStats().entries, 0);
  assert.equal((await engine.recall("identical")).matched, false);
  assert.throws(() => createInMemorySemanticRecallEngine({ embeddingProvider: { async embed() { return [1]; } }, manageEmbeddingCache: true }), /createScope/);
});

test("failed preparation and failed commit dispose new scopes but retain the previous revision", async () => {
  const storage = new InMemoryStorage(); let fail = false;
  const { cache } = counted();
  const engine = createInMemorySemanticRecallEngine({ embeddingProvider: cache, manageEmbeddingCache: true,
    storage: fault(storage, "saveSummary", () => { const value = fail; fail = false; return value; }) });
  await engine.addMemory({ id: "id", title: "original", content: "original" });
  const entries = cache.getStats().entries, snapshot = await storage.getMemorySnapshot("id");
  fail = true; await assert.rejects(engine.updateMemory("id", { title: "new", content: "new" }), MemoryWriteError);
  assert.equal(cache.getStats().entries, entries);
  assert.deepEqual(await storage.getMemorySnapshot("id"), snapshot);
  let attempts = 0;
  const failureCache = new CachedEmbeddingProvider({ async embed() { if (++attempts === 2) throw new Error("provider failure"); return [1]; } }, { modelKey: "v1" });
  const other = createInMemorySemanticRecallEngine({ embeddingProvider: failureCache, manageEmbeddingCache: true });
  await assert.rejects(other.addMemory({ title: "new", content: "distinct" }), /provider failure/);
  assert.equal(failureCache.getStats().entries, 0);
});

for (const stage of ["familiarity", "chunks", "storage"] as const) {
  test(`delete compensates a ${stage} failure and retains valid cache ownership`, async () => {
    const storage = new InMemoryStorage(), familiarity = new InMemoryFamiliarityVectorStore(), chunks = new InMemoryChunkVectorStore();
    const { cache } = counted(); let armed = false;
    const failOnce = () => { const value = armed; armed = false; return value; };
    const engine = createInMemorySemanticRecallEngine({ embeddingProvider: cache, manageEmbeddingCache: true,
      storage: stage === "storage" ? fault(storage, "deleteMemory", failOnce) : storage,
      familiarityVectorStore: stage === "familiarity" ? fault(familiarity, "remove", failOnce) : familiarity,
      chunkVectorStore: stage === "chunks" ? fault(chunks, "removeByMemoryId", failOnce) : chunks });
    await engine.addMemory({ id: "id", title: "route", content: "route" });
    const snapshot = await storage.getMemorySnapshot("id"), stats = cache.getStats();
    armed = true; await assert.rejects(engine.deleteMemory("id"), (error: unknown) => {
      assert.ok(error instanceof MemoryWriteError); assert.equal(error.recoveryErrors.length, 0); return true;
    });
    assert.deepEqual(await storage.getMemorySnapshot("id"), snapshot);
    assert.deepEqual(cache.getStats(), stats);
    assert.equal((await familiarity.search(snapshot!.familiarity.embeddingVector, 5))[0].id, "id");
    assert.equal((await chunks.searchByMemoryId("id", snapshot!.chunks[0].embeddingVector, 5)).length, snapshot!.chunks.length);
    assert.equal((await engine.recall({ text: "route", loadChunks: true })).chunksIfLoaded[0].content, "route");
  });
}

test("delete compensation errors expose a detached recovery snapshot", async () => {
  const storage = new InMemoryStorage(); let armed = false;
  const adapted = fault(fault(storage, "deleteMemory", () => armed), "saveSummary", () => armed);
  const engine = createInMemorySemanticRecallEngine({ storage: adapted });
  await engine.addMemory({ id: "id", title: "route", content: "route" }); armed = true;
  await assert.rejects(engine.deleteMemory("id"), (error: unknown) => {
    assert.ok(error instanceof MemoryWriteError); assert.equal(error.recoveryErrors.length, 1);
    assert.equal(error.recoverySnapshot?.rawContent, "route"); return true;
  });
});

test("supersede removes old cues and scopes, rejects ID collisions, and can delete the successor", async () => {
  const { cache } = counted();
  const engine = createInMemorySemanticRecallEngine({ embeddingProvider: cache, manageEmbeddingCache: true, consistentReads: true });
  await engine.addMemory({ id: "old", title: "obsoletecue", content: "old content" });
  await assert.rejects(engine.supersedeMemory("old", { id: "old", title: "x", content: "x" }), /exists/);
  assert.deepEqual(await engine.supersedeMemory("old", { id: "new", title: "currentcue", content: "new content" }), { id: "new", supersededId: "old" });
  assert.equal((await engine.recall("obsoletecue")).matched, false);
  assert.equal((await engine.recall("currentcue")).topMatch?.id, "new");
  assert.equal(await engine.getSummary("old"), null);
  await engine.deleteMemory("new"); assert.equal(cache.getStats().entries, 0);
});

test("failed supersede restores old memory and removes the uncommitted successor", async () => {
  const storage = new InMemoryStorage(); let armed = false;
  const { cache } = counted();
  const engine = createInMemorySemanticRecallEngine({ embeddingProvider: cache, manageEmbeddingCache: true,
    storage: fault(storage, "deleteMemory", () => { const value = armed; armed = false; return value; }) });
  await engine.addMemory({ id: "old", title: "obsoletecue", content: "old content" });
  const snapshot = await storage.getMemorySnapshot("old"), entries = cache.getStats().entries;
  armed = true;
  await assert.rejects(engine.supersedeMemory("old", { id: "new", title: "currentcue", content: "new content" }), (error: unknown) => {
    assert.ok(error instanceof MemorySupersedeError); assert.deepEqual(error.recoveryErrors, []); return true;
  });
  assert.deepEqual(await storage.getMemorySnapshot("old"), snapshot);
  assert.equal(await storage.getMemorySnapshot("new"), null);
  assert.equal(cache.getStats().entries, entries);
});

test("managed ownership serializes pending recall before delete, then never returns a stale queued match", async () => {
  const started = deferred<void>(), finish = deferred<number[]>(); let armed = false;
  const provider: EmbeddingProvider = { async embed(text) {
    if (armed && text === "route") { started.resolve(); return finish.promise; }
    return [text.length, 1];
  } };
  const cache = new CachedEmbeddingProvider(provider, { modelKey: "v1" });
  const engine = createInMemorySemanticRecallEngine({ embeddingProvider: cache, manageEmbeddingCache: true });
  await engine.addMemory({ id: "id", title: "route", content: "different content" });
  armed = true; const reading = engine.recall({ text: "route", loadChunks: true }); await started.promise;
  let deleted = false; const deletion = engine.deleteMemory("id").then(() => { deleted = true; });
  const after = engine.recall("route"); await Promise.resolve(); assert.equal(deleted, false);
  finish.resolve([1, 1]); assert.equal((await reading).matched, true);
  await deletion; assert.equal((await after).matched, false); assert.equal(cache.getStats().entries, 0);
});

test("consistentReads hides an update's intermediate storage state", async () => {
  const storage = new InMemoryStorage(), started = deferred<void>(), finish = deferred<void>(); let armed = false;
  const adapted = new Proxy(storage, { get(target, key) {
    if (key === "saveSummary") return async (...args: Parameters<InMemoryStorage["saveSummary"]>) => {
      if (armed) { started.resolve(); await finish.promise; } return target.saveSummary(...args);
    };
    const value = Reflect.get(target, key); return typeof value === "function" ? value.bind(target) : value;
  } });
  const engine = createInMemorySemanticRecallEngine({ storage: adapted, consistentReads: true });
  await engine.addMemory({ id: "id", title: "oldcue", content: "old" });
  armed = true; const update = engine.updateMemory("id", { title: "newcue", content: "new" }); await started.promise;
  const read = engine.recall("newcue"); finish.resolve(); await update;
  assert.equal((await read).summaryIfLoaded?.description, "Decision: new");
});

test("in-memory summaries and chunks do not expose mutable stored vectors or text", async () => {
  const engine = createInMemorySemanticRecallEngine();
  await engine.addMemory({ id: "id", title: "cue", content: "original" });
  const summary = (await engine.getSummary("id"))!; summary.description = "mutated"; summary.embeddingVector[0] = 99;
  const chunks = await engine.getChunks("id"); chunks[0].content = "mutated"; chunks[0].embeddingVector[0] = 99;
  assert.equal((await engine.getSummary("id"))?.description, "Decision: original");
  assert.equal((await engine.getChunks("id"))[0].content, "original");
  assert.notEqual((await engine.getSummary("id"))?.embeddingVector[0], 99);
});

test("provenance marks clipped qualifiers inside the byte/token budget and points to full source", async () => {
  const engine = createInMemorySemanticRecallEngine({ summaryGenerator: {
    async generateShortSummary() { return "route"; },
    async generateStructuredSummary(input) { return { description: "Short content", context: input.context!, architectureOrIntent: "", recentUpdates: [], metadata: {} }; },
  } });
  const context = "Allowed for synthetic experiments. ".repeat(30) + "NEVER use production secrets.";
  await engine.addMemory({ id: "id", title: "route", content: "Short content", context });
  const result = await engine.recall("route");
  const projected = projectRecallForPrompt(result, { maxBytes: 900, maxTokens: 900, countTokens: text => [...text].length, includeProvenance: true });
  assert.equal(projected.truncated, true); assert.ok(projected.bytes <= 900 && projected.tokens! <= 900);
  const records = projected.text.split("\n").map(line => JSON.parse(line));
  const clipped = records.find(r => r.incomplete);
  assert.ok(clipped); assert.match(clipped.warning, /qualifiers may be missing/);
  assert.equal(clipped.rawSource, "getRawContent"); assert.equal(clipped.source, "getSummary"); assert.equal(clipped.memoryId, "id"); assert.equal(clipped.field, "context");
  assert.ok(!clipped.text.includes("NEVER")); assert.ok((await engine.getSummary(clipped.memoryId))?.context.endsWith("NEVER use production secrets."));
  assert.equal(projectRecallForPrompt(result, { maxBytes: 1, includeProvenance: true }).text, "");
  const weak = { ...result, familiarityLevel: "weak" } as RecallResult;
  const weakProjection = projectRecallForPrompt(weak, { maxBytes: 8192, includeProvenance: true });
  assert.equal(weakProjection.truncated, true);
  for (const row of weakProjection.text.split("\n").map(line => JSON.parse(line))) assert.equal(row.incomplete, true);
});

test("frozen synthetic development and held-out splits retain defaults and expose unseen paraphrase misses", async () => {
  const fixture = JSON.parse(readFileSync("scripts/fixtures/recall-evaluation.json", "utf8"));
  for (const split of Object.values(fixture.splits) as any[]) {
    for (const enabled of [false, true]) {
      const engine = createInMemorySemanticRecallEngine(enabled ? { cueAliases: split.memories.flatMap((m: any) => m.aliases.map((alias: string) => ({ alias, cue: m.id }))) } : {});
      for (const { aliases: _, ...memory } of split.memories) await engine.addMemory(memory);
      let hits = 0, falseRecalls = 0;
      for (const row of split.cases) {
        const result = await engine.scanImpressions({ text: row.query, topK: 5, candidateLimit: 32 });
        const id = result.matched ? result.topMatch?.id : undefined;
        if (id && row.relevant.includes(id)) hits++;
        else if (id) falseRecalls++;
      }
      assert.equal(hits, enabled ? 10 : 2); assert.equal(falseRecalls, 0);
    }
  }
});

test("derived-summary provenance does not claim that an uncut summary preserves raw qualifiers", async () => {
  const engine = createInMemorySemanticRecallEngine();
  const content = "Allowed experiments. ".repeat(50) + "Never use production secrets.";
  await engine.addMemory({ id: "id", title: "route", content });
  const result = await engine.recall("route");
  assert.ok(!result.summaryIfLoaded!.description.includes("Never use production"));
  const projection = projectRecallForPrompt(result, { includeProvenance: true });
  const record = JSON.parse(projection.text.split("\n")[0]);
  assert.match(record.warning, /Derived summary/);
  assert.equal(record.rawSource, "getRawContent");
  assert.equal(await engine.getRawContent(record.memoryId), content);
});

test("supersede cleanup failures identify both IDs and never claim a completed rollback", async () => {
  const storage = new InMemoryStorage(); let failures = 0;
  const { cache } = counted();
  const engine = createInMemorySemanticRecallEngine({ embeddingProvider: cache, manageEmbeddingCache: true,
    storage: fault(storage, "deleteMemory", () => failures-- > 0) });
  await engine.addMemory({ id: "old", title: "oldcue", content: "original" }); failures = 2;
  await assert.rejects(engine.supersedeMemory("old", { id: "new", title: "newcue", content: "replacement" }), (error: unknown) => {
    assert.ok(error instanceof MemorySupersedeError);
    assert.equal(error.memoryId, "old"); assert.equal(error.replacementId, "new");
    assert.equal(error.recoveryErrors.length, 1); assert.match(error.message, /adapter repair/); return true;
  });
  assert.ok(await storage.getMemorySnapshot("old")); assert.ok(await storage.getMemorySnapshot("new"));
  await engine.deleteMemory("old"); await engine.deleteMemory("new"); assert.equal(cache.getStats().entries, 0);
});
