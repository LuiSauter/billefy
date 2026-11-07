import React, { useState } from "react";
import { Car, CreditCard, Eye, House, Layers, UserRound } from "lucide-react";
import type { DebtCategory } from "../../domain/lending-analytics";
import { useNumberFormat } from "@/shared/hooks/use-number-format";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader } from "@/shared/ui/card";
import { SegmentedControl } from "@/shared/ui/segmented-control";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/table";

export type DebtPaymentStatus = "Al día" | "Pago parcial" | "Atrasada";
export interface DebtTableRow {
  id: string;
  name: string;
  category: DebtCategory;
  balance: number;
  monthlyPayment: number;
  annualRate: number;
  dueDate?: string;
  status: DebtPaymentStatus;
}
const categoryIcons = { Hipoteca: House, Personal: UserRound, Tarjetas: CreditCard, Vehicular: Car, Otros: Layers };
const categoryVariants = { Hipoteca: "purple", Personal: "success", Tarjetas: "investment", Vehicular: "outline", Otros: "secondary" } as const;
const filters = ["Todas", "Al día", "Pago parcial", "Atrasada"] as const;

export function DeudasTableCard({ rows, currency, onOpenPayment, onOpenLoanDetails }: {
  rows: DebtTableRow[];
  currency: string;
  onOpenPayment: (loanId: string) => void;
  onOpenLoanDetails?: (loanId: string) => void;
}) {
  const format = useNumberFormat();
  const [filter, setFilter] = useState<(typeof filters)[number]>("Todas");
  const visible = rows.filter((row) => filter === "Todas" || row.status === filter);
  return (
    <Card className="min-w-0">
      <CardHeader className="gap-3">
        <h2 className="text-lg font-semibold">Mis deudas</h2>
        <div className="overflow-x-auto">
          <SegmentedControl aria-label="Filtrar deudas por estado" value={filter} onChange={setFilter}
            options={filters.map((value) => ({ value, label: value }))} />
        </div>
      </CardHeader>
      <CardContent className="px-3">
        <Table>
          <TableHeader className="bg-muted/50"><TableRow>
            {["Deuda", "Tipo", "Saldo actual", "Cuota mensual", "Tasa (anual)", "Fecha de pago", "Estado", "Acciones"].map((label) => <TableHead key={label} className="whitespace-nowrap">{label}</TableHead>)}
          </TableRow></TableHeader>
          <TableBody>
            {visible.map((row) => {
              const Icon = categoryIcons[row.category];
              return (
                <TableRow key={row.id} data-status={row.status}>
                  <TableCell><div className="flex min-w-40 items-center gap-2 font-medium"><span className="rounded-lg bg-violet-500/15 p-2 text-violet-500"><Icon className="size-4" aria-hidden="true" /></span>{row.name}</div></TableCell>
                  <TableCell><Badge variant={categoryVariants[row.category]}>{row.category === "Tarjetas" ? "Tarjeta" : row.category}</Badge></TableCell>
                  <TableCell className="whitespace-nowrap tabular-nums">{format(row.balance)} {currency}</TableCell>
                  <TableCell className="whitespace-nowrap tabular-nums">{format(row.monthlyPayment)} {currency}</TableCell>
                  <TableCell className="tabular-nums">{format(row.annualRate)}%</TableCell>
                  <TableCell className="whitespace-nowrap">{row.dueDate ? <time dateTime={row.dueDate}>{new Intl.DateTimeFormat("es-BO", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${row.dueDate}T00:00:00Z`))}</time> : "Sin fecha"}</TableCell>
                  <TableCell><Badge variant={row.status === "Al día" ? "success" : row.status === "Atrasada" ? "destructive" : "outline"}>{row.status}</Badge></TableCell>
                  <TableCell><div className="flex items-center gap-1">
                    {onOpenLoanDetails && <Button size="icon-sm" variant="ghost" aria-label={`Ver detalles de ${row.name}`} onClick={() => onOpenLoanDetails(row.id)}><Eye aria-hidden="true" /></Button>}
                    <Button size="sm" variant="secondary" aria-label={`Pagar ${row.name}`} onClick={() => onOpenPayment(row.id)}>Pagar</Button>
                  </div></TableCell>
                </TableRow>
              );
            })}
            {visible.length === 0 && <TableRow><TableCell colSpan={8} className="py-8 text-center text-muted-foreground">No hay deudas con este estado.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
