# Task: Notifications Module & PDF Statement Ingestion

## Description
Finish developing the remaining functional features required by the Roadmap:
1. Complete the `Notifications` module across Domain, Application, and Infrastructure layers:
   - Device token registration for push notifications (Android, iOS, Web - NOT-05).
   - In-app notification history & logging.
   - Push and email gateways (with simulation for dev/test and extensible ports).
   - Budget threshold alerts (80% and 100% - NOT-03) and loan installment reminders (NOT-04).
   - REST API endpoints under `/api/v1/notifications`.
2. PDF Statement Ingestion (ING-12):
   - PDF/structured text statement parser supporting Bolivian bank formats.
   - Idempotent conversion into smart capture drafts.
   - REST API endpoint for PDF statement upload.
3. Mobile & Web Client Integration:
   - Wire device push registration to Mobile `App.kt` prominent disclosure workflow.
   - Add notification endpoints to Web `BillefyApiClient`.

## Tasks
- [ ] Task 1: Create Notifications Domain & Contracts
- [ ] Task 2: Create Notifications Application & Infrastructure layers
- [ ] Task 3: Implement Notification API Endpoints & integrate with Program.cs
- [ ] Task 4: Implement PDF Statement Parser & Ingestion in Ingestion module
- [ ] Task 5: Mobile & Web Client Integration (Push registration, API client methods)
- [ ] Task 6: Comprehensive Verification (Backend tests, Web tests/build, Mobile checks)
