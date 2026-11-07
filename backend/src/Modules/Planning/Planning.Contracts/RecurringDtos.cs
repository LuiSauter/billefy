namespace Planning.Contracts;

public sealed record CreateRecurringPaymentRequest(
    string Name,
    string? Description,
    string FlowType, // "Expense" or "Income"
    decimal Amount,
    string Currency,
    string Frequency, // "Weekly", "BiWeekly", "Monthly", "Quarterly", "SemiAnnual", "Yearly"
    DateOnly StartDate,
    DateOnly? NextDueDate = null,
    string? EndType = "Never", // "Never", "OnDate", "AfterOccurrences"
    DateOnly? EndDate = null,
    int? TotalOccurrences = null,
    Guid? CategoryId = null,
    Guid? DefaultAccountId = null,
    bool AutoCreateDraft = false);

public sealed record UpdateRecurringPaymentRequest(
    string Name,
    string? Description,
    string FlowType,
    decimal Amount,
    string Frequency,
    DateOnly NextDueDate,
    string? EndType = "Never",
    DateOnly? EndDate = null,
    int? TotalOccurrences = null,
    Guid? CategoryId = null,
    Guid? DefaultAccountId = null,
    bool AutoCreateDraft = false);

public sealed record RescheduleRecurringPaymentRequest(
    DateOnly NewDueDate);

public sealed record ConfirmRecurringPaymentRequest(
    Guid? AccountId = null,
    decimal? Amount = null,
    DateTime? OccurredAt = null,
    string? Description = null);

public sealed record RecurringPaymentDto(
    Guid Id,
    string Name,
    string? Description,
    string FlowType,
    decimal Amount,
    string Currency,
    string Frequency,
    DateOnly StartDate,
    DateOnly NextDueDate,
    string Status,
    string EndType,
    DateOnly? EndDate,
    int? TotalOccurrences,
    int CompletedOccurrences,
    bool AutoCreateDraft,
    Guid? CategoryId,
    Guid? DefaultAccountId,
    int DaysUntilDue,
    bool IsOverdue,
    bool IsDueSoon,
    DateTime CreatedAt);

public sealed record RecurringSummaryDto(
    int ActiveCount,
    decimal MonthlyExpenses,
    decimal MonthlyIncome,
    string Currency,
    int Upcoming7DaysCount,
    decimal Upcoming7DaysTotal,
    int OverdueCount,
    decimal OverdueTotal);

public sealed record RecurringCalendarOccurrenceDto(
    Guid RecurringId,
    string Name,
    string FlowType,
    decimal Amount,
    string Currency,
    string Frequency,
    DateOnly Date,
    bool IsDueSoon,
    bool IsOverdue,
    Guid? CategoryId,
    Guid? DefaultAccountId);
