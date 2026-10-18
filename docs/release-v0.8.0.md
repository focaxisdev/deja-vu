# Deja Vu v0.8.0 release preparation

**Status: prepared in source; npm publication, tag and GitHub Release are pending.**
No publication date is assigned. The package and lockfile target 0.8.0, a minor
increment for additive, opt-in engine APIs. The unpublished 0.7.1 candidate's
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
Do not treat an unpublished candidate as available through `npm install`.

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

## Acceptance and publication gates

Before a tag or package is published, verify the final main revision:

1. Complete source and compiled suites, type checking, public Markdown links,
   package/install/CLI/API checks on Ubuntu and Windows, with no skipped cases.
2. Frozen recall quality and cache lifecycle counts, projection regressions,
   synthetic protocol lint/feedback and fresh-project readiness.
3. Full package paths and content review: only public distribution files and
   synthetic examples; no project memory, credentials or private task material.
   Check manifest/lock/installed version, tarball SHA-1 and SHA-512 integrity.
4. Read actual npm versions/dist-tags and Git tags immediately before publication;
   confirm 0.8.0 and v0.8.0 are free. CI logs registry metadata without credentials.
5. Publish from the exact verified commit using an existing authenticated release
   mechanism. Keep `prepublishOnly` and all assertions enabled. Do not overwrite
   an existing tag/version or bypass an authentication/OTP requirement.
6. Verify npm `version`, `gitHead`, `dist.integrity`, `dist.shasum` and `latest`;
   download and compare the actual registry artifact. Perform a clean
   `@focaxisdev/deja-vu@0.8.0` installation and repeat CLI/API smoke checks.
7. Verify v0.8.0 resolves to the same commit as npm `gitHead` and the GitHub
   Release target. Record the real publication status/date only after success.

The [hosted acceptance report](actions-acceptance-results.md) covers the earlier
source update. The final release-preparation PR and main CI must pass separately;
their checks are visible in [CI](https://github.com/focaxisdev/deja-vu/actions/workflows/ci.yml).

## Current external blockers

The Cloud shell's public-registry request was denied with `connect EPERM`; it was
not retried through another proxy or security configuration. Its existing GitHub
CLI authentication also reports an invalid token. The available connector can
publish verified branch trees and merge pull requests, but does not expose tag
or Release creation. Its fetch interface does not support listing Actions secrets.
No new credential, permission or publishing workflow has been configured.

Release completion needs an existing authenticated npm and GitHub release
environment with normal registry connectivity. Until that is available, successful
CI and merged preparation are not evidence of npm publication or a GitHub Release.
Do not reuse an earlier tarball after changing the release files.
