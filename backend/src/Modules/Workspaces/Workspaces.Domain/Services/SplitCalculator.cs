using BuildingBlocks.ValueObjects;
using Workspaces.Contracts;
using Workspaces.Domain.Expenses;

namespace Workspaces.Domain.Services;

/// <param name="IncomeSharePercentage">Income-based share on a 0–100 scale.</param>
/// <param name="CustomPercentage">Explicit share on a 0–100 scale.</param>
/// <param name="ResponsibilityWeight">Non-negative relative weight, normalized across participants.</param>
public sealed record SplitParticipant(
    Guid MemberId,
    decimal IncomeSharePercentage = 0m,
    decimal CustomPercentage = 0m,
    decimal ResponsibilityWeight = 0m);

public static class SplitCalculator
{
    public static IReadOnlyList<ExpenseSplitAllocation> Calculate(
        Money totalAmount,
        SplitRuleType splitRuleType,
        IReadOnlyList<SplitParticipant> members,
        Guid? payerMemberId = null)
    {
        ArgumentNullException.ThrowIfNull(members);
        if (totalAmount.Currency is null || totalAmount.Amount <= 0m)
            throw new ArgumentException("Total must be positive and have a currency.", nameof(totalAmount));
        if (!Enum.IsDefined(splitRuleType))
            throw new ArgumentOutOfRangeException(nameof(splitRuleType));
        if (members.Count == 0 || members.Any(x => x is null || x.MemberId == Guid.Empty) ||
            members.Select(x => x.MemberId).Distinct().Count() != members.Count)
            throw new ArgumentException("Participants must be non-empty, identified and unique.", nameof(members));
        if (payerMemberId.HasValue && !members.Any(x => x.MemberId == payerMemberId.Value))
            throw new ArgumentException("Payer must be a participant when supplied.", nameof(payerMemberId));

        var weights = members.Select(x => splitRuleType switch
        {
            SplitRuleType.EqualParts => 1m,
            SplitRuleType.IncomeProportional => x.IncomeSharePercentage,
            SplitRuleType.CustomPercentage => x.CustomPercentage,
            SplitRuleType.ByResponsibility => x.ResponsibilityWeight,
            _ => throw new ArgumentOutOfRangeException(nameof(splitRuleType))
        }).ToArray();
        if (weights.Any(x => x < 0m))
            throw new ArgumentException("Split weights cannot be negative.", nameof(members));

        var totalWeight = weights.Sum();
        if (totalWeight <= 0m ||
            (splitRuleType is SplitRuleType.IncomeProportional or SplitRuleType.CustomPercentage && totalWeight != 100m))
            throw new ArgumentException("Percentages must sum to 100; responsibility weights must have a positive total.", nameof(members));

        var scale = totalAmount.Currency.DecimalPlaces;
        if (scale < 0 || scale > 28)
            throw new ArgumentException("Currency precision must be between 0 and 28.", nameof(totalAmount));
        var factor = 1m;
        for (var i = 0; i < scale; i++)
            factor *= 10m;

        // Floor each share to currency precision, then assign the residual to the
        // payer (or first eligible participant). Zero-weight members never pay.
        var amounts = weights.Select(weight =>
            decimal.Floor(totalAmount.Amount * weight / totalWeight * factor) / factor).ToArray();
        var recipient = Enumerable.Range(0, members.Count)
            .FirstOrDefault(i => members[i].MemberId == payerMemberId && weights[i] > 0m, -1);
        if (recipient < 0)
            recipient = Array.FindIndex(weights, weight => weight > 0m);
        amounts[recipient] += totalAmount.Amount - amounts.Sum();

        return Array.AsReadOnly(members.Select((member, i) => new ExpenseSplitAllocation(
            member.MemberId,
            new Money(amounts[i], totalAmount.Currency),
            weights[i] / totalWeight * 100m)).ToArray());
    }
}
