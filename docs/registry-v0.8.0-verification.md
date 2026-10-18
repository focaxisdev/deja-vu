# Published 0.8.0: independent registry verification

Verified on 2026-10-18 using public registry and GitHub reads from GitHub Actions.
[Run 39101806633](https://github.com/focaxisdev/deja-vu/actions/runs/39101806633)
completed successfully on Ubuntu and Windows at verification commit
`eb642db63cfa9f97746d589863f2146ab53268ae`. This follow-up commit is not the
published package's source revision.

| Identity or artifact | Verified value |
| --- | --- |
| npm package version / observed latest | 0.8.0 / 0.8.0 |
| npm gitHead, v0.8.0 tag, Release target | `42221805bdb1853b4cc347d7bfba29532594b3f2` |
| GitHub Release ID | 416213665, public, not a prerelease |
| File count / unpacked size | 138 files / 822,678 bytes |
| Tarball SHA-1 | `9e09a7067f2a56ebbeefaee89933ad5487276d31` |

Tarball SHA-512 integrity:

```text
sha512-QPwz0brkGf7Ip1P7xnfcB1XwKeI3DvLjApccKP+H+CULWkOxtIqdFglMLhN62X5XcawdGyL03aLVigmTaL4H3w==
```

The complete expected manifest was captured from the original release commit's
[main CI](https://github.com/focaxisdev/deja-vu/actions/runs/39093665904), before
registry verification. Its fixed [fingerprint](https://github.com/focaxisdev/deja-vu/blob/eb642db63cfa9f97746d589863f2146ab53268ae/.github/release-v0.8.0-fingerprint.json)
includes every file's path, size and mode. Verification compares that entire
manifest and independently hashes the bytes downloaded from the real registry.
It does not substitute a newly packed local checkout.

## Gates and logs

Both jobs used Node v22.23.3 and npm 10.9.9:
[Ubuntu log](https://github.com/focaxisdev/deja-vu/actions/runs/39101806633/job/117599436397),
[Windows log](https://github.com/focaxisdev/deja-vu/actions/runs/39101806633/job/117599436532).

| Gate | Ubuntu | Windows |
| --- | --- | --- |
| Registry version, latest, gitHead and distribution metadata | Passed | Passed |
| Downloaded archive: complete manifest, SHA-1 and SHA-512 | Passed | Passed |
| New directory/cache, version-pinned registry installation | Passed | Passed |
| Installed lockfile version, resolved URL and integrity | Passed | Passed |
| CLI init, doctor, explain, lint, scan and feedback | Passed | Passed |
| Existing installed API smoke, including new opt-in APIs | Passed | Passed |
| Public tag and Release target correspondence | Passed | Passed |

The installation uses a separate, initially absent cache from the registry-pack
cache and installs `@focaxisdev/deja-vu@0.8.0`, not a local tarball. The normal
installation does not disable lifecycle scripts. API assertions are reused from
the existing package test, including eligible alias recall, byte-bounded projection,
metadata update, supersession, raw retrieval and zero retained managed-cache entries
after deletion. All data is synthetic; no paid embedding service is used.

The [original full-suite results](https://github.com/focaxisdev/deja-vu/actions/runs/39093665904)
cover 119 source and the same 119 compiled cases plus one package/install/use case
per platform, with zero failures or skips. Registry verification is additional
installed-artifact evidence, not another full run of those source tests. Later
repository changes receive their own [main CI](https://github.com/focaxisdev/deja-vu/actions/workflows/ci.yml).

## Scope and reproducibility

The version-specific workflow has only `contents: read`, does not persist checkout
credentials, and cannot publish or move tags. It checks 0.8.0 as `latest` at this
closeout; a later release may legitimately supersede that dist-tag and make this
historical latest assertion fail. That does not retroactively invalidate these logs.

The published archive retains preparation-era pending text. Current repository
documentation records the completed publication; those newer documentation commits
must not be mistaken for npm `gitHead`. The original tag and tarball are unchanged.
These checks establish artifact correspondence and exercised behavior, not npm
provenance attestation or compatibility with every supported Node version.

The workload-specific [performance and recall limitations](recall-update.md#benefits-and-limits-measured-separately)
still apply. Neither this clean-install check nor matching hashes measures a new
product-wide speedup. The earlier Cloud execution/network restrictions remain a
separate environment limitation and were not bypassed for this verification.
