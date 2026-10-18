#!/usr/bin/env node
// Offline, labeled synthetic evaluation. No ingestion or query uses external services.
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
const [beforePath, afterPath, split = 'all'] = process.argv.slice(2);
if (!beforePath || !afterPath || !['all', 'development', 'held-out'].includes(split)) {
  throw new Error('Usage: node scripts/evaluate-recall.mjs BEFORE_INDEX AFTER_INDEX [development|held-out|all]');
}
const source = readFileSync(new URL('./fixtures/recall-evaluation.json', import.meta.url));
const fixture = JSON.parse(source);
const before = await import(pathToFileURL(resolve(beforePath)));
const after = await import(pathToFileURL(resolve(afterPath)));
function metrics(rows, k) {
  const positives = rows.filter(r => r.relevant.length);
  const negatives = rows.filter(r => !r.relevant.length);
  const hits = r => r.retrieved.slice(0, k);
  return {
    k, queries: rows.length, positiveQueries: positives.length, negativeQueries: negatives.length,
    recallAtK: positives.length ? positives.reduce((n, r) => n + hits(r).filter(id => r.relevant.includes(id)).length / r.relevant.length, 0) / positives.length : null,
    missedQueries: positives.filter(r => !hits(r).some(id => r.relevant.includes(id))).length,
    falseRecallQueries: rows.filter(r => hits(r).some(id => !r.relevant.includes(id))).length,
    falsePositiveNegativeQueries: negatives.filter(r => hits(r).length).length,
  };
}
const report = { fixtureSha256: createHash('sha256').update(source).digest('hex'), node: process.version,
  interpretation: 'Recall@K is mean recall over positive queries, considering only eligible candidates. False recalls include any non-gold eligible ID in the first K; only the first candidate is loaded by recall(). Exact authored aliases are routing rules, not learned multilingual semantics. Held-out topics are disjoint; this small author-created split is not independent validation.', splits: {} };
for (const [name, data] of Object.entries(fixture.splits)) {
  if (split !== 'all' && split !== name) continue;
  const modes = {};
  for (const [mode, api, enabled] of [['before', before, false], ['after-default', after, false], ['after-aliases', after, true]]) {
    const aliases = data.memories.flatMap(m => m.aliases.map(alias => ({ alias, cue: m.id })));
    const engine = api.createInMemorySemanticRecallEngine(enabled ? { cueAliases: aliases } : {});
    for (const { aliases: _, ...memory } of data.memories) await engine.addMemory(memory);
    const prefix = name === 'development' ? 'd' : 'h';
    await engine.addMemory({ id: 'retired', title: prefix + 'retiredobsolete', content: prefix + 'retiredobsolete' });
    const replacement = { id: 'successor', title: prefix + 'currentpolicy', content: prefix + 'currentpolicy' };
    if (engine.supersedeMemory) await engine.supersedeMemory('retired', replacement);
    else { await engine.addMemory(replacement); await engine.deleteMemory('retired'); }
    await engine.addMemory({ id: 'deleted', title: prefix + 'deletedobsolete', content: prefix + 'deletedobsolete' });
    await engine.deleteMemory('deleted');
    const rows = [];
    for (const item of data.cases) {
      const result = await engine.scanImpressions({ text: item.query, topK: 5, candidateLimit: 32 });
      rows.push({ ...item, retrieved: result.candidates.filter(c => c.familiarityLevel !== 'none').map(c => c.id) });
    }
    modes[mode] = { overall: [1, 3, 5].map(k => metrics(rows, k)),
      byCategory: Object.fromEntries([...new Set(rows.map(r => r.category))].map(category => [category, metrics(rows.filter(r => r.category === category), 1)])), rows };
  }
  report.splits[name] = modes;
}
console.log(JSON.stringify(report, null, 2));
