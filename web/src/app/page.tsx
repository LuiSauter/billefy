"use client";

import { useState, useMemo } from "react";
import Decimal from "decimal.js";
import { AccountDto, AccountType, TransactionDirection } from "../api/client";

export default function DashboardPage() {
  const [accounts, setAccounts] = useState<AccountDto[]>([
    {
      id: "acc-1",
      name: "Banco Unión (Ahorros)",
      type: "Bank",
      currency: "BOB",
      balance: new Decimal(4500.0),
      createdAt: new Date().toISOString(),
    },
    {
      id: "acc-2",
      name: "Efectivo Billetera",
      type: "Cash",
      currency: "BOB",
      balance: new Decimal(350.0),
      createdAt: new Date().toISOString(),
    },
    {
      id: "acc-3",
      name: "Billetera Dólares",
      type: "Wallet",
      currency: "USD",
      balance: new Decimal(820.0),
      createdAt: new Date().toISOString(),
    },
  ]);

  const [rate] = useState({
    buyRate: 11.96,
    sellRate: 12.0,
    source: "Binance P2P (DolarApi)",
    updatedAt: "Hace 5 minutos",
  });

  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [isTxnModalOpen, setIsTxnModalOpen] = useState(false);

  // Form states
  const [newAccountName, setNewAccountName] = useState("");
  const [newAccountType, setNewAccountType] = useState<AccountType>("Bank");
  const [newAccountCurrency, setNewAccountCurrency] = useState("BOB");
  const [newAccountBalance, setNewAccountBalance] = useState("0");

  const [txnAccountId, setTxnAccountId] = useState("acc-1");
  const [txnAmount, setTxnAmount] = useState("");
  const [txnDirection, setTxnDirection] = useState<TransactionDirection>("Expense");
  const [txnDescription, setTxnDescription] = useState("");

  // Consolidated balances
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

    // Rule 19: BOB in USD uses Buy rate: bob / buyRate
    const bobValuedInUsd = bobTotal.dividedBy(new Decimal(rate.buyRate));
    const consolidatedUsd = usdTotal.plus(bobValuedInUsd);

    return { bobTotal, usdTotal, consolidatedUsd };
  }, [accounts, rate.buyRate]);

  const handleCreateAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAccountName.trim()) return;

    const newAcc: AccountDto = {
      id: `acc-${Date.now()}`,
      name: newAccountName.trim(),
      type: newAccountType,
      currency: newAccountCurrency,
      balance: new Decimal(newAccountBalance || "0"),
      createdAt: new Date().toISOString(),
    };

    setAccounts([...accounts, newAcc]);
    setNewAccountName("");
    setNewAccountBalance("0");
    setIsAccountModalOpen(false);
  };

  const handleRegisterTxn = (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(txnAmount);
    if (isNaN(amountNum) || amountNum <= 0) return;

    const decimalAmount = new Decimal(amountNum);

    setAccounts(
      accounts.map((acc) => {
        if (acc.id === txnAccountId) {
          const newBalance =
            txnDirection === "Income"
              ? acc.balance.plus(decimalAmount)
              : acc.balance.minus(decimalAmount);
          return { ...acc, balance: newBalance };
        }
        return acc;
      })
    );

    setTxnAmount("");
    setTxnDescription("");
    setIsTxnModalOpen(false);
  };

  return (
    <div style={{ maxWidth: "1000px", margin: "0 auto", padding: "2rem", fontFamily: "system-ui, -apple-system, sans-serif", color: "#1a1a1a" }}>
      {/* Header */}
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #e5e7eb", paddingBottom: "1rem", marginBottom: "2rem" }}>
        <div>
          <h1 style={{ fontSize: "1.75rem", fontWeight: "700", margin: 0, color: "#111827" }}>Billefy</h1>
          <p style={{ margin: "0.25rem 0 0 0", color: "#6b7280", fontSize: "0.875rem" }}>
            Gestor de finanzas personales multimoneda · Ledger Inmutable
          </p>
        </div>
        <div style={{ background: "#f3f4f6", padding: "0.5rem 1rem", borderRadius: "8px", fontSize: "0.85rem", textAlign: "right" }}>
          <div><strong>Cotización Paralela:</strong> Compra {rate.buyRate.toFixed(2)} / Venta {rate.sellRate.toFixed(2)} BOB/USD</div>
          <div style={{ color: "#6b7280", fontSize: "0.75rem" }}>Fuente: {rate.source} · {rate.updatedAt}</div>
        </div>
      </header>

      {/* Balance Summary Cards */}
      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "1rem", marginBottom: "2rem" }}>
        <div style={{ background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: "10px", padding: "1.25rem" }}>
          <div style={{ color: "#6b7280", fontSize: "0.875rem", marginBottom: "0.5rem" }}>Saldo Total en Bolivianos</div>
          <div style={{ fontSize: "1.5rem", fontWeight: "700", color: "#065f46" }}>
            {totals.bobTotal.toFixed(2)} BOB
          </div>
        </div>
        <div style={{ background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: "10px", padding: "1.25rem" }}>
          <div style={{ color: "#6b7280", fontSize: "0.875rem", marginBottom: "0.5rem" }}>Saldo Total en Dólares</div>
          <div style={{ fontSize: "1.5rem", fontWeight: "700", color: "#1e40af" }}>
            {totals.usdTotal.toFixed(2)} USD
          </div>
        </div>
        <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: "10px", padding: "1.25rem" }}>
          <div style={{ color: "#1e3a8a", fontSize: "0.875rem", marginBottom: "0.5rem" }}>Patrimonio Consolidado (USD)</div>
          <div style={{ fontSize: "1.5rem", fontWeight: "700", color: "#1e3a8a" }}>
            {totals.consolidatedUsd.toFixed(2)} USD
          </div>
          <div style={{ fontSize: "0.75rem", color: "#3b82f6", marginTop: "0.25rem" }}>Valuado a tasa de compra P2P (Regla 19)</div>
        </div>
      </section>

      {/* Action Buttons */}
      <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1.5rem" }}>
        <button
          onClick={() => setIsAccountModalOpen(true)}
          style={{ background: "#111827", color: "#fff", border: "none", padding: "0.6rem 1.2rem", borderRadius: "6px", cursor: "pointer", fontWeight: "500" }}
        >
          + Nueva Cuenta
        </button>
        <button
          onClick={() => setIsTxnModalOpen(true)}
          style={{ background: "#059669", color: "#fff", border: "none", padding: "0.6rem 1.2rem", borderRadius: "6px", cursor: "pointer", fontWeight: "500" }}
        >
          + Registrar Movimiento
        </button>
      </div>

      {/* Accounts List */}
      <section style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: "10px", overflow: "hidden" }}>
        <div style={{ padding: "1rem 1.25rem", borderBottom: "1px solid #e5e7eb", fontWeight: "600" }}>
          Tus Cuentas ({accounts.length})
        </div>
        <div>
          {accounts.map((acc) => (
            <div
              key={acc.id}
              style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1rem 1.25rem", borderBottom: "1px solid #f3f4f6" }}
            >
              <div>
                <div style={{ fontWeight: "600", color: "#111827" }}>{acc.name}</div>
                <div style={{ fontSize: "0.8rem", color: "#6b7280" }}>{acc.type} · Moneda: {acc.currency}</div>
              </div>
              <div style={{ fontSize: "1.2rem", fontWeight: "700", color: acc.balance.isNegative() ? "#dc2626" : "#111827" }}>
                {acc.balance.toFixed(2)} {acc.currency}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Modal: Create Account */}
      {isAccountModalOpen && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
          <div style={{ background: "#fff", borderRadius: "10px", padding: "1.5rem", width: "100%", maxWidth: "450px" }}>
            <h3 style={{ margin: "0 0 1rem 0" }}>Crear Nueva Cuenta</h3>
            <form onSubmit={handleCreateAccount} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.875rem", marginBottom: "0.25rem" }}>Nombre</label>
                <input
                  type="text"
                  required
                  value={newAccountName}
                  onChange={(e) => setNewAccountName(e.target.value)}
                  placeholder="Ej. Banco Unión, Billetera USDT"
                  style={{ width: "100%", padding: "0.5rem", borderRadius: "6px", border: "1px solid #d1d5db" }}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.875rem", marginBottom: "0.25rem" }}>Tipo</label>
                <select
                  value={newAccountType}
                  onChange={(e) => setNewAccountType(e.target.value as AccountType)}
                  style={{ width: "100%", padding: "0.5rem", borderRadius: "6px", border: "1px solid #d1d5db" }}
                >
                  <option value="Bank">Banco</option>
                  <option value="Wallet">Billetera Digital</option>
                  <option value="Cash">Efectivo</option>
                  <option value="Exchange">Exchange (Crypto)</option>
                </select>
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.875rem", marginBottom: "0.25rem" }}>Moneda</label>
                <select
                  value={newAccountCurrency}
                  onChange={(e) => setNewAccountCurrency(e.target.value)}
                  style={{ width: "100%", padding: "0.5rem", borderRadius: "6px", border: "1px solid #d1d5db" }}
                >
                  <option value="BOB">Bolivianos (BOB)</option>
                  <option value="USD">Dólares (USD)</option>
                  <option value="USDT">Tether (USDT)</option>
                </select>
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.875rem", marginBottom: "0.25rem" }}>Saldo Inicial</label>
                <input
                  type="number"
                  step="0.01"
                  value={newAccountBalance}
                  onChange={(e) => setNewAccountBalance(e.target.value)}
                  style={{ width: "100%", padding: "0.5rem", borderRadius: "6px", border: "1px solid #d1d5db" }}
                />
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", marginTop: "1rem" }}>
                <button
                  type="button"
                  onClick={() => setIsAccountModalOpen(false)}
                  style={{ background: "#e5e7eb", border: "none", padding: "0.5rem 1rem", borderRadius: "6px", cursor: "pointer" }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  style={{ background: "#111827", color: "#fff", border: "none", padding: "0.5rem 1rem", borderRadius: "6px", cursor: "pointer" }}
                >
                  Guardar Cuenta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Register Transaction */}
      {isTxnModalOpen && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
          <div style={{ background: "#fff", borderRadius: "10px", padding: "1.5rem", width: "100%", maxWidth: "450px" }}>
            <h3 style={{ margin: "0 0 1rem 0" }}>Registrar Movimiento</h3>
            <form onSubmit={handleRegisterTxn} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.875rem", marginBottom: "0.25rem" }}>Cuenta</label>
                <select
                  value={txnAccountId}
                  onChange={(e) => setTxnAccountId(e.target.value)}
                  style={{ width: "100%", padding: "0.5rem", borderRadius: "6px", border: "1px solid #d1d5db" }}
                >
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.currency})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.875rem", marginBottom: "0.25rem" }}>Tipo de Movimiento</label>
                <select
                  value={txnDirection}
                  onChange={(e) => setTxnDirection(e.target.value as TransactionDirection)}
                  style={{ width: "100%", padding: "0.5rem", borderRadius: "6px", border: "1px solid #d1d5db" }}
                >
                  <option value="Expense">Gasto (-)</option>
                  <option value="Income">Ingreso (+)</option>
                </select>
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.875rem", marginBottom: "0.25rem" }}>Monto</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={txnAmount}
                  onChange={(e) => setTxnAmount(e.target.value)}
                  placeholder="0.00"
                  style={{ width: "100%", padding: "0.5rem", borderRadius: "6px", border: "1px solid #d1d5db" }}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.875rem", marginBottom: "0.25rem" }}>Descripción</label>
                <input
                  type="text"
                  value={txnDescription}
                  onChange={(e) => setTxnDescription(e.target.value)}
                  placeholder="Ej. Almuerzo, Taxi, Sueldo"
                  style={{ width: "100%", padding: "0.5rem", borderRadius: "6px", border: "1px solid #d1d5db" }}
                />
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", marginTop: "1rem" }}>
                <button
                  type="button"
                  onClick={() => setIsTxnModalOpen(false)}
                  style={{ background: "#e5e7eb", border: "none", padding: "0.5rem 1rem", borderRadius: "6px", cursor: "pointer" }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  style={{ background: "#059669", color: "#fff", border: "none", padding: "0.5rem 1rem", borderRadius: "6px", cursor: "pointer" }}
                >
                  Confirmar Movimiento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
