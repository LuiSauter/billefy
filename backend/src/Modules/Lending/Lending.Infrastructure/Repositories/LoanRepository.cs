using Lending.Application.Abstractions;
using Lending.Domain.Entities;
using Lending.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;

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

    public async Task<Loan?> GetByIdForUpdateAsync(Guid id, Guid userId, CancellationToken cancellationToken = default)
    {
        if (context.Database.ProviderName == "Npgsql.EntityFrameworkCore.PostgreSQL")
        {
            await using var command = context.Database.GetDbConnection().CreateCommand();
            command.Transaction = context.Database.CurrentTransaction?.GetDbTransaction();
            command.CommandText = "SELECT id FROM loans WHERE id = @id AND user_id = @user_id FOR UPDATE";
            var idParameter = command.CreateParameter();
            idParameter.ParameterName = "@id";
            idParameter.Value = id;
            command.Parameters.Add(idParameter);
            var userIdParameter = command.CreateParameter();
            userIdParameter.ParameterName = "@user_id";
            userIdParameter.Value = userId;
            command.Parameters.Add(userIdParameter);
            await command.ExecuteScalarAsync(cancellationToken);
        }

        // Ensure a pre-lock tracked snapshot cannot survive the lock and become authoritative.
        context.ChangeTracker.Clear();
        return await context.Loans.IgnoreQueryFilters()
            .Include(l => l.Installments)
            .Include(l => l.Payments).ThenInclude(p => p.Allocations)
            .SingleOrDefaultAsync(l => l.Id == id && l.UserId == userId, cancellationToken);
    }

    public Task<List<Loan>> GetByUserIdAsync(
        Guid userId,
        LoanType? type = null,
        LoanStatus? status = null,
        CancellationToken cancellationToken = default)
    {
        var query = context.Loans
            .IgnoreQueryFilters()
            .Include(l => l.Installments)
            .Include(l => l.Payments)
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
