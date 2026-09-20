#!/usr/bin/env node
import {
  existsSync,
  readFileSync,
  readdirSync,
  lstatSync,
  statSync,
} from "node:fs";
import { basename, dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseJsonl as readJsonl, parseFrontmatter, parseRules } from "./lib/memory-validation.mjs";
import { executePlan, plannedFile } from "./lib/init-files.mjs";
import { lintMemory } from "./dejavu-lint-memory.mjs";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const starterRoot = resolve(packageRoot, "starter-kit");
const knownAgents = new Set(["codex", "claude-code", "cursor", "windsurf", "chatgpt", "gemini-cli"]);
const rulesStart = "<!-- deja-vu:rules:start -->";
const rulesEnd = "<!-- deja-vu:rules:end -->";

const args = process.argv.slice(2);
const command = args[0] ?? "help";
const commandArgs = args.slice(1);

function parseOptions(values) {
  const positional = [];
  const options = {};
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    if (!value.startsWith("--")) {
      positional.push(value);
      continue;
    }
    const [rawKey, inlineValue] = value.slice(2).split("=", 2);
    const key = rawKey.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
    if (inlineValue !== undefined) {
      options[key] = inlineValue;
      continue;
    }
    const next = values[index + 1];
    if (next && !next.startsWith("--")) {
      options[key] = next;
      index += 1;
    } else {
      options[key] = true;
    }
  }
  return { positional, options };
}

function asBoolean(value) {
  return value === true || value === "true";
}

function slugifyProjectId(value) {
  const raw = value.replace(/^project:/, "");
  const slug = raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `project:${slug || "project"}`;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function readStarter(path) {
  return readFileSync(resolve(starterRoot, path), "utf8");
}

function materializeTemplate(text, projectId) {
  return text.replaceAll("project:your-project", projectId).replaceAll("2026-05-16", today());
}

function materializeRulesTemplate(projectId) {
  return materializeTemplate(readStarter("AGENTS.md"), projectId).replace(
    /^Replace `project:[^`]+` with a stable repo-local project id\.\r?\n\r?\n/m,
    "",
  );
}

function readUtf8ForMerge(path) {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(readFileSync(path));
  } catch {
    throw new Error(`Cannot merge Deja Vu rules into ${path}: the file is not valid UTF-8.`);
  }
}

function rulesBlock(projectId, eol = "\n") {
  const rules = materializeRulesTemplate(projectId)
    .replace(/\r\n/g, "\n")
    .replace(/^## /gm, "### ")
    .replace(/^# Deja Vu Project Memory Rules/m, "## Deja Vu Project Memory Rules")
    .trim();
  return [rulesStart, "<!-- deja-vu:rules:version=1 -->", rules.replace(/\n/g, eol), rulesEnd, ""].join(eol);
}

function getAgents(value) {
  if (!value) return [];
  const names = String(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  if (names.includes("all")) return [...knownAgents];
  const invalid = names.filter((name) => !knownAgents.has(name));
  if (invalid.length > 0) {
    throw new Error(`Unknown agent: ${invalid.join(", ")}`);
  }
  return names;
}

function print(data, json) {
  if (json) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }
  if (typeof data === "string") {
    console.log(data);
    return;
  }
  console.log(JSON.stringify(data, null, 2));
}

function writePlannedFile(plan, targetPath, content, { force }) {
  const operation = existsSync(targetPath) ? (force ? "overwrite" : "skip") : "create";
  plannedFile(plan, operation, targetPath, content);
}

function writeAgentsFile(plan, targetPath, content, { force, mergeAgents, projectId }) {
  if (!existsSync(targetPath) || force) {
    plannedFile(plan, existsSync(targetPath) ? "overwrite" : "create", targetPath, content);
    return true;
  }
  const existing = readUtf8ForMerge(targetPath);
  const rules = parseRules(existing);
  if (rules) {
    const ready = rules.scope === projectId;
    plannedFile(plan, ready ? "skip" : "manual_merge", targetPath, null,
      ready ? "Deja Vu rules already present" : "Existing rules use a different project scope");
    return ready;
  }
  if (!mergeAgents || existing.includes(rulesStart) || existing.includes(rulesEnd)
      || /memory\/(?:impressions\.jsonl|summary\.md)/.test(existing)) {
    plannedFile(plan, "manual_merge", targetPath, null, "existing AGENTS.md requires rule review");
    return false;
  }
  const eol = existing.includes("\r\n") ? "\r\n" : "\n";
  const separator = existing.endsWith(eol + eol) ? "" : existing.endsWith(eol) ? eol : eol + eol;
  plannedFile(plan, "append", targetPath, existing + separator + rulesBlock(projectId, eol));
  return true;
}

function initCommand(values) {
  const { options } = parseOptions(values);
  const cwd = resolve(process.cwd(), String(options.cwd ?? "."));
  const dryRun = asBoolean(options.dryRun);
  const force = asBoolean(options.force);
  const mergeAgents = asBoolean(options.mergeAgents);
  const json = asBoolean(options.json);
  const existingSummaryPath = resolve(cwd, "memory", "summary.md");
  const existingScope = existsSync(existingSummaryPath) && statSync(existingSummaryPath).isFile()
    ? parseFrontmatter(readUtf8ForMerge(existingSummaryPath))?.scope : null;
  const projectId = slugifyProjectId(String(options.projectId ?? options.scope ?? existingScope ?? basename(cwd)));
  const agents = getAgents(options.agents ?? options.agent);
  const plan = [];

  if (force && mergeAgents) {
    throw new Error("Choose either --force or --merge-agents, not both.");
  }

  const rulesReady = writeAgentsFile(
    plan,
    resolve(cwd, "AGENTS.md"),
    rulesBlock(projectId),
    { dryRun, force, mergeAgents, projectId },
  );
  writePlannedFile(
    plan,
    resolve(cwd, "memory", "summary.md"),
    materializeTemplate(readStarter(join("memory", "summary.md")), projectId),
    { dryRun, force },
  );
  writePlannedFile(
    plan,
    resolve(cwd, "memory", "impressions.jsonl"),
    materializeTemplate(readStarter(join("memory", "impressions.jsonl")), projectId),
    { dryRun, force },
  );

  for (const agent of agents) {
    writePlannedFile(
      plan,
      resolve(cwd, "prompts", `${agent}.md`),
      readStarter(join("prompts", `${agent}.md`)),
      { dryRun, force },
    );
  }

  const execution = executePlan(plan, { cwd, dryRun });
  const health = dryRun ? null : lintMemory(resolve(cwd, "memory"));
  if (health && !force && existingScope && existingScope !== projectId) {
    health.ok = false;
    health.diagnostics.push({ level: "error", message: "Existing memory uses a different project scope" });
  }
  const ready = rulesReady && (health?.ok ?? true) && (force || !existingScope || existingScope === projectId);

  const prompt = [
    "Follow AGENTS.md.",
    "Before substantial planning or code changes, scan memory/impressions.jsonl for familiar cues.",
    "If familiarity is weak, read memory/summary.md.",
    "If familiarity is strong, read only the 1-3 linked detailed records needed for this task.",
    "Do not load the whole memory tree unless I ask.",
    "After the task, write back only durable memory.",
  ].join(" ");

  if (json) {
    print(
      {
        ok: true,
        ready,
        dry_run: dryRun,
        project_id: projectId,
        agents,
        operations: plan,
        ...execution,
        required_action: ready ? null : "Review rules and memory diagnostics; use --merge-agents for an unrelated rules file or merge conflicting rules manually.",
        diagnostics: health?.diagnostics ?? [],
        next_prompt: prompt,
      },
      true,
    );
    return;
  }

  const lines = [
    dryRun ? "Deja Vu init dry run:" : "Deja Vu init complete:",
    ...plan.map((item) => `- ${item.operation}: ${relative(cwd, item.path)}`),
  ];
  if (!ready) {
    lines.push(
      "",
      "Action required:",
      "- Rules or memory require review before this setup is ready.",
      "- Review rules and run doctor; use --merge-agents for unrelated rules, or merge conflicting rules manually.",
    );
  }
  if (execution.backup_directory) lines.push("", `Original files backed up to: ${execution.backup_directory}`);
  lines.push("", "Next agent prompt:", prompt);
  print(lines.join("\n"), false);
}

function addDiagnostic(diagnostics, level, message, details = {}) {
  diagnostics.push({ level, message, ...details });
}

function listFiles(root, diagnostics) {
  if (!existsSync(root)) return [];
  if (lstatSync(root).isSymbolicLink() || !lstatSync(root).isDirectory()) {
    addDiagnostic(diagnostics, "error", "Memory root must be a real directory", { path: root });
    return [];
  }
  const files = [];
  for (const entry of readdirSync(root)) {
    const fullPath = resolve(root, entry);
    const stat = lstatSync(fullPath);
    if (stat.isSymbolicLink()) {
      addDiagnostic(diagnostics, "error", "Refusing symlink in memory tree", { path: fullPath });
      continue;
    }
    if (stat.isDirectory()) {
      files.push(...listFiles(fullPath, diagnostics));
    } else {
      files.push(fullPath);
    }
  }
  return files;
}

function parseJsonl(filePath, diagnostics, kind) {
  return readJsonl(filePath, diagnostics, kind);
}

function scanTextSafety(filePath, text, diagnostics) {
  const checks = [
    { level: "error", message: "Possible private key in memory", pattern: /-----BEGIN [A-Z ]*PRIVATE KEY-----/ },
    { level: "error", message: "Possible OpenAI-style secret key in memory", pattern: /\bsk-[A-Za-z0-9_-]{20,}\b/ },
    { level: "error", message: "Possible GitHub token in memory", pattern: /\b(?:ghp|github_pat)_[A-Za-z0-9_]{20,}\b/ },
    { level: "error", message: "Possible AWS access key in memory", pattern: /\bAKIA[0-9A-Z]{16}\b/ },
    { level: "warning", message: "Possible email address in memory", pattern: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i },
    { level: "warning", message: "Memory looks like a transcript; summarize durable signal instead", pattern: /^(user|assistant|system):/im },
    { level: "warning", message: "Memory contains subagent transcript markup", pattern: /<subagent_notification>/ },
    { level: "warning", message: "Memory looks like raw build or debug output", pattern: /\b(?:stack trace|traceback|npm ERR!|at .+:\d+:\d+)\b/i },
    {
      level: "error",
      message: "Possible credential assignment in memory",
      pattern: /\b(?:api[_-]?key|secret|token|password)\s*[:=]\s*["']?[A-Za-z0-9._~+/=-]{16,}/i,
    },
  ];

  for (const check of checks) {
    if (check.pattern.test(text)) {
      addDiagnostic(diagnostics, check.level, check.message, { path: filePath });
    }
  }

  if (text.length > 20000) {
    addDiagnostic(diagnostics, "warning", "Memory file is large; consider compacting durable signal", {
      path: filePath,
      characters: text.length,
    });
  }
}

function doctorCommand(values) {
  const { options } = parseOptions(values);
  const cwd = resolve(process.cwd(), String(options.cwd ?? "."));
  const memoryRoot = resolve(cwd, String(options.memoryRoot ?? "memory"));
  const json = asBoolean(options.json);
  const diagnostics = [...lintMemory(memoryRoot).diagnostics];

  const agentsPath = resolve(cwd, "AGENTS.md");
  const summaryPath = resolve(memoryRoot, "summary.md");
  const impressionsPath = resolve(memoryRoot, "impressions.jsonl");
  const feedbackPath = resolve(memoryRoot, "recall-feedback.jsonl");

  const rules = existsSync(agentsPath) ? parseRules(readFileSync(agentsPath, "utf8")) : null;
  if (!existsSync(agentsPath)) {
    addDiagnostic(diagnostics, "error", "Missing AGENTS.md", { path: agentsPath });
  } else if (!rules) {
    addDiagnostic(diagnostics, "error", "AGENTS.md does not include Deja Vu recall rules", { path: agentsPath });
  }
  const impressionEntries = parseJsonl(impressionsPath, [], "impression");
  const impressionIds = new Set(impressionEntries.filter(({record}) => !record.status || record.status === "active").map(({record}) => record.id));
  const ruleScope = rules?.scope;
  if (ruleScope && impressionEntries.some(({record}) => record.scope !== ruleScope)) {
    addDiagnostic(diagnostics, "error", "Rules and impressions use different project scopes", { path: agentsPath });
  }

  const feedbackEntries = parseJsonl(feedbackPath, [], "feedback");
  for (const { record, line } of feedbackEntries) {
    if (record.matched_id && record.matched_id !== "unmatched" && !impressionIds.has(record.matched_id)) {
      addDiagnostic(diagnostics, "warning", "Feedback matched_id does not resolve to an active impression", {
        path: feedbackPath,
        line,
        matched_id: record.matched_id,
      });
    }
    if (typeof record.query === "string" && record.query.length > 240) {
      addDiagnostic(diagnostics, "warning", "Feedback query is long; store sanitized cues, not raw prompts", {
        path: feedbackPath,
        line,
      });
    }
  }

  if (existsSync(summaryPath) && readFileSync(summaryPath, "utf8").length > 12000) {
    addDiagnostic(diagnostics, "warning", "memory/summary.md is large; keep summary compact", { path: summaryPath });
  }

  for (const filePath of [agentsPath, ...listFiles(memoryRoot, diagnostics)].filter((path) => existsSync(path))) {
    if (/\.(md|jsonl|txt)$/i.test(filePath)) {
      scanTextSafety(filePath, readFileSync(filePath, "utf8"), diagnostics);
    }
  }

  const errorCount = diagnostics.filter((item) => item.level === "error").length;
  const warningCount = diagnostics.filter((item) => item.level === "warning").length;
  const result = {
    ok: errorCount === 0,
    error_count: errorCount,
    warning_count: warningCount,
    diagnostics,
    recommendations: [
      "Keep the required three files present: AGENTS.md, memory/summary.md, memory/impressions.jsonl.",
      "Track only sanitized memory intended for the repo.",
      "Ignore private/local/raw/transcript memory folders if you create them.",
      "Run doctor before sharing or publishing a repo with Deja Vu memory.",
    ],
  };

  if (json) {
    print(result, true);
  } else {
    const lines = [`Deja Vu doctor: ${result.ok ? "ok" : "needs attention"}`];
    for (const item of diagnostics) {
      lines.push(`- ${item.level}: ${item.message}${item.path ? ` (${relative(cwd, item.path)})` : ""}`);
    }
    if (diagnostics.length === 0) lines.push("- no issues found");
    lines.push("", "Recommendations:", ...result.recommendations.map((item) => `- ${item}`));
    print(lines.join("\n"), false);
  }

  process.exitCode = errorCount === 0 ? 0 : 1;
}

function explainCommand(values) {
  const { options } = parseOptions(values);
  const json = asBoolean(options.json);
  const text =
    "Deja Vu is a 3-file, repo-local memory system for AI coding agents. " +
    "Use AGENTS.md for rules, memory/summary.md for durable project context, and memory/impressions.jsonl for tiny recall cues. " +
    "Before substantial work, scan cues first; load the summary only for weak familiarity; load 1-3 linked records for strong familiarity; write back only durable memory. " +
    "No database, vector store, embeddings, SaaS, daemon, or npm install is required.";
  if (json) {
    print({ explanation: text }, true);
    return;
  }
  print(text, false);
}

function help() {
  print(
    [
      "Usage: deja-vu <command> [options]",
      "",
      "Commands:",
      "  init      Create the three-file Deja Vu starter setup",
      "  doctor    Check Deja Vu memory health and safety",
      "  explain   Print a short explanation to paste into an agent chat",
      "",
      "Examples:",
      "  deja-vu init --dry-run",
      "  deja-vu init --merge-agents",
      "  deja-vu init --agents codex,claude-code",
      "  deja-vu doctor --json",
      "  deja-vu explain",
    ].join("\n"),
    false,
  );
}

try {
  if (command === "init") {
    initCommand(commandArgs);
  } else if (command === "doctor") {
    doctorCommand(commandArgs);
  } else if (command === "explain") {
    explainCommand(commandArgs);
  } else if (command === "help" || command === "--help" || command === "-h") {
    help();
  } else {
    console.error(`Unknown command: ${command}`);
    help();
    process.exitCode = 2;
  }
} catch (error) {
  if (args.includes("--json") || args.includes("--json=true")) {
    print({
      ok: false,
      ready: false,
      error_count: 1,
      diagnostics: [{ level: "error", message: error instanceof Error ? error.message : String(error) }],
      backup_directory: error.backup_directory ?? null,
      recovery_errors: error.recovery_errors ?? [],
    }, true);
  } else {
    console.error(error instanceof Error ? error.message : String(error));
    if (error.backup_directory) console.error(`Recovery backups: ${error.backup_directory}`);
  }
  process.exitCode = 1;
}
