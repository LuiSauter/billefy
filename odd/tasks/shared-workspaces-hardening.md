# Shared Workspaces hardening (accounting correctness + invitation flow + UI)

Owner takes full responsibility for the Workspaces module (shared finances between users). Goal: correct accounting (no duplicate postings, no impossible states), a working invite-by-email flow for people without an account, and a polished web UI for the whole module. Settlement stays a bookkeeping-only record (no real money movement) — confirmed by user.

## Specs

- S1: "no quiero errores!" — every money-moving write in Workspaces (expense register, expense link, income register, income link, settlement register, settlement leg link, goal contribution) must be idempotent and must never let a client retry create a duplicate ledger posting or duplicate domain record.
- S2: "que se pueda invitar a usuarios reales que existen o no para que creen una cuenta" — inviting an email with no Billefy account must send a real email with a registration link; accepting it (after signup or sign-in) must join the inviter's workspace automatically. Confirmed: "Enviar email con link de registro".
- S3: Keep both existing mechanisms working end-to-end: `WorkspaceInvitation` (email-addressed, 7-day expiry) and `WorkspaceInvitationLink` (generic shareable link). Confirmed: "Ambos flujos activos".
- S4: Settlement is bookkeeping only — it records that a debt was paid outside the app, never moves real money. Confirmed: "Si si la opcion 1" (option 1: solo registro contable).
- S5: Accounting correctness beyond idempotency: category IDs validated at registration time (no orphaned unlinkable expense/income), structural (DB-level) protection against double-linking a ledger leg, goal contribution amounts enforce the same currency-precision guard as expense/income/settlement, concurrency/serialization failures surface as a retryable conflict response instead of a 500.
- S6: "mejora la ui, el flujo completo" — the web UI for Workspaces (invite flow, join flow, expense/income/settlement registration, balances) must be clear about what each action does (e.g. settlement = bookkeeping record, not a real transfer) and must handle the invite-by-email path with a visible pending-invitations surface, not just the link path.
- S7: Must follow AGENTS.md: decimal/Money only, server is source of truth, migration-driven schema changes only (new forward migrations), never log secrets/PII, document any new env var in both `.env.example` and `README.md`.

## Tasks

- [x] T1 — Idempotency for expense register/link (ILedgerModule calls + WorkspaceExpense). Spec: S1, S7. Route: inline (backend, money-critical, test-first). Commit: pending.
- [x] T2 — Idempotency for income register/link. Spec: S1, S7. Route: inline. Commit: pending.
- [x] T3 — Idempotency for settlement register/leg-link. Spec: S1, S7. Route: inline. Commit: pending.
- [x] T4 — Idempotency for goal contribution + goal amount precision guard. Spec: S1, S5. Route: inline. Commit: pending.
- [x] T5 — Structural double-link protection: forward EF Core migration adding unique partial indexes on `personal_transaction_id` (expense, income) and on the two settlement leg transaction id columns, plus idempotency-key unique indexes. Spec: S5, S7. Route: inline (schema change, high risk item 1). Two migrations: `AddWorkspaceIdempotencyAndLedgerLinkUniqueness`, `AddSharedGoalContributionIdempotency`. Commit: pending.
- [x] T6 — Category validation at expense registration only (reject unknown/foreign category before creating an unlinkable record, when no immediate ledger link). Income category validation deferred: `ILedgerModule` has no income-category lookup; adding one is new cross-module contract surface, out of scope for this pass — ledger still validates category on link. Spec: S5. Route: inline. Commit: pending.
- [ ] T7 — Map serialization/deadlock failures (40001/40P01) to a retryable Conflict result consistently across WorkspaceAccess/WorkspaceRepository. Spec: S5. Route: inline.
- [ ] T8 — Email invitation sends real email via Notifications module with a registration/accept link; email-invite acceptance flow works for an existing account and for sign-up-then-join. Spec: S2, S3, S7 (env var docs for any new mail template config). Route: inline first (service wiring), then verify (item 2: security/contracts boundary — new cross-module call).
- [ ] T9 — Web UI: pending-email-invitations panel/flow wired to accept/reject, consistent with the existing link-join screen; copy clarifying settlement is a bookkeeping record. Spec: S6. Route: inline.
- [ ] T10 — Web UI pass on expense/income/settlement modals and balances view for clarity and error surfacing (idempotency-safe retries, clear validation errors). Spec: S6. Route: inline.
- [ ] T11 — Full suite run (backend dotnet test, web pnpm test/lint/build) + close. Spec: S1-S7.

## Log

- L1 (verbatim, original request): "El modulo de finanzas compartidas lo puedes auditar y mejorar profesionalmente? no quiero errores!"
- L2 (verbatim): "En realidad todo ese modulo lo hice con una ia trucha, te confio ese modulo completamente a ti claude, mejora la ui, el flujo completo, el funcionaminto completo, debe funcionar contablemente muy bien y financieramente bien tambien, para tener algo compartido con usuarios, y que se pueda invitar a usuarios reales que existen o no para que creen una cuenta para que este funcional el modulo compartido"
- L3: User chose "Enviar email con link de registro" for invite-by-email-no-account, "Todo en un solo esfuerzo grande" for scope, and asked to be explained settlement options.
- L4 (verbatim): "Si si la opcion 1" — confirms settlement stays bookkeeping-only, no real payment integration.
- L5 (explorer findings, read-only audit): no idempotency on any Workspaces write (high); serialization failures unmapped (medium); category IDs unvalidated at registration (medium); no DB uniqueness on ledger link, only in-memory + serializable (medium); goal amounts skip precision check (medium); split math and balance matrix verified correct with solid test coverage (no action needed).
