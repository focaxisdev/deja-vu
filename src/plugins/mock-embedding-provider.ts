import type { EmbeddingProvider } from "../types/plugins.js";

export class MockEmbeddingProvider implements EmbeddingProvider {
  constructor(private readonly dimensions = 256) {}

  async embed(text: string): Promise<number[]> {
    const vector = new Array<number>(this.dimensions).fill(0);
    const normalized = text.toLowerCase();
    const tokens = normalized.match(/[a-z0-9]+/g) ?? [];

    for (const token of tokens) {
      let hash = 0;
      for (let i = 0; i < token.length; i += 1) {
        hash = (hash * 31 + token.charCodeAt(i)) >>> 0;
      }
      const index = hash % this.dimensions;
      vector[index] += 1 + Math.min(token.length / 12, 1);
    }

    const compact = normalized.replace(/[^a-z0-9]+/g, " ").trim();
    for (let i = 0; i < Math.max(0, compact.length - 2); i += 1) {
      const gram = compact.slice(i, i + 3);
      let hash = 0;
      for (let j = 0; j < gram.length; j += 1) {
        hash = (hash * 17 + gram.charCodeAt(j)) >>> 0;
      }
      const index = hash % this.dimensions;
      vector[index] += 0.35;
    }

    const magnitude = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0)) || 1;
    return vector.map((value) => value / magnitude);
  }
}
