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
const feedbackPath = resolve(rootPath, "recall-feedback.jsonl");
const diagnostics = [];
const seenIds = new Set();
const keywordSignatures = new Map();
const validStatuses = new Set(["active", "superseded", "archived"]);
const validOutcomes = new Set(["helpful", "irrelevant", "missed", "overloaded"]);
const genericKeywords = new Set([
  "about",
  "agent",
  "change",
  "context",
  "data",
  "detail",
  "file",
  "general",
  "info",
  "memory",
  "note",
  "project",
  "record",
  "summary",
  "task",
  "thing",
  "update",
  "work",
]);

function addDiagnostic(level, message, details = {}) {
  diagnostics.push({ level, message, ...details });
}

function isStringArray(value) {
  return Array.isArray(value) && value.every((item) => typeof item === "string" && item.length > 0);
}

function normalizedKeywords(keywords) {
  return keywords.map((keyword) => keyword.trim().toLowerCase()).filter(Boolean);
}

function isIsoDate(value) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z?)?$/.test(value);
}

function staysInsideRoot(path) {
  const resolved = resolve(dirname(rootPath), path);
  const projectRoot = dirname(rootPath);
  return resolved === projectRoot || resolved.startsWith(`${projectRoot}\\`) || resolved.startsWith(`${projectRoot}/`);
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

    if (typeof record.scope === "string" && !record.scope.startsWith("project:")) {
      addDiagnostic("warning", "scope should use project:<project-id>", { path: impressionsPath, line: lineNumber });
    }

    if (record.status !== undefined && !validStatuses.has(record.status)) {
      addDiagnostic("error", "status must be active, superseded, or archived", {
        path: impressionsPath,
        line: lineNumber,
        id: record.id,
      });
    }

    if (record.weight !== undefined && (typeof record.weight !== "number" || record.weight < 0 || record.weight > 1)) {
      addDiagnostic("error", "weight must be a number between 0 and 1", {
        path: impressionsPath,
        line: lineNumber,
        id: record.id,
      });
    }

    if (typeof record.updated === "string" && !isIsoDate(record.updated)) {
      addDiagnostic("warning", "updated should use YYYY-MM-DD or ISO timestamp", {
        path: impressionsPath,
        line: lineNumber,
        id: record.id,
      });
    }

    if (!isStringArray(record.keywords)) {
      addDiagnostic("error", "keywords must be a non-empty string array", { path: impressionsPath, line: lineNumber });
    } else {
      const keywords = normalizedKeywords(record.keywords);
      const uniqueKeywords = new Set(keywords);

      if (keywords.length < 3) {
        addDiagnostic("warning", "keywords should include at least 3 cue terms", {
          path: impressionsPath,
          line: lineNumber,
          id: record.id,
        });
      }

      if (keywords.length > 12) {
        addDiagnostic("warning", "keywords should stay at or below 12 cue terms", {
          path: impressionsPath,
          line: lineNumber,
          id: record.id,
          count: keywords.length,
        });
      }

      if (uniqueKeywords.size !== keywords.length) {
        addDiagnostic("warning", "keywords contain duplicate cue terms", {
          path: impressionsPath,
          line: lineNumber,
          id: record.id,
        });
      }

      const genericMatches = keywords.filter((keyword) => genericKeywords.has(keyword));
      if (genericMatches.length >= 3) {
        addDiagnostic("warning", "keywords rely on too many generic cue terms", {
          path: impressionsPath,
          line: lineNumber,
          id: record.id,
          keywords: genericMatches,
        });
      }

      const signature = [...uniqueKeywords].sort().join("|");
      if (signature) {
        const previous = keywordSignatures.get(signature);
        if (previous) {
          addDiagnostic("warning", "duplicate keyword set across impression records", {
            path: impressionsPath,
            line: lineNumber,
            id: record.id,
            duplicate_of: previous.id,
            duplicate_line: previous.line,
          });
        } else {
          keywordSignatures.set(signature, { id: record.id, line: lineNumber });
        }
      }
    }

    if (record.aliases !== undefined && !isStringArray(record.aliases)) {
      addDiagnostic("error", "aliases must be a string array when present", { path: impressionsPath, line: lineNumber });
    }

    if (seenIds.has(record.id)) {
      addDiagnostic("error", "Duplicate impression id", { path: impressionsPath, line: lineNumber, id: record.id });
    }
    seenIds.add(record.id);

    if (typeof record.record_path === "string") {
      if (!staysInsideRoot(record.record_path)) {
        addDiagnostic("error", "record_path must stay inside the project", {
          path: impressionsPath,
          line: lineNumber,
          record_path: record.record_path,
        });
        continue;
      }

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

if (existsSync(feedbackPath)) {
  for (const [index, line] of readFileSync(feedbackPath, "utf8").split(/\r?\n/).entries()) {
    const lineNumber = index + 1;
    const trimmed = line.trim();
    if (!trimmed) continue;

    let record;
    try {
      record = JSON.parse(trimmed);
    } catch (error) {
      addDiagnostic("error", "Invalid recall feedback record", {
        path: feedbackPath,
        line: lineNumber,
        error: error instanceof Error ? error.message : String(error),
      });
      continue;
    }

    if (record.schema_version !== 1) {
      addDiagnostic("warning", "Unexpected or missing feedback schema_version", { path: feedbackPath, line: lineNumber });
    }

    if (!validOutcomes.has(record.outcome)) {
      addDiagnostic("error", "feedback outcome must be helpful, irrelevant, missed, or overloaded", {
        path: feedbackPath,
        line: lineNumber,
      });
    }

    if (typeof record.query !== "string" || record.query.trim().length === 0) {
      addDiagnostic("error", "feedback query must be a non-empty string", { path: feedbackPath, line: lineNumber });
    }

    if (record.matched_id !== undefined && typeof record.matched_id !== "string") {
      addDiagnostic("error", "feedback matched_id must be a string when present", { path: feedbackPath, line: lineNumber });
    }

    if (!isIsoDate(record.created)) {
      addDiagnostic("warning", "feedback created should use YYYY-MM-DD or ISO timestamp", {
        path: feedbackPath,
        line: lineNumber,
      });
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
