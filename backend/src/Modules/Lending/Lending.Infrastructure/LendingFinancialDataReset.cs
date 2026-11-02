using Lending.Contracts;
using Microsoft.EntityFrameworkCore;

namespace Lending.Infrastructure;

public sealed class LendingFinancialDataReset(LendingDbContext db) : ILendingFinancialDataReset
{
    public async Task ResetForUserAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        // Installments and payments (including allocations) cascade from the user's loans.
        await db.Loans.Where(x => x.UserId == userId).ExecuteDeleteAsync(cancellationToken);
        await db.Counterparties.Where(x => x.UserId == userId).ExecuteDeleteAsync(cancellationToken);
    }
}
