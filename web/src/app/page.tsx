"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Decimal from "decimal.js";
import {
  BillefyApiClient,
  AccountDto,
  AccountType,
  TransactionDirection,
  RateSnapshotDto,
  TransactionDto,
} from "../api/client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const DEFAULT_API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export default function DashboardPage() {
  const [userId, setUserId] = useState<string>("");
  const [accounts, setAccounts] = useState<AccountDto[]>([]);
  const [transactions, setTransactions] = useState<TransactionDto[]>([]);
  const [rate, setRate] = useState<RateSnapshotDto | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Modals state
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [isTxnModalOpen, setIsTxnModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [newAccountName, setNewAccountName] = useState("");
  const [newAccountType, setNewAccountType] = useState<AccountType>("Bank");
  const [newAccountCurrency, setNewAccountCurrency] = useState("BOB");
  const [newAccountBalance, setNewAccountBalance] = useState("0");

  const [txnAccountId, setTxnAccountId] = useState("");
  const [txnAmount, setTxnAmount] = useState("");
  const [txnDirection, setTxnDirection] = useState<TransactionDirection>("Expense");
  const [txnDescription, setTxnDescription] = useState("");

  // Initialize User ID from localStorage or generate fresh
  useEffect(() => {
    let storedId = "";
    try {
      storedId = localStorage.getItem("billefy_user_id") || "";
      if (!storedId) {
        storedId = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : "00000000-0000-0000-0000-000000000001";
        localStorage.setItem("billefy_user_id", storedId);
      }
    } catch {
      storedId = "00000000-0000-0000-0000-000000000001";
    }
    setUserId(storedId);
  }, []);

  const client = useMemo(() => {
    if (!userId) return null;
    return new BillefyApiClient({ baseUrl: DEFAULT_API_URL, userId });
  }, [userId]);

  const loadData = useCallback(async () => {
    if (!client) return;

    setLoading(true);
    setError(null);

    try {
      const [accountsData, txnsData, rateData] = await Promise.all([
        client.getAccounts(),
        client.getTransactions({ limit: 20 }),
        client.getLatestRate("BOB", "USD").catch(() => null),
      ]);

      setAccounts(accountsData);
      setTransactions(txnsData);
      setRate(rateData);

      if (accountsData.length > 0 && !txnAccountId) {
        setTxnAccountId(accountsData[0].id);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error al conectar con el servidor.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [client, txnAccountId]);

  useEffect(() => {
    if (client) {
      loadData();
    }
  }, [client, loadData]);

  // Account map for quick lookup
  const accountsMap = useMemo(() => {
    const map = new Map<string, AccountDto>();
    for (const acc of accounts) {
      map.set(acc.id, acc);
    }
    return map;
  }, [accounts]);

  // Consolidated balances calculation
  const totals = useMemo(() => {
    let bobTotal = new Decimal(0);
    let usdTotal = new Decimal(0);

    for (const acc of accounts) {
      if (acc.currency === "BOB") {
        bobTotal = bobTotal.plus(acc.balance);
      } else if (acc.currency === "USD") {
        usdTotal = usdTotal.plus(acc.balance);
      }
    }

    let consolidatedUsd = usdTotal;
    if (rate && rate.appliedRate > 0) {
      // Rule 19: BOB in USD uses Buy rate: bob / buyRate
      const bobValuedInUsd = bobTotal.dividedBy(new Decimal(rate.appliedRate));
      consolidatedUsd = usdTotal.plus(bobValuedInUsd);
    }

    return { bobTotal, usdTotal, consolidatedUsd };
  }, [accounts, rate]);

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!client || !newAccountName.trim()) return;

    setSubmitting(true);
    try {
      await client.createAccount({
        name: newAccountName.trim(),
        type: newAccountType,
        currency: newAccountCurrency,
        initialBalance: newAccountBalance,
      });

      setNewAccountName("");
      setNewAccountBalance("0");
      setIsAccountModalOpen(false);
      await loadData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Error al crear la cuenta.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegisterTxn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!client || !txnAccountId) return;

    const amountNum = parseFloat(txnAmount);
    if (isNaN(amountNum) || amountNum <= 0) return;

    setSubmitting(true);
    try {
      await client.registerTransaction({
        accountId: txnAccountId,
        amount: txnAmount,
        direction: txnDirection,
        description: txnDescription.trim() || undefined,
      });

      setTxnAmount("");
      setTxnDescription("");
      setIsTxnModalOpen(false);
      await loadData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Error al registrar el movimiento.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReverseTxn = async (txnId: string) => {
    if (!client || !confirm("¿Seguro que deseas revertir este movimiento? La reversión restaurará el saldo.")) return;

    try {
      await client.reverseTransaction(txnId, "Reversión solicitada por el usuario");
      await loadData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Error al revertir el movimiento.");
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-6 md:p-8 space-y-8">
      {/* Header */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center pb-6 border-b gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Billefy</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gestor de finanzas personales multimoneda · Ledger Inmutable
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

      {/* Error alert */}
      {error && (
        <div className="p-4 bg-destructive/10 border border-destructive/20 text-destructive rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Balance Summary Cards */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-border shadow-xs">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Saldo Total en Bolivianos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-500 font-mono">
              {totals.bobTotal.toFixed(2)} BOB
            </div>
          </CardContent>
        </Card>

        <Card className="border-border shadow-xs">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Saldo Total en Dólares</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-700 dark:text-blue-500 font-mono">
              {totals.usdTotal.toFixed(2)} USD
            </div>
          </CardContent>
        </Card>

        <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/20 shadow-xs">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-blue-900 dark:text-blue-300">Patrimonio Consolidado (USD)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-950 dark:text-blue-200 font-mono">
              {totals.consolidatedUsd.toFixed(2)} USD
            </div>
            <p className="text-[11px] text-blue-600 dark:text-blue-400 mt-1">Valuado a tasa de compra P2P (Regla 19)</p>
          </CardContent>
        </Card>
      </section>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <Button onClick={() => setIsAccountModalOpen(true)} className="gap-2">
          + Nueva Cuenta
        </Button>
        <Button
          onClick={() => setIsTxnModalOpen(true)}
          disabled={accounts.length === 0}
          variant="secondary"
          className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          + Registrar Movimiento
        </Button>
      </div>

      {/* Accounts List */}
      <Card className="overflow-hidden shadow-xs">
        <CardHeader className="flex flex-row items-center justify-between border-b bg-muted/30 py-3 px-6">
          <CardTitle className="text-base font-semibold">Tus Cuentas ({accounts.length})</CardTitle>
          {loading && <span className="text-xs text-muted-foreground animate-pulse">Cargando del servidor...</span>}
        </CardHeader>
        <CardContent className="p-0 divide-y">
          {accounts.length === 0 && !loading ? (
            <div className="py-12 px-4 text-center text-muted-foreground space-y-2">
              <p className="text-base font-medium">No tenés cuentas creadas aún.</p>
              <p className="text-xs text-muted-foreground">Creá tu primera cuenta bancaria o billetera para comenzar a registrar movimientos reales.</p>
            </div>
          ) : (
            accounts.map((acc) => (
              <div key={acc.id} className="flex justify-between items-center py-4 px-6 hover:bg-muted/10 transition-colors">
                <div>
                  <div className="font-semibold text-sm text-foreground">{acc.name}</div>
                  <div className="text-xs text-muted-foreground">{acc.type} · Moneda: {acc.currency}</div>
                </div>
                <div className={`text-base font-mono font-bold ${acc.balance.isNegative() ? "text-destructive" : "text-foreground"}`}>
                  {acc.balance.toFixed(2)} {acc.currency}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Recent Transactions List */}
      <Card className="overflow-hidden shadow-xs">
        <CardHeader className="flex flex-row items-center justify-between border-b bg-muted/30 py-3 px-6">
          <CardTitle className="text-base font-semibold">Últimos Movimientos ({transactions.length})</CardTitle>
          <span className="text-xs text-muted-foreground">Libro Mayor Inmutable</span>
        </CardHeader>
        <CardContent className="p-0 divide-y">
          {transactions.length === 0 && !loading ? (
            <div className="py-8 px-4 text-center text-muted-foreground text-sm">
              No hay movimientos registrados todavía.
            </div>
          ) : (
            transactions.map((txn) => {
              const account = accountsMap.get(txn.accountId);
              const isIncome = txn.direction === "Income";
              const isReversal = !!txn.reversesId;

              return (
                <div key={txn.id} className="flex flex-col md:flex-row justify-between items-start md:items-center py-3 px-6 gap-2 hover:bg-muted/10 transition-colors">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${isIncome ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400" : "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-400"}`}>
                        {isIncome ? "Ingreso" : "Gasto"}
                      </span>
                      {isReversal && (
                        <span className="text-xs px-1.5 py-0.5 bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-400 rounded-md font-medium">
                          Reversión
                        </span>
                      )}
                      <span className="text-sm font-medium text-foreground">{txn.description || "Sin descripción"}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {account?.name || "Cuenta"} · {new Date(txn.occurredAt).toLocaleDateString()} {new Date(txn.occurredAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      {txn.appliedRate && ` · Tasa: ${txn.appliedRate} (${txn.rateSource})`}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 self-end md:self-auto">
                    <span className={`text-base font-mono font-bold ${isIncome ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                      {isIncome ? "+" : "-"}{txn.amount.toFixed(2)} {txn.currency}
                    </span>
                    {!isReversal && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleReverseTxn(txn.id)}
                        className="text-xs h-7 px-2 text-muted-foreground hover:text-destructive"
                      >
                        Revertir
                      </Button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      {/* Modal: Create Account */}
      {isAccountModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md shadow-xl bg-background border">
            <CardHeader className="border-b">
              <CardTitle className="text-lg">Crear Nueva Cuenta</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <form onSubmit={handleCreateAccount} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="accountName">Nombre de la cuenta</Label>
                  <Input
                    id="accountName"
                    required
                    value={newAccountName}
                    onChange={(e) => setNewAccountName(e.target.value)}
                    placeholder="Ej. Banco Unión, Billetera USDT"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="accountType">Tipo de cuenta</Label>
                  <select
                    id="accountType"
                    value={newAccountType}
                    onChange={(e) => setNewAccountType(e.target.value as AccountType)}
                    className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <option value="Bank">Banco</option>
                    <option value="Wallet">Billetera Digital</option>
                    <option value="Cash">Efectivo</option>
                    <option value="Exchange">Exchange (Crypto)</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="accountCurrency">Moneda</Label>
                  <select
                    id="accountCurrency"
                    value={newAccountCurrency}
                    onChange={(e) => setNewAccountCurrency(e.target.value)}
                    className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <option value="BOB">Bolivianos (BOB)</option>
                    <option value="USD">Dólares (USD)</option>
                    <option value="USDT">Tether (USDT)</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="initialBalance">Saldo Inicial</Label>
                  <Input
                    id="initialBalance"
                    type="number"
                    step="0.01"
                    value={newAccountBalance}
                    onChange={(e) => setNewAccountBalance(e.target.value)}
                  />
                </div>
                <div className="flex justify-end gap-2 pt-4 border-t">
                  <Button type="button" variant="outline" onClick={() => setIsAccountModalOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={submitting}>
                    {submitting ? "Guardando..." : "Guardar en Base de Datos"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Modal: Register Transaction */}
      {isTxnModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md shadow-xl bg-background border">
            <CardHeader className="border-b">
              <CardTitle className="text-lg">Registrar Movimiento en Servidor</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <form onSubmit={handleRegisterTxn} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="txnAccount">Cuenta</Label>
                  <select
                    id="txnAccount"
                    value={txnAccountId}
                    onChange={(e) => setTxnAccountId(e.target.value)}
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
                  <Label htmlFor="txnDirection">Tipo de Movimiento</Label>
                  <select
                    id="txnDirection"
                    value={txnDirection}
                    onChange={(e) => setTxnDirection(e.target.value as TransactionDirection)}
                    className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <option value="Expense">Gasto (-)</option>
                    <option value="Income">Ingreso (+)</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="txnAmount">Monto</Label>
                  <Input
                    id="txnAmount"
                    type="number"
                    step="0.01"
                    required
                    value={txnAmount}
                    onChange={(e) => setTxnAmount(e.target.value)}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="txnDesc">Descripción</Label>
                  <Input
                    id="txnDesc"
                    type="text"
                    value={txnDescription}
                    onChange={(e) => setTxnDescription(e.target.value)}
                    placeholder="Ej. Almuerzo, Taxi, Sueldo"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-4 border-t">
                  <Button type="button" variant="outline" onClick={() => setIsTxnModalOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={submitting} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                    {submitting ? "Registrando..." : "Confirmar Movimiento"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
