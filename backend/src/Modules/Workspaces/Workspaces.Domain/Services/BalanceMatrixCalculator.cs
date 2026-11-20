using BuildingBlocks.Currencies;
using BuildingBlocks.ValueObjects;
using Workspaces.Contracts;
using Workspaces.Domain.Expenses;
using Workspaces.Domain.Settlements;

namespace Workspaces.Domain.Services;

public sealed record PairwiseDebt(Guid DebtorMemberId, Guid CreditorMemberId, Money Amount);

/// <summary>Positive means receivable; negative means payable. Balances never combine currencies.</summary>
public sealed record MemberNetBalance(Guid MemberId, Money Balance);

public sealed record BalanceMatrix(
    IReadOnlyList<PairwiseDebt> DebtPairs,
    IReadOnlyList<MemberNetBalance> MemberNetBalances);

public static class BalanceMatrixCalculator
{
    public static BalanceMatrix Calculate(IEnumerable<WorkspaceExpense> expenses,
        IEnumerable<WorkspaceSettlement> settlements)
    {
        ArgumentNullException.ThrowIfNull(expenses);
        ArgumentNullException.ThrowIfNull(settlements);
        var expenseList = expenses.ToList();
        var settlementList = settlements.ToList();
        if (expenseList.Any(x => x is null) || settlementList.Any(x => x is null))
            throw new ArgumentException("Expenses and settlements cannot contain null entries.");
        if (expenseList.Select(x => x.WorkspaceId).Concat(settlementList.Select(x => x.WorkspaceId))
            .Distinct().Skip(1).Any())
            throw new ArgumentException("A balance matrix must be scoped to a single workspace.");
        if (expenseList.Select(x => x.Id).Distinct().Count() != expenseList.Count ||
            settlementList.Select(x => x.Id).Distinct().Count() != settlementList.Count)
            throw new ArgumentException("Duplicate financial records cannot be counted twice.");

        var pairs = new Dictionary<(Guid First, Guid Second, Currency Currency), decimal>();
        var members = new HashSet<(Guid MemberId, Currency Currency)>();
        foreach (var expense in expenseList)
        {
            members.Add((expense.PaidByMemberId, expense.Currency));
            foreach (var allocation in expense.Allocations)
            {
                members.Add((allocation.MemberId, expense.Currency));
                AddDebt(allocation.MemberId, expense.PaidByMemberId, allocation.AllocatedAmount);
            }
        }
        foreach (var settlement in settlementList.Where(x => x.Status == SettlementStatus.Completed))
        {
            members.Add((settlement.PayerMemberId, settlement.Currency));
            members.Add((settlement.ReceiverMemberId, settlement.Currency));
            // A payment cancels debt from payer to receiver; an overpayment reverses it.
            AddDebt(settlement.ReceiverMemberId, settlement.PayerMemberId, settlement.Amount);
        }

        var balances = members.ToDictionary(x => x, _ => 0m);
        var debts = new List<PairwiseDebt>();
        foreach (var (key, amount) in pairs.OrderBy(x => x.Key.Currency.Code, StringComparer.Ordinal)
            .ThenBy(x => x.Key.First).ThenBy(x => x.Key.Second))
        {
            if (amount == 0m)
                continue;
            var debtor = amount > 0m ? key.First : key.Second;
            var creditor = amount > 0m ? key.Second : key.First;
            var absoluteAmount = Math.Abs(amount);
            debts.Add(new PairwiseDebt(debtor, creditor, new Money(absoluteAmount, key.Currency)));
            balances[(debtor, key.Currency)] -= absoluteAmount;
            balances[(creditor, key.Currency)] += absoluteAmount;
        }

        var nets = balances.OrderBy(x => x.Key.Currency.Code, StringComparer.Ordinal).ThenBy(x => x.Key.MemberId)
            .Select(x => new MemberNetBalance(x.Key.MemberId, new Money(x.Value, x.Key.Currency))).ToArray();
        return new BalanceMatrix(debts.AsReadOnly(), Array.AsReadOnly(nets));

        void AddDebt(Guid debtor, Guid creditor, Money amount)
        {
            if (debtor == creditor || amount.Amount == 0m)
                return;
            var first = debtor.CompareTo(creditor) < 0 ? debtor : creditor;
            var second = first == debtor ? creditor : debtor;
            var key = (first, second, amount.Currency);
            pairs[key] = pairs.GetValueOrDefault(key) + (first == debtor ? amount.Amount : -amount.Amount);
        }
    }
}
