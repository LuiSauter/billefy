"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { IHttpClient } from "@/shared/application/http-client.contract";
import { notify } from "@/shared/lib/notify";
import { CreateInvestmentInput, Investment, InvestmentTransactionDto, RegisterInvestmentOperationInput } from "../domain/investment.types";
import { extractCryptoSymbol, fetchCryptoTicker } from "../domain/binance-market.service";
import { fetchStockQuote, StockQuote } from "../domain/stock-market.service";

export interface InvestmentCashInput { accountId: string; amount: string; description?: string; occurredAt?: string }
export interface InvestmentCashResult { ledgerTransactionId: string; investmentId: string; kind: "Contribution" | "Disposal" }

export interface SyncedCryptoAssetDto {
  asset: string;
  quantity: number;
  priceUsdt: number;
  valueUsdt: number;
  action: string;
}

export interface SyncBinancePortfolioResponse {
  assetsSynced: number;
  totalValuationUsdt: number;
  assets: SyncedCryptoAssetDto[];
  message: string;
}

export function useInvestments(http: IHttpClient | null) {
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [isSyncingLivePrices, setIsSyncingLivePrices] = useState(false);

  const refresh = useCallback(async () => {
    if (!http) return;
    try {
      const data = await http.get<Investment[]>("/v1/planning/investments");
      setInvestments(Array.isArray(data) ? data : []);
    } catch (err) {
      notify.error("No se pudieron cargar las inversiones", err);
    }
  }, [http]);

  const syncLiveCryptoPrices = useCallback(
    async (itemsToSync?: Investment[]): Promise<number> => {
      if (!http) return 0;
      const list = itemsToSync ?? investments;
      const syncableItems = list.filter(
        (i) =>
          i.quantity > 0 &&
          (i.kind === "crypto" || ((i.kind === "stocks" || i.kind === "funds") && !!i.ticker))
      );
      if (syncableItems.length === 0) return 0;

      setIsSyncingLivePrices(true);
      let updatedCount = 0;
      try {
        await Promise.allSettled(
          syncableItems.map(async (inv) => {
            try {
              let price = 0;
              if (inv.kind === "crypto") {
                const symbol = extractCryptoSymbol(inv);
                if (symbol) {
                  const ticker = await fetchCryptoTicker(symbol);
                  if (ticker && ticker.price > 0) price = ticker.price;
                }
              } else if (inv.ticker) {
                const quote = await fetchStockQuote(inv.ticker, http);
                if (quote && quote.price > 0) price = quote.price;
              }

              if (price > 0) {
                const freshValue = Number((inv.quantity * price).toFixed(2));
                if (Math.abs(freshValue - inv.currentValue) >= 0.01) {
                  await http.put(`/v1/planning/investments/${inv.id}/value`, {
                    currentValue: freshValue,
                    quantity: inv.quantity,
                  });
                  updatedCount++;
                }
              }
            } catch {
              // Ignore single asset fetch failure
            }
          })
        );
        if (updatedCount > 0) {
          const freshData = await http.get<Investment[]>("/v1/planning/investments");
          setInvestments(Array.isArray(freshData) ? freshData : []);
        }
      } finally {
        setIsSyncingLivePrices(false);
      }
      return updatedCount;
    },
    [http, investments]
  );

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const refreshAfterCash = useCallback(async () => {
    if (!http) throw new Error("No hay conexión disponible.");
    const data = await http.get<Investment[]>("/v1/planning/investments");
    setInvestments(Array.isArray(data) ? data : []);
  }, [http]);

  const recordCash = useCallback(async (id: string, kind: "Contribution" | "Disposal", input: InvestmentCashInput) => {
    if (!http) throw new Error("No hay conexión disponible.");
    return http.post<InvestmentCashResult>(`/v1/planning/investments/${id}/cash/${kind}`, input);
  }, [http]);

  const reverseCash = useCallback(async (transactionId: string) => {
    if (!http) throw new Error("No hay conexión disponible.");
    return http.post<InvestmentCashResult>(`/v1/planning/investment-cash/${transactionId}/reverse`);
  }, [http]);

  const createInvestment = useCallback(
    async (input: CreateInvestmentInput) => {
      if (!http) return;
      try {
        await http.post("/v1/planning/investments", {
          ...input,
          name: input.name.trim(),
        });
        const freshData = await http.get<Investment[]>("/v1/planning/investments");
        const list = Array.isArray(freshData) ? freshData : [];
        setInvestments(list);

        // Automatically update live market prices right after creation!
        if (
          input.kind === "crypto" ||
          ((input.kind === "stocks" || input.kind === "funds") && input.ticker)
        ) {
          await syncLiveCryptoPrices(list);
        }
      } catch (err) {
        notify.error("No se pudo guardar el activo", err);
      }
    },
    [http, syncLiveCryptoPrices]
  );

  /** Records a new valuation; the server derives the variation from history. */
  const updateInvestmentValue = useCallback(
    async (id: string, newValue: number, quantity?: number) => {
      if (!http) return;
      try {
        await http.put(`/v1/planning/investments/${id}/value`, {
          currentValue: newValue,
          quantity,
        });
        await refresh();
      } catch (err) {
        notify.error("No se pudo actualizar el valor", err);
      }
    },
    [http, refresh]
  );

  const deleteInvestment = useCallback(
    async (id: string) => {
      if (!http) return;
      try {
        await http.delete(`/v1/planning/investments/${id}`);
        await refresh();
      } catch (err) {
        notify.error("No se pudo eliminar el activo", err);
      }
    },
    [http, refresh]
  );

  const registerOperation = useCallback(
    async (investmentId: string, input: RegisterInvestmentOperationInput): Promise<InvestmentTransactionDto | null> => {
      if (!http) throw new Error("No hay conexión disponible.");
      try {
        const tx = await http.post<InvestmentTransactionDto>(
          `/v1/planning/investments/${investmentId}/operations`,
          input
        );
        await refresh();
        return tx;
      } catch (err) {
        notify.error("No se pudo registrar la operación", err);
        return null;
      }
    },
    [http, refresh]
  );

  const getTransactions = useCallback(
    async (investmentId: string): Promise<InvestmentTransactionDto[]> => {
      if (!http) return [];
      try {
        const data = await http.get<InvestmentTransactionDto[]>(
          `/v1/planning/investments/${investmentId}/transactions`
        );
        return Array.isArray(data) ? data : [];
      } catch (err) {
        notify.error("No se pudieron cargar las operaciones del activo", err);
        return [];
      }
    },
    [http]
  );

  const syncBinancePortfolio = useCallback(
    async (): Promise<SyncBinancePortfolioResponse> => {
      if (!http) throw new Error("No hay conexión disponible.");

      const res = await http.post<SyncBinancePortfolioResponse>(
        "/v1/integrations/binance/sync-portfolio",
        {}
      );

      await refresh();
      return res;
    },
    [http, refresh]
  );

  const getStockQuote = useCallback(
    async (ticker: string): Promise<StockQuote | null> => {
      return fetchStockQuote(ticker, http);
    },
    [http]
  );

  return useMemo(
    () => ({
      investments,
      createInvestment,
      updateInvestmentValue,
      deleteInvestment,
      registerOperation,
      getTransactions,
      getStockQuote,
      refreshAfterCash,
      recordCash,
      reverseCash,
      syncBinancePortfolio,
      syncLiveCryptoPrices,
      isSyncingLivePrices,
    }),
    [
      investments,
      createInvestment,
      updateInvestmentValue,
      deleteInvestment,
      registerOperation,
      getTransactions,
      getStockQuote,
      refreshAfterCash,
      recordCash,
      reverseCash,
      syncBinancePortfolio,
      syncLiveCryptoPrices,
      isSyncingLivePrices,
    ]
  );
}

export type InvestmentsController = ReturnType<typeof useInvestments>;
