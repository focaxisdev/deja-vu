#!/usr/bin/env node
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
const [beforePath, afterPath] = process.argv.slice(2);
if (!beforePath || !afterPath) throw new Error('Usage: node scripts/benchmark-cache-ownership.mjs BEFORE_INDEX AFTER_INDEX');
const before = await import(pathToFileURL(resolve(beforePath)));
const after = await import(pathToFileURL(resolve(afterPath)));
const report = { note: 'Deterministic provider-call counts, not latency or token costs. Sixteen memories share ten identical chunks; unique per-memory routing tags. Cache capacity 256.', modes: {} };
for (const [mode, api, managed] of [['before-unscoped', before, false], ['after-unscoped', after, false], ['after-owned', after, true]]) {
  let calls = 0;
  const cache = new api.CachedEmbeddingProvider({ async embed(text) { calls++; return [text.length, 1]; } }, { modelKey: 'synthetic:v1', maxEntries: 256 });
  const engine = api.createInMemorySemanticRecallEngine({ embeddingProvider: cache, manageEmbeddingCache: managed,
    preserveDerivedOnMetadataUpdate: true, chunker: { chunk: () => Array.from({ length: 10 }, () => ({ type: 'note', content: 'shared chunk' })) } });
  for (let i = 0; i < 16; i++) await engine.addMemory({ id: `memory${i}`, title: 'Shared policy', content: 'shared content', tags: [`route${i}`] });
  const result = { addCalls: calls }; calls = 0;
  for (let pass = 0; pass < 2; pass++) for (let i = 0; i < 16; i++) await engine.recall({ text: `route${i}`, loadChunks: true });
  result.twoRecallPassesCalls = calls; calls = 0;
  await engine.updateMemory('memory0', { importance: 0.9 }); result.metadataUpdateCalls = calls; calls = 0;
  await engine.updateMemory('memory0', { content: 'replacement content' }); result.contentUpdateCalls = calls;
  for (let i = 0; i < 16; i++) await engine.deleteMemory(`memory${i}`);
  result.retainedAfterDelete = cache.getStats?.() ?? 'No public stats API in baseline';
  report.modes[mode] = result;
}
console.log(JSON.stringify(report, null, 2));
