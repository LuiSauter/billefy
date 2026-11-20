using BuildingBlocks.ValueObjects;

namespace Workspaces.Domain.Expenses;

public sealed record ExpenseSplitAllocation
{
    public Guid MemberId { get; }
    public Money AllocatedAmount { get; }
    public decimal Percentage { get; }

    private ExpenseSplitAllocation() { }

    public ExpenseSplitAllocation(Guid memberId, Money allocatedAmount, decimal percentage)
    {
        if (memberId == Guid.Empty)
            throw new ArgumentException("MemberId cannot be empty.", nameof(memberId));
        if (allocatedAmount.Currency is null || allocatedAmount.Amount < 0m)
            throw new ArgumentException("Allocation must be non-negative and have a currency.", nameof(allocatedAmount));
        if (percentage < 0m || percentage > 100m)
            throw new ArgumentOutOfRangeException(nameof(percentage));

        MemberId = memberId;
        AllocatedAmount = allocatedAmount;
        Percentage = percentage;
    }
}
