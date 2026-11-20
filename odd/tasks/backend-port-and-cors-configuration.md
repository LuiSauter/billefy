# Feature: Backend Port & Configurable CORS Origins

## Context & Objectives
1. **Configurable Port:**
   - Clearly document and support configuring the backend hosting port via environment variables (`PORT`, `API_PORT`, or `ASPNETCORE_URLS`). Default: `http://localhost:5267`.
2. **Configurable CORS Allowed Origins:**
   - Implement CORS middleware in `Program.cs`.
   - Read allowed origins from `CORS_ALLOWED_ORIGINS` (comma-separated, e.g. `http://localhost:3000,http://127.0.0.1:3000`) or `Cors:AllowedOrigins` configuration array in `appsettings.json`.
   - Default to `["http://localhost:3000", "http://127.0.0.1:3000"]`.
3. **Environment Templates & Documentation:**
   - Update `backend/env.example`, `backend/README.md`, and `backend/src/Api/appsettings.json`.
4. **Automated Verification:**
   - Add integration test in `Api.Tests` verifying CORS headers on requests with `Origin: http://localhost:3000`.

## Tasks
- [x] Task 1: Implement CORS & Dynamic Port Resolution in `backend/src/Api/Program.cs` and `appsettings.json`.
- [x] Task 2: Add CORS automated test in `backend/tests/Api.Tests/ApiIntegrationTests.cs`.
- [x] Task 3: Update `backend/env.example` and `backend/README.md` with port and CORS documentation.
