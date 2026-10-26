using Lending.Application.Abstractions;
using Lending.Domain.Entities;
using Lending.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace Lending.Infrastructure.Repositories;

internal sealed class LoanRepository(LendingDbContext context) : ILoanRepository
{
    public Task<Loan?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        return context.Loans
            .Include(l => l.Installments)
            .Include(l => l.Payments)
                .ThenInclude(p => p.Allocations)
            .FirstOrDefaultAsync(l => l.Id == id, cancellationToken);
    }

    public Task<List<Loan>> GetByUserIdAsync(
        Guid userId,
        LoanType? type = null,
        LoanStatus? status = null,
        CancellationToken cancellationToken = default)
    {
        var query = context.Loans
            .Include(l => l.Installments)
            .Where(l => l.UserId == userId);

        if (type.HasValue)
        {
            query = query.Where(l => l.Type == type.Value);
        }

        if (status.HasValue)
        {
            query = query.Where(l => l.Status == status.Value);
        }

        return query
            .OrderByDescending(l => l.CreatedAt)
            .ToListAsync(cancellationToken);
    }

    public async Task AddAsync(Loan loan, CancellationToken cancellationToken = default)
    {
        await context.Loans.AddAsync(loan, cancellationToken);
    }

    public async Task AddPaymentAsync(LoanPayment payment, CancellationToken cancellationToken = default)
    {
        await context.Payments.AddAsync(payment, cancellationToken);
    }

    public Task UpdateAsync(Loan loan, CancellationToken cancellationToken = default)
    {
        // Entity is tracked by context. SaveChanges detects modifications and newly added payments.
        return Task.CompletedTask;
    }
}
