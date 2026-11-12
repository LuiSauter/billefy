"use client";

import React, { useState, useCallback } from "react";
import { Wallet, AlertCircle, Eye, EyeOff, Mail, Lock, User as UserIcon } from "lucide-react";
import { useAuth } from "../application/AuthContext";
import { GoogleSignInButton } from "./GoogleSignInButton";
import { PasswordStrengthIndicator } from "./PasswordStrengthIndicator";
import { validatePassword } from "../domain/password-policy";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { FormField } from "@/shared/ui/form-field";
import { Amount } from "@/shared/ui/amount";

interface AuthScreenProps {
  p2pRate?: number;
  onLoginSuccess?: () => void;
}

export function AuthScreen({ p2pRate = 9.85, onLoginSuccess }: AuthScreenProps) {
  const { loginWithGoogle, loginWithPassword, registerWithPassword, isLoading, error, clearError } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [localLoading, setLocalLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  // Form fields
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const passwordValidation = validatePassword(password);
  const passwordsMatch = mode === "login" || !confirmPassword || password === confirmPassword;

  const busy = isLoading || localLoading;
  const displayError = localError || error;

  const handleModeChange = (newMode: "login" | "register") => {
    setMode(newMode);
    setLocalError(null);
    clearError();
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    clearError();

    if (!email.trim() || !password) {
      setLocalError("Por favor completa todos los campos requeridos.");
      return;
    }

    if (mode === "register") {
      if (!fullName.trim()) {
        setLocalError("Por favor ingresa tu nombre completo.");
        return;
      }
      if (!passwordValidation.isValid) {
        setLocalError("La contraseña debe cumplir con todos los requisitos de seguridad.");
        return;
      }
      if (password !== confirmPassword) {
        setLocalError("Las contraseñas no coinciden.");
        return;
      }
    }

    setLocalLoading(true);
    try {
      if (mode === "register") {
        await registerWithPassword(fullName.trim(), email.trim(), password);
      } else {
        await loginWithPassword(email.trim(), password);
      }
      onLoginSuccess?.();
    } catch (err: unknown) {
      setLocalError(
        err instanceof Error
          ? err.message
          : "Error al procesar la autenticación."
      );
    } finally {
      setLocalLoading(false);
    }
  };

  const handleCredential = useCallback(
    async (credential: string) => {
      setLocalLoading(true);
      setLocalError(null);
      clearError();
      try {
        await loginWithGoogle(credential);
        onLoginSuccess?.();
      } catch (err: unknown) {
        setLocalError(
          err instanceof Error
            ? err.message
            : "No se pudo autenticar con Google. Verifica tu conexión o intenta nuevamente."
        );
      } finally {
        setLocalLoading(false);
      }
    },
    [loginWithGoogle, clearError, onLoginSuccess]
  );

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-background font-sans">
      {/* Brand & Value Proposition Sidebar */}
      <div className="lg:w-[600px] bg-sidebar border-b lg:border-b-0 lg:border-r border-border text-foreground p-6 lg:p-12 flex flex-col justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-[40px] h-[40px] rounded-[10px] bg-primary/15 border border-primary/30 flex items-center justify-center text-primary shrink-0 shadow-2xs">
            <Wallet className="w-[20px] h-[20px]" />
          </div>
          <span className="text-[22px] font-black tracking-tight text-foreground">Billefy</span>
        </div>

        <div className="my-6 lg:my-0 flex flex-col gap-3 lg:gap-4 max-w-[530px]">
          <h1 className="text-[26px] lg:text-[32px] font-black leading-tight text-foreground">
            Gestioná tus bolivianos, dólares y cripto con tasas Binance P2P en vivo.
          </h1>
          <p className="text-sm lg:text-[15px] font-medium text-muted-foreground leading-relaxed">
            Libro mayor inmutable, conciliación automática por WhatsApp y planificación patrimonial 50/30/20.
          </p>

          <div className="self-start mt-2 px-4 py-2 rounded-full bg-accent border border-primary/30 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
            <span className="text-sm font-bold text-accent-foreground">
              Cotización P2P en Vivo: 1 USDT = <Amount value={p2pRate} currency="BOB" size="inherit" tone="inherit" />
            </span>
          </div>
        </div>

        <div className="text-xs font-medium text-muted-foreground">
          Billefy Financial Technologies © 2026 · Autenticación segura y libro mayor inmutable
        </div>
      </div>

      {/* Auth Card Container */}
      <div className="flex-1 bg-card p-6 lg:p-12 flex items-center justify-center overflow-y-auto">
        <div className="w-full max-w-[440px] flex flex-col gap-5 py-4">
          {/* Mode Switch Tabs */}
          <div className="flex rounded-xl bg-muted p-1 border border-border/60">
            <button
              type="button"
              onClick={() => handleModeChange("login")}
              className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${
                mode === "login"
                  ? "bg-card text-foreground shadow-xs border border-border/80"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Iniciar Sesión
            </button>
            <button
              type="button"
              onClick={() => handleModeChange("register")}
              className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${
                mode === "register"
                  ? "bg-card text-foreground shadow-xs border border-border/80"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Crear Cuenta
            </button>
          </div>

          <div>
            <h2 className="text-[24px] lg:text-[28px] font-black text-foreground tracking-tight">
              {mode === "login" ? "Bienvenido de vuelta" : "Crear tu cuenta"}
            </h2>
            <p className="text-sm font-medium text-muted-foreground mt-1">
              {mode === "login"
                ? "Ingresá con tu email y contraseña para continuar."
                : "Completá tus datos para empezar a gestionar tus finanzas."}
            </p>
          </div>

          {displayError && (
            <div className="p-3.5 rounded-[12px] bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{displayError}</span>
            </div>
          )}

          {/* Email & Password Form */}
          <form onSubmit={handlePasswordSubmit} className="space-y-3.5">
            {mode === "register" && (
              <FormField label="Nombre completo" required>
                <div className="relative">
                  <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Ej: Luis Gabriel Janco"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    disabled={busy}
                    className="pl-10"
                    autoComplete="name"
                    required
                  />
                </div>
              </FormField>
            )}

            <FormField label="Correo electrónico" required>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="email"
                  placeholder="tu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={busy}
                  className="pl-10"
                  autoComplete="email"
                  required
                />
              </div>
            </FormField>

            <FormField label="Contraseña" required>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder={mode === "register" ? "Contraseña segura" : "Tu contraseña"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={busy}
                  className="pl-10 pr-10"
                  autoComplete={mode === "register" ? "new-password" : "current-password"}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition p-1"
                  tabIndex={-1}
                  aria-label={showPassword ? "Ocultar contraseña" : "Ver contraseña"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </FormField>

            {/* Real-time Password Strength Indicator (only in registration mode) */}
            {mode === "register" && (
              <PasswordStrengthIndicator password={password} />
            )}

            {mode === "register" && (
              <FormField
                label="Confirmar contraseña"
                required
                error={!passwordsMatch ? "Las contraseñas no coinciden" : undefined}
              >
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="Repetí tu contraseña"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={busy}
                    className="pl-10"
                    autoComplete="new-password"
                    required
                  />
                </div>
              </FormField>
            )}

            <Button
              type="submit"
              size="lg"
              loading={busy}
              disabled={
                busy ||
                !email.trim() ||
                !password ||
                (mode === "register" && (!fullName.trim() || !passwordValidation.isValid || !passwordsMatch))
              }
              className="w-full mt-2 font-bold"
            >
              {mode === "login" ? "Iniciar Sesión" : "Crear Cuenta"}
            </Button>
          </form>

          {/* Social Divider */}
          <div className="relative my-1">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border/80" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-3 text-muted-foreground font-semibold tracking-wider">
                O continuar con Google
              </span>
            </div>
          </div>

          <GoogleSignInButton
            busy={busy}
            onCredential={handleCredential}
            onConfigError={(msg) => {
              clearError();
              setLocalError(msg);
            }}
          />

          <p className="text-xs text-center text-muted-foreground leading-tight">
            Al continuar, aceptas la política de privacidad y el libro mayor inmutable de Billefy. Tu moneda y cuentas se configuran una vez dentro de la aplicación.
          </p>
        </div>
      </div>
    </div>
  );
}
