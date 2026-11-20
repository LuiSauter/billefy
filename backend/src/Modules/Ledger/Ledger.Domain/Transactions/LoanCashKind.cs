namespace Ledger.Domain.Transactions;

// Direction remains the cash sign. Principal is excluded from result/budgets;
// CardPurchase is recognized expense but never cash. Interest affects both.
public enum LoanCashKind { Principal, Interest, CardPurchase }
