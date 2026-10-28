"use client";

import React, { useState } from "react";
import { Wallet, ShieldCheck, ArrowRight } from "lucide-react";

interface AuthScreenProps {
  onLogin: (googleTokenOrEmail: string, currency: string) => void;
  p2pRate?: number;
}

export function AuthScreen({ onLogin, p2pRate = 9.85 }: AuthScreenProps) {
  const [currency, setCurrency] = useState("BOB");
  const [loading, setLoading] = useState(false);

  const handleGoogleSignIn = () => {
    setLoading(true);
    // Simulates / triggers Google OAuth callback
    onLogin("usuario.google@billefy.app", currency);
  };

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-slate-50 text-slate-900 font-sans">
      {/* Left Column: Dark Branding & Value Proposition */}
      <div className="lg:w-1/2 bg-[#0B132B] text-white p-8 lg:p-16 flex flex-col justify-between relative overflow-hidden">
        {/* Background ambient glow */}
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Top Logo */}
        <div className="flex items-center gap-3 relative z-10">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/30">
            <Wallet className="w-5 h-5" />
          </div>
          <span className="text-2xl font-bold tracking-tight text-white">Billefy</span>
        </div>

        {/* Hero Content */}
        <div className="my-16 lg:my-auto max-w-xl relative z-10">
          <h1 className="text-3xl lg:text-5xl font-extrabold tracking-tight leading-tight text-white mb-6">
            Gestioná tus bolivianos, dólares y cripto con tasas Binance P2P en vivo.
          </h1>
          <p className="text-slate-300 text-base lg:text-lg leading-relaxed mb-8">
            Libro mayor inmutable, conciliación automática por WhatsApp y planificación patrimonial 50/30/20.
          </p>

          {/* Live P2P Rate Pill */}
          <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-slate-900/80 border border-slate-700/60 shadow-inner">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs lg:text-sm font-medium text-slate-200">
              Cotización P2P en Vivo: <strong className="text-emerald-400 font-semibold">1 USDT = Bs. {p2pRate.toFixed(2)}</strong>
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="text-xs text-slate-500 relative z-10">
          Billefy Financial Technologies © 2025 · Autenticación Segura Google OAuth
        </div>
      </div>

      {/* Right Column: Google Sign In */}
      <div className="lg:w-1/2 flex items-center justify-center p-6 lg:p-16 bg-white">
        <div className="w-full max-w-md space-y-6">
          <div>
            <h2 className="text-2xl lg:text-3xl font-bold tracking-tight text-slate-900">
              Iniciar Sesión
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Acceso exclusivo mediante Google Workspace o cuenta personal Google
            </p>
          </div>

          {/* Currency Preference Selector Card */}
          <div className="p-4 rounded-2xl border border-emerald-200 bg-emerald-50/50 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-emerald-800">Moneda de vista principal</p>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="bg-transparent font-bold text-sm text-slate-900 focus:outline-none cursor-pointer mt-0.5"
              >
                <option value="BOB">Boliviano (BOB • Bs.)</option>
                <option value="USD">Dólares (USD • $)</option>
                <option value="USDT">Tether (USDT)</option>
              </select>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-semibold">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Mercado P2P Activo ✓</span>
            </div>
          </div>

          {/* Single Google OAuth Button */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full py-4 px-6 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 active:scale-[0.99] text-slate-800 font-bold text-sm transition shadow-sm hover:shadow flex items-center justify-center gap-3"
          >
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
            <span>{loading ? "Conectando..." : "Continuar con Google"}</span>
            <ArrowRight className="w-4 h-4 ml-auto text-slate-400" />
          </button>

          <p className="text-center text-xs text-slate-400">
            Al continuar, tus datos se protegen con cifrado de grado financiero y privacidad on-device.
          </p>
        </div>
      </div>
    </div>
  );
}
