"use client";

import React from "react";
import { Check, X, ShieldAlert, ShieldCheck } from "lucide-react";
import { validatePassword } from "../domain/password-policy";

interface PasswordStrengthIndicatorProps {
  password: string;
}

export function PasswordStrengthIndicator({ password }: PasswordStrengthIndicatorProps) {
  if (!password) return null;

  const { criteria, isValid, strength, score, feedback } = validatePassword(password);

  const getBarColor = () => {
    if (strength === "strong") return "bg-emerald-500";
    if (strength === "medium") return "bg-amber-500";
    return "bg-rose-500";
  };

  const getFeedbackColor = () => {
    if (strength === "strong") return "text-emerald-400";
    if (strength === "medium") return "text-amber-400";
    return "text-rose-400";
  };

  const items = [
    { label: "Mínimo 8 caracteres", met: criteria.minLength },
    { label: "Al menos una mayúscula (A-Z)", met: criteria.hasUppercase },
    { label: "Al menos un número (0-9)", met: criteria.hasNumber },
    { label: "Al menos un símbolo (@, #, $, %, etc.)", met: criteria.hasSymbol },
  ];

  return (
    <div className="space-y-3 rounded-lg border border-border/60 bg-muted/30 p-3 text-xs" aria-live="polite">
      {/* Strength Bar & Header */}
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 font-medium text-foreground">
          {isValid ? (
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
          ) : (
            <ShieldAlert className="h-4 w-4 text-amber-400" />
          )}
          Seguridad de la contraseña
        </span>
        <span className={`font-semibold ${getFeedbackColor()}`}>{feedback}</span>
      </div>

      <div className="grid grid-cols-4 gap-1.5">
        {[1, 2, 3, 4].map((step) => (
          <div
            key={step}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              score >= step ? getBarColor() : "bg-muted-foreground/20"
            }`}
          />
        ))}
      </div>

      {/* Criteria checklist */}
      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
        {items.map((item, i) => (
          <li key={i} className="flex items-center gap-1.5">
            {item.met ? (
              <Check className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
            ) : (
              <X className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50" />
            )}
            <span className={item.met ? "text-emerald-300/90" : "text-muted-foreground"}>
              {item.label}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
