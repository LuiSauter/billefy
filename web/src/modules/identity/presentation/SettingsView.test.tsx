import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { SettingsView, clearClientFinancialStorage } from "./SettingsView";
import { formatNumber } from "@/shared/lib/number-format";
import { UserDto } from "../domain/identity.types";

vi.mock("@/shared/lib/theme-context", () => ({
  useTheme: () => ({ theme: "dark", setTheme: vi.fn() }),
}));

vi.mock("@/modules/identity/application/AuthContext", () => ({
  useAuth: () => ({
    updatePreferredCurrency: vi.fn(),
  }),
}));

const mockUser: UserDto = {
  id: "u-123",
  email: "luis.gabriel@mywallet.app",
  fullName: "Luis Gabriel",
  preferredCurrency: "USD",
  createdAt: "2026-01-01T00:00:00Z",
};

describe("number formatting preferences", () => {
  it("groups exact decimal amounts with the selected separators and precision", () => {
    expect(formatNumber("1234567.895", "es-BO", 2)).toBe("1.234.567,90");
    expect(formatNumber("1234567.895", "en-US", 4)).toBe("1,234,567.8950");
    expect(formatNumber("999999999999999999.999", "es-BO", 0)).toBe("1.000.000.000.000.000.000");
  });
});

describe("SettingsView presentation", () => {
  it("renders the redesign header, save button, and navigation pills", () => {
    const html = renderToStaticMarkup(
      <SettingsView
        user={mockUser}
        selectedCurrency="USD"
        onSelectCurrency={vi.fn()}
        p2pRate={9.85}
        onOpenBinance={vi.fn()}
        onOpenCsv={vi.fn()}
        onOpenWhatsApp={vi.fn()}
        onOpenFxTransfer={vi.fn()}
      />
    );

    expect(html).toContain("Configuración");
    expect(html).toContain("Personaliza tu experiencia, seguridad y preferencias financieras.");
    expect(html).toContain("Guardar cambios");
    expect(html).toContain("Perfil");
    expect(html).toContain("Preferencias");
    expect(html).toContain("Seguridad");
    expect(html).toContain("Notificaciones");
    expect(html).toContain("Moneda y región");
    expect(html).toContain("Datos");
  });

  it("renders all sections from docs/redesign/settings.png", () => {
    const html = renderToStaticMarkup(
      <SettingsView
        user={mockUser}
        selectedCurrency="USD"
        onSelectCurrency={vi.fn()}
        p2pRate={9.85}
        onOpenBinance={vi.fn()}
        onOpenCsv={vi.fn()}
        onOpenWhatsApp={vi.fn()}
        onOpenFxTransfer={vi.fn()}
      />
    );

    // Card 1: Perfil de usuario
    expect(html).toContain("Perfil de usuario");
    expect(html).toContain("Luis Gabriel");
    expect(html).toContain("luis.gabriel@mywallet.app");
    expect(html).toContain("Editar");

    // Card 2: Preferencias generales
    expect(html).toContain("Preferencias generales");
    expect(html).toContain("Idioma");
    expect(html).toContain("Tema");
    expect(html).toContain("Formato de fecha");
    expect(html).toContain("Inicio de semana");
    expect(html).toContain("Dashboard por defecto");
    expect(html).toContain("Agrupación de números");
    expect(html).toContain("Española (1.234,56)");
    expect(html).toContain("Internacional (1,234.56)");
    expect(html).toContain("Decimales máximos");

    // Card 3: Configuración saludable
    expect(html).toContain("Configuración saludable");
    expect(html).toContain("Moneda base:");
    expect(html).toContain("2FA Google");
    expect(html).toContain("Último respaldo:");

    // Card 4: Moneda y región
    expect(html).toContain("Moneda y región");
    expect(html).toContain("Mostrar tasas de cambio");
    expect(html).toContain("Actualizar tasas manualmente");

    // Card 5: Seguridad
    expect(html).toContain("Seguridad");
    expect(html).toContain("Contraseña");
    expect(html).toContain("Autenticación en dos pasos (2FA)");
    expect(html).toContain("Biometría / WebAuthn");
    expect(html).toContain("Sesiones activas");
    expect(html).toContain("Cerrar otras sesiones");

    // Card 6: Notificaciones
    expect(html).toContain("Notificaciones");
    expect(html).toContain("Recordatorios de presupuesto");
    expect(html).toContain("Alertas de vencimiento de deudas");
    expect(html).toContain("Metas");
    expect(html).toContain("Movimientos grandes");
    expect(html).toContain("Resumen semanal");

    // Card 7: Cuentas conectadas
    expect(html).toContain("Cuentas conectadas / fuentes de datos");
    expect(html).toContain("Banco (manual)");
    expect(html).toContain("Binance (manual)");
    expect(html).toContain("Payoneer (manual)");

    // Card 8: Privacidad y datos
    expect(html).toContain("Privacidad y datos");
    expect(html).toContain("Exportar datos");
    expect(html).toContain("Importar CSV");
    expect(html).toContain("Respaldo automático");
    expect(html).toContain("Descargar reporte completo");
    expect(html).toContain("Borrar datos financieros");
    expect(html).toContain("Eliminar cuenta");
  });
});

describe("clearClientFinancialStorage", () => {
  it("clears financial caches, category keys, and transaction drafts while preserving auth and preferences", () => {
    const store = new Map<string, string>();
    const mockStorage = {
      get length() {
        return store.size;
      },
      key(index: number) {
        return [...store.keys()][index] ?? null;
      },
      getItem(key: string) {
        return store.get(key) ?? null;
      },
      setItem(key: string, value: string) {
        store.set(key, value);
      },
      removeItem(key: string) {
        store.delete(key);
      },
    };

    mockStorage.setItem("billefy_patrimonial_assets_v1", JSON.stringify([{ id: "1" }]));
    mockStorage.setItem("billefy_patrimonial_liabilities_v1", JSON.stringify([{ id: "2" }]));
    mockStorage.setItem("billefy_tx_form_draft_u-123", JSON.stringify({ amount: 100 }));
    mockStorage.setItem("billefy_user_categories_v2_u-123", JSON.stringify([{ id: "c1" }]));
    mockStorage.setItem("billefy_ws_expense_draft_ws-1", JSON.stringify({ note: "draft" }));

    // Non-financial data that must be preserved
    mockStorage.setItem("billefy_auth_token", "jwt-token");
    mockStorage.setItem("billefy_user", JSON.stringify({ id: "u-123" }));
    mockStorage.setItem("billefy_settings_u-123", JSON.stringify({ theme: "dark" }));
    mockStorage.setItem("billefy_theme", "dark");

    clearClientFinancialStorage(mockStorage);

    expect(mockStorage.getItem("billefy_patrimonial_assets_v1")).toBeNull();
    expect(mockStorage.getItem("billefy_patrimonial_liabilities_v1")).toBeNull();
    expect(mockStorage.getItem("billefy_tx_form_draft_u-123")).toBeNull();
    expect(mockStorage.getItem("billefy_user_categories_v2_u-123")).toBeNull();
    expect(mockStorage.getItem("billefy_ws_expense_draft_ws-1")).toBeNull();

    expect(mockStorage.getItem("billefy_auth_token")).toBe("jwt-token");
    expect(mockStorage.getItem("billefy_user")).toBe(JSON.stringify({ id: "u-123" }));
    expect(mockStorage.getItem("billefy_settings_u-123")).toBe(JSON.stringify({ theme: "dark" }));
    expect(mockStorage.getItem("billefy_theme")).toBe("dark");
  });
});
