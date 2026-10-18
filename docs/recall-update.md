# More reliable recall, with explicit budgets and opt-ins

These changes are available in repository source. No new package version, npm
publication, GitHub Release or release date is assigned. The existing npm setup
instructions still describe the three-file protocol; do not assume an npm install
already includes every source addition below.

## What improves

The optional TypeScript engine selects eligible memories before applying hybrid
ranking preference, avoiding false "no memory" results when an ineligible record
has a higher hybrid score. Search breadth can grow without expanding final output.
Cached token sets avoid repeated lexical preprocessing, with update/delete
invalidation. Familiarity thresholds and the public three-file protocol are unchanged.

Hosts can opt in to bounded prompt projection, metadata-only embedding reuse,
content/model-keyed embedding caches, exact query aliases, and per-memory cache
ownership. Deletion and supersession attempt recovery on adapter failures;
projection can mark missing qualifiers and identify where to retrieve stored text.
These are optional engine features, not new requirements for file-first adoption.

## Enable only what your host needs

With the repository build, exact aliases can route familiar wording to an existing
distinctive cue, while candidate search and prompt output have separate budgets:

```ts
import {
  createInMemorySemanticRecallEngine, projectRecallForPrompt,
} from "@focaxisdev/deja-vu";

const engine = createInMemorySemanticRecallEngine({
  cueAliases: [{ alias: "更新後快取怎麼辦", cue: "cachepolicy" }],
});
await engine.addMemory({
  id: "cache-policy", title: "Cache policy", tags: ["cachepolicy"],
  content: "Invalidate cached data after an update or deletion.",
});
const recalled = await engine.recall({
  text: "更新後快取怎麼辦", candidateLimit: 32, topK: 3,
});
const prompt = projectRecallForPrompt(recalled, {
  maxBytes: 4096, includeProvenance: true,
});
```

Aliases match the normalized entire query. They do not translate, segment Chinese
or recognize unlisted paraphrases. The byte cap is not a token cap; use a host
tokenizer for token budgets. Projection is untrusted memory data, not an instruction
sanitizer. See the [budget/cache guide](engine/recall-efficiency.md) and
[ownership, aliases and provenance guide](engine/recall-lifecycle.md) for full
options, examples and failure handling.

## Benefits and limits, measured separately

- **Lexical preprocessing:** 30.74 → 2.61 ms was the median of one synthetic
  10,000-record shared-cue storage-search microbenchmark. It is not a whole-product
  speedup, does not cover all requests, and excludes external models and agent work.
  The [first-batch measurements](release-recall-efficiency.md) distinguish this
  microbenchmark from the resident API workload.
- **Recall quality:** authored aliases raised Recall@1 from 2/13 to 10/13 in
  each split of a small same-author synthetic dataset. No false recalls were
  observed there, but unlisted paraphrases still missed. This is not independent
  multilingual-model validation or a general recall-rate guarantee.
- **Latency and ownership:** the second batch's 10,000-record default-mode
  resident API median rose about 12.4%; that measurement did not isolate ownership
  mode. Managed ownership separately increased mock provider calls on ingest
  from 18 to 48 and on a content update from 2 to 3 in the shared-content fixture,
  while retained entries after deletion fell from 36 to zero. It also serializes
  reads/writes within one engine, so slow providers can delay later calls.

The [second-batch report](release-recall-lifecycle.md) retains workloads, raw
measurement links and caveats. Cache counts are not paid-service savings;
accounted bytes are not tokens or measured heap use. These changes do not establish
that every request is faster.

## Migration and verification

No migration of `AGENTS.md`, `memory/summary.md` or `memory/impressions.jsonl` is
required. Existing API result shapes, default search breadth and thresholds are
retained. Aliases, ownership, read serialization, metadata preservation and
projection provenance need explicit opt-in. Invalid limits now reject; small
custom cache byte budgets can hold fewer entries with digest keys. Review custom
adapter recovery and generator assumptions before enabling these options.

Recovery is not a crash-safe transaction. Cache release is not verified secure
erasure. Prompt warnings mark possible qualifier loss rather than restoring
meaning; use the documented source lookup when complete evidence matters.

Complete Ubuntu/Windows acceptance passed: 119 source cases, the same 119 cases
compiled, and one package/install/use case per platform, with zero skipped tests.
Type checks, frozen recall results, cache lifecycle counts and public documentation
checks also passed. See the [logs and failure-to-fix record](actions-acceptance-results.md)
and [current main CI](https://github.com/focaxisdev/deja-vu/actions/workflows/ci.yml).
Hosted Node 22 results do not identify the earlier Cloud Node 24 native EPERM cause.
