# Feature: Phase 2 Android Notification Capture & Financial Detector

## Context & Objectives
Implement the on-device financial notification detector and Android capture flow as defined in `docs/REQUIREMENTS.md` (ING-01 to ING-05) and `docs/ARCHITECTURE.md` (Section 7.1).
Privacy & Non-Negotiable Rules:
- Rule 14: Non-financial notifications never leave the device and are never stored. Only notifications classified as financial by the on-device detector may be queued or uploaded.
- ING-01: On Android, the app shall read notifications after the user grants notification access, shown with a prominent disclosure screen.
- ING-02: Detect financial notifications on the device (an amount with a currency plus a financial keyword) regardless of the bank.

## Tasks

- [ ] Task 1: On-Device Financial Detector in Kotlin (KMP) — Create `FinancialNotificationDetector` in `mobile/shared/src/commonMain/kotlin` with parsing for BOB, USD, USDT, EUR, direction, and references.
- [ ] Task 2: Corpus Unit Tests for On-Device Detector — Write extensive positive/negative test corpus in `mobile/shared/src/commonTest/kotlin` verifying zero false positives on non-financial text.
- [ ] Task 3: Android NotificationListenerService & Privacy Guard — Implement `BillefyNotificationListenerService` in `androidMain`, registering it in `AndroidManifest.xml` with local filtering.
- [ ] Task 4: Prominent Disclosure UI Screen — Implement Compose Multiplatform disclosure screen explaining permission requirements, privacy boundaries, and deep link to system settings.
- [ ] Task 5: Mobile Verification & Build — Verify `./gradlew :shared:allTests` and `./gradlew :composeApp:assembleDebug`.

## Acceptance Criteria & Checks
1. Detector evaluates notification text locally: returns non-financial for personal chats, emails, promo notifications without amounts/keywords (verified by unit tests).
2. Detector extracts amount, currency, direction, and reference for valid bank notifications.
3. Android `NotificationListenerService` is registered with `android.permission.BIND_NOTIFICATION_LISTENER_SERVICE` in `AndroidManifest.xml`.
4. Prominent disclosure component explains privacy boundaries before redirecting to Android notification listener settings.
5. All mobile unit tests pass and debug APK compiles cleanly.

## Progress & Evidence
- Branch `feat/phase-2-android-notification-capture` created.

## Next Step
Implement Task 1: On-Device Financial Detector in Kotlin (KMP).
