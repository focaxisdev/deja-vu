# Branch acceptance on GitHub Actions

Unreleased verification setup, continuing the [Cloud checkpoint](verification-loop.md).
Starting revision: `4c05a77605f6cf63a10261dc394c0824208313ea`.

Current outcome: the authorized connector publication succeeded after installation
access was corrected, and both hosted jobs passed all gates. See the
[verified results, logs and SHA mappings](actions-acceptance-results.md). The
transport and permission sections below preserve earlier checkpoints.

## Scope and acceptance defined before execution

The `Recall acceptance` workflow runs directly on pushes to
`fix/recall-efficiency-and-budgets` and is reused by main/PR CI through
`workflow_call`, with `contents: read`, Node 22, and the existing Ubuntu/Windows
runner matrix. It does not publish, deploy, create a release or access configured
secrets. Checkout does not persist credentials. Main/PR runs use the same complete
test selection and frozen evaluation assertions as branch acceptance; fresh
synthetic-project lint/readiness checks replace inspection of project memory.

Both jobs must finish successfully at the exact pushed SHA:

| Gate | Command and required evidence |
| --- | --- |
| Types | Existing TypeScript compiler, `--noEmit -p tsconfig.json` |
| Complete source suite | `npm test` invokes the unchanged complete source selection, including helper regressions |
| Complete compiled suite | `npm test` builds and runs all six compiled test files |
| Pack/install/use | `npm test` invokes the package test, including prepack, offline local installation, installed CLI and engine API assertions |
| Regressions, lifecycle and projection | All existing product assertions in the complete selections remain enabled |
| Recall quality | Exact frozen fixture digest, returned IDs, development/held-out metrics and interpretation; runtime version is recorded separately |
| Cache measurements | Current unscoped/owned provider-call and retained-entry counts match the frozen record; these are not latency measurements |
| Documentation and protocol | Existing link checker plus public synthetic fixture lint and feedback checks |

The workflow exports the committed public source and synthetic fixtures to the
runner's temporary directory. It excludes the project's root `memory/` tree,
retains every test, and runs the unmodified link checker over that public snapshot.
Package tests initialize their own synthetic project. No private project-memory
read is needed. Dependencies come from the existing lockfile; no dependency is
added. Hosted runner results establish behavior on those runtimes, not the exact
cause of the Cloud Node 24 native EPERM.

For a failed run, retain its SHA, job/log URL, original error and failed gate;
diagnose before making a focused correction. Rerun the complete acceptance after
each correction. Do not turn a blocked or skipped gate into a pass. Follow the
repository's verification loop and stop on an actual access denial.

## Initial transport checkpoint

The initial local HEAD and clean worktree were verified. The remote repository is
public; its main SHA is `188d7e8c3aed224e45071d041cd140509887b29f`. The only
existing workflow is `ci.yml`, triggered by main pushes and pull requests, with
read-only contents permission and no release/publish/deploy step.

The ordinary read-only transport check
`git ls-remote origin refs/heads/main refs/heads/fix/recall-efficiency-and-budgets`
failed with exit 128:

```text
fatal: unable to access 'https://github.com/focaxisdev/deja-vu.git/': Failed to connect to proxy port 8080 after 0 ms: Could not connect to server
```

The existing GitHub connector can read this repository and reports push access,
but its branch listing has no fix branch and the Git commit endpoint returns 404
for `4c05a77605f6cf63a10261dc394c0824208313ea`. Its commit-creation interface does
not accept original author/committer metadata or raw Git objects, so recreating
commits through it cannot preserve the existing commit SHAs. No substitute history
or remote branch was created. No push or Actions run is claimed.

An ordinary push would require a working connection to the Cloud's configured
Git proxy. No new secret, broader repository permission, direct connection, or
security-setting change was attempted. At this checkpoint, all GitHub Actions
gates were **not run / transport blocked**.

Local preparation checks passed: workflow YAML parsing and trigger/permission/gate
assertions, Bash syntax checking of all run blocks, TypeScript no-emit checking,
and the exact frozen-quality/cache assertion block using the previously compiled
unchanged engine. The unmodified link checker passed over the public snapshot
(69 Markdown files). These checks do not execute a hosted job, `npm ci`, or the
blocked complete subprocess suites and cannot establish Actions acceptance.

## Authorized connector publication

The subsequent Cloud UI push also reported failure. A fresh remote branch listing
still showed no fix branch and main remained at the SHA above. The user authorized
an alternative: preserve all original local commits, but create a new remote
commit on that verified main with the exact final local tracked tree. Remote and
local commit SHAs are intentionally different; this is not a force push or a
claim that the original local commit objects were transferred.

Before creating the branch, compare the remote tree SHA and every recursive
entry's path, type, mode and object SHA against the local tree. Transfer only
reviewed changed blobs, retaining unchanged public baseline objects by reference.
Include additions, modifications and deletions in the comparison. Do not read or
upload private memory, credentials or untracked files. Record the source local
commit and tree in the remote commit message, then record the returned remote SHA
in the verification checkpoint. If the connector rejects access or cannot preserve
the tree, stop without substituting an incomplete tree. Hosted acceptance remains
unverified until both jobs reach successful terminal states at the published SHA.

## Historical connector result: permission blocked

The reviewed source snapshot is local commit
`c2a9bb103e4f502d23a66a6c067f00c8b0b10467`, tree
`66a2c3949b8ad087289f438b451c47e608413b68`. All 122 baseline file entries
matched the remote main tree by path, type, mode and object SHA. Its final tree
has 147 files: 25 additions, 16 modifications, no deletions or mode changes.
Changed UTF-8 bytes and blob hashes were checked locally; credential-pattern
checks had no alerts. Only reviewed changed files were submitted, without reading
private memory or credential files. Unchanged baseline blobs were referenced.

The first write, `POST /repos/focaxisdev/deja-vu/git/trees` through the existing
connector's `create_tree`, returned HTTP 403:

```text
Resource not accessible by integration
```

No remote commit or branch was created, no alternative write endpoint was tried,
and no permission/security configuration was changed. A subsequent read confirmed
main unchanged and the target branch still absent. Repository metadata reporting
`push: true` did not establish integration access to this write endpoint. The exact
missing permission is not exposed by this error and is not assumed to be a
specific workflow or contents scope.

At that checkpoint all hosted gates were **not run / connector permission blocked**. The final
remote tree could not be created or verified; there is no remote SHA or Actions
run/log URL. A maintainer must restore ordinary approved Git transport or provide
an already-authorized connection that can perform this Git tree write before
publication can continue. This task does not expand permissions or add secrets.
The [publication evidence](actions-publication-evidence.json) records every changed
path, mode and blob SHA, the source mapping and the denied action. The original
local history is retained; later local documentation commits record this blocker.
