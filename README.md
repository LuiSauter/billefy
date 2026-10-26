# Personal Finance Manager

> Working title. The product name is still to be defined.

A multi-currency personal finance app for people whose money is scattered across banks, digital wallets, and crypto exchanges. It consolidates balances, captures income and expenses semi-automatically (always asking the user to confirm), manages money lent and borrowed with simple or compound interest, and teaches users how to distribute their income to build financial health.

**Status:** design phase. No application code exists yet. This repository currently holds the product, architecture, and design documentation that will guide implementation.

## What it does

- **Consolidates** accounts, wallets, cash, and exchange balances in one place, in local currency and US dollars.
- **Captures movements** from Android notifications, WhatsApp messages, bank statements (CSV/PDF), and Binance. Everything automatic becomes a **draft** that the user confirms.
- **Uses the parallel-market exchange rate** (Binance P2P), never the official rate, with a buy/sell rule that depends on the currency the user holds.
- **Manages loans and debts** with realistic templates (no interest, flat, declining balance, fixed installment, interest-only, single payment with compound interest), schedules, late interest, and payment allocation.
- **Plans money**: budgets, goals, alerts, dashboards, forecasts, and recommendations.
- **Notifies** through push (mobile and web) and email.
- **Chats** through a WhatsApp bot that only answers messages the user starts.

## Tech stack

| Area | Technology |
|---|---|
| Mobile (Android and iOS) | Kotlin Multiplatform, Compose Multiplatform, thin SwiftUI host for iOS |
| Web | Next.js |
| Backend | ASP.NET Core (C#), modular monolith |
| Database | PostgreSQL (data and background job queue) |
| Background jobs | Hangfire with PostgreSQL storage |
| Object storage | S3-compatible (statements, backups) |
| Deployment | Docker on a VPS with Coolify and Traefik |
| Sign-in | Google (and Sign in with Apple on iOS) |

## Documentation

| Document | Purpose |
|---|---|
| [AGENTS.md](AGENTS.md) | Rules and conventions for AI coding agents and contributors |
| [docs/REQUIREMENTS.md](docs/REQUIREMENTS.md) | Functional requirements |
| [docs/NON_FUNCTIONAL_REQUIREMENTS.md](docs/NON_FUNCTIONAL_REQUIREMENTS.md) | Quality targets |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | System architecture |
| [docs/DECISIONS.md](docs/DECISIONS.md) | Architecture decision records |
| [docs/LOAN_ENGINE.md](docs/LOAN_ENGINE.md) | Loan calculation specification with test vectors |
| [docs/SECURITY_AND_PRIVACY.md](docs/SECURITY_AND_PRIVACY.md) | Security and privacy design |
| [docs/TESTING.md](docs/TESTING.md) | Testing strategy |
| [docs/ROADMAP.md](docs/ROADMAP.md) | Delivery phases |
| [docs/DOMAIN_GLOSSARY.md](docs/DOMAIN_GLOSSARY.md) | Shared vocabulary and naming map |
| [docs/diagrams/](docs/diagrams/) | PlantUML diagrams (UML 2.5) |

## Planned repository layout

```text
.
├── AGENTS.md
├── README.md
├── docs/
│   ├── diagrams/
│   └── ...
├── backend/          # ASP.NET Core solution (API, Worker, Modules, tests)
├── mobile/           # Kotlin Multiplatform (shared, composeApp, iosApp)
├── web/              # Next.js application
└── infra/            # Docker, Coolify, and deployment configuration
```

## Getting started

Setup instructions will be added in Phase 0 of the [roadmap](docs/ROADMAP.md), together with the scaffolding for each project.

## Contributing

Read [AGENTS.md](AGENTS.md) first. It applies to human contributors and AI agents alike.

## License

To be defined.
