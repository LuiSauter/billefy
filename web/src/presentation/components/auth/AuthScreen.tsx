"use client";

import React, { useState } from "react";
import { Wallet } from "lucide-react";

interface AuthScreenProps {
  onLogin: (email: string, currency: string) => void;
  p2pRate?: number;
}

export function AuthScreen({ onLogin, p2pRate = 9.85 }: AuthScreenProps) {
  const [email, setEmail] = useState("franco@billefy.app");
  const [currency, setCurrency] = useState("BOB");

  const handleLogin = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    onLogin(email || "franco@billefy.app", currency);
  };

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-[#0F172A] font-sans">
      {/* Left Column: Hero (OpenPencil HeroLeft) */}
      <div className="lg:w-[640px] bg-[#0F172A] text-white p-8 lg:p-12 flex flex-col justify-between shrink-0">
        {/* HLTop: Logo */}
        <div className="flex items-center gap-3">
          <div className="w-[40px] h-[40px] rounded-[10px] bg-[#1E293B] flex items-center justify-center text-white shrink-0">
            <Wallet className="w-[20px] h-[20px]" />
          </div>
          <span className="text-[22px] font-[900] tracking-tight text-white">
            Billefy
          </span>
        </div>

        {/* HLMid: Value Prop */}
        <div className="my-12 lg:my-0 flex flex-col gap-4 max-w-[530px]">
          <h1 className="text-[32px] font-[900] leading-tight text-white">
            Gestioná tus bolivianos, dólares y cripto con tasas Binance P2P en vivo.
          </h1>
          <p className="text-[14px] font-[500] text-[#94A3B8] leading-relaxed">
            Libro mayor inmutable, conciliación automática por WhatsApp y planificación patrimonial 50/30/20.
          </p>

          {/* P2PLiveCard */}
          <div className="self-start mt-2 px-4 py-2 rounded-full bg-[#1E293B] border border-slate-700/50 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#60A5FA] animate-pulse" />
            <span className="text-[13px] font-[700] text-[#60A5FA]">
              Cotización P2P en Vivo: 1 USDT = Bs. {p2pRate.toFixed(2)}
            </span>
          </div>
        </div>

        {/* HLBottom: Copyright */}
        <div className="text-[11px] font-[500] text-[#64748B]">
          Billefy Financial Technologies © 2024
        </div>
      </div>

      {/* Right Column: Form (OpenPencil FormRight) */}
      <div className="flex-1 bg-white p-8 lg:p-16 flex items-center justify-center">
        <form onSubmit={handleLogin} className="w-full max-w-[560px] flex flex-col gap-5">
          {/* FRHead */}
          <div>
            <h2 className="text-[26px] font-[900] text-[#0F172A] tracking-tight">
              Iniciar Sesión
            </h2>
            <p className="text-[13px] font-[500] text-[#64748B] mt-0.5">
              Ingresá con tu cuenta para acceder a tus finanzas
            </p>
          </div>

          {/* OAuthRow */}
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => handleLogin()}
              className="h-[44px] px-4 rounded-[10px] border border-[#E2E8F0] bg-white hover:bg-slate-50 text-[12px] font-[700] text-[#0F172A] transition flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
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
              <span>Google Workspace</span>
            </button>

            <button
              type="button"
              onClick={() => handleLogin()}
              className="h-[44px] px-4 rounded-[10px] bg-[#0F172A] hover:bg-slate-800 text-[12px] font-[700] text-white transition flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4 fill-current" viewBox="0 0 170 170">
                <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.69-3.04-7.67-7.81-11.96-14.34-6.3-9.59-11.22-20.35-14.75-32.26-3.53-11.92-5.3-23.12-5.3-33.6 0-14.24 3.59-26.06 10.77-35.47 7.18-9.41 16.14-14.24 26.89-14.49 4.35 0 9.29 1.15 14.82 3.46 5.53 2.3 9.4 3.52 11.61 3.65 1.58-.23 5.61-1.53 12.09-3.89 6.48-2.36 11.75-3.37 15.82-3.03 12.03.74 21.6 5.21 28.71 13.41-10.51 6.38-15.66 15.22-15.45 26.52.22 8.94 3.65 16.48 10.29 22.61 6.64 6.14 14.62 9.69 23.94 10.66-2.12 6.53-4.78 13.12-7.98 19.77zM119.22 31.84c0-7.39 2.64-14.34 7.92-20.85 5.28-6.51 11.97-10.42 20.08-11.73.23 1.25.35 2.45.35 3.6 0 7.28-2.76 14.28-8.28 21-5.52 6.72-12.23 10.39-20.14 11-0.07-.94-.13-1.95-.13-3.02z" />
              </svg>
              <span>Apple ID</span>
            </button>
          </div>

          {/* InpEmail */}
          <div className="h-[46px] px-3.5 rounded-[10px] border border-[#E2E8F0] bg-white flex items-center">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="franco@billefy.app"
              className="w-full text-[13px] font-[600] text-[#0F172A] placeholder-[#94A3B8] bg-transparent focus:outline-none"
            />
          </div>

          {/* CurrSelect */}
          <div className="h-[55px] px-4 rounded-[12px] bg-[#F0FDF4] border border-[#BBF7D0] flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-[11px] font-[600] text-[#166534]">
                Moneda de vista principal
              </span>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="text-[14px] font-[800] text-[#0F172A] bg-transparent focus:outline-none cursor-pointer"
              >
                <option value="BOB">Boliviano (BOB • Bs.)</option>
                <option value="USD">Dólares (USD • $)</option>
                <option value="USDT">Tether (USDT)</option>
              </select>
            </div>
            <span className="text-[11px] font-[700] text-[#15803D]">
              Mercado P2P Activo ✓
            </span>
          </div>

          {/* BtnEntrar */}
          <button
            type="submit"
            className="w-full h-[48px] rounded-[12px] bg-[#2563EB] hover:bg-blue-700 active:scale-[0.99] text-white text-[14px] font-[800] transition flex items-center justify-center shadow-sm"
          >
            Ingresar al Panel de Control
          </button>
        </form>
      </div>
    </div>
  );
}
