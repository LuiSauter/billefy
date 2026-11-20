"use client";

import React, { useEffect, useState } from "react";
import { CheckCircle2, ShieldCheck } from "lucide-react";
import { AccountDto } from "@/modules/ledger/domain/ledger.types";
import { ConnectBinanceKeyRequest } from "@/modules/ingestion/domain/ingestion.types";
import { Button } from "@/shared/ui/button";
import { FormField } from "@/shared/ui/form-field";
import { Input } from "@/shared/ui/input";
import { ResponsiveDrawer } from "@/shared/ui/responsive-drawer";
import { SelectField } from "@/shared/ui/select-field";
import { NoAccountsNotice } from "@/shared/ui/no-accounts-notice";

interface BinanceModalProps {
  isOpen: boolean;
  accounts: AccountDto[];
  onClose: () => void;
  onConnect: (req: ConnectBinanceKeyRequest) => Promise<unknown>;
  onSync: (accountId: string) => Promise<void>;
}

const CONNECT_FORM_ID = "binance-connect-form";
const SYNC_FORM_ID = "binance-sync-form";

export function BinanceModal({
  isOpen,
  accounts,
  onClose,
  onConnect,
  onSync,
}: BinanceModalProps) {
  const [apiKey, setApiKey] = useState("");
  const [apiSecret, setApiSecret] = useState("");
  const [accountId, setAccountId] = useState("");
  const [connected, setConnected] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | undefined>();

  // Reset the flow (and wipe credentials from memory) whenever the drawer closes.
  useEffect(() => {
    if (!isOpen) {
      setApiKey("");
      setApiSecret("");
      setAccountId("");
      setConnected(false);
      setError(undefined);
    }
  }, [isOpen]);

  const effectiveAccountId = accountId || accounts[0]?.id || "";
  const canConnect = apiKey.trim().length > 0 && apiSecret.trim().length > 0;

  const handleConnectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canConnect) return;

    setSubmitting(true);
    setError(undefined);
    try {
      await onConnect({
        apiKey: apiKey.trim(),
        apiSecret: apiSecret.trim(),
        permitsTrading: false,
        permitsWithdrawals: false,
      });
      setApiSecret("");
      setConnected(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error conectando Binance.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSyncSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!effectiveAccountId) return;
    setSubmitting(true);
    setError(undefined);
    try {
      await onSync(effectiveAccountId);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error sincronizando Binance.");
    } finally {
      setSubmitting(false);
    }
  };

  const cancelButton = (
    <Button
      type="button"
      variant="ghost"
      size="lg"
      onClick={onClose}
      className="order-2 w-full md:order-1 md:w-auto md:border-input md:bg-card"
    >
      Cancelar
    </Button>
  );

  return (
    <ResponsiveDrawer
      open={isOpen}
      onOpenChange={(open) => !open && onClose()}
      title="Sincronización Binance (solo lectura)"
      description={
        connected
          ? "Paso 2 de 2 · Elegí la cuenta destino"
          : "Paso 1 de 2 · Conectá tu clave API"
      }
      footer={
        !connected ? (
          <>
            <Button
              type="submit"
              form={CONNECT_FORM_ID}
              size="lg"
              loading={submitting}
              disabled={!canConnect}
              className="order-1 w-full md:order-2 md:flex-1"
            >
              {submitting ? "Verificando..." : "Verificar y Conectar"}
            </Button>
            {cancelButton}
          </>
        ) : accounts.length > 0 ? (
          <>
            <Button
              type="submit"
              form={SYNC_FORM_ID}
              size="lg"
              loading={submitting}
              disabled={!effectiveAccountId}
              className="order-1 w-full md:order-2 md:flex-1"
            >
              {submitting ? "Sincronizando..." : "Sincronizar Órdenes P2P y Depósitos"}
            </Button>
            {cancelButton}
          </>
        ) : undefined
      }
    >
      <div className="flex flex-col gap-5">
        <div className="flex items-start gap-3 rounded-xl border border-warning/30 bg-warning/10 p-3.5">
          <ShieldCheck aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-warning" />
          <p className="text-sm leading-relaxed text-foreground">
            Por seguridad estricta (Regla 18), se rechazan claves API que tengan permisos de trading o retiros habilitados. Creá una clave de solo lectura.
          </p>
        </div>

        {!connected ? (
          <form id={CONNECT_FORM_ID} onSubmit={handleConnectSubmit} className="flex flex-col gap-5">
            <FormField label="Binance API Key" required>
              {(control) => (
                <Input
                  {...control}
                  autoComplete="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Clave de solo lectura"
                />
              )}
            </FormField>

            <FormField label="Binance API Secret" required error={error}>
              {(control) => (
                <Input
                  {...control}
                  type="password"
                  autoComplete="off"
                  spellCheck={false}
                  value={apiSecret}
                  onChange={(e) => setApiSecret(e.target.value)}
                />
              )}
            </FormField>
          </form>
        ) : (
          <div className="flex flex-col gap-5">
            <div className="flex items-center gap-2 text-sm font-semibold text-success" role="status">
              <CheckCircle2 aria-hidden="true" className="size-5" />
              Clave verificada y conectada
            </div>

            {accounts.length === 0 ? (
              <NoAccountsNotice description="Para sincronizar órdenes P2P necesitás una cuenta destino. Creala primero y volvé a conectar Binance." />
            ) : (
              <form id={SYNC_FORM_ID} onSubmit={handleSyncSubmit} className="flex flex-col gap-5">
                <FormField label="Cuenta destino para órdenes P2P" error={error}>
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
              </form>
            )}
          </div>
        )}
      </div>
    </ResponsiveDrawer>
  );
}
