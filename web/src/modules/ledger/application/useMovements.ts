"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { IHttpClient } from "@/shared/application/http-client.contract";
import { LedgerApiRepository } from "../infrastructure/ledger-api.repository";
import { MovementPage, MovementQuery } from "../domain/movement";
export function useMovements(http: IHttpClient | null, query: MovementQuery) {
  const [data, setData] = useState<MovementPage | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const sequence = useRef(0);
  const reload = useCallback(() => setRetry((x) => x + 1), []);
  useEffect(() => {
    if (!http) return;
    const controller = new AbortController();
    const requestId = ++sequence.current;
    setLoading(true); setError(null);
    const timer = setTimeout(() => {
      new LedgerApiRepository(http).getMovements(query, controller.signal).then((result) => {
        if (requestId === sequence.current) setData(result);
      }).catch((reason: unknown) => {
        if (requestId === sequence.current && !controller.signal.aborted) setError(reason instanceof Error ? reason.message : "No se pudieron cargar los movimientos.");
      }).finally(() => { if (requestId === sequence.current) setLoading(false); });
    }, query.search ? 300 : 0);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [http, query, retry]);
  return { data, loading, error, reload };
}
