# Testing Strategy

How the Personal Finance Manager is tested. The most critical code handles money, duplicates, and private data, so it receives the strictest testing. Coverage targets are in [NON_FUNCTIONAL_REQUIREMENTS.md](NON_FUNCTIONAL_REQUIREMENTS.md).

## 1. Principles

1. **Tests are executable specifications.** Requirements in [REQUIREMENTS.md](REQUIREMENTS.md) map to tests.
2. **Money code gets the strongest tests.** Golden vectors, property-based tests, and boundary cases.
3. **Retries and concurrency are first-class scenarios.** Replay and race tests are required for anything idempotent.
4. **Tests use no real personal data.** Fixtures are synthetic or fully masked.
5. **A failing test is information.** Never delete or weaken a test to make a change pass.
6. **Bug fixes start with a failing test.**

## 2. Test pyramid

| Level | Scope | Tools (suggested) |
|---|---|---|
| Unit | Domain rules, value objects, calculators, parsers | xUnit, FluentAssertions |
| Property-based | Invariants of money and loans | FsCheck |
| Integration | Use cases with a real PostgreSQL, EF Core, Hangfire | Testcontainers |
| Contract | OpenAPI file and generated clients | OpenAPI diff in CI |
| Architecture | Module boundaries and layering | NetArchTest or ArchUnitNET |
| API | HTTP behavior, authorization, error format | WebApplicationFactory |
| Mobile unit | Shared KMP logic, outbox, detector | Kotlin test |
| Mobile UI | Key flows on Android | Compose UI tests |
| Web | Components and key flows | Vitest, Playwright |
| End to end | Critical journeys across clients and backend | Playwright, staging environment |

## 3. What must be covered

### 3.1 Money and ledger

- Golden vectors from [LOAN_ENGINE.md](LOAN_ENGINE.md), stored as JSON and used by the server and by any client engine.
- Property tests: principal portions sum to the principal; balances never go negative; final balance is exactly zero; interest is never negative; schedules are deterministic.
- Rounding boundaries: half-way values, currencies with different scales, the last installment adjustment.
- Ledger rules: no update or delete of transaction amounts; reversal restores the balance; transfers create two linked transactions; balance equals initial balance plus signed transactions.
- Rate snapshot: a transaction keeps the rate used at creation even after rates change.

### 3.2 Exchange rates

- Median calculation, filters (minimum amount, verified merchants), and sample size limits.
- The buy and sell reading rule (scenario 3.4 in the requirements), including valuation in both directions.
- Staleness flag and manual rate precedence.
- Adapter tests against recorded provider responses. A contract test fails loudly if the response shape changes.

### 3.3 Ingestion and deduplication

- Detector corpus: a set of masked, synthetic and real-shaped notifications in Spanish and English, covering income, expense, transfers, OTP codes, chat messages, and promotions. Each has an expected classification and expected extracted fields.
- Parsing rules and the LLM fallback (with a fake `ILlmClient`): masking, consent check, daily cap, and fallback to review drafts.
- Deduplication: same event retried; same movement from notification and statement; same amount and currency within the time window; different amounts that must not match.
- **Concurrency:** two jobs creating drafts for the same movement at the same time must produce one draft (advisory lock and unique partial index).
- Draft state machine: valid and invalid transitions; confirming twice with the same idempotency key returns the same transaction.
- Outbox: offline queue, retry order, and no duplicates after reconnect.

### 3.4 Lending

- All six templates against golden vectors.
- Late interest and grace days.
- Allocation order, partial payments, several overdue installments, and early payments for each policy and template compatibility.
- Rejection of a payment above the outstanding balance.
- Concurrent payments on the same loan (row lock).
- Lifecycle transitions and immutability after activation.
- Confirmation that no outbound message to counterparties exists in any code path.

### 3.5 Messaging (WhatsApp)

- Webhook replay: the same provider message id produces one effect.
- Linking flow, including a non-matching number and wrong confirmation text.
- Reply-only behavior: no outbound message without an inbound one.
- Gateway contract tests run against the unofficial adapter and a fake official adapter, so the port stays provider-neutral.
- Failure handling: send retries and a failed reply that does not undo a confirmed transaction.

### 3.6 Security

- Authorization: a user cannot read or change another user's data (test every endpoint with two users).
- Token validation: expired, wrong audience, tampered, and reused refresh tokens.
- Webhook signature verification and replay rejection.
- Input validation and size limits.
- Log redaction: tests that sensitive fields do not appear in logs.
- Account deletion: sessions revoked, keys deleted, purge job removes all user data and files.

### 3.7 Notifications

- Quiet hours and per-type preferences.
- Deduplication of repeated alerts.
- Invalid push tokens are removed.
- Reminders go only to the account owner.

### 3.8 Time and jobs

- A fake clock in all time-dependent tests (grace days, 30-day purges, reminders per time zone, month-end due dates, leap years, daylight-saving changes).
- Jobs are idempotent: running twice produces the same result.

## 4. Architecture tests

Run in CI and fail the build when:

- a module references another module's non-contract projects,
- the `Domain` layer depends on infrastructure or framework packages,
- code uses `double` or `float` in money types,
- code calls `DateTime.Now` or `DateTime.UtcNow` instead of `IClock`,
- code calls an LLM or WhatsApp provider outside its port.

## 5. Test data

- Synthetic or masked data only. No real names, account numbers, balances, or notification text.
- Builders for common entities (user, account, transaction, draft, loan).
- Golden files live next to the code they verify and are reviewed like code.
- The notification corpus is versioned; new real-world formats are added after masking.

## 6. Continuous integration

Every pull request runs:

1. Build and format checks.
2. Unit, property, architecture, and integration tests (PostgreSQL in a container).
3. OpenAPI generation and diff; generated clients compile.
4. Mobile shared tests and web tests.
5. Dependency vulnerability scan.
6. Coverage report with thresholds for money, loan, FX, and deduplication code.

Nightly or before release:

- End-to-end journeys on staging.
- Backup restore drill (quarterly).
- Load test of the dashboard and transaction list at 100,000 transactions per user.

## 7. Definition of done for tests

- New behavior is tested at the right level.
- Idempotent operations have replay tests; concurrent operations have race tests.
- No flaky tests are merged. A flaky test is fixed or removed with an explanation.
- Golden vectors still pass.
- Coverage thresholds hold.
