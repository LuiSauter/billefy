"use client";

import { useState, useMemo, useCallback } from "react";
import { notify } from "@/shared/lib/notify";
import { IHttpClient } from "@/shared/application/http-client.contract";
import {
  ConfirmDraftRequest,
  ConnectBinanceKeyRequest,
  DraftDto,
  ImportStatementCsvRequest,
} from "../domain/ingestion.types";
import { IngestionApiRepository } from "../infrastructure/ingestion-api.repository";

export function useIngestionModule(
  http: IHttpClient | null,
  onLedgerImpacted?: () => Promise<void>
) {
  const [drafts, setDrafts] = useState<DraftDto[]>([]);

  const repo = useMemo(
    () => (http ? new IngestionApiRepository(http) : null),
    [http]
  );

  const refreshDrafts = useCallback(async () => {
    if (!repo) return;
    const data = await repo.getDrafts();
    setDrafts(data);
  }, [repo]);

  const pendingDrafts = useMemo(
    () => drafts.filter((d) => d.status === "Pending" || d.status === "Review"),
    [drafts]
  );

  const confirmDraft = useCallback(
    async (draftId: string, req: ConfirmDraftRequest) => {
      if (!repo) return;
      await repo.confirmDraft(draftId, req);
      await Promise.all([refreshDrafts(), onLedgerImpacted?.()]);
    },
    [repo, refreshDrafts, onLedgerImpacted]
  );

  const discardDraft = useCallback(
    async (draftId: string) => {
      if (!repo) return;
      await repo.discardDraft(draftId);
      await refreshDrafts();
    },
    [repo, refreshDrafts]
  );

  const importStatementCsv = useCallback(
    async (req: ImportStatementCsvRequest) => {
      if (!repo) throw new Error("Cliente no inicializado");
      const res = await repo.importStatementCsv(req);
      await refreshDrafts();
      return res;
    },
    [repo, refreshDrafts]
  );

  const connectBinance = useCallback(
    async (req: ConnectBinanceKeyRequest) => {
      if (!repo) throw new Error("Cliente no inicializado");
      return repo.connectBinanceKey(req);
    },
    [repo]
  );

  const syncBinance = useCallback(
    async (accountId: string) => {
      if (!repo) return;
      const res = await repo.syncBinance({ accountId });
      notify.success(
        "Sincronización completada",
        `Borradores creados: ${res.draftsCreated}, duplicados: ${res.duplicatesLinked}`
      );
      await refreshDrafts();
    },
    [repo, refreshDrafts]
  );

  const simulateRawEvent = useCallback(
    async (text: string) => {
      if (!repo) return;
      await repo.ingestRawNotification(text);
      await refreshDrafts();
    },
    [repo, refreshDrafts]
  );

  return {
    drafts,
    setDrafts,
    pendingDrafts,
    refreshDrafts,
    confirmDraft,
    discardDraft,
    importStatementCsv,
    connectBinance,
    syncBinance,
    simulateRawEvent,
  };
}
