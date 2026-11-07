import React from "react";
import { Plus } from "lucide-react";
import { Button } from "@/shared/ui/button";

export function DeudasHeader({ onOpenCreateDebt }: { onOpenCreateDebt: () => void }) {
  return (
    <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Deudas y préstamos</h1>
        <p className="mt-1 text-sm text-muted-foreground">Controla tus deudas, préstamos y pagos para mejorar tu salud financiera</p>
      </div>
      <Button onClick={onOpenCreateDebt} aria-label="Registrar deuda">
        <Plus aria-hidden="true" /> Registrar deuda
      </Button>
    </header>
  );
}
