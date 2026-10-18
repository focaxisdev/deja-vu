# Unreleased: explicit recall cues and recoverable memory lifecycle

Unreleased release-note draft. No new version, release date, tag, release or social
publication is assigned. This follows the [first recall-efficiency changes](release-recall-efficiency.md)
and uses `bad6b527409a44a693562fbe60c41be74126e573` as its comparison baseline.

These results describe the second implementation batch. The subsequent
[verification-loop checkpoint](verification-loop.md) fixes test-helper diagnostic
loss and records the historical native-execution blocker. Complete hosted
[acceptance now passes on Ubuntu and Windows](actions-acceptance-results.md),
including 119 source cases, 119 compiled cases and one package/install/use case
per platform, with no skipped tests. The verification branch is published; the
package and social draft remain unreleased. The original Cloud EPERM cause is
still unresolved, and the results below retain their original measurement scope.

## User introduction

The optional engine now supports explicit aliases for familiar wording, managed
embedding-cache ownership, recoverable deletion and supersession, and prompt
excerpts that say when constraints may be missing. Enable only what your host
needs using the [examples and migration guide](engine/recall-lifecycle.md).

The three-file protocol remains unchanged. These additions do not provide an
automatic Chinese segmenter, a multilingual semantic model, a vector database or
a paid service. The CLI has no implementation changes in this batch.

## Labeled retrieval evaluation

The [fixture](../scripts/fixtures/recall-evaluation.json) contains 36 synthetic
queries: 18 development and 18 held-out, each with 13 positive and five negative
queries. Categories cover Chinese, synonyms, paraphrases, explicit bilingual
aliases, unrelated requests and deleted/superseded memories. Topics are disjoint
between splits. Corpus aliases and both query splits were frozen before the first
evaluation; development results were inspected first and rules were not tuned
after held-out scoring. Cases and aliases share an author, so this is not an
independent or representative language benchmark. No private memories were used.

| Split | Baseline / new default Recall@1 | Aliases Recall@1 | Missed positive queries, before → aliases | False-recall queries, before → aliases |
| --- | ---: | ---: | ---: | ---: |
| Development | 2/13 (15.4%) | 10/13 (76.9%) | 11 → 3 | 0 → 0 |
| Held-out | 2/13 (15.4%) | 10/13 (76.9%) | 11 → 3 | 0 → 0 |

Recall@3 and Recall@5 are identical here: widening K cannot recover a query with
no eligible lexical candidate. Recall is averaged over positive queries. A false
recall means a non-gold eligible ID in the first K candidates; only the first
candidate is actually loaded by recall. Negative-query false positives were 0/5
in each split and mode. Zero observed errors in this small set is not a guarantee.
Per-category results and exact returned IDs are in the
[evaluation record](engine/recall-evaluation.json).

All six unlisted paraphrases still miss. Improvement comes from exact,
host-authored aliases, including bilingual pairs, not learned translation or
Chinese segmentation. No threshold was lowered. Broad substring expansion and
automatic segmentation were deferred because these tests do not establish a
safe precision/recall tradeoff for them. Stale cases test successful removal;
separate fault-injection tests cover failed lifecycle operations.

## Performance and ownership costs

The same synthetic performance script used in the first round compares the
previous commit with this implementation. Three complete repetitions are retained
in the [measurement record](engine/recall-round2-benchmark.json). Each uses five
warmups and 25 samples, alternating baseline/current order, in Node v24.19.0.
Numbers below are medians of the three per-run medians, in milliseconds.

| Common-cue workload | Previous | Current |
| --- | ---: | ---: |
| 100 records, storage-search microbenchmark | 0.0208 | 0.0210 |
| 1,000 records, storage-search microbenchmark | 0.2434 | 0.2708 |
| 10,000 records, storage-search microbenchmark | 2.3091 | 2.6976 |
| 100 records, resident API end-to-end | 0.0826 | 0.0817 |
| 1,000 records, resident API end-to-end | 0.2723 | 0.3552 |
| 10,000 records, resident API end-to-end | 2.5853 | 2.9064 |

This round does **not** establish a speedup. The 10,000-record resident API median
rose about 12.4%. Defensive summary/chunk copies add allocation, but timing alone
does not isolate the causes; storage-search logic itself is unchanged. Noise,
garbage collection and memory pressure remain confounders. No timing threshold
was used to select a favorable run. These default-mode measurements exclude
owned-cache serialization and concurrent traffic.

The resident API measurement covers recall with mock query embedding, summary
and chunk reads, access-time updates and JSON serialization. It excludes startup,
ingestion/index construction, persistence, external model inference, prompt
processing and LLM work. It is not whole-product or agent end-to-end latency.
The first round's main-to-baseline acceleration remains historical evidence,
not a new speedup attributable to this batch.

A separate [ownership fixture](engine/recall-cache-ownership-benchmark.json) uses
16 memories with repeated content and ten identical chunks each:

| Actual provider calls | Previous unscoped cache | Current unscoped cache | Current owned cache |
| --- | ---: | ---: | ---: |
| Add all memories | 18 | 18 | 48 |
| Two complete detail-recall passes | 16 | 16 | 16 |
| Metadata-only update, preservation enabled | 0 | 0 | 0 |
| Content update | 2 | 2 | 3 |

After deleting all memories, current unscoped mode retains 36 entries (5,184
accounted bytes); owned mode retains zero. Baseline has no public statistics API.
Separate ownership trades cross-memory reuse for predictable invalidation. Counts
are deterministic mock calls, not paid-service costs, tokens or throughput.

## Validation and blockers

- TypeScript checking and compilation pass with existing dependencies.
- Source and compiled engine regression suites pass: 50 distinct cases, including
  aliases, scope isolation, late completion, model/content keys, lifecycle
  compensation, queued reads, mutable-result isolation and qualifier warnings.
- The complete compiled test selection was executed in Node's supported
  in-process mode: **77 passed, 32 failed, 0 skipped**. Failures are in CLI/process
  scenarios: 27 preserve EPERM evidence, while five lose the original cause in
  the error-response helper and report JSON parsing errors. Those five cannot
  be conclusively attributed to EPERM from the saved log alone.
  The existing engine reliability subset passes all 26 cases; one additional
  initialization rollback test also passes in the full selection.
- The standard isolated source and package test commands fail in this Cloud.
  A dependency-free `spawnSync(process.execPath, ["-e", "process.stdout.write('ok')"])`
  reproduces `EPERM`; the returned `status: 0` does not override the error.
  The isolated package-test diagnostic fails at its `npm pack` child call.
  Node's permission API is absent; seccomp filtering and `NoNewPrivs` are active.
  The exact denied syscall or interception layer is **not established**.
- Direct `npm pack --offline` succeeds in the same Cloud, including unchanged
  prepack clean/build. Direct offline installation of that tarball and installed
  CLI/API smoke checks pass. This validates packaging separately; it does not
  turn the failing automated package test into a pass. No restriction, test,
  lifecycle script or assertion was disabled to make the runner pass.
- Full `npm test` is not complete. Its repository-wide Markdown scan would read
  private memory, so it was not run; public documentation links were checked
  separately. No private memory, network service or new dependency was used.

The failed subprocess scenarios still need an authorized subprocess-capable Cloud
configuration before release. No alternate environment was used. All files are
local preparation; this is not a release-readiness claim.

## Remaining limits

Managed ownership serializes this engine's reads and writes; slow providers can
block later calls, and plugins must not re-enter the engine during those calls.
It does not coordinate other engines or direct adapter writes. Compensation can
fail and leave both supersession IDs present; errors expose recovery information.
There are no crash-safe transactions, historical redirects or verified secure
erasure. External providers and caller-held copies may retain data.

Provenance warnings consume prompt budget and may force an entire field to be
omitted. They mark possible loss; they do not preserve semantic qualifiers or
sanitize instructions. Raw lookup returns stored content, not original separate
context fields. Bytes are not tokens. Real tokenizer/model quality, high-load
queueing, heap bounds and production traffic remain unmeasured. CLI optimization,
ANN, semantic fallback and automatic Chinese segmentation are deferred.

## Reproduce

Compile the baseline and current source with the existing compiler into separate
directories. The following scripts use only synthetic data and local modules:

```bash
node scripts/evaluate-recall.mjs /path/to/before/src/index.js /path/to/after/src/index.js development
node scripts/evaluate-recall.mjs /path/to/before/src/index.js /path/to/after/src/index.js held-out
node scripts/benchmark-recall.mjs /path/to/before/src/index.js /path/to/after/src/index.js
node scripts/benchmark-cache-ownership.mjs /path/to/before/src/index.js /path/to/after/src/index.js
```

The evaluation fixture is packaged with its script. Results include the fixture's
SHA-256 digest. Timing scripts assert comparable candidate IDs/scores; quality
and failure behavior belong to the labeled evaluation and regression tests.
