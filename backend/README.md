# Billefy — Backend (.NET 10)

Monolito modular construido en **C# / .NET 10** sobre **PostgreSQL local**, siguiendo principios estrictos de **Clean Architecture**, DDD (Domain-Driven Design), inmutabilidad contable y tipos monetarios de alta precisión (`decimal`).

---

## 1. Resumen de Arquitectura y Módulos

El backend está organizado como un monolito modular desacoplado. Los módulos no acceden a las tablas de otros módulos directamente; toda comunicación intermodular se realiza mediante contratos (`Contracts`):

* **`Ledger`**: Libro mayor, cuentas multimoneda (BOB, USD, USDT, EUR), transacciones inmutables (solo reversiones, sin `UPDATE` ni `DELETE`), saldos derivados dinámicamente.
* **`Fx`**: Snapshot de tipos de cambio del mercado paralelo (DolarApi Binance P2P) y conversión basada en la moneda de tenencia (Regla 19).
* **`Ingestion`**: Ingesta inteligente de notificaciones y extractos bancarios (CSV), deduplicación por fingerprint SHA-256 y ventana temporal, estados de borrador (`Draft`).
* **`Lending`**: Motor de préstamos con 6 esquemas de amortización, cálculo de TEA/IRR con solver numérico, mora y asignación en cascada de pagos (Golden Vectors A–H). Las fechas de pago recibidas como fecha calendario sin zona horaria se interpretan como UTC; los timestamps locales se convierten a UTC antes de persistirlos.
* **`Planning`**: Gestión de presupuestos con alertas al 80% y 100%, metas de ahorro con contribución mensual recomendada, y cálculo de salud financiera (50/30/20 ajustado por deuda).
* **`Messaging`**: Bot conversacional bidireccional de WhatsApp (inbound-only, Regla 21) con adaptadores intercambiables (`Devhooh` y `Meta Official Cloud API`).
* **`BuildingBlocks`**: Tipos fundamentales compartidos (`Money`, `Currency`, `Result`, `Error`, `IClock`).
* **`Integrations`**: Adaptadores externos aislados para DolarApi (`Billefy.Integrations.Fx`) y WhatsApp (`Billefy.Integrations.WhatsApp`).

---

### Metas con reservas explícitas (implementación por etapas)

La API de metas incorpora `fundingMode`: al omitirlo conserva `AccountTracking` (saldo completo de la cuenta); `ReservedFunds` comienza en cero y exige una cuenta propia de la misma moneda. Las rutas `POST /v1/planning/goals/{id}/funding/assign` y `/release` registran asignaciones/liberaciones inmutables con `Idempotency-Key`, sin mover dinero. El límite considera todas las metas de la cuenta. Gastar después sigue permitido y expone un faltante explícito; la interfaz de reservas todavía está pendiente. El contrato y las precauciones de migración están en [Soft goal reservations](../docs/financial-audit/reserved-goals.md). Generar la migración no la aplica: no reinicies la API con migración automática sobre datos existentes sin respaldo verificado y un plan autorizado.

## 2. Requisitos Previos

1. **.NET 10 SDK** (versión 10.0 o superior):
   ```bash
   dotnet --version
   ```
2. **PostgreSQL 16+ corriendo localmente**:
   * En **macOS**: vía **DBngin** + **TablePlus**, **Postgres.app** o `brew services start postgresql@16`.
   * En **Linux**: servicio nativo `sudo systemctl start postgresql`.
   * En **Windows**: servicio nativo de PostgreSQL.
   * Base de datos: `billefy-db` (creada en DBngin / TablePlus).
   * Al iniciar la API, Entity Framework Core aplica automáticamente todas las migraciones necesarias en tu base de datos local.

---

## 3. Variables de Entorno (.env) — Copiar y Pegar

Para configurar tu backend de inmediato, copiá y pegá cualquiera de los siguientes bloques según tu flujo de trabajo o sistema operativo:

### Opción A: Crear tu archivo `.env` directamente en la terminal (macOS / Linux)

Ubicado en la carpeta `backend/`, pegá este bloque en tu terminal para generar tu `.env` listo para usar con DBngin / TablePlus:

```bash
cat << 'EOF' > .env
# ------------------------------------------------------------------------------
# 1. Base de Datos PostgreSQL Local (DBngin / TablePlus en macOS)
# ------------------------------------------------------------------------------
DB_CONNECTION="postgres"
DB_HOST="localhost"
DB_PORT="5432"
DB_DATABASE="billefy-db"
DB_USERNAME="postgres"
DB_PASSWORD=""

# ------------------------------------------------------------------------------
# 2. Puerto del Servidor y URLs de Binding
# ------------------------------------------------------------------------------
# Nota en macOS: Se utiliza 5267 para evitar el puerto 5000 reservado por AirPlay Receiver
ASPNETCORE_URLS="http://localhost:5267"
PORT="5267"

# ------------------------------------------------------------------------------
# 3. Orígenes Permitidos en CORS (Next.js)
# ------------------------------------------------------------------------------
CORS_ALLOWED_ORIGINS="http://localhost:3000,http://127.0.0.1:3000"

# ------------------------------------------------------------------------------
# 3b. URL base del frontend (usada en links de invitación por correo)
# ------------------------------------------------------------------------------
# Debe apuntar a la URL pública real del frontend en producción.
WEB_APP_BASE_URL="http://localhost:3000"

# ------------------------------------------------------------------------------
# 4. Entorno de Ejecución
# ------------------------------------------------------------------------------
ASPNETCORE_ENVIRONMENT="Development"

# ------------------------------------------------------------------------------
# 5. Pasarela de WhatsApp ("Devhooh", "Meta", o "Simulated")
# ------------------------------------------------------------------------------
WhatsApp__Provider="Devhooh"
WhatsApp__WebhookSecret=""

# API Devhooh (https://api-whp.devhooh.com)
WhatsApp__Devhooh__BaseUrl="https://api-whp.devhooh.com"
WhatsApp__Devhooh__ApiKey="wasa_live_TU_API_KEY_AQUI"

# API Oficial WhatsApp Cloud de Meta (opcional)
WhatsApp__Meta__BaseUrl="https://graph.facebook.com"
WhatsApp__Meta__ApiVersion="v21.0"
WhatsApp__Meta__PhoneNumberId="TU_PHONE_NUMBER_ID"
WhatsApp__Meta__AccessToken="TU_ACCESS_TOKEN"

# ------------------------------------------------------------------------------
# 6. Fuente de Cotización Paralela (DolarApi Binance P2P)
# ------------------------------------------------------------------------------
Fx__RateSourceUrl="https://bo.dolarapi.com/v1/dolares/binance"

# ------------------------------------------------------------------------------
# 7. Credenciales Opcionales de Binance (Solo Lectura - Regla 18)
# ------------------------------------------------------------------------------
Binance__ApiKey="TU_BINANCE_API_KEY"
Binance__ApiSecret="TU_BINANCE_API_SECRET"

# ------------------------------------------------------------------------------
# 8. Autenticación JWT e Identidad (AUTH-01 a AUTH-07)
# ------------------------------------------------------------------------------
Jwt__Secret="billefy_super_secret_jwt_signing_key_2026_at_least_32_bytes_long!"
Jwt__Issuer="BillefyApi"
Jwt__Audience="BillefyClients"
Jwt__ExpirationMinutes="60"

# ------------------------------------------------------------------------------
# 9. Google OAuth Credentials (Único proveedor de autenticación permitido)
# ------------------------------------------------------------------------------
Google__ClientId="TU_GOOGLE_CLIENT_ID.apps.googleusercontent.com"
Google__ClientSecret="TU_GOOGLE_CLIENT_SECRET"

# ------------------------------------------------------------------------------
# 10. Seguridad & Encriptación en Reposo (AES-256-GCM)
# ------------------------------------------------------------------------------
Security__EncryptionKey="billefy_production_aes_256_gcm_master_encryption_key_2026!"

# ------------------------------------------------------------------------------
# 11. VAPID (Web Push nativo del navegador)
# ------------------------------------------------------------------------------
# Par de claves VAPID para firmar notificaciones Web Push. Generalas una sola vez
# por entorno (son el equivalente a una identidad del servidor push, no rotan
# salvo compromiso) con el helper de la libreria WebPush (VapidHelper.GenerateVapidKeys())
# o con `npx web-push generate-vapid-keys`. La clave publica tambien debe configurarse
# en el frontend como NEXT_PUBLIC_VAPID_PUBLIC_KEY (ver web/README.md).
Vapid__PublicKey="TU_VAPID_PUBLIC_KEY"
Vapid__PrivateKey="TU_VAPID_PRIVATE_KEY"
Vapid__Subject="mailto:soporte@billefy.app"
EOF
```

---

### Opción B: Exportar Variables en la Sesión de Terminal

#### macOS y Linux (Bash / Zsh)
```bash
# 1. Base de datos local (DBngin / TablePlus)
export DB_CONNECTION="postgres"
export DB_HOST="localhost"
export DB_PORT="5432"
export DB_DATABASE="billefy-db"
export DB_USERNAME="postgres"
export DB_PASSWORD=""

# 2. Puerto y CORS
export ASPNETCORE_URLS="http://localhost:5267"
export CORS_ALLOWED_ORIGINS="http://localhost:3000,http://127.0.0.1:3000"
export WEB_APP_BASE_URL="http://localhost:3000"
export ASPNETCORE_ENVIRONMENT="Development"

# 3. WhatsApp y Cotización
export WhatsApp__Provider="Devhooh"
export WhatsApp__Devhooh__BaseUrl="https://api-whp.devhooh.com"
export WhatsApp__Devhooh__ApiKey="tu_api_key_devhooh"
export Fx__RateSourceUrl="https://bo.dolarapi.com/v1/dolares/binance"

# 4. VAPID (Web Push)
export Vapid__PublicKey="TU_VAPID_PUBLIC_KEY"
export Vapid__PrivateKey="TU_VAPID_PRIVATE_KEY"
export Vapid__Subject="mailto:soporte@billefy.app"
```

#### Windows (PowerShell)
```powershell
# 1. Base de datos local
$env:DB_CONNECTION="postgres"
$env:DB_HOST="localhost"
$env:DB_PORT="5432"
$env:DB_DATABASE="billefy-db"
$env:DB_USERNAME="postgres"
$env:DB_PASSWORD=""

# 2. Puerto y CORS
$env:ASPNETCORE_URLS="http://localhost:5267"
$env:CORS_ALLOWED_ORIGINS="http://localhost:3000,http://127.0.0.1:3000"
$env:WEB_APP_BASE_URL="http://localhost:3000"
$env:ASPNETCORE_ENVIRONMENT="Development"

# 3. WhatsApp y Cotización
$env:WhatsApp__Provider="Devhooh"
$env:WhatsApp__Devhooh__BaseUrl="https://api-whp.devhooh.com"
$env:WhatsApp__Devhooh__ApiKey="tu_api_key_devhooh"
$env:Fx__RateSourceUrl="https://bo.dolarapi.com/v1/dolares/binance"

# 4. VAPID (Web Push)
$env:Vapid__PublicKey="TU_VAPID_PUBLIC_KEY"
$env:Vapid__PrivateKey="TU_VAPID_PRIVATE_KEY"
$env:Vapid__Subject="mailto:soporte@billefy.app"
```

#### Windows (Command Prompt / CMD)
```cmd
:: 1. Base de datos local
set DB_CONNECTION=postgres
set DB_HOST=localhost
set DB_PORT=5432
set DB_DATABASE=billefy-db
set DB_USERNAME=postgres
set DB_PASSWORD=

:: 2. Puerto y CORS
set ASPNETCORE_URLS=http://localhost:5267
set CORS_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
set WEB_APP_BASE_URL=http://localhost:3000
set ASPNETCORE_ENVIRONMENT=Development

:: 3. WhatsApp y Cotización
set WhatsApp__Provider=Devhooh
set WhatsApp__Devhooh__BaseUrl=https://api-whp.devhooh.com
set WhatsApp__Devhooh__ApiKey=tu_api_key_devhooh
set Fx__RateSourceUrl=https://bo.dolarapi.com/v1/dolares/binance

:: 4. VAPID (Web Push)
set Vapid__PublicKey=TU_VAPID_PUBLIC_KEY
set Vapid__PrivateKey=TU_VAPID_PRIVATE_KEY
set Vapid__Subject=mailto:soporte@billefy.app
```

---

## 4. Comandos de Ejecución

Ubícate en el directorio `backend/`:

### A. Restaurar Dependencias y Compilar

* **macOS / Linux / Windows**:
  ```bash
  dotnet restore
  dotnet build
  ```

### B. Ejecutar la Suite de Pruebas Automatizadas

Ejecuta todas las pruebas unitarias, de integración, preflight CORS, golden vectors matemáticos y reglas de arquitectura:

* **macOS / Linux / Windows**:
  ```bash
  dotnet test --nologo
  ```

### C. Iniciar la API del Backend

Al ejecutar la API, se conectará a tu PostgreSQL local (`billefy-db`), aplicará automáticamente todas las migraciones y escuchará en el puerto configurado (`http://localhost:5267`):

* **macOS / Linux / Windows**:
  ```bash
  dotnet run --project src/Api/Api.csproj
  ```

Verifica la API y la documentación interactiva en:
* **Swagger UI Interactivo (con soporte Bearer JWT)**: `http://localhost:5267/swagger` (o visitando la raíz `http://localhost:5267/`)
* **Scalar API Reference**: `http://localhost:5267/scalar/v1`
* **Especificación OpenAPI 3.1 JSON**: `http://localhost:5267/openapi/v1.json`

## Movement queries

`GET /v1/transactions/movements` is a backward-compatible logical movement feed. The existing `GET /v1/transactions/` fields remain available and now include an `allocations` array. Supported query parameters are `startUtc`, `endUtcExclusive`, `accountId`, `categoryId`, `type` (`Income`, `Expense`, `Transfer`, `Investment`, `Adjustment`, or `Loan`), `search`, `mode` (`Active` by default or `Audit`), `page` (1-based, maximum 100000), and `pageSize` (1–100). Date-time bounds must be UTC ISO-8601 timestamps (`Z` or `+00:00`); start is inclusive and end is exclusive. A transfer is one feed item with its ledger legs and each leg's account, amount, currency, and ID. When filtering by an account, that account's transfer leg is representative. Amounts and period summaries remain native-currency values; totals are separated by currency. Active mode hides reversal records and transactions they reverse; audit mode retains original and reversal records. Transfer legs and reversal records are excluded from income/expense summaries in both modes, so audit reversals remain historical evidence rather than fresh income or expense. Search checks description, account label, and category label as literal case-insensitive substrings; `%`, `_`, and `!` are not wildcards. The result includes page-independent `totalCount` and currency summaries for the full filtered result set.

## Debt, card and investment accounting

Loan creation accepts additive `originationKind` (`CashDisbursement` by default; `OpeningBalance` creates no cash) and `loanKind` (`Loan` by default; `CreditCard` enables purchases). Principal cash movements are labeled `Loan` and excluded from income, expense and category consumption. Interest is recognized separately, optionally using `interestCategoryId`. `POST /v1/loans/{id}/purchases` recognizes a card expense and liability without withdrawing cash. Creation, payment and purchase support payload-bound `Idempotency-Key` replay; linked postings cannot be independently edited or reversed. See [debt/card policy and API](../docs/financial-audit/debt-card-accounting.md).

Funded investment `Buy` operations use the existing operations route with `linkedAccountId` and a UUID `Idempotency-Key`, atomically updating cash, units, historical cost and immutable history. Funded `Dividend` uses the same route/account/key and atomically records cash plus recognized income, not an investment disposal; quantity, unit price and fees must be zero. It leaves units, cost and value unchanged. Legacy unlinked operations remain cash-neutral. Public transaction DTOs include `investmentId` and `investmentCashKind` so client result projections preserve the distinction. Dated `Revaluation` changes value, not units, cost or cash. New `costBasis` and `unrealizedGain` fields are nullable: unknown legacy acquisition cost is not inferred from current value. Cash-only contribution/disposal routes retain their separate semantics. See [purchase/valuation policy and API](../docs/financial-audit/investment-purchase-accounting.md).

Financial exports include owner-scoped card `purchases` and `investmentTransactions`; authenticated financial reset removes their owned history while preserving other users. These features require new additive Ledger, Lending and Planning migrations. Offline design-time factories generate models without credentials or application startup; generation does not apply schema changes. Do not enable schema-dependent writes before backup, migration review and separately authorized database application.

## Transaction category allocations

`POST /v1/transactions/` and `PUT /v1/transactions/{id}` accept optional `allocations: [{ "categoryId": "<guid>", "amount": 12.34 }]`. Omit allocations to retain the legacy single `categoryId` behavior. When supplied, allocations must be non-empty, cannot be combined with `categoryId`, and must use unique owned categories compatible with the transaction direction; legacy untyped category icons remain accepted. Each amount is positive, uses the account currency's native precision, and all amounts sum exactly to the transaction amount. Invalid, foreign, or direction-incompatible categories are rejected without financial writes.

Raw `TransactionDto` and paged `MovementDto` responses include `allocations: [{ categoryId, categoryName, amount }]`. `categoryId` movement filters match either the legacy transaction category or any allocation, while counts remain one per movement. Movement-list KPIs retain the full parent transaction amount even when a category filter matches one allocation; monthly category reports and category budgets instead use each allocation amount, with legacy single-category transactions assigned their full amount. General budgets count each parent expense once. Budgets match only expenses in the budget's native currency; BOB, USD, and other currencies are never combined or implicitly converted. Budget and monthly spending metrics are active-only: exclude reversal rows, exclude any original transaction referenced by an owner reversal even when that reversal is outside the reporting month, and exclude transfers. Corrections therefore contribute only the replacement's categories and amount. Ordinary corrections atomically save the reversal and replacement with copied allocation children; corrections on the same account/currency preserve the historical FX snapshot.

## Atomic transfers

`POST /v1/transactions/transfers` creates both immutable transfer legs in one database save. Its body uses native account amounts: `sourceAccountId`, `sourceAmount`, `destinationAccountId`, `destinationAmount`, optional `occurredAt`, `description`, and optional `appliedRate`/`rateSource` only for a user-declared `Manual` quote. The response contains `outflowId` and `inflowId`. Currency precision follows the account currency (`Currency.DecimalPlaces`); calculated destination amounts are rounded with midpoint away from zero. Same-currency transfers require equal amounts and carry no FX metadata. USD/USDT is treated as a 1:1 proxy and also requires equal amounts.

For BOB to USD/USDT, the server requests the user's snapshot through `Fx.Contracts.IRateSnapshotProvider.GetSnapshotAsync("BOB", "USD", RateSide.Buy, userId)` and uses the returned buy rate; the destination amount must equal source divided by that rate at destination precision. Client-supplied market provenance is rejected. A positive quote explicitly labeled `Manual` is accepted for the supported BOB/USD/USDT pair when the native destination amount matches the same convention. Transfer correction uses `PUT /v1/transactions/transfers/{transferId}` with the same request fields; it validates the replacement before saving both reversals and both replacement legs together. `POST /v1/transactions/{legId-or-transferId}/reverse` reverses both legs and preserves each leg's FX snapshot. A repeated reversal conflicts, and ordinary transaction updates cannot edit transfer legs.

The side-aware Fx contract adds `GetSnapshotAsync(currencyCode, baseCurrencyCode, side, userId)` while preserving the legacy overload. USD/USDT-to-BOB transfers request `RateSide.Sell` from the canonical BOB/USD snapshot and multiply the source amount by the actual sell rate at destination precision. The returned snapshot includes side metadata; an unconfirmed or mismatched non-Manual side is rejected rather than reusing or inverting a buy quote. User-scoped Manual snapshots and explicitly declared Manual quotes remain supported. Legacy snapshot consumers retain their previous behavior. Tests use isolated fixtures; PostgreSQL execution and live-provider runtime integration remain separate verification requirements.

## Safe loan cancellation

`POST /v1/loans/{id}/cancel` is owner-scoped and cancels only active loans with no recorded payments. A loan without a disbursement account creates no ledger movement. A linked disbursement is reversed only when its exact transaction ID and account, owner, currency, principal, and direction match; its original transaction and installment schedule remain in history. Repeated successful requests return the stored cancellation status and reversal transaction ID.

Conflicts use stable problem `title` codes: `Loan.HasPayments`, `Loan.LegacyDisbursementUnlinked`, `Loan.InvalidStatus`, `Loan.InvalidDisbursementLink`, `Loan.DisbursementMismatch`, and `Loan.DisbursementAlreadyReversed`. Loan summary and detail responses expose `cancellationEligibility.canCancel` and `cancellationEligibility.reasonCode` (`HasPayments`, `LegacyDisbursementUnlinked`, `InvalidStatus`, `InvalidDisbursementLink`, `DisbursementNotFound`, `DisbursementMismatch`, or `DisbursementAlreadyReversed`) for client decisions; the server remains authoritative.

The `AddUniqueTransactionReversalPerOriginal` migration adds a filtered unique index so a ledger transaction can have at most one reversal, including reversals created outside loan cancellation. If legacy data contains multiple rows with the same non-null `reverses_id`, PostgreSQL will reject that migration. The migration intentionally does not delete, rewrite, or infer historical ledger data; resolve any such records through an explicitly approved data-correction plan before applying it. Cancellation and payment coordination uses a PostgreSQL row lock plus one shared relational transaction. SQLite integration tests verify deterministic behavior and rollback, not PostgreSQL locking or cross-context enlistment.

### D. Verificación de Formato y Estilo de Código

* **macOS / Linux / Windows**:
  ```bash
  dotnet format --verify-no-changes
  ```
