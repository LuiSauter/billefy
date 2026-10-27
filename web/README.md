# Billefy — Web Frontend (Next.js 15)

Aplicación web desarrollada con **Next.js 15 (App Router)**, **TypeScript estricto**, **Tailwind CSS** y **Radix UI / shadcn**, estructurada bajo los principios de **Clean Architecture** y precisión financiera (`Decimal.js`).

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

### Reglas Clave:
* **Cero mocks**: Toda la información se obtiene en tiempo real del backend ASP.NET Core y PostgreSQL.
* **Aritmética monetaria exacta**: Se utiliza `Decimal.js` para cálculos de saldos consolidados; nunca tipos de coma flotante primitivos (`number`).
* **Seguridad de tokens y privacidad**: Las claves API de Binance se procesan con validación de solo lectura en el backend.

---

## 2. Requisitos Previos

Antes de ejecutar el frontend web, asegúrate de contar con:

1. **Node.js** 20.10.0 o superior (LTS recomendado):
   ```bash
   node --version
   ```
2. **pnpm** versión 9 o superior (o npm / yarn):
   ```bash
   pnpm --version
   ```
   *(Si no tienes pnpm instalado: `npm install -g pnpm`)*
3. **Backend de Billefy** corriendo en `http://localhost:5000` (o la dirección que configures).

---

## 3. Configuración de Variables de Entorno

**No hay URLs ni credenciales harcodeadas en el código.**

El cliente web se conecta al backend mediante la variable `NEXT_PUBLIC_API_URL`.

### Opción A: Archivo local `.env.local`
Copia la plantilla `env.example` ubicada en este directorio a `.env.local`:
```bash
cp env.example .env.local
```
Contenido de `.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:5000
```

### Opción B: Variables de entorno del sistema

#### macOS y Linux (Bash / Zsh)
```bash
export NEXT_PUBLIC_API_URL="http://localhost:5000"
```

#### Windows (PowerShell)
```powershell
$env:NEXT_PUBLIC_API_URL="http://localhost:5000"
```

#### Windows (Command Prompt / CMD)
```cmd
set NEXT_PUBLIC_API_URL=http://localhost:5000
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
