using System.ComponentModel;
using System.ComponentModel.DataAnnotations;

namespace Planning.Contracts;

public sealed record CreateBudgetRequest(
    decimal LimitAmount,
    string Currency,
    Guid? CategoryId = null,
    decimal AlertThreshold = 0.80m,
    string Period = "monthly");

public sealed record UpdateBudgetRequest(
    [property: Required]
    [property: Description("Required non-null limit in the budget's existing currency units (e.g. 275.55 BOB), rounded to that currency's precision; must remain strictly positive after rounding. Currency cannot be changed.")]
    decimal? LimitAmount,
    [property: Required]
    [property: Description("Required non-null alert fraction greater than 0 and at most 1; 0.80 means 80%, 1 means 100% (not 80 or 100).")]
    decimal? AlertThreshold);

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
    Guid? AccountId = null,
    string FundingMode = "AccountTracking");

public sealed record UpdateGoalRequest(
    string Name,
    decimal TargetAmount,
    DateOnly? TargetDate = null,
    Guid? AccountId = null);

public sealed record GoalDto(
    Guid Id,
    Guid? AccountId,
    string? AccountName,
    string TrackingStatus,
    int SharedGoalCount,
    string Name,
    decimal TargetAmount,
    string Currency,
    DateOnly? TargetDate,
    decimal? CurrentAmount,
    decimal? RemainingAmount,
    decimal? PercentageAchieved,
    int? MonthsRemaining,
    decimal? MonthlyContributionNeeded,
    DateTime CreatedAt,
    string FundingMode = "AccountTracking",
    decimal? AccountReservedAmount = null,
    decimal? AccountFundingShortfall = null,
    string? ReservationStatus = null);

public sealed record FinancialHealthCurrencyDto(
    string Currency,
    decimal MonthlyIncome,
    decimal MonthlyExpenses,
    decimal NetCashFlow,
    decimal? SavingsRatePercentage,
    decimal CurrentBalance,
    decimal OutstandingDebtPrincipal);

public sealed record FinancialHealthDto(
    DateTime MonthStartUtc,
    DateTime MonthEndUtcExclusive,
    IReadOnlyList<FinancialHealthCurrencyDto> Currencies);
