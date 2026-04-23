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

function splitByBoundaries(text: string): string[] {
  const blocks = text
    .split(/(?=^#{1,6}\s)|\n\s*\n/gm)
    .map((block) => block.trim())
    .filter(Boolean);

  return blocks.length > 0 ? blocks : [text];
}

function splitHard(text: string, maxCharacters: number, overlapCharacters: number): string[] {
  const chunks: string[] = [];
  let cursor = 0;

  while (cursor < text.length) {
    const end = Math.min(text.length, cursor + maxCharacters);
    const slice = text.slice(cursor, end).trim();
    if (slice) {
      chunks.push(slice);
    }
    if (end === text.length) {
      break;
    }
    cursor = Math.max(end - overlapCharacters, cursor + 1);
  }

  return chunks;
}

function packBoundaryChunks(blocks: string[], maxCharacters: number, overlapCharacters: number): string[] {
  const chunks: string[] = [];
  let current = "";

  for (const block of blocks) {
    if (block.length > maxCharacters) {
      if (current) {
        chunks.push(current);
        current = "";
      }
      chunks.push(...splitHard(block, maxCharacters, overlapCharacters));
      continue;
    }

    const candidate = current ? `${current}\n\n${block}` : block;
    if (candidate.length <= maxCharacters) {
      current = candidate;
    } else {
      if (current) {
        chunks.push(current);
      }
      current = block;
    }
  }

  if (current) {
    chunks.push(current);
  }

  return chunks;
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

    return packBoundaryChunks(splitByBoundaries(text), maxCharacters, overlapCharacters).map((content, index) => ({
      type: guessChunkType(content, fallbackType),
      content,
      importance: Math.max(0.1, (input.importance ?? 0.5) - index * 0.03),
    }));
  }
}
