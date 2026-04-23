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

function findLabeledValue(lines: string[], label: string): string | null {
  const prefix = `${label.toLowerCase()}:`;
  const line = lines.find((item) => item.toLowerCase().startsWith(prefix));
  return line ? line.slice(prefix.length).trim() : null;
}

function firstUsefulLine(lines: string[], fallback: string): string {
  return lines.find((line) => !/^#+\s/.test(line)) ?? fallback;
}

export class DefaultSummaryGenerator implements SummaryGenerator {
  async generateShortSummary(input: AddMemoryInput): Promise<string> {
    const lines = extractLines(input.content);
    const decision = findLabeledValue(lines, "decision") ?? firstUsefulLine(lines, input.content);
    return trimSentence(`${input.title}: ${decision}`, 160);
  }

  async generateStructuredSummary(input: AddMemoryInput) {
    const lines = extractLines(input.content);
    const decision = findLabeledValue(lines, "decision") ?? firstUsefulLine(lines, input.content);
    const rationale =
      findLabeledValue(lines, "rationale") ??
      findLabeledValue(lines, "why") ??
      input.context ??
      lines.slice(1, 3).join(" ");
    const trigger =
      findLabeledValue(lines, "trigger") ??
      findLabeledValue(lines, "when") ??
      findLabeledValue(lines, "task") ??
      `Use when work touches ${input.title}.`;
    const recentUpdates = input.recentUpdates ?? lines.slice(0, 3).map((line) => trimSentence(line, 80));

    return {
      description: trimSentence(`Decision: ${decision}`, 260),
      context: trimSentence(`Rationale: ${rationale || "No rationale captured."}`, 180),
      architectureOrIntent: trimSentence(
        input.architectureOrIntent ?? `Trigger: ${trigger}`,
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
