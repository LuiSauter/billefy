namespace Ledger.Contracts;

public sealed record CreateTransactionFromDraftDto(
    Guid UserId,
    Guid AccountId,
    decimal Amount,
    string Currency,
    string Direction,
    Guid? CategoryId,
    DateTime OccurredAt,
    string? Description,
    Guid DraftId,
    string? Reference);

public interface ILedgerModule
{
    Task<Guid> CreateTransactionFromDraftAsync(
        CreateTransactionFromDraftDto dto,
        CancellationToken cancellationToken = default);
}
