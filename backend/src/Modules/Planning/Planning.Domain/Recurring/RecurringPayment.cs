using BuildingBlocks.Common;
using BuildingBlocks.Currencies;
using BuildingBlocks.ValueObjects;

namespace Planning.Domain.Recurring;

public sealed class RecurringPayment : Entity
{
    public string Name { get; private set; }
    public string? Description { get; private set; }
    public RecurringFlowType FlowType { get; private set; }
    public Money Amount { get; private set; }
    public Guid? CategoryId { get; private set; }
    public Guid? DefaultAccountId { get; private set; }
    public RecurringFrequency Frequency { get; private set; }
    public DateOnly StartDate { get; private set; }
    public DateOnly NextDueDate { get; private set; }
    public RecurringStatus Status { get; private set; }
    public RecurringEndType EndType { get; private set; }
    public DateOnly? EndDate { get; private set; }
    public int? TotalOccurrences { get; private set; }
    public int CompletedOccurrences { get; private set; }
    public bool AutoCreateDraft { get; private set; }

    private RecurringPayment() : base()
    {
        Name = string.Empty;
        Amount = Money.Zero(Currency.USD);
        FlowType = RecurringFlowType.Expense;
        Frequency = RecurringFrequency.Monthly;
        Status = RecurringStatus.Active;
        EndType = RecurringEndType.Never;
        CompletedOccurrences = 0;
    }

    public RecurringPayment(
        Guid id,
        Guid userId,
        string name,
        string? description,
        RecurringFlowType flowType,
        Money amount,
        Guid? categoryId,
        Guid? defaultAccountId,
        RecurringFrequency frequency,
        DateOnly startDate,
        DateOnly nextDueDate,
        RecurringStatus status,
        RecurringEndType endType,
        DateOnly? endDate,
        int? totalOccurrences,
        int completedOccurrences,
        bool autoCreateDraft,
        DateTime createdAt)
        : base(id, userId, createdAt)
    {
        if (string.IsNullOrWhiteSpace(name))
            throw new ArgumentException("Recurring payment name cannot be empty.", nameof(name));

        if (amount.Amount <= decimal.Zero)
            throw new ArgumentOutOfRangeException(nameof(amount), "Recurring payment amount must be strictly positive.");

        if (!Enum.IsDefined(flowType))
            throw new ArgumentOutOfRangeException(nameof(flowType), "Invalid flow type.");

        if (!Enum.IsDefined(frequency))
            throw new ArgumentOutOfRangeException(nameof(frequency), "Invalid recurring frequency.");

        if (!Enum.IsDefined(status))
            throw new ArgumentOutOfRangeException(nameof(status), "Invalid recurring status.");

        if (!Enum.IsDefined(endType))
            throw new ArgumentOutOfRangeException(nameof(endType), "Invalid end type.");

        if (endType == RecurringEndType.OnDate)
        {
            if (!endDate.HasValue)
                throw new ArgumentException("End date is required when end type is OnDate.", nameof(endDate));
            if (endDate.Value < startDate)
                throw new ArgumentException("End date cannot be earlier than start date.", nameof(endDate));
        }

        if (endType == RecurringEndType.AfterOccurrences)
        {
            if (!totalOccurrences.HasValue || totalOccurrences.Value <= 0)
                throw new ArgumentOutOfRangeException(nameof(totalOccurrences), "Total occurrences must be positive when end type is AfterOccurrences.");
        }

        Name = name.Trim();
        Description = string.IsNullOrWhiteSpace(description) ? null : description.Trim();
        FlowType = flowType;
        Amount = amount;
        CategoryId = categoryId;
        DefaultAccountId = defaultAccountId;
        Frequency = frequency;
        StartDate = startDate;
        NextDueDate = nextDueDate;
        Status = status;
        EndType = endType;
        EndDate = endType == RecurringEndType.OnDate ? endDate : null;
        TotalOccurrences = endType == RecurringEndType.AfterOccurrences ? totalOccurrences : null;
        CompletedOccurrences = Math.Max(0, completedOccurrences);
        AutoCreateDraft = autoCreateDraft;
    }

    public static RecurringPayment Create(
        Guid userId,
        string name,
        string? description,
        RecurringFlowType flowType,
        Money amount,
        RecurringFrequency frequency,
        DateOnly startDate,
        DateOnly? nextDueDate = null,
        RecurringEndType endType = RecurringEndType.Never,
        DateOnly? endDate = null,
        int? totalOccurrences = null,
        Guid? categoryId = null,
        Guid? defaultAccountId = null,
        bool autoCreateDraft = false,
        DateTime? createdAt = null)
    {
        var initialDue = nextDueDate ?? startDate;

        return new RecurringPayment(
            Guid.NewGuid(),
            userId,
            name,
            description,
            flowType,
            amount,
            categoryId,
            defaultAccountId,
            frequency,
            startDate,
            initialDue,
            RecurringStatus.Active,
            endType,
            endDate,
            totalOccurrences,
            completedOccurrences: 0,
            autoCreateDraft,
            createdAt ?? DateTime.UtcNow);
    }

    public void Update(
        string name,
        string? description,
        RecurringFlowType flowType,
        Money amount,
        RecurringFrequency frequency,
        Guid? categoryId,
        Guid? defaultAccountId,
        DateOnly nextDueDate,
        RecurringEndType endType,
        DateOnly? endDate,
        int? totalOccurrences,
        bool autoCreateDraft)
    {
        if (string.IsNullOrWhiteSpace(name))
            throw new ArgumentException("Recurring payment name cannot be empty.", nameof(name));

        if (amount.Amount <= decimal.Zero)
            throw new ArgumentOutOfRangeException(nameof(amount), "Recurring payment amount must be strictly positive.");

        if (!Enum.IsDefined(flowType))
            throw new ArgumentOutOfRangeException(nameof(flowType), "Invalid flow type.");

        if (!Enum.IsDefined(frequency))
            throw new ArgumentOutOfRangeException(nameof(frequency), "Invalid recurring frequency.");

        if (!Enum.IsDefined(endType))
            throw new ArgumentOutOfRangeException(nameof(endType), "Invalid end type.");

        if (endType == RecurringEndType.OnDate)
        {
            if (!endDate.HasValue)
                throw new ArgumentException("End date is required when end type is OnDate.", nameof(endDate));
            if (endDate.Value < StartDate)
                throw new ArgumentException("End date cannot be earlier than start date.", nameof(endDate));
        }

        if (endType == RecurringEndType.AfterOccurrences)
        {
            if (!totalOccurrences.HasValue || totalOccurrences.Value <= 0)
                throw new ArgumentOutOfRangeException(nameof(totalOccurrences), "Total occurrences must be positive.");
        }

        Name = name.Trim();
        Description = string.IsNullOrWhiteSpace(description) ? null : description.Trim();
        FlowType = flowType;
        Amount = amount;
        Frequency = frequency;
        CategoryId = categoryId;
        DefaultAccountId = defaultAccountId;
        NextDueDate = nextDueDate;
        EndType = endType;
        EndDate = endType == RecurringEndType.OnDate ? endDate : null;
        TotalOccurrences = endType == RecurringEndType.AfterOccurrences ? totalOccurrences : null;
        AutoCreateDraft = autoCreateDraft;
    }

    public void Reschedule(DateOnly newDueDate)
    {
        NextDueDate = newDueDate;
    }

    public void AdvanceNextDueDate()
    {
        CompletedOccurrences++;

        if (EndType == RecurringEndType.AfterOccurrences && TotalOccurrences.HasValue && CompletedOccurrences >= TotalOccurrences.Value)
        {
            Status = RecurringStatus.Completed;
            return;
        }

        var next = CalculateNextDueDate(NextDueDate, Frequency);

        if (EndType == RecurringEndType.OnDate && EndDate.HasValue && next > EndDate.Value)
        {
            Status = RecurringStatus.Completed;
            return;
        }

        NextDueDate = next;
    }

    public IReadOnlyList<DateOnly> GetOccurrencesBetween(DateOnly fromDate, DateOnly toDate)
    {
        if (Status == RecurringStatus.Completed || Status == RecurringStatus.Paused)
            return [];

        var occurrences = new List<DateOnly>();
        var current = NextDueDate;
        var occurrencesCount = CompletedOccurrences;

        while (current <= toDate)
        {
            if (EndType == RecurringEndType.AfterOccurrences && TotalOccurrences.HasValue && occurrencesCount >= TotalOccurrences.Value)
                break;

            if (EndType == RecurringEndType.OnDate && EndDate.HasValue && current > EndDate.Value)
                break;

            if (current >= fromDate)
            {
                occurrences.Add(current);
            }

            current = CalculateNextDueDate(current, Frequency);
            occurrencesCount++;

            // Safety limit
            if (occurrences.Count >= 60) break;
        }

        return occurrences;
    }

    public void Pause()
    {
        if (Status != RecurringStatus.Completed)
        {
            Status = RecurringStatus.Paused;
        }
    }

    public void Resume()
    {
        if (Status == RecurringStatus.Paused)
        {
            Status = RecurringStatus.Active;
        }
    }

    public static DateOnly CalculateNextDueDate(DateOnly fromDate, RecurringFrequency frequency)
    {
        return frequency switch
        {
            RecurringFrequency.Weekly => fromDate.AddDays(7),
            RecurringFrequency.BiWeekly => fromDate.AddDays(14),
            RecurringFrequency.Monthly => fromDate.AddMonths(1),
            RecurringFrequency.Quarterly => fromDate.AddMonths(3),
            RecurringFrequency.SemiAnnual => fromDate.AddMonths(6),
            RecurringFrequency.Yearly => fromDate.AddYears(1),
            _ => throw new ArgumentOutOfRangeException(nameof(frequency), "Unsupported frequency.")
        };
    }
}
