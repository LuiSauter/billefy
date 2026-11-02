using System.Text.Json;
using System.Text.Json.Serialization;
using Lending.Contracts;
using Microsoft.EntityFrameworkCore;

namespace Lending.Infrastructure;

public sealed class LendingFinancialDataExport(LendingDbContext db) : ILendingFinancialDataExport
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        ReferenceHandler = ReferenceHandler.IgnoreCycles
    };

    public async Task<JsonElement> ExportForUserAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var loans = await db.Loans.AsNoTracking().Where(x => x.UserId == userId).ToListAsync(cancellationToken);
        var installments = await db.Installments.AsNoTracking()
            .Where(x => db.Loans.Any(loan => loan.Id == x.LoanId && loan.UserId == userId))
            .ToListAsync(cancellationToken);
        var payments = await db.Payments.AsNoTracking().Where(x => x.UserId == userId).ToListAsync(cancellationToken);
        var paymentAllocations = await db.PaymentAllocations.AsNoTracking()
            .Where(x => db.Payments.Any(payment => payment.Id == x.PaymentId && payment.UserId == userId))
            .ToListAsync(cancellationToken);
        var counterparties = await db.Counterparties.AsNoTracking()
            .Where(x => x.UserId == userId).ToListAsync(cancellationToken);

        return JsonSerializer.SerializeToElement(
            new { loans, installments, payments, paymentAllocations, counterparties }, JsonOptions);
    }
}
