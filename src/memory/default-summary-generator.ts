import type { AddMemoryInput } from "../types/memory.js";
import type { SummaryGenerator } from "../types/plugins.js";

function trimSentence(text: string, maxLength: number): string {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }
  return `${normalized.slice(0, maxLength - 3).trim()}...`;
}

function extractLines(content: string): string[] {
  return content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

export class DefaultSummaryGenerator implements SummaryGenerator {
  async generateShortSummary(input: AddMemoryInput): Promise<string> {
    const head = extractLines(input.content)[0] ?? input.content;
    return trimSentence(`${input.title}: ${head}`, 160);
  }

  async generateStructuredSummary(input: AddMemoryInput) {
    const lines = extractLines(input.content);
    const recentUpdates = input.recentUpdates ?? lines.slice(0, 3).map((line) => trimSentence(line, 80));

    return {
      description: trimSentence(input.content, 260),
      context: trimSentence(input.context ?? lines.slice(0, 2).join(" "), 180),
      architectureOrIntent: trimSentence(
        input.architectureOrIntent ?? `Supports ${input.title} with familiarity-first recall.`,
        180,
      ),
      recentUpdates,
      metadata: {
        title: input.title,
        tags: input.tags ?? [],
        ...(input.metadata ?? {}),
      },
    };
  }
}
