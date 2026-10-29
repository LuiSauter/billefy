"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Script from "next/script";
import { Wallet, AlertCircle, Loader2 } from "lucide-react";
import { useAuth } from "@/presentation/context/AuthContext";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (res: { credential: string }) => void;
            auto_select?: boolean;
          }) => void;
          renderButton: (
            parent: HTMLElement,
            options: {
              theme?: "outline" | "filled_blue" | "filled_black";
              size?: "large" | "medium" | "small";
              text?: "signin_with" | "signup_with" | "continue_with";
              shape?: "rectangular" | "pill" | "circle";
              width?: string | number;
            }
          ) => void;
          prompt: () => void;
        };
      };
    };
  }
}

interface AuthScreenProps {
  p2pRate?: number;
  onLoginSuccess?: () => void;
}

export function AuthScreen({ p2pRate = 9.85, onLoginSuccess }: AuthScreenProps) {
  const { loginWithGoogle, isLoading, error, clearError } = useAuth();
  const [localLoading, setLocalLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [gsiRendered, setGsiRendered] = useState(false);
  const googleBtnRef = useRef<HTMLDivElement>(null);

  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";
  const hasClientId = Boolean(
    googleClientId && !googleClientId.includes("your-google-client-id")
  );

  const handleCredentialResponse = useCallback(
    async (response: { credential: string }) => {
      setLocalLoading(true);
      setLocalError(null);
      clearError();
      try {
        await loginWithGoogle(response.credential);
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

  // Initialize Google Identity Services
  const initGoogleGsi = useCallback(() => {
    if (typeof window !== "undefined" && window.google?.accounts?.id && hasClientId) {
      try {
        window.google.accounts.id.initialize({
          client_id: googleClientId,
          callback: handleCredentialResponse,
          auto_select: false,
        });

        if (googleBtnRef.current) {
          googleBtnRef.current.innerHTML = "";
          window.google.accounts.id.renderButton(googleBtnRef.current, {
            theme: "outline",
            size: "large",
            text: "continue_with",
            shape: "rectangular",
            width: 360,
          });
          setGsiRendered(true);
        }
      } catch (err) {
        console.warn("Google GSI initialization error:", err);
      }
    }
  }, [googleClientId, hasClientId, handleCredentialResponse]);

  useEffect(() => {
    initGoogleGsi();
  }, [initGoogleGsi]);

  const handleGoogleClick = async () => {
    setLocalLoading(true);
    setLocalError(null);
    clearError();

    // If Google GSI is configured, trigger Google prompt
    if (typeof window !== "undefined" && window.google?.accounts?.id && hasClientId) {
      try {
        window.google.accounts.id.prompt();
        setLocalLoading(false);
        return;
      } catch (err) {
        console.warn("Google prompt error:", err);
      }
    }

    if (!hasClientId) {
      setLocalError(
        "Falta configurar NEXT_PUBLIC_GOOGLE_CLIENT_ID en tu archivo .env.local (ver web/env.example)."
      );
      setLocalLoading(false);
      return;
    }

    setLocalLoading(false);
  };

  const busy = isLoading || localLoading;
  const displayError = localError || error;

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-slate-900 font-sans">
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
        onLoad={initGoogleGsi}
      />

      {/* Left Column: Hero (OpenPencil HeroLeft n2389) */}
      <div className="lg:w-[640px] bg-slate-900 text-white p-6 lg:p-12 flex flex-col justify-between shrink-0">
        {/* HLTop: Logo */}
        <div className="flex items-center gap-3">
          <div className="w-[40px] h-[40px] rounded-[10px] bg-slate-800 flex items-center justify-center text-white shrink-0 shadow-2xs">
            <Wallet className="w-[20px] h-[20px]" />
          </div>
          <span className="text-[22px] font-black tracking-tight text-white">
            Billefy
          </span>
        </div>

        {/* HLMid: Value Prop */}
        <div className="my-6 lg:my-0 flex flex-col gap-3 lg:gap-4 max-w-[530px]">
          <h1 className="text-[26px] lg:text-[32px] font-black leading-tight text-white">
            Gestioná tus bolivianos, dólares y cripto con tasas Binance P2P en vivo.
          </h1>
          <p className="text-sm lg:text-[15px] font-medium text-slate-500 leading-relaxed">
            Libro mayor inmutable, conciliación automática por WhatsApp y planificación patrimonial 50/30/20.
          </p>

          {/* P2PLiveCard */}
          <div className="self-start mt-2 px-4 py-2 rounded-full bg-slate-800 border border-slate-700/50 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
            <span className="text-sm font-bold text-blue-400">
              Cotización P2P en Vivo: 1 USDT = Bs. {p2pRate.toFixed(2)}
            </span>
          </div>
        </div>

        {/* HLBottom: Copyright */}
        <div className="text-xs font-medium text-muted-foreground">
          Billefy Financial Technologies © 2024 · Acceso restringido por Google OAuth
        </div>
      </div>

      {/* Right Column: Google OAuth Only Form (OpenPencil FormRight n2389 & n2134) */}
      <div className="flex-1 bg-white p-6 lg:p-16 flex items-center justify-center">
        <div className="w-full max-w-[440px] flex flex-col gap-6">
          {/* FRHead */}
          <div>
            <h2 className="text-[28px] font-black text-foreground tracking-tight">
              Iniciar Sesión
            </h2>
            <p className="text-sm font-medium text-muted-foreground mt-1">
              Acceso exclusivo mediante tu cuenta de Google. Sin contraseñas ni correos manuales.
            </p>
          </div>

          {/* Error Banner */}
          {displayError && (
            <div className="p-4 rounded-[14px] bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{displayError}</span>
            </div>
          )}

          {/* Exactly ONE Google Login Button Container */}
          <div className="flex justify-center w-full">
            {hasClientId && (
              <div
                ref={googleBtnRef}
                className={gsiRendered ? "w-full flex justify-center" : "hidden"}
              />
            )}

            {(!hasClientId || !gsiRendered) && (
              <button
                type="button"
                disabled={busy}
                onClick={handleGoogleClick}
                className="w-full h-[52px] px-6 rounded-[14px] border border-slate-300 bg-white hover:bg-slate-50 text-[15px] font-extrabold text-foreground transition flex items-center justify-center gap-3 shadow-2xs active:scale-[0.99] disabled:opacity-60"
              >
                {busy ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin text-primary" />
                    <span>Autenticando con Google...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                      />
                    </svg>
                    <span>Continuar con Google</span>
                  </>
                )}
              </button>
            )}
          </div>

          <p className="text-xs text-center text-muted-foreground leading-tight">
            Al continuar, aceptas la política de privacidad y el libro mayor inmutable de Billefy. Tu moneda y cuentas se configuran una vez dentro de la aplicación.
          </p>
        </div>
      </div>
    </div>
  );
}
