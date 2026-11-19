"use client";

import React, { useEffect, useState } from "react";
import { Save } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { notify } from "@/shared/lib/notify";
import { useTheme } from "@/shared/lib/theme-context";
import { useAuth } from "@/modules/identity/application/AuthContext";
import { useUserCategories } from "@/modules/ledger/application/CategoriesContext";
import { defaultTokenStorage } from "@/shared/infrastructure/local-storage-token.adapter";
import { FetchHttpClient } from "@/shared/infrastructure/fetch-http.client";
import { IdentityApiRepository } from "../infrastructure/identity-api.repository";
import { FxApiRepository } from "@/modules/fx/infrastructure/fx-api.repository";
import type { CurrencyCatalogEntryDto } from "@/modules/fx/domain/fx.types";
import type { UserDto } from "../domain/identity.types";
import {
  setNumberFormatPreferences,
  getNumberFormatPreferences,
} from "@/shared/lib/number-format";
import {
  setDatePreferences,
  getDatePreferences,
} from "@/shared/lib/date-preferences";

import { ProfileSectionCard } from "./settings/ProfileSectionCard";
import { PreferencesSectionCard } from "./settings/PreferencesSectionCard";
import { CurrencySectionCard } from "./settings/CurrencySectionCard";
import { SecuritySectionCard } from "./settings/SecuritySectionCard";
import { NotificationsSectionCard } from "./settings/NotificationsSectionCard";
import { ConnectedAccountsSectionCard } from "./settings/ConnectedAccountsSectionCard";
import { DataPrivacySectionCard } from "./settings/DataPrivacySectionCard";
import { EditProfileDrawer } from "./settings/EditProfileDrawer";
import { ActiveSessionsDrawer } from "./settings/ActiveSessionsDrawer";
import { PasswordInfoDrawer } from "./settings/PasswordInfoDrawer";
import { DeleteAccountDrawer } from "./settings/DeleteAccountDrawer";
import { ResetFinancialDataDrawer } from "./settings/ResetFinancialDataDrawer";

export function clearClientFinancialStorage(
  storage: { length: number; key(index: number): string | null; removeItem(key: string): void } | null = typeof window !== "undefined" ? window.localStorage : null
) {
  if (!storage) return;
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i);
      if (!key) continue;
      if (
        key.startsWith("billefy_patrimonial_") ||
        key.startsWith("billefy_tx_form_draft_") ||
        key.startsWith("billefy_ws_expense_draft_") ||
        key.startsWith("billefy_user_categories_")
      ) {
        keysToRemove.push(key);
      }
    }
    for (const key of keysToRemove) {
      storage.removeItem(key);
    }
  } catch {
    // Ignore storage errors
  }
}

export interface SettingsViewProps {
  user?: UserDto | null;
  selectedCurrency: "BOB" | "USD";
  onSelectCurrency: (currency: "BOB" | "USD") => void;
  p2pRate: number;
  onOpenBinance: () => void;
  onOpenCsv: () => void;
  onOpenWhatsApp: () => void;
  onOpenFxTransfer: () => void;
  onLogout?: () => void;
  onFinancialDataReset?: () => Promise<void>;
}

type SettingsTab =
  | "todos"
  | "perfil"
  | "preferencias"
  | "seguridad"
  | "notificaciones"
  | "moneda"
  | "datos";

const DEFAULT_CURRENCIES: CurrencyCatalogEntryDto[] = [
  { code: "USD", name: "Dólar estadounidense", symbol: "$", precision: 2, isActive: true },
  { code: "BOB", name: "Boliviano", symbol: "Bs.", precision: 2, isActive: true },
  { code: "USDT", name: "Tether (USDT)", symbol: "₮", precision: 2, isActive: true },
];

export function SettingsView({
  user,
  selectedCurrency,
  onSelectCurrency,
  p2pRate,
  onOpenBinance,
  onOpenCsv,
  onOpenWhatsApp,
  onOpenFxTransfer,
  onLogout,
  onFinancialDataReset,
}: SettingsViewProps) {
  const { theme, setTheme } = useTheme();
  const { updatePreferredCurrency } = useAuth();
  const { resetCategories } = useUserCategories();

  const [activeTab, setActiveTab] = useState<SettingsTab>("todos");
  const [saving, setSaving] = useState(false);
  const [currencies, setCurrencies] = useState<CurrencyCatalogEntryDto[]>(DEFAULT_CURRENCIES);

  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [passwordInfoOpen, setPasswordInfoOpen] = useState(false);
  const [sessionsOpen, setSessionsOpen] = useState(false);
  const [deleteAccountOpen, setDeleteAccountOpen] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [resetFinancialDataOpen, setResetFinancialDataOpen] = useState(false);
  const [resettingFinancialData, setResettingFinancialData] = useState(false);

  const initialNumPrefs = getNumberFormatPreferences();
  const initialDatePrefs = getDatePreferences();

  const [settings, setSettings] = useState({
    phone: "+591 7250 3398",
    fullName: user?.fullName || "Luis Gabriel",
    theme: theme,
    dateFormat: initialDatePrefs.dateFormat,
    weekStartsOn: initialDatePrefs.weekStartsOn,
    defaultDashboard: "inicio",
    baseCurrency: user?.preferredCurrency || selectedCurrency || "USD",
    region: "Bolivia",
    timezone: "GMT-4 (La Paz)",
    numberGroupingConvention: initialNumPrefs.convention,
    maximumDecimalPlaces: initialNumPrefs.decimalPlaces,
    showExchangeRates: true,
    manualRateRefresh: true,
    budgetAlerts: true,
    debtDueAlerts: true,
    goalsAlerts: true,
    largeMovementsAlerts: false,
    weeklySummary: true,
    autoBackup: true,
  });

  // Load currencies from backend catalog
  useEffect(() => {
    let isMounted = true;
    async function loadCatalog() {
      try {
        const repo = new FxApiRepository(new FetchHttpClient());
        const data = await repo.getCurrencies();
        if (isMounted && Array.isArray(data) && data.length > 0) {
          setCurrencies(data.filter((c) => c.isActive));
        }
      } catch {
        // fallback to DEFAULT_CURRENCIES
      }
    }
    loadCatalog();
    return () => {
      isMounted = false;
    };
  }, []);

  // Hydrate from localStorage
  useEffect(() => {
    const storageKey = `billefy_settings_${user?.id || "guest"}`;
    if (typeof window === "undefined") return;
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        setSettings((prev) => ({
          ...prev,
          ...parsed,
          fullName: user?.fullName || parsed.fullName || prev.fullName,
          baseCurrency: user?.preferredCurrency || parsed.baseCurrency || prev.baseCurrency,
        }));
      }
    } catch {
      // ignore parse errors
    }
  }, [user]);

  const handleSave = async () => {
    setSaving(true);
    try {
      // 1. Number preferences
      if (user) {
        try {
          const token = defaultTokenStorage.getAccessToken();
          const client = new FetchHttpClient({ authToken: token || undefined, userId: user.id });
          const updated = await client.put<UserDto & { numberGroupingConvention: "es-BO" | "en-US"; maximumDecimalPlaces: number }>(
            "/v1/auth/number-format",
            {
              numberGroupingConvention: settings.numberGroupingConvention,
              maximumDecimalPlaces: settings.maximumDecimalPlaces,
            }
          );
          defaultTokenStorage.setUser(updated);
          setNumberFormatPreferences(updated.numberGroupingConvention, updated.maximumDecimalPlaces);
          window.dispatchEvent(new CustomEvent("billefy:number-format-updated", { detail: updated }));
        } catch {
          setNumberFormatPreferences(settings.numberGroupingConvention, settings.maximumDecimalPlaces);
        }
      } else {
        setNumberFormatPreferences(settings.numberGroupingConvention, settings.maximumDecimalPlaces);
      }

      // 2. Date preferences
      setDatePreferences({
        dateFormat: settings.dateFormat,
        weekStartsOn: settings.weekStartsOn,
      });

      // 3. Preferred currency
      if (settings.baseCurrency) {
        if (user) await updatePreferredCurrency(settings.baseCurrency);
        if (settings.baseCurrency === "BOB" || settings.baseCurrency === "USD") {
          onSelectCurrency(settings.baseCurrency);
        }
      }

      // 4. Theme
      setTheme(settings.theme);

      // 5. Persist all local settings
      if (typeof window !== "undefined") {
        const storageKey = `billefy_settings_${user?.id || "guest"}`;
        localStorage.setItem(storageKey, JSON.stringify(settings));
      }

      notify.success(
        "Configuración guardada",
        "Tus preferencias y moneda base se actualizaron correctamente."
      );
    } catch {
      notify.error("Error al guardar", "No se pudieron actualizar todas las opciones.");
    } finally {
      setSaving(false);
    }
  };

  const handleExportData = async () => {
    try {
      const token = defaultTokenStorage.getAccessToken();
      const repo = new IdentityApiRepository(new FetchHttpClient({ authToken: token || undefined }));
      const exportData = await repo.exportUserData();
      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `billefy-data-export-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      URL.revokeObjectURL(url);
      notify.success("Respaldo descargado", "Se descargaron tus datos personales y financieros.");
    } catch {
      notify.error(
        "No se pudo crear el respaldo",
        "No descargamos un archivo incompleto. Intenta nuevamente."
      );
    }
  };

  const handleDownloadReport = () => {
    const reportText = `==================================================
REPORTE DE CONFIGURACIÓN Y ESTADO DE CUENTA BILLEFY
==================================================
Fecha de emisión: ${new Date().toLocaleString()}
Usuario: ${settings.fullName}
Email: ${user?.email || "Sin email"}
Teléfono: ${settings.phone}

MONEDA Y REGIÓN
--------------------------------------------------
Moneda base: ${settings.baseCurrency}
Región: ${settings.region}
Zona horaria: ${settings.timezone}
Tasa de cambio actual P2P: 1 USDT = Bs. ${p2pRate.toFixed(2)}

PREFERENCIAS DEL SISTEMA
--------------------------------------------------
Tema: ${settings.theme}
Formato de fecha: ${settings.dateFormat}
Inicio de semana: ${settings.weekStartsOn}
Agrupación de números: ${settings.numberGroupingConvention}
Decimales: ${settings.maximumDecimalPlaces}

SEGURIDAD Y RESPALDOS
--------------------------------------------------
Proveedor de autenticación: Billefy Auth
Respaldo automático: ${settings.autoBackup ? "Activado" : "Desactivado"}
==================================================
`;
    const blob = new Blob([reportText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `billefy-reporte-completo-${new Date().toISOString().slice(0, 10)}.txt`;
    link.click();
    URL.revokeObjectURL(url);
    notify.success("Reporte generado", "Se descargó el reporte completo de tu cuenta.");
  };

  const handleDeleteAccount = async () => {
    setDeletingAccount(true);
    try {
      const token = defaultTokenStorage.getAccessToken();
      const repo = new IdentityApiRepository(new FetchHttpClient({ authToken: token || undefined }));
      await repo.requestAccountDeletion();
      setDeleteAccountOpen(false);
      notify.info(
        "Solicitud registrada",
        "Tu cuenta entrará en período de gracia de 30 días antes de ser eliminada."
      );
      if (onLogout) {
        setTimeout(onLogout, 2500);
      }
    } catch {
      notify.error("Error", "No se pudo procesar la solicitud de baja.");
    } finally {
      setDeletingAccount(false);
    }
  };

  const handleResetFinancialData = async () => {
    setResettingFinancialData(true);
    try {
      const token = defaultTokenStorage.getAccessToken();
      const repo = new IdentityApiRepository(new FetchHttpClient({ authToken: token || undefined }));
      await repo.resetFinancialData();
      setResetFinancialDataOpen(false);
      resetCategories();
      clearClientFinancialStorage();
      try {
        await onFinancialDataReset?.();
      } catch {
        // Data refreshes on dashboard revisit
      }
      notify.success("Datos financieros borrados", "Tu cuenta, perfil y preferencias se conservaron.");
    } catch {
      notify.error("No se pudieron borrar los datos", "No se realizó el reinicio. Intenta nuevamente.");
    } finally {
      setResettingFinancialData(false);
    }
  };

  const isVisible = (section: SettingsTab) => {
    if (activeTab === "todos") return true;
    return activeTab === section;
  };

  const navItems: { id: SettingsTab; label: string }[] = [
    { id: "todos", label: "Todo" },
    { id: "perfil", label: "Perfil" },
    { id: "preferencias", label: "Preferencias" },
    { id: "moneda", label: "Moneda y región" },
    { id: "seguridad", label: "Seguridad" },
    { id: "notificaciones", label: "Notificaciones" },
    { id: "datos", label: "Datos" },
  ];

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto pb-16">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
            Configuración
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Personaliza tu experiencia, seguridad y preferencias financieras.
          </p>
        </div>

        <Button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="gap-2 shrink-0"
        >
          <Save className="size-4" />
          <span>{saving ? "Guardando..." : "Guardar cambios"}</span>
        </Button>
      </div>

      {/* 2. Navigation Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 -mt-2">
        {navItems.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setActiveTab(item.id)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition cursor-pointer ${
              activeTab === item.id
                ? "bg-primary text-primary-foreground shadow-xs"
                : "bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* 3. Main Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-5">
        {isVisible("perfil") && (
          <ProfileSectionCard
            user={user}
            phone={settings.phone}
            onOpenEditProfile={() => setEditProfileOpen(true)}
          />
        )}

        {isVisible("preferencias") && (
          <PreferencesSectionCard
            settings={{
              theme: settings.theme,
              dateFormat: settings.dateFormat,
              weekStartsOn: settings.weekStartsOn,
              defaultDashboard: settings.defaultDashboard,
              numberGroupingConvention: settings.numberGroupingConvention,
              maximumDecimalPlaces: settings.maximumDecimalPlaces,
            }}
            onChange={(patch) => setSettings((s) => ({ ...s, ...patch }))}
          />
        )}

        {isVisible("moneda") && (
          <CurrencySectionCard
            settings={{
              baseCurrency: settings.baseCurrency,
              showExchangeRates: settings.showExchangeRates,
              manualRateRefresh: settings.manualRateRefresh,
            }}
            currencies={currencies}
            onChange={(patch) => setSettings((s) => ({ ...s, ...patch }))}
          />
        )}

        {isVisible("seguridad") && (
          <SecuritySectionCard
            onOpenPasswordInfo={() => setPasswordInfoOpen(true)}
            onOpenSessions={() => setSessionsOpen(true)}
          />
        )}

        {isVisible("notificaciones") && (
          <NotificationsSectionCard
            settings={{
              budgetAlerts: settings.budgetAlerts,
              debtDueAlerts: settings.debtDueAlerts,
              goalsAlerts: settings.goalsAlerts,
              largeMovementsAlerts: settings.largeMovementsAlerts,
              weeklySummary: settings.weeklySummary,
            }}
            onChange={(patch) => setSettings((s) => ({ ...s, ...patch }))}
          />
        )}

        {isVisible("datos") && (
          <ConnectedAccountsSectionCard
            onOpenBinance={onOpenBinance}
            onOpenCsv={onOpenCsv}
            onOpenWhatsApp={onOpenWhatsApp}
            onOpenFxTransfer={onOpenFxTransfer}
          />
        )}

        {isVisible("datos") && (
          <DataPrivacySectionCard
            autoBackup={settings.autoBackup}
            onAutoBackupChange={(enabled) =>
              setSettings((s) => ({ ...s, autoBackup: enabled }))
            }
            onExportData={handleExportData}
            onImportCsv={onOpenCsv}
            onDownloadReport={handleDownloadReport}
            onClearStorage={() => setResetFinancialDataOpen(true)}
            onOpenDeleteAccount={() => setDeleteAccountOpen(true)}
          />
        )}
      </div>

      {/* Drawers */}
      <EditProfileDrawer
        open={editProfileOpen}
        onOpenChange={setEditProfileOpen}
        fullName={settings.fullName}
        phone={settings.phone}
        email={user?.email}
        onSave={(fullName, phone) => setSettings((s) => ({ ...s, fullName, phone }))}
      />

      <PasswordInfoDrawer
        open={passwordInfoOpen}
        onOpenChange={setPasswordInfoOpen}
      />

      <ActiveSessionsDrawer
        open={sessionsOpen}
        onOpenChange={setSessionsOpen}
      />

      <DeleteAccountDrawer
        open={deleteAccountOpen}
        onOpenChange={setDeleteAccountOpen}
        deleting={deletingAccount}
        onConfirm={handleDeleteAccount}
      />

      <ResetFinancialDataDrawer
        open={resetFinancialDataOpen}
        onOpenChange={setResetFinancialDataOpen}
        resetting={resettingFinancialData}
        onConfirm={handleResetFinancialData}
      />
    </div>
  );
}
