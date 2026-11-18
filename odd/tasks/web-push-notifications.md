# Web Push notifications for Workspaces

Native browser push (Web Push API + VAPID), triggered by workspace invitation
and activity events. New general-purpose infrastructure in the Notifications
module, wired to Workspaces only for now.

## Specs

- S1. The browser asks for notification permission once, right after a successful login (password, Google, or session restore on app mount), not gated behind visiting any specific section.
- S2. Granting permission subscribes the browser via the Web Push API (`PushManager.subscribe`) using a VAPID public key, and persists that subscription (`endpoint`, `p256dh`, `auth`) on the backend, associated with the current user.
- S3. Declining or dismissing the permission prompt must not block or degrade any other app functionality; the app works fully without push.
- S4. The following events each send a real push notification, via the user's web push subscription(s), to every *other* active member of the workspace (never to the actor who caused the event):
  - S4a. A workspace invitation is created (`WorkspaceService.InviteAsync`) — notify the invited user's own account too, if they already have a Billefy account with that email and an active subscription, in addition to the existing invitation email.
  - S4b. An invitation is accepted (`WorkspaceService.AcceptAsync`) — notify the workspace's other active members (there is no single "inviter" stored on `WorkspaceInvitation`, so this matches the existing fan-out pattern already used for expense/income/settlement).
  - S4c. A shared expense or income is registered (`WorkspaceExpenseService.RegisterAsync`, `WorkspaceIncomeService.RegisterAsync`).
  - S4d. A settlement is registered (`WorkspaceBalanceService.SettleAsync`).
- S5. Push delivery is best-effort: a failed or absent push subscription must never fail the underlying write (invitation, accept, expense, income, settlement). This mirrors the existing best-effort email pattern in `WorkspaceService.SendInvitationEmailAsync`.
- S6. A dead/expired push subscription (410 Gone or 404 from the push service) is removed from storage so it is not retried forever.
- S7. New env vars (`VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` on the backend; `NEXT_PUBLIC_VAPID_PUBLIC_KEY` on the web) are documented in both `env.example` and `README.md` for backend and web, per AGENTS.md rule 14.
- S8. This is new infrastructure in the Notifications module (a new `WebPushSubscription` entity and gateway), parallel to and independent of the existing mobile `DeviceToken`/`IPushGateway` (FCM/APNs simulated gateway) — neither replaces the other.

## Tasks

- [ ] T1 — Backend domain: `WebPushSubscription` entity (`Notifications.Domain`), EF configuration + migration, repository port + implementation. Spec: S2, S6, S8. Route: inline.
- [x] T2 — Backend application: extend `INotificationsModule` with `SubscribeWebPushAsync`/`UnsubscribeWebPushAsync`; extend `SendPushNotificationAsync` to fan out to web push subscriptions (alongside existing mobile device tokens), removing subscriptions that come back 404/410. Subscribing an endpoint already owned by another user reassigns it (remove + add in one unit of work) instead of conflict-failing; unsubscribing someone else's/unknown endpoint is a no-op success. Spec: S2, S5, S6. Route: inline, test-first.
- [x] T3 — Backend infrastructure: real `IWebPushGateway` (`VapidWebPushGateway`) using the `WebPush` NuGet package (1.0.13) and VAPID keys from configuration (`VapidOptions`); registered in DI alongside (not replacing) the simulated mobile gateway. Maps `WebPushException` with status 410/404 to `WebPushSendResult.SubscriptionExpired`, anything else to `Failed`. Spec: S7, S8. Route: inline.
- [x] T4 — Backend API: `POST /v1/notifications/web-push/subscribe` (body `SubscribeWebPushRequest`) and `DELETE /v1/notifications/web-push/subscribe?endpoint=<url-encoded endpoint>` (query string, no body) endpoints, both also under `/api/v1/...`; 200 on success, 401 unauthenticated, 400 invalid subscription. Spec: S2. Route: inline, test-first.
- [x] T5 — Backend: wire the triggers S4b-S4d into `WorkspaceService.AcceptAsync`, `WorkspaceExpenseService.RegisterAsync`, `WorkspaceIncomeService.RegisterAsync`, `WorkspaceBalanceService.SettleAsync`, each calling `INotificationsModule` best-effort (shared `WorkspaceAccess.NotifyOtherMembersAsync`, after the write committed, never the acting user, no push on idempotent replays) for the other active members' `UserId`s. **S4a is NOT implemented** (gap, see L4): `WorkspaceService.InviteAsync` still only sends the existing invitation email. Spec: S4, S5. Route: inline, test-first.
- [ ] T6 — Web: service worker (`public/sw.js`) handling `push` and `notificationclick`; registered on app mount. Spec: S1, S2. Route: inline.
- [ ] T7 — Web: permission-and-subscribe flow hooked to successful login (all 3 paths: password, Google, session restore), calling the new subscribe endpoint. Spec: S1, S2, S3. Route: inline, test-first.
- [ ] T8 — Document `VAPID_PUBLIC_KEY`/`VAPID_PRIVATE_KEY`/`VAPID_SUBJECT`/`NEXT_PUBLIC_VAPID_PUBLIC_KEY` in both env templates and both READMEs; generate and report the actual VAPID keypair for local testing. Spec: S7. Route: inline.
- [ ] T9 — Full backend + web suite run, manual two-browser end-to-end verification (invite, accept, register expense/income, settle — confirm real OS-level push notifications appear), close out.

## Log

- L1 (verbatim): "El backend y frontend estan levantados, revisalo. puedes abrir dos navegadores cada uno con una cuenta diferente, uno de ellos invita a la otra persona para hacer pruebas, a la otra persona le deberia llegar una notificacion push nativa del navegador de la invitacion y al aceptar lo mismo al otro usuario le deberia llegar notificaciones de usuario que aceptaron su invitacion. todo en tiempo real, hazlo por favor!"
- L2: Confirmed via `ask_user_choice` — no Web Push infra exists today (only a simulated mobile push gateway); user chose to build Web Push now rather than test existing-only behavior.
- L3: Confirmed via `ask_user_question` — events: invitation received, invitation accepted, expense/income registered, settlement registered. Permission prompt: right after login. Scope: general-purpose Web Push infrastructure + Workspaces wiring.
- L4: S4a gap — pushing the invited person's own account requires resolving a Billefy user id from the invited email. `IIdentityModule` only exposes `GetCurrentUserAsync(Guid userId)` (id → profile); there is no email → user lookup anywhere in `Identity.Contracts`. Adding one is new cross-module contract surface, out of scope for this pass, so `InviteAsync` keeps only the existing best-effort invitation email and no push to the invitee. Follow-up: add an email lookup to `Identity.Contracts` (e.g. `FindUserIdByEmailAsync`), then call `INotificationsModule.SendPushNotificationAsync` best-effort after `SendInvitationEmailAsync`. Same pattern as T6 in `shared-workspaces-hardening.md`.
- L5: Push bodies for expense/income/settlement do not include the actor's display name (only `WorkspaceAccess`/`ILedgerModule` are available in those services; resolving names would add an `IIdentityModule` dependency). They include description, amount+currency and workspace name. The accept push (S4b) does include the acceptor's `FullName` (falls back to email) since `WorkspaceService` already has `IIdentityModule`.
- L6: `DELETE /v1/notifications/web-push/subscribe` takes the endpoint as a `?endpoint=` query parameter (not a JSON body) — the web client (T7) must `encodeURIComponent` it. `docs/openapi.json` was not regenerated (outside the allowed edit surface for this task; parent should regenerate for the OpenAPI-diff check).
