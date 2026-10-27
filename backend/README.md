# Billefy — Backend (.NET 10)

Monolito modular construido en **C# / .NET 10** sobre **PostgreSQL**, siguiendo principios estrictos de **Clean Architecture**, DDD (Domain-Driven Design), inmutabilidad contable y tipos monetarios de alta precisión (`decimal`).

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

Antes de compilar y ejecutar el backend, asegúrate de contar con:

1. **.NET 10 SDK** (versión 10.0 o superior):
   ```bash
   dotnet --version
   ```
2. **PostgreSQL 16+** en ejecución local o remota.
   * Por defecto, escucha en el puerto `5432`.
   * Si usas Docker en tu máquina:
     ```bash
     docker run -d --name billefy-postgres -p 5432:5432 -e POSTGRES_DB=billefy -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgrespassword postgres:16-alpine
     ```

---

## 3. Configuración de Variables de Entorno

**Ninguna credencial sensible está harcodeada.**

Puedes configurar las variables mediante dos métodos:
1. **Archivo `appsettings.Development.json`** dentro de `src/Api/`:
   ```json
   {
     "ConnectionStrings": {
       "PostgreSQL": "Host=localhost;Port=5432;Database=billefy;Username=postgres;Password=postgrespassword"
     },
     "WhatsApp": {
       "Provider": "Devhooh",
       "Devhooh": {
         "BaseUrl": "https://api-whp.devhooh.com",
         "ApiKey": "tu_api_key_aqui"
       },
       "Meta": {
         "ApiVersion": "v21.0",
         "PhoneNumberId": "tu_phone_number_id",
         "AccessToken": "tu_access_token"
       }
     },
     "Fx": {
       "RateSourceUrl": "https://bo.dolarapi.com/v1/dolares/binance"
     }
   }
   ```
2. **Variables de entorno del sistema** (el runtime de .NET mapea la jerarquía JSON usando doble guion bajo `__`). Consulta la plantilla `env.example` en este directorio.

### Configuración por Sistema Operativo

#### macOS y Linux (Bash / Zsh)
```bash
# Base de datos PostgreSQL
export ConnectionStrings__PostgreSQL="Host=localhost;Port=5432;Database=billefy;Username=postgres;Password=postgrespassword"

# Entorno de ejecución
export ASPNETCORE_ENVIRONMENT="Development"
export ASPNETCORE_URLS="http://localhost:5000"

# Proveedor de WhatsApp ("Devhooh", "Meta", o "Simulated")
export WhatsApp__Provider="Devhooh"
export WhatsApp__Devhooh__BaseUrl="https://api-whp.devhooh.com"
export WhatsApp__Devhooh__ApiKey="tu_api_key_devhooh"

# Meta WhatsApp (si se utiliza)
export WhatsApp__Meta__ApiVersion="v21.0"
export WhatsApp__Meta__PhoneNumberId="tu_phone_number_id"
export WhatsApp__Meta__AccessToken="tu_access_token_meta"

# Tipo de cambio paralelo
export Fx__RateSourceUrl="https://bo.dolarapi.com/v1/dolares/binance"
```

#### Windows (PowerShell)
```powershell
# Base de datos PostgreSQL
$env:ConnectionStrings__PostgreSQL="Host=localhost;Port=5432;Database=billefy;Username=postgres;Password=postgrespassword"

# Entorno de ejecución
$env:ASPNETCORE_ENVIRONMENT="Development"
$env:ASPNETCORE_URLS="http://localhost:5000"

# Proveedor de WhatsApp ("Devhooh", "Meta", o "Simulated")
$env:WhatsApp__Provider="Devhooh"
$env:WhatsApp__Devhooh__BaseUrl="https://api-whp.devhooh.com"
$env:WhatsApp__Devhooh__ApiKey="tu_api_key_devhooh"

# Meta WhatsApp (si se utiliza)
$env:WhatsApp__Meta__ApiVersion="v21.0"
$env:WhatsApp__Meta__PhoneNumberId="tu_phone_number_id"
$env:WhatsApp__Meta__AccessToken="tu_access_token_meta"

# Tipo de cambio paralelo
$env:Fx__RateSourceUrl="https://bo.dolarapi.com/v1/dolares/binance"
```

#### Windows (Command Prompt / CMD)
```cmd
:: Base de datos PostgreSQL
set ConnectionStrings__PostgreSQL=Host=localhost;Port=5432;Database=billefy;Username=postgres;Password=postgrespassword

:: Entorno de ejecución
set ASPNETCORE_ENVIRONMENT=Development
set ASPNETCORE_URLS=http://localhost:5000

:: Proveedor de WhatsApp ("Devhooh", "Meta", o "Simulated")
set WhatsApp__Provider=Devhooh
set WhatsApp__Devhooh__BaseUrl=https://api-whp.devhooh.com
set WhatsApp__Devhooh__ApiKey=tu_api_key_devhooh

:: Meta WhatsApp (si se utiliza)
set WhatsApp__Meta__ApiVersion=v21.0
set WhatsApp__Meta__PhoneNumberId=tu_phone_number_id
set WhatsApp__Meta__AccessToken=tu_access_token_meta

:: Tipo de cambio paralelo
set Fx__RateSourceUrl=https://bo.dolarapi.com/v1/dolares/binance
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

Ejecuta todas las pruebas unitarias, de integración, golden vectors matemáticos y reglas de arquitectura:

* **macOS / Linux / Windows**:
  ```bash
  dotnet test --nologo
  ```

### C. Iniciar la API del Backend

La API inicia en `http://localhost:5000` con Swagger / OpenAPI habilitado en modo Development:

* **macOS / Linux / Windows**:
  ```bash
  dotnet run --project src/Api/Api.csproj
  ```

Una vez levantado, puedes verificar el estado de la API y OpenAPI en:
* Documentación OpenAPI / Swagger: `http://localhost:5000/openapi/v1.json`

### D. Verificación de Formato y Estilo de Código

* **macOS / Linux / Windows**:
  ```bash
  dotnet format --verify-no-changes
  ```
