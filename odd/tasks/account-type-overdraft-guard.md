# Account-type overdraft guard

Block expense registration/edits from taking Cash/Savings/Wallet/CryptoWallet/Exchange/International
accounts negative, while Checking/Bank keep allowing it (existing TXN-03 behavior unchanged for them,
and for transfers/reconciliations/reversals of any type).

## Specs

- S1: User-reported bug: created a BOB "Cuenta de ahorros" (Savings) account at 0, registered a
  1 BOB expense against it with no account-type-aware guard, and it went to -Bs 1,00 with no warning.
  User: "si tengo una cuenta en 0 y hago un movimiento de tipo gasto este lo registro como -1, como
  es eso posible esta re mal!"
- S2: `docs/REQUIREMENTS.md` TXN-03 restricts insufficient-funds checks to transfers only and
  explicitly allows negative balances from "ordinary expenses, reconciliations, or existing negative
  balances" — this is the current type-agnostic rule being narrowed, not reversed: transfers,
  reconciliations, and reversals of ANY account type keep their existing behavior unchanged.
- S3: User decision (ask_user_choice): block new expenses and edits to expenses that would leave a
  negative balance, for account types `Cash`, `Savings`, `Wallet`, `CryptoWallet`, `Exchange`,
  `International`. Allow negative balances only for `Checking` and `Bank`.
- S4: User decision (ask_user_question): applies to both new expense registration AND edits to an
  existing expense (not just creation).
- S5: User decision (ask_user_question): do NOT touch/correct any account that is already negative
  today (e.g. the test "Cuenta Test Cero" created live). The guard is forward-only, for new
  violations from this point on.
- S6: Must not break `UpdateTransactionAsync`'s edit flow, which internally calls
  `RegisterTransactionCommandHandler.PrepareAsync` to build the replacement BEFORE creating the
  reversal of the original — `CalculateBalanceAsync` includes the still-active original transaction
  at that point, so a naive balance check during edit double-counts the original amount. Must mirror
  the existing projected-balance pattern already used for transfer corrections
  (`TransactionService.cs:198-201`: `projectedBalance = sourceBalance + outflow.Amount.Amount` when
  there's an existing outflow being superseded).
- S7: Guard only applies to expenses (`TransactionDirection.Expense`); income can never create a
  negative balance by itself and is out of scope.
- S8: Error code convention: mirror the existing `Transfer.InsufficientFunds` naming
  (`TransactionService.cs:203`, `RegisterTransferCommand.cs:85`) with something like
  `Transaction.InsufficientFunds`, `Error.Validation`, with a clear bilingual-safe message.
- S9: Frontend must surface this validation error clearly to the user (not swallow it as a generic
  failure) in both the registration modal and the edit flow, matching how `FxTransferModal.tsx`
  already surfaces `isInsufficientFunds`-style errors for transfers.

## Tasks

- T1: Backend — add account-type-aware insufficient-funds guard inside
  `RegisterTransactionCommandHandler.PrepareAsync`, only for `Direction == Expense` and only for the
  6 restricted account types (S3), using a projected-balance calculation that correctly excludes the
  original transaction's amount during an edit (S6). Spec: S1-S8.
- T2: Backend — RED tests first: one test per restricted account type confirming an expense that
  would go negative is rejected with `Transaction.InsufficientFunds`; one test confirming Checking
  and Bank are unaffected (still allow negative); one test confirming an edit that keeps/improves the
  balance succeeds, and one confirming an edit that would push a restricted-type account negative is
  rejected without double-counting the original amount; one test confirming transfers/reconciliations/
  reversals are unaffected for all types. Spec: S1-S8.
- T3: Frontend — surface `Transaction.InsufficientFunds` as a clear user-facing error in the
  transaction registration modal and the edit flow, not a generic failure toast. Spec: S9.
- T4: Independent verification — backend `dotnet test` green, frontend `pnpm test`/`lint`/`tsc`
  green, live browser re-test of the exact repro (Savings account at 0, expense of 1) now shows a
  clear block instead of silently going to -1; confirm Checking/Bank still allow negative via live
  test; confirm existing negative "Cuenta Test Cero" is untouched (S5).

## Log

- L1: User (verbatim): "Algo esta mal, si nos vamos a mis cuentas, si tengo una cuenta en 0 y hago un
  movimiento de de tipo gasto este lo registro como -1, como es eso posible esta re mal! no te
  encargue que revisaras eso igual? que paso con la seguridad y la calidad?"
- L2: Orchestrator reproduced live: created BOB Savings account "Cuenta Test Cero" at 0, registered
  1 BOB expense, confirmed it went to "-Bs 1,00" with the button never disabled and no warning shown.
- L3: Orchestrator found `docs/REQUIREMENTS.md` TXN-03 explicitly documents this as intentional for
  transfers-only restriction; explained to user this was a known, documented design choice, not an
  oversight from the UI-quality pass.
- L4: User, given the nuance (Savings shouldn't realistically support overdraft the way Checking
  does), chose via `ask_user_choice` to audit by account type rather than leave as-is or just warn.
- L5: Explorer subagent (`mwlttzg2-15-f12t`) confirmed: no existing code or docs distinguish accounts
  by type for balance validation; it's undecided/untested for non-Checking types, not a deliberate
  prior decision being reversed. Also found doc/code drift: REQUIREMENTS.md and DOMAIN_GLOSSARY.md
  list 4 account types, the actual enum has 8.
- L6: User decisions via `ask_user_question`: block new expenses AND edits (not just creation); do
  not touch already-negative existing accounts, forward-only guard.
