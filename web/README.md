# Billefy — Web Frontend (Next.js 15)

Aplicación web desarrollada con **Next.js 15 (App Router)**, **TypeScript estricto**, **Tailwind CSS v4**, **shadcn UI (base-nova sobre @base-ui/react y Recharts)** y **OpenPencil Design System**, estructurada bajo los principios de **Clean Architecture** y precisión financiera (`Decimal.js`). Incluye un sistema de **Drawers responsivos** (Bottom Drawer con swipe-down en móvil, modal centrado en desktop), tipografía legible accesible y gráficos visuales de flujo de caja, distribución de divisas, regla 50/30/20 y amortización.

---

## 1. Resumen de Arquitectura

El frontend sigue una estricta separación de responsabilidades en cuatro capas concéntricas:

```text
web/src/
├── domain/                               # Entidades de negocio y tipos DTO
│   └── models/types.ts
├── infrastructure/                       # Adaptadores de comunicación externa
│   └── api/client.ts                     # Cliente HTTP tipado (BillefyApiClient)
├── application/                          # Casos de uso y orquestación de estado
│   └── hooks/useDashboardData.ts         # Hook de aplicación para toda la vista
└── presentation/                         # Interfaz gráfica declarativa
    └── components/
        ├── dashboard/                    # Header con cotización paralela, tarjetas de saldo, salud financiera
        ├── accounts/                     # Listado y conciliación de cuentas
        ├── transactions/                 # Historial inmutable y reversión de transacciones
        ├── drafts/                       # Bandeja de revisión de borradores capturados
        ├── lending/                      # Préstamos activos, simulador de amortización y pagos
        ├── planning/                     # Presupuestos (alertas 80/100%) y metas de ahorro
        └── modals/                       # Diálogos modulares (WhatsApp, Binance, CSV, etc.)
```

### Movimientos
La sección **Movimientos** está disponible desde el menú lateral. Consulta el mes local seleccionado; sus límites de inicio y fin de mes se envían como instantes UTC al backend (`startUtc` inclusivo y `endUtcExclusive` exclusivo). Búsqueda, filtros e historial usan paginación del servidor; los resúmenes de ingresos, gastos, transferencias y efectivo de inversiones se mantienen separados por moneda. Desde Movimientos se registran aportes y retiros vinculados a una inversión y una cuenta real. El monto usa la moneda de la cuenta; estas operaciones no cambian la valuación ni la cantidad del activo. El historial de efectivo conserva el vínculo con la inversión y solo se revierte mediante su acción coordinada. Archivar un activo no es un retiro y conserva su historial. Los recibos están explícitamente diferidos.

Las transferencias ordinarias y FX permiten elegir **Fecha** y **Hora** locales (incluidas fechas retroactivas). Se envían como un instante UTC al backend, igual que los movimientos; si no se elige una fecha o se borra, se conserva el comportamiento anterior: el servidor usa la fecha y hora actual al registrar. Elegir una fecha histórica no cambia la tasa FX: revisá la cotización aplicada antes de confirmar.

Pruebas enfocadas del módulo:
```bash
pnpm --dir web exec vitest run src/modules/ledger/application/useMovements.test.ts src/modules/ledger/presentation/MovimientosView.test.tsx src/modules/ledger/infrastructure/ledger-api.repository.test.ts src/modules/ledger/application/useLedgerModule.test.ts
```

### Reglas Clave:
* **Cero mocks**: Toda la información se obtiene en tiempo real del backend ASP.NET Core y PostgreSQL.
* **Aritmética monetaria exacta**: Se utiliza `Decimal.js` para cálculos de saldos consolidados; nunca tipos de coma flotante primitivos (`number`).
* **Seguridad de tokens y privacidad**: Las claves API de Binance se procesan con validación de solo lectura en el backend.

---

## 2. Requisitos Previos

1. **Node.js** 20.10.0 o superior (LTS recomendado):
   ```bash
   node --version
   ```
2. **pnpm** versión 9 o superior (o npm / yarn):
   ```bash
   pnpm --version
   ```
   *(Si no tienes pnpm instalado: `npm install -g pnpm`)*
3. **Backend de Billefy** corriendo en `http://localhost:5267` (o el puerto configurado).

---

## 3. Variables de Entorno (.env.local) — Copiar y Pegar

El cliente web requiere la configuración de su URL de backend y del ID de cliente de Google OAuth en `web/.env.local` (ver plantilla `web/env.example`).

| Variable | Descripción | Valor por Defecto / Ejemplo |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | URL base del backend ASP.NET Core | `http://localhost:5267` |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Client ID de Google Identity Services obtenido en Google Cloud Console | `123456789-xyz.apps.googleusercontent.com` |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Clave pública VAPID para suscribirse a Web Push nativo del navegador; debe coincidir con `Vapid__PublicKey` del backend (ver `backend/README.md`) | sin valor por defecto, requerida para que la app pida permiso de notificaciones |

### Configuración de Google Cloud Console:
1. En [Google Cloud Console](https://console.cloud.google.com/), ve a **APIs & Services > Credentials**.
2. Crea un **OAuth 2.0 Client ID** tipo *Web Application*.
3. En **Authorized JavaScript origins**, agrega:
   - `http://localhost:3000`
   - `http://127.0.0.1:3000`
4. Copia el **Client ID** generado a tu `.env.local`.

### Crear tu archivo `.env.local` en la terminal (macOS / Linux)

Ubicado en la carpeta `web/`:

```bash
cat << 'EOF' > .env.local
# URL de la API del Backend ASP.NET Core (.NET 10)
NEXT_PUBLIC_API_URL=http://localhost:5267

# Google OAuth Client ID (Google Identity Services)
NEXT_PUBLIC_GOOGLE_CLIENT_ID=TU_GOOGLE_CLIENT_ID.apps.googleusercontent.com

# Clave pública VAPID para Web Push (debe coincidir con Vapid__PublicKey del backend)
NEXT_PUBLIC_VAPID_PUBLIC_KEY=TU_VAPID_PUBLIC_KEY
EOF
```

---

### Opción B: Exportar en la Sesión de Terminal

#### macOS y Linux (Bash / Zsh)
```bash
export NEXT_PUBLIC_API_URL="http://localhost:5267"
export NEXT_PUBLIC_GOOGLE_CLIENT_ID="TU_GOOGLE_CLIENT_ID.apps.googleusercontent.com"
export NEXT_PUBLIC_VAPID_PUBLIC_KEY="TU_VAPID_PUBLIC_KEY"
```

#### Windows (PowerShell)
```powershell
$env:NEXT_PUBLIC_API_URL="http://localhost:5267"
```

#### Windows (Command Prompt / CMD)
```cmd
set NEXT_PUBLIC_API_URL=http://localhost:5267
```

---

## 4. Comandos de Ejecución

Ubícate en el directorio `web/`:

### A. Instalar Dependencias

* **macOS / Linux / Windows**:
  ```bash
  pnpm install
  ```

### B. Iniciar en Modo Desarrollo

Inicia el servidor de desarrollo en `http://localhost:3000` con Hot Reloading:

* **macOS / Linux / Windows**:
  ```bash
  pnpm dev
  ```

### C. Ejecutar las Pruebas Unitarias

Ejecuta la suite de pruebas unitarias con **Vitest**:

* **macOS / Linux / Windows**:
  ```bash
  pnpm test
  ```

### D. Verificación de Linter y Reglas de Código

Ejecuta el linter **ESLint** con reglas estrictas de TypeScript:

* **macOS / Linux / Windows**:
  ```bash
  pnpm lint
  ```

### E. Compilar para Producción

Genera el paquete optimizado de producción:

* **macOS / Linux / Windows**:
  ```bash
  pnpm build
  ```

### F. Iniciar el Servidor de Producción

* **macOS / Linux / Windows**:
  ```bash
  pnpm start
  ```
