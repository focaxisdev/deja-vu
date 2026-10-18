# Local social draft: recall cues and lifecycle

Unpublished social draft only. Package v0.8.0 is prepared, with no publication date
assigned; see the [release status](release-v0.8.0.md). Hosted source acceptance
has passed; publishing the package or a social announcement remains a separate action.
See the [evidence and limitations](release-recall-lifecycle.md).

## Short introduction

Deja Vu's repository source now includes optional-engine improvements: explicit query aliases,
embedding-cache ownership that follows memory updates and deletions, recoverable
supersession, and prompt excerpts that warn when constraints may be missing.
The three-file memory protocol stays the same.

## Technical follow-up

In a small synthetic held-out set, authored aliases raised Recall@1 from 2/13 to
10/13, with no false recalls observed. Unlisted paraphrases still missed. This is
explicit routing, not a new multilingual semantic model.

The tradeoffs matter: separate cache ownership means less cross-memory reuse,
and this round did not improve measured latency. Direct offline packaging and
installed smoke checks pass. Full source, compiled and installed-package tests
also pass on Ubuntu and Windows in the verification branch's GitHub Actions.
That does not explain the earlier Cloud runtime's native EPERM. The source is
public; the package update and this social draft remain unreleased. Usage, migration,
full measurements and remaining limits are in the release-note draft.
