"use client";

import React, { useEffect, useState } from "react";
import { Button } from "@/shared/ui/button";
import { FormField } from "@/shared/ui/form-field";
import { ResponsiveDrawer } from "@/shared/ui/responsive-drawer";
import { Textarea } from "@/shared/ui/textarea";

interface SimulateNotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (text: string) => Promise<void>;
}

const FORM_ID = "simulate-notification-form";

export function SimulateNotificationModal({
  isOpen,
  onClose,
  onSubmit,
}: SimulateNotificationModalProps) {
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Reset the form whenever the drawer closes.
  useEffect(() => {
    if (!isOpen) setText("");
  }, [isOpen]);

  const isValid = text.trim().length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;

    setSubmitting(true);
    try {
      await onSubmit(text.trim());
      setText("");
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ResponsiveDrawer
      open={isOpen}
      onOpenChange={(open) => !open && onClose()}
      title="Simular notificación bancaria"
      description="El motor extrae monto, moneda y sentido con reglas y crea un borrador en tu bandeja."
      footer={
        <>
          <Button
            type="submit"
            form={FORM_ID}
            size="lg"
            loading={submitting}
            disabled={!isValid}
            className="order-1 w-full md:order-2 md:flex-1"
          >
            {submitting ? "Capturando..." : "Ingestar Evento"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="lg"
            onClick={onClose}
            className="order-2 w-full md:order-1 md:w-auto md:border-input md:bg-card"
          >
            Cancelar
          </Button>
        </>
      }
    >
      <form id={FORM_ID} onSubmit={handleSubmit} className="flex flex-col gap-5">
        <FormField
          label="Texto de la notificación"
          required
          hint="Pegá el texto de una notificación bancaria de prueba (Android)."
        >
          {(control) => (
            <Textarea
              {...control}
              rows={4}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Ej. Transferencia recibida por Bs. 150.00 de Juan. Ref: 887711"
            />
          )}
        </FormField>
      </form>
    </ResponsiveDrawer>
  );
}
