import Decimal from "decimal.js";
import { toDecimal } from "@/shared/domain/money";
import { AccountDto } from "./ledger.types";
import { LoanSummaryDto } from "@/modules/lending/domain/lending.types";
import { RateSnapshotDto } from "@/modules/fx/domain/fx.types";

export interface BalanceMetrics {
  totalPatrimonioBob: string;
  consolidatedUsd: string;
  bankLiquidityBob: string;
  cryptoUsdt: string;
  cryptoEquivalentBob: string;
  netLoansBob: string;
  isNetLoansPositive: boolean;
  activeLoansCount: number;
}

export interface PortfolioTotals {
  bobTotal: Decimal;
  usdTotal: Decimal;
  consolidatedUsd: Decimal;
}

export function calculatePortfolioTotals(
  accounts: AccountDto[],
  rate: RateSnapshotDto | null
): PortfolioTotals {
  let bobTotal = new Decimal(0);
  let usdTotal = new Decimal(0);

  for (const acc of accounts) {
    if (acc.currency === "BOB") {
      bobTotal = bobTotal.plus(acc.balance);
    } else if (acc.currency === "USD" || acc.currency === "USDT") {
      usdTotal = usdTotal.plus(acc.balance);
    }
  }

  let consolidatedUsd = usdTotal;
  if (rate && rate.appliedRate > 0) {
    const bobValuedInUsd = bobTotal.dividedBy(new Decimal(rate.appliedRate));
    consolidatedUsd = usdTotal.plus(bobValuedInUsd);
  }

  return { bobTotal, usdTotal, consolidatedUsd };
}

export function calculateBalanceMetrics({
  accounts,
  loans,
  bobTotal,
  usdTotal,
  consolidatedUsd,
  p2pRate,
}: {
  accounts: AccountDto[];
  loans: LoanSummaryDto[];
  bobTotal: Decimal;
  usdTotal: Decimal;
  consolidatedUsd: Decimal;
  p2pRate: number;
}): BalanceMetrics {
  const rateDecimal = new Decimal(p2pRate > 0 ? p2pRate : 9.85);

  const bankBob = accounts
    .filter((a) => a.currency === "BOB" && a.type !== "Exchange")
    .reduce((acc, a) => acc.plus(toDecimal(a.balance)), new Decimal(0));

  const crypto = accounts
    .filter((a) => a.type === "Exchange" || a.currency === "USDT")
    .reduce((acc, a) => acc.plus(toDecimal(a.balance)), new Decimal(0));
  const cryptoInBob = crypto.times(rateDecimal);

  const totalBob = bobTotal.plus(usdTotal.times(rateDecimal));

  const netLoans = loans.reduce((acc, l) => {
    const rawBal = toDecimal(l.remainingPrincipal);
    const bal =
      l.currency === "USD" || l.currency === "USDT" || l.currency === "USDC"
        ? rawBal.times(rateDecimal)
        : rawBal;
    return l.type === "Lent" ? acc.plus(bal) : acc.minus(bal);
  }, new Decimal(0));

  return {
    totalPatrimonioBob: totalBob.toFixed(2),
    consolidatedUsd: consolidatedUsd.toFixed(2),
    bankLiquidityBob: bankBob.toFixed(2),
    cryptoUsdt: crypto.toFixed(2),
    cryptoEquivalentBob: cryptoInBob.toFixed(0),
    netLoansBob: `${netLoans.gte(0) ? "+" : ""}Bs. ${netLoans.toFixed(2)}`,
    isNetLoansPositive: netLoans.gte(0),
    activeLoansCount: loans.filter((l) => l.status === "Active").length,
  };
}
