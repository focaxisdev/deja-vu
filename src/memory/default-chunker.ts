import type { AddMemoryInput, MemoryChunkType } from "../types/memory.js";
import type { Chunker, MemoryChunkSeed } from "../types/plugins.js";

const DEFAULT_MAX = 280;
const DEFAULT_OVERLAP = 40;

function guessChunkType(text: string, fallback: MemoryChunkType): MemoryChunkType {
  const normalized = text.toLowerCase();
  if (normalized.includes("decision")) return "decision";
  if (normalized.includes("issue")) return "issue";
  if (normalized.includes("spec")) return "spec";
  if (normalized.includes("roadmap")) return "roadmap";
  if (normalized.includes("prompt")) return "prompt";
  if (normalized.includes("task")) return "task";
  if (normalized.includes("conversation")) return "conversation";
  return fallback;
}

export class DefaultChunker implements Chunker {
  chunk(input: AddMemoryInput): MemoryChunkSeed[] {
    const maxCharacters = input.chunkStrategy?.maxCharacters ?? DEFAULT_MAX;
    const overlapCharacters = input.chunkStrategy?.overlapCharacters ?? DEFAULT_OVERLAP;
    const fallbackType = input.chunkStrategy?.preferredTypes?.[0] ?? "note";
    const text = input.content.trim();

    if (!text) {
      return [];
    }

    const chunks: MemoryChunkSeed[] = [];
    let cursor = 0;
    let index = 0;

    while (cursor < text.length) {
      const end = Math.min(text.length, cursor + maxCharacters);
      const slice = text.slice(cursor, end).trim();
      if (slice) {
        chunks.push({
          type: guessChunkType(slice, fallbackType),
          content: slice,
          importance: Math.max(0.1, (input.importance ?? 0.5) - index * 0.03),
        });
      }
      if (end === text.length) {
        break;
      }
      cursor = Math.max(end - overlapCharacters, cursor + 1);
      index += 1;
    }

    return chunks;
  }
}
