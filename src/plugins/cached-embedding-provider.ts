import { createHmac, randomBytes } from "node:crypto";
import type { EmbeddingProvider, EmbeddingScope } from "../types/plugins.js";
import { boundedInteger } from "../utils/limits.js";

export interface EmbeddingCacheOptions {
  /** Include provider, model, revision and any embedding options. Change on model changes. */
  modelKey: string | (() => string);
  maxEntries?: number;
  /** Bound digest UTF-16 bytes + vector float64 bytes, not JS heap overhead. */
  maxBytes?: number;
}

interface Scope { active: boolean; key: Buffer }
interface Entry { vector: number[]; bytes: number; scope?: Scope }

/** Opt-in, instance-local LRU. Digests avoid retained plaintext content keys, not secure erasure. */
export class CachedEmbeddingProvider implements EmbeddingProvider {
  private readonly entries = new Map<string, Entry>();
  private readonly secret = randomBytes(32);
  private readonly maxEntries: number;
  private readonly maxBytes: number;
  private readonly modelKey: EmbeddingCacheOptions["modelKey"];
  private bytes = 0;
  private generation = 0;

  constructor(private readonly provider: EmbeddingProvider, options: EmbeddingCacheOptions) {
    this.modelKey = options.modelKey;
    this.maxEntries = boundedInteger("maxEntries", options.maxEntries ?? 128, 10_000);
    this.maxBytes = boundedInteger("maxBytes", options.maxBytes ?? 8 * 1024 * 1024, 64 * 1024 * 1024);
    this.currentModelKey();
  }

  private currentModelKey(): string {
    const key = typeof this.modelKey === "function" ? this.modelKey() : this.modelKey;
    if (typeof key !== "string" || !key.trim() || key.length > 4096) {
      throw new TypeError("modelKey must be a non-empty model/version identifier of at most 4096 characters");
    }
    return key;
  }

  /** Release references; already running provider work is not cancelled or securely erased. */
  clear(): void {
    this.generation++;
    this.entries.clear();
    this.bytes = 0;
  }

  getStats(): { entries: number; accountedBytes: number } {
    return { entries: this.entries.size, accountedBytes: this.bytes };
  }

  /** Separate ownership: identical inputs in different scopes never share retained entries. */
  createScope(): EmbeddingScope {
    const scope: Scope = { active: true, key: randomBytes(32) };
    return {
      embed: (text) => this.embedInScope(text, scope),
      dispose: () => {
        scope.active = false;
        for (const [key, entry] of this.entries) {
          if (entry.scope === scope) { this.bytes -= entry.bytes; this.entries.delete(key); }
        }
      },
    };
  }

  embed(text: string): Promise<number[]> { return this.embedInScope(text); }

  private async embedInScope(text: string, scope?: Scope): Promise<number[]> {
    if (scope && !scope.active) throw new Error("Embedding scope has been disposed");
    const model = this.currentModelKey();
    // Length framing and UTF-16 preserve exact JS strings, including lone surrogates.
    // Each owner has a different HMAC key; no plaintext input is retained as a key.
    const key = this.maxEntries && this.maxBytes >= 136
      ? createHmac("sha256", scope?.key ?? this.secret).update(`${model.length}:`)
        .update(model, "utf16le").update(text, "utf16le").digest("hex") : undefined;
    const hit = key === undefined ? undefined : this.entries.get(key);
    if (hit && key !== undefined) {
      this.entries.delete(key);
      this.entries.set(key, hit);
      return [...hit.vector];
    }
    const generation = this.generation;
    // Independent misses: there is no unbounded in-flight promise registry.
    const vector = await this.provider.embed(text);
    if (!Array.isArray(vector) || !vector.length) throw new TypeError("embedding must be a non-empty finite vector");
    for (const value of vector) {
      if (!Number.isFinite(value)) throw new TypeError("embedding must be a non-empty finite vector");
    }
    if (key !== undefined && generation === this.generation && (!scope || scope.active) && model === this.currentModelKey()) {
      const bytes = key.length * 2 + vector.length * 8;
      if (bytes <= this.maxBytes) {
        const previous = this.entries.get(key);
        if (previous) { this.bytes -= previous.bytes; this.entries.delete(key); }
        while (this.entries.size >= this.maxEntries || this.bytes + bytes > this.maxBytes) {
          const oldest = this.entries.keys().next().value!;
          this.bytes -= this.entries.get(oldest)!.bytes;
          this.entries.delete(oldest);
        }
        this.entries.set(key, { vector: [...vector], bytes, scope });
        this.bytes += bytes;
      }
    }
    return [...vector];
  }
}
