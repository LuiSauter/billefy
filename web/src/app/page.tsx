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
  DraftDto,
  LoanSummaryDto,
  LoanDetailDto,
  LoanScheduleDto,
  SimulateLoanRequest,
} from "../api/client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const DEFAULT_API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

const SAMPLE_CSV = `Fecha,Descripción,Monto,Referencia
2026-10-24,Pago Supermercado Farmacorp,-85.50,TX-998811
2026-10-25,Transferencia Recibida Juan,1500.00,TR-554422
2026-10-25,Retiro Cajero Automático,-200.00,ATM-110022`;

export default function DashboardPage() {
  const [userId, setUserId] = useState<string>("");
  const [accounts, setAccounts] = useState<AccountDto[]>([]);
  const [transactions, setTransactions] = useState<TransactionDto[]>([]);
  const [drafts, setDrafts] = useState<DraftDto[]>([]);
  const [loans, setLoans] = useState<LoanSummaryDto[]>([]);
  const [rate, setRate] = useState<RateSnapshotDto | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Modals state
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [isTxnModalOpen, setIsTxnModalOpen] = useState(false);
  const [isSimulateModalOpen, setIsSimulateModalOpen] = useState(false);
  const [isReconcileModalOpen, setIsReconcileModalOpen] = useState(false);
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [isLoanModalOpen, setIsLoanModalOpen] = useState(false);
  const [isLoanPaymentModalOpen, setIsLoanPaymentModalOpen] = useState(false);
  const [isLoanDetailModalOpen, setIsLoanDetailModalOpen] = useState(false);
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

  const [simulateText, setSimulateText] = useState("Transferencia recibida por Bs. 150.00 de Juan Pérez. Nro: 887711");
  const [draftAccountSelection, setDraftAccountSelection] = useState<Record<string, string>>({});

  // Reconciliation state
  const [reconcileAccount, setReconcileAccount] = useState<AccountDto | null>(null);
  const [reconcileRealBalance, setReconcileRealBalance] = useState("");
  const [reconcileNotes, setReconcileNotes] = useState("");

  // CSV Import state
  const [csvAccountId, setCsvAccountId] = useState("");
  const [csvContent, setCsvContent] = useState(SAMPLE_CSV);
  const [csvFileName, setCsvFileName] = useState("extracto_bancario.csv");

  // Loan state
  const [loanCounterparty, setLoanCounterparty] = useState("");
  const [loanType, setLoanType] = useState<"Lent" | "Borrowed">("Lent");
  const [loanTemplate, setLoanTemplate] = useState("FixedInstallment");
  const [loanPrincipal, setLoanPrincipal] = useState("1000");
  const [loanCurrency, setLoanCurrency] = useState("BOB");
  const [loanRate, setLoanRate] = useState("0.02");
  const [loanInstallments, setLoanInstallments] = useState("12");
  const [loanDisbursementAcc, setLoanDisbursementAcc] = useState("");
  const [simulatedSchedule, setSimulatedSchedule] = useState<LoanScheduleDto | null>(null);

  // Selected Loan for Payment / Detail
  const [selectedLoanId, setSelectedLoanId] = useState("");
  const [selectedLoanDetail, setSelectedLoanDetail] = useState<LoanDetailDto | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentAccountId, setPaymentAccountId] = useState("");
  const [paymentNote, setPaymentNote] = useState("");

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
      const [accountsData, txnsData, draftsData, loansData, rateData] = await Promise.all([
        client.getAccounts(),
        client.getTransactions({ limit: 20 }),
        client.getDrafts(),
        client.getLoans(),
        client.getLatestRate("BOB", "USD").catch(() => null),
      ]);

      setAccounts(accountsData);
      setTransactions(txnsData);
      setDrafts(draftsData);
      setLoans(loansData);
      setRate(rateData);

      if (accountsData.length > 0 && !txnAccountId) {
        setTxnAccountId(accountsData[0].id);
      }
      if (accountsData.length > 0 && !csvAccountId) {
        setCsvAccountId(accountsData[0].id);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error al conectar con el servidor.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [client, txnAccountId, csvAccountId]);

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

  // Filter pending/review drafts
  const pendingDrafts = useMemo(() => {
    return drafts.filter((d) => d.status === "Pending" || d.status === "Review");
  }, [drafts]);

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

  const handleConfirmDraft = async (draft: DraftDto) => {
    if (!client) return;

    const selectedAccId = draftAccountSelection[draft.id] ||
      draft.suggestedAccountId ||
      accounts.find((a) => a.currency === draft.currency)?.id ||
      accounts[0]?.id;

    if (!selectedAccId) {
      alert("Debes crear al menos una cuenta antes de confirmar un borrador.");
      return;
    }

    try {
      await client.confirmDraft(draft.id, {
        accountId: selectedAccId,
        description: draft.reference ? `Ref: ${draft.reference}` : "Captura confirmada",
      });
      await loadData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Error al confirmar el borrador.");
    }
  };

  const handleDiscardDraft = async (draftId: string) => {
    if (!client) return;
    try {
      await client.discardDraft(draftId);
      await loadData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Error al descartar el borrador.");
    }
  };

  const handleSimulateCapture = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!client || !simulateText.trim()) return;

    setSubmitting(true);
    try {
      const eventId = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : "11111111-1111-1111-1111-111111111111";
      await fetch(`${DEFAULT_API_URL}/v1/ingestion/events`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-User-Id": userId,
          "Idempotency-Key": eventId,
        },
        body: JSON.stringify({
          eventId,
          channel: "notification",
          sourceId: "com.banco.union",
          maskedText: simulateText.trim(),
        }),
      });

      setIsSimulateModalOpen(false);
      await loadData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Error al simular la captura.");
    } finally {
      setSubmitting(false);
    }
  };

  const openReconcileModal = (account: AccountDto) => {
    setReconcileAccount(account);
    setReconcileRealBalance(account.balance.toString());
    setReconcileNotes("");
    setIsReconcileModalOpen(true);
  };

  const handleReconcileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!client || !reconcileAccount) return;

    const realNum = parseFloat(reconcileRealBalance);
    if (isNaN(realNum)) {
      alert("Por favor ingresa un saldo real válido.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await client.reconcileAccount(reconcileAccount.id, {
        realBalance: realNum,
        notes: reconcileNotes.trim() || undefined,
      });

      setIsReconcileModalOpen(false);
      if (res.difference === 0) {
        alert("El saldo ya coincide exactamente con el Libro Mayor. No fue necesario ajuste.");
      } else {
        alert(`Conciliación exitosa. Se registró un ajuste de ${res.difference > 0 ? "+" : ""}${res.difference.toFixed(2)} ${reconcileAccount.currency}.`);
      }
      await loadData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Error al conciliar la cuenta.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleImportCsvSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!client || !csvAccountId || !csvContent.trim()) return;

    const targetAccount = accountsMap.get(csvAccountId);
    if (!targetAccount) return;

    setSubmitting(true);
    try {
      const res = await client.importStatementCsv({
        accountId: csvAccountId,
        fileName: csvFileName.trim() || "extracto.csv",
        csvContent: csvContent.trim(),
        currency: targetAccount.currency,
      });

      setIsCsvModalOpen(false);
      if (res.isDuplicateFile) {
        alert(`Advertencia: ${res.warning}\nTotal filas: ${res.totalRows}, duplicados vinculados: ${res.duplicatesLinked}`);
      } else {
        alert(`Extracto importado con éxito: ${res.draftsCreated} borradores creados, ${res.duplicatesLinked} duplicados vinculados.`);
      }
      await loadData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Error al importar el extracto CSV.");
    } finally {
      setSubmitting(false);
    }
  };

  // Loan simulation
  const handleSimulateSchedule = async () => {
    if (!client) return;

    const principal = parseFloat(loanPrincipal);
    const rateVal = parseFloat(loanRate);
    const installments = parseInt(loanInstallments, 10);

    if (isNaN(principal) || principal <= 0 || isNaN(installments) || installments < 1) {
      alert("Por favor verifica los datos del préstamo.");
      return;
    }

    try {
      const schedule = await client.simulateLoan({
        principal,
        rate: isNaN(rateVal) ? 0 : rateVal,
        template: loanTemplate as SimulateLoanRequest["template"],
        totalInstallments: installments,
      });
      setSimulatedSchedule(schedule);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Error al simular el cronograma.");
    }
  };

  const handleCreateLoanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!client || !loanCounterparty.trim()) return;

    const principal = parseFloat(loanPrincipal);
    const rateVal = parseFloat(loanRate);
    const installments = parseInt(loanInstallments, 10);

    setSubmitting(true);
    try {
      await client.createLoan({
        counterpartyName: loanCounterparty.trim(),
        type: loanType,
        template: loanTemplate,
        principal,
        currency: loanCurrency,
        interestRate: isNaN(rateVal) ? 0 : rateVal,
        totalInstallments: installments,
        disbursementAccountId: loanDisbursementAcc || undefined,
      });

      setIsLoanModalOpen(false);
      setSimulatedSchedule(null);
      setLoanCounterparty("");
      await loadData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Error al crear el préstamo.");
    } finally {
      setSubmitting(false);
    }
  };

  const openLoanDetails = async (loanId: string) => {
    if (!client) return;
    try {
      const detail = await client.getLoanById(loanId);
      setSelectedLoanDetail(detail);
      setIsLoanDetailModalOpen(true);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Error al cargar el detalle del préstamo.");
    }
  };

  const openPaymentModal = (loanId: string) => {
    setSelectedLoanId(loanId);
    setPaymentAmount("");
    setPaymentNote("");
    setPaymentAccountId(accounts[0]?.id || "");
    setIsLoanPaymentModalOpen(true);
  };

  const handleLoanPaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!client || !selectedLoanId) return;

    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      alert("Ingresa un monto de pago válido.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await client.registerLoanPayment(selectedLoanId, {
        amount,
        accountId: paymentAccountId || undefined,
        note: paymentNote.trim() || undefined,
      });

      setIsLoanPaymentModalOpen(false);
      alert(`Pago registrado con éxito. Capital amortizado: ${res.allocations.reduce((sum, a) => sum + a.toPrincipal, 0).toFixed(2)}. Saldo restante: ${res.remainingPrincipal.toFixed(2)}.`);
      await loadData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Error al registrar el pago.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-6 md:p-8 space-y-8">
      {/* Header */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center pb-6 border-b gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Billefy</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gestor de finanzas personales multimoneda · Smart Capture, Préstamos (Lending) & Ledger Inmutable
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
      <div className="flex flex-wrap gap-3">
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
        <Button
          onClick={() => {
            setSimulatedSchedule(null);
            setIsLoanModalOpen(true);
          }}
          variant="outline"
          className="gap-2 border-amber-300 text-amber-800 hover:bg-amber-50 dark:border-amber-800 dark:text-amber-300 dark:hover:bg-amber-950"
        >
          🤝 Nuevo Préstamo / Simular
        </Button>
        <Button
          onClick={() => setIsCsvModalOpen(true)}
          disabled={accounts.length === 0}
          variant="outline"
          className="gap-2"
        >
          📁 Importar Extracto CSV
        </Button>
        <Button
          onClick={() => setIsSimulateModalOpen(true)}
          variant="outline"
          className="gap-2 border-indigo-200 text-indigo-700 hover:bg-indigo-50 dark:border-indigo-800 dark:text-indigo-300 dark:hover:bg-indigo-950"
        >
          ⚡ Simular Notificación
        </Button>
      </div>

      {/* Smart Capture Inbox: Pending Drafts */}
      {pendingDrafts.length > 0 && (
        <Card className="border-indigo-300 bg-indigo-50/30 dark:bg-indigo-950/20 shadow-xs overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between border-b border-indigo-100 dark:border-indigo-900/50 py-3 px-6">
            <div className="flex items-center gap-2">
              <span className="flex h-2.5 w-2.5 rounded-full bg-indigo-600 animate-pulse" />
              <CardTitle className="text-base font-semibold text-indigo-950 dark:text-indigo-200">
                Bandeja de Entrada: Movimientos Detectados ({pendingDrafts.length})
              </CardTitle>
            </div>
            <span className="text-xs text-indigo-600 dark:text-indigo-400 font-medium">Requiere tu confirmación (Regla 9)</span>
          </CardHeader>
          <CardContent className="p-0 divide-y divide-indigo-100 dark:divide-indigo-900/30">
            {pendingDrafts.map((draft) => {
              const isIncome = draft.direction === "Income";
              const selectedAccId = draftAccountSelection[draft.id] ||
                draft.suggestedAccountId ||
                accounts.find((a) => a.currency === draft.currency)?.id ||
                accounts[0]?.id || "";

              return (
                <div key={draft.id} className="flex flex-col md:flex-row justify-between items-start md:items-center py-3.5 px-6 gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${isIncome ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400" : "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-400"}`}>
                        {isIncome ? "Ingreso detectado" : "Gasto detectado"}
                      </span>
                      <span className="text-xs px-1.5 py-0.5 bg-muted text-muted-foreground rounded-md">
                        {draft.source}
                      </span>
                      {draft.reference && (
                        <span className="text-xs font-mono text-muted-foreground">
                          Ref: {draft.reference}
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {Math.round(draft.confidence * 100)}% confianza
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Fecha detectada: {new Date(draft.estimatedDate).toLocaleString()} · {draft.linkedEventsCount} evento(s) vinculado(s)
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-between md:justify-end">
                    <span className={`text-base font-mono font-bold ${isIncome ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                      {isIncome ? "+" : "-"}{draft.amount.toFixed(2)} {draft.currency}
                    </span>

                    <div className="flex items-center gap-2">
                      {accounts.length > 0 && (
                        <select
                          value={selectedAccId}
                          onChange={(e) => setDraftAccountSelection({ ...draftAccountSelection, [draft.id]: e.target.value })}
                          className="h-8 rounded-md border border-input bg-background px-2 text-xs shadow-xs"
                        >
                          {accounts.map((a) => (
                            <option key={a.id} value={a.id}>
                              {a.name} ({a.currency})
                            </option>
                          ))}
                        </select>
                      )}

                      <Button
                        size="sm"
                        onClick={() => handleConfirmDraft(draft)}
                        className="h-8 px-3 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                      >
                        Confirmar
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDiscardDraft(draft.id)}
                        className="h-8 px-2 text-xs text-muted-foreground hover:text-destructive"
                      >
                        Descartar
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Lending Section: Active Loans and Debts */}
      <Card className="overflow-hidden shadow-xs">
        <CardHeader className="flex flex-row items-center justify-between border-b bg-amber-50/40 dark:bg-amber-950/20 py-3 px-6">
          <div>
            <CardTitle className="text-base font-semibold text-amber-950 dark:text-amber-200">
              Préstamos y Deudas ({loans.length})
            </CardTitle>
            <p className="text-xs text-muted-foreground">Amortización exacta, cuotas y TEA</p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setSimulatedSchedule(null);
              setIsLoanModalOpen(true);
            }}
            className="text-xs h-7"
          >
            + Simular / Crear
          </Button>
        </CardHeader>
        <CardContent className="p-0 divide-y">
          {loans.length === 0 && !loading ? (
            <div className="py-8 px-4 text-center text-muted-foreground text-sm">
              No tienes préstamos ni deudas registradas.
            </div>
          ) : (
            loans.map((loan) => {
              const isLent = loan.type === "Lent";
              return (
                <div key={loan.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center py-4 px-6 hover:bg-muted/10 transition-colors gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${isLent ? "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300" : "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300"}`}>
                        {isLent ? "Dinero Prestado (Cobrar)" : "Deuda (Pagar)"}
                      </span>
                      <span className="font-semibold text-sm text-foreground">{loan.counterpartyName}</span>
                      <span className="text-xs font-mono text-muted-foreground">
                        TEA: {(loan.annualEffectiveRate * 100).toFixed(2)}%
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {loan.template} · {loan.totalInstallments} cuotas · Desembolso: {loan.disbursementDate} · Estado: {loan.status}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 self-end sm:self-auto">
                    <div className="text-right">
                      <div className="text-xs text-muted-foreground">Saldo Restante</div>
                      <div className="text-base font-mono font-bold text-foreground">
                        {loan.remainingPrincipal.toFixed(2)} {loan.currency}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openLoanDetails(loan.id)}
                        className="text-xs h-8 px-2.5"
                      >
                        Ver Cuotas
                      </Button>
                      {loan.status !== "Paid" && loan.status !== "Cancelled" && (
                        <Button
                          size="sm"
                          onClick={() => openPaymentModal(loan.id)}
                          className="text-xs h-8 px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                          Registrar Pago
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

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
              <div key={acc.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center py-4 px-6 hover:bg-muted/10 transition-colors gap-3">
                <div>
                  <div className="font-semibold text-sm text-foreground">{acc.name}</div>
                  <div className="text-xs text-muted-foreground">{acc.type} · Moneda: {acc.currency}</div>
                </div>
                <div className="flex items-center gap-4 self-end sm:self-auto">
                  <div className={`text-base font-mono font-bold ${acc.balance.isNegative() ? "text-destructive" : "text-foreground"}`}>
                    {acc.balance.toFixed(2)} {acc.currency}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openReconcileModal(acc)}
                    className="text-xs h-7 px-2.5 text-muted-foreground hover:text-foreground"
                  >
                    ⚖️ Conciliar
                  </Button>
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

      {/* Modal: Reconcile Account (ACC-06) */}
      {isReconcileModalOpen && reconcileAccount && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md shadow-xl bg-background border">
            <CardHeader className="border-b">
              <CardTitle className="text-lg">Conciliar Saldo: {reconcileAccount.name}</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <form onSubmit={handleReconcileSubmit} className="space-y-4">
                <div className="p-3 bg-muted rounded-md text-xs space-y-1">
                  <div>Saldo actual en el Libro Mayor: <span className="font-mono font-bold">{reconcileAccount.balance.toFixed(2)} {reconcileAccount.currency}</span></div>
                  <div className="text-muted-foreground">Si el saldo real de tu extracto difiere, el sistema registrará un movimiento de ajuste automático (ACC-06).</div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="reconcileRealBalance">Saldo Real Verificado ({reconcileAccount.currency})</Label>
                  <Input
                    id="reconcileRealBalance"
                    type="number"
                    step="0.01"
                    required
                    value={reconcileRealBalance}
                    onChange={(e) => setReconcileRealBalance(e.target.value)}
                  />
                </div>

                {(() => {
                  const realVal = parseFloat(reconcileRealBalance);
                  if (isNaN(realVal)) return null;
                  const diff = realVal - reconcileAccount.balance.toNumber();
                  return (
                    <div className={`text-xs font-mono font-semibold ${diff === 0 ? "text-muted-foreground" : diff > 0 ? "text-emerald-600" : "text-rose-600"}`}>
                      Diferencia calculada: {diff > 0 ? "+" : ""}{diff.toFixed(2)} {reconcileAccount.currency}
                    </div>
                  );
                })()}

                <div className="space-y-1.5">
                  <Label htmlFor="reconcileNotes">Nota o motivo de la conciliación (opcional)</Label>
                  <Input
                    id="reconcileNotes"
                    type="text"
                    value={reconcileNotes}
                    onChange={(e) => setReconcileNotes(e.target.value)}
                    placeholder="Ej. Extracto mensual del banco"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t">
                  <Button type="button" variant="outline" onClick={() => setIsReconcileModalOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={submitting}>
                    {submitting ? "Conciliando..." : "Aplicar Ajuste"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Modal: Import CSV Statement (ING-11) */}
      {isCsvModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-lg shadow-xl bg-background border">
            <CardHeader className="border-b">
              <CardTitle className="text-lg">Importar Extracto Bancario CSV</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <form onSubmit={handleImportCsvSubmit} className="space-y-4">
                <p className="text-xs text-muted-foreground">
                  Carga los movimientos de tu banco. El motor deduplicará automáticamente contra movimientos ya capturados por notificaciones (ING-11).
                </p>

                <div className="space-y-1.5">
                  <Label htmlFor="csvAccount">Imputar a la cuenta</Label>
                  <select
                    id="csvAccount"
                    value={csvAccountId}
                    onChange={(e) => setCsvAccountId(e.target.value)}
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
                    value={csvFileName}
                    onChange={(e) => setCsvFileName(e.target.value)}
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
                  <Button type="button" variant="outline" onClick={() => setIsCsvModalOpen(false)}>
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
      )}

      {/* Modal: Create / Simulate Loan */}
      {isLoanModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <Card className="w-full max-w-2xl shadow-xl bg-background border my-8">
            <CardHeader className="border-b">
              <CardTitle className="text-lg">Simular y Registrar Préstamo / Deuda</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <form onSubmit={handleCreateLoanSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="loanCounterparty">Nombre de la Persona / Contraparte</Label>
                    <Input
                      id="loanCounterparty"
                      required
                      value={loanCounterparty}
                      onChange={(e) => setLoanCounterparty(e.target.value)}
                      placeholder="Ej. Carlos Méndez"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="loanType">Tipo de Operación</Label>
                    <select
                      id="loanType"
                      value={loanType}
                      onChange={(e) => setLoanType(e.target.value as "Lent" | "Borrowed")}
                      className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    >
                      <option value="Lent">Dinero que yo presto (Cobrar)</option>
                      <option value="Borrowed">Dinero que me prestaron (Pagar)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="loanPrincipal">Monto Capital</Label>
                    <Input
                      id="loanPrincipal"
                      type="number"
                      step="0.01"
                      required
                      value={loanPrincipal}
                      onChange={(e) => setLoanPrincipal(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="loanCurrency">Moneda</Label>
                    <select
                      id="loanCurrency"
                      value={loanCurrency}
                      onChange={(e) => setLoanCurrency(e.target.value)}
                      className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    >
                      <option value="BOB">Bolivianos (BOB)</option>
                      <option value="USD">Dólares (USD)</option>
                      <option value="USDT">Tether (USDT)</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="loanTemplate">Sistema de Amortización</Label>
                    <select
                      id="loanTemplate"
                      value={loanTemplate}
                      onChange={(e) => setLoanTemplate(e.target.value)}
                      className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    >
                      <option value="FixedInstallment">Cuota Fija (Francés)</option>
                      <option value="SimpleOnBalance">Capital Fijo (Alemán)</option>
                      <option value="FlatOnInitialCapital">Interés Fijo s/ Capital (Flat)</option>
                      <option value="InterestOnly">Solo Intereses (Americano)</option>
                      <option value="NoInterest">Sin Interés</option>
                      <option value="SinglePaymentCompound">Pago Único Capitalizado</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="loanRate">Tasa de Interés Mensual (ej. 0.02 = 2%)</Label>
                    <Input
                      id="loanRate"
                      type="number"
                      step="0.001"
                      value={loanRate}
                      onChange={(e) => setLoanRate(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="loanInstallments">Número de Cuotas</Label>
                    <Input
                      id="loanInstallments"
                      type="number"
                      min="1"
                      max="120"
                      value={loanInstallments}
                      onChange={(e) => setLoanInstallments(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="loanDisbursementAcc">Cuenta de desembolso en el Libro Mayor (opcional)</Label>
                  <select
                    id="loanDisbursementAcc"
                    value={loanDisbursementAcc}
                    onChange={(e) => setLoanDisbursementAcc(e.target.value)}
                    className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <option value="">(Sin imputar en cuenta del Libro Mayor)</option>
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name} ({a.currency} - Saldo: {a.balance.toFixed(2)})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={handleSimulateSchedule} className="text-xs">
                    🔍 Calcular Cronograma y TEA
                  </Button>
                </div>

                {/* Simulated Schedule Preview */}
                {simulatedSchedule && (
                  <div className="mt-4 p-4 bg-muted/40 rounded-lg border space-y-3">
                    <div className="flex justify-between items-center text-xs font-semibold">
                      <span>Total Intereses: <span className="font-mono text-primary">{simulatedSchedule.totalInterest.toFixed(2)} {loanCurrency}</span></span>
                      <span>Total a Pagar: <span className="font-mono text-primary">{simulatedSchedule.totalToPay.toFixed(2)} {loanCurrency}</span></span>
                      <span>TEA (Costo Real): <span className="font-mono text-amber-600 font-bold">{(simulatedSchedule.annualEffectiveRate * 100).toFixed(2)}%</span></span>
                    </div>

                    <div className="max-h-48 overflow-y-auto divide-y text-xs font-mono">
                      <div className="grid grid-cols-5 font-bold py-1 text-muted-foreground">
                        <span>#</span>
                        <span>Vencimiento</span>
                        <span>Capital</span>
                        <span>Interés</span>
                        <span>Total Cuota</span>
                      </div>
                      {simulatedSchedule.installments.map((inst) => (
                        <div key={inst.number} className="grid grid-cols-5 py-1">
                          <span>Cuota {inst.number}</span>
                          <span>{inst.dueDate}</span>
                          <span>{inst.principal.toFixed(2)}</span>
                          <span>{inst.interest.toFixed(2)}</span>
                          <span className="font-bold">{inst.total.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-4 border-t">
                  <Button type="button" variant="outline" onClick={() => setIsLoanModalOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={submitting}>
                    {submitting ? "Creando..." : "Guardar Préstamo"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Modal: Loan Installments Details */}
      {isLoanDetailModalOpen && selectedLoanDetail && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <Card className="w-full max-w-3xl shadow-xl bg-background border my-8">
            <CardHeader className="border-b flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg">Detalle del Préstamo: {selectedLoanDetail.summary.counterpartyName}</CardTitle>
                <p className="text-xs text-muted-foreground">
                  {selectedLoanDetail.summary.type === "Lent" ? "Dinero que presté" : "Deuda"} · {selectedLoanDetail.summary.template} · TEA: {(selectedLoanDetail.summary.annualEffectiveRate * 100).toFixed(2)}%
                </p>
              </div>
              <Button size="sm" variant="ghost" onClick={() => setIsLoanDetailModalOpen(false)}>
                ✕
              </Button>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="grid grid-cols-3 gap-4 p-3 bg-muted/40 rounded-lg text-xs">
                <div>Capital Inicial: <span className="font-mono font-bold">{selectedLoanDetail.summary.principal.toFixed(2)} {selectedLoanDetail.summary.currency}</span></div>
                <div>Saldo Pendiente: <span className="font-mono font-bold text-amber-600">{selectedLoanDetail.summary.remainingPrincipal.toFixed(2)} {selectedLoanDetail.summary.currency}</span></div>
                <div>Cuotas Totales: <span className="font-bold">{selectedLoanDetail.summary.totalInstallments}</span></div>
              </div>

              <div className="space-y-2">
                <h4 className="text-sm font-semibold">Cronograma de Cuotas</h4>
                <div className="max-h-60 overflow-y-auto border rounded-md divide-y text-xs font-mono">
                  <div className="grid grid-cols-6 font-bold py-2 px-3 bg-muted/30 text-muted-foreground">
                    <span>#</span>
                    <span>Vence</span>
                    <span>Esperado</span>
                    <span>Cap. Pagado</span>
                    <span>Int. Pagado</span>
                    <span>Estado</span>
                  </div>
                  {selectedLoanDetail.installments.map((inst) => (
                    <div key={inst.id} className="grid grid-cols-6 py-2 px-3 items-center">
                      <span>Cuota {inst.number}</span>
                      <span>{inst.dueDate}</span>
                      <span>{inst.expectedTotal.toFixed(2)}</span>
                      <span>{inst.paidPrincipal.toFixed(2)}</span>
                      <span>{inst.paidInterest.toFixed(2)}</span>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] w-fit font-sans font-semibold ${inst.status === "Paid" ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300" : inst.status === "Overdue" ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300" : "bg-muted text-muted-foreground"}`}>
                        {inst.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {selectedLoanDetail.payments.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold">Pagos Registrados ({selectedLoanDetail.payments.length})</h4>
                  <div className="max-h-40 overflow-y-auto border rounded-md divide-y text-xs font-mono">
                    {selectedLoanDetail.payments.map((pay) => (
                      <div key={pay.id} className="py-2 px-3 flex justify-between items-center">
                        <div>
                          <div>Fecha: {new Date(pay.paymentDate).toLocaleDateString()} {pay.note && `· ${pay.note}`}</div>
                          <div className="text-[11px] text-muted-foreground">
                            {pay.allocations.map((a) => `Cuota ${a.installmentNumber}: Cap ${a.toPrincipal.toFixed(2)} + Int ${a.toInterest.toFixed(2)}`).join(" | ")}
                          </div>
                        </div>
                        <div className="font-bold text-emerald-600">
                          +{pay.amount.toFixed(2)} {pay.currency}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Modal: Register Loan Payment */}
      {isLoanPaymentModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md shadow-xl bg-background border">
            <CardHeader className="border-b">
              <CardTitle className="text-lg">Registrar Pago a Préstamo</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <form onSubmit={handleLoanPaymentSubmit} className="space-y-4">
                <p className="text-xs text-muted-foreground">
                  El pago se imputará en cascada estricta (Mora $\rightarrow$ Interés Corriente $\rightarrow$ Capital) cubriendo las cuotas más antiguas primero (LOAN_ENGINE.md).
                </p>

                <div className="space-y-1.5">
                  <Label htmlFor="paymentAmount">Monto Pagado</Label>
                  <Input
                    id="paymentAmount"
                    type="number"
                    step="0.01"
                    required
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    placeholder="0.00"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="paymentAccount">Imputar en Cuenta del Libro Mayor (opcional)</Label>
                  <select
                    id="paymentAccount"
                    value={paymentAccountId}
                    onChange={(e) => setPaymentAccountId(e.target.value)}
                    className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <option value="">(Sin registrar movimiento en cuenta bancaria)</option>
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name} ({a.currency})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="paymentNote">Nota del Pago (opcional)</Label>
                  <Input
                    id="paymentNote"
                    type="text"
                    value={paymentNote}
                    onChange={(e) => setPaymentNote(e.target.value)}
                    placeholder="Ej. Pago cuota 1 en efectivo"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t">
                  <Button type="button" variant="outline" onClick={() => setIsLoanPaymentModalOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={submitting} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                    {submitting ? "Aplicando..." : "Confirmar Pago"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Modal: Simulate Bank Notification */}
      {isSimulateModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md shadow-xl bg-background border">
            <CardHeader className="border-b">
              <CardTitle className="text-lg">Simular Notificación Bancaria</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <form onSubmit={handleSimulateCapture} className="space-y-4">
                <p className="text-xs text-muted-foreground">
                  Ingresá el texto de una notificación bancaria de prueba (Android). El motor extraerá monto, moneda y sentido con reglas y creará un borrador en tu bandeja.
                </p>
                <div className="space-y-1.5">
                  <Label htmlFor="simulateText">Texto de la notificación</Label>
                  <Input
                    id="simulateText"
                    required
                    value={simulateText}
                    onChange={(e) => setSimulateText(e.target.value)}
                    placeholder="Ej. Transferencia recibida por Bs. 150.00 de Juan. Ref: 887711"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-4 border-t">
                  <Button type="button" variant="outline" onClick={() => setIsSimulateModalOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={submitting} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                    {submitting ? "Capturando..." : "Ingestar Evento"}
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
