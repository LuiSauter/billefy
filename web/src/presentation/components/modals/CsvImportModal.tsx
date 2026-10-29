"use client";

import React, { useEffect, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Copy,
  FileSpreadsheet,
  FileText,
  Rows3,
  UploadCloud,
} from "lucide-react";
import { cn } from "cn";
import { AccountDto, ImportStatementCsvRequest, StatementImportResult } from "@/domain/models/types";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { ResponsiveDrawer } from "@/components/ui/responsive-drawer";
import { SelectField } from "@/components/ui/select-field";
import { Textarea } from "@/components/ui/textarea";
import { formatFileSize } from "./format";
import { NoAccountsNotice } from "./NoAccountsNotice";

interface CsvImportModalProps {
  isOpen: boolean;
  accounts: AccountDto[];
  onClose: () => void;
  onSubmit: (req: ImportStatementCsvRequest) => Promise<StatementImportResult>;
  onOpenCreateAccount?: () => void;
}

const FORM_ID = "csv-import-form";

export function CsvImportModal({
  isOpen,
  accounts,
  onClose,
  onSubmit,
  onOpenCreateAccount,
}: CsvImportModalProps) {
  const [accountId, setAccountId] = useState("");
  const [fileName, setFileName] = useState("");
  const [fileSize, setFileSize] = useState<number | null>(null);
  const [csvContent, setCsvContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [result, setResult] = useState<StatementImportResult | null>(null);

  // Reset the form whenever the drawer closes.
  useEffect(() => {
    if (!isOpen) {
      setAccountId("");
      setFileName("");
      setFileSize(null);
      setCsvContent("");
      setDragging(false);
      setError(undefined);
      setResult(null);
    }
  }, [isOpen]);

  const hasAccounts = accounts.length > 0;
  const effectiveAccountId = accountId || accounts[0]?.id || "";
  const isValid = csvContent.trim().length > 0;

  const readFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      setCsvContent(typeof reader.result === "string" ? reader.result : "");
      setFileName(file.name);
      setFileSize(file.size);
      setError(undefined);
    };
    reader.onerror = () => setError("No pudimos leer el archivo. Probá con otro.");
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) readFile(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!effectiveAccountId || !isValid) return;

    const targetAccount = accounts.find((a) => a.id === effectiveAccountId);
    if (!targetAccount) return;

    setSubmitting(true);
    setError(undefined);
    try {
      const res = await onSubmit({
        accountId: effectiveAccountId,
        fileName: fileName.trim() || "extracto.csv",
        csvContent: csvContent.trim(),
        currency: targetAccount.currency,
      });
      setResult(res);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al importar el extracto CSV.");
    } finally {
      setSubmitting(false);
    }
  };

  let footer: React.ReactNode;
  if (result) {
    footer = (
      <Button type="button" size="lg" onClick={onClose} className="w-full md:flex-1">
        Listo
      </Button>
    );
  } else if (hasAccounts) {
    footer = (
      <>
        <Button
          type="submit"
          form={FORM_ID}
          size="lg"
          loading={submitting}
          disabled={!isValid}
          className="order-1 w-full md:order-2 md:flex-1"
        >
          {submitting ? "Importando..." : "Procesar CSV"}
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
    );
  }

  return (
    <ResponsiveDrawer
      open={isOpen}
      onOpenChange={(open) => !open && onClose()}
      title="Importar extracto bancario CSV"
      description="Detectamos fecha, monto y concepto, y generamos borradores sin duplicados."
      footer={footer}
    >
      {!hasAccounts ? (
        <NoAccountsNotice
          description="Para importar un extracto bancario CSV, primero debés crear la cuenta bancaria de destino."
          onOpenCreateAccount={
            onOpenCreateAccount
              ? () => {
                  onClose();
                  onOpenCreateAccount();
                }
              : undefined
          }
        />
      ) : result ? (
        <ImportResult result={result} />
      ) : (
        <form id={FORM_ID} onSubmit={handleSubmit} className="flex flex-col gap-5">
          <FormField label="Cuenta bancaria de destino">
            {(control) => (
              <SelectField
                {...control}
                value={effectiveAccountId}
                onChange={(e) => setAccountId(e.target.value)}
                options={accounts.map((a) => ({
                  value: a.id,
                  label: a.name,
                  description: a.currency,
                }))}
              />
            )}
          </FormField>

          <FormField label="Archivo CSV" hint="Opcional: también podés pegar el contenido más abajo.">
            {(control) => (
              <div className="relative">
                <input
                  {...control}
                  type="file"
                  accept=".csv,text/csv,text/plain"
                  className="peer sr-only"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) readFile(file);
                    e.target.value = "";
                  }}
                />
                <label
                  htmlFor={control.id}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragging(true);
                  }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={handleDrop}
                  className={cn(
                    "flex min-h-32 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-5 text-center transition-colors peer-focus-visible:border-ring peer-focus-visible:ring-4 peer-focus-visible:ring-ring/15",
                    dragging || fileSize !== null
                      ? "border-primary bg-primary/5"
                      : "border-input bg-card hover:bg-accent"
                  )}
                >
                  {fileSize !== null ? (
                    <>
                      <FileSpreadsheet aria-hidden="true" className="size-8 text-primary" />
                      <span className="max-w-full truncate text-sm font-semibold text-foreground">
                        {fileName}
                      </span>
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {formatFileSize(fileSize)} · Tocá para elegir otro
                      </span>
                    </>
                  ) : (
                    <>
                      <UploadCloud aria-hidden="true" className="size-8 text-muted-foreground" />
                      <span className="text-sm font-semibold text-foreground">
                        Elegí un archivo o arrastralo acá
                      </span>
                      <span className="text-xs text-muted-foreground">Formato .csv</span>
                    </>
                  )}
                </label>
              </div>
            )}
          </FormField>

          <FormField
            label="Nombre de archivo"
            hint="Se usa para detectar extractos ya importados."
          >
            {(control) => (
              <Input
                {...control}
                placeholder="Ej. extracto_octubre_2026.csv"
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
              />
            )}
          </FormField>

          <FormField label="Contenido CSV" required error={error}>
            {(control) => (
              <Textarea
                {...control}
                rows={6}
                value={csvContent}
                onChange={(e) => setCsvContent(e.target.value)}
                placeholder={"Fecha,Descripción,Monto,Referencia\n2026-10-24,Supermercado Farmacorp,-85.50,TX-998811\n..."}
                className="font-mono text-sm md:text-sm"
              />
            )}
          </FormField>
        </form>
      )}
    </ResponsiveDrawer>
  );
}

function ImportResult({ result }: { result: StatementImportResult }) {
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
