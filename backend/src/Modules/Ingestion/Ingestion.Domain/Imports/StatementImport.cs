using BuildingBlocks.Common;

namespace Ingestion.Domain.Imports;

public sealed class StatementImport : Entity
{
    public Guid AccountId { get; private init; }
    public string Format { get; private init; }
    public string FileName { get; private init; }
    public string FileHash { get; private init; }
    public string Status { get; private set; }
    public string? SummaryJson { get; private set; }

    private StatementImport() : base()
    {
        Format = "csv";
        FileName = string.Empty;
        FileHash = string.Empty;
        Status = "Processed";
    }

    private StatementImport(
        Guid id,
        Guid userId,
        Guid accountId,
        string format,
        string fileName,
        string fileHash,
        string status,
        string? summaryJson,
        DateTime createdAt)
        : base(id, userId, createdAt)
    {
        if (accountId == Guid.Empty)
            throw new ArgumentException("AccountId cannot be empty.", nameof(accountId));

        if (string.IsNullOrWhiteSpace(fileName))
            throw new ArgumentException("FileName cannot be empty.", nameof(fileName));

        if (string.IsNullOrWhiteSpace(fileHash))
            throw new ArgumentException("FileHash cannot be empty.", nameof(fileHash));

        AccountId = accountId;
        Format = format;
        FileName = fileName;
        FileHash = fileHash;
        Status = status;
        SummaryJson = summaryJson;
    }

    public static StatementImport Create(
        Guid userId,
        Guid accountId,
        string format,
        string fileName,
        string fileHash,
        string status,
        string? summaryJson,
        DateTime createdAt)
    {
        return new StatementImport(
            Guid.NewGuid(),
            userId,
            accountId,
            format,
            fileName,
            fileHash,
            status,
            summaryJson,
            createdAt);
    }
}
