import Decimal from "decimal.js";
import { TransactionDirection } from "@/modules/ledger/domain/ledger.types";

export type DraftStatus = "Review" | "Pending" | "Confirmed" | "Discarded";

export interface DraftDto {
  id: string;
  source: string;
  status: DraftStatus;
  direction: TransactionDirection;
  amount: Decimal;
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

export interface ConfirmDraftRequest {
  accountId: string;
  categoryId?: string;
  description?: string;
}

export interface ImportStatementCsvRequest {
  accountId: string;
  fileName: string;
  csvContent: string;
  currency: string;
}

export interface ImportStatementPdfRequest {
  accountId: string;
  fileName: string;
  pdfTextContent: string;
  currency: string;
}

export interface StatementImportResult {
  importId: string;
  fileName: string;
  fileHash: string;
  isDuplicateFile: boolean;
  warning?: string;
  totalRows: number;
  draftsCreated: number;
  duplicatesLinked: number;
}

export interface ConnectBinanceKeyRequest {
  apiKey: string;
  apiSecret: string;
  permitsTrading?: boolean;
  permitsWithdrawals?: boolean;
}

export interface ConnectBinanceKeyResponse {
  connected: boolean;
  status: string;
  message: string;
}

export interface SyncBinanceRequest {
  accountId: string;
}

export interface SyncBinanceResponse {
  draftsCreated: number;
  duplicatesLinked: number;
  status: string;
}

export interface IIngestionRepository {
  getDrafts(status?: string, limit?: number): Promise<DraftDto[]>;
  confirmDraft(id: string, req: ConfirmDraftRequest): Promise<{ transactionId: string }>;
  discardDraft(id: string): Promise<{ message: string }>;
  importStatementCsv(req: ImportStatementCsvRequest): Promise<StatementImportResult>;
  importStatementPdf(req: ImportStatementPdfRequest): Promise<StatementImportResult>;
  connectBinanceKey(req: ConnectBinanceKeyRequest): Promise<ConnectBinanceKeyResponse>;
  syncBinance(req: SyncBinanceRequest): Promise<SyncBinanceResponse>;
  ingestRawNotification(maskedText: string, sourceId?: string): Promise<void>;
}
