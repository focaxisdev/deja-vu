# Deja Vu v0.8.0 release

**Published on npm and GitHub; independently verified on 2026-10-18.**
The [npm package](https://www.npmjs.com/package/@focaxisdev/deja-vu/v/0.8.0),
[v0.8.0 tag and GitHub Release](https://github.com/focaxisdev/deja-vu/releases/tag/v0.8.0)
correspond to commit `42221805bdb1853b4cc347d7bfba29532594b3f2`. This minor
increment contains additive, opt-in engine APIs. The unpublished 0.7.1 candidate's
reliability fixes are included; Protocol v0.4 and the three-file adoption path
remain unchanged. No runtime dependency is added.

## Release notes

The optional engine now qualifies candidates before hybrid ranking, avoiding
false "no memory" results. Search breadth and returned output have separate
budgets. Token-set caching avoids repeated lexical preparation and invalidates
on updates and deletions. Invalid limits reject before expensive work.

Opt in to exact query aliases, bounded prompt projection, metadata-only embedding
reuse, bounded content/model-keyed caches, and per-memory cache ownership.
Deletion and supersession attempt compensating recovery after adapter failures;
projection can mark incomplete excerpts and name the source retrieval API.
CLI validation and initialization recovery include the earlier reliability fixes.

Use the existing [introduction, opt-in examples and migration guide](recall-update.md)
and [changelog](../CHANGELOG.md) for details. No memory-file migration is required.
For a version-pinned install, use `npm install @focaxisdev/deja-vu@0.8.0`.
The existing copy-first and CLI adoption paths remain available.

## Benefits and limits

- 30.74 → 2.61 ms is one 10,000-record shared-cue storage-search microbenchmark,
  not a product-wide speedup or an external-model measurement.
- Authored aliases improved 2/13 → 10/13 positive recalls in each split of a small,
  same-author synthetic dataset. They are exact routing rules, not Chinese
  segmentation, translation or a multilingual semantic model.
- The second round's default-mode resident API median increased about 12.4%.
  That result does not isolate ownership cost. Ownership separately increased
  mock provider calls while releasing retained entries after deletion.
- Byte budgets and accounted cache bytes are not tokens or measured heap use.
  Projection remains untrusted data. Recovery is neither crash-safe nor a
  multi-instance transaction, and cache release is not verified secure erasure.

See the [first-batch measurements](release-recall-efficiency.md) and
[second-batch measurements](release-recall-lifecycle.md) for workloads and caveats.

## Verified publication

The original release commit passed [complete main CI](https://github.com/focaxisdev/deja-vu/actions/runs/39093665904)
on Ubuntu and Windows: 119 source cases, the same 119 compiled cases, one
package/install/use case, types, links, frozen recall quality, cache lifecycle,
synthetic protocol checks and fresh-project readiness. No cases were skipped.

After maintainer publication, [independent registry verification](https://github.com/focaxisdev/deja-vu/actions/runs/39101806633)
passed on both platforms using Node 22.23.3 and npm 10.9.9:

- Registry `version` and `latest` are 0.8.0 at verification time.
- Registry `gitHead`, v0.8.0 and Release target all identify the original release commit.
- The actual downloaded tarball matches the original CI's complete 138-file
  manifest, 822,678 unpacked bytes, SHA-1 and SHA-512 integrity.
- An independent empty cache and new install directory successfully install the
  exact registry version and run CLI init/doctor/explain, lint/scan/feedback, and
  the existing installed API smoke covering aliases, projection, metadata update,
  supersession and managed cache release.

See the [full registry evidence and fingerprints](registry-v0.8.0-verification.md)
for log links and scope. This verification is read-only: it does not publish,
move a tag, create credentials or alter security settings.

## Release commit and later documentation

The package was published through the maintainer's existing npm login and the
GitHub Release through an existing web session. Cloud's earlier `connect EPERM`
was not retried or bypassed. Hosted verification resolves the publication checks;
it does not diagnose the earlier Cloud runtime failure.

The published archive is immutable and retains the preparation-era README and
release-note wording. These current repository notes correct that wording after
verification. Later main documentation/verification commits are **not** npm
`gitHead`, and the v0.8.0 tag remains on the original release commit. No new
package version or republished tarball is implied by this closeout.
