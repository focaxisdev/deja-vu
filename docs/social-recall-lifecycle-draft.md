# Local social draft: recall cues and lifecycle

Unpublished draft only. No release date or version is assigned. Do not use this
copy as a release announcement until the remaining verification blockers are
resolved. See the [evidence and limitations](release-recall-lifecycle.md).

## Short introduction

We're preparing optional-engine improvements for Deja Vu: explicit query aliases,
embedding-cache ownership that follows memory updates and deletions, recoverable
supersession, and prompt excerpts that warn when constraints may be missing.
The three-file memory protocol stays the same.

## Technical follow-up

In a small synthetic held-out set, authored aliases raised Recall@1 from 2/13 to
10/13, with no false recalls observed. Unlisted paraphrases still missed. This is
explicit routing, not a new multilingual semantic model.

The tradeoffs matter: separate cache ownership means less cross-memory reuse,
and this round did not improve measured latency. Direct offline packaging and
installed smoke checks pass, while subprocess-based tests still report EPERM in
the current Cloud. These changes remain local and unreleased. Usage, migration,
full measurements and remaining limits are in the release-note draft.
