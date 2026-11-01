using Microsoft.EntityFrameworkCore;
using Planning.Application.Abstractions;
using Planning.Domain.Investments;

namespace Planning.Infrastructure.Repositories;

internal sealed class InvestmentRepository(PlanningDbContext context) : IInvestmentRepository
{
    public Task<Investment?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default) =>
        context.Investments.FirstOrDefaultAsync(i => i.Id == id, cancellationToken);

    public Task<List<Investment>> GetByUserIdAsync(Guid userId, CancellationToken cancellationToken = default) =>
        context.Investments
            .IgnoreQueryFilters()
            .Where(i => i.UserId == userId && i.ArchivedAt == null)
            .OrderByDescending(i => i.CreatedAt)
            .ToListAsync(cancellationToken);

    public async Task AddAsync(Investment investment, CancellationToken cancellationToken = default) =>
        await context.Investments.AddAsync(investment, cancellationToken);

    public async Task AddCashLinkAsync(InvestmentCashLink link, CancellationToken cancellationToken = default) =>
        await context.InvestmentCashLinks.AddAsync(link, cancellationToken);

    public Task<InvestmentCashLink?> GetCashLinkByLedgerTransactionIdAsync(Guid transactionId, CancellationToken cancellationToken = default) =>
        context.InvestmentCashLinks.FirstOrDefaultAsync(link => link.LedgerTransactionId == transactionId, cancellationToken);
}
