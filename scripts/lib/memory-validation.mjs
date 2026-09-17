import { existsSync, readFileSync, realpathSync, statSync } from "node:fs";
import { isAbsolute, relative, resolve } from "node:path";

export const validStatuses = new Set(["active", "superseded", "archived"]);
export const validOutcomes = new Set(["helpful", "irrelevant", "missed", "overloaded"]);
export const isStringArray = (value) => Array.isArray(value) && value.every((item) => typeof item === "string" && item.trim().length > 0);
export const isIsoDate = (value) => typeof value === "string" && /^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z?)?$/.test(value);

export function parseJsonl(filePath, diagnostics, kind = "memory") {
  if (!existsSync(filePath)) return [];
  const entries = [];
  let text;
  try { text = new TextDecoder("utf-8", { fatal: true }).decode(readFileSync(filePath)); }
  catch (error) {
    diagnostics.push({ level: "error", message: `Cannot read ${kind} as UTF-8`, path: filePath, error: error.message });
    return entries;
  }
  for (const [index, line] of text.split(/\r?\n/).entries()) {
    if (!line.trim()) continue;
    try {
      const record = JSON.parse(line);
      if (!record || typeof record !== "object" || Array.isArray(record)) throw new Error("Record must be a non-null object");
      entries.push({ record, line: index + 1 });
    } catch (error) {
      diagnostics.push({ level: "error", message: `Invalid ${kind} record`, path: filePath, line: index + 1, error: error.message });
    }
  }
  return entries;
}

export function validateImpressions(entries, diagnostics, path) {
  const ids = new Set();
  let scope;
  for (const { record, line } of entries) {
    const error = (message) => diagnostics.push({ level: "error", message, path, line });
    for (const field of ["id", "scope", "title", "record_path", "updated"]) {
      if (typeof record[field] !== "string" || !record[field].trim()) error(`Missing or invalid ${field}`);
    }
    if (record.schema_version !== 1) error("schema_version must be 1");
    if (!/^project:[^\s:]+$/.test(record.scope ?? "")) error("scope must use project:<project-id>");
    if (scope && record.scope !== scope) error("Mixed project scopes in impressions");
    scope ??= record.scope;
    if (ids.has(record.id)) error("Duplicate impression id");
    ids.add(record.id);
    if (!isStringArray(record.keywords) || record.keywords.length === 0) error("keywords must be a non-empty string array");
    if (record.aliases !== undefined && !isStringArray(record.aliases)) error("aliases must be a string array when present");
    if (record.status !== undefined && !validStatuses.has(record.status)) error("status must be active, superseded, or archived");
    if (record.weight !== undefined && (typeof record.weight !== "number" || !Number.isFinite(record.weight) || record.weight < 0 || record.weight > 1)) error("weight must be a number between 0 and 1");
    if (record.superseded_by !== undefined && (typeof record.superseded_by !== "string" || !record.superseded_by.trim())) error("superseded_by must be a non-empty string");
  }
}

export function validateFeedback(entries, diagnostics, path) {
  for (const { record, line } of entries) {
    const add = (level, message) => diagnostics.push({ level, message, path, line });
    if (!validOutcomes.has(record.outcome)) add("error", "feedback outcome must be helpful, irrelevant, missed, or overloaded");
    if (typeof record.query !== "string" || !record.query.trim()) add("error", "feedback query must be a non-empty string");
    if (record.matched_id !== undefined && typeof record.matched_id !== "string") add("error", "feedback matched_id must be a string when present");
    if (!isIsoDate(record.created)) add("warning", "feedback created should use YYYY-MM-DD or ISO timestamp");
  }
}

export function parseFrontmatter(text) {
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  if (!match) return null;
  const fields = Object.create(null);
  for (const line of match[1].split(/\r?\n/)) {
    const field = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (field) fields[field[1]] = field[2].trim().replace(/^["']|["']$/g, "");
  }
  return fields;
}

export function resolveRecordPath(projectRoot, path) {
  if (typeof path !== "string" || !path.trim() || isAbsolute(path) || /^[A-Za-z]:/.test(path)) throw new Error("record_path must be project-relative");
  const resolved = resolve(projectRoot, path);
  const inside = (base, target) => {
    const rel = relative(base, target);
    return rel !== ".." && !rel.startsWith("../") && !rel.startsWith("..\\") && !isAbsolute(rel);
  };
  if (!inside(projectRoot, resolved)) throw new Error("record_path must stay inside the project");
  if (existsSync(resolved) && !inside(realpathSync(projectRoot), realpathSync(resolved))) throw new Error("record_path resolves outside the project");
  return resolved;
}

export function validateRoutes(entries, projectRoot, diagnostics, extraPaths = [], cueEntries = entries) {
  const documents = new Map();
  const inspect = (path) => {
    if (documents.has(path)) return documents.get(path);
    let frontmatter;
    try {
      if (!statSync(path).isFile()) throw new Error("Target is not a file");
      frontmatter = parseFrontmatter(new TextDecoder("utf-8", { fatal: true }).decode(readFileSync(path)));
    } catch (error) {
      diagnostics.push({ level: "error", message: "record_path does not exist or is unreadable", path, error: error.message });
      documents.set(path, null);
      return null;
    }
    documents.set(path, frontmatter);
    return frontmatter;
  };
  const scopes = new Set(entries.map(({ record }) => record.scope).filter(Boolean));
  for (const { record, line } of entries) {
    try {
      const path = resolveRecordPath(projectRoot, record.record_path);
      const meta = inspect(path);
      if (meta?.scope && meta.scope !== record.scope) diagnostics.push({ level: "error", message: "Route and target scopes differ", path, line });
      if ((!record.status || record.status === "active") && meta?.status && meta.status !== "active") {
        diagnostics.push({ level: "error", message: "Active route points to an inactive record", path, line });
      }
    } catch (error) {
      diagnostics.push({ level: "error", message: error.message, line, record_path: record.record_path });
    }
  }
  for (const path of extraPaths) {
    try { inspect(resolveRecordPath(projectRoot, relative(projectRoot, path))); }
    catch (error) { diagnostics.push({ level: "error", message: error.message, path }); }
  }
  const byId = new Map(cueEntries.map(({ record }) => [record.id, record]));
  const edges = new Map();
  for (const { record } of cueEntries) {
    if (record.status === "superseded" && !record.superseded_by) diagnostics.push({ level: "error", message: "Superseded impression requires superseded_by", id: record.id });
    if (record.superseded_by) {
      if (!byId.has(record.superseded_by)) diagnostics.push({ level: "error", message: "Impression superseded_by does not resolve", id: record.id });
      else edges.set("cue:" + record.id, "cue:" + record.superseded_by);
    }
  }
  // Following successors also validates targets not directly routed by an impression.
  for (const [path, meta] of documents) {
    if (!meta) continue;
    if (scopes.size === 1 && meta.scope && !scopes.has(meta.scope)) diagnostics.push({ level: "error", message: "Memory record belongs to a different project scope", path });
    if (meta.status === "superseded" && !meta.superseded_by) diagnostics.push({ level: "error", message: "Superseded record requires superseded_by", path });
    if (meta.superseded_by) {
      try {
        const next = resolveRecordPath(projectRoot, meta.superseded_by);
        const target = inspect(next);
        if (target?.scope && meta.scope && target.scope !== meta.scope) diagnostics.push({ level: "error", message: "Supersession crosses project scopes", path });
        edges.set("file:" + path, "file:" + next);
      } catch (error) { diagnostics.push({ level: "error", message: error.message, path }); }
    }
  }
  for (const start of edges.keys()) {
    const seen = new Set();
    let cursor = start;
    while (edges.has(cursor)) {
      if (seen.has(cursor)) { diagnostics.push({ level: "error", message: "Supersession cycle", path: start }); break; }
      seen.add(cursor);
      cursor = edges.get(cursor);
    }
  }
}

export function rulesStatus(text) {
  const start = "<!-- deja-vu:rules:start -->";
  const end = "<!-- deja-vu:rules:end -->";
  if (text.includes(start) || text.includes(end)) {
    if (text.split(start).length !== 2 || text.split(end).length !== 2 || text.indexOf(end) < text.indexOf(start)) return false;
    text = text.slice(text.indexOf(start) + start.length, text.indexOf(end));
  }
  const versions = [...text.matchAll(/<!-- deja-vu:rules:version=(.*?) -->/g)];
  if (versions.length > 1 || (versions.length === 1 && versions[0][1] !== "1")) return false;
  // Recognize the shipped legacy contract, not mere mentions of its filenames.
  return /Protocol: Deja Vu Protocol v0\.4/.test(text)
    && /Scope: `project:[^\s`]+`/.test(text)
    && /^\d+\. Inspect `memory\/impressions\.jsonl` for familiar cues\.$/m.test(text.replace(/\r/g, ""))
    && /^\d+\. If there is no familiarity, do not load memory by default\.$/m.test(text.replace(/\r/g, ""))
    && /^\d+\. If familiarity is weak, read `memory\/summary\.md`\.$/m.test(text.replace(/\r/g, ""))
    && /^\d+\. If familiarity is strong, read only the 1-3 linked (?:detailed )?records needed for the task\.$/m.test(text.replace(/\r/g, ""))
    && /Durable Writeback Only/.test(text);
}
