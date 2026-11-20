using System.Globalization;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using BuildingBlocks.Common;
using BuildingBlocks.Security;
using BuildingBlocks.Time;
using Ingestion.Application.Abstractions;
using Ingestion.Application.Deduplication;
using Ingestion.Domain.Drafts;
using Ingestion.Domain.Imports;

namespace Ingestion.Application.Services;

public sealed class StatementImportService(
    IStatementImportRepository importRepository,
    IDeduplicationService deduplicationService,
    IIngestionUnitOfWork unitOfWork,
    ICurrentUserContext userContext,
    IClock clock) : IStatementImportService
{
    private const int MaxStatementContentBytes = 5 * 1024 * 1024; // 5 MB max
    private const int MaxStatementLines = 10_000;

    public async Task<Result<StatementImportResult>> ImportCsvAsync(
        ImportStatementCsvRequest request,
        CancellationToken cancellationToken = default)
    {
        if (!userContext.IsAuthenticated)
        {
            return Result.Failure<StatementImportResult>(
                Error.Unauthorized("Auth.Unauthorized", "User is not authenticated."));
        }

        if (request.AccountId == Guid.Empty)
        {
            return Result.Failure<StatementImportResult>(
                Error.Validation("Import.InvalidAccount", "AccountId is required."));
        }

        if (string.IsNullOrWhiteSpace(request.CsvContent))
        {
            return Result.Failure<StatementImportResult>(
                Error.Validation("Import.EmptyContent", "CSV content cannot be empty."));
        }

        if (Encoding.UTF8.GetByteCount(request.CsvContent) > MaxStatementContentBytes)
        {
            return Result.Failure<StatementImportResult>(
                Error.Validation("Import.ContentTooLarge", "CSV statement exceeds maximum allowed size of 5 MB."));
        }

        var userId = userContext.UserId!.Value;

        // 1. Compute SHA-256 hash of CSV content for technical deduplication (ING-11)
        var contentBytes = Encoding.UTF8.GetBytes(request.CsvContent.Trim());
        var fileHash = Convert.ToHexStringLower(SHA256.HashData(contentBytes));

        var existingImport = await importRepository.GetByHashAsync(userId, fileHash, cancellationToken);
        var isDuplicateFile = existingImport is not null;
        string? warning = isDuplicateFile ? "This statement file was already imported previously." : null;

        // 2. Parse CSV rows
        var lines = request.CsvContent
            .Split(["\r\n", "\r", "\n"], StringSplitOptions.RemoveEmptyEntries)
            .Select(l => l.Trim())
            .Where(l => !string.IsNullOrWhiteSpace(l))
            .ToList();

        if (lines.Count == 0)
        {
            return Result.Failure<StatementImportResult>(
                Error.Validation("Import.NoRows", "CSV contains no data rows."));
        }

        if (lines.Count > MaxStatementLines)
        {
            return Result.Failure<StatementImportResult>(
                Error.Validation("Import.TooManyRows", $"CSV statement exceeds maximum allowed row count ({MaxStatementLines})."));
        }

        var (dateCol, descCol, amountCol, refCol, hasHeader) = DetectColumns(lines[0]);
        var startIndex = hasHeader ? 1 : 0;

        int totalRows = 0;
        int draftsCreated = 0;
        int duplicatesLinked = 0;

        for (int i = startIndex; i < lines.Count; i++)
        {
            var line = lines[i];
            var parts = ParseCsvLine(line);
            if (parts.Count < 3) continue;

            totalRows++;

            // Extract Date
            var dateStr = parts.ElementAtOrDefault(dateCol) ?? string.Empty;
            var estimatedDate = ParseDate(dateStr, clock.UtcNow);

            // Extract Description
            var desc = parts.ElementAtOrDefault(descCol)?.Trim();

            // Extract Reference
            var reference = refCol >= 0 ? parts.ElementAtOrDefault(refCol)?.Trim() : null;

            // Extract Amount and Direction
            var amountStr = parts.ElementAtOrDefault(amountCol) ?? string.Empty;
            if (!TryParseAmount(amountStr, out var rawAmount, out var parsedDirection))
            {
                continue;
            }

            var amount = Math.Abs(rawAmount);
            if (amount <= 0) continue;

            var currency = string.IsNullOrWhiteSpace(request.Currency) ? "BOB" : request.Currency.Trim().ToUpperInvariant();
            var eventId = Guid.NewGuid();

            var dedupResult = await deduplicationService.ProcessMovementAsync(
                userId,
                eventId,
                source: DraftSource.Csv,
                amount,
                currency,
                parsedDirection,
                estimatedDate,
                reference,
                confidence: 0.90m,
                suggestedAccountId: request.AccountId,
                suggestedCategoryId: null,
                cancellationToken: cancellationToken);

            if (dedupResult.IsDuplicate)
            {
                duplicatesLinked++;
            }
            else
            {
                draftsCreated++;
            }
        }

        // 3. Persist StatementImport Record
        var summary = new
        {
            totalRows,
            draftsCreated,
            duplicatesLinked,
            fileHash,
            warning
        };

        var statementImport = StatementImport.Create(
            userId,
            request.AccountId,
            format: "csv",
            fileName: request.FileName,
            fileHash: fileHash,
            status: isDuplicateFile ? "DuplicateWarning" : "Processed",
            summaryJson: JsonSerializer.Serialize(summary),
            createdAt: clock.UtcNow);

        if (!isDuplicateFile)
        {
            await importRepository.AddAsync(statementImport, cancellationToken);
            await unitOfWork.SaveChangesAsync(cancellationToken);
        }

        return Result.Success(new StatementImportResult(
            statementImport.Id,
            request.FileName,
            fileHash,
            isDuplicateFile,
            warning,
            totalRows,
            draftsCreated,
            duplicatesLinked));
    }

    public async Task<Result<StatementImportResult>> ImportPdfAsync(
        ImportStatementPdfRequest request,
        CancellationToken cancellationToken = default)
    {
        if (!userContext.IsAuthenticated)
        {
            return Result.Failure<StatementImportResult>(
                Error.Unauthorized("Auth.Unauthorized", "User is not authenticated."));
        }

        if (request.AccountId == Guid.Empty)
        {
            return Result.Failure<StatementImportResult>(
                Error.Validation("Import.InvalidAccount", "AccountId is required."));
        }

        if (string.IsNullOrWhiteSpace(request.PdfTextContent))
        {
            return Result.Failure<StatementImportResult>(
                Error.Validation("Import.EmptyContent", "PDF text content cannot be empty."));
        }

        if (Encoding.UTF8.GetByteCount(request.PdfTextContent) > MaxStatementContentBytes)
        {
            return Result.Failure<StatementImportResult>(
                Error.Validation("Import.ContentTooLarge", "PDF statement text exceeds maximum allowed size of 5 MB."));
        }

        var userId = userContext.UserId!.Value;

        // Technical SHA-256 deduplication
        var contentBytes = Encoding.UTF8.GetBytes(request.PdfTextContent.Trim());
        var fileHash = Convert.ToHexStringLower(SHA256.HashData(contentBytes));

        var existingImport = await importRepository.GetByHashAsync(userId, fileHash, cancellationToken);
        var isDuplicateFile = existingImport is not null;
        string? warning = isDuplicateFile ? "This PDF statement was already imported previously." : null;

        var lines = request.PdfTextContent
            .Split(["\r\n", "\r", "\n"], StringSplitOptions.RemoveEmptyEntries)
            .Select(l => l.Trim())
            .Where(l => !string.IsNullOrWhiteSpace(l))
            .ToList();

        if (lines.Count > MaxStatementLines)
        {
            return Result.Failure<StatementImportResult>(
                Error.Validation("Import.TooManyRows", $"PDF statement exceeds maximum allowed row count ({MaxStatementLines})."));
        }

        int totalRows = 0;
        int draftsCreated = 0;
        int duplicatesLinked = 0;

        foreach (var line in lines)
        {
            // Match movement row: e.g. "2025-05-12 Supermercado Hipermaxi -240.00 TX-1234"
            var tokens = line.Split([' ', '\t'], StringSplitOptions.RemoveEmptyEntries);
            if (tokens.Length < 3) continue;

            // First token date?
            if (!DateTime.TryParse(tokens[0], CultureInfo.InvariantCulture, DateTimeStyles.None, out var occurredAt))
            {
                var formats = new[] { "dd/MM/yyyy", "yyyy-MM-dd", "dd-MM-yyyy" };
                if (!DateTime.TryParseExact(tokens[0], formats, CultureInfo.InvariantCulture, DateTimeStyles.None, out occurredAt))
                {
                    continue; // Skip non-movement text header lines
                }
            }

            // Find amount token (usually last or second to last token)
            decimal amount = 0m;
            DraftDirection direction = DraftDirection.Expense;
            int amountIdx = -1;

            for (int i = tokens.Length - 1; i >= 1; i--)
            {
                if (TryParseAmount(tokens[i], out amount, out direction))
                {
                    amountIdx = i;
                    break;
                }
            }

            if (amountIdx == -1 || amount <= 0) continue;

            totalRows++;

            var descTokens = tokens.Skip(1).Take(amountIdx - 1);
            var description = string.Join(" ", descTokens);
            if (string.IsNullOrWhiteSpace(description)) description = "Movimiento extracto PDF";

            var reference = amountIdx < tokens.Length - 1 ? string.Join(" ", tokens.Skip(amountIdx + 1)) : null;

            var currency = string.IsNullOrWhiteSpace(request.Currency) ? "BOB" : request.Currency.Trim().ToUpperInvariant();
            var eventId = Guid.NewGuid();

            var dedupResult = await deduplicationService.ProcessMovementAsync(
                userId,
                eventId,
                source: DraftSource.Pdf,
                amount,
                currency,
                direction,
                occurredAt,
                reference,
                confidence: 0.90m,
                suggestedAccountId: request.AccountId,
                suggestedCategoryId: null,
                cancellationToken: cancellationToken);

            if (dedupResult.IsDuplicate)
            {
                duplicatesLinked++;
            }
            else
            {
                draftsCreated++;
            }
        }

        var statementImport = StatementImport.Create(
            userId,
            request.AccountId,
            format: "pdf",
            fileName: request.FileName,
            fileHash: fileHash,
            status: isDuplicateFile ? "DuplicateWarning" : "Processed",
            summaryJson: JsonSerializer.Serialize(new { totalRows, draftsCreated, duplicatesLinked, fileHash, warning }),
            createdAt: clock.UtcNow);

        if (!isDuplicateFile)
        {
            await importRepository.AddAsync(statementImport, cancellationToken);
            await unitOfWork.SaveChangesAsync(cancellationToken);
        }

        return Result.Success(new StatementImportResult(
            statementImport.Id,
            request.FileName,
            fileHash,
            isDuplicateFile,
            warning,
            totalRows,
            draftsCreated,
            duplicatesLinked));
    }

    private static (int dateCol, int descCol, int amountCol, int refCol, bool hasHeader) DetectColumns(string firstLine)
    {
        var headers = ParseCsvLine(firstLine).Select(h => h.Trim().ToLowerInvariant()).ToList();

        int dateCol = -1;
        int descCol = -1;
        int amountCol = -1;
        int refCol = -1;

        for (int i = 0; i < headers.Count; i++)
        {
            var h = headers[i];
            if (h.Contains("fecha") || h.Contains("date")) dateCol = i;
            else if (h.Contains("desc") || h.Contains("glosa") || h.Contains("detalle") || h.Contains("concepto")) descCol = i;
            else if (h.Contains("monto") || h.Contains("importe") || h.Contains("amount") || h.Contains("valor")) amountCol = i;
            else if (h.Contains("ref") || h.Contains("nro") || h.Contains("comprobante") || h.Contains("tx")) refCol = i;
        }

        bool hasHeader = dateCol >= 0 || descCol >= 0 || amountCol >= 0;

        if (dateCol == -1) dateCol = 0;
        if (descCol == -1) descCol = 1;
        if (amountCol == -1) amountCol = 2;
        if (refCol == -1 && headers.Count > 3) refCol = 3;

        return (dateCol, descCol, amountCol, refCol, hasHeader);
    }

    private static List<string> ParseCsvLine(string line)
    {
        // Simple comma / semicolon separator handler
        var separator = line.Contains(';') ? ';' : ',';
        var result = new List<string>();
        var inQuotes = false;
        var sb = new StringBuilder();

        for (int i = 0; i < line.Length; i++)
        {
            var c = line[i];
            if (c == '"')
            {
                inQuotes = !inQuotes;
            }
            else if (c == separator && !inQuotes)
            {
                result.Add(sb.ToString().Trim(' ', '"'));
                sb.Clear();
            }
            else
            {
                sb.Append(c);
            }
        }

        result.Add(sb.ToString().Trim(' ', '"'));
        return result;
    }

    private static DateTime ParseDate(string raw, DateTime defaultDateUtc)
    {
        var formats = new[] { "yyyy-MM-dd", "dd/MM/yyyy", "MM/dd/yyyy", "dd-MM-yyyy", "yyyy/MM/dd" };
        if (DateTime.TryParseExact(raw.Trim(), formats, CultureInfo.InvariantCulture, DateTimeStyles.AssumeUniversal | DateTimeStyles.AdjustToUniversal, out var dt))
        {
            return dt;
        }

        if (DateTime.TryParse(raw.Trim(), CultureInfo.InvariantCulture, DateTimeStyles.AssumeUniversal | DateTimeStyles.AdjustToUniversal, out var fallback))
        {
            return fallback;
        }

        return defaultDateUtc;
    }

    private static bool TryParseAmount(string raw, out decimal amount, out DraftDirection direction)
    {
        amount = 0m;
        direction = DraftDirection.Expense;

        if (string.IsNullOrWhiteSpace(raw)) return false;

        var clean = raw.Trim().Replace(" ", "");
        var isNegative = clean.StartsWith('-') || clean.StartsWith('(');

        clean = clean.Replace("-", "").Replace("+", "").Replace("(", "").Replace(")", "").Replace("$", "").Replace("Bs", "");

        if (clean.Contains('.') && clean.Contains(','))
        {
            var dot = clean.LastIndexOf('.');
            var comma = clean.LastIndexOf(',');
            clean = comma > dot ? clean.Replace(".", "").Replace(',', '.') : clean.Replace(",", "");
        }
        else if (clean.Contains(','))
        {
            clean = clean.Replace(',', '.');
        }

        if (decimal.TryParse(clean, NumberStyles.Number, CultureInfo.InvariantCulture, out amount))
        {
            direction = isNegative ? DraftDirection.Expense : DraftDirection.Income;
            return true;
        }

        return false;
    }
}
