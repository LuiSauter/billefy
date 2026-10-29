"use client";

import React, { useState } from "react";
import { Check } from "lucide-react";
import { RecurringItem } from "@/presentation/components/recurring/RecurringPaymentsView";
import { Button } from "@/components/ui/button";
import { ResponsiveDrawer } from "@/components/ui/responsive-drawer";

interface ReschedulePaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: RecurringItem | null;
  onConfirmPay: (item: RecurringItem) => void;
  onSaveNewDate: (item: RecurringItem, newDate: string) => void;
}

export function ReschedulePaymentModal({
  isOpen,
  onClose,
  item,
  onConfirmPay,
  onSaveNewDate,
}: ReschedulePaymentModalProps) {
  const [selectedOption, setSelectedOption] = useState<"+3d" | "today" | "+1w" | "custom">("+3d");

  if (!isOpen || !item) return null;

  const handlePay = () => {
    onConfirmPay(item);
    onClose();
  };

  const newDateLabel =
    selectedOption === "+3d"
      ? "18 de Mayo"
      : selectedOption === "+1w"
      ? "22 de Mayo"
      : selectedOption === "today"
      ? "Hoy"
      : "Fecha personalizada";

  const handleSaveDate = () => {
    onSaveNewDate(item, newDateLabel);
    onClose();
  };

  const formattedAmount =
    item.currency === "BOB" ? `Bs. ${item.amount.toFixed(2)}` : `${item.amount} ${item.currency}`;

  return (
    <ResponsiveDrawer
      open={isOpen}
      onOpenChange={(open) => !open && onClose()}
      size="md"
      title="Vencimiento de pago programado"
      description="Podés pagarlo de inmediato en 1-Clic o posponer la fecha de recordatorio."
      footer={
        <>
          <Button
            type="button"
            size="lg"
            onClick={handlePay}
            className="order-1 w-full md:order-2 md:flex-1"
          >
            <Check className="w-4 h-4 mr-1.5" />
            <span>Confirmar pago {formattedAmount} (1-Clic)</span>
          </Button>
          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={handleSaveDate}
            className="order-2 w-full md:order-1 md:w-auto"
          >
            Guardar nueva fecha ({newDateLabel})
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {/* Info Card */}
        <div className="p-4 rounded-2xl bg-muted/60 border border-border flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-primary">
              {item.name} ({item.category})
            </span>
            <span className="text-xs font-bold text-amber-700 bg-amber-100 rounded-md px-2 py-0.5">
              Vence en {item.daysRemaining} días
            </span>
          </div>

          <div className="text-3xl font-extrabold text-foreground tabular-nums my-1">
            {formattedAmount}
          </div>

          <p className="text-xs text-muted-foreground">
            Cuenta debitable: <strong className="text-foreground">{item.account}</strong> • Saldo disponible suficiente ✓
          </p>
        </div>

        {/* Reschedule options */}
        <div className="p-4 rounded-2xl bg-card border border-border flex flex-col gap-3">
          <span className="text-sm font-bold text-foreground">
            📅 Modificar fecha de vencimiento / postergar
          </span>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { id: "today", label: "Pagar Hoy" },
              { id: "+3d", label: "+3 Días (18 May)" },
              { id: "+1w", label: "+1 Sem (22 May)" },
              { id: "custom", label: "Personalizado" },
            ].map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setSelectedOption(opt.id as typeof selectedOption)}
                className={`h-10 px-2 rounded-xl text-xs font-semibold border transition text-center ${
                  selectedOption === opt.id
                    ? "border-primary bg-accent text-accent-foreground font-bold"
                    : "border-border bg-card text-muted-foreground hover:bg-muted"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <p className="text-xs text-muted-foreground leading-relaxed">
            Al reprogramar, el bot de WhatsApp y las notificaciones push actualizarán el recordatorio sin penalidad.
          </p>
        </div>
      </div>
    </ResponsiveDrawer>
  );
}
