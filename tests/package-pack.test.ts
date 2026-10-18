import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHash } from "node:crypto";

const root = process.cwd();

test("package metadata exposes memory CLI binaries and starter kit", () => {
  const manifest = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
  const lock = JSON.parse(readFileSync(join(root, "package-lock.json"), "utf8"));
  assert.equal(lock.version, manifest.version);
  assert.equal(lock.packages[""].version, manifest.version);
  const npmExecPath = process.env.npm_execpath;
  assert.ok(npmExecPath, "npm_execpath must be available when this test runs through npm");
  const packRoot = mkdtempSync(join(tmpdir(), "dejavu-pack-"));
  const cache = join(packRoot, "npm-cache");
  const result = JSON.parse(
    execFileSync(process.execPath, [npmExecPath, "pack", "--offline", "--json", "--pack-destination", packRoot], {
      cwd: root,
      encoding: "utf8",
      env: { ...process.env, npm_config_cache: cache },
    }),
  );
  const files = new Set(result[0].files.map((file: { path: string }) => file.path));

  assert.equal(result[0].name, "@focaxisdev/deja-vu");
  assert.equal(result[0].version, manifest.version);
  for (const path of files as Set<string>) {
    assert.match(path, /^(dist\/src\/|docs\/|starter-kit\/|scripts\/|README\.md$|CHANGELOG\.md$|CONTRIBUTING\.md$|LICENSE$|package\.json$)/, `Unexpected package path: ${path}`);
    assert.doesNotMatch(path, /(^|\/)(\.git|\.env(?:\..*)?|\.npmrc|\.aws|\.codex|node_modules|credentials|id_rsa)(\/|$)/);
  }
  assert.ok(files.has("CHANGELOG.md"));
  assert.ok(files.has("docs/release-v0.8.0.md"));
  assert.ok(files.has("scripts/deja-vu.mjs"));
  assert.ok(files.has("scripts/lib/init-files.mjs"));
  assert.ok(files.has("scripts/lib/memory-validation.mjs"));
  assert.ok(files.has("scripts/check-markdown-links.mjs"));
  assert.ok(files.has("scripts/dejavu-scan-memory.mjs"));
  assert.ok(files.has("scripts/dejavu-lint-memory.mjs"));
  assert.ok(files.has("scripts/dejavu-feedback-report.mjs"));
  assert.ok(files.has("starter-kit/AGENTS.md"));
  assert.ok(files.has("starter-kit/memory/summary.md"));
  assert.ok(files.has("starter-kit/memory/impressions.jsonl"));
  assert.ok(files.has("starter-kit/prompts/codex.md"));
  assert.ok(files.has("docs/assets/deja-vu-preview.svg"));
  assert.ok(files.has("CONTRIBUTING.md"));

  const installRoot = join(packRoot, "install");
  mkdirSync(installRoot);
  const tarball = join(packRoot, result[0].filename);
  const archive = readFileSync(tarball);
  assert.equal(result[0].integrity, `sha512-${createHash("sha512").update(archive).digest("base64")}`);
  assert.equal(result[0].shasum, createHash("sha1").update(archive).digest("hex"));
  console.log("Verified package manifest:", JSON.stringify(result[0]));
  execFileSync(
    process.execPath,
    [npmExecPath, "install", "--offline", "--prefix", installRoot, "--ignore-scripts", "--no-audit", "--no-fund", tarball],
    { cwd: packRoot, encoding: "utf8", env: { ...process.env, npm_config_cache: cache } },
  );

  const installedRoot = join(installRoot, "node_modules", "@focaxisdev", "deja-vu");
  const installedManifest = JSON.parse(readFileSync(join(installedRoot, "package.json"), "utf8"));
  assert.equal(installedManifest.version, manifest.version);
  assert.equal(installedManifest.bin["deja-vu"], "scripts/deja-vu.mjs");
  for (const path of files as Set<string>) {
    if (!/\.(?:json|jsonl|js|mjs|ts|md|txt|svg)$/.test(path)) continue;
    const content = readFileSync(join(installedRoot, path), "utf8");
    assert.doesNotMatch(content, /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,}|npm_[A-Za-z0-9]{36,}|AKIA[A-Z0-9]{16}/, `Credential-like content in ${path}`);
  }
  const help = execFileSync(process.execPath, [join(installedRoot, "scripts", "deja-vu.mjs"), "--help"], {
    cwd: installRoot,
    encoding: "utf8",
  });
  assert.ok(help.includes("deja-vu init --merge-agents"));

  const runInstalled = (script: string, args: string[]) => JSON.parse(execFileSync(
    process.execPath, [join(installedRoot, "scripts", script), ...args],
    { cwd: installRoot, encoding: "utf8" },
  ));
  assert.equal(runInstalled("deja-vu.mjs", ["init", "--project-id", "project:smoke", "--json"]).ready, true);
  assert.equal(runInstalled("deja-vu.mjs", ["doctor", "--json"]).ok, true);
  assert.equal(runInstalled("dejavu-lint-memory.mjs", []).ok, true);
  assert.equal(runInstalled("dejavu-scan-memory.mjs", ["project constraints"]).ok, true);
  assert.equal(runInstalled("dejavu-feedback-report.mjs", []).ok, true);
  const smoke = execFileSync(process.execPath, ["--input-type=module", "-e", `
    import assert from "node:assert/strict";
    import { createInMemorySemanticRecallEngine, MemoryWriteError,
      CachedEmbeddingProvider, MockEmbeddingProvider, projectRecallForPrompt } from "@focaxisdev/deja-vu";
    const engine = createInMemorySemanticRecallEngine();
    await engine.addMemory({ id: "smoke", title: "Smoke", content: "original", importance: 0.9 });
    await engine.updateMemory("smoke", { content: "updated" });
    if (!(await engine.getSummary("smoke")) || typeof MemoryWriteError !== "function") throw new Error("Missing API");
    await engine.deleteMemory("smoke");
    if (await engine.getSummary("smoke")) throw new Error("Delete failed");
    const cache = new CachedEmbeddingProvider(new MockEmbeddingProvider(), { modelKey: "synthetic-v1" });
    const opted = createInMemorySemanticRecallEngine({
      embeddingProvider: cache, manageEmbeddingCache: true,
      consistentReads: true, preserveDerivedOnMetadataUpdate: true,
      cueAliases: [{ alias: "更新後快取怎麼辦", cue: "cachepolicy" }],
    });
    await opted.addMemory({ id: "policy", title: "cachepolicy", tags: ["cachepolicy"],
      content: "cachepolicy: invalidate after updates; only within the current project." });
    const recalled = await opted.recall({ text: "更新後快取怎麼辦", candidateLimit: 32, topK: 1 });
    assert.equal(recalled.matched, true);
    assert.equal(recalled.topMatch.id, "policy");
    const projection = projectRecallForPrompt(recalled, { maxBytes: 2048, includeProvenance: true });
    assert.equal(projection.bytes, Buffer.byteLength(projection.text, "utf8"));
    assert.ok(projection.bytes <= 2048);
    assert.match(projection.text, /policy/);
    await opted.updateMemory("policy", { importance: 0.9 });
    await opted.supersedeMemory("policy", { id: "replacement", title: "New policy", content: "replacement" });
    assert.equal(await opted.getSummary("policy"), null);
    assert.ok(await opted.getRawContent("replacement"));
    await opted.deleteMemory("replacement");
    assert.equal(cache.getStats().entries, 0);
    console.log("ok");
  `], { cwd: installRoot, encoding: "utf8" });
  assert.equal(smoke.trim(), "ok");
});
