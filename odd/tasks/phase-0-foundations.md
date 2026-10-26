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

- [ ] Task 1: Environment & Infrastructure Scaffolding — `.gitignore`, `infra/docker-compose.yml` (PostgreSQL), and `.github/workflows/ci.yml`.
- [ ] Task 2: Backend Solution & Project Structure — `backend/Billefy.sln`, `Directory.Build.props`, `BuildingBlocks`, `Api`, `Worker`, module contracts, and test project skeletons.
- [ ] Task 3: Core BuildingBlocks Implementation — `Money`, `Currency`, `IClock`, `SystemClock`, `Result<T>`, `Error`, and comprehensive unit tests with rounding vectors.
- [ ] Task 4: Architecture Tests — `Architecture.Tests` using `NetArchTest.Rules` verifying module isolation, no floats in money, and no raw `DateTime.Now`.
- [ ] Task 5: Mobile Scaffolding (KMP) — `mobile/` with Gradle configuration, `shared` module with decimal library, and standard tasks.
- [ ] Task 6: Web Scaffolding (Next.js) — `web/` with TypeScript strict, pnpm, linting, testing, and build scripts.
- [ ] Task 7: Tooling & Phase 0 Exit Verification — `tools/generate-clients.sh`, end-to-end CI build verification, and Phase 0 sign-off.

## Acceptance Criteria & Checks
1. `dotnet build backend/` succeeds with 0 warnings and 0 errors.
2. `dotnet test backend/` passes all unit and architecture tests.
3. Architecture tests block any direct reference between non-contract module projects and detect illegal floating-point usage.
4. `pnpm --dir web build` and `pnpm --dir web test` pass cleanly.
5. All tests run in CI workflow definition.

## Progress & Evidence
- Branch `feat/phase-0-foundations` created.

## Next Step
Implement Task 1: Environment & Infrastructure Scaffolding.
