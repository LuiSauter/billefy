# Feature: Project READMEs, Environment Configuration, and Root Cleanup

## Context & Objectives
1. **Clean Root Directory:**
   - Remove root clutter requested by user: `/infra`, `/tools`, `dotnet-tools.json`, `env.example`, and `gradlew` (mobile has its own `mobile/gradlew` and `mobile/gradlew.bat`).
2. **Project-Specific READMEs:**
   - Each project (`backend/`, `web/`, `mobile/`) must have its own standalone `README.md`.
   - Each project README must include:
     - Brief summary of the project.
     - Prerequisites and tools required to build and run.
     - Exact commands for macOS, Linux, and Windows (PowerShell/CMD).
     - Environment variable configuration guide, ensuring nothing is hardcoded, with corresponding local `.env.example` / `env.example` files.
3. **Multi-OS Support:**
   - Clear distinction between POSIX shells (macOS / Linux) and Windows (PowerShell / Command Prompt).
4. **Verification & Quality:**
   - Update root `README.md` and verify all tests and builds pass.

## Tasks

- [x] Task 1: Root Cleanup — Remove `/infra`, `/tools`, `dotnet-tools.json`, `env.example`, and root `gradlew`.
- [x] Task 2: Backend README & Environment Setup — Create `backend/README.md` and `backend/env.example` detailing setup, environment variables, and run commands for macOS, Linux, and Windows.
- [x] Task 3: Web Frontend README & Environment Setup — Create `web/README.md` and `web/env.example` detailing Next.js setup, environment variables, and run commands for macOS, Linux, and Windows.
- [x] Task 4: Mobile KMP README & Configuration — Create `mobile/README.md` and `mobile/local.properties.example` detailing KMP, Android/iOS setup, environment/API configuration, and Gradle commands for macOS, Linux, and Windows.
- [x] Task 5: Root README Alignment & Full Suite Verification — Update root `README.md`, `.gitignore`, `AGENTS.md`, and CI workflow, then run full test suites across all projects.

## Acceptance Criteria & Checks
1. Root directory contains no `/infra`, `/tools`, `dotnet-tools.json`, `env.example`, or `gradlew`. (PASS)
2. `backend/README.md` contains project summary, prerequisites, multi-OS commands (macOS, Linux, Windows), and env configuration without hardcoded values. (PASS)
3. `web/README.md` contains project summary, prerequisites, multi-OS commands (macOS, Linux, Windows), and env configuration. (PASS)
4. `mobile/README.md` contains project summary, prerequisites, multi-OS commands (macOS, Linux, Windows), and env configuration. (PASS)
5. All builds and tests pass cleanly across backend (`dotnet test`), web (`pnpm test`, `pnpm build`), and mobile (`./mobile/gradlew -p mobile :shared:allTests`). (PASS)

## Progress & Evidence
- Branch `feat/project-readmes-and-root-cleanup` created.
- Commit `a3c2549`: Removed root `/infra`, `/tools`, `dotnet-tools.json`, `env.example`, and root `gradlew`.
- Commit `aea89b5`: Added `backend/README.md` and `backend/env.example` with multi-OS support.
- Commit `681fa5e`: Added `web/README.md` and `web/env.example` with multi-OS support.
- Commit `e0997e9`: Added `mobile/README.md` and `mobile/local.properties.example` with multi-OS support.
- Commit `HEAD`: Root README alignment, `.gitignore`, and full verification.
