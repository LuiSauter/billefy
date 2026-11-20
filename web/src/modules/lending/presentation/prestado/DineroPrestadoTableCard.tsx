import React, { useState } from "react";
import { CalendarDays, Eye, HandCoins, MoreVertical } from "lucide-react";
import type { LoanHealthStatus } from "../../domain/lending-analytics";
import { useNumberFormat } from "@/shared/hooks/use-number-format";
import { Avatar, AvatarFallback } from "@/shared/ui/avatar";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader } from "@/shared/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/shared/ui/dropdown-menu";
import { Progress } from "@/shared/ui/progress";
import { SegmentedControl } from "@/shared/ui/segmented-control";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/table";

export interface LentTableRow {
  id: string;
  name: string;
  lent: number;
  pending: number;
  progress: number;
  status: LoanHealthStatus | "Finalizado";
  dueDate?: string;
}
const filters = ["Todos", "Activos", "Finalizados", "Con atraso"] as const;
const variants = { "Al día": "success", "Con atraso": "outline", Parcial: "investment", Pendiente: "purple", Finalizado: "secondary" } as const;

export function BorrowerAvatar({ name }: { name: string }) {
  const initials = name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
  return <Avatar aria-hidden="true"><AvatarFallback className="bg-violet-500/20 font-semibold text-violet-500">{initials || "?"}</AvatarFallback></Avatar>;
}

export function CollectionDate({ date }: { date?: string }) {
  return date ? <time dateTime={date} className="inline-flex items-center gap-1.5 whitespace-nowrap"><CalendarDays className="size-4" aria-hidden="true" />{new Intl.DateTimeFormat("es-BO", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${date}T00:00:00Z`))}</time> : <>Sin fecha</>;
}

export function DineroPrestadoTableCard({ rows, currency, onOpenPayment, onOpenLoanDetails }: {
  rows: LentTableRow[];
  currency: string;
  onOpenPayment: (loanId: string) => void;
  onOpenLoanDetails?: (loanId: string) => void;
}) {
  const format = useNumberFormat();
  const [filter, setFilter] = useState<(typeof filters)[number]>("Todos");
  const matches = (row: LentTableRow, value: (typeof filters)[number]) => value === "Todos"
    || (value === "Activos" ? row.status !== "Finalizado" : value === "Finalizados" ? row.status === "Finalizado" : row.status === "Con atraso");
  const visible = rows.filter((row) => matches(row, filter));
  return (
    <Card className="min-w-0 xl:col-span-2">
      <CardHeader className="flex-row flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Mis préstamos</h2>
        <div className="max-w-full overflow-x-auto">
          <SegmentedControl aria-label="Filtrar préstamos por estado" value={filter} onChange={setFilter}
            options={filters.map((value) => ({ value, label: `${value} (${rows.filter((row) => matches(row, value)).length})` }))} />
        </div>
      </CardHeader>
      <CardContent className="px-3">
        <Table>
          <TableHeader className="bg-muted/50"><TableRow>
            {["Persona", "Monto prestado", "Saldo por cobrar", "Progreso", "Estado", "Próximo cobro", "Acciones"].map((label) => <TableHead key={label} className="whitespace-nowrap">{label}</TableHead>)}
          </TableRow></TableHeader>
          <TableBody>
            {visible.map((row) => (
              <TableRow key={row.id} data-status={row.status}>
                <TableCell><div className="flex min-w-36 items-center gap-2 font-medium"><BorrowerAvatar name={row.name} />{row.name}</div></TableCell>
                <TableCell className="whitespace-nowrap tabular-nums">{format(row.lent)} {currency}</TableCell>
                <TableCell className="whitespace-nowrap tabular-nums">{format(row.pending)} {currency}</TableCell>
                <TableCell><div className="flex min-w-32 items-center gap-2">
                  <Progress value={row.progress} aria-label={`Capital cobrado de ${row.name}`} className={`flex-1 [&_[data-slot=progress-track]]:bg-muted ${row.status === "Parcial" ? "[&_[data-slot=progress-indicator]]:bg-sky-500" : "[&_[data-slot=progress-indicator]]:bg-emerald-400"}`} />
                  <span className="text-xs tabular-nums">{format(row.progress)}%</span>
                </div></TableCell>
                <TableCell><Badge variant={variants[row.status]} className={row.status === "Con atraso" ? "border-amber-500/30 bg-amber-500/15 text-amber-500" : undefined}>{row.status}</Badge></TableCell>
                <TableCell className={`text-xs ${row.status === "Con atraso" ? "text-destructive" : ""}`}><CollectionDate date={row.dueDate} /></TableCell>
                <TableCell>
                  {row.status !== "Finalizado" && <Button size="xs" variant="outline" aria-label={`Registrar cobro de ${row.name}`} onClick={() => onOpenPayment(row.id)}>Cobrar</Button>}
                  {(onOpenLoanDetails || row.status !== "Finalizado") && <DropdownMenu>
                    <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label={`Acciones de ${row.name}`}><MoreVertical aria-hidden="true" /></Button>} />
                    <DropdownMenuContent align="end">
                      {onOpenLoanDetails && <DropdownMenuItem aria-label={`Ver detalles de ${row.name}`} onClick={() => onOpenLoanDetails(row.id)}><Eye aria-hidden="true" />Ver detalles</DropdownMenuItem>}
                      {row.status !== "Finalizado" && <DropdownMenuItem aria-label={`Registrar cobro de ${row.name}`} onClick={() => onOpenPayment(row.id)}><HandCoins aria-hidden="true" />Registrar cobro</DropdownMenuItem>}
                    </DropdownMenuContent>
                  </DropdownMenu>}
                </TableCell>
              </TableRow>
            ))}
            {visible.length === 0 && <TableRow><TableCell colSpan={7} className="py-8 text-center text-muted-foreground">No hay préstamos con este estado.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
