# Functional Requirements

This document lists what the Personal Finance Manager must do. Quality targets are in [NON_FUNCTIONAL_REQUIREMENTS.md](NON_FUNCTIONAL_REQUIREMENTS.md). Delivery order is in [ROADMAP.md](ROADMAP.md).

## 1. Scope

### 1.1 Product vision

Help people whose money is spread across banks, digital wallets, cash, and crypto exchanges to see everything in one place, record movements with little effort, manage money lent and borrowed, and learn to distribute their income for financial health. The app is a public product for individual users.

### 1.2 In scope

- Android, iOS, and web applications.
- Multi-currency accounts in local currency and US dollars (plus exchange assets such as USDT).
- Manual and semi-automatic capture of movements, always confirmed by the user.
- Parallel-market exchange rates from Binance P2P.
- Loans and debts with interest, schedules, payments, and late interest.
- Budgets, goals, dashboards, forecasts, alerts, and recommendations.
- Push and email notifications.
- A WhatsApp bot for quick registration.

### 1.3 Out of scope

- Direct bank connections, bank APIs, or scraping bank apps.
- Moving real money, payments, or trading (the app only records and calculates).
- Official exchange rates.
- Contacting counterparties (people who owe or are owed money and are not app users).
- Reading notifications on iOS (not possible on the platform).
- Legal advice, interest-rate limits, or contract enforcement. The user chooses the terms and is responsible for them; the counterparty is responsible for accepting them.
- Shared or multi-user accounts in the first releases (the data model is prepared for them).

### 1.4 Actors

| Actor | Description |
|---|---|
| User | The account owner who uses the app |
| Counterparty | A person who owes or is owed money by the user. Not an actor in the system; only a record |
| Identity provider | Google or Apple |
| Exchange | Binance (rates and optional read-only account data) |
| Messaging provider | WhatsApp provider |
| Notification services | Push and email delivery |

### 1.5 Priority and phase

| Phase | Theme |
|---|---|
| 1 | Core ledger (MVP) |
| 2 | Smart capture and iOS |
| 3 | Lending |
| 4 | Planning and insights |
| 5 | Integrations and AI |
| 6 | Growth (multi-user and more) |

Each requirement lists the phase that delivers it. "The system shall" means mandatory for that phase.

## 2. Functional requirements

### 2.1 Authentication and profile (AUTH)

| ID | Requirement | Phase |
|---|---|---|
| AUTH-01 | The system shall let users sign in with Google on Android, iOS, and web. | 1 |
| AUTH-02 | The system shall offer Sign in with Apple on iOS, as required by the store. | 2 |
| AUTH-03 | The system shall use short-lived access tokens and rotating refresh tokens, and let users sign out and revoke sessions. | 1 |
| AUTH-04 | During onboarding, before creating the first account, the user shall choose the currency they use. The list shall show which currencies have a parallel-market exchange rate available. | 1 |
| AUTH-05 | The system shall register the device for push notifications when the user allows them. | 1 |
| AUTH-06 | The user shall be able to delete their account after re-authenticating. Deletion has a 30-day grace period in which the user can restore it, then all data is permanently removed. | 1 |
| AUTH-07 | The user shall be able to export their data before deleting the account. | 4 |
| AUTH-08 | The system shall support shared workspaces with several users. | 6 |

### 2.2 Accounts (ACC)

| ID | Requirement | Phase |
|---|---|---|
| ACC-01 | The user shall create accounts of type bank, wallet, cash, or exchange, with a name, a currency, and an initial balance. | 1 |
| ACC-02 | Each account shall have exactly one currency. The currency cannot change once the account has transactions. | 1 |
| ACC-03 | The system shall show each account's balance, calculated from the initial balance and its transactions. | 1 |
| ACC-04 | The system shall show a consolidated total in the user's view currency, converting with the parallel-market rate rule (see FX-02). | 1 |
| ACC-05 | The user shall archive accounts. Accounts with transactions cannot be deleted. | 1 |
| ACC-06 | The user shall be able to reconcile an account by entering the real balance; the system records an adjustment transaction for the difference. | 2 |

### 2.3 Transactions (TXN)

| ID | Requirement | Phase |
|---|---|---|
| TXN-01 | The user shall register an income or expense with account, amount, date, category, and description, in as few taps as possible. | 1 |
| TXN-02 | The user shall save transaction templates (for example, a usual taxi fare) and create a transaction from a template. | 1 |
| TXN-03 | The user shall register transfers between their own accounts, including between currencies, as two linked transactions. For new transfers and transfer corrections, the source amount shall not exceed the source account's current derived balance; an exact-balance transfer is allowed. This restriction applies only to transfers and does not prohibit ordinary expenses, reconciliations, or existing negative balances. | 1 |
| TXN-04 | The system shall provide default categories and let users create, rename, and nest their own. | 1 |
| TXN-05 | Transactions shall be immutable. The user corrects or removes a transaction through a reversal transaction. The interface presents this as editing or deleting. | 1 |
| TXN-06 | Each transaction shall store the exchange-rate snapshot used when it was created. | 1 |
| TXN-07 | The user shall search, filter, and page through transactions by date, account, category, amount, and source. | 1 |
| TXN-08 | The mobile apps shall let users register transactions offline and sync them later without duplicates. | 1 |
| TXN-09 | The user shall define recurring transactions (for example, a monthly salary). | 4 |

### 2.4 Capture and ingestion (ING)

| ID | Requirement | Phase |
|---|---|---|
| ING-01 | On Android, the app shall read notifications after the user grants notification access, shown with a prominent disclosure screen. | 2 |
| ING-02 | The app shall detect financial notifications on the device (an amount with a currency plus a financial keyword) regardless of the bank. | 2 |
| ING-03 | Notifications that are not financial shall never leave the device and shall not be stored. | 2 |
| ING-04 | The first time an app produces a financial-looking notification, the app shall ask the user whether it is a financial source and remember the answer. | 2 |
| ING-05 | Every automatic capture shall create a draft. No automatic capture shall create a transaction without user confirmation. | 2 |
| ING-06 | The system shall parse drafts with rules and, only with the user's consent, fall back to an LLM using masked text. Unparseable items shall become drafts in review state with the original text. | 2 |
| ING-07 | The system shall deduplicate captures: retries of the same event (technical) and the same movement arriving through several channels (logical). | 2 |
| ING-08 | The system shall suggest an account and a category for each draft. | 2 |
| ING-09 | The user shall review drafts in an inbox: confirm, edit before confirming, discard, link two drafts as a transfer, and confirm several at once. | 2 |
| ING-10 | Discarded drafts shall keep their fingerprint so the same movement does not reappear. | 2 |
| ING-11 | The user shall import statements as CSV, with a preview and column mapping. A repeated file shall trigger a warning. | 2 |
| ING-12 | The user shall import statements as PDF. | 5 |
| ING-13 | The system shall purge the raw text of captured events 30 days after receipt while keeping the normalized fields. | 2 |
| ING-14 | The user shall connect Binance with a read-only API key. The system shall reject keys that allow trading or withdrawals. | 5 |
| ING-15 | Binance sync shall create drafts for deposits, withdrawals, and P2P orders, and an adjustment draft when balances differ. | 5 |
| ING-16 | On iOS, where notifications cannot be read, the app shall offer the WhatsApp bot, quick entry, templates, and statement import as alternatives, and say so clearly. | 2 |

### 2.5 Exchange rates (FX)

| ID | Requirement | Phase |
|---|---|---|
| FX-01 | The system shall obtain parallel-market rates from Binance P2P and shall never use official rates. | 1 |
| FX-02 | A user holding local currency shall see the **buy** rate; a user holding US dollars shall see the **sell** rate. Valuing local currency in dollars uses buy; valuing dollars in local currency uses sell. | 1 |
| FX-03 | The rate shall be computed as the median of the first 10 to 20 ads after filtering by minimum amount and verified merchants, refreshed every few minutes. | 1 |
| FX-04 | The app shall show the source and last update time of every rate and warn when it is stale. | 1 |
| FX-05 | Currencies without a parallel-market rate shall be marked as not having a live rate, and their amounts shall be shown unconverted. | 1 |
| FX-06 | The user shall be able to enter a manual rate as a fallback. | 1 |
| FX-07 | The system shall store the history of rates. | 1 |

### 2.6 Loans and debts (LOAN)

| ID | Requirement | Phase |
|---|---|---|
| LOAN-01 | The user shall register money lent and money borrowed, linked to a counterparty record (name and notes). | 3 |
| LOAN-02 | The user shall choose a template: no interest, flat interest on initial capital, simple interest on balance (fixed principal), fixed installment (compound on balance), interest-only, or single payment with compound interest. | 3 |
| LOAN-03 | The user shall set the parameters: rate and its unit (monthly or annual), day-count basis, frequency, capitalization, number of installments, disbursement date, grace days, late-interest rate, payment allocation order, and early-payment policy. Defaults shall be realistic. | 3 |
| LOAN-04 | The app shall simulate the loan while the user edits parameters, showing the installment, total interest, and the effective annual rate (TEA), before saving. | 3 |
| LOAN-05 | The server shall generate and store the schedule. Clients shall not persist their own calculations. | 3 |
| LOAN-06 | The user shall register payments. The system shall allocate each payment to late interest, interest, and principal in the configured order, and handle partial and early payments. | 3 |
| LOAN-07 | The system shall calculate late interest after the grace days according to the configured policy. | 3 |
| LOAN-08 | Loans shall follow the lifecycle: pending acceptance, active, in arrears, paid, forgiven, or canceled. | 3 |
| LOAN-09 | The user shall manually record the counterparty's acceptance (date and optional note). | 3 |
| LOAN-10 | The user shall generate an agreement summary (text or PDF) and share it with the system share sheet. The app shall not send it. | 3 |
| LOAN-11 | The system shall remind the **user** of upcoming and overdue installments. It shall not notify counterparties. | 3 |
| LOAN-12 | The user shall forgive a loan's remaining balance. | 3 |
| LOAN-13 | Loan terms shall be immutable after activation. Changes require a new loan (refinancing). | 3 |
| LOAN-14 | A payment or disbursement shall optionally create the matching transaction in the chosen account. | 3 |
| LOAN-15 | The system shall show money owed to the user and money the user owes, with balances and next due dates. | 3 |

### 2.7 Budgets, goals, and financial health (BUD)

| ID | Requirement | Phase |
|---|---|---|
| BUD-01 | The user shall define monthly budgets per category or overall, with a limit, a currency, and alert thresholds (default 80% and 100%). | 4 |
| BUD-02 | The system shall suggest a budget limit from the user's recent history and show the 50/30/20 split as a reference. | 4 |
| BUD-03 | The user shall define goals with a target amount, optional date, and an associated account. The system shall show progress and the monthly contribution needed. | 4 |
| BUD-04 | The system shall show financial-health indicators: savings rate, emergency-fund coverage in months, and debt load. | 4 |
| BUD-05 | When income is registered, the system shall offer an income-distribution proposal (needs, wants, savings, debt payments) that the user can adjust. | 5 |
| BUD-06 | Budgets in a currency different from their transactions shall convert using the exchange-rate rule. | 4 |

### 2.8 Dashboards and reports (DASH)

| ID | Requirement | Phase |
|---|---|---|
| DASH-01 | The app shall show a period summary: income, expenses, net result, balances by account and currency, budgets, goals, and debts. | 1 (basic), 4 (full) |
| DASH-02 | The app shall show charts: spending by category, income versus expenses over time, and net worth. | 4 |
| DASH-03 | The system shall forecast the end-of-month result using moving averages and recurring transactions. | 4 |
| DASH-04 | The user shall opt in to AI recommendations. The system shall send only aggregated indicators, never descriptions or counterparty names. | 5 |
| DASH-05 | The user shall export reports as CSV or PDF. | 4 |

### 2.9 Notifications (NOT)

| ID | Requirement | Phase |
|---|---|---|
| NOT-01 | The system shall send push notifications to Android, iOS, and web. | 1 |
| NOT-02 | The system shall send emails for the same events. | 1 |
| NOT-03 | The user shall configure notification types per channel and quiet hours. | 1 |
| NOT-04 | Notification types shall include: new drafts, budget threshold or excess, installment due soon or overdue, import finished, Binance connection problem, and monthly summary. | 2 to 5 |
| NOT-05 | The system shall not send duplicate alerts for the same condition, and shall group bursts of drafts into one notice. | 2 |
| NOT-06 | Tapping a notification shall open the related screen. | 1 |

### 2.10 WhatsApp bot (BOT)

| ID | Requirement | Phase |
|---|---|---|
| BOT-01 | The user shall enter their WhatsApp number in the app and confirm it by sending the confirmation text to the bot. | 5 |
| BOT-02 | The bot shall only reply to messages the user sends and shall never start a conversation. | 5 |
| BOT-03 | The bot shall send plain text only. | 5 |
| BOT-04 | The user shall register expenses and income by text. The bot shall create a draft, show a summary, and wait for the user to confirm by replying. | 5 |
| BOT-05 | The user shall register money lent or borrowed by text. | 5 |
| BOT-06 | The bot shall answer simple queries such as the balance of an account. | 5 |
| BOT-07 | The system shall ignore repeated deliveries of the same inbound message. | 5 |
| BOT-08 | The messaging provider shall be replaceable without changes outside the adapter. | 5 |
| BOT-09 | The user shall unlink their number at any time. | 5 |

### 2.11 Platform (PLAT)

| ID | Requirement | Phase |
|---|---|---|
| PLAT-01 | The apps shall be localized in Spanish and English, with correct currency formatting and time zones. | 1 |
| PLAT-02 | The system shall keep an audit log of changes to financial data. | 1 |
| PLAT-03 | The app shall show a privacy policy and request consent for optional processing (LLM use, notification access). | 1 |
| PLAT-04 | Consent for LLM processing shall be revocable at any time in settings. | 2 |
| PLAT-05 | The web app shall provide the same core functions as mobile except notification capture. | 1 |

## 3. Key acceptance scenarios

### 3.1 Duplicate prevention

```gherkin
Given a bank notification arrived and became a pending draft
When the same movement arrives again through a statement import
Then no new draft is created
And the import row is linked to the existing draft as an additional source
```

### 3.2 Draft confirmation

```gherkin
Given a pending draft of 150 BOB income
When the user confirms it choosing an account in BOB
Then one transaction is created with the exchange-rate snapshot
And the draft becomes confirmed
And confirming again with the same idempotency key returns the same transaction
```

### 3.3 Notification privacy

```gherkin
Given a notification from a chat app that contains no amount and no financial keyword
When it arrives on the device
Then it is discarded locally
And no network request carries its content
```

### 3.4 Exchange-rate rule

```gherkin
Given the latest buy rate is 9.50 and the latest sell rate is 9.30 (local currency per US dollar)
When a user with local-currency accounts views the dollar rate
Then the app shows 9.50 with its source and update time
When a user with a US-dollar account views the local-currency value of it
Then the app uses 9.30
```

### 3.5 Loan payment allocation

```gherkin
Given an active loan with an overdue installment past its grace days
When the user registers a payment smaller than the overdue total
Then the payment is applied first to late interest, then to interest, then to principal
And the installment becomes partially paid
And the loan remains in arrears
```

### 3.6 Bot behavior

```gherkin
Given a linked WhatsApp number
When the user sends "spent 50 on a taxi"
Then the bot replies with a summary and options to confirm or cancel
And no transaction exists until the user confirms
Given no message from the user
Then the bot never sends a message
```

### 3.7 Counterparty privacy

```gherkin
Given a loan with a counterparty who is not an app user
When an installment becomes due
Then only the account owner is notified
And no message of any kind is sent to the counterparty
```

## 4. Assumptions

- The user's local currency is chosen at onboarding. The first launch market uses Bolivian bolivianos (BOB) and US dollars; other markets depend on Binance P2P support.
- USDT is treated as a proxy for US dollars in rate calculations.
- Android and the web ship first; iOS follows once the shared code and Sign in with Apple are ready.
- Spanish is the primary interface language.

## 5. Open questions

- Product name and branding.
- Monetization and subscription plans.
- Launch countries and currencies beyond BOB and USD.
- Exact Binance P2P filters (payment methods, minimum amounts, merchant requirements).
- Privacy policy and terms of service wording, and any review required by app stores.
- Whether to materialize account balances once transaction volume grows.
