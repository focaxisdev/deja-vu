import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const root = process.cwd();
const unifiedCli = join(root, "scripts", "deja-vu.mjs");
const scanScript = join(root, "scripts", "dejavu-scan-memory.mjs");
const lintScript = join(root, "scripts", "dejavu-lint-memory.mjs");
const feedbackReportScript = join(root, "scripts", "dejavu-feedback-report.mjs");

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

function runCliJson(args: string[], cwd: string) {
  return runJson(unifiedCli, [...args, "--json"], cwd);
}

function runCliJsonAllowFailure(args: string[], cwd: string) {
  return runJsonAllowFailure(unifiedCli, [...args, "--json"], cwd);
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
  assert.ok(result.writeback_hint.after_work.includes("durable decision -> memory/decisions/ + memory/impressions.jsonl"));
});

test("scan CLI distinguishes missing setup from no familiarity", () => {
  const project = mkdtempSync(join(tmpdir(), "dejavu-scan-missing-"));

  const result = runJson(scanScript, ["settings refactor"], project);

  assert.equal(result.level, "not_initialized");
  assert.equal(result.matched, false);
  assert.equal(result.budget.impression_scan, 0);
  assert.equal(result.bootstrap_hint.required_files.length, 3);
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

test("lint CLI checks Markdown memory lifecycle records", () => {
  const project = mkdtempSync(join(tmpdir(), "dejavu-lint-markdown-"));
  const memory = join(project, "memory");
  mkdirSync(memory);
  mkdirSync(join(memory, "decisions"));
  mkdirSync(join(memory, "open-loops"));
  writeFileSync(
    join(memory, "summary.md"),
    [
      "---",
      "id: summary",
      "title: Summary",
      "status: active",
      "scope: project:test",
      "updated: 2026-04-21",
      "---",
      "",
      "# Summary",
      "",
    ].join("\n"),
    "utf8",
  );
  writeFileSync(
    join(memory, "decisions", "bad.md"),
    [
      "---",
      "id: bad-decision",
      "title: Bad Decision",
      "status: active",
      "scope: project:test",
      "updated: 2026-04-21",
      "---",
      "",
      "# Bad Decision",
      "## Decision",
      "Do this.",
      "",
    ].join("\n"),
    "utf8",
  );
  writeFileSync(
    join(memory, "open-loops", "bad.md"),
    [
      "---",
      "id: bad-loop",
      "title: Bad Loop",
      "status: active",
      "scope: project:test",
      "updated: 2026-04-21",
      "---",
      "",
      "# Bad Loop",
      "## Owner",
      "agent",
      "",
    ].join("\n"),
    "utf8",
  );
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
      }),
      "",
    ].join("\n"),
    "utf8",
  );

  const result = runJson(lintScript, [], project);
  const messages = result.diagnostics.map((item: { message: string }) => item.message);

  assert.equal(result.ok, true);
  assert.ok(messages.includes("decision record missing ## Rationale"));
  assert.ok(messages.includes("decision record missing ## Consequences"));
  assert.ok(messages.includes("open-loop record missing ## Next trigger"));
  assert.ok(messages.includes("open-loop record missing ## Why it matters"));
});

test("feedback report summarizes recall outcomes into maintenance suggestions", () => {
  const project = mkdtempSync(join(tmpdir(), "dejavu-feedback-report-"));
  const memory = join(project, "memory");
  mkdirSync(memory);
  writeFileSync(
    join(memory, "recall-feedback.jsonl"),
    [
      JSON.stringify({
        schema_version: 1,
        query: "architecture decision",
        matched_id: "decision-architecture",
        outcome: "helpful",
        created: "2026-04-24T12:00:00Z",
      }),
      JSON.stringify({
        schema_version: 1,
        query: "missed preference",
        outcome: "missed",
        created: "2026-04-24T12:00:00Z",
      }),
      JSON.stringify({
        schema_version: 1,
        query: "noisy engine",
        matched_id: "decision-architecture",
        outcome: "irrelevant",
        created: "2026-04-24T12:00:00Z",
      }),
      "",
    ].join("\n"),
    "utf8",
  );

  const result = runJson(feedbackReportScript, [], project);

  assert.equal(result.feedback_file_found, true);
  assert.equal(result.totals.helpful, 1);
  assert.equal(result.totals.missed, 1);
  assert.ok(result.routes.some((route: { matched_id: string; suggestions: string[] }) => route.matched_id === "unmatched" && route.suggestions.includes("add aliases, keywords, or a new impression route")));
});

test("unified CLI init dry-run does not create files", () => {
  const project = mkdtempSync(join(tmpdir(), "dejavu-init-dry-"));

  const result = runCliJson(["init", "--dry-run", "--project-id", "project:dry-run", "--agents", "codex"], project);

  assert.equal(result.ok, true);
  assert.equal(result.dry_run, true);
  assert.equal(result.project_id, "project:dry-run");
  assert.ok(result.operations.some((item: { operation: string; path: string }) => item.operation === "create" && item.path.endsWith("AGENTS.md")));
  assert.equal(existsSync(join(project, "AGENTS.md")), false);
  assert.equal(existsSync(join(project, "memory", "summary.md")), false);
  assert.equal(existsSync(join(project, "prompts", "codex.md")), false);
});

test("unified CLI init creates missing files without overwriting existing files", () => {
  const project = mkdtempSync(join(tmpdir(), "dejavu-init-"));
  writeFileSync(join(project, "AGENTS.md"), "# Existing rules\n", "utf8");

  const result = runCliJson(["init", "--project-id", "project:sample", "--agents", "codex"], project);

  assert.equal(result.ok, true);
  assert.ok(result.operations.some((item: { operation: string; path: string }) => item.operation === "skip" && item.path.endsWith("AGENTS.md")));
  assert.equal(readFileSync(join(project, "AGENTS.md"), "utf8"), "# Existing rules\n");
  assert.ok(readFileSync(join(project, "memory", "summary.md"), "utf8").includes("scope: project:sample"));
  assert.ok(readFileSync(join(project, "memory", "impressions.jsonl"), "utf8").includes('"scope":"project:sample"'));
  assert.equal(existsSync(join(project, "prompts", "codex.md")), true);
});

test("unified CLI doctor reports missing required files", () => {
  const project = mkdtempSync(join(tmpdir(), "dejavu-doctor-missing-"));

  const result = runCliJsonAllowFailure(["doctor"], project);

  assert.equal(result.ok, false);
  assert.equal(result.error_count, 3);
  assert.ok(result.diagnostics.some((item: { message: string }) => item.message === "Missing AGENTS.md"));
  assert.ok(result.diagnostics.some((item: { message: string }) => item.message === "Missing memory/summary.md"));
  assert.ok(result.diagnostics.some((item: { message: string }) => item.message === "Missing memory/impressions.jsonl"));
});

test("unified CLI doctor catches unresolved feedback and obvious secrets", () => {
  const project = mkdtempSync(join(tmpdir(), "dejavu-doctor-risk-"));
  const memory = join(project, "memory");
  mkdirSync(memory);
  writeFileSync(join(project, "AGENTS.md"), "# Rules\n", "utf8");
  writeFileSync(join(memory, "summary.md"), "# Summary\npassword = abcdefghijklmnopqrstuvwxyz\n", "utf8");
  writeFileSync(
    join(memory, "impressions.jsonl"),
    `${JSON.stringify({
      schema_version: 1,
      id: "summary",
      scope: "project:test",
      title: "Summary",
      keywords: ["summary", "project", "constraints"],
      record_path: "memory/summary.md",
      updated: "2026-05-16",
      status: "active",
    })}\n`,
    "utf8",
  );
  writeFileSync(
    join(memory, "recall-feedback.jsonl"),
    `${JSON.stringify({
      schema_version: 1,
      query: "missing feedback route",
      matched_id: "does-not-exist",
      outcome: "helpful",
      created: "2026-05-16T00:00:00Z",
    })}\n`,
    "utf8",
  );

  const result = runCliJsonAllowFailure(["doctor"], project);
  const messages = result.diagnostics.map((item: { message: string }) => item.message);

  assert.equal(result.ok, false);
  assert.ok(messages.includes("Feedback matched_id does not resolve to an active impression"));
  assert.ok(messages.includes("Possible credential assignment in memory"));
});

test("unified CLI explain returns short protocol copy", () => {
  const project = mkdtempSync(join(tmpdir(), "dejavu-explain-"));
  const result = runCliJson(["explain"], project);

  assert.ok(result.explanation.includes("3-file"));
  assert.ok(result.explanation.includes("AGENTS.md"));
});
