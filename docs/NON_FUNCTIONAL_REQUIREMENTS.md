# Non-Functional Requirements

Quality targets for the Personal Finance Manager. Numbers are **initial targets** to be validated with measurements during the first phases; revise them when real data exists. Functional behavior is in [REQUIREMENTS.md](REQUIREMENTS.md).

## 1. Correctness and data integrity

| ID | Requirement | Target |
|---|---|---|
| NFR-INT-01 | Money uses exact decimal arithmetic end to end. | No `float` or `double` in money paths (APR display excepted) |
| NFR-INT-02 | The ledger is immutable; corrections are reversals. | 0 updates or deletes of transaction amounts |
| NFR-INT-03 | Retried requests, jobs, and webhooks do not create duplicates. | 100% of creating endpoints and webhooks are idempotent |
| NFR-INT-04 | Loan schedules match the reference vectors. | 100% pass on golden vectors, on server and any client implementation |
| NFR-INT-05 | Concurrent operations on the same user's data stay consistent. | Verified by concurrency tests (payments, draft confirmation, deduplication) |
| NFR-INT-06 | Every change to financial data is auditable. | Audit entry for each mutation |

## 2. Performance

| ID | Requirement | Target |
|---|---|---|
| NFR-PERF-01 | API read latency | p95 below 300 ms under normal load |
| NFR-PERF-02 | API write latency | p95 below 500 ms |
| NFR-PERF-03 | Dashboard load (cached) | Below 1 s on a mid-range phone and a typical mobile connection |
| NFR-PERF-04 | Dashboard load (uncached) | Below 2.5 s |
| NFR-PERF-05 | Draft appears after a notification arrives | Below 15 s end to end when online |
| NFR-PERF-06 | Loan simulation response | Below 300 ms per request |
| NFR-PERF-07 | App cold start | Below 2.5 s on a mid-range Android phone |

## 3. Availability and reliability

| ID | Requirement | Target |
|---|---|---|
| NFR-AVL-01 | Monthly availability of the API | 99.5% initially |
| NFR-AVL-02 | Recovery point objective | At most 15 minutes of data loss (continuous WAL archiving) |
| NFR-AVL-03 | Recovery time objective | At most 4 hours |
| NFR-AVL-04 | Degraded operation | The apps work offline for entry and viewing cached data; the bot, rates, and Binance may fail without affecting core features |
| NFR-AVL-05 | Backup restore drills | At least once per quarter |
| NFR-AVL-06 | Background jobs | Safe to run twice; failures retry with backoff; failures alert the team |

## 4. Scalability

| ID | Requirement | Target |
|---|---|---|
| NFR-SCL-01 | Initial capacity | A single VPS serves the first thousands of users |
| NFR-SCL-02 | Scale path | API and worker scale horizontally without code changes beyond a distributed cache |
| NFR-SCL-03 | Data growth | Transaction listing and dashboards stay within targets at 100,000 transactions per user through indexes and pagination |

## 5. Security

| ID | Requirement | Target |
|---|---|---|
| NFR-SEC-01 | Transport | TLS 1.2 or higher everywhere |
| NFR-SEC-02 | Secrets and integration keys | Encrypted at rest; never logged |
| NFR-SEC-03 | Sessions | Short-lived access tokens, rotating refresh tokens, revocation on sign-out and deletion |
| NFR-SEC-04 | Authorization | Every query filtered by the authenticated user |
| NFR-SEC-05 | Web and API hardening | Aligned with OWASP ASVS level 2 |
| NFR-SEC-06 | Abuse protection | Rate limits per user and IP; stricter on authentication and webhooks |
| NFR-SEC-07 | Dependencies | Automated vulnerability scanning in CI; critical findings block release |
| NFR-SEC-08 | Webhooks | Signature or shared-secret verification and replay protection |

Details: [SECURITY_AND_PRIVACY.md](SECURITY_AND_PRIVACY.md).

## 6. Privacy

| ID | Requirement | Target |
|---|---|---|
| NFR-PRV-01 | Non-financial notifications | Never transmitted or stored |
| NFR-PRV-02 | Raw captured text retention | Purged after 30 days |
| NFR-PRV-03 | LLM processing | Explicit, revocable consent; masked input; per-user daily cap |
| NFR-PRV-04 | Deletion | User data removed within 30 days of confirmed deletion request plus grace; backups expire within 35 days |
| NFR-PRV-05 | Logs | No personal or financial content; ids and codes only |
| NFR-PRV-06 | Third-party contact | None. Counterparties are never contacted |

## 7. Usability and accessibility

| ID | Requirement | Target |
|---|---|---|
| NFR-UX-01 | Quick entry | A common transaction can be registered in at most three taps from a template |
| NFR-UX-02 | Accessibility | WCAG 2.2 AA on web; platform accessibility guidelines on mobile |
| NFR-UX-03 | Clear states | Stale rates, offline queue, and pending drafts are always visible |
| NFR-UX-04 | Error messages | Plain language with a clear next step |

## 8. Localization

| ID | Requirement | Target |
|---|---|---|
| NFR-L10N-01 | Languages | Spanish (primary) and English |
| NFR-L10N-02 | Formatting | Locale-aware dates, numbers, and currency; decimal separators handled in input |
| NFR-L10N-03 | Time zones | Stored in UTC; displayed and scheduled in the user's time zone |

## 9. Compatibility

| ID | Requirement | Target |
|---|---|---|
| NFR-CMP-01 | Android | API level 26 (Android 8.0) or higher, to be confirmed against the market |
| NFR-CMP-02 | iOS | iOS 16 or higher, to be confirmed against the market |
| NFR-CMP-03 | Web | Current versions of Chrome, Safari, Firefox, and Edge |

## 10. Observability

| ID | Requirement | Target |
|---|---|---|
| NFR-OBS-01 | Logs | Structured, correlated, redacted |
| NFR-OBS-02 | Metrics | Latency, errors, job health, queue depth, rate freshness, draft and deduplication counts, bot failures |
| NFR-OBS-03 | Alerts | Stale rates, failing jobs, error-rate spikes, backup failures |

## 11. Maintainability

| ID | Requirement | Target |
|---|---|---|
| NFR-MNT-01 | Module boundaries | Enforced by architecture tests |
| NFR-MNT-02 | Test coverage | At least 95% branch coverage on money, loan, FX, and deduplication code; 80% elsewhere in the backend |
| NFR-MNT-03 | API contract | Generated and diffed in CI; clients regenerated automatically |
| NFR-MNT-04 | Documentation | Updated in the same pull request as the behavior change |
| NFR-MNT-05 | Replaceable integrations | Binance, WhatsApp, LLM, email, and push behind ports |

## 12. Cost

| ID | Requirement | Target |
|---|---|---|
| NFR-CST-01 | LLM usage | Rules first, LLM as fallback only, with per-user daily caps |
| NFR-CST-02 | Infrastructure | Start on a single VPS with managed object storage; no paid services that a PostgreSQL feature can replace |
| NFR-CST-03 | Messaging | Bot replies only to inbound messages, which keeps the official WhatsApp migration inexpensive |
