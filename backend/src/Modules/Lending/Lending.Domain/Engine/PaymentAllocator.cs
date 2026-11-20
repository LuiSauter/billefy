using Lending.Domain.Enums;

namespace Lending.Domain.Engine;

public sealed class InstallmentPaymentState
{
    public Guid Id { get; init; }
    public int Number { get; init; }
    public DateOnly DueDate { get; init; }
    public decimal ExpectedPrincipal { get; init; }
    public decimal ExpectedInterest { get; init; }
    public decimal PaidPrincipal { get; set; }
    public decimal PaidInterest { get; set; }
    public decimal PaidLateInterest { get; set; }
    public decimal CalculatedLateInterest { get; set; }

    public decimal RemainingLateInterest => Math.Max(decimal.Zero, CalculatedLateInterest - PaidLateInterest);
    public decimal RemainingInterest => Math.Max(decimal.Zero, ExpectedInterest - PaidInterest);
    public decimal RemainingPrincipal => Math.Max(decimal.Zero, ExpectedPrincipal - PaidPrincipal);
    public decimal TotalRemaining => RemainingLateInterest + RemainingInterest + RemainingPrincipal;
}

public sealed record PaymentAllocationDetail(
    Guid InstallmentId,
    int InstallmentNumber,
    decimal ToLateInterest,
    decimal ToInterest,
    decimal ToPrincipal,
    decimal RemainingBalanceAfter);

public sealed record PaymentAllocationResult(
    IReadOnlyList<PaymentAllocationDetail> Allocations,
    decimal RemainingUnallocatedAmount);

public static class PaymentAllocator
{
    public static PaymentAllocationResult Allocate(
        decimal paymentAmount,
        IList<InstallmentPaymentState> installments,
        PaymentAllocationOrder order = PaymentAllocationOrder.LateInterestInterestPrincipal)
    {
        if (paymentAmount <= decimal.Zero)
        {
            return new PaymentAllocationResult([], decimal.Zero);
        }

        var available = paymentAmount;
        var allocations = new List<PaymentAllocationDetail>();

        // Sort by DueDate, then by Number
        var sorted = installments.OrderBy(i => i.DueDate).ThenBy(i => i.Number).ToList();

        foreach (var inst in sorted)
        {
            if (available <= decimal.Zero) break;
            if (inst.TotalRemaining <= decimal.Zero) continue;

            decimal toLate = decimal.Zero;
            decimal toInterest = decimal.Zero;
            decimal toPrincipal = decimal.Zero;

            if (order == PaymentAllocationOrder.LateInterestInterestPrincipal)
            {
                // 1. Late Interest
                toLate = Math.Min(available, inst.RemainingLateInterest);
                available -= toLate;

                // 2. Regular Interest
                if (available > decimal.Zero)
                {
                    toInterest = Math.Min(available, inst.RemainingInterest);
                    available -= toInterest;
                }

                // 3. Principal
                if (available > decimal.Zero)
                {
                    toPrincipal = Math.Min(available, inst.RemainingPrincipal);
                    available -= toPrincipal;
                }
            }
            else // InterestPrincipalLateInterest
            {
                // 1. Regular Interest
                toInterest = Math.Min(available, inst.RemainingInterest);
                available -= toInterest;

                // 2. Principal
                if (available > decimal.Zero)
                {
                    toPrincipal = Math.Min(available, inst.RemainingPrincipal);
                    available -= toPrincipal;
                }

                // 3. Late Interest
                if (available > decimal.Zero)
                {
                    toLate = Math.Min(available, inst.RemainingLateInterest);
                    available -= toLate;
                }
            }

            inst.PaidLateInterest += toLate;
            inst.PaidInterest += toInterest;
            inst.PaidPrincipal += toPrincipal;

            allocations.Add(new PaymentAllocationDetail(
                inst.Id,
                inst.Number,
                toLate,
                toInterest,
                toPrincipal,
                inst.TotalRemaining));
        }

        return new PaymentAllocationResult(allocations, available);
    }
}
