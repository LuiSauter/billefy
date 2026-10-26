namespace Planning.Contracts;

public sealed record CreateBudgetRequest(
    decimal LimitAmount,
    string Currency,
    Guid? CategoryId = null,
    decimal AlertThreshold = 0.80m,
    string Period = "monthly");

public sealed record BudgetDto(
    Guid Id,
    Guid? CategoryId,
    string Period,
    decimal LimitAmount,
    string Currency,
    decimal AlertThreshold,
    decimal SpentAmount,
    decimal RemainingAmount,
    decimal PercentageUsed,
    bool IsAlertTriggered,
    bool IsExceeded,
    bool IsActive,
    DateTime CreatedAt);

public sealed record CreateGoalRequest(
    string Name,
    decimal TargetAmount,
    string Currency,
    DateOnly? TargetDate = null,
    Guid? AccountId = null);

public sealed record GoalDto(
    Guid Id,
    Guid? AccountId,
    string Name,
    decimal TargetAmount,
    string Currency,
    DateOnly? TargetDate,
    decimal CurrentAmount,
    decimal RemainingAmount,
    decimal PercentageAchieved,
    int? MonthsRemaining,
    decimal? MonthlyContributionNeeded,
    DateTime CreatedAt);

public sealed record BudgetSplit503020Dto(
    decimal MonthlyIncome,
    decimal NeedsTarget,
    decimal WantsTarget,
    decimal SavingsTarget);

public sealed record FinancialHealthDto(
    decimal MonthlyIncome,
    decimal MonthlyExpenses,
    decimal NetSavings,
    decimal SavingsRate,
    decimal TotalLiquidBalance,
    decimal EmergencyFundMonths,
    decimal TotalDebtLiabilities,
    BudgetSplit503020Dto Split503020);
