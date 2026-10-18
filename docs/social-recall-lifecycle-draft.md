# Local social draft: recall cues and lifecycle

Unpublished social draft only. Package v0.8.0 and its GitHub Release are public;
see the [release status](release-v0.8.0.md) and [registry verification](registry-v0.8.0-verification.md).
No social announcement has been posted as part of this closeout.
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
public, as is package v0.8.0; this social draft remains unpublished. Usage, migration,
full measurements and remaining limits are in the release notes.
