import test from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import {
  SemanticRecallEngine, MemoryWriteError, InMemoryStorage,
  InMemoryFamiliarityVectorStore, InMemoryChunkVectorStore,
  DefaultSummaryGenerator, DefaultChunker,
} from "../src/index.js";

// Inject failure before OR after an adapter mutates, then allow compensation.
function faultProxy<T extends object>(target: T, label: string, fault: { point: string; after: boolean; persistent?: boolean }): T {
  return new Proxy(target, {
    get(object, key) {
      const value = Reflect.get(object, key);
      if (typeof value !== "function") return value;
      return async (...args: unknown[]) => {
        const hit = fault.point === label + "." + String(key);
        if (hit && !fault.persistent) fault.point = "";
        if (hit && !fault.after) throw new Error("injected failure");
        const result = await value.apply(object, args);
        if (hit) throw new Error("injected failure");
        return result;
      };
    },
  });
}

function harness() {
  const fault = { point: "", after: false, persistent: false };
  const storage = new InMemoryStorage();
  const familiarity = new InMemoryFamiliarityVectorStore();
  const chunks = new InMemoryChunkVectorStore();
  const embedding = { async embed() { return [1, 0]; } };
  const engine = new SemanticRecallEngine({
    storage: faultProxy(storage, "storage", fault),
    familiarityVectorStore: faultProxy(familiarity, "familiarity", fault),
    chunkVectorStore: faultProxy(chunks, "chunks", fault),
    embeddingProvider: faultProxy(embedding, "embedding", fault),
    summaryGenerator: faultProxy(new DefaultSummaryGenerator(), "summary", fault),
    chunker: new DefaultChunker(),
  });
  return { engine, storage, familiarity, chunks, fault };
}
const original = { id: "stable", title: "Settings", content: "Decision: preserve settings sync.", importance: 0.95, tags: ["settings"] };

for (const point of ["embedding.embed", "summary.generateShortSummary", "summary.generateStructuredSummary"]) {
  test(`preparation failure leaves previous memory intact: ${point}`, async () => {
    const h = harness();
    await h.engine.addMemory(original);
    const before = await h.storage.getMemorySnapshot("stable");
    h.fault.point = point;
    await assert.rejects(h.engine.updateMemory("stable", { content: "replacement" }), /injected/);
    assert.deepEqual(await h.storage.getMemorySnapshot("stable"), before);
  });
}

for (const point of ["storage.deleteMemory", "storage.saveSummary", "storage.saveChunks", "storage.saveRawContent", "storage.saveFamiliarity", "chunks.removeByMemoryId", "chunks.upsert", "familiarity.upsert"]) {
  for (const after of [false, true]) {
    test(`update compensates ${after ? "after" : "before"} mutation: ${point}`, async () => {
      const h = harness();
      await h.engine.addMemory(original);
      const before = await h.storage.getMemorySnapshot("stable");
      const vectorBefore = await h.chunks.searchByMemoryId("stable", [1, 0], 99);
      h.fault.point = point;
      h.fault.after = after;
      await assert.rejects(h.engine.updateMemory("stable", { content: "replacement" }), (error: unknown) => {
        assert.ok(error instanceof MemoryWriteError);
        assert.equal(error.memoryId, "stable");
        assert.deepEqual(error.recoveryErrors, []);
        return true;
      });
      assert.deepEqual(await h.storage.getMemorySnapshot("stable"), before);
      assert.deepEqual(await h.chunks.searchByMemoryId("stable", [1, 0], 99), vectorBefore);
      assert.deepEqual(await h.familiarity.search([1, 0], 99), [{ id: "stable", similarity: 1 }]);
    });
  }
}

test("failed new add removes partial storage and vectors; queue remains usable", async () => {
  const h = harness();
  h.fault.point = "familiarity.upsert";
  h.fault.after = true;
  await assert.rejects(h.engine.addMemory(original), MemoryWriteError);
  assert.equal(await h.storage.getMemorySnapshot("stable"), null);
  assert.deepEqual(await h.familiarity.search([1, 0], 99), []);
  assert.deepEqual(await h.chunks.searchByMemoryId("stable", [1, 0], 99), []);
  await h.engine.addMemory(original);
});

for (const failAt of [2, 3]) {
  test(`later embedding failure preserves the original memory (call ${failAt})`, async () => {
    const storage = new InMemoryStorage();
    let calls = 0;
    let armed = false;
    const engine = new SemanticRecallEngine({
      storage,
      familiarityVectorStore: new InMemoryFamiliarityVectorStore(),
      chunkVectorStore: new InMemoryChunkVectorStore(),
      embeddingProvider: { async embed() {
        if (armed && ++calls === failAt) throw new Error("late embedding failure");
        return [1, 0];
      } },
    });
    await engine.addMemory(original);
    const before = await storage.getMemorySnapshot("stable");
    armed = true;
    await assert.rejects(engine.updateMemory("stable", { content: "new content" }), /late embedding failure/);
    assert.deepEqual(await storage.getMemorySnapshot("stable"), before);
  });
}

test("legacy adapters without snapshots remain usable without deleting absent IDs", async () => {
  const storage = new InMemoryStorage();
  const legacy = new Proxy(storage, {
    get(target, key) {
      if (key === "getMemorySnapshot") return undefined;
      if (key === "deleteMemory") return async (id: string) => {
        assert.ok(await storage.getFamiliarity(id), "adapter rejects deletion of missing IDs");
        return storage.deleteMemory(id);
      };
      const value = Reflect.get(target, key);
      return typeof value === "function" ? value.bind(target) : value;
    },
  });
  const engine = new SemanticRecallEngine({
    storage: legacy,
    familiarityVectorStore: new InMemoryFamiliarityVectorStore(),
    chunkVectorStore: new InMemoryChunkVectorStore(),
    embeddingProvider: { async embed() { return [1, 0]; } },
  });
  await engine.addMemory(original);
  await engine.updateMemory("stable", { content: "legacy update" });
  assert.equal(await storage.getRawContent("stable"), "legacy update");
  assert.equal((await storage.getFamiliarity("stable"))?.importance, 0.95);
});

test("persistent adapter failure exposes a detached recovery snapshot", async () => {
  const h = harness();
  await h.engine.addMemory(original);
  const before = await h.storage.getMemorySnapshot("stable");
  h.fault.point = "storage.saveSummary";
  h.fault.persistent = true;
  await assert.rejects(h.engine.updateMemory("stable", { content: "replacement" }), (error: unknown) => {
    assert.ok(error instanceof MemoryWriteError);
    assert.ok(error.recoveryErrors.length > 0);
    assert.deepEqual(error.recoverySnapshot, before);
    return true;
  });
});

test("updates preserve importance and createdAt, reject duplicate adds, and clear empty chunks", async () => {
  const h = harness();
  await h.engine.addMemory(original);
  const before = await h.storage.getMemorySnapshot("stable");
  await assert.rejects(h.engine.addMemory(original), /already exists/);
  await h.engine.updateMemory("stable", { content: "" });
  const next = await h.storage.getMemorySnapshot("stable");
  assert.equal(next?.familiarity.importance, 0.95);
  assert.equal(next?.createdAt, before?.createdAt);
  assert.equal(next?.rawContent, "");
  assert.deepEqual(await h.engine.getChunks("stable"), []);
  assert.deepEqual(await h.chunks.searchByMemoryId("stable", [1, 0], 99), []);
});

test("concurrent updates retain each other's fields", async () => {
  const h = harness();
  await h.engine.addMemory(original);
  await Promise.all([
    h.engine.updateMemory("stable", { title: "Renamed" }),
    h.engine.updateMemory("stable", { content: "New content" }),
  ]);
  const next = await h.storage.getMemorySnapshot("stable");
  assert.equal(next?.familiarity.title, "Renamed");
  assert.equal(next?.rawContent, "New content");
});

const root = process.cwd();
function cli(script: string, args: string[], cwd: string) {
  const result = spawnSync(process.execPath, [join(root, "scripts", script), ...args], { cwd, encoding: "utf8" });
  assert.equal(result.error, undefined);
  return { status: result.status, data: JSON.parse(result.stdout) };
}
function project() {
  const path = fs.mkdtempSync(join(tmpdir(), "dejavu-reliability-"));
  assert.equal(cli("deja-vu.mjs", ["init", "--project-id", "project:test", "--json"], path).data.ready, true);
  return path;
}
const cue = { schema_version: 1, id: "settings", scope: "project:test", title: "Settings sync", keywords: ["settings", "sync", "preferences"], record_path: "memory/detail.md", status: "active", updated: "2026-09-17" };
function record(status = "active", extra = "", scope = "project:test") {
  return `---\nid: detail\ntitle: Settings\nstatus: ${status}\nscope: ${scope}\nupdated: 2026-09-17\n${extra}---\n# Settings\n`;
}
function routeProject(content: string, entry = cue) {
  const path = project();
  fs.writeFileSync(join(path, "memory", "detail.md"), content);
  fs.writeFileSync(join(path, "memory", "impressions.jsonl"), JSON.stringify(entry) + "\n");
  return path;
}

for (const invalid of ["null\n", "[]\n", "{broken\n", '{"keywords":null}\n']) {
  test(`malformed impressions return JSON errors, not no familiarity: ${invalid.trim()}`, () => {
    const path = project();
    fs.writeFileSync(join(path, "memory", "impressions.jsonl"), invalid);
    for (const [script, args] of [
      ["deja-vu.mjs", ["doctor", "--json"]],
      ["dejavu-lint-memory.mjs", []],
      ["dejavu-scan-memory.mjs", ["settings sync"]],
    ] as const) {
      const result = cli(script, [...args], path);
      assert.equal(result.status, 1);
      assert.equal(result.data.ok, false);
      assert.ok(result.data.diagnostics.length);
    }
  });
}

for (const [name, content] of [
  ["inactive", record("superseded", "superseded_by: memory/missing.md\n")],
  ["cross scope", record("active", "", "project:other")],
  ["cycle", record("superseded", "superseded_by: memory/detail.md\n")],
]) {
  test(`doctor, lint and scan reject ${name} routes`, () => {
    const path = routeProject(content);
    for (const [script, args] of [
      ["deja-vu.mjs", ["doctor", "--json"]],
      ["dejavu-lint-memory.mjs", []],
      ["dejavu-scan-memory.mjs", ["settings sync"]],
    ] as const) {
      const result = cli(script, [...args], path);
      assert.equal(result.status, 1);
      assert.equal(result.data.ok, false);
    }
  });
}

test("invalid feedback is an error, not silently excluded as healthy", () => {
  const path = project();
  fs.writeFileSync(join(path, "memory", "recall-feedback.jsonl"), '{"outcome":"invalid","query":"settings"}\n');
  assert.equal(cli("dejavu-feedback-report.mjs", [], path).status, 1);
});

test("missing targets, unsafe traversal and unresolved cue successors fail validation", () => {
  for (const entry of [
    { ...cue, record_path: "memory/missing.md" },
    { ...cue, record_path: "../outside.md" },
    { ...cue, status: "superseded", superseded_by: "missing-id" },
    { ...cue, status: "superseded", superseded_by: cue.id },
  ]) {
    const path = routeProject(record(), entry);
    assert.equal(cli("deja-vu.mjs", ["doctor", "--json"], path).status, 1);
    assert.equal(cli("dejavu-lint-memory.mjs", [], path).status, 1);
  }
});

test("all required project files are checked; cue-only mode is explicit", () => {
  const path = project();
  fs.unlinkSync(join(path, "memory", "summary.md"));
  const missing = cli("dejavu-scan-memory.mjs", ["settings"], path);
  assert.equal(missing.status, 1);
  assert.equal(missing.data.level, "not_initialized");
  assert.equal(cli("dejavu-scan-memory.mjs", ["--file", "memory/impressions.jsonl", "settings"], path).status, 0);
});

test("init refuses scope mismatch and unknown block versions without overwriting", () => {
  const path = project();
  const original = fs.readFileSync(join(path, "AGENTS.md"), "utf8");
  assert.equal(cli("deja-vu.mjs", ["init", "--project-id", "project:other", "--json"], path).data.ready, false);
  fs.writeFileSync(join(path, "AGENTS.md"), original.replace("rules:version=1", "rules:version=99"));
  assert.equal(cli("deja-vu.mjs", ["doctor", "--json"], path).status, 1);
  assert.equal(cli("deja-vu.mjs", ["init", "--merge-agents", "--json"], path).data.ready, false);
});

test("executable demo preserves lexical limits and grounds the successful recall", () => {
  const memoryRoot = join(root, "docs", "examples", "settings-project", "memory");
  const vague = cli("dejavu-scan-memory.mjs", ["--memory-root", memoryRoot, "Continue the settings refactor."], root);
  assert.equal(vague.status, 0);
  assert.equal(vague.data.level, "none");
  assert.equal(vague.data.score, 0.2437);
  const explicit = cli("dejavu-scan-memory.mjs", ["--memory-root", memoryRoot, "settings sync"], root);
  assert.equal(explicit.status, 0);
  assert.equal(explicit.data.level, "strong");
  assert.equal(explicit.data.score, 0.975);
  assert.equal(explicit.data.matches[0].id, "decision-settings-sync");
  assert.equal(explicit.data.matches[1].score, 0.475);
  assert.match(fs.readFileSync(join(memoryRoot, "decisions", "settings-sync.md"), "utf8"), /IME/);
  assert.match(fs.readFileSync(join(memoryRoot, "open-loops", "settings-migration.md"), "utf8"), /legacy setting names/);
});

test("negative rule mentions and partial markers require manual review", () => {
  for (const content of ["Never read memory/impressions.jsonl or memory/summary.md.\n", "<!-- deja-vu:rules:start -->\n"]) {
    const path = project();
    fs.writeFileSync(join(path, "AGENTS.md"), content);
    const result = cli("deja-vu.mjs", ["init", "--merge-agents", "--json"], path);
    assert.equal(result.data.ready, false);
    assert.equal(fs.readFileSync(join(path, "AGENTS.md"), "utf8"), content);
    assert.equal(cli("deja-vu.mjs", ["doctor", "--json"], path).status, 1);
  }
});

test("force backs up original bytes and nonexistent cwd is created safely", () => {
  const parent = fs.mkdtempSync(join(tmpdir(), "dejavu-new-cwd-"));
  const path = join(parent, "nested", "project");
  assert.equal(cli("deja-vu.mjs", ["init", "--cwd", path, "--json"], parent).data.ready, true);
  const before = fs.readFileSync(join(path, "AGENTS.md"));
  const result = cli("deja-vu.mjs", ["init", "--force", "--json"], path);
  assert.equal(result.data.ready, true);
  const backup = result.data.backup_directory;
  const manifest = JSON.parse(fs.readFileSync(join(backup, "manifest.json"), "utf8"));
  const entry = manifest.files.find((item: { path: string }) => item.path === join(path, "AGENTS.md"));
  assert.deepEqual(fs.readFileSync(join(backup, entry.backup)), before);
});

test("init preflight prevents partial writes when a parent is a file", () => {
  const path = fs.mkdtempSync(join(tmpdir(), "dejavu-preflight-"));
  fs.writeFileSync(join(path, "memory"), "keep");
  const result = cli("deja-vu.mjs", ["init", "--json"], path);
  assert.equal(result.status, 1);
  assert.equal(result.data.ok, false);
  assert.equal(fs.existsSync(join(path, "AGENTS.md")), false);
  assert.equal(fs.readFileSync(join(path, "memory"), "utf8"), "keep");
});

test("init restores prior bytes when a staged rename fails", async () => {
  const { executePlan, plannedFile } = await import(pathToFileURL(join(root, "scripts", "lib", "init-files.mjs")).href);
  const path = fs.mkdtempSync(join(tmpdir(), "dejavu-rollback-"));
  const a = join(path, "a.md");
  const b = join(path, "b.md");
  const originalBytes = Buffer.from([0xff, 0x00, 0x81]);
  fs.writeFileSync(a, originalBytes);
  const plan: unknown[] = [];
  plannedFile(plan, "overwrite", a, "changed");
  plannedFile(plan, "create", b, "new");
  const injectedFs = { ...fs, renameSync(from: fs.PathLike, to: fs.PathLike) {
    if (to === b) throw new Error("injected rename failure");
    fs.renameSync(from, to);
  } };
  assert.throws(() => executePlan(plan, { cwd: path, fs: injectedFs }), /Initialization failed/);
  assert.deepEqual(fs.readFileSync(a), originalBytes);
  assert.equal(fs.existsSync(b), false);
  assert.equal(fs.readdirSync(path).some((name) => name.endsWith(".tmp")), false);
});
