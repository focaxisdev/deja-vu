#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const args = process.argv.slice(2);
let memoryRoot = "memory";

for (let index = 0; index < args.length; index += 1) {
  if (args[index] === "--memory-root") {
    memoryRoot = args[index + 1] ?? memoryRoot;
    index += 1;
  }
}

const rootPath = resolve(process.cwd(), memoryRoot);
const feedbackPath = resolve(rootPath, "recall-feedback.jsonl");
const outcomes = ["helpful", "irrelevant", "missed", "overloaded"];
const diagnostics = [];
const byOutcome = Object.fromEntries(outcomes.map((outcome) => [outcome, 0]));
const byMatchedId = new Map();

function addRoute(id, outcome) {
  const key = id || "unmatched";
  const entry = byMatchedId.get(key) ?? {
    matched_id: key,
    helpful: 0,
    irrelevant: 0,
    missed: 0,
    overloaded: 0,
    suggestions: new Set(),
  };
  entry[outcome] += 1;
  byMatchedId.set(key, entry);
}

if (existsSync(feedbackPath)) {
  for (const [index, line] of readFileSync(feedbackPath, "utf8").split(/\r?\n/).entries()) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      const record = JSON.parse(trimmed);
      if (!outcomes.includes(record.outcome)) continue;
      byOutcome[record.outcome] += 1;
      addRoute(record.matched_id, record.outcome);
    } catch (error) {
      diagnostics.push({
        level: "error",
        message: "Invalid recall feedback record",
        path: feedbackPath,
        line: index + 1,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}

for (const entry of byMatchedId.values()) {
  if (entry.helpful > 0) {
    entry.suggestions.add("keep or strengthen this impression route");
  }
  if (entry.missed > 0) {
    entry.suggestions.add("add aliases, keywords, or a new impression route");
  }
  if (entry.irrelevant > 0) {
    entry.suggestions.add("lower weight, split generic cues, or add negative guidance");
  }
  if (entry.overloaded > 0) {
    entry.suggestions.add("compact detailed records or tighten strong-match thresholds");
  }
}

const routes = [...byMatchedId.values()]
  .map((entry) => ({
    matched_id: entry.matched_id,
    helpful: entry.helpful,
    irrelevant: entry.irrelevant,
    missed: entry.missed,
    overloaded: entry.overloaded,
    suggestions: [...entry.suggestions],
  }))
  .sort((a, b) => b.missed + b.irrelevant + b.overloaded - (a.missed + a.irrelevant + a.overloaded));

console.log(
  JSON.stringify(
    {
      feedback_file_found: existsSync(feedbackPath),
      totals: byOutcome,
      routes,
      diagnostics,
    },
    null,
    2,
  ),
);
