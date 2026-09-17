#!/usr/bin/env node
import { existsSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { parseJsonl, validateImpressions, validateRoutes } from "./lib/memory-validation.mjs";

function tokenize(text) {
  return new Set((text.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? []).filter((token) => token.length > 1));
}
function scoreRecord(queryTokens, record) {
  const recordTokens = tokenize([...(record.keywords ?? []), ...(record.aliases ?? []), record.title ?? ""].join(" "));
  const matched = [...queryTokens].filter((token) => recordTokens.has(token));
  const overlap = queryTokens.size && recordTokens.size ? matched.length / Math.min(queryTokens.size, recordTokens.size) : 0;
  return { score: Math.min(1, overlap * (0.75 + (record.weight ?? 0.5) * 0.25)), matched_keywords: matched };
}
function result(level, diagnostics, matches = [], scanned = 0) {
  const ok = !diagnostics.some((item) => item.level === "error");
  return {
    ok, matched: ok && (level === "weak" || level === "strong"), level,
    score: matches[0]?.score ?? 0, matches,
    budget: { impression_scan: scanned, summaries_loaded: 0, detail_records_loaded: 0,
      why_loaded: [level === "none" ? "cue scan found no match; no memory loaded" : ok ? `cue scan found a ${level} familiarity match` : "memory setup or validation failed; do not treat as no match"] },
    feedback_hint: { outcomes: ["helpful", "irrelevant", "missed", "overloaded"], write_to: "memory/recall-feedback.jsonl" },
    writeback_hint: { after_work: [
      "durable decision -> memory/decisions/ + memory/impressions.jsonl",
      "unresolved follow-up -> memory/open-loops/ + memory/impressions.jsonl",
      "project-level truth changed -> memory/summary.md + memory/impressions.jsonl",
      "low-value one-off trace -> memory/events/ or skip",
      "recall was wrong, missed, noisy, or overloaded -> memory/recall-feedback.jsonl",
    ] },
    diagnostics,
  };
}

function scan() {
  const args = process.argv.slice(2);
  let file, memoryRoot;
  const parts = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--file" || args[i] === "--memory-root") {
      const flag = args[i];
      const value = args[++i];
      if (!value || value.startsWith("--")) throw new Error(`Missing value for ${flag}`);
      if (flag === "--file") file = value; else memoryRoot = value;
    } else if (args[i].startsWith("--")) throw new Error(`Unknown option: ${args[i]}`);
    else parts.push(args[i]);
  }
  const query = parts.join(" ").trim();
  if (!query) throw new Error('Usage: deja-vu-scan-memory [--memory-root memory | --file impressions.jsonl] "query"');
  if (file && memoryRoot) throw new Error("Choose either --file or --memory-root");
  const memoryPath = file ? resolve(file) : resolve(memoryRoot ?? "memory", "impressions.jsonl");
  const projectRoot = dirname(dirname(memoryPath));
  const required = file ? [memoryPath] : [resolve(projectRoot, "AGENTS.md"), resolve(dirname(memoryPath), "summary.md"), memoryPath];
  const missing = required.filter((path) => !existsSync(path));
  if (missing.length) {
    return { ...result("not_initialized", missing.map((path) => ({ level: "error", message: "Required memory file not found", path }))),
      bootstrap_hint: { required_files: ["AGENTS.md", "memory/summary.md", "memory/impressions.jsonl"], next_step: "copy starter-kit/. into the repo or run deja-vu init" } };
  }
  const diagnostics = [];
  for (const path of required) {
    if (!statSync(path).isFile()) diagnostics.push({ level: "error", message: "Required path is not a file", path });
  }
  const entries = parseJsonl(memoryPath, diagnostics, "impression");
  validateImpressions(entries, diagnostics, memoryPath);
  if (diagnostics.some((d) => d.level === "error")) return result("error", diagnostics, [], 1);
  const tokens = tokenize(query);
  const matches = entries.filter(({record}) => !record.status || record.status === "active")
    .map(({record}) => ({ id: record.id, title: record.title, record_path: record.record_path, ...scoreRecord(tokens, record) }))
    .filter((match) => match.score > 0)
    .map((match) => ({...match, score: Number(match.score.toFixed(4))}))
    .sort((a, b) => b.score - a.score).slice(0, 5);
  const score = matches[0]?.score ?? 0;
  const level = score >= 0.7 ? "strong" : score >= 0.35 ? "weak" : "none";
  // --file is cue-only. Project scans validate returned routes, not the memory tree.
  if (!file && level !== "none") {
    const ids = new Set(matches.map((match) => match.id));
    validateRoutes(entries.filter(({record}) => ids.has(record.id)), projectRoot, diagnostics,
      [resolve(dirname(memoryPath), "summary.md")], entries);
  }
  return result(diagnostics.some((d) => d.level === "error") ? "error" : level, diagnostics, matches, 1);
}

try {
  const output = scan();
  console.log(JSON.stringify(output, null, 2));
  process.exitCode = output.ok ? 0 : 1;
} catch (error) {
  console.log(JSON.stringify(result("error", [{level: "error", message: error.message}]), null, 2));
  process.exitCode = 1;
}
