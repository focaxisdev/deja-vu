# Hosted acceptance results

Engineering evidence for the public repository-source update. This report records
pre-merge verification; current main results are available in
[main CI](https://github.com/focaxisdev/deja-vu/actions/workflows/ci.yml).
An npm package or GitHub Release is a separate publication, not implied by CI.

## Verified result

[Run 39089631583](https://github.com/focaxisdev/deja-vu/actions/runs/39089631583)
completed successfully at remote commit
`db56925d789482ba1f2a850b5833e73e7f031de4`. Its tree
`0cbc219a67320f375f3685656e2e30ecf424baa2` exactly matches local commit
`b139302c87b891cdc4e45ed735b5e2b7461b941f`. All original local commits remain in
the local fix branch's ancestry; remote commits intentionally have different SHAs.

| Gate | Ubuntu | Windows |
| --- | --- | --- |
| TypeScript no-emit check | Passed | Passed |
| Complete source tests | 119 passed, 0 failed, 0 skipped | 119 passed, 0 failed, 0 skipped |
| Fresh build and complete compiled tests | 119 passed, 0 failed, 0 skipped | 119 passed, 0 failed, 0 skipped |
| Package, offline installation, installed CLI/API use | 1 passed, 0 failed, 0 skipped | 1 passed, 0 failed, 0 skipped |
| Frozen recall IDs, metrics and fixture digest | Passed | Passed |
| Cache provider-call and retained-entry counts | Passed | Passed |
| Synthetic protocol fixtures and feedback | Passed | Passed |
| Public Markdown links | 69 files, passed | 69 files, passed |

Both jobs used Node v22.23.3 and npm 10.9.9. Logs:
[Ubuntu](https://github.com/focaxisdev/deja-vu/actions/runs/39089631583/job/117563410807),
[Windows](https://github.com/focaxisdev/deja-vu/actions/runs/39089631583/job/117563410610).
The source and compiled counts repeat the same 119 cases on two operating
systems; the package test is a separate case, not hundreds of distinct new tests.
The 50 engine cases and ten diagnostic-helper cases are included, alongside all
CLI/reliability cases. No failing assertion or test selection was removed.

The [machine-readable record](actions-acceptance-results.json) includes every
publication mapping and earlier failures. This report records the run above;
documentation follow-up commits must receive their own successful complete run.
Their source local SHA/tree are recorded in each remote commit message.

## Evidence-driven corrections

1. [Initial run](https://github.com/focaxisdev/deja-vu/actions/runs/39089273873):
   workflow failure with zero jobs. The API exposed no validation annotation or
   runner log. Inspection found `runner.temp` used under job defaults, where that
   context is unavailable. Moving unchanged working directories to the steps
   allowed both jobs to start. This was a workflow defect, not a test result.
2. [Next run](https://github.com/focaxisdev/deja-vu/actions/runs/39089353842):
   Ubuntu executed all 119 source tests: 118 passed, one failed with
   `ERR_ASSERTION: 'tie2' !== 'tie0'`. The candidate-breadth test generated each
   record's timestamp independently, so lexical ties were not necessarily hybrid
   ties. A synthetic timing example reproduced the recency distinction. Freeze
   Date for that fixture; retain all 95 efficiency assertions, including the
   original `tie0` and widened-search `tie5` checks. Its local source/compiled
   25-case suites passed before the complete hosted rerun.
3. In that same run Windows failed before tests: `tar` could not open the native
   Windows temporary path from Git Bash. Convert the export destination with
   `cygpath`, without changing security controls or test behavior.
4. [Third run](https://github.com/focaxisdev/deja-vu/actions/runs/39089505184):
   both platforms passed all source/compiled/package tests; Windows then failed
   the frozen fixture hash assertion. Its observed SHA256 was exactly the hash
   obtained by converting the fixture's LF bytes to CRLF. Reproducing this with
   `git -c core.autocrlf=true archive` confirmed the cause. Use command-scoped
   `core.autocrlf=false` for export. Keep the original fixture hash, labels,
   returned IDs and metric assertions. No persistent Git configuration changed.
5. The next complete run passed all gates on both platforms. Product source,
   thresholds, dependency lockfile and AGENTS loop rules were unchanged throughout
   these hosted-test corrections.

## Publication integrity and scope

After the user added the repository to the existing GitHub installation, the
authorized retry of the same previously denied `create_tree` operation succeeded.
The initial published tree exactly matched local
`a66a52d4fceaeba3dac4a24c8e7cc82d834a4331`; remote commit
`586f73016fc134c09c2e19b02e45c94b390e8c98` has the verified main commit
`188d7e8c3aed224e45071d041cd140509887b29f` as its parent. The initial 148-file
tree added 26 files and modified 16, without deletions or mode changes.

Every publication compares the complete recursive path/type/mode/blob-SHA list
and root tree SHA, checks the commit parent, and verifies the branch ref. Later
updates are non-force descendants of the remote branch. Changed blobs are reviewed
for private paths and credential patterns; unchanged baseline blobs are retained
by reference. Root project memory and credentials are not read or uploaded anew.
Hosted tests export public source and synthetic fixtures, excluding root memory.

At the recorded runs, the dedicated workflow triggered only for the fix branch.
It is now also reused by main/PR CI, retains `contents: read`, does not persist
checkout credentials, and has no release or deployment step. Main/PR verification
uses the same complete tests, adding fresh synthetic-project lint/readiness checks
instead of reading project memory. The original
[permission-denial checkpoint](actions-publication-evidence.json) remains historical
evidence, not the current publication status.

## Limits

- Hosted Node 22 passes establish the tested package behavior on these two runner
  images. They do not establish Node 20 coverage or identify the native syscall
  responsible for the earlier Cloud Node 24 `spawnSync EPERM`. No Cloud security
  setting, proxy or credential was changed, and denied calls were not blindly retried.
- The earlier 32 failures remain nine direct EPERM, 18 infrastructure assertions
  containing EPERM, and five parse failures whose original causes were lost. New
  passing runs cannot reconstruct those five historical causes.
- The synthetic language evaluation and authored aliases retain their previous
  limitations. Aliases are explicit routing, not a multilingual semantic model.
- No latency benchmark was added in this CI round. Cache call counts are not
  end-to-end speedups; accounted bytes are not tokens. The prior performance and
  ownership tradeoffs remain in the [release notes](release-recall-lifecycle.md).
- A green CI result or source merge is not an npm package or GitHub Release.
  Package/release publication requires separate authorization.
