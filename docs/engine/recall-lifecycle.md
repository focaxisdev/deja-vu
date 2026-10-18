# Explicit cues, cache ownership and recall provenance

Unreleased additions to the optional TypeScript engine. The three-file protocol,
CLI commands and default familiarity thresholds are unchanged. Start with the
[bounded recall guide](recall-efficiency.md) for candidate and output budgets.

## Opt in to explicit query aliases

```ts
import { createInMemorySemanticRecallEngine } from "@focaxisdev/deja-vu";

const engine = createInMemorySemanticRecallEngine({
  cueAliases: [
    { alias: "更新後快取怎麼辦", cue: "cachepolicy" },
    { alias: "cache eviction", cue: "cachepolicy" },
  ],
});
await engine.addMemory({
  id: "cache-policy",
  title: "Cache policy",
  tags: ["cachepolicy"],
  content: "Invalidate cached data after an update or deletion.",
});
const result = await engine.recall("更新後快取怎麼辦");
console.log(result.topMatch?.id); // cache-policy
```

Aliases match the **entire query** after lowercase and whitespace normalization.
They do not match substrings, strip negation, translate text, segment Chinese,
expand unknown synonyms or change thresholds. For example, `do not cache eviction`
does not activate `cache eviction`. If no alias matches, ordinary lexical recall
still runs; it can have its own false positives. Use distinctive existing tags as
cues. Duplicate cues across memories still use the existing candidate/ranking
rules, so an alias is not a guaranteed memory-ID lookup.

At most 128 entries are accepted. Each alias and cue must be a non-empty string
of at most 256 UTF-16 code units. Conflicting normalized aliases reject at
construction. The engine copies the routing map. No corpus rewrite is required
when aliases point to existing tokens. Adding tags to existing memories requires
an explicit update. Audit aliases when a policy changes: a stale alias can still
route to a live memory if its cue remains indexed. Exact matching deliberately
misses unlisted paraphrases and qualified variants.

## Opt in to managed embedding ownership

```ts
import {
  CachedEmbeddingProvider, MockEmbeddingProvider,
  createInMemorySemanticRecallEngine,
} from "@focaxisdev/deja-vu";

const embeddings = new CachedEmbeddingProvider(new MockEmbeddingProvider(256), {
  modelKey: "mock:256:v1",
  maxEntries: 128,
  maxBytes: 8 * 1024 * 1024,
});
const engine = createInMemorySemanticRecallEngine({
  embeddingProvider: embeddings,
  manageEmbeddingCache: true,
  preserveDerivedOnMetadataUpdate: true,
});
await engine.addMemory({ id: "old", title: "Old policy", content: "Synthetic old policy." });
await engine.updateMemory("old", { metadata: { reviewed: true } });
await engine.supersedeMemory("old", {
  id: "current", title: "Current policy", content: "Synthetic replacement policy.",
});
await engine.deleteMemory("current");
console.log(embeddings.getStats()); // { entries: 0, accountedBytes: 0 }
```

The mock remains a deterministic testing provider, not a semantic or multilingual
model. Managed ownership requires an embedding provider with `createScope()`;
`CachedEmbeddingProvider` supplies it. A scope belongs to one memory revision.
Repeated text within that scope reuses vectors. Identical text in another memory
or revision has a separate entry: there is no shared-reference deletion ambiguity.
This conservative policy reduces cache hits and can increase provider calls.

Successful content updates dispose the previous scope only after commit.
Failed preparation/commit disposes the new scope and retains the previous one.
Opt-in metadata-only preservation retains the scope. Successful deletion and
supersession release the old scope; failures preserve ownership for recovery.
A disposed scope rejects new calls, and already-running calls cannot repopulate
it. Those calls can still finish and return their vector: disposal is not
cancellation. Root `clear()` also blocks late insertion across all scopes.

Managed ownership automatically serializes reads with writes in this engine
instance, including query embedding, so a late recall cannot recreate a deleted
memory's scope. `consistentReads: true` enables the same read ordering without
requiring a cache provider. A read queued before deletion may finish before the
delete completes; reads queued after deletion observe the resulting state.
Slow providers hold up later operations. Do not re-enter the engine from an
adapter, summary generator or embedding callback while this mode is enabled;
that would wait on its own operation. Other engine instances, direct adapter
writes, process crashes and remote storage transactions are outside this lock.

Cache keys now use per-instance/per-scope keyed SHA-256 digests of exact UTF-16
input and a length-framed model identifier. Plaintext input is not retained as a
cache key. The configured model key must describe the actual provider/model,
revision, dimensions and options; keep it stable throughout a write and rebuild
stored vectors after changing models. Digest keys do not validate model identity.
The cache uses Node's built-in crypto module and no new package dependency.

`maxBytes` counts 128 bytes per hex digest plus eight bytes per vector value.
This excludes object/Map overhead, scope objects and their keys. The global
entry limit bounds retained cache entries; the engine also holds one small scope
object per live owned memory. A budget below 136 bytes cannot hold even a
one-value vector. Long inputs can now be cached without retaining long text keys;
hashing still takes time proportional to input length. `getStats()` reports entry
count and these accounted bytes, not heap usage, tokens or provider costs.

Unmanaged `embed()` calls retain a separate cache namespace. Deleting an engine
memory does not clear those entries, another engine's scopes, an underlying
provider's caches, copies held by callers, storage snapshots or backups. Use
separate wrappers for separate projects. Reference release and keyed digests are
**not verified secure erasure**. Private raw text is still passed to the selected
provider when a calculation is needed.

## Deletion and supersession recovery

Deletion now snapshots the memory before removing its routes and data. If an
adapter fails, it attempts to restore summary, chunks, raw content, familiarity
and both vector indexes. `MemoryWriteError` includes a detached recovery snapshot
and any recovery errors. Do not log the snapshot: it contains memory content.
Incomplete existing storage rejects before mutation and needs adapter repair.

`supersedeMemory(oldId, replacement)` is an explicit operation: the old ID must
exist and the replacement ID must be new. It prepares and saves the replacement,
then removes the old memory. On failure it restores the old memory and attempts
to remove the replacement. `MemorySupersedeError` identifies both IDs and reports
cleanup/recovery errors; both records can remain when compensation fails. The
cause may contain a `MemoryWriteError` recovery snapshot. Inspect and repair
rather than blindly retrying. Nothing is crash-atomic or a distributed transaction.

The optional engine stores no historical redirects or protocol supersession
frontmatter. Old IDs become unavailable after success. Hosts that need audit
history must retain it separately. The file-first CLI lifecycle is unchanged.

## Mark incomplete prompt evidence

```ts
import { projectRecallForPrompt, type RecallResult } from "@focaxisdev/deja-vu";

function project(result: RecallResult) {
  return projectRecallForPrompt(result, {
    maxBytes: 4096,
    includeProvenance: true,
  });
}
```

With provenance enabled, each record includes `source: "getSummary"` or
`source: "getChunks"`, `rawSource: "getRawContent"`, and its memory/field/chunk
identifiers. Recent updates also include their array index. These are API lookup
instructions for the host, not automatically executed calls. Retrieve a complete
stored summary with `engine.getSummary(memoryId)` or the original stored
`AddMemoryInput.content` with `engine.getRawContent(memoryId)`.

Every projected summary warns that it is derived and may omit original
constraints. A field clipped by projection, or a summary already clipped by weak
recall, includes `incomplete: true` and a warning that qualifiers may be missing.
Warnings and references count toward the same whole-output byte/token budget.
They reduce room for content. If even an annotated record cannot fit, it is
omitted; `truncated` is true and text can be empty. Check that flag even when the
last included record is complete, because later fields may have been omitted.

This marks loss rather than preserving sentence meaning. `getSummary()` cannot
restore text already omitted by the summary generator. `getRawContent()` returns
only the originally stored content, not separately supplied context/metadata
fields; place durable constraints in content if they must remain retrievable.
Projection does not fetch raw content, sanitize prompt injection, guarantee
source availability after deletion or reserve budget for the host's wrapper.
Bytes are not tokens; use the host's real tokenizer for a token budget.

## Migration and validation

All new routing, ownership, read serialization and provenance options default
to off. Existing result shapes, thresholds, search breadth and three-file formats
remain compatible. The default cache key representation changes to digests, so
small custom byte budgets may now cache fewer entries. The cache is in-memory;
there is no persisted key migration. Deletion now requires a complete snapshot
(or the existing legacy-adapter fallback reads) and reports recovery failures.
Built-in summary/chunk reads and writes now copy arrays and metadata so callers
cannot silently mutate stored text or vectors through returned references.

See the [round-two validation and measurements](../release-recall-lifecycle.md),
[labeled evaluation](recall-evaluation.json), and
[fixture](../../scripts/fixtures/recall-evaluation.json). General language-aware
segmentation, implicit semantic fallback, ANN, CLI rewrites, cancellation,
transactional persistence and secure erasure remain outside this change.
