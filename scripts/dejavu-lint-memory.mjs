#!/usr/bin/env node
import { existsSync, readFileSync, readdirSync, lstatSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseJsonl, validateImpressions, validateRoutes, validateFeedback, isStringArray, isIsoDate, parseFrontmatter, validStatuses } from "./lib/memory-validation.mjs";

export function lintMemory(memoryRoot = "memory") {
  const rootPath = resolve(process.cwd(), memoryRoot);
  const impressionsPath = resolve(rootPath, "impressions.jsonl");
  const feedbackPath = resolve(rootPath, "recall-feedback.jsonl");
  const summaryPath = resolve(rootPath, "summary.md");
  const diagnostics = [];
  const keywordSignatures = new Map();
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

  function normalizedKeywords(keywords) {
    return keywords.map((keyword) => keyword.trim().toLowerCase()).filter(Boolean);
  }

  function listMarkdownFiles(dir) {
    if (!existsSync(dir)) return [];
    if (lstatSync(dir).isSymbolicLink() || !lstatSync(dir).isDirectory()) {
      addDiagnostic("error", "Memory directory must be a real directory", { path: dir });
      return [];
    }
    const files = [];
    for (const entry of readdirSync(dir)) {
      const fullPath = resolve(dir, entry);
      const stat = lstatSync(fullPath);
      if (stat.isSymbolicLink()) {
        addDiagnostic("error", "Refusing symlink in memory tree", { path: fullPath });
        continue;
      }
      if (stat.isDirectory()) {
        files.push(...listMarkdownFiles(fullPath));
      } else if (entry.endsWith(".md")) {
        files.push(fullPath);
      }
    }
    return files;
  }

  function lintMarkdownRecord(filePath, kind) {
    const text = readFileSync(filePath, "utf8");
    const frontmatter = parseFrontmatter(text);
    if (!frontmatter) {
      addDiagnostic("warning", "Markdown memory record should include YAML frontmatter", { path: filePath });
      return;
    }

    for (const field of ["id", "title", "status", "scope", "updated"]) {
      if (typeof frontmatter[field] !== "string" || frontmatter[field].length === 0) {
        addDiagnostic("warning", `Markdown memory record missing ${field} frontmatter`, { path: filePath });
      }
    }

    if (frontmatter.scope && !frontmatter.scope.startsWith("project:")) {
      addDiagnostic("warning", "Markdown memory scope should use project:<project-id>", { path: filePath });
    }

    if (frontmatter.status && !validStatuses.has(frontmatter.status)) {
      addDiagnostic("error", "Markdown memory status must be active, superseded, or archived", { path: filePath });
    }

    if (frontmatter.updated && !isIsoDate(frontmatter.updated)) {
      addDiagnostic("warning", "Markdown memory updated should use YYYY-MM-DD or ISO timestamp", { path: filePath });
    }

    if (frontmatter.status === "superseded" && !frontmatter.superseded_by) {
      addDiagnostic("warning", "superseded records should include superseded_by", { path: filePath });
    }

    if (kind === "decision") {
      for (const heading of ["## Decision", "## Rationale", "## Consequences"]) {
        if (!text.includes(heading)) {
          addDiagnostic("warning", `decision record missing ${heading}`, { path: filePath });
        }
      }
    }

    if (kind === "open-loop") {
      for (const heading of ["## Owner", "## Opened", "## Next trigger", "## Why it matters"]) {
        if (!text.includes(heading)) {
          addDiagnostic("warning", `open-loop record missing ${heading}`, { path: filePath });
        }
      }
    }

    if (/^(user|assistant|system):/im.test(text) || text.includes("<subagent_notification>")) {
      addDiagnostic("warning", "Markdown memory record looks like a transcript; durable memory should be summarized", {
        path: filePath,
      });
    }
  }

  if (!existsSync(impressionsPath)) {
    addDiagnostic("error", "Missing memory/impressions.jsonl", { path: impressionsPath });
  } else {
    const entries = parseJsonl(impressionsPath, diagnostics, "impression");
    validateImpressions(entries, diagnostics, impressionsPath);
    for (const { record, line: lineNumber } of entries) {
      if (typeof record.updated === "string" && !isIsoDate(record.updated)) {
        addDiagnostic("warning", "updated should use YYYY-MM-DD or ISO timestamp", {
          path: impressionsPath,
          line: lineNumber,
          id: record.id,
        });
      }

      if (isStringArray(record.keywords)) {
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
    }
  }

  validateFeedback(parseJsonl(feedbackPath, diagnostics, "recall feedback"), diagnostics, feedbackPath);

  if (!existsSync(summaryPath)) {
    addDiagnostic("error", "Missing memory/summary.md", { path: summaryPath });
  } else {
    lintMarkdownRecord(summaryPath, "summary");
  }

  const decisionFiles = listMarkdownFiles(resolve(rootPath, "decisions"));
  const openLoopFiles = listMarkdownFiles(resolve(rootPath, "open-loops"));
  for (const filePath of decisionFiles) {
    lintMarkdownRecord(filePath, "decision");
  }

  for (const filePath of openLoopFiles) {
    lintMarkdownRecord(filePath, "open-loop");
  }

  validateRoutes(parseJsonl(impressionsPath, [], "impression"), dirname(rootPath), diagnostics, [
    ...(existsSync(summaryPath) ? [summaryPath] : []),
    ...decisionFiles,
    ...openLoopFiles,
  ]);
  const errorCount = diagnostics.filter((item) => item.level === "error").length;
  const warningCount = diagnostics.filter((item) => item.level === "warning").length;

  return {
    ok: errorCount === 0,
    error_count: errorCount,
    warning_count: warningCount,
    diagnostics,
  };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const index = args.indexOf("--memory-root");
  try {
    const result = lintMemory(index >= 0 ? args[index + 1] : "memory");
    console.log(JSON.stringify(result, null, 2));
    process.exitCode = result.ok ? 0 : 1;
  } catch (error) {
    console.log(JSON.stringify({ ok: false, error_count: 1, warning_count: 0, diagnostics: [{ level: "error", message: error.message }] }, null, 2));
    process.exitCode = 1;
  }
}
