import { useState } from "react";
import { AccountDto, ImportStatementCsvRequest, StatementImportResult } from "@/domain/models/types";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const SAMPLE_CSV = `Fecha,Descripción,Monto,Referencia
2026-10-24,Pago Supermercado Farmacorp,-85.50,TX-998811
2026-10-25,Transferencia Recibida Juan,1500.00,TR-554422
2026-10-25,Retiro Cajero Automático,-200.00,ATM-110022`;

interface CsvImportModalProps {
  isOpen: boolean;
  accounts: AccountDto[];
  onClose: () => void;
  onSubmit: (req: ImportStatementCsvRequest) => Promise<StatementImportResult>;
}

export function CsvImportModal({
  isOpen,
  accounts,
  onClose,
  onSubmit,
}: CsvImportModalProps) {
  const [accountId, setAccountId] = useState(accounts[0]?.id || "");
  const [fileName, setFileName] = useState("extracto_bancario.csv");
  const [csvContent, setCsvContent] = useState(SAMPLE_CSV);
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountId || !csvContent.trim()) return;

    const targetAccount = accounts.find((a) => a.id === accountId);
    if (!targetAccount) return;

    setSubmitting(true);
    try {
      const res = await onSubmit({
        accountId,
        fileName: fileName.trim() || "extracto.csv",
        csvContent: csvContent.trim(),
        currency: targetAccount.currency,
      });

      if (res.isDuplicateFile) {
        alert(`Advertencia: ${res.warning}\nTotal filas: ${res.totalRows}, duplicados vinculados: ${res.duplicatesLinked}`);
      } else {
        alert(`Extracto importado con éxito: ${res.draftsCreated} borradores creados, ${res.duplicatesLinked} duplicados vinculados.`);
      }
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
              Carga los movimientos de tu banco. El motor deduplicará automáticamente contra movimientos ya capturados por notificaciones (ING-11).
            </p>

            <div className="space-y-1.5">
              <Label htmlFor="csvAccount">Imputar a la cuenta</Label>
              <select
                id="csvAccount"
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({a.currency})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="csvFileName">Nombre del archivo</Label>
              <Input
                id="csvFileName"
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="csvContent">Contenido CSV (Fecha, Descripción, Monto, Referencia)</Label>
              <textarea
                id="csvContent"
                rows={6}
                required
                value={csvContent}
                onChange={(e) => setCsvContent(e.target.value)}
                className="w-full rounded-md border border-input bg-transparent p-2 font-mono text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Importando..." : "Importar y Deduplicar"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
