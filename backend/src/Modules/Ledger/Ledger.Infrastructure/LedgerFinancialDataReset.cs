using Ledger.Contracts;
using Microsoft.EntityFrameworkCore;

namespace Ledger.Infrastructure;

public sealed class LedgerFinancialDataReset(LedgerDbContext db) : ILedgerFinancialDataReset
{
    public async Task ResetForUserAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        await db.TransactionCategoryAllocations.Where(x => x.UserId == userId).ExecuteDeleteAsync(cancellationToken);
        await db.Transactions.Where(x => x.UserId == userId).ExecuteDeleteAsync(cancellationToken);
        await db.Categories.Where(x => x.UserId == userId).ExecuteDeleteAsync(cancellationToken);
        await db.Accounts.Where(x => x.UserId == userId).ExecuteDeleteAsync(cancellationToken);
    }
}
