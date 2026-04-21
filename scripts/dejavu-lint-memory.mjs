#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const args = process.argv.slice(2);
let memoryRoot = "memory";

for (let index = 0; index < args.length; index += 1) {
  if (args[index] === "--memory-root") {
    memoryRoot = args[index + 1] ?? memoryRoot;
    index += 1;
  }
}

const rootPath = resolve(process.cwd(), memoryRoot);
const impressionsPath = resolve(rootPath, "impressions.jsonl");
const diagnostics = [];
const seenIds = new Set();

function addDiagnostic(level, message, details = {}) {
  diagnostics.push({ level, message, ...details });
}

function isStringArray(value) {
  return Array.isArray(value) && value.every((item) => typeof item === "string" && item.length > 0);
}

if (!existsSync(impressionsPath)) {
  addDiagnostic("error", "Missing memory/impressions.jsonl", { path: impressionsPath });
} else {
  for (const [index, line] of readFileSync(impressionsPath, "utf8").split(/\r?\n/).entries()) {
    const lineNumber = index + 1;
    const trimmed = line.trim();
    if (!trimmed) continue;

    let record;
    try {
      record = JSON.parse(trimmed);
    } catch (error) {
      addDiagnostic("error", "Invalid JSONL record", {
        path: impressionsPath,
        line: lineNumber,
        error: error instanceof Error ? error.message : String(error),
      });
      continue;
    }

    for (const field of ["id", "scope", "title", "record_path", "updated"]) {
      if (typeof record[field] !== "string" || record[field].length === 0) {
        addDiagnostic("error", `Missing or invalid ${field}`, { path: impressionsPath, line: lineNumber });
      }
    }

    if (record.schema_version !== 1) {
      addDiagnostic("warning", "Unexpected or missing schema_version", { path: impressionsPath, line: lineNumber });
    }

    if (!isStringArray(record.keywords)) {
      addDiagnostic("error", "keywords must be a non-empty string array", { path: impressionsPath, line: lineNumber });
    }

    if (record.aliases !== undefined && !isStringArray(record.aliases)) {
      addDiagnostic("error", "aliases must be a string array when present", { path: impressionsPath, line: lineNumber });
    }

    if (seenIds.has(record.id)) {
      addDiagnostic("error", "Duplicate impression id", { path: impressionsPath, line: lineNumber, id: record.id });
    }
    seenIds.add(record.id);

    if (typeof record.record_path === "string") {
      const linkedPath = resolve(dirname(rootPath), record.record_path);
      if (!existsSync(linkedPath)) {
        addDiagnostic("warning", "record_path does not exist", {
          path: impressionsPath,
          line: lineNumber,
          record_path: record.record_path,
        });
      }
    }
  }
}

const errorCount = diagnostics.filter((item) => item.level === "error").length;
const warningCount = diagnostics.filter((item) => item.level === "warning").length;

console.log(
  JSON.stringify(
    {
      ok: errorCount === 0,
      error_count: errorCount,
      warning_count: warningCount,
      diagnostics,
    },
    null,
    2,
  ),
);

process.exit(errorCount === 0 ? 0 : 1);
