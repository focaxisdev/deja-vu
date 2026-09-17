import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const root = process.cwd();

test("package metadata exposes memory CLI binaries and starter kit", () => {
  const npmExecPath = process.env.npm_execpath;
  assert.ok(npmExecPath, "npm_execpath must be available when this test runs through npm");
  const packRoot = mkdtempSync(join(tmpdir(), "dejavu-pack-"));
  const cache = join(packRoot, "npm-cache");
  const result = JSON.parse(
    execFileSync(process.execPath, [npmExecPath, "pack", "--json", "--pack-destination", packRoot], {
      cwd: root,
      encoding: "utf8",
      env: { ...process.env, npm_config_cache: cache },
    }),
  );
  const files = new Set(result[0].files.map((file: { path: string }) => file.path));

  assert.equal(result[0].name, "@focaxisdev/deja-vu");
  assert.equal(result[0].version, "0.7.0");
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
  execFileSync(
    process.execPath,
    [npmExecPath, "install", "--prefix", installRoot, "--ignore-scripts", "--no-audit", "--no-fund", tarball],
    { cwd: packRoot, encoding: "utf8", env: { ...process.env, npm_config_cache: cache } },
  );

  const installedRoot = join(installRoot, "node_modules", "@focaxisdev", "deja-vu");
  const installedManifest = JSON.parse(readFileSync(join(installedRoot, "package.json"), "utf8"));
  assert.equal(installedManifest.bin["deja-vu"], "scripts/deja-vu.mjs");
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
    import { createInMemorySemanticRecallEngine, MemoryWriteError } from "@focaxisdev/deja-vu";
    const engine = createInMemorySemanticRecallEngine();
    await engine.addMemory({ id: "smoke", title: "Smoke", content: "original", importance: 0.9 });
    await engine.updateMemory("smoke", { content: "updated" });
    if (!(await engine.getSummary("smoke")) || typeof MemoryWriteError !== "function") throw new Error("Missing API");
    await engine.deleteMemory("smoke");
    if (await engine.getSummary("smoke")) throw new Error("Delete failed");
    console.log("ok");
  `], { cwd: installRoot, encoding: "utf8" });
  assert.equal(smoke.trim(), "ok");
});
