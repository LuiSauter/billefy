"use client";

import { Amount } from "@/shared/ui/amount";
import { useNumberFormat } from "@/shared/hooks/use-number-format";
import { formatCurrencyLabel } from "@/shared/lib/currency";

interface AccountBalanceDisplayProps {
  bobAmount: string;
  usdAmount: string;
  p2pRate: number;
  selectedCurrency: "BOB" | "USD";
  size?: "lg" | "xl";
  className?: string;
  amountClassName?: string;
}

export function AccountBalanceDisplay({
  bobAmount,
  usdAmount,
  p2pRate,
  selectedCurrency,
  size = "xl",
  className,
  amountClassName,
}: AccountBalanceDisplayProps) {
  const format = useNumberFormat();
  const isBob = selectedCurrency === "BOB";
  const convertedCurrency = isBob ? "USD" : "BOB";
  const convertedAmount = isBob ? usdAmount : bobAmount;

  return (
    <div className={className}>
      <Amount value={isBob ? bobAmount : usdAmount} currency={selectedCurrency} size={size} className={amountClassName} />
      <div className="text-xs font-medium text-muted-foreground">
        ≈ <Amount value={convertedAmount} currency={convertedCurrency} size="xs" className="text-muted-foreground" />
        <span> (P2P {formatCurrencyLabel("BOB")} {format(p2pRate)})</span>
      </div>
    </div>
  );
}
