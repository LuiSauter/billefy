using Ledger.Application.Abstractions;
using Ledger.Domain.Transactions;
using System.Linq.Expressions;
using Microsoft.EntityFrameworkCore;

namespace Ledger.Infrastructure.Repositories;

public sealed class TransactionRepository : ITransactionRepository
{
    private readonly LedgerDbContext _context;

    public TransactionRepository(LedgerDbContext context)
    {
        _context = context;
    }

    public async Task<Transaction?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default) =>
        await _context.Transactions.Include("_categoryAllocations").FirstOrDefaultAsync(t => t.Id == id, cancellationToken);

    public async Task<Transaction?> GetReversalByOriginalIdAsync(Guid originalId, CancellationToken cancellationToken = default) =>
        await _context.Transactions.IgnoreQueryFilters()
            .FirstOrDefaultAsync(t => t.ReversesId == originalId, cancellationToken);

    public async Task<IReadOnlyList<Transaction>> GetTransferLegsAsync(Guid userId, Guid transferId, CancellationToken cancellationToken = default) =>
        await _context.Transactions.IgnoreQueryFilters()
            .Where(t => t.UserId == userId && t.TransferId == transferId)
            .OrderBy(t => t.Direction)
            .ThenBy(t => t.Id)
            .ToListAsync(cancellationToken);

    public async Task<IReadOnlyList<Transaction>> GetByAccountIdAsync(Guid accountId, CancellationToken cancellationToken = default) =>
        await _context.Transactions
            .Where(t => t.AccountId == accountId)
            .OrderByDescending(t => t.OccurredAt)
            .ToListAsync(cancellationToken);

    public async Task<MovementQueryPage> GetMovementPageAsync(
        Guid userId, MovementRepositoryQuery query, CancellationToken cancellationToken = default)
    {
        var ownerTransactions = _context.Transactions.IgnoreQueryFilters().AsNoTracking().Where(t => t.UserId == userId);
        var search = string.IsNullOrWhiteSpace(query.Search) ? null : query.Search.Trim().ToLowerInvariant();
        var searchPattern = search is null ? null : $"%{search.Replace("!", "!!").Replace("%", "!%").Replace("_", "!_")}%";
        var ordinary = ApplyFilters(ownerTransactions.Where(t => t.TransferId == null), includeCategory: true);
        if (!query.AuditMode)
        {
            ordinary = ordinary.Where(t => t.ReversesId == null && !ownerTransactions.Any(reversal => reversal.ReversesId == t.Id));
        }
        if (query.Type == "Transfer") ordinary = ordinary.Where(_ => false);
        else if (query.Type is "Income" or "Expense")
        {
            var direction = query.Type == "Income" ? TransactionDirection.Income : TransactionDirection.Expense;
            ordinary = ordinary.Where(t => t.Direction == direction);
        }

        var transferRows = ownerTransactions.Where(t => t.TransferId != null);
        if (!query.AuditMode)
        {
            transferRows = transferRows.Where(t => t.ReversesId == null && !ownerTransactions.Any(reversal => reversal.ReversesId != null &&
                ownerTransactions.Any(original => original.Id == reversal.ReversesId && original.TransferId == t.TransferId)));
        }
        if (query.Type is "Income" or "Expense" || query.CategoryId.HasValue) transferRows = transferRows.Where(_ => false);
        if (query.AccountId.HasValue) transferRows = transferRows.Where(t => t.AccountId == query.AccountId.Value);
        else transferRows = transferRows.Where(t => t.Direction == TransactionDirection.Expense);
        transferRows = ApplyFilters(transferRows, includeCategory: false);

        var totalCount = await ordinary.CountAsync(cancellationToken) + await transferRows.CountAsync(cancellationToken);
        var directionFilter = query.Type is "Income" or "Expense" ? query.Type : null;
        var summaries = await _context.Database.SqlQuery<MovementQueryCurrencySummary>($"""
            SELECT currency AS "Currency",
                   COALESCE(SUM(CASE WHEN direction = 'Income' THEN amount ELSE 0 END), 0) AS "Income",
                   COALESCE(SUM(CASE WHEN direction = 'Expense' THEN amount ELSE 0 END), 0) AS "Expenses"
            FROM transactions
            WHERE user_id = {userId}
              AND transfer_id IS NULL
              AND ({query.StartUtc} IS NULL OR occurred_at >= {query.StartUtc})
              AND ({query.EndUtcExclusive} IS NULL OR occurred_at < {query.EndUtcExclusive})
              AND ({query.AccountId} IS NULL OR account_id = {query.AccountId})
              AND ({query.CategoryId} IS NULL OR category_id = {query.CategoryId} OR EXISTS (
                  SELECT 1 FROM transaction_category_allocations allocation
                  WHERE allocation.transaction_id = transactions.id AND allocation.category_id = {query.CategoryId}))
              AND ({directionFilter} IS NULL OR direction = {directionFilter})
              AND ({query.Type != "Transfer"})
              AND reverses_id IS NULL
              AND ({query.AuditMode} OR NOT EXISTS (
                  SELECT 1 FROM transactions reversal WHERE reversal.user_id = transactions.user_id AND reversal.reverses_id = transactions.id))
              AND ({searchPattern} IS NULL OR
                   LOWER(COALESCE(description, '')) LIKE {searchPattern} ESCAPE '!' OR
                   EXISTS (SELECT 1 FROM accounts a WHERE a.user_id = {userId} AND a.id = transactions.account_id AND LOWER(a.name) LIKE {searchPattern} ESCAPE '!') OR
                   EXISTS (SELECT 1 FROM categories c WHERE c.user_id = {userId} AND c.id = transactions.category_id AND LOWER(c.name) LIKE {searchPattern} ESCAPE '!'))
            GROUP BY currency
            ORDER BY currency
            """).ToListAsync(cancellationToken);

        var pageKeys = await ordinary.Select(transaction => new
            { transaction.Id, transaction.TransferId, transaction.OccurredAt })
            .Concat(transferRows.Select(transaction => new { transaction.Id, transaction.TransferId, transaction.OccurredAt }))
            .OrderByDescending(row => row.OccurredAt)
            .ThenByDescending(row => row.Id)
            .Skip((query.Page - 1) * query.PageSize)
            .Take(query.PageSize)
            .ToListAsync(cancellationToken);
        var pageIds = pageKeys.Select(row => row.Id).ToArray();
        Expression<Func<Transaction, MovementQueryRow>> projection = transaction => new(
            transaction.Id, transaction.AccountId,
            _context.Accounts.IgnoreQueryFilters().Where(a => a.UserId == userId && a.Id == transaction.AccountId).Select(a => a.Name).FirstOrDefault() ?? "",
            transaction.Amount.Amount, transaction.Amount.Currency.Code, transaction.Direction, transaction.CategoryId,
            _context.Categories.IgnoreQueryFilters().Where(c => c.UserId == userId && c.Id == transaction.CategoryId).Select(c => c.Name).FirstOrDefault(),
            transaction.OccurredAt, transaction.Description, transaction.ReversesId, transaction.TransferId,
            transaction.AppliedRate, transaction.RateSource, transaction.CreatedAt);
        var fetchedRepresentatives = await ownerTransactions.Where(row => pageIds.Contains(row.Id))
            .Select(projection).ToListAsync(cancellationToken);
        var allocationsByTransaction = pageIds.Length == 0
            ? new Dictionary<Guid, List<AllocationQueryRow>>()
            : await _context.TransactionCategoryAllocations.AsNoTracking().Where(allocation => pageIds.Contains(allocation.TransactionId))
                .Select(allocation => new { allocation.TransactionId, Row = new AllocationQueryRow(allocation.CategoryId,
                    _context.Categories.IgnoreQueryFilters().Where(category => category.UserId == userId && category.Id == allocation.CategoryId)
                        .Select(category => category.Name).FirstOrDefault(), allocation.Amount) })
                .GroupBy(item => item.TransactionId)
                .ToDictionaryAsync(group => group.Key, group => group.Select(item => item.Row).ToList(), cancellationToken);
        var representativeById = fetchedRepresentatives.ToDictionary(row => row.Id);
        var representatives = pageKeys.Select(key => representativeById[key.Id]).ToList();
        var transferIds = representatives.Where(row => row.TransferId.HasValue).Select(row => row.TransferId!.Value).Distinct().ToArray();
        var transferLegs = transferIds.Length == 0
            ? new List<MovementQueryRow>()
            : await ownerTransactions.Where(row => row.TransferId.HasValue && transferIds.Contains(row.TransferId.Value))
                .Select(projection).ToListAsync(cancellationToken);

        var entries = representatives.Select(row => row.TransferId is Guid transferId
            ? new MovementQueryEntry(row, transferLegs.Where(leg => leg.TransferId == transferId).OrderBy(leg => leg.Direction).ThenBy(leg => leg.Id).ToList(), true, [])
            : new MovementQueryEntry(row, new[] { row }, false, allocationsByTransaction.GetValueOrDefault(row.Id, []))).ToList();
        return new MovementQueryPage(entries, totalCount, summaries);

        IQueryable<Transaction> ApplyFilters(IQueryable<Transaction> source, bool includeCategory)
        {
            if (query.StartUtc.HasValue) source = source.Where(t => t.OccurredAt >= query.StartUtc.Value);
            if (query.EndUtcExclusive.HasValue) source = source.Where(t => t.OccurredAt < query.EndUtcExclusive.Value);
            if (query.AccountId.HasValue) source = source.Where(t => t.AccountId == query.AccountId.Value);
            if (includeCategory && query.CategoryId.HasValue) source = source.Where(t => t.CategoryId == query.CategoryId.Value ||
                _context.TransactionCategoryAllocations.Any(allocation => allocation.TransactionId == t.Id && allocation.CategoryId == query.CategoryId.Value));
            if (searchPattern is not null)
            {
                source = source.Where(t => EF.Functions.Like((t.Description ?? "").ToLower(), searchPattern, "!") ||
                    _context.Accounts.IgnoreQueryFilters().Any(a => a.UserId == userId && a.Id == t.AccountId &&
                        EF.Functions.Like(a.Name.ToLower(), searchPattern, "!")) ||
                    (includeCategory && _context.Categories.IgnoreQueryFilters().Any(c => c.UserId == userId && c.Id == t.CategoryId &&
                        EF.Functions.Like(c.Name.ToLower(), searchPattern, "!"))) ||
                    (!includeCategory && ownerTransactions.Any(other => other.TransferId == t.TransferId &&
                        _context.Accounts.IgnoreQueryFilters().Any(a => a.UserId == userId && a.Id == other.AccountId &&
                            EF.Functions.Like(a.Name.ToLower(), searchPattern, "!")))));
            }
            return source;
        }

    }

    public async Task<IReadOnlyList<Transaction>> GetFilteredAsync(
        Guid? userId = null,
        Guid? accountId = null,
        TransactionDirection? direction = null,
        DateTime? from = null,
        DateTime? to = null,
        int limit = 50,
        CancellationToken cancellationToken = default)
    {
        var query = userId.HasValue
            ? _context.Transactions.IgnoreQueryFilters().Where(t => t.UserId == userId.Value)
            : _context.Transactions.AsQueryable();

        if (accountId.HasValue)
        {
            query = query.Where(t => t.AccountId == accountId.Value);
        }

        if (direction.HasValue)
        {
            query = query.Where(t => t.Direction == direction.Value);
        }

        if (from.HasValue)
        {
            query = query.Where(t => t.OccurredAt >= from.Value);
        }

        if (to.HasValue)
        {
            query = query.Where(t => t.OccurredAt <= to.Value);
        }

        return await query
            .Include("_categoryAllocations")
            .OrderByDescending(t => t.OccurredAt)
            .Take(Math.Clamp(limit, 1, 100))
            .ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<MonthlyTransactionCurrencyTotal>> GetMonthlyActivityByCurrencyAsync(
        Guid userId,
        DateTime monthStartUtc,
        DateTime monthEndUtcExclusive,
        CancellationToken cancellationToken = default)
    {
        return await _context.Database.SqlQuery<MonthlyTransactionCurrencyTotal>($"""
            SELECT currency AS "Currency",
                   COALESCE(SUM(CASE WHEN direction = 'Income' THEN amount ELSE 0 END), 0) AS "Income",
                   COALESCE(SUM(CASE WHEN direction = 'Expense' THEN amount ELSE 0 END), 0) AS "Expenses"
            FROM transactions
            WHERE user_id = {userId}
              AND occurred_at >= {monthStartUtc}
              AND occurred_at < {monthEndUtcExclusive}
              AND transfer_id IS NULL
            GROUP BY currency
            """)
            .ToListAsync(cancellationToken);
    }

    public async Task<decimal> CalculateBalanceAsync(Guid accountId, CancellationToken cancellationToken = default)
    {
        var account = await _context.Accounts
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(a => a.Id == accountId, cancellationToken);
        if (account is null) return 0m;

        var txns = await _context.Transactions
            .IgnoreQueryFilters()
            .Where(t => t.AccountId == accountId && t.UserId == account.UserId)
            .Select(t => new { t.Amount.Amount, t.Direction })
            .ToListAsync(cancellationToken);

        var balance = account.InitialBalance.Amount;
        foreach (var txn in txns)
        {
            if (txn.Direction == TransactionDirection.Income) balance += txn.Amount;
            else balance -= txn.Amount;
        }

        return balance;
    }

    public async Task AddAsync(Transaction transaction, CancellationToken cancellationToken = default)
    {
        await _context.Transactions.AddAsync(transaction, cancellationToken);
    }

    public async Task AddRangeAsync(IEnumerable<Transaction> transactions, CancellationToken cancellationToken = default)
    {
        await _context.Transactions.AddRangeAsync(transactions, cancellationToken);
    }
}
