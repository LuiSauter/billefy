"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  User,
  SlidersHorizontal,
  ShieldCheck,
  Bell,
  Globe,
  Database,
  Save,
  Pencil,
  Mail,
  Phone,
  Camera,
  CheckCircle2,
  Moon,
  Sun,
  Calendar,
  LayoutGrid,
  Coins,
  MapPin,
  Clock,
  KeyRound,
  Fingerprint,
  Monitor,
  LogOut,
  Target,
  Flag,
  ArrowLeftRight,
  Link2,
  Info,
  Landmark,
  FileSpreadsheet,
  Cloud,
  FileText,
  Trash2,
  AlertTriangle,
  Check,
  RefreshCw,
} from "lucide-react";
import { Card } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { NativeSelect, NativeSelectOption } from "@/shared/ui/native-select";
import { Input } from "@/shared/ui/input";
import { ResponsiveDrawer } from "@/shared/ui/responsive-drawer";
import { useTheme } from "@/shared/lib/theme-context";
import { useAuth } from "@/modules/identity/application/AuthContext";
import { UserDto, getUserDisplayName } from "../domain/identity.types";
import { CurrencyCatalogEntryDto } from "@/modules/fx/domain/fx.types";
import { FxApiRepository } from "@/modules/fx/infrastructure/fx-api.repository";
import { IdentityApiRepository } from "@/modules/identity/infrastructure/identity-api.repository";
import { FetchHttpClient } from "@/shared/infrastructure/fetch-http.client";
import { defaultTokenStorage } from "@/shared/infrastructure/local-storage-token.adapter";
import { notify } from "@/shared/lib/notify";
import { setNumberFormatPreferences } from "@/shared/lib/number-format";
import { useUserCategories } from "@/modules/ledger/application/CategoriesContext";

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

interface LocalSettingsState {
  phone: string;
  fullName: string;
  language: string;
  theme: "dark" | "light" | "system";
  dateFormat: string;
  weekStartsOn: string;
  defaultDashboard: string;
  baseCurrency: string;
  region: string;
  timezone: string;
  numberGroupingConvention: "es-BO" | "en-US";
  maximumDecimalPlaces: 0 | 2 | 4 | 6;
  showExchangeRates: boolean;
  manualRateRefresh: boolean;
  twoFactorEnabled: boolean;
  biometricsEnabled: boolean;
  budgetAlerts: boolean;
  debtDueAlerts: boolean;
  goalsAlerts: boolean;
  largeMovementsAlerts: boolean;
  weeklySummary: boolean;
  autoBackup: boolean;
}

const DEFAULT_CURRENCIES: CurrencyCatalogEntryDto[] = [
  { code: "USD", name: "Dólar estadounidense", symbol: "$", precision: 2, isActive: true },
  { code: "BOB", name: "Boliviano", symbol: "Bs.", precision: 2, isActive: true },
  { code: "USDT", name: "Tether", symbol: "₮", precision: 2, isActive: true },
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

  // Modals state
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [passwordInfoOpen, setPasswordInfoOpen] = useState(false);
  const [sessionsOpen, setSessionsOpen] = useState(false);
  const [deleteAccountOpen, setDeleteAccountOpen] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [resetFinancialDataOpen, setResetFinancialDataOpen] = useState(false);
  const [resettingFinancialData, setResettingFinancialData] = useState(false);
  const [binanceStatus, setBinanceStatus] = useState<{ connected: boolean; maskedApiKey: string | null } | null>(null);

  useEffect(() => {
    async function checkBinanceStatus() {
      try {
        const token = defaultTokenStorage.getAccessToken();
        if (!token) return;
        const res = await fetch("/v1/integrations/binance/status", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setBinanceStatus(data);
        }
      } catch {
        // Ignore
      }
    }
    void checkBinanceStatus();
  }, []);

  // Form / Settings state
  const numberPreferences = user as (UserDto & { numberGroupingConvention?: "es-BO" | "en-US"; maximumDecimalPlaces?: 0 | 2 | 4 | 6 }) | null | undefined;
  const [settings, setSettings] = useState<LocalSettingsState>({
    phone: "+591 7250 3398",
    fullName: user ? getUserDisplayName(user) : "Luis Gabriel",
    language: "es",
    theme: theme === "light" ? "light" : "dark",
    dateFormat: "DD/MM/AAAA",
    weekStartsOn: "lunes",
    defaultDashboard: "inicio",
    baseCurrency: user?.preferredCurrency || selectedCurrency || "USD",
    region: "Bolivia",
    timezone: "GMT-4 (La Paz)",
    numberGroupingConvention: numberPreferences?.numberGroupingConvention ?? "es-BO",
    maximumDecimalPlaces: numberPreferences?.maximumDecimalPlaces ?? 2,
    showExchangeRates: true,
    manualRateRefresh: true,
    twoFactorEnabled: true,
    biometricsEnabled: false,
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
        // Fallback to default active catalog
      }
    }
    loadCatalog();
    return () => {
      isMounted = false;
    };
  }, []);

  // Hydrate from localStorage and UserDto
  useEffect(() => {
    setNumberFormatPreferences(numberPreferences?.numberGroupingConvention ?? "es-BO", numberPreferences?.maximumDecimalPlaces ?? 2);
    const storageKey = `billefy_settings_${user?.id || "guest"}`;
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setSettings((prev) => ({
          ...prev,
          ...parsed,
          fullName: user ? getUserDisplayName(user) : prev.fullName,
          baseCurrency: user?.preferredCurrency || parsed.baseCurrency || prev.baseCurrency,
          numberGroupingConvention: numberPreferences?.numberGroupingConvention ?? parsed.numberGroupingConvention ?? "es-BO",
          maximumDecimalPlaces: numberPreferences?.maximumDecimalPlaces ?? parsed.maximumDecimalPlaces ?? 2,
        }));
      } catch {
        // ignore parse error
      }
    } else if (user) {
      setSettings((prev) => ({
        ...prev,
        fullName: getUserDisplayName(user),
        baseCurrency: user.preferredCurrency || prev.baseCurrency,
        numberGroupingConvention: numberPreferences?.numberGroupingConvention ?? "es-BO",
        maximumDecimalPlaces: numberPreferences?.maximumDecimalPlaces ?? 2,
      }));
    }
  }, [user, numberPreferences?.numberGroupingConvention, numberPreferences?.maximumDecimalPlaces]);

  // Save handler
  const handleSave = async () => {
    setSaving(true);
    try {
      // Persist number display preferences through the authenticated backend contract.
      if (user) {
        const token = defaultTokenStorage.getAccessToken();
        const repo = new FetchHttpClient({ authToken: token || undefined, userId: user.id });
        const updated = await repo.put<UserDto & { numberGroupingConvention: "es-BO" | "en-US"; maximumDecimalPlaces: number }>(
          "/v1/auth/number-format",
          {
            numberGroupingConvention: settings.numberGroupingConvention,
            maximumDecimalPlaces: settings.maximumDecimalPlaces,
          }
        );
        defaultTokenStorage.setUser(updated);
        setNumberFormatPreferences(updated.numberGroupingConvention, updated.maximumDecimalPlaces);
        window.dispatchEvent(new CustomEvent("billefy:number-format-updated", { detail: updated }));
      }

      // 1. Persist base currency to backend if authenticated
      if (settings.baseCurrency) {
        if (user) await updatePreferredCurrency(settings.baseCurrency);

        if (settings.baseCurrency === "BOB" || settings.baseCurrency === "USD") {
          onSelectCurrency(settings.baseCurrency);
        }
      }

      // 2. Persist theme
      if (settings.theme === "dark" || settings.theme === "light") {
        setTheme(settings.theme);
      }

      // 3. Persist all settings locally
      const storageKey = `billefy_settings_${user?.id || "guest"}`;
      localStorage.setItem(storageKey, JSON.stringify(settings));

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

  // Export User Data
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

  // Full Report Download
  const handleDownloadReport = () => {
    const reportText = `BILLEFY - REPORTE DE CONFIGURACIÓN Y ESTADO
==================================================
Fecha de emisión: ${new Date().toLocaleString()}
Usuario: ${settings.fullName}
Email: ${user?.email || "No registrado"}
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
Idioma: ${settings.language === "es" ? "Español" : "English"}
Formato de fecha: ${settings.dateFormat}
Inicio de semana: ${settings.weekStartsOn}

SEGURIDAD Y RESPALDOS
--------------------------------------------------
Proveedor de autenticación: Google OAuth
2FA: ${settings.twoFactorEnabled ? "Activada" : "Desactivada"}
Biometría / WebAuthn: ${settings.biometricsEnabled ? "Activada" : "Desactivada"}
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

  // Request Account Deletion
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
        // The reset succeeded; data will refresh when the user revisits the dashboard.
      }
      notify.success("Datos financieros borrados", "Tu cuenta, perfil y preferencias se conservaron.");
    } catch {
      notify.error("No se pudieron borrar los datos", "No se realizó el reinicio. Intenta nuevamente.");
    } finally {
      setResettingFinancialData(false);
    }
  };

  const isVisible = useCallback(
    (tab: SettingsTab) => activeTab === "todos" || activeTab === tab,
    [activeTab]
  );

  return (
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto pb-16">
      {/* 1. Header Bar matching docs/redesign/settings.png */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
            Configuración
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Personaliza tu experiencia, seguridad y preferencias financieras.
          </p>
        </div>

        <Button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-5 py-2.5 rounded-xl shadow-lg shadow-primary/25 transition flex items-center gap-2 self-start sm:self-auto cursor-pointer"
        >
          {saving ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          <span>{saving ? "Guardando..." : "Guardar cambios"}</span>
        </Button>
      </div>

      {/* 2. Navigation Pills Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
        {[
          { id: "perfil" as SettingsTab, label: "Perfil", icon: User },
          { id: "preferencias" as SettingsTab, label: "Preferencias", icon: SlidersHorizontal },
          { id: "seguridad" as SettingsTab, label: "Seguridad", icon: ShieldCheck },
          { id: "notificaciones" as SettingsTab, label: "Notificaciones", icon: Bell },
          { id: "moneda" as SettingsTab, label: "Moneda y región", icon: Globe },
          { id: "datos" as SettingsTab, label: "Datos", icon: Database },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(isActive ? "todos" : tab.id)}
              className={`h-9 px-4 rounded-xl text-xs font-bold flex items-center gap-2 transition shrink-0 ${
                isActive
                  ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                  : "bg-card border border-border text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
        {activeTab !== "todos" && (
          <button
            type="button"
            onClick={() => setActiveTab("todos")}
            className="h-9 px-3 text-xs font-semibold text-muted-foreground hover:text-foreground transition underline underline-offset-4"
          >
            Ver todas
          </button>
        )}
      </div>

      {/* 3. Main Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-5">
        {/* ROW 1: Perfil (col-span-4) | Preferencias (col-span-5) | Configuración saludable (col-span-3) */}

        {/* Card 1: Perfil de usuario */}
        {isVisible("perfil") && (
          <Card className="lg:col-span-4 p-5 flex flex-col justify-between gap-5 bg-card border-border">
            <div>
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-primary/15 text-primary flex items-center justify-center shrink-0">
                    <User className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-sm font-extrabold text-foreground leading-none">
                      Perfil de usuario
                    </h2>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Gestiona tu información personal y de contacto.
                    </p>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setEditProfileOpen(true)}
                  className="h-7 px-2.5 text-xs font-bold gap-1 rounded-lg border-border"
                >
                  <Pencil className="w-3 h-3" />
                  Editar
                </Button>
              </div>

              {/* Profile Details */}
              <div className="flex items-center gap-4 mt-4 pt-3 border-t border-border/60">
                <div className="relative shrink-0">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-extrabold text-xl shadow-md overflow-hidden">
                    {user?.pictureUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={user.pictureUrl}
                        alt={settings.fullName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      settings.fullName.charAt(0).toUpperCase()
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditProfileOpen(true)}
                    className="absolute bottom-0 right-0 w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-sm hover:scale-105 transition"
                    title="Cambiar foto de perfil"
                  >
                    <Camera className="w-2.5 h-2.5" />
                  </button>
                </div>

                <div className="flex flex-col gap-1 min-w-0">
                  <span className="text-base font-extrabold text-foreground truncate">
                    {settings.fullName}
                  </span>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground truncate">
                    <Mail className="w-3 h-3 shrink-0" />
                    <span className="truncate">{user?.email || "sin-correo@billefy.app"}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Phone className="w-3 h-3 shrink-0" />
                    <span>{settings.phone}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-muted/40 border border-border/50 text-[11px] text-muted-foreground flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              <span>Cuenta vinculada y verificada mediante Google OAuth</span>
            </div>
          </Card>
        )}

        {/* Card 2: Preferencias generales */}
        {isVisible("preferencias") && (
          <Card className="lg:col-span-5 p-5 flex flex-col justify-between gap-4 bg-card border-border">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/15 text-indigo-400 flex items-center justify-center shrink-0">
                <SlidersHorizontal className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-extrabold text-foreground leading-none">
                  Preferencias generales
                </h2>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Ajusta el idioma, tema y comportamiento de la aplicación.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-2.5 pt-2 border-t border-border/60">
              {/* Idioma */}
              <div className="grid grid-cols-2 items-center gap-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                  <Globe className="w-3.5 h-3.5" />
                  <span>Idioma</span>
                </div>
                <NativeSelect
                  size="sm"
                  value={settings.language}
                  onChange={(e) =>
                    setSettings((s) => ({ ...s, language: e.target.value }))
                  }
                >
                  <NativeSelectOption value="es">Español</NativeSelectOption>
                </NativeSelect>
              </div>

              {/* Tema */}
              <div className="grid grid-cols-2 items-center gap-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                  {settings.theme === "dark" ? (
                    <Moon className="w-3.5 h-3.5 text-indigo-400" />
                  ) : (
                    <Sun className="w-3.5 h-3.5 text-amber-500" />
                  )}
                  <span>Tema</span>
                </div>
                <NativeSelect
                  size="sm"
                  value={settings.theme}
                  onChange={(e) => {
                    const next = e.target.value as "dark" | "light" | "system";
                    setSettings((s) => ({ ...s, theme: next }));
                    if (next === "dark" || next === "light") {
                      setTheme(next);
                    }
                  }}
                >
                  <NativeSelectOption value="dark">Oscuro</NativeSelectOption>
                  <NativeSelectOption value="light">Claro</NativeSelectOption>
                  <NativeSelectOption value="system">Sistema</NativeSelectOption>
                </NativeSelect>
              </div>

              {/* Formato numérico */}
              <div className="grid grid-cols-2 items-center gap-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                  <Coins className="w-3.5 h-3.5" />
                  <span>Agrupación de números</span>
                </div>
                <NativeSelect size="sm" value={settings.numberGroupingConvention} onChange={(e) => setSettings((s) => ({ ...s, numberGroupingConvention: e.target.value as "es-BO" | "en-US" }))}>
                  <NativeSelectOption value="es-BO">Española (1.234,56)</NativeSelectOption>
                  <NativeSelectOption value="en-US">Internacional (1,234.56)</NativeSelectOption>
                </NativeSelect>
              </div>
              <div className="grid grid-cols-2 items-center gap-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                  <span>Decimales máximos</span>
                </div>
                <NativeSelect size="sm" value={String(settings.maximumDecimalPlaces)} onChange={(e) => setSettings((s) => ({ ...s, maximumDecimalPlaces: Number(e.target.value) as 0 | 2 | 4 | 6 }))}>
                  <NativeSelectOption value="0">0 decimales</NativeSelectOption>
                  <NativeSelectOption value="2">2 decimales</NativeSelectOption>
                  <NativeSelectOption value="4">4 decimales</NativeSelectOption>
                  <NativeSelectOption value="6">6 decimales</NativeSelectOption>
                </NativeSelect>
              </div>

              {/* Formato de fecha */}
              <div className="grid grid-cols-2 items-center gap-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Formato de fecha</span>
                </div>
                <NativeSelect
                  size="sm"
                  value={settings.dateFormat}
                  onChange={(e) =>
                    setSettings((s) => ({ ...s, dateFormat: e.target.value }))
                  }
                >
                  <NativeSelectOption value="DD/MM/AAAA">
                    DD/MM/AAAA (ej. 31/10/2026)
                  </NativeSelectOption>
                  <NativeSelectOption value="MM/DD/AAAA">
                    MM/DD/AAAA (ej. 10/31/2026)
                  </NativeSelectOption>
                  <NativeSelectOption value="AAAA-MM-DD">
                    AAAA-MM-DD (ej. 2026-10-31)
                  </NativeSelectOption>
                </NativeSelect>
              </div>

              {/* Inicio de semana */}
              <div className="grid grid-cols-2 items-center gap-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Inicio de semana</span>
                </div>
                <NativeSelect
                  size="sm"
                  value={settings.weekStartsOn}
                  onChange={(e) =>
                    setSettings((s) => ({ ...s, weekStartsOn: e.target.value }))
                  }
                >
                  <NativeSelectOption value="lunes">Lunes</NativeSelectOption>
                  <NativeSelectOption value="domingo">Domingo</NativeSelectOption>
                </NativeSelect>
              </div>

              {/* Dashboard por defecto */}
              <div className="grid grid-cols-2 items-center gap-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span>Dashboard por defecto</span>
                </div>
                <NativeSelect
                  size="sm"
                  value={settings.defaultDashboard}
                  onChange={(e) =>
                    setSettings((s) => ({ ...s, defaultDashboard: e.target.value }))
                  }
                >
                  <NativeSelectOption value="inicio">Resumen</NativeSelectOption>
                  <NativeSelectOption value="movimientos">Movimientos</NativeSelectOption>
                  <NativeSelectOption value="cuentas">Cuentas</NativeSelectOption>
                </NativeSelect>
              </div>
            </div>
          </Card>
        )}

        {/* Card 3: Configuración saludable */}
        {isVisible("preferencias") && (
          <Card className="lg:col-span-3 p-5 flex flex-col justify-between gap-4 bg-gradient-to-b from-card to-card/90 border-emerald-500/30 relative overflow-hidden">
            <div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-500 border border-emerald-500/30 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-5 h-5 stroke-[2.5]" />
                </div>
                <div>
                  <h2 className="text-sm font-extrabold text-foreground leading-none">
                    Configuración saludable
                  </h2>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Tu configuración está completa y optimizada para tu experiencia financiera.
                  </p>
                </div>
              </div>

              {/* Health checklist items */}
              <div className="flex flex-col gap-2 mt-4 pt-3 border-t border-border/60 text-xs">
                <div className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <Coins className="w-3.5 h-3.5 text-primary" />
                    Moneda base: <strong className="text-foreground">{settings.baseCurrency}</strong>
                  </span>
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                </div>

                <div className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                    Seguridad: <strong className="text-foreground">2FA Google</strong>
                  </span>
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                </div>

                <div className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-amber-500" />
                    Último respaldo: <strong className="text-foreground">hoy</strong>
                  </span>
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                </div>

                <div className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <RefreshCw className="w-3.5 h-3.5 text-indigo-400" />
                    Sincronización: <strong className="text-foreground">manual</strong>
                  </span>
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                </div>
              </div>
            </div>

            {/* Decorative bottom wave graphic */}
            <div className="w-full h-8 opacity-25 overflow-hidden -mb-2">
              <svg viewBox="0 0 300 40" fill="none" className="w-full h-full text-emerald-500">
                <path
                  d="M0 25 C50 10, 100 35, 150 15 C200 -5, 250 30, 300 20 L300 40 L0 40 Z"
                  fill="currentColor"
                />
              </svg>
            </div>
          </Card>
        )}

        {/* ROW 2: Moneda y región (col-span-4) | Seguridad (col-span-4) | Notificaciones (col-span-4) */}

        {/* Card 4: Moneda y región */}
        {isVisible("moneda") && (
          <Card className="lg:col-span-4 p-5 flex flex-col justify-between gap-4 bg-card border-border">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-primary/15 text-primary flex items-center justify-center shrink-0">
                <Globe className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-extrabold text-foreground leading-none">
                  Moneda y región
                </h2>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Define tu moneda, región y opciones de tipo de cambio.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3 pt-2 border-t border-border/60">
              {/* Moneda base */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                  <Coins className="w-3.5 h-3.5 text-primary" />
                  Moneda base
                </label>
                <NativeSelect
                  size="sm"
                  value={settings.baseCurrency}
                  onChange={(e) => {
                    const next = e.target.value;
                    setSettings((s) => ({ ...s, baseCurrency: next }));
                    if (next === "BOB" || next === "USD") {
                      onSelectCurrency(next);
                    }
                  }}
                >
                  {currencies.map((curr) => (
                    <NativeSelectOption key={curr.code} value={curr.code}>
                      {curr.code} – {curr.name} ({curr.symbol})
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </div>

              {/* Región */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5" />
                  Región
                </label>
                <NativeSelect
                  size="sm"
                  value={settings.region}
                  onChange={(e) =>
                    setSettings((s) => ({ ...s, region: e.target.value }))
                  }
                >
                  <NativeSelectOption value="Bolivia">Bolivia</NativeSelectOption>
                  <NativeSelectOption value="Estados Unidos">Estados Unidos</NativeSelectOption>
                  <NativeSelectOption value="Argentina">Argentina</NativeSelectOption>
                  <NativeSelectOption value="Chile">Chile</NativeSelectOption>
                  <NativeSelectOption value="Perú">Perú</NativeSelectOption>
                </NativeSelect>
              </div>

              {/* Zona horaria */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  Zona horaria
                </label>
                <NativeSelect
                  size="sm"
                  value={settings.timezone}
                  onChange={(e) =>
                    setSettings((s) => ({ ...s, timezone: e.target.value }))
                  }
                >
                  <NativeSelectOption value="GMT-4 (La Paz)">GMT-4 (La Paz)</NativeSelectOption>
                  <NativeSelectOption value="GMT-3 (Buenos Aires)">GMT-3 (Buenos Aires)</NativeSelectOption>
                  <NativeSelectOption value="GMT-5 (Bogotá)">GMT-5 (Bogotá)</NativeSelectOption>
                  <NativeSelectOption value="UTC">UTC (Universal)</NativeSelectOption>
                </NativeSelect>
              </div>

              {/* Switches */}
              <div className="pt-2 border-t border-border/50 flex flex-col gap-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-xs">
                    <span className="font-semibold text-foreground">Mostrar tasas de cambio</span>
                    <span title="Muestra cotización P2P en el topbar">
                      <Info className="w-3 h-3 text-muted-foreground" />
                    </span>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={settings.showExchangeRates}
                    onClick={() =>
                      setSettings((s) => ({
                        ...s,
                        showExchangeRates: !s.showExchangeRates,
                      }))
                    }
                    className={`w-9 h-5 rounded-full p-0.5 transition shrink-0 cursor-pointer ${
                      settings.showExchangeRates ? "bg-primary" : "bg-muted border border-border"
                    }`}
                  >
                    <span
                      className={`block w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${
                        settings.showExchangeRates ? "translate-x-4" : ""
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-xs">
                    <span className="font-semibold text-foreground">Actualizar tasas manualmente</span>
                    <span title="Permite forzar actualización bajo demanda">
                      <Info className="w-3 h-3 text-muted-foreground" />
                    </span>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={settings.manualRateRefresh}
                    onClick={() =>
                      setSettings((s) => ({
                        ...s,
                        manualRateRefresh: !s.manualRateRefresh,
                      }))
                    }
                    className={`w-9 h-5 rounded-full p-0.5 transition shrink-0 cursor-pointer ${
                      settings.manualRateRefresh ? "bg-primary" : "bg-muted border border-border"
                    }`}
                  >
                    <span
                      className={`block w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${
                        settings.manualRateRefresh ? "translate-x-4" : ""
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Card 5: Seguridad */}
        {isVisible("seguridad") && (
          <Card className="lg:col-span-4 p-5 flex flex-col justify-between gap-4 bg-card border-border">
            <div>
              <div className="flex items-center gap-2.5 mb-1.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/15 text-emerald-500 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-extrabold text-foreground leading-none">
                    Seguridad
                  </h2>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Protege tu cuenta y controla el acceso.
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-3 pt-2 border-t border-border/60">
                {/* Contraseña */}
                <div className="flex items-center justify-between p-2 rounded-xl bg-muted/30 border border-border/40">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <KeyRound className="w-3.5 h-3.5 text-primary" />
                      Contraseña
                    </span>
                    <Badge variant="secondary" className="w-fit text-[10px] mt-1 bg-emerald-500/15 text-emerald-500 border-none">
                      Actualizada (Google OAuth)
                    </Badge>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setPasswordInfoOpen(true)}
                    className="h-7 text-xs font-bold rounded-lg border-border"
                  >
                    Cambiar
                  </Button>
                </div>

                {/* 2FA */}
                <div className="flex items-center justify-between gap-2 p-2">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-foreground">
                      Autenticación en dos pasos (2FA)
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      Añade una capa extra de seguridad.
                    </span>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={settings.twoFactorEnabled}
                    onClick={() =>
                      setSettings((s) => ({
                        ...s,
                        twoFactorEnabled: !s.twoFactorEnabled,
                      }))
                    }
                    className={`w-9 h-5 rounded-full p-0.5 transition shrink-0 cursor-pointer ${
                      settings.twoFactorEnabled ? "bg-primary" : "bg-muted border border-border"
                    }`}
                  >
                    <span
                      className={`block w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${
                        settings.twoFactorEnabled ? "translate-x-4" : ""
                      }`}
                    />
                  </button>
                </div>

                {/* Biometría */}
                <div className="flex items-center justify-between gap-2 p-2">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <Fingerprint className="w-3.5 h-3.5 text-indigo-400" />
                      Biometría / WebAuthn
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      Usa tu huella o Face ID (si está disponible).
                    </span>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={settings.biometricsEnabled}
                    onClick={() =>
                      setSettings((s) => ({
                        ...s,
                        biometricsEnabled: !s.biometricsEnabled,
                      }))
                    }
                    className={`w-9 h-5 rounded-full p-0.5 transition shrink-0 cursor-pointer ${
                      settings.biometricsEnabled ? "bg-primary" : "bg-muted border border-border"
                    }`}
                  >
                    <span
                      className={`block w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${
                        settings.biometricsEnabled ? "translate-x-4" : ""
                      }`}
                    />
                  </button>
                </div>

                {/* Sesiones activas */}
                <div className="flex items-center justify-between p-2 rounded-xl bg-muted/30 border border-border/40">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <Monitor className="w-3.5 h-3.5" />
                      Sesiones activas
                    </span>
                    <span className="text-[11px] text-muted-foreground mt-0.5">
                      1 sesión activa (esta sesión)
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setSessionsOpen(true)}
                    className="h-7 text-xs font-bold rounded-lg border-border"
                  >
                    Ver sesiones
                  </Button>
                </div>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={() => {
                notify.success("Sesiones cerradas", "Se revocaron los accesos en otros navegadores.");
              }}
              className="w-full text-xs font-bold gap-2 rounded-xl border-border hover:bg-muted"
            >
              <LogOut className="w-3.5 h-3.5" />
              Cerrar otras sesiones
            </Button>
          </Card>
        )}

        {/* Card 6: Notificaciones */}
        {isVisible("notificaciones") && (
          <Card className="lg:col-span-4 p-5 flex flex-col justify-between gap-4 bg-card border-border">
            <div>
              <div className="flex items-center gap-2.5 mb-1.5">
                <div className="w-8 h-8 rounded-lg bg-primary/15 text-primary flex items-center justify-center shrink-0">
                  <Bell className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-extrabold text-foreground leading-none">
                    Notificaciones
                  </h2>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Elige qué alertas y recordatorios quieres recibir.
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-2.5 pt-2 border-t border-border/60">
                {/* 1. Recordatorios de presupuesto */}
                <div className="flex items-center justify-between gap-2 p-1.5">
                  <div className="flex items-start gap-2">
                    <Target className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-foreground">
                        Recordatorios de presupuesto
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        Avisos de control y límites de gasto.
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={settings.budgetAlerts}
                    onClick={() =>
                      setSettings((s) => ({ ...s, budgetAlerts: !s.budgetAlerts }))
                    }
                    className={`w-9 h-5 rounded-full p-0.5 transition shrink-0 cursor-pointer ${
                      settings.budgetAlerts ? "bg-primary" : "bg-muted border border-border"
                    }`}
                  >
                    <span
                      className={`block w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${
                        settings.budgetAlerts ? "translate-x-4" : ""
                      }`}
                    />
                  </button>
                </div>

                {/* 2. Vencimiento de deudas */}
                <div className="flex items-center justify-between gap-2 p-1.5">
                  <div className="flex items-start gap-2">
                    <Calendar className="w-3.5 h-3.5 text-amber-500 mt-0.5 shrink-0" />
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-foreground">
                        Alertas de vencimiento de deudas
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        Recordatorios antes del vencimiento.
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={settings.debtDueAlerts}
                    onClick={() =>
                      setSettings((s) => ({ ...s, debtDueAlerts: !s.debtDueAlerts }))
                    }
                    className={`w-9 h-5 rounded-full p-0.5 transition shrink-0 cursor-pointer ${
                      settings.debtDueAlerts ? "bg-primary" : "bg-muted border border-border"
                    }`}
                  >
                    <span
                      className={`block w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${
                        settings.debtDueAlerts ? "translate-x-4" : ""
                      }`}
                    />
                  </button>
                </div>

                {/* 3. Metas */}
                <div className="flex items-center justify-between gap-2 p-1.5">
                  <div className="flex items-start gap-2">
                    <Flag className="w-3.5 h-3.5 text-indigo-400 mt-0.5 shrink-0" />
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-foreground">Metas</span>
                      <span className="text-[11px] text-muted-foreground">
                        Avances, hitos y metas por cumplir.
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={settings.goalsAlerts}
                    onClick={() =>
                      setSettings((s) => ({ ...s, goalsAlerts: !s.goalsAlerts }))
                    }
                    className={`w-9 h-5 rounded-full p-0.5 transition shrink-0 cursor-pointer ${
                      settings.goalsAlerts ? "bg-primary" : "bg-muted border border-border"
                    }`}
                  >
                    <span
                      className={`block w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${
                        settings.goalsAlerts ? "translate-x-4" : ""
                      }`}
                    />
                  </button>
                </div>

                {/* 4. Movimientos grandes */}
                <div className="flex items-center justify-between gap-2 p-1.5">
                  <div className="flex items-start gap-2">
                    <ArrowLeftRight className="w-3.5 h-3.5 text-rose-500 mt-0.5 shrink-0" />
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-foreground">
                        Movimientos grandes
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        Aviso por transacciones superiores a tu límite.
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={settings.largeMovementsAlerts}
                    onClick={() =>
                      setSettings((s) => ({
                        ...s,
                        largeMovementsAlerts: !s.largeMovementsAlerts,
                      }))
                    }
                    className={`w-9 h-5 rounded-full p-0.5 transition shrink-0 cursor-pointer ${
                      settings.largeMovementsAlerts ? "bg-primary" : "bg-muted border border-border"
                    }`}
                  >
                    <span
                      className={`block w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${
                        settings.largeMovementsAlerts ? "translate-x-4" : ""
                      }`}
                    />
                  </button>
                </div>

                {/* 5. Resumen semanal */}
                <div className="flex items-center justify-between gap-2 p-1.5">
                  <div className="flex items-start gap-2">
                    <Mail className="w-3.5 h-3.5 text-emerald-500 mt-0.5 shrink-0" />
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-foreground">
                        Resumen semanal
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        Un resumen de tu actividad financiera.
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={settings.weeklySummary}
                    onClick={() =>
                      setSettings((s) => ({ ...s, weeklySummary: !s.weeklySummary }))
                    }
                    className={`w-9 h-5 rounded-full p-0.5 transition shrink-0 cursor-pointer ${
                      settings.weeklySummary ? "bg-primary" : "bg-muted border border-border"
                    }`}
                  >
                    <span
                      className={`block w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${
                        settings.weeklySummary ? "translate-x-4" : ""
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* ROW 3: Cuentas conectadas (col-span-5) | Privacidad y datos (col-span-7) */}

        {/* Card 7: Cuentas conectadas / fuentes de datos */}
        {isVisible("datos") && (
          <Card className="lg:col-span-5 p-5 flex flex-col justify-between gap-4 bg-card border-border">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <div className="w-8 h-8 rounded-lg bg-primary/15 text-primary flex items-center justify-center shrink-0">
                  <Link2 className="w-4 h-4" />
                </div>
                <div className="flex items-center gap-1.5">
                  <h2 className="text-sm font-extrabold text-foreground leading-none">
                    Cuentas conectadas / fuentes de datos
                  </h2>
                  <span title="Conexiones y fuentes manuales">
                    <Info className="w-3.5 h-3.5 text-muted-foreground" />
                  </span>
                </div>
              </div>

              <p className="text-[11px] text-muted-foreground leading-relaxed pt-1">
                Billefy funciona principalmente con seguimiento manual de tus finanzas (tú registras
                tus movimientos, cuentas e inversiones). También puedes importar datos de forma
                opcional desde archivos (CSV/Excel). No realizamos conexiones en tiempo real con bancos.
              </p>

              {/* 3 Source Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mt-4 pt-2 border-t border-border/60">
                {/* Banco (manual) */}
                <div className="p-3 rounded-xl bg-muted/30 border border-border/50 flex flex-col justify-between gap-2">
                  <div className="flex items-center justify-between">
                    <div className="w-7 h-7 rounded-lg bg-primary/15 text-primary flex items-center justify-center">
                      <Landmark className="w-3.5 h-3.5" />
                    </div>
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-foreground block">Banco (manual)</span>
                    <span className="text-[10px] text-muted-foreground">Seguimiento manual</span>
                  </div>
                </div>

                {/* Binance (API de solo lectura) */}
                <button
                  type="button"
                  onClick={onOpenBinance}
                  className="p-3 rounded-xl bg-muted/30 border border-border/50 hover:bg-muted/60 transition text-left flex flex-col justify-between gap-2 cursor-pointer group"
                >
                  <div className="flex items-center justify-between">
                    <div className="w-7 h-7 rounded-lg bg-amber-500/15 text-amber-500 flex items-center justify-center">
                      <Coins className="w-3.5 h-3.5" />
                    </div>
                    {binanceStatus?.connected ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <span className="text-[10px] text-amber-400 font-semibold">Configurar</span>
                    )}
                  </div>
                  <div>
                    <span className="text-xs font-bold text-foreground group-hover:text-primary transition block">
                      Binance (manual)
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {binanceStatus?.connected && binanceStatus.maskedApiKey
                        ? `Conectado (${binanceStatus.maskedApiKey})`
                        : "Sincronización API (solo lectura)"}
                    </span>
                  </div>
                </button>

                {/* Payoneer (manual) */}
                <button
                  type="button"
                  onClick={onOpenCsv}
                  className="p-3 rounded-xl bg-muted/30 border border-border/50 hover:bg-muted/60 transition text-left flex flex-col justify-between gap-2 cursor-pointer group"
                >
                  <div className="flex items-center justify-between">
                    <div className="w-7 h-7 rounded-lg bg-teal-500/15 text-teal-400 flex items-center justify-center">
                      <FileSpreadsheet className="w-3.5 h-3.5" />
                    </div>
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-foreground group-hover:text-primary transition block">
                      Payoneer (manual)
                    </span>
                    <span className="text-[10px] text-muted-foreground">Importación opcional</span>
                  </div>
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs pt-1">
              <button
                type="button"
                onClick={onOpenWhatsApp}
                className="text-emerald-500 hover:underline font-bold text-[11px]"
              >
                Configurar Bot WhatsApp →
              </button>
              <button
                type="button"
                onClick={onOpenFxTransfer}
                className="text-primary hover:underline font-bold text-[11px]"
              >
                Transferir FX (P2P) →
              </button>
            </div>
          </Card>
        )}

        {/* Card 8: Privacidad y datos */}
        {isVisible("datos") && (
          <Card className="lg:col-span-7 p-5 flex flex-col justify-between gap-4 bg-card border-border">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <div className="w-8 h-8 rounded-lg bg-primary/15 text-primary flex items-center justify-center shrink-0">
                  <Database className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-extrabold text-foreground leading-none">
                    Privacidad y datos
                  </h2>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Gestiona tus datos, exportaciones y respaldos.
                  </p>
                </div>
              </div>

              {/* Actions Grid matching design */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mt-3 pt-2 border-t border-border/60">
                {/* 1. Exportar datos */}
                <button
                  type="button"
                  onClick={handleExportData}
                  className="p-3 rounded-xl bg-muted/30 border border-border/50 hover:bg-muted/70 transition text-left flex items-center gap-3 cursor-pointer group"
                >
                  <div className="w-8 h-8 rounded-lg bg-primary/15 text-primary flex items-center justify-center shrink-0">
                    <Cloud className="w-4 h-4" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-bold text-foreground group-hover:text-primary transition truncate">
                      Exportar datos
                    </span>
                    <span className="text-[10px] text-muted-foreground truncate">
                      (CSV o JSON)
                    </span>
                  </div>
                </button>

                {/* 2. Importar CSV */}
                <button
                  type="button"
                  onClick={onOpenCsv}
                  className="p-3 rounded-xl bg-muted/30 border border-border/50 hover:bg-muted/70 transition text-left flex items-center gap-3 cursor-pointer group"
                >
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/15 text-indigo-400 flex items-center justify-center shrink-0">
                    <FileSpreadsheet className="w-4 h-4" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-bold text-foreground group-hover:text-primary transition truncate">
                      Importar CSV
                    </span>
                    <span className="text-[10px] text-muted-foreground truncate">
                      (movimientos, cuentas)
                    </span>
                  </div>
                </button>

                {/* 3. Respaldo automático */}
                <div className="p-3 rounded-xl bg-muted/30 border border-border/50 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/15 text-emerald-500 flex items-center justify-center shrink-0">
                      <Cloud className="w-4 h-4" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-bold text-foreground truncate">
                        Respaldo automático
                      </span>
                      <span className="text-[10px] text-emerald-500 font-bold truncate">
                        Activado
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={settings.autoBackup}
                    onClick={() =>
                      setSettings((s) => ({ ...s, autoBackup: !s.autoBackup }))
                    }
                    className={`w-9 h-5 rounded-full p-0.5 transition shrink-0 cursor-pointer ${
                      settings.autoBackup ? "bg-primary" : "bg-muted border border-border"
                    }`}
                  >
                    <span
                      className={`block w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${
                        settings.autoBackup ? "translate-x-4" : ""
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Row: Descargar reporte completo & Eliminar cuenta */}
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2.5 mt-2.5">
                {/* Descargar reporte completo */}
                <button
                  type="button"
                  onClick={handleDownloadReport}
                  className="p-3 rounded-xl bg-muted/30 border border-border/50 hover:bg-muted/70 transition text-left flex items-center gap-3 cursor-pointer group"
                >
                  <div className="w-8 h-8 rounded-lg bg-primary/15 text-primary flex items-center justify-center shrink-0">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-bold text-foreground group-hover:text-primary transition truncate">
                      Descargar reporte completo
                    </span>
                    <span className="text-[10px] text-muted-foreground truncate">
                      (Resumen financiero con tu configuración)
                    </span>
                  </div>
                </button>

                {/* Danger zone: financial-data reset; separate from account deletion. */}
                <div className="p-3 rounded-xl border border-rose-500/30 bg-rose-500/5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-rose-500/15 text-rose-500 flex items-center justify-center shrink-0">
                      <Trash2 className="w-4 h-4" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-bold text-rose-400 truncate">
                        Borrar datos financieros
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        Conserva tu cuenta, perfil y preferencias.
                      </span>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={() => setResetFinancialDataOpen(true)}
                    className="h-7 text-xs font-bold shrink-0 rounded-lg"
                  >
                    Borrar
                  </Button>
                </div>

                {/* Danger zone: Eliminar cuenta */}
                <div className="p-3 rounded-xl border border-rose-500/30 bg-rose-500/5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-rose-500/15 text-rose-500 flex items-center justify-center shrink-0">
                      <Trash2 className="w-4 h-4" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-bold text-rose-400 truncate">
                        Eliminar cuenta
                      </span>
                      <span className="text-[10px] text-muted-foreground truncate">
                        Elimina permanentemente tu cuenta y datos.
                      </span>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={() => setDeleteAccountOpen(true)}
                    className="h-7 text-xs font-bold shrink-0 rounded-lg"
                  >
                    Eliminar
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* MODAL 1: Editar Perfil */}
      <ResponsiveDrawer
        open={editProfileOpen}
        onOpenChange={(open) => setEditProfileOpen(open)}
        title="Editar Perfil"
        description="Actualiza tu nombre y teléfono de contacto."
        size="sm"
        footer={
          <div className="flex justify-end gap-2 w-full">
            <Button
              type="button"
              variant="outline"
              onClick={() => setEditProfileOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={() => {
                setEditProfileOpen(false);
                notify.success("Perfil actualizado", "Los datos locales se guardaron.");
              }}
            >
              Aceptar
            </Button>
          </div>
        }
      >
        <div className="flex flex-col gap-4 py-2">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-muted-foreground">Nombre completo</label>
            <Input
              value={settings.fullName}
              onChange={(e) =>
                setSettings((s) => ({ ...s, fullName: e.target.value }))
              }
              placeholder="Tu nombre completo"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-muted-foreground">Teléfono</label>
            <Input
              value={settings.phone}
              onChange={(e) =>
                setSettings((s) => ({ ...s, phone: e.target.value }))
              }
              placeholder="+591 ..."
            />
          </div>

          <div className="p-3 rounded-xl bg-muted/40 border border-border text-xs text-muted-foreground flex items-center gap-2">
            <Mail className="w-3.5 h-3.5 shrink-0" />
            <span>Correo asociado: {user?.email || "No vinculado"}</span>
          </div>
        </div>
      </ResponsiveDrawer>

      {/* MODAL 2: Seguridad y Contraseña */}
      <ResponsiveDrawer
        open={passwordInfoOpen}
        onOpenChange={(open) => setPasswordInfoOpen(open)}
        title="Seguridad de Contraseña"
        description="Gestión de credenciales con Google OAuth."
        size="sm"
        footer={
          <Button
            type="button"
            onClick={() => setPasswordInfoOpen(false)}
            className="w-full"
          >
            Entendido
          </Button>
        }
      >
        <div className="flex flex-col gap-3 py-3 text-xs leading-relaxed text-muted-foreground">
          <div className="p-3.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-foreground flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
            <div>
              <strong className="block text-sm font-bold text-foreground mb-1">
                Autenticación segura federada
              </strong>
              Tu cuenta de Billefy utiliza inicio de sesión único con Google OAuth 2.0. No almacenamos
              contraseñas en nuestros servidores. Para actualizar tu clave de acceso o la verificación
              en dos pasos, gestionala directamente desde tu cuenta de Google.
            </div>
          </div>
        </div>
      </ResponsiveDrawer>

      {/* MODAL 3: Sesiones Activas */}
      <ResponsiveDrawer
        open={sessionsOpen}
        onOpenChange={(open) => setSessionsOpen(open)}
        title="Sesiones Activas"
        description="Dispositivos y navegadores con acceso autorizado a tu cuenta."
        size="sm"
        footer={
          <Button
            type="button"
            onClick={() => setSessionsOpen(false)}
            className="w-full"
          >
            Cerrar
          </Button>
        }
      >
        <div className="flex flex-col gap-3 py-2">
          <div className="p-3 rounded-xl bg-card border border-border flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Monitor className="w-5 h-5 text-primary" />
              <div className="flex flex-col">
                <span className="text-xs font-bold text-foreground">
                  Navegador Web Actual
                </span>
                <span className="text-[11px] text-muted-foreground">
                  Esta sesión activa • Conectado ahora
                </span>
              </div>
            </div>
            <Badge variant="secondary" className="text-[10px] bg-emerald-500/15 text-emerald-500 border-none">
              Activo
            </Badge>
          </div>
        </div>
      </ResponsiveDrawer>

      {/* MODAL 4: Confirmar Eliminación de Cuenta */}
      <ResponsiveDrawer
        open={deleteAccountOpen}
        onOpenChange={(open) => setDeleteAccountOpen(open)}
        title="¿Eliminar cuenta?"
        description="Esta acción iniciará un período de gracia de 30 días según la política de privacidad."
        size="sm"
        footer={
          <div className="flex justify-end gap-2 w-full">
            <Button
              type="button"
              variant="outline"
              disabled={deletingAccount}
              onClick={() => setDeleteAccountOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={deletingAccount}
              onClick={handleDeleteAccount}
            >
              {deletingAccount ? "Procesando..." : "Confirmar eliminación"}
            </Button>
          </div>
        }
      >
        <div className="flex flex-col gap-3 py-2 text-xs text-muted-foreground">
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <strong className="block text-foreground font-bold mb-1">
                Período de gracia de 30 días (Regla AUTH-06)
              </strong>
              Tus datos financieros serán programados para eliminación permanente. Si inicias sesión
              nuevamente dentro de los próximos 30 días, podrás cancelar la solicitud de baja.
            </div>
          </div>
        </div>
      </ResponsiveDrawer>

      {/* Separate confirmation: financial records only; never account/profile/preferences. */}
      <ResponsiveDrawer
        open={resetFinancialDataOpen}
        onOpenChange={(open) => !resettingFinancialData && setResetFinancialDataOpen(open)}
        title="¿Borrar tus datos financieros?"
        description="Se eliminarán tus registros financieros para que puedas empezar de nuevo."
        size="sm"
        footer={
          <div className="flex justify-end gap-2 w-full">
            <Button
              type="button"
              variant="outline"
              disabled={resettingFinancialData}
              onClick={() => setResetFinancialDataOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={resettingFinancialData}
              onClick={handleResetFinancialData}
            >
              {resettingFinancialData ? "Borrando..." : "Confirmar borrado"}
            </Button>
          </div>
        }
      >
        <div className="flex flex-col gap-3 py-2 text-xs text-muted-foreground">
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <strong className="block text-foreground font-bold mb-1">Esta acción no se puede deshacer.</strong>
              Se borrarán cuentas, movimientos, datos de importación, préstamos, presupuestos, metas e inversiones.
              <strong className="block text-foreground font-bold mt-2">Tu cuenta, perfil y preferencias no se borrarán.</strong>
              Para eliminar tu cuenta completa, usa por separado la opción “Eliminar cuenta”.
            </div>
          </div>
        </div>
      </ResponsiveDrawer>
    </div>
  );
}
