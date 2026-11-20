using Microsoft.EntityFrameworkCore;
using Planning.Application.Abstractions;
using Planning.Domain.Recurring;

namespace Planning.Infrastructure.Repositories;

internal sealed class RecurringPaymentRepository(PlanningDbContext context) : IRecurringPaymentRepository
{
    public Task<RecurringPayment?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        return context.RecurringPayments.FirstOrDefaultAsync(r => r.Id == id, cancellationToken);
    }

    public Task<List<RecurringPayment>> GetByUserIdAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        return context.RecurringPayments
            .IgnoreQueryFilters()
            .AsNoTracking()
            .Where(r => r.UserId == userId)
            .OrderBy(r => r.NextDueDate)
            .ToListAsync(cancellationToken);
    }

    public async Task AddAsync(RecurringPayment recurringPayment, CancellationToken cancellationToken = default)
    {
        await context.RecurringPayments.AddAsync(recurringPayment, cancellationToken);
    }

    public Task UpdateAsync(RecurringPayment recurringPayment, CancellationToken cancellationToken = default)
    {
        context.RecurringPayments.Update(recurringPayment);
        return Task.CompletedTask;
    }

    public Task DeleteAsync(RecurringPayment recurringPayment, CancellationToken cancellationToken = default)
    {
        context.RecurringPayments.Remove(recurringPayment);
        return Task.CompletedTask;
    }
}
