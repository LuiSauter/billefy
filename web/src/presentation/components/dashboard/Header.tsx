import { RateSnapshotDto } from "@/domain/models/types";

interface HeaderProps {
  rate: RateSnapshotDto | null;
}

export function Header({ rate }: HeaderProps) {
  return (
    <header className="flex flex-col md:flex-row justify-between items-start md:items-center pb-6 border-b gap-4">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Billefy</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Gestor de finanzas personales multimoneda · Clean Architecture & Ledger Inmutable
        </p>
      </div>
      <div className="bg-muted px-4 py-2.5 rounded-lg text-sm border shadow-xs">
        {rate ? (
          <div className="space-y-0.5">
            <div className="font-semibold text-xs md:text-sm">
              Cotización P2P: <span className="text-primary font-mono">{rate.appliedRate.toFixed(2)}</span> BOB/USD{" "}
              {rate.isStale && <span className="text-amber-600 text-xs">(Desactualizada)</span>}
            </div>
            <div className="text-xs text-muted-foreground">
              Fuente: {rate.rateSource} · {new Date(rate.fetchedAt).toLocaleTimeString()}
            </div>
          </div>
        ) : (
          <div className="text-xs text-muted-foreground">Sin cotización disponible</div>
        )}
      </div>
    </header>
  );
}
