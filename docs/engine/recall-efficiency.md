# Bounded recall for the optional engine

These changes are unreleased. The three-file protocol, Markdown source of truth,
and CLI workflow do not need a migration. The optional engine now prevents an
ineligible hybrid winner from hiding an eligible match, reuses token sets, and
provides explicit controls for search breadth, prompt output and embedding reuse.

## Find candidates before choosing output

`topK` still defaults to five and limits returned candidates. The new
`candidateLimit` defaults to `topK`; set it explicitly to search more records
before ranking. It must be at least `topK`. Both are integers from 0 to 1000.
`topK: 0` returns no candidates without calling storage search.

Candidates that meet the existing weak threshold come before candidates that
meet neither threshold. Hybrid ordering is preserved within both groups,
including between weak and strong matches. Scores are therefore not necessarily
globally descending across the eligibility boundary. With no eligible candidates,
`matched` remains false and no summary or detail is loaded.

The default thresholds remain strong 0.85 and weak 0.75. A configured threshold
must be finite and satisfy `0 <= weak <= strong <= 1`. Increasing search breadth
can surface a better candidate, but also costs more ranking work and may expose
more irrelevant matches. It does not change the lexical candidate generator or
recover synonyms that have no shared tokens.

## Opt in to bounded prompt output

```ts
import {
  createInMemorySemanticRecallEngine,
  projectRecallForPrompt,
} from "@focaxisdev/deja-vu";

const engine = createInMemorySemanticRecallEngine();
await engine.addMemory({
  id: "settings",
  title: "Settings sync",
  content: "Decision: settings sync stays server-backed.",
});
const recall = await engine.recall({
  text: "settings sync",
  candidateLimit: 20,
  topK: 5,
  loadChunks: true,
  chunkLimit: 3,
});
const context = projectRecallForPrompt(recall, { maxBytes: 4096 });
// Put context.text in the host's memory-data section of the prompt.
// Check context.truncated before relying on it as complete evidence.
console.log(context.bytes, context.truncated);
```

The projection returns JSONL containing only summary text, recent updates, chunk
text, and their identifying fields. It excludes vectors, arbitrary metadata,
candidate lists, scores and internal budget explanations. The existing
`RecallResult` is unchanged; serializing it directly still includes vectors.

The byte budget covers the entire `context.text`, including JSON framing and
newlines. It defaults to 8192 UTF-8 bytes, accepts 0 through 1,048,576, and returns
empty text if even a record header cannot fit. Text is added in description,
context, intent, recent-updates, then chunk order. The last included field may be
cut at a Unicode code-point boundary. JSON escaping keeps each included record
parseable, but truncation can remove a qualifier or omit an important chunk.

For an actual token budget, supply the target model's tokenizer. No tokenizer is
installed or guessed by the library:

```ts
import { projectRecallForPrompt, type RecallResult } from "@focaxisdev/deja-vu";

function promptMemory(result: RecallResult, countModelTokens: (text: string) => number) {
  return projectRecallForPrompt(result, {
    maxBytes: 4096,
    maxTokens: 800,
    countTokens: countModelTokens,
  });
}
```

`maxTokens` accepts 0 through 1,048,576 and requires a deterministic counter that
returns a non-negative safe integer. Each accepted prefix is checked as a whole;
a non-monotonic tokenizer can leave unused budget. `tokens` is reported only when
a counter is supplied. Reserve separate space for the host's wrappers and other
prompt sections. The projection controls size and fields; it does not make memory
text trusted instructions or sanitize prompt injection.

## Opt in to embedding reuse

```ts
import {
  CachedEmbeddingProvider,
  MockEmbeddingProvider,
  createInMemorySemanticRecallEngine,
} from "@focaxisdev/deja-vu";

// The mock is deterministic local test data, not a semantic language model.
const embeddings = new CachedEmbeddingProvider(new MockEmbeddingProvider(256), {
  modelKey: "mock:256:v1",
  maxEntries: 128,
  maxBytes: 8 * 1024 * 1024,
});
const engine = createInMemorySemanticRecallEngine({
  embeddingProvider: embeddings,
  preserveDerivedOnMetadataUpdate: true,
});
await engine.addMemory({ id: "settings", title: "Settings sync", content: "Settings sync stays server-backed." });
await engine.updateMemory("settings", { importance: 0.9, metadata: { reviewed: "yes" } });
// No summaries, chunks or embeddings are regenerated for this update.
embeddings.clear(); // Release this wrapper's retained digest/vector entries when needed.
```

`preserveDerivedOnMetadataUpdate` defaults to false. With it enabled, an update
whose keys are limited to `importance` and `metadata` preserves summary text,
chunk IDs, chunk importance/timestamps, embeddings, raw content, creation time,
and last-access time. It updates the memory's modification time, familiarity
importance, and merged summary metadata. Title and tags remain authoritative.
The existing compensated write path still runs; this is not a zero-I/O update.

This mode is a contract to preserve derived content, including for custom
summary generators and chunkers. Do not enable it if changing metadata must
regenerate those fields. Any other update key uses the normal preparation path.
The default behavior still invokes custom generators on metadata updates.

The embedding cache is optional, local to one wrapper instance, and stores only
completed embeddings. Its key is now a keyed digest of exact input text and `modelKey`, without
text normalization; see the [ownership guide](recall-lifecycle.md). Include provider, model revision, dimensions and preprocessing
options in that identifier. A callback may supply the current identifier when
configuration changes. Keep provider configuration stable for each in-flight
call: the key must identify the model that actually produced its vector.
Model changes also require the host to rebuild stored
corpus vectors; cache invalidation alone does not make mixed-model vectors valid.

The defaults are 128 entries and 8 MiB of accounted key/vector storage. Limits
are 0–10,000 entries and 0–64 MiB. Setting either limit to zero disables retention.
Accounted storage is 128 bytes per digest plus vector float64 bytes, not a measurement
of the JavaScript heap. Entry count also bounds per-entry overhead. Oversized
entries bypass the cache, failures are not cached, and returned vectors are copies.
Concurrent misses may compute separately; there is no unbounded pending-promise
map. Clearing the cache prevents already-pending requests from repopulating it.

Use a separate cache instance for each project/security scope. Without managed
ownership, deleting a memory does not selectively release shared cache entries;
use `clear()` for the wrapper or opt in to
[per-memory/revision scopes](recall-lifecycle.md). Scopes prevent late insertion
and avoid shared-entry ownership ambiguity, at the cost of cross-memory reuse.
Reference release is not verified secure erasure. There is no recall-result cache,
but default unsynchronized reads can overlap writes; enable managed ownership or
`consistentReads` for ordering within one engine instance.

## Migration checks

- `topK`, `candidateLimit` and `chunkLimit` reject negative, fractional, non-finite
  or greater-than-1000 values with `RangeError`, before engine adapter calls.
  `chunkLimit` still defaults to three; zero skips query embedding and detail reads.
  Built-in storage/vector search methods validate their limits too.
- Default chunking accepts `maxCharacters` from 1 to 1,000,000 and overlap from
  zero to `maxCharacters - 1`. The default remains 280/40; for a smaller custom
  maximum, omitted overlap is capped to fit. Previously invalid sizes now reject.
- Familiarity getters/search results from the built-in storage return copies.
  Use `saveFamiliarity`, `updateMemory` and `deleteMemory` to change indexed data;
  mutating a returned object no longer edits the store.
- Token sets are created on save and invalidated on replacement/deletion. The
  lexical score and posting-order tie behavior are retained, including Unicode
  behavior. There is no automatic language segmentation or stop-word policy. Exact host-authored
  query aliases are available as a separate opt-in.
- Leave the new opt-ins disabled to retain the previous search breadth, raw
  result shape and metadata regeneration behavior. Eligibility correction,
  numeric validation and token-set reuse apply by default.

## Measurements and deferred work

See the [unreleased notes](../release-recall-efficiency.md) for measured results
and validation limits. The [benchmark script](../../scripts/benchmark-recall.mjs)
uses synthetic fixtures only. Token caching increases resident index memory and
moves work to writes; defensive copies also allocate memory. Heap usage and
index construction are outside the hot-path benchmark.

CLI index persistence, route/frontmatter caching and supersession graph changes
are deferred. This batch leaves CLI implementation and the three-file protocol
unchanged. Also deferred: automatic language-aware candidate generation, semantic fallback,
ANN, chunk-by-ID adapter reads, batch embedding APIs and durable transactions.
No paid service, runtime dependency or daemon is introduced. The built-in
in-memory adapters remain nonpersistent, and the default mock embedding model
still does not provide semantic or multilingual understanding.

For newer lifecycle opt-ins, digest-key byte-budget migration, raw retrieval and inline truncation warnings, read the [round-two guide](recall-lifecycle.md).
