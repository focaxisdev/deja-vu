import test from "node:test";
import assert from "node:assert/strict";
import { execSync } from "node:child_process";

const root = process.cwd();

test("package metadata exposes memory CLI binaries and starter kit", () => {
  const result = JSON.parse(execSync("npm pack --dry-run --json", { cwd: root, encoding: "utf8" }));
  const files = new Set(result[0].files.map((file: { path: string }) => file.path));

  assert.equal(result[0].name, "@focaxisdev/deja-vu");
  assert.ok(files.has("scripts/deja-vu.mjs"));
  assert.ok(files.has("scripts/dejavu-scan-memory.mjs"));
  assert.ok(files.has("scripts/dejavu-lint-memory.mjs"));
  assert.ok(files.has("scripts/dejavu-feedback-report.mjs"));
  assert.ok(files.has("starter-kit/AGENTS.md"));
  assert.ok(files.has("starter-kit/memory/summary.md"));
  assert.ok(files.has("starter-kit/memory/impressions.jsonl"));
  assert.ok(files.has("starter-kit/prompts/codex.md"));
});
