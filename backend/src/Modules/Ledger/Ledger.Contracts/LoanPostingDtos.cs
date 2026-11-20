namespace Ledger.Contracts;

public sealed record LoanPostingRequestDto(Guid UserId, Guid LoanId, Guid? AccountId, decimal Amount,
    string Currency, string Direction, string Kind, Guid? CategoryId, DateTime OccurredAt, string? Description);
public sealed record LoanPostingResultDto(Guid? TransactionId, string? ErrorCode);
