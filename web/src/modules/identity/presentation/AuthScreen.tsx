"use client";

import React, { useState, useCallback } from "react";
import { Wallet, AlertCircle } from "lucide-react";
import { useAuth } from "../application/AuthContext";
import { GoogleSignInButton } from "./GoogleSignInButton";

interface AuthScreenProps {
  p2pRate?: number;
  onLoginSuccess?: () => void;
}

export function AuthScreen({ p2pRate = 9.85, onLoginSuccess }: AuthScreenProps) {
  const { loginWithGoogle, isLoading, error, clearError } = useAuth();
  const [localLoading, setLocalLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

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

  const busy = isLoading || localLoading;
  const displayError = localError || error;

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-background font-sans">
      <div className="lg:w-[640px] bg-sidebar border-b lg:border-b-0 lg:border-r border-border text-foreground p-6 lg:p-12 flex flex-col justify-between shrink-0">
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
              Cotización P2P en Vivo: 1 USDT = Bs. {p2pRate.toFixed(2)}
            </span>
          </div>
        </div>

        <div className="text-xs font-medium text-muted-foreground">
          Billefy Financial Technologies © 2026 · Acceso restringido por Google OAuth
        </div>
      </div>

      <div className="flex-1 bg-card p-6 lg:p-16 flex items-center justify-center">
        <div className="w-full max-w-[440px] flex flex-col gap-6">
          <div>
            <h2 className="text-[28px] font-black text-foreground tracking-tight">
              Iniciar Sesión
            </h2>
            <p className="text-sm font-medium text-muted-foreground mt-1">
              Acceso exclusivo mediante tu cuenta de Google. Sin contraseñas ni correos manuales.
            </p>
          </div>

          {displayError && (
            <div className="p-4 rounded-[14px] bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{displayError}</span>
            </div>
          )}

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
