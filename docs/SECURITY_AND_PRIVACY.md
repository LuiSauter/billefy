# Security and Privacy

Security and privacy design for the Personal Finance Manager. The app is public and handles sensitive financial data, so these rules are product requirements. They apply to every phase. Targets are in [NON_FUNCTIONAL_REQUIREMENTS.md](NON_FUNCTIONAL_REQUIREMENTS.md).

> This document is a technical design, not legal advice. A privacy policy and terms of use are required by the app stores and must be written and reviewed before launch.

## 1. Principles

1. **Collect the minimum.** If a field is not needed for a feature, do not collect it.
2. **Keep it only as long as needed.** Raw text is temporary; normalized data is kept.
3. **Filter on the device first.** Private data that is not financial never leaves the phone.
4. **Ask before processing optional data.** LLM processing and notification access need explicit consent.
5. **Never contact third parties.** Counterparties are records, not recipients.
6. **Assume breach.** Encrypt secrets, isolate users, audit changes, and keep logs free of personal data.

## 2. Data classification

| Class | Examples | Handling |
|---|---|---|
| Secret | Binance API keys and secrets, refresh tokens, signing keys | Encrypted at rest, never logged, never returned by the API after creation |
| Financial | Transactions, balances, loans, counterparties, budgets, goals | Per-user isolation, TLS, audit log, deleted with the account |
| Sensitive captured text | Raw event text, WhatsApp message bodies | Masked where possible, purged after 30 days, never logged |
| Personal | Email, name, WhatsApp number | Minimal use, deleted with the account |
| Operational | Ids, timestamps, error codes | May appear in logs |

## 3. Authentication and sessions

- Sign in with Google (OIDC). Sign in with Apple on iOS. No passwords are stored.
- Validate identity tokens: signature against cached JWKS, issuer, audience, expiry, and nonce.
- Short-lived access tokens (JWT) and rotating refresh tokens. Store only a hash of the refresh token (`sessions.refresh_token_hash`). Reuse of a rotated token revokes the session family.
- Store tokens in the Android Keystore and iOS Keychain. Never in plain preferences or local storage.
- Sensitive actions (account deletion) require a recent re-authentication (within 5 minutes).
- Sign-out and account deletion revoke sessions.

## 4. Authorization and isolation

- Every business table has `user_id`. Every query filters by the authenticated user through global query filters.
- Resource ids in URLs are verified against the user. Access to another user's resource returns not found.
- Consider PostgreSQL row-level security as a second layer when multi-user arrives.

## 5. Protecting data

| Area | Control |
|---|---|
| In transit | TLS 1.2 or higher on every connection. HSTS on the web. |
| At rest | Encrypted disks and encrypted backups. Secrets (Binance keys) encrypted at application level with keys outside the database. |
| Files | Statement files in private object storage, encrypted, deleted with the account. |
| Secrets management | Environment variables or a secret store. None in the repository, images, logs, or test fixtures. |
| Backups | Encrypted, expire after 35 days, restore drills each quarter. |
| Logs | Structured and redacted. Log ids and error codes only. |
| Dependencies | Automated vulnerability scanning in CI. Critical findings block release. |

## 6. Notification capture (Android)

This is the most privacy-sensitive feature.

- Notification access is a special permission the user grants in system settings. Before requesting it, show a **prominent disclosure** that explains what is read, why, and what is sent.
- The **financial detector runs on the device**. A notification is considered only if it contains an amount with a currency and a financial keyword.
- Notifications that are not financial are discarded immediately. They are never uploaded, stored, or logged.
- The first time an app produces a financial-looking notification, ask the user whether it is a financial source. Remember the answer in `financial_sources`. Rejected apps are ignored.
- Upload only the necessary fields: source package, text, and timestamp.
- Server-side, store the text masked (`masked_text`) in `raw_events` and purge it 30 days after receipt (`purge_after`). Keep only the normalized fields.
- Provide a setting to revoke access and to delete captured data.
- Store listings must describe the access accurately (data safety forms and privacy labels).

## 7. LLM processing

- Optional and off until the user gives explicit consent. Consent is revocable at any time.
- Used only as a fallback after rules fail, and only for items already classified as financial.
- All calls go through `ILlmClient`, which:
  - checks consent,
  - masks account numbers and personal names,
  - enforces a per-user daily cap,
  - records usage without storing the content.
- Recommendations receive **aggregated indicators only**: no descriptions, no counterparty names, no account identifiers.
- Choose a provider and plan that do not use customer content to train models, and document it in the privacy policy.

## 8. WhatsApp bot

- The user links a number by entering it in the app and sending the confirmation text from that number. The inbound message proves control of the number.
- A number can be linked to one account only (unique constraint).
- The bot replies only to inbound messages and never initiates conversations.
- Webhooks: verify the provider's signature or shared secret, reject replays, deduplicate by provider message id, and process asynchronously.
- Message bodies are not logged. Retention follows the 30-day rule for captured text.
- Users can unlink at any time.

## 9. Binance integration

- Accept only **read-only** keys. At connection time, check the key's permissions and reject keys that allow trading, withdrawals, or transfers.
- Encrypt the key and secret at application level. Never show them again after saving.
- Disconnecting deletes the stored keys. Confirmed transactions are kept.
- Respect rate limits with backoff. Mark the integration as `error` when keys are revoked and ask the user to reconnect.

## 10. Counterparties

- Counterparties are the user's own records (name and notes).
- The app never sends them emails, WhatsApp messages, or SMS.
- Agreement summaries are shared by the user through the system share sheet.
- Notes about counterparties are never sent to an LLM.

## 11. Retention and deletion

| Data | Retention |
|---|---|
| Raw captured text | 30 days from receipt |
| Normalized transactions, drafts, loans, budgets, goals | Until the user deletes the account |
| Statement files | Until the import is deleted or the account is deleted |
| Exchange-rate history (shared, not personal) | Indefinitely |
| Manual rates (personal) | Until account deletion |
| Backups | 35 days |

**Account deletion:**

1. The user re-authenticates and may export their data first.
2. The system marks the account deleted, revokes sessions, removes push tokens, unlinks WhatsApp, and deletes Binance keys.
3. A 30-day grace period allows restoration. WhatsApp and Binance must be linked again after restoration.
4. After the grace period, a job permanently deletes all user data, audit entries, and stored files.
5. Backups age out within 35 days.

## 12. Abuse protection

- Rate limits per user and per IP, stricter on authentication and webhooks.
- Payload size limits. File uploads limited by type and size.
- Idempotency keys prevent replay of creating requests.
- Input validation at the edge. Parameterized queries only (EF Core).
- Generic error responses without stack traces.

## 13. Audit logging

- Record who changed what and when for transactions, loans, payments, accounts, budgets, integrations, and account lifecycle events.
- Audit entries store ids and field names, not secrets.
- Deleted with the account.

## 14. Secure development

- Follow OWASP ASVS level 2 as the target.
- Code review for every change. AI-generated code is reviewed like any other.
- Threat modeling for each new integration and for each new place that handles captured text.
- Dependency updates on a regular schedule.
- Security tests in CI: authorization tests (user A cannot read user B), webhook signature tests, idempotency and replay tests.
- Incident response plan: contact path, token and key rotation procedure, user notification process.

## 15. Store and compliance checklist

- [ ] Privacy policy and terms of use published and linked in the apps.
- [ ] Prominent disclosure before notification access.
- [ ] Data safety form (Google Play) and privacy labels (App Store) match the real behavior.
- [ ] Sign in with Apple offered on iOS.
- [ ] Account deletion available inside the app.
- [ ] Consent screens for optional processing, revocable in settings.
- [ ] Terms of use state that the app calculates and records loan terms and does not provide legal advice.
- [ ] Review of applicable privacy regulations in each launch country.
