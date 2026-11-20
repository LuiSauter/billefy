# Offline verifier runtime — R2, S1–S5

The final goal is independent evidence for the 21-event accounting audit. Preparing
dependencies is only its prerequisite: passing utility tests is **not** acceptance
of the web application. Prior failed preparations and app-verification budgets
remain history; S5 separately authorizes two purpose-specific payloads.

Node standard library only; uses existing `web/node_modules` bytes, without installs,
network, financial-data writes, installed-dependency mutation, helper/global edits,
source transforms, compression, test filters, or changes to the tsc project.
The parent owns actual preparation, helper invocation and independent app checks.
The worker runs synthetic utility tests only:

```sh
node --test tools/financial_audit/prepare_verifier_runtime.test.mjs
node tools/financial_audit/prepare_verifier_runtime.mjs --help
```

## CLI and profiles

Without `--profile`, the original **complete, copy-all** payload remains the default
at `.verifier-runtime`. `--profile tests` stages `.verifier-runtime/tests`, and
`--profile types` stages `.verifier-runtime/types`. Each output must be fresh;
creating one never overwrites the other. A missing shared staging parent is created
only after successful preflight. Staging links are rejected. Existing output is an
error, not permission to delete or reuse user data. `--output PATH` still overrides
the destination (its parent must exist); `--project PATH` defaults to cwd.

| Profile | Package roots | File roles |
| --- | --- | --- |
| complete (implicit) | All production dependencies, TypeScript, Vitest, Node/React/React DOM types, esbuild from Vitest's Vite context | All package files; debug-map diagnostics only |
| tests | All production dependencies, Vitest, esbuild from the same Vite context; all declared reachable dependency/peer contexts | Runtime code, native binaries, TS source exports, resources, manifests/licenses. Declaration-only files may be omitted only outside runtime conditional entrypoints and literal resource references. No TypeScript/compiler/type-only root is added solely for typechecking. |
| types | All production dependencies and the complete profile's compiler/type/Vitest roots; reachable contexts preserved | Entire TypeScript compiler package; all declarations and TS sources; manifests/licenses and non-code resources; packages without type information conservatively retain JS. Runtime JS/native artifacts otherwise require compiler or type-resolution roles. |

Types selects `types` conditional branches (including imports/exports), falling
back to other branches with declaration substitution. Relative and declared bare
literal references extend the closure, retaining JS without declaration counterparts
and referenced resources. This is not a compiler run; the actual same-project tsc
check remains mandatory. tsc does not execute dependency JS or language-service
plugins. Compiler files and resources are not pruned. Unsupported encoded/template
module references in retained dependency code/types fail instead of guessing.

Both profiles retain exact installed package identities, versions, nested conflicts,
peer contexts, bytes and modes for retained files. Required missing edges fail.
All installed optional/peer dependencies remain in the graph; absent optional edges
are recorded. Only the prior explicit Next optional `@next/swc-*`/`sharp` edges
(build/server image work) remain excluded. Other dev roots are excluded as roots,
not silently removed when reachable. Manifests and licenses remain intact.

Profile debug-map exclusions require structural v3 validation and the existing
manifest/entrypoint/import/export/literal-resource guards. Protected maps and invalid
`.map` resources stay. Executable dependencies with uncertain dynamic filesystem or
require-based resource selection **block the tests profile** when files would be
omitted; the utility does not infer safety from missing literal references. This
conservative guard may reject the actual installed graph. Do not weaken it or claim
a usable payload after such rejection. Role omissions record source/destination,
path, byte count, mode, SHA-256 and reason in `manifest.profileOmissions`.

## Counts, preservation and output

`--include PATH` repeats for **every** intended untracked helper input. Tracked
current files are counted via `git ls-files`, deduplicated against includes.
Synthetic callers can supply both `--base-files N --base-bytes N` instead.
`--max-files`/`--max-bytes` can only lower the fixed 20000-file/256-MiB ceilings.
Each profile independently includes its baseline, retained files and full manifest;
never include the sibling runtime in that helper payload. `--dry-run` never writes.

Nested `node_modules`/`.bin` are graph-owned; only regular files are emitted.
Links resolve only inside the installed tree; unsupported types/link cycles fail.
Hash/mode/metadata inventories and dependency lookups repeat before frozen bytes
are written. `inputPreserved` certifies selected-source checks, not excluded packages.
A write-time I/O failure can leave a new incomplete directory; never use it.

Report fields:
- `profile`: `complete`, `tests` or `types`; `profileOmissions`: omitted files/bytes.
- `runtimeFiles`, `runtimeBytes`, `baseline`, `totalFiles`, `totalBytes`, `maxFiles`,
  `maxBytes`: **actual selected profile** accounting including manifest.
- `inputSha256`, `inputPreserved`, `packages`, `sourcePackages`, `manifest`, `cli`,
  `api`, `omittedRoots`, `omissions`, `largestPackages`: graph and preservation data.
- `debugMaps.validated`, `protected`, `candidates`, `candidateSha256`, `proposed`,
  `absoluteMinimumFiles`: diagnostics for the unprojected graph selected by that
  profile's roots. They do not replace actual profile counts or safety checks.

Success emits stdout JSON, exit 0. Cap rejection emits `Budget exceeded: <JSON>` on
stderr, exit 1; uncertainty emits its concrete source locator, exit 1. Both leave no
new output. Timeout/missing JSON is failure, never preservation or cap-fit proof.
The maximal-token guard prevents quadratic literal-map scans; the existing bounded
256-KiB performance regression remains mandatory.

## Parent-only preparation and disposable placement

The parent may run each newly authorized profile preparation **once**, in background
with its bounded deadline, saving stdout/stderr/status. Use the original complete
include list plus `--profile tests` or `--profile types`, without `--dry-run`, so the
same invocation measures, checks caps/preservation, then materializes only if safe.
No automatic retry, trimming expansion, app-probe retry or old-budget reset follows.

The unchanged helper must include **one** chosen `.verifier-runtime/<profile>` plus
all tracked and intended untracked inputs. In the helper's disposable scratch only,
with working tree named `work`, move the chosen regular dependency directory:

```sh
# Run ONE alternative per separately prepared scratch; never against the live repo.
test ! -e work/web/node_modules && test ! -L work/web/node_modules && mv work/.verifier-runtime/tests/node_modules work/web/node_modules
# OR, in the separate types scratch:
test ! -e work/web/node_modules && test ! -L work/web/node_modules && mv work/.verifier-runtime/types/node_modules work/web/node_modules
```

Manifests stay at `work/.verifier-runtime/<profile>/manifest.json`; their destinations
are relative to the original profile root, now rebased to `work/web` for verification.
There must be no fallback link to live dependencies. Entrypoints after placement
(usage only, **not executed by this worker**):

```sh
node work/web/node_modules/vitest/vitest.mjs run --root work/web
node work/web/node_modules/typescript/bin/tsc --project work/web/tsconfig.json --noEmit --incremental false
```

Browser bundling uses the tests profile's regular JS API
`work/web/node_modules/esbuild/lib/main.js` and real `react`/`react-dom` from the same
payload. Use `api.esbuild`, not `node <native bin/esbuild>`. The entire test suite
and original typechecking scope remain required; profiles do not change configs,
source files, tests, acceptance criteria, or any previously bounded app-check budget.
