# More reliable, bounded engine recall: first-batch evidence

Included in the [v0.8.0 preparation](release-v0.8.0.md); package publication is
pending. These historical measurements are not a publication record. Start with the
[combined update and opt-in overview](recall-update.md).

These measurements and validation counts describe the first implementation batch
at `bad6b527409a44a693562fbe60c41be74126e573`. See the
[round-two notes](release-recall-lifecycle.md) for current cache ownership,
provenance, quality evaluation, performance costs and installed-package results.
The later [hosted acceptance report](actions-acceptance-results.md) records full
Ubuntu/Windows validation; these first-batch counts remain historical.

## User introduction

Deja Vu's optional engine can now find an eligible memory even when a recent,
less relevant candidate has a higher hybrid score. You can search more candidates
without expanding the returned list, project recalled text into an explicit
prompt budget, and opt in to bounded embedding reuse. Common-cue searches also
avoid rebuilding each record's token set on every request.

The three-file memory protocol stays the same. No file migration, database,
paid embedding service or daemon is needed. See the
[usage and migration guide](engine/recall-efficiency.md) for opt-in examples.

## What changes

- Eligible candidates precede ineligible hybrid winners. Hybrid preference among
  eligible candidates is retained; semantic thresholds are unchanged.
- `candidateLimit` separates search breadth from `topK`, with previous breadth
  retained by default. Invalid numeric limits now reject instead of producing
  surprising array slices or excessive work.
- `projectRecallForPrompt()` provides allowlisted JSONL with an exact UTF-8 byte
  cap and optional host-tokenizer budget. Raw API results remain compatible.
- The in-memory lexical scorer caches normalized record token sets, replaces them
  on updates, and removes them on deletion. Returned familiarity records are copies.
- `preserveDerivedOnMetadataUpdate` skips regeneration for metadata/importance-only
  edits when explicitly enabled. Custom-generator behavior remains the default.
- `CachedEmbeddingProvider` offers opt-in content/model-keyed LRU retention with
  entry and accounted-storage bounds, explicit clearing, and defensive vector copies.

## Measured effects

Baseline: repository main at `188d7e8c3aed224e45071d041cd140509887b29f`.
Both versions were compiled with existing dependencies and measured in the same
Linux x64 / Node v24.19.0 process, alternating measurement order. Each case used
five warmups and 25 samples. Fixtures contain the same five routing terms per
record used in the preceding audit; detail fixtures add ten synthetic chunks per
record. No real user memory, network model or paid API was used.

| Synthetic common-cue workload | Baseline median | Current median |
| --- | ---: | ---: |
| 100 records, storage search microbenchmark | 0.2820 ms | 0.0236 ms |
| 1,000 records, storage search microbenchmark | 3.1107 ms | 0.1643 ms |
| 10,000 records, storage search microbenchmark | 30.7427 ms | 2.6053 ms |
| 10,000 records, resident API end-to-end | 30.8083 ms | 2.7437 ms |

The last row covers `recall(loadChunks=true)` plus JSON serialization, including
mock query embedding, summary/chunk retrieval and access-time updates. It is
**not** end-to-end agent or product latency: startup, index construction,
persistence, external model inference, host prompt processing and LLM work are
excluded. API timing tests use default options, not the embedding cache opt-in.
Rare-cue and no-match costs were already small; some smaller cases became slightly
slower. These measurements do not establish an application-wide speedup or recall
quality improvement. Full samples' median/p95 summaries are in the
[measurement record](engine/recall-benchmark.json).

In a separate ten-chunk repeated-content fixture, enabling the embedding cache
reduced actual mock-provider calls on add from 12 to 4 and on five repeated detail
recalls from 5 to 1. With metadata preservation also enabled, an importance-only
update used zero embedding calls instead of 12. Counts depend on repeated content
and cache capacity; they are not measured paid-service cost savings.

The raw recall payload stayed at 10,253 bytes. Its optional prompt projection was
2,301 UTF-8 bytes in this fixture, about 77.6% smaller, excluding vectors and other
non-projected fields. **Bytes are not model tokens.** This is a representation
comparison, not proof of equal task quality; omitted fields may matter to a host.

## Historical first-batch validation and limitations

- TypeScript no-emit validation and compilation passed with existing dependencies.
- All 31 source engine/regression tests passed in Node's supported in-process test mode.
- All 31 compiled engine/regression tests and 26 existing compiled engine
  rollback/concurrency tests passed (57 distinct tests, with the first 31 also
  exercised from source).
- The standard source test command failed under this Cloud environment's process
  isolation. An isolated existing CLI test confirmed `spawnSync EPERM`.
  At that point, full CLI/process and installed-package verification still needed an environment
  that permits those subprocesses; this draft does not claim full-suite success.
- No new dependency was installed. Repository-wide memory scans and link checks
  that read private memory were excluded; changed documentation links were checked
  separately. Full `npm test` and CI were still outstanding at that checkpoint;
  the later hosted acceptance linked above passed them.

Regression coverage includes the false-none counterexample, lexical prefilter
truncation, invalid and zero limits, multilingual score/tie equivalence, Unicode
prompt clipping, update/delete invalidation, opt-in rollback, model changes,
cache eviction and pending-request clearing. Threshold quality, semantic synonym
recall, real tokenizer costs, concurrent production traffic and cold starts were
not measured. Prompt projection remains untrusted memory data, not an instruction
sanitizer. Read the migration guide before enabling metadata preservation or
sharing embedding caches.

CLI optimizations, language-aware routing, semantic fallback, ANN and persistent
storage changes are deferred. This draft is not a release announcement or a
claim that those features are implemented.

## Reproduce the synthetic comparison

Compile the baseline source and current source into separate directories with
the existing TypeScript compiler. Then run:

```bash
node scripts/benchmark-recall.mjs /path/to/baseline/dist/src/index.js /path/to/current/dist/src/index.js
```

Use compiled modules so TypeScript loader overhead is outside the measurement.
The script asserts unchanged candidate IDs/scores for its performance fixtures
and writes JSON to stdout. It neither installs packages nor touches memory files.
Use the regression tests, rather than these speed fixtures, to check changed
eligibility behavior.
