import type { RecallResult } from "../types/memory.js";
import { boundedInteger } from "../utils/limits.js";

export interface PromptProjectionOptions {
  /** UTF-8 budget for the entire returned text, including JSON framing. Default 8192. */
  maxBytes?: number;
  /** Add source API names and inline warnings when a field may have lost qualifiers. */
  includeProvenance?: boolean;
  /** Requires the host's tokenizer; no character-to-token approximation is used. */
  maxTokens?: number;
  countTokens?: (text: string) => number;
}

export interface PromptProjection {
  /** JSONL data, not instructions. Inject this text, not the original RecallResult. */
  text: string;
  bytes: number;
  tokens?: number;
  truncated: boolean;
}

type PromptRecord = { rawSource?: "getRawContent"; source?: "getSummary" | "getChunks"; updateIndex?: number; incomplete?: boolean; warning?: string; kind: "summary" | "chunk"; memoryId: string; text: string; field?: string; chunkId?: string; type?: string };
const encoder = new TextEncoder();

const incompleteWarning = "Incomplete excerpt; qualifiers may be missing. Retrieve the source before relying on it.";
function* records(result: RecallResult, provenance: boolean): Generator<PromptRecord> {
  if (!result.matched || !result.topMatch) return;
  const summary = result.summaryIfLoaded;
  if (summary) {
    const source = provenance ? { source: "getSummary" as const, rawSource: "getRawContent" as const,
      warning: "Derived summary; original constraints may be missing. Consult raw content.",
      ...(result.familiarityLevel === "weak" ? { incomplete: true, warning: incompleteWarning } : {}) } : {};
    for (const field of ["description", "context", "architectureOrIntent"] as const) {
      if (summary[field]) yield { ...source, kind: "summary", memoryId: summary.id, field, text: summary[field] };
    }
    for (const [updateIndex, text] of summary.recentUpdates.entries()) {
      if (text) yield { ...source, kind: "summary", memoryId: summary.id, field: "recentUpdate", ...(provenance ? { updateIndex } : {}), text };
    }
  }
  for (const chunk of result.chunksIfLoaded) {
    if (chunk.content) yield { ...(provenance ? { source: "getChunks" as const, rawSource: "getRawContent" as const } : {}), kind: "chunk", memoryId: chunk.memoryId, chunkId: chunk.chunkId, type: chunk.type, text: chunk.content };
  }
}

/** Allowlisted, bounded data projection. It does not sanitize prompt injection in memory text. */
export function projectRecallForPrompt(result: RecallResult, options: PromptProjectionOptions = {}): PromptProjection {
  const maxBytes = boundedInteger("maxBytes", options.maxBytes ?? 8192, 1_048_576);
  const maxTokens = options.maxTokens === undefined ? undefined : boundedInteger("maxTokens", options.maxTokens, 1_048_576);
  if (maxTokens !== undefined && typeof options.countTokens !== "function") {
    throw new TypeError("maxTokens requires countTokens for the target model");
  }
  const count = (text: string) => {
    if (!options.countTokens) return undefined;
    const tokens = options.countTokens(text);
    if (!Number.isSafeInteger(tokens) || tokens < 0) throw new RangeError("countTokens must return a non-negative safe integer");
    return tokens;
  };
  const fits = (text: string) => encoder.encode(text).length <= maxBytes &&
    (maxTokens === undefined || count(text)! <= maxTokens);
  let text = "";
  let truncated = Boolean(options.includeProvenance && result.summaryIfLoaded && result.familiarityLevel === "weak");
  if (!fits(text)) throw new RangeError("token budget cannot represent empty text");
  for (const record of records(result, options.includeProvenance === true)) {
    // Bound temporary allocation too, even for oversized adapter-supplied fields.
    const { text: content, ...header } = record;
    if (Object.values(header).some((value) => typeof value === "string" && value.length > maxBytes)) { truncated = true; break; }
    const points: string[] = [];
    let prefixLength = 0;
    for (const point of content) {
      if (points.length >= maxBytes) break;
      points.push(point);
      prefixLength += point.length;
    }
    const render = (length: number) => text + (text ? "\n" : "") + JSON.stringify({ ...header,
      ...(options.includeProvenance && (length < points.length || prefixLength < content.length)
        ? { incomplete: true, warning: incompleteWarning } : {}), text: points.slice(0, length).join("") });
    const full = render(points.length);
    if (fits(full)) {
      text = full;
      if (prefixLength < content.length) { truncated = true; break; }
      continue;
    }
    // Tokenizers need not be monotonic: this chooses a fitting prefix, not
    // necessarily the largest one. Every accepted candidate is checked in full.
    let low = 1;
    let high = points.length;
    let accepted = "";
    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      const candidate = render(mid);
      if (fits(candidate)) { accepted = candidate; low = mid + 1; }
      else high = mid - 1;
    }
    if (accepted) text = accepted;
    truncated = true;
    break;
  }
  const tokens = count(text);
  // Also guards against a stateful or inconsistent host tokenizer.
  if (maxTokens !== undefined && tokens! > maxTokens) throw new RangeError("countTokens returned inconsistent results");
  return { text, bytes: encoder.encode(text).length, ...(tokens === undefined ? {} : { tokens }), truncated };
}
