import { IHttpClient } from "@/shared/application/http-client.contract";
import { toDecimal } from "@/shared/domain/money";
import { TransactionDirection } from "@/modules/ledger/domain/ledger.types";
import {
  ConfirmDraftRequest,
  ConnectBinanceKeyRequest,
  ConnectBinanceKeyResponse,
  DraftDto,
  DraftStatus,
  IIngestionRepository,
  ImportStatementCsvRequest,
  ImportStatementPdfRequest,
  StatementImportResult,
  SyncBinanceRequest,
  SyncBinanceResponse,
} from "../domain/ingestion.types";

export class IngestionApiRepository implements IIngestionRepository {
  constructor(private readonly http: IHttpClient) {}

  async getDrafts(status?: string, limit?: number): Promise<DraftDto[]> {
    interface RawDraftDto {
      id: string;
      source: string;
      status: DraftStatus;
      direction: TransactionDirection;
      amount: number | string;
      currency: string;
      estimatedDate: string;
      reference?: string;
      fingerprint: string;
      confidence: number;
      suggestedAccountId?: string;
      suggestedCategoryId?: string;
      confirmedAccountId?: string;
      confirmedCategoryId?: string;
      ledgerTransactionId?: string;
      createdAt: string;
      confirmedAt?: string;
      discardedAt?: string;
      linkedEventsCount: number;
    }

    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (limit) params.set("limit", limit.toString());

    const query = params.toString() ? `?${params.toString()}` : "";
    const raw = await this.http.get<RawDraftDto[]>(`/v1/drafts${query}`);

    return raw.map((d) => ({
      ...d,
      amount: toDecimal(d.amount),
    }));
  }

  async confirmDraft(
    id: string,
    req: ConfirmDraftRequest
  ): Promise<{ transactionId: string }> {
    return this.http.post<{ transactionId: string }>(`/v1/drafts/${id}/confirm`, req);
  }

  async discardDraft(id: string): Promise<{ message: string }> {
    return this.http.post<{ message: string }>(`/v1/drafts/${id}/discard`);
  }

  async importStatementCsv(
    req: ImportStatementCsvRequest
  ): Promise<StatementImportResult> {
    return this.http.post<StatementImportResult>(
      "/v1/ingestion/statements/import-csv",
      req
    );
  }

  async importStatementPdf(
    req: ImportStatementPdfRequest
  ): Promise<StatementImportResult> {
    return this.http.post<StatementImportResult>(
      "/v1/ingestion/statements/import-pdf",
      req
    );
  }

  async connectBinanceKey(
    req: ConnectBinanceKeyRequest
  ): Promise<ConnectBinanceKeyResponse> {
    return this.http.post<ConnectBinanceKeyResponse>(
      "/v1/integrations/binance/connect",
      req
    );
  }

  async syncBinance(req: SyncBinanceRequest): Promise<SyncBinanceResponse> {
    return this.http.post<SyncBinanceResponse>(
      "/v1/integrations/binance/sync",
      req
    );
  }

  async ingestRawNotification(
    maskedText: string,
    sourceId: string = "com.banco.union"
  ): Promise<void> {
    const eventId =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : "11111111-1111-1111-1111-111111111111";

    await this.http.post(
      "/v1/ingestion/events",
      {
        eventId,
        channel: "notification",
        sourceId,
        maskedText,
      },
      {
        headers: {
          "Idempotency-Key": eventId,
        },
      }
    );
  }
}
