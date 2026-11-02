# Reuse the existing FX transfer flow

## Objective
Replace the newly prominent generic `MovementTransferModal` entry point with the existing `FxTransferModal` and its established dashboard transfer handler, so the transaction screen reuses the existing FX/cross-account flow instead of duplicating it.

## Acceptance criteria
- The visible transaction-screen transfer action opens `web/src/modules/ledger/presentation/FxTransferModal.tsx`.
- Confirmation uses the same `executeFxTransfer` application action as the dashboard, including currency conversion and existing refresh semantics.
- Add a focused regression test proving the existing modal and handler are wired through the transaction screen.
- Do not change transfer semantics or create a second API path.

## Scope / constraints
- Preserve the dirty worktree and all prior changes.
- Minimize edits to `MovimientosView.tsx`, its test, and the page callback wiring only if needed.
- Do not remove obsolete modal files unless their safe removal is necessary and explicitly proven by references/tests.
- No stage/commit, server, database, or unrelated changes.

## Tasks
- [x] T1 — Trace existing FX modal and dashboard handler wiring.
- [x] T2 — Wire the transaction-screen action to the shared modal and handler with regression coverage.
- [x] T3 — Run focused verification and inspect final changes.

## Evidence
- User explicitly identified `web/src/modules/ledger/presentation/FxTransferModal.tsx` as the existing “Transferencia entre cuentas y conversión FX” modal to reuse.
- Current `MovimientosView.tsx` instead imports/opens `MovementTransferModal` and directly registers its transfer via a new repository call.
- `web/src/modules/dashboard/presentation/ModalsContainer.tsx` already uses `FxTransferModal`; `useLedgerModule.executeFxTransfer` is the established conversion and transfer action.
- The prior assistant response wrongly promoted the duplicate modal instead of reusing this implementation; this correction is scoped to the transfer UI wiring.

## Verification
- RED: MovimientosView regression failed because the visible transfer action did not render the expected existing `FxTransferModal`.
- GREEN: independent focused verification passed 241 tests across 47 files (the package script ran the broader web suite, including 7 MovimientosView tests); `git diff --check` passed.
- Source/test inspection confirms toolbar opens `FxTransferModal`, confirmation calls `dashboard.executeFxTransfer` with the current P2P rate, and the movements list reloads.
- `MovementTransferModal` remains unused in production but is not deleted; no production reference was found in web/src.
- Native ASSESS returned unassessable because untracked files were undeclared; RDD is off, so independent verification was performed. No build beyond Vitest, no commit.

## Commit evidence
- No commit created; user has not authorized delivery/commit.