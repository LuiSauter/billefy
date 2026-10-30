"use client";

import React, { useEffect, useState } from "react";
import { FileSpreadsheet, UploadCloud } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { AccountDto } from "@/modules/ledger/domain/ledger.types";
import {
  ImportStatementCsvRequest,
  StatementImportResult,
} from "@/modules/ingestion/domain/ingestion.types";
import { CsvImportResult } from "@/modules/ingestion/presentation/CsvImportResult";
import { Button } from "@/shared/ui/button";
import { FormField } from "@/shared/ui/form-field";
import { Input } from "@/shared/ui/input";
import { ResponsiveDrawer } from "@/shared/ui/responsive-drawer";
import { SelectField } from "@/shared/ui/select-field";
import { Textarea } from "@/shared/ui/textarea";
import { formatFileSize } from "@/shared/lib/format";
import { NoAccountsNotice } from "@/shared/ui/no-accounts-notice";

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
        <CsvImportResult result={result} />
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

          <FormField label="Nombre de archivo" hint="Se usa para detectar extractos ya importados.">
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
