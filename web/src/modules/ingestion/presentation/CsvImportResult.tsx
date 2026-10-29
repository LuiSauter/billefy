"use client";

import React from "react";
import { AlertTriangle, CheckCircle2, Copy, FileText, Rows3 } from "lucide-react";
import { cn } from "cn";
import { StatementImportResult } from "@/modules/ingestion/domain/ingestion.types";

export function CsvImportResult({ result }: { result: StatementImportResult }) {
  const isDuplicateFile = result.isDuplicateFile;
  return (
    <div className="flex flex-col gap-4" role="status">
      <div
        className={cn(
          "flex items-start gap-3 rounded-xl border p-4",
          isDuplicateFile
            ? "border-warning/30 bg-warning/10"
            : "border-success/30 bg-success/10"
        )}
      >
        {isDuplicateFile ? (
          <AlertTriangle aria-hidden="true" className="mt-0.5 size-6 shrink-0 text-warning" />
        ) : (
          <CheckCircle2 aria-hidden="true" className="mt-0.5 size-6 shrink-0 text-success" />
        )}
        <div className="min-w-0">
          <h3 className="text-base font-bold text-foreground">
            {isDuplicateFile ? "Este archivo ya se importó" : "Extracto importado con éxito"}
          </h3>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {isDuplicateFile
              ? result.warning ?? "Detectamos un archivo duplicado."
              : `${result.draftsCreated} borradores creados, ${result.duplicatesLinked} duplicados vinculados.`}
          </p>
        </div>
      </div>

      <dl className="grid grid-cols-3 gap-2">
        <ResultStat icon={<Rows3 aria-hidden="true" />} label="Filas" value={result.totalRows} />
        <ResultStat
          icon={<FileText aria-hidden="true" />}
          label="Borradores"
          value={result.draftsCreated}
        />
        <ResultStat
          icon={<Copy aria-hidden="true" />}
          label="Duplicados"
          value={result.duplicatesLinked}
        />
      </dl>
    </div>
  );
}

function ResultStat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-xl border border-border bg-background p-3 text-center [&_svg]:size-5 [&_svg]:text-muted-foreground">
      {icon}
      <dt className="order-3 text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="order-2 text-xl font-extrabold text-foreground tabular-nums">{value}</dd>
    </div>
  );
}
