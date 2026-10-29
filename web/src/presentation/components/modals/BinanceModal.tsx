import { useState } from "react";
import { AccountDto, ConnectBinanceKeyRequest } from "@/domain/models/types";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface BinanceModalProps {
  isOpen: boolean;
  accounts: AccountDto[];
  onClose: () => void;
  onConnect: (req: ConnectBinanceKeyRequest) => Promise<unknown>;
  onSync: (accountId: string) => Promise<void>;
}

export function BinanceModal({
  isOpen,
  accounts,
  onClose,
  onConnect,
  onSync,
}: BinanceModalProps) {
  const [apiKey, setApiKey] = useState("");
  const [apiSecret, setApiSecret] = useState("");
  const [accountId, setAccountId] = useState(accounts[0]?.id || "");
  const [connected, setConnected] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleConnectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey.trim() || !apiSecret.trim()) return;

    setSubmitting(true);
    try {
      await onConnect({
        apiKey: apiKey.trim(),
        apiSecret: apiSecret.trim(),
        permitsTrading: false,
        permitsWithdrawals: false,
      });
      setConnected(true);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Error conectando Binance.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSyncSubmit = async () => {
    if (!accountId) return;
    setSubmitting(true);
    try {
      await onSync(accountId);
      onClose();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Error sincronizando Binance.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-md shadow-xl bg-background border">
        <CardHeader className="border-b">
          <CardTitle className="text-lg flex items-center gap-2">
            <span>🟡</span> Sincronización Binance (Read-Only)
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6 space-y-4">
          <div className="p-3 bg-amber-50 dark:bg-amber-950/20 text-amber-900 dark:text-amber-200 border border-amber-200 dark:border-amber-900/50 rounded-md text-xs">
            Por seguridad estricta (Regla 18), se rechazan claves API que tengan permisos de trading o retiros habilitados.
          </div>

          {!connected ? (
            <form onSubmit={handleConnectSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="binanceKey">Binance API Key</Label>
                <Input
                  id="binanceKey"
                  required
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Clave de solo lectura"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="binanceSecret">Binance API Secret</Label>
                <Input
                  id="binanceSecret"
                  type="password"
                  required
                  value={apiSecret}
                  onChange={(e) => setApiSecret(e.target.value)}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={onClose}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={submitting}>
                  Verificar y Conectar
                </Button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="binanceAcc">Cuenta destino para órdenes P2P</Label>
                <select
                  id="binanceAcc"
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                  className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-2xs focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring"
                >
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.currency})
                    </option>
                  ))}
                </select>
              </div>

              <Button onClick={handleSyncSubmit} disabled={submitting} className="w-full">
                Sincronizar Órdenes P2P y Depósitos
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
