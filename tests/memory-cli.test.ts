import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync, execSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const root = process.cwd();
const scanScript = join(root, "scripts", "dejavu-scan-memory.mjs");
const lintScript = join(root, "scripts", "dejavu-lint-memory.mjs");

function runJson(script: string, args: string[], cwd: string) {
  return JSON.parse(execFileSync(process.execPath, [script, ...args], { cwd, encoding: "utf8" }));
}

function runJsonAllowFailure(script: string, args: string[], cwd: string) {
  try {
    return runJson(script, args, cwd);
  } catch (error) {
    if (typeof error === "object" && error !== null && "stdout" in error) {
      return JSON.parse(String((error as { stdout: string }).stdout));
    }
    throw error;
  }
}

test("scan CLI reports unmatched when overlap stays below threshold", () => {
  const project = mkdtempSync(join(tmpdir(), "dejavu-scan-"));
  const memory = join(project, "memory");
  mkdirSync(memory);
  writeFileSync(
    join(memory, "impressions.jsonl"),
    [
      JSON.stringify({
        schema_version: 1,
        id: "one",
        scope: "project:test",
        title: "Alpha memory",
        keywords: ["alpha", "beta", "gamma"],
        record_path: "memory/summary.md",
        updated: "2026-04-21",
        status: "active",
      }),
      "",
    ].join("\n"),
    "utf8",
  );

  const result = runJson(scanScript, ["alpha delta epsilon zeta eta theta"], project);

  assert.equal(result.level, "none");
  assert.equal(result.matched, false);
  assert.equal(result.matches.length, 1);
  assert.equal(result.budget.impression_scan, 1);
  assert.equal(result.budget.summaries_loaded, 0);
  assert.deepEqual(result.feedback_hint.outcomes, ["helpful", "irrelevant", "missed", "overloaded"]);
});

test("lint CLI validates impression records and linked paths", () => {
  const project = mkdtempSync(join(tmpdir(), "dejavu-lint-"));
  const memory = join(project, "memory");
  mkdirSync(memory);
  writeFileSync(join(memory, "summary.md"), "# Summary\n", "utf8");
  writeFileSync(
    join(memory, "impressions.jsonl"),
    [
      JSON.stringify({
        schema_version: 1,
        id: "summary",
        scope: "project:test",
        title: "Summary",
        keywords: ["summary"],
        record_path: "memory/summary.md",
        updated: "2026-04-21",
        status: "active",
      }),
      "",
    ].join("\n"),
    "utf8",
  );

  const result = runJson(lintScript, [], project);

  assert.equal(result.ok, true);
  assert.equal(result.error_count, 0);
});

test("lint CLI warns about low-quality impression cues", () => {
  const project = mkdtempSync(join(tmpdir(), "dejavu-lint-cues-"));
  const memory = join(project, "memory");
  mkdirSync(memory);
  writeFileSync(join(memory, "summary.md"), "# Summary\n", "utf8");
  writeFileSync(join(memory, "decision.md"), "# Decision\n", "utf8");
  writeFileSync(
    join(memory, "impressions.jsonl"),
    [
      JSON.stringify({
        schema_version: 1,
        id: "summary",
        scope: "project:test",
        title: "Summary",
        keywords: ["project", "memory", "summary", "project"],
        record_path: "memory/summary.md",
        updated: "2026-04-21",
        status: "active",
      }),
      JSON.stringify({
        schema_version: 1,
        id: "decision",
        scope: "project:test",
        title: "Decision",
        keywords: ["summary", "memory", "project"],
        record_path: "memory/decision.md",
        updated: "2026-04-21",
        status: "active",
      }),
      "",
    ].join("\n"),
    "utf8",
  );

  const result = runJson(lintScript, [], project);
  const messages = result.diagnostics.map((item: { message: string }) => item.message);

  assert.equal(result.ok, true);
  assert.equal(result.error_count, 0);
  assert.ok(messages.includes("keywords contain duplicate cue terms"));
  assert.ok(messages.includes("keywords rely on too many generic cue terms"));
  assert.ok(messages.includes("duplicate keyword set across impression records"));
});

test("lint CLI validates recall feedback records", () => {
  const project = mkdtempSync(join(tmpdir(), "dejavu-feedback-"));
  const memory = join(project, "memory");
  mkdirSync(memory);
  writeFileSync(join(memory, "summary.md"), "# Summary\n", "utf8");
  writeFileSync(
    join(memory, "impressions.jsonl"),
    [
      JSON.stringify({
        schema_version: 1,
        id: "summary",
        scope: "project:test",
        title: "Summary",
        keywords: ["summary", "recall", "feedback"],
        record_path: "memory/summary.md",
        updated: "2026-04-21",
        status: "active",
        weight: 0.5,
      }),
      "",
    ].join("\n"),
    "utf8",
  );
  writeFileSync(
    join(memory, "recall-feedback.jsonl"),
    [
      JSON.stringify({
        schema_version: 1,
        query: "summary recall",
        matched_id: "summary",
        outcome: "helpful",
        created: "2026-04-24T12:00:00Z",
      }),
      JSON.stringify({
        schema_version: 1,
        query: "noisy recall",
        outcome: "confusing",
        created: "today",
      }),
      "",
    ].join("\n"),
    "utf8",
  );

  const result = runJsonAllowFailure(lintScript, [], project);
  const messages = result.diagnostics.map((item: { message: string }) => item.message);

  assert.equal(result.ok, false);
  assert.equal(result.error_count, 1);
  assert.ok(messages.includes("feedback outcome must be helpful, irrelevant, missed, or overloaded"));
  assert.ok(messages.includes("feedback created should use YYYY-MM-DD or ISO timestamp"));
});

test("package metadata exposes memory CLI binaries", () => {
  const result = JSON.parse(execSync("npm pack --dry-run --json", { cwd: root, encoding: "utf8" }));
  const files = new Set(result[0].files.map((file: { path: string }) => file.path));

  assert.equal(result[0].name, "@focaxisdev/deja-vu");
  assert.ok(files.has("scripts/dejavu-scan-memory.mjs"));
  assert.ok(files.has("scripts/dejavu-lint-memory.mjs"));
});
