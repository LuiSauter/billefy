# Personal Finance Manager (Billefy)

> Working title. The product name is still to be defined.

A multi-currency personal finance app for people whose money is scattered across banks, digital wallets, and crypto exchanges. It consolidates balances, captures income and expenses semi-automatically (always asking the user to confirm), manages money lent and borrowed with simple or compound interest, and teaches users how to distribute their income to build financial health.

**Status:** Phases 0 through 5 implemented and passing all tests across Backend (ASP.NET Core .NET 10), Mobile (KMP Compose), and Web (Next.js 15 Clean Architecture).

---

## Subprojects & Standalone Guides

Each project contains its own self-contained guide, prerequisites, commands for macOS, Linux, and Windows, and environment variable configuration without hardcoded values:

| Subproject | Description | Documentation |
|---|---|---|
| **Backend** | ASP.NET Core .NET 10 Modular Monolith on PostgreSQL (Clean Architecture) | [backend/README.md](backend/README.md) |
| **Web** | Next.js 15 App Router, TypeScript, Tailwind CSS (Clean Architecture) | [web/README.md](web/README.md) |
| **Mobile** | Kotlin Multiplatform (KMP) & Compose Multiplatform (Android & iOS) | [mobile/README.md](mobile/README.md) |

---

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
| Web | Next.js 15, TypeScript, Tailwind CSS, Radix UI / shadcn |
| Backend | ASP.NET Core (C# .NET 10), modular monolith |
| Database | PostgreSQL 16+ (data and background job queue) |
| Background jobs | Hangfire with PostgreSQL storage |
| Object storage | S3-compatible (statements, backups) |
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

## Repository layout

```text
.
├── AGENTS.md
├── README.md
├── docs/             # Technical specifications, architecture, and diagrams
├── backend/          # ASP.NET Core solution (API, Worker, Modules, Tests)
├── mobile/           # Kotlin Multiplatform (shared, composeApp)
└── web/              # Next.js application (Clean Architecture)
```

## Contributing

Read [AGENTS.md](AGENTS.md) first. It applies to human contributors and AI agents alike.

## License

To be defined.
