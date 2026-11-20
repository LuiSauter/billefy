using Lending.Contracts;
using Microsoft.EntityFrameworkCore;

namespace Lending.Infrastructure;

public sealed class LendingFinancialDataReset(LendingDbContext db) : ILendingFinancialDataReset
{
    public async Task ResetForUserAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        // Explicitly remove child allocations, payments, and installments before loans
        // to guarantee full isolation across all providers regardless of DB cascade triggers.
        await db.PaymentAllocations
            .Where(a => db.Payments.Where(p => p.UserId == userId).Select(p => p.Id).Contains(a.PaymentId))
            .ExecuteDeleteAsync(cancellationToken);
        await db.Purchases.Where(x => x.UserId == userId).ExecuteDeleteAsync(cancellationToken);
        await db.Payments.Where(x => x.UserId == userId).ExecuteDeleteAsync(cancellationToken);
        await db.Installments
            .Where(i => db.Loans.Where(l => l.UserId == userId).Select(l => l.Id).Contains(i.LoanId))
            .ExecuteDeleteAsync(cancellationToken);
        await db.Loans.Where(x => x.UserId == userId).ExecuteDeleteAsync(cancellationToken);
        await db.Counterparties.Where(x => x.UserId == userId).ExecuteDeleteAsync(cancellationToken);
    }
}
