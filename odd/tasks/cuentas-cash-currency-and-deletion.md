# Cuentas: Cash Account, Multi-Currency Conversion Labels, and Account Deletion

Fix and enhance account management in "Mis cuentas":
1. Support Cash ("Efectivo") accounts with proper icon, color, and creation options.
2. Respect native account currency (BOB/Bs, USD, USDT, USDC) and display conversion label in the user's preferred currency, while keeping total balance converted in the user's currency.
3. Allow deleting accounts: backend `DELETE /v1/accounts/{id}` (archives if transactions exist per ACC-05, deletes if empty) and UI action with confirmation.

## Tasks

- [x] Task 1: Backend Account Deletion & Archival (ACC-05) - Add `DELETE /v1/accounts/{id}` endpoint, repository/service methods, and integration tests. (Commit: `9c24e9a`)
- [x] Task 2: Account Types & Cash Support - Add `Cash` ("Efectivo") type option to `account-meta.ts`, update metadata helpers, and support it in `CreateAccountModal`. (Commit: `d31867f`)
- [x] Task 3: Multi-Currency Support (BOB, USD, USDT, USDC) & Conversion Labels - Add `USDC` support; format native currencies cleanly; display converted sub-label in user's currency on cards and list; verify total balance calculations. (Commit: `376cdd4`)
- [x] Task 4: Account Deletion UI & Verification - Wire `deleteAccount` in web repository and hooks; add delete actions in `AccountCard`, `AccountHeroCard`, and `EditAccountModal` with confirmation; run backend and frontend test suites. (Commit: `376cdd4`)
