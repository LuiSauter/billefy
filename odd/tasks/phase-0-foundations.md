# Feature: Phase 0 Foundations

## Objective
Establish a clean, verifiable, and deployable skeleton across backend, mobile, web, and infrastructure, enforcing architecture rules, building blocks, and CI from day one.

## Problem
Developing financial modules without foundational guardrails (money types, modular boundaries, immutable ledger abstractions, automated tests) leads to architectural drift, floating-point errors, and high rework costs.

## Why
Phase 0 of the roadmap guarantees that every subsequent functional phase (Core Ledger, Ingestion, Lending) builds on verified, deterministic building blocks with automated CI and strict boundary enforcement.

## Scope
- Git branch and project scaffolding for all three pillars: backend (.NET 10 / ASP.NET Core), mobile (KMP), and web (Next.js).
- Local infrastructure: Docker Compose for PostgreSQL 16 and testing services.
- Backend solution architecture: `Billefy.sln`, `BuildingBlocks`, module contracts, `Api` and `Worker` hosts.
- Core BuildingBlocks: `Money` value object with currency validation and rounding, `IClock` abstraction, `Result` monad, and RFC 9457 error models.
- Architecture tests using `NetArchTest` to forbid float/double in financial paths, enforce module contract isolation, and ban `DateTime.Now`.
- GitHub Actions CI pipeline running builds, tests, and formatting checks.
- Client generation tooling script (`tools/generate-clients.sh`).

## Constraints
- Zero floating-point arithmetic in money paths (`decimal` only).
- Warnings treated as errors in C# (`<TreatWarningsAsErrors>true</TreatWarningsAsErrors>`).
- English naming for all code, namespaces, commits, and logs.
- Dependencies point inward: `Domain` depends only on `BuildingBlocks`.

## Tasks

- [x] Task 1: Environment & Infrastructure Scaffolding — `.gitignore`, `infra/docker-compose.yml` (PostgreSQL), and `.github/workflows/ci.yml`.
- [x] Task 2: Backend Solution & Project Structure — `backend/Billefy.sln`, `Directory.Build.props`, `BuildingBlocks`, `Api`, `Worker`, module contracts, and test project skeletons.
- [x] Task 3: Core BuildingBlocks Implementation — `Money`, `Currency`, `IClock`, `SystemClock`, `Result<T>`, `Error`, and comprehensive unit tests with rounding vectors.
- [x] Task 4: Architecture Tests — `Architecture.Tests` using `NetArchTest.Rules` verifying module isolation, no floats in money, and no raw `DateTime.Now`.
- [x] Task 5: Mobile Scaffolding (KMP) — `mobile/` with Gradle configuration, `shared` module with decimal library, and standard tasks.
- [x] Task 6: Web Scaffolding (Next.js) — `web/` with TypeScript strict, pnpm, linting, testing, and build scripts.
- [x] Task 7: Tooling & Phase 0 Exit Verification — `tools/generate-clients.sh`, end-to-end CI build verification, and Phase 0 sign-off.

## Acceptance Criteria & Checks
1. `dotnet build backend/` succeeds with 0 warnings and 0 errors. (PASS)
2. `dotnet test backend/` passes all unit and architecture tests (19/19 tests passed). (PASS)
3. Architecture tests block any direct reference between non-contract module projects and detect illegal floating-point usage. (PASS)
4. `pnpm --dir web build` and `pnpm --dir web test` pass cleanly. (PASS)
5. `./gradlew :shared:allTests` and `:composeApp:assembleDebug` pass cleanly. (PASS)
6. All tests run in CI workflow definition. (PASS)

## Progress & Evidence
- Branch `feat/phase-0-foundations` created.
- Task 1 completed: `.gitignore`, `infra/docker-compose.yml`, `.github/workflows/ci.yml` (commit `80a80d7`).
- Task 2 completed: backend solution, Directory.Build.props, Api, Worker, 9 Module contracts, test projects (commit `f2b3176`).
- Task 3 completed: Money, Currency, IClock, Result, Error value objects with 15 passing unit tests (commit `8db7344`).
- Task 4 completed: NetArchTest enforcing module isolation and float bans in money paths (commit `b089580`).
- Task 5 completed: KMP mobile scaffold with bignum Money in shared and assembleDebug in composeApp (commit `ec91cc3`).
- Task 6 completed: Next.js 15 web scaffold with Decimal.js, strict TypeScript, Vitest, and ESLint (commit `d18b979`).
- Task 7 completed: generate-clients script, openapi contract, and all Phase 0 commands verified end-to-end (commit `ad17a30`).

## Next Step
Phase 0 complete. Ready for code review / merge into main and starting Phase 1 (Core Ledger).
