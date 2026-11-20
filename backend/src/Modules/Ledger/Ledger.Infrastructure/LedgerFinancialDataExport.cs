using System.Text.Json;
using System.Text.Json.Serialization;
using Ledger.Contracts;
using Microsoft.EntityFrameworkCore;

namespace Ledger.Infrastructure;

public sealed class LedgerFinancialDataExport(LedgerDbContext db) : ILedgerFinancialDataExport
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        ReferenceHandler = ReferenceHandler.IgnoreCycles
    };

    public async Task<JsonElement> ExportForUserAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var accounts = await db.Accounts.AsNoTracking().Where(x => x.UserId == userId).ToListAsync(cancellationToken);
        var categories = await db.Categories.AsNoTracking().Where(x => x.UserId == userId).ToListAsync(cancellationToken);
        var transactions = await db.Transactions.AsNoTracking().Where(x => x.UserId == userId).ToListAsync(cancellationToken);
        var allocations = await db.TransactionCategoryAllocations.AsNoTracking()
            .Where(x => x.UserId == userId).ToListAsync(cancellationToken);

        return JsonSerializer.SerializeToElement(new { accounts, categories, transactions, allocations }, JsonOptions);
    }
}
