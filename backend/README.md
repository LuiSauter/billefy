# Billefy — Backend (.NET 10)

Monolito modular construido en **C# / .NET 10** sobre **PostgreSQL local**, siguiendo principios estrictos de **Clean Architecture**, DDD (Domain-Driven Design), inmutabilidad contable y tipos monetarios de alta precisión (`decimal`).

---

## 1. Resumen de Arquitectura y Módulos

El backend está organizado como un monolito modular desacoplado. Los módulos no acceden a las tablas de otros módulos directamente; toda comunicación intermodular se realiza mediante contratos (`Contracts`):

* **`Ledger`**: Libro mayor, cuentas multimoneda (BOB, USD, USDT, EUR), transacciones inmutables (solo reversiones, sin `UPDATE` ni `DELETE`), saldos derivados dinámicamente.
* **`Fx`**: Snapshot de tipos de cambio del mercado paralelo (DolarApi Binance P2P) y conversión basada en la moneda de tenencia (Regla 19).
* **`Ingestion`**: Ingesta inteligente de notificaciones y extractos bancarios (CSV), deduplicación por fingerprint SHA-256 y ventana temporal, estados de borrador (`Draft`).
* **`Lending`**: Motor de préstamos con 6 esquemas de amortización, cálculo de TEA/IRR con solver numérico, mora y asignación en cascada de pagos (Golden Vectors A–H).
* **`Planning`**: Gestión de presupuestos con alertas al 80% y 100%, metas de ahorro con contribución mensual recomendada, y cálculo de salud financiera (50/30/20 ajustado por deuda).
* **`Messaging`**: Bot conversacional bidireccional de WhatsApp (inbound-only, Regla 21) con adaptadores intercambiables (`Devhooh` y `Meta Official Cloud API`).
* **`BuildingBlocks`**: Tipos fundamentales compartidos (`Money`, `Currency`, `Result`, `Error`, `IClock`).
* **`Integrations`**: Adaptadores externos aislados para DolarApi (`Billefy.Integrations.Fx`) y WhatsApp (`Billefy.Integrations.WhatsApp`).

---

## 2. Requisitos Previos

1. **.NET 10 SDK** (versión 10.0 o superior):
   ```bash
   dotnet --version
   ```
2. **PostgreSQL 16+ instalado y corriendo localmente**:
   * En **macOS**: vía **DBngin** + **TablePlus**, **Postgres.app** o `brew services start postgresql@16`.
   * En **Linux**: servicio nativo `sudo systemctl start postgresql`.
   * En **Windows**: servicio nativo de PostgreSQL o instalador oficial.
   * Crea una base de datos local llamada `billefy-db` (o el nombre que prefieras).
   * Al iniciar la API, Entity Framework Core aplica automáticamente todas las migraciones necesarias en tu base de datos local.

---

## 3. Configuración de Base de Datos y Variables de Entorno

El backend soporta **dos formatos flexibles** de configuración para conectar tu PostgreSQL local, **sin credenciales harcodeadas**:

### Formato 1: Variables Individuales (Estilo DBngin / TablePlus)
Si usas DBngin con TablePlus en macOS, los valores estándar son:
```env
DB_CONNECTION="postgres"
DB_HOST="localhost"
DB_PORT="5432"
DB_DATABASE="billefy-db"
DB_USERNAME="postgres"
DB_PASSWORD=""
```

### Formato 2: Cadena de Conexión Estándar (.NET)
```env
ConnectionStrings__PostgreSQL="Host=localhost;Port=5432;Database=billefy-db;Username=postgres;Password="
```

---

## 4. Configuración por Sistema Operativo

### macOS y Linux (Bash / Zsh)
```bash
# Opción A: Variables individuales (DBngin / TablePlus)
export DB_CONNECTION="postgres"
export DB_HOST="localhost"
export DB_PORT="5432"
export DB_DATABASE="billefy-db"
export DB_USERNAME="postgres"
export DB_PASSWORD=""

# Opción B: Cadena directa
# export ConnectionStrings__PostgreSQL="Host=localhost;Port=5432;Database=billefy-db;Username=postgres;Password="

# Entorno de ejecución
export ASPNETCORE_ENVIRONMENT="Development"
export ASPNETCORE_URLS="http://localhost:5267"

# Proveedor de WhatsApp ("Devhooh", "Meta", o "Simulated")
export WhatsApp__Provider="Devhooh"
export WhatsApp__Devhooh__BaseUrl="https://api-whp.devhooh.com"
export WhatsApp__Devhooh__ApiKey="tu_api_key_devhooh"

# Tipo de cambio paralelo
export Fx__RateSourceUrl="https://bo.dolarapi.com/v1/dolares/binance"
```

### Windows (PowerShell)
```powershell
# Variables individuales
$env:DB_HOST="localhost"
$env:DB_PORT="5432"
$env:DB_DATABASE="billefy-db"
$env:DB_USERNAME="postgres"
$env:DB_PASSWORD=""

# Entorno de ejecución
$env:ASPNETCORE_ENVIRONMENT="Development"
$env:ASPNETCORE_URLS="http://localhost:5267"

# Proveedor de WhatsApp
$env:WhatsApp__Provider="Devhooh"
$env:WhatsApp__Devhooh__BaseUrl="https://api-whp.devhooh.com"
$env:WhatsApp__Devhooh__ApiKey="tu_api_key_devhooh"

# Tipo de cambio paralelo
$env:Fx__RateSourceUrl="https://bo.dolarapi.com/v1/dolares/binance"
```

### Windows (Command Prompt / CMD)
```cmd
:: Variables individuales
set DB_HOST=localhost
set DB_PORT=5432
set DB_DATABASE=billefy-db
set DB_USERNAME=postgres
set DB_PASSWORD=

:: Entorno de ejecución
set ASPNETCORE_ENVIRONMENT=Development
set ASPNETCORE_URLS=http://localhost:5267

:: Proveedor de WhatsApp
set WhatsApp__Provider=Devhooh
set WhatsApp__Devhooh__BaseUrl=https://api-whp.devhooh.com
set WhatsApp__Devhooh__ApiKey=tu_api_key_devhooh

:: Tipo de cambio paralelo
set Fx__RateSourceUrl=https://bo.dolarapi.com/v1/dolares/binance
```

---

## 5. Comandos de Ejecución

Ubícate en el directorio `backend/`:

### A. Restaurar Dependencias y Compilar

* **macOS / Linux / Windows**:
  ```bash
  dotnet restore
  dotnet build
  ```

### B. Ejecutar la Suite de Pruebas Automatizadas

Ejecuta todas las pruebas unitarias, de integración, golden vectors matemáticos y reglas de arquitectura:

* **macOS / Linux / Windows**:
  ```bash
  dotnet test --nologo
  ```

### C. Iniciar la API del Backend

Al ejecutar la API, se conectará a tu PostgreSQL local (`billefy-db`) y aplicará automáticamente todas las migraciones:

* **macOS / Linux / Windows**:
  ```bash
  dotnet run --project src/Api/Api.csproj
  ```

Verifica la API y la documentación OpenAPI en:
* Documentación OpenAPI: `http://localhost:5267/openapi/v1.json`

### D. Verificación de Formato y Estilo de Código

* **macOS / Linux / Windows**:
  ```bash
  dotnet format --verify-no-changes
  ```
