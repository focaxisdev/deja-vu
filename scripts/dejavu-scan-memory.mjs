#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const args = process.argv.slice(2);
let fileArg = null;
let memoryRootArg = null;
const queryParts = [];

for (let index = 0; index < args.length; index += 1) {
  const arg = args[index];
  if (arg === "--file") {
    fileArg = args[index + 1] ?? null;
    index += 1;
  } else if (arg === "--memory-root") {
    memoryRootArg = args[index + 1] ?? null;
    index += 1;
  } else {
    queryParts.push(arg);
  }
}

const query = queryParts.join(" ").trim();
const memoryPath = fileArg
  ? resolve(process.cwd(), fileArg)
  : resolve(process.cwd(), memoryRootArg ?? "memory", "impressions.jsonl");

function tokenize(text) {
  return new Set((text.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? []).filter((token) => token.length > 1));
}

function scoreRecord(queryTokens, record) {
  const keywords = [...(record.keywords ?? []), ...(record.aliases ?? []), record.title ?? ""];
  const recordTokens = tokenize(keywords.join(" "));
  const matched = [...queryTokens].filter((token) => recordTokens.has(token));
  if (queryTokens.size === 0 || recordTokens.size === 0) {
    return { score: 0, matchedKeywords: [] };
  }
  const overlap = matched.length / Math.min(queryTokens.size, recordTokens.size);
  const weight = typeof record.weight === "number" ? record.weight : 0.5;
  return {
    score: Math.min(1, overlap * (0.75 + weight * 0.25)),
    matchedKeywords: matched,
  };
}

function levelFor(score) {
  if (score >= 0.7) return "strong";
  if (score >= 0.35) return "weak";
  return "none";
}

if (!query) {
  console.error('Usage: node scripts/dejavu-scan-memory.mjs [--memory-root memory] [--file memory/impressions.jsonl] "task or query"');
  process.exit(2);
}

if (!existsSync(memoryPath)) {
  console.log(JSON.stringify({ matched: false, level: "none", score: 0, matches: [] }, null, 2));
  process.exit(0);
}

const queryTokens = tokenize(query);
const matches = [];
const diagnostics = [];

for (const [index, line] of readFileSync(memoryPath, "utf8").split(/\r?\n/).entries()) {
  const trimmed = line.trim();
  if (!trimmed) continue;
  try {
    const record = JSON.parse(trimmed);
    if (record.status && record.status !== "active") continue;
    const result = scoreRecord(queryTokens, record);
    if (result.score > 0) {
      matches.push({
        id: record.id,
        title: record.title,
        record_path: record.record_path,
        score: Number(result.score.toFixed(4)),
        matched_keywords: result.matchedKeywords,
      });
    }
  } catch (error) {
    diagnostics.push({
      id: `invalid-line-${index + 1}`,
      level: "error",
      message: "Invalid impression record",
      path: memoryPath,
      line: index + 1,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

matches.sort((a, b) => b.score - a.score);
const topScore = matches[0]?.score ?? 0;
const level = levelFor(topScore);
const budget = {
  impression_scan: 1,
  summaries_loaded: 0,
  detail_records_loaded: 0,
  why_loaded:
    level === "none"
      ? ["cue scan found no match; no memory loaded"]
      : [`cue scan found a ${level} familiarity match`],
};

console.log(
  JSON.stringify(
    {
      matched: level !== "none",
      level,
      score: topScore,
      matches: matches.slice(0, 5),
      budget,
      feedback_hint: {
        outcomes: ["helpful", "irrelevant", "missed", "overloaded"],
        write_to: "memory/recall-feedback.jsonl",
      },
      writeback_hint: {
        after_work: [
          "durable decision -> memory/decisions/ + memory/impressions.jsonl",
          "unresolved follow-up -> memory/open-loops/ + memory/impressions.jsonl",
          "project-level truth changed -> memory/summary.md + memory/impressions.jsonl",
          "low-value one-off trace -> memory/events/ or skip",
          "recall was wrong, missed, noisy, or overloaded -> memory/recall-feedback.jsonl",
        ],
      },
      diagnostics,
    },
    null,
    2,
  ),
);
