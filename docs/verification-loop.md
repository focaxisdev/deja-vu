# Verification loop: harness diagnostics and Cloud execution

Unreleased engineering checkpoint. Starting commit:
`fa479335dbc5acbad46a352d1ee8bd6086c62cd7`, on the existing local fix branch.

## Scope and acceptance, defined before changes

This iteration fixes loss of subprocess error evidence in test helpers, adds
regression coverage, and appends general verification-loop rules to AGENTS.md.
Engine behavior, thresholds, public protocol, dependencies and runtime security
configuration are outside the planned changes unless a reproducible regression
requires a focused correction. Preserve previous commits and unrelated edits.

| Gate | Required evidence |
| --- | --- |
| Source suite | All existing cases plus new harness cases run; file-level summaries are not case counts. No skips or weakened assertions. |
| Compiled suite | The same complete selection runs after a fresh build. Reconcile each failure, including original cause, with the source selection. |
| Package/install/use | Unchanged prepack clean/build, package file assertions, offline installation of the local tarball, installed CLI and engine API assertions. |
| Types | TypeScript no-emit checking and compilation with existing dependencies. |
| Regression | Existing engine, CLI and recovery assertions retained; helper cases cover operational failures, expected nonzero exits, invalid JSON, signals and diagnostic cause preservation. |
| Recall quality | The frozen development/held-out fixture yields the previously recorded IDs and metrics; no tuning to held-out labels. |
| Cache/projection | Ownership, model/content keys, pending invalidation, update/delete/supersede recovery and projection budget/provenance cases remain passing. |
| Documentation | Claims distinguish tested results, inference and blocked gates; new links resolve; original AGENTS instructions remain an exact prefix. |
| Completion | All applicable gates pass, or an external blocker has exact evidence, a reproducible checkpoint and the required resource/permission. A blocked gate is never a pass. |

Use only synthetic fixtures and existing dependencies. Do not read private
project memory. If a full-tree documentation check is needed, use a public-source
snapshot with only public/synthetic fixtures and describe that scope explicitly.
Do not disable tests, change security controls, drop inherited guard variables,
install another runtime, use paid services, or publish anything.

## Loop protocol

For each failure, record the command, baseline/current revision, environment,
exit/error evidence, hypothesis and next discriminating check. Fix the smallest
supported cause, rerun affected regressions, then the full acceptance gates.
After two iterations without new evidence or improvement, change hypothesis or
strategy; do not repeat an unchanged denied operation. A diagnostic trace is for
observation only and must stop if tracing itself is denied. Any runtime option
must be established as ordinary, authorized execution rather than an evasion of
policy before it is used. Preserve failures and blockers in the final record.

## Initial evidence and hypotheses

The preceding compiled run had 109 cases: 77 passed and 32 failed. Of the failures,
27 retain explicit EPERM evidence; five lose their original cause when a helper
parses empty stdout. The two affected test files and their CLI dependencies are
unchanged from the preceding baseline. Existing direct offline packaging and
installed smoke checks passed in the same Cloud. These observations do not yet
identify the syscall or prove a Node bug versus a security-policy denial.

Hypotheses to distinguish: helper-only diagnostic loss; Node/libuv synchronous
child-I/O failure; test-runner-specific behavior; or an enforced environment
restriction. Fix diagnostic loss first. Compare unchanged baseline code without
weakening it, and use a bounded observation only where it adds evidence.

## Changes and observed results

The error-response helper now accepts only ordinary nonzero exits with string
stdout and no operational error/code/signal. EPERM, EACCES, ENOENT, timeouts,
buffer failures, signals and invalid execution results preserve the original
thrown object. Invalid JSON from an ordinary nonzero exit becomes
`CliResponseError`, with the execution error as `cause` and the parse error
available separately. The message does not copy arbitrary stdout/stderr.

The reliability helper now rethrows `result.error` directly, retaining the same
strict `!== undefined` guard. It no longer obscures an operational error behind
`ERR_ASSERTION`. AST comparison confirms that all 70 memory-cli, 80 reliability
and 27 package-pack product assertions are unchanged. The package test now uses
npm's ordinary `--offline` option for pack/install; this restricts network use
and does not disable prepack or any assertion. Ten new helper cases cover these
boundaries, including a misleading `status: 0` accompanying EPERM.

The original AGENTS.md is an exact byte-for-byte prefix of the updated file.
Only general verification-loop rules were appended. Engine implementation,
thresholds, frozen fixtures and dependency lockfile are unchanged.

| Acceptance gate | This iteration's result |
| --- | --- |
| Complete source suite | **BLOCKED / not rerun** after known subprocess failures. The new revision has not passed this gate. |
| Complete compiled suite | **BLOCKED / not rerun** for the same reason. Do not reuse the historical 77/32 as a new result. |
| Automated package test | **BLOCKED / not rerun**; its execFileSync path previously reported EPERM. |
| Unaffected source subset | Baseline 50/50; current 60/60 (same 50 engine cases plus ten helper cases). This is not the complete suite. |
| Unaffected compiled subset | Baseline 50/50; current 60/60. These repeat the source cases, not additional distinct cases. |
| Type checking/build | Both baseline and current passed with existing dependencies. |
| Direct offline package/install/use | Both baseline and current passed unchanged prepack clean/build, tarball installation, installed metadata, help/init/doctor/lint/scan/report, and old/new engine API smoke assertions. Separate evidence, not an automated package-test pass. |
| Recall quality | Exact evaluation JSON matches the frozen record, including returned IDs and development/held-out metrics. |
| Cache/projection | Existing lifecycle/budget/provenance cases pass within the 50 engine cases. Provider-call and retained-entry measurements match the prior record. |
| Public documentation | Unmodified checker passes on public-source snapshots; private memory is excluded from the snapshot, not silently treated as verified. |
| Completion | **External diagnostic/runtime blocker checkpoint; full acceptance is not green.** |

The complete selection contains the previous 109 cases plus ten new helper cases;
the automated package case is separate. This is an expected inventory, not a new
119-case execution result. The earlier full compiled run had 77 passes and 32
failures: nine direct EPERM, 18 infrastructure assertions containing EPERM, and
five JSON parse failures with lost original causes. The five historical causes
cannot be recovered by fixing the helper now.

## Evidence loop and stopping boundary

1. **Hypothesis: helper parsing hides operational errors.** The unchanged baseline
   helper reproduces the loss with synthetic errors in one process. The focused
   fix preserves error identity and expected CLI JSON behavior; ten regressions
   pass. No product assertion was weakened.
2. **Hypothesis: the native error boundary can be distinguished with a syscall
   observation.** One bounded trace attempt failed before yielding a Node probe
   result: `PTRACE_TRACEME` and `PTRACE_SETOPTIONS` returned `Operation not
   permitted`. The trace and probe-output files are empty. Tracing was not retried
   or replaced with another mechanism, and no policy was changed.
3. **Changed strategy: unchanged public-source baseline and safe observations.**
   The same Node v24.19.0 / libuv 1.52.1 runtime passes pure engine tests and direct
   offline pack/install/use for both versions. Its built-in JavaScript wrapper
   shows the error comes back from `spawn_sync.spawn`, before the helper or test
   runner handles it. Existing dependency-free reproduction outside the test
   runner means the runner alone does not explain the failure. This does not
   identify the failing native syscall or prove Node/libuv is defective.

`Seccomp: 2`, `NoNewPrivs: 1`, and zero effective capabilities are observed.
Node's permission API is absent; NODE_OPTIONS and LD_PRELOAD are not present.
None of these observations proves which rule caused the original spawnSync
error. Direct prepack children succeeding also means it would be inaccurate to
claim all child creation is forbidden. The **tracing restriction is confirmed**;
Node/libuv versus a specific spawn/I/O policy interaction remains unresolved.

No alternative spawn API, alternate runtime, inherited-guard removal, security
setting change or same-denial retry was used. In-process test selection runs only
unaffected cases and remains explicitly partial. It is not a way to count the
blocked CLI scenarios as passed. Two iterations without new evidence must change
strategy; once further discrimination requires unavailable privileges, the loop
stops at this checkpoint instead of manufacturing a green result.

## Checkpoint and required resource

The compact [evidence record](verification-loop-evidence.json) preserves counts,
trace denial, runtime observations, fixture digest and gate states. Detailed logs,
public baseline/current snapshots, local tarballs and synthetic installed projects
are under `/tmp/dejavu-round3` in the current Cloud. Temporary files may not survive
environment replacement; the committed evidence and source remain reproducible.

An environment maintainer must provide either a denied-syscall audit/trace for the
synthetic spawnSync probe, or narrowly approved tracing capability for that probe.
That evidence is needed to identify the native error and choose a confirmed,
policy-compliant runtime/execution configuration. This is **not** a request to
turn off seccomp or broadly allow process access. No repository change can grant
that observation capability, and a different runtime has not been assumed safe.

Once that prerequisite is satisfied, run the unchanged baseline and repaired
revision under the approved configuration. Capture the original error for any
failure, rerun the affected regression, and then run full `npm test` on the public
source snapshot. It retains every source/compiled/pack assertion and includes the
new helper cases. Compare the frozen evaluation and cache measurements again.
Only all passing gates can replace the blocked status. Any new failure restarts
failure -> diagnosis -> correction -> affected tests -> full acceptance.
