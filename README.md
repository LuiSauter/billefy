# Personal Finance Manager

> Working title. The product name is still to be defined.

A multi-currency personal finance app for people whose money is scattered across banks, digital wallets, and crypto exchanges. It consolidates balances, captures income and expenses semi-automatically (always asking the user to confirm), manages money lent and borrowed with simple or compound interest, and teaches users how to distribute their income to build financial health.

**Status:** Phases 0 through 5 implemented and passing all tests across Backend (ASP.NET Core .NET 10), Mobile (KMP Compose), and Web (Next.js 15 Clean Architecture).

## Environment Variables & Configuration

All secrets and provider credentials are configured via environment variables (or `.env` file from `env.example`).

### Configuration Block (`bash`)

```bash
# ==============================================================================
# Billefy - Required Environment Variables
# Copy env.example to .env and configure your secrets:
# ==============================================================================

# Database (PostgreSQL)
export ConnectionStrings__PostgreSQL="Host=localhost;Port=5432;Database=billefy;Username=billefy_user;Password=billefy_secret"

# ASP.NET Core Runtime
export ASPNETCORE_ENVIRONMENT="Development"
export ASPNETCORE_URLS="http://+:5000"

# WhatsApp Messaging Gateway Provider
# Options: "Devhooh" (Third-party WhatsApp API), "Meta" (Official Cloud API), or "Simulated" (default in-memory)
export WhatsApp__Provider="Devhooh"

# 1. Devhooh WhatsApp API Configuration (https://api-whp.devhooh.com)
export WhatsApp__Devhooh__BaseUrl="https://api-whp.devhooh.com"
export WhatsApp__Devhooh__ApiKey="wasa_live_TU_API_KEY_AQUI"

# 2. Meta Official WhatsApp Business Cloud API Configuration
export WhatsApp__Meta__ApiVersion="v21.0"
export WhatsApp__Meta__PhoneNumberId="TU_META_PHONE_NUMBER_ID"
export WhatsApp__Meta__AccessToken="TU_META_ACCESS_TOKEN"

# Binance Read-Only Integration
# Note: Keys with trading or withdrawal permissions are strictly rejected by security policy (Rule 18)
export Binance__ApiKey="TU_BINANCE_READ_ONLY_API_KEY"
export Binance__ApiSecret="TU_BINANCE_API_SECRET"

# Parallel Exchange Rate Source (DolarApi Binance P2P)
export Fx__RateSourceUrl="https://bo.dolarapi.com/v1/dolares/binance"

# Web Frontend (Next.js)
export NEXT_PUBLIC_API_URL="http://localhost:5000"
```

## Running the Project

```bash
# 1. Start Infrastructure (PostgreSQL)
docker compose -f infra/docker-compose.yml up -d

# 2. Run Backend API
dotnet run --project backend/src/Api/Api.csproj

# 3. Run Web Dashboard (Next.js)
pnpm --dir web install
pnpm --dir web dev
```

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
