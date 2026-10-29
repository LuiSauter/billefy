import React, { useState } from "react";
import { AccountDto, ImportStatementCsvRequest, StatementImportResult } from "@/domain/models/types";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface CsvImportModalProps {
  isOpen: boolean;
  accounts: AccountDto[];
  onClose: () => void;
  onSubmit: (req: ImportStatementCsvRequest) => Promise<StatementImportResult>;
  onOpenCreateAccount?: () => void;
}

export function CsvImportModal({
  isOpen,
  accounts,
  onClose,
  onSubmit,
  onOpenCreateAccount,
}: CsvImportModalProps) {
  const [accountId, setAccountId] = useState(accounts[0]?.id || "");
  const [fileName, setFileName] = useState("");
  const [csvContent, setCsvContent] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  if (accounts.length === 0) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
        <Card className="w-full max-w-md shadow-xl bg-background border p-6 text-center space-y-4">
          <CardTitle className="text-lg">No hay cuentas disponibles</CardTitle>
          <p className="text-xs text-muted-foreground">
            Para importar un extracto bancario CSV, primero debes crear la cuenta bancaria de destino.
          </p>
          <div className="flex justify-center gap-2 pt-2">
            <Button variant="outline" onClick={onClose}>
              Cerrar
            </Button>
            {onOpenCreateAccount && (
              <Button
                onClick={() => {
                  onClose();
                  onOpenCreateAccount();
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                + Crear Cuenta
              </Button>
            )}
          </div>
        </Card>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const effectiveAccId = accountId || accounts[0]?.id;
    if (!effectiveAccId || !csvContent.trim()) return;

    const targetAccount = accounts.find((a) => a.id === effectiveAccId);
    if (!targetAccount) return;

    setSubmitting(true);
    try {
      const res = await onSubmit({
        accountId: effectiveAccId,
        fileName: fileName.trim() || "extracto.csv",
        csvContent: csvContent.trim(),
        currency: targetAccount.currency,
      });

      if (res.isDuplicateFile) {
        alert(`Advertencia: ${res.warning}\nTotal filas: ${res.totalRows}, duplicados vinculados: ${res.duplicatesLinked}`);
      } else {
        alert(`Extracto importado con éxito: ${res.draftsCreated} borradores creados, ${res.duplicatesLinked} duplicados vinculados.`);
      }
      setFileName("");
      setCsvContent("");
      onClose();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Error al importar el extracto CSV.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-lg shadow-xl bg-background border">
        <CardHeader className="border-b">
          <CardTitle className="text-lg">Importar Extracto Bancario CSV</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <p className="text-xs text-muted-foreground">
              Pega el contenido CSV de tu extracto bancario. El motor de importación detectará columnas de fecha, monto y concepto generando borradores con deduplicación por fingerprint.
            </p>

            <div className="space-y-1.5">
              <Label htmlFor="csvAccount">Cuenta Bancaria de Destino</Label>
              <select
                id="csvAccount"
                value={accountId || accounts[0]?.id || ""}
                onChange={(e) => setAccountId(e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs"
              >
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({a.currency})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="csvFileName">Nombre de archivo (para deduplicación)</Label>
              <Input
                id="csvFileName"
                placeholder="Ej. extracto_octubre_2026.csv"
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="csvContent">Contenido CSV</Label>
              <textarea
                id="csvContent"
                required
                rows={6}
                value={csvContent}
                onChange={(e) => setCsvContent(e.target.value)}
                placeholder={"Fecha,Descripción,Monto,Referencia\n2026-10-24,Supermercado Farmacorp,-85.50,TX-998811\n..."}
                className="w-full rounded-md border border-input bg-transparent p-2 text-xs font-mono shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={submitting || !csvContent.trim()}
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                {submitting ? "Importando..." : "Procesar CSV"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
