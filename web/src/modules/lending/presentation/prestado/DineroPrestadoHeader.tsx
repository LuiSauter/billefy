import React from "react";
import { Plus } from "lucide-react";
import { Button } from "@/shared/ui/button";

export function DineroPrestadoHeader({ onOpenCreateLent }: { onOpenCreateLent: () => void }) {
  return (
    <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
      <div>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Dinero prestado</h1>
        <p className="mt-1 text-sm text-muted-foreground">Gestiona el dinero que has prestado, controla los pagos y mantén el seguimiento de tus cobros</p>
      </div>
      <Button className="shrink-0" aria-label="Registrar préstamo" onClick={onOpenCreateLent}><Plus aria-hidden="true" />Registrar préstamo</Button>
    </header>
  );
}
