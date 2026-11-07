using BuildingBlocks.Common;
using BuildingBlocks.Currencies;
using BuildingBlocks.Security;
using BuildingBlocks.Time;
using BuildingBlocks.ValueObjects;
using Ledger.Contracts;
using Planning.Application.Abstractions;
using Planning.Contracts;
using Planning.Domain.Recurring;

namespace Planning.Application.Services;

public sealed class RecurringPaymentService : IRecurringPaymentService
{
    private readonly IRecurringPaymentRepository _repository;
    private readonly IPlanningUnitOfWork _unitOfWork;
    private readonly ILedgerModule _ledgerModule;
    private readonly ICurrentUserContext _currentUserContext;
    private readonly IClock _clock;

    public RecurringPaymentService(
        IRecurringPaymentRepository repository,
        IPlanningUnitOfWork unitOfWork,
        ILedgerModule ledgerModule,
        ICurrentUserContext currentUserContext,
        IClock clock)
    {
        _repository = repository;
        _unitOfWork = unitOfWork;
        _ledgerModule = ledgerModule;
        _currentUserContext = currentUserContext;
        _clock = clock;
    }

    public async Task<Result<List<RecurringPaymentDto>>> GetAllAsync(
        string? flowType = null,
        string? status = null,
        string? search = null,
        CancellationToken ct = default)
    {
        if (!_currentUserContext.IsAuthenticated || _currentUserContext.UserId is null)
            return Result.Failure<List<RecurringPaymentDto>>(Error.Unauthorized("Auth.Unauthorized", "User is not authenticated."));

        var userId = _currentUserContext.UserId.Value;
        var items = await _repository.GetByUserIdAsync(userId, ct);

        var today = DateOnly.FromDateTime(_clock.UtcNow);

        var query = items.AsEnumerable();

        if (!string.IsNullOrWhiteSpace(flowType) && Enum.TryParse<RecurringFlowType>(flowType, true, out var parsedFlow))
        {
            query = query.Where(r => r.FlowType == parsedFlow);
        }

        if (!string.IsNullOrWhiteSpace(status) && Enum.TryParse<RecurringStatus>(status, true, out var parsedStatus))
        {
            query = query.Where(r => r.Status == parsedStatus);
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim();
            query = query.Where(r => r.Name.Contains(term, StringComparison.OrdinalIgnoreCase)
                || (r.Description != null && r.Description.Contains(term, StringComparison.OrdinalIgnoreCase)));
        }

        var dtoList = query
            .OrderBy(r => r.NextDueDate)
            .Select(r => MapToDto(r, today))
            .ToList();

        return Result.Success(dtoList);
    }

    public async Task<Result<RecurringSummaryDto>> GetSummaryAsync(
        string? currency = null,
        CancellationToken ct = default)
    {
        if (!_currentUserContext.IsAuthenticated || _currentUserContext.UserId is null)
            return Result.Failure<RecurringSummaryDto>(Error.Unauthorized("Auth.Unauthorized", "User is not authenticated."));

        var userId = _currentUserContext.UserId.Value;
        var items = await _repository.GetByUserIdAsync(userId, ct);

        var today = DateOnly.FromDateTime(_clock.UtcNow);
        var next7Days = today.AddDays(7);

        var activeItems = items.Where(r => r.Status == RecurringStatus.Active).ToList();

        decimal monthlyExpenses = 0m;
        decimal monthlyIncome = 0m;
        int upcoming7DaysCount = 0;
        decimal upcoming7DaysTotal = 0m;
        int overdueCount = 0;
        decimal overdueTotal = 0m;

        var targetCurrency = string.IsNullOrWhiteSpace(currency) ? "BOB" : currency.Trim().ToUpperInvariant();

        foreach (var item in activeItems)
        {
            var normalizedMonthly = NormalizeToMonthly(item.Amount.Amount, item.Frequency);

            if (item.FlowType == RecurringFlowType.Expense)
            {
                monthlyExpenses += normalizedMonthly;

                if (item.NextDueDate >= today && item.NextDueDate <= next7Days)
                {
                    upcoming7DaysCount++;
                    upcoming7DaysTotal += item.Amount.Amount;
                }
                else if (item.NextDueDate < today)
                {
                    overdueCount++;
                    overdueTotal += item.Amount.Amount;
                }
            }
            else
            {
                monthlyIncome += normalizedMonthly;
            }
        }

        var summary = new RecurringSummaryDto(
            ActiveCount: activeItems.Count,
            MonthlyExpenses: decimal.Round(monthlyExpenses, 2),
            MonthlyIncome: decimal.Round(monthlyIncome, 2),
            Currency: targetCurrency,
            Upcoming7DaysCount: upcoming7DaysCount,
            Upcoming7DaysTotal: decimal.Round(upcoming7DaysTotal, 2),
            OverdueCount: overdueCount,
            OverdueTotal: decimal.Round(overdueTotal, 2));

        return Result.Success(summary);
    }

    public async Task<Result<List<RecurringCalendarOccurrenceDto>>> GetCalendarOccurrencesAsync(
        DateOnly fromDate,
        DateOnly toDate,
        CancellationToken ct = default)
    {
        if (!_currentUserContext.IsAuthenticated || _currentUserContext.UserId is null)
            return Result.Failure<List<RecurringCalendarOccurrenceDto>>(Error.Unauthorized("Auth.Unauthorized", "User is not authenticated."));

        var userId = _currentUserContext.UserId.Value;
        var items = await _repository.GetByUserIdAsync(userId, ct);

        var today = DateOnly.FromDateTime(_clock.UtcNow);
        var next7Days = today.AddDays(7);

        var occurrences = new List<RecurringCalendarOccurrenceDto>();

        foreach (var item in items)
        {
            var dates = item.GetOccurrencesBetween(fromDate, toDate);
            foreach (var date in dates)
            {
                occurrences.Add(new RecurringCalendarOccurrenceDto(
                    RecurringId: item.Id,
                    Name: item.Name,
                    FlowType: item.FlowType.ToString(),
                    Amount: item.Amount.Amount,
                    Currency: item.Amount.Currency.Code,
                    Frequency: item.Frequency.ToString(),
                    Date: date,
                    IsDueSoon: date >= today && date <= next7Days,
                    IsOverdue: date < today,
                    CategoryId: item.CategoryId,
                    DefaultAccountId: item.DefaultAccountId));
            }
        }

        return Result.Success(occurrences.OrderBy(o => o.Date).ThenBy(o => o.Name).ToList());
    }

    public async Task<Result<RecurringPaymentDto>> GetByIdAsync(Guid id, CancellationToken ct = default)
    {
        if (!_currentUserContext.IsAuthenticated || _currentUserContext.UserId is null)
            return Result.Failure<RecurringPaymentDto>(Error.Unauthorized("Auth.Unauthorized", "User is not authenticated."));

        var item = await _repository.GetByIdAsync(id, ct);
        if (item is null || item.UserId != _currentUserContext.UserId.Value)
            return Result.Failure<RecurringPaymentDto>(Error.NotFound("Recurring.NotFound", "Recurring payment not found."));

        var today = DateOnly.FromDateTime(_clock.UtcNow);
        return Result.Success(MapToDto(item, today));
    }

    public async Task<Result<Guid>> CreateAsync(CreateRecurringPaymentRequest request, CancellationToken ct = default)
    {
        if (!_currentUserContext.IsAuthenticated || _currentUserContext.UserId is null)
            return Result.Failure<Guid>(Error.Unauthorized("Auth.Unauthorized", "User is not authenticated."));

        if (string.IsNullOrWhiteSpace(request.Name))
            return Result.Failure<Guid>(Error.Validation("Recurring.NameEmpty", "Name is required."));

        if (request.Amount <= 0)
            return Result.Failure<Guid>(Error.Validation("Recurring.InvalidAmount", "Amount must be strictly positive."));

        if (!Enum.TryParse<RecurringFlowType>(request.FlowType, true, out var flowType))
            return Result.Failure<Guid>(Error.Validation("Recurring.InvalidFlowType", "Invalid flow type (Expense or Income)."));

        if (!Enum.TryParse<RecurringFrequency>(request.Frequency, true, out var frequency))
            return Result.Failure<Guid>(Error.Validation("Recurring.InvalidFrequency", "Invalid frequency."));

        Currency currencyObj;
        try
        {
            currencyObj = Currency.FromCode(request.Currency, 2);
        }
        catch
        {
            return Result.Failure<Guid>(Error.Validation("Recurring.InvalidCurrency", $"Currency '{request.Currency}' is invalid."));
        }

        var userId = _currentUserContext.UserId.Value;
        var money = Money.Of(request.Amount, currencyObj);

        var endType = Enum.TryParse<RecurringEndType>(request.EndType, true, out var parsedEnd)
            ? parsedEnd
            : RecurringEndType.Never;

        RecurringPayment recurring;
        try
        {
            recurring = RecurringPayment.Create(
                userId: userId,
                name: request.Name,
                description: request.Description,
                flowType: flowType,
                amount: money,
                frequency: frequency,
                startDate: request.StartDate,
                nextDueDate: request.NextDueDate,
                endType: endType,
                endDate: request.EndDate,
                totalOccurrences: request.TotalOccurrences,
                categoryId: request.CategoryId,
                defaultAccountId: request.DefaultAccountId,
                autoCreateDraft: request.AutoCreateDraft,
                createdAt: _clock.UtcNow);
        }
        catch (ArgumentException ex)
        {
            return Result.Failure<Guid>(Error.Validation("Recurring.InvalidEndCondition", ex.Message));
        }

        await _repository.AddAsync(recurring, ct);
        await _unitOfWork.SaveChangesAsync(ct);

        return Result.Success(recurring.Id);
    }

    public async Task<Result> UpdateAsync(Guid id, UpdateRecurringPaymentRequest request, CancellationToken ct = default)
    {
        if (!_currentUserContext.IsAuthenticated || _currentUserContext.UserId is null)
            return Result.Failure(Error.Unauthorized("Auth.Unauthorized", "User is not authenticated."));

        var recurring = await _repository.GetByIdAsync(id, ct);
        if (recurring is null || recurring.UserId != _currentUserContext.UserId.Value)
            return Result.Failure(Error.NotFound("Recurring.NotFound", "Recurring payment not found."));

        if (string.IsNullOrWhiteSpace(request.Name))
            return Result.Failure(Error.Validation("Recurring.NameEmpty", "Name is required."));

        if (request.Amount <= 0)
            return Result.Failure(Error.Validation("Recurring.InvalidAmount", "Amount must be strictly positive."));

        if (!Enum.TryParse<RecurringFlowType>(request.FlowType, true, out var flowType))
            return Result.Failure(Error.Validation("Recurring.InvalidFlowType", "Invalid flow type."));

        if (!Enum.TryParse<RecurringFrequency>(request.Frequency, true, out var frequency))
            return Result.Failure(Error.Validation("Recurring.InvalidFrequency", "Invalid frequency."));

        var money = Money.Of(request.Amount, recurring.Amount.Currency);

        var endType = Enum.TryParse<RecurringEndType>(request.EndType, true, out var parsedEnd)
            ? parsedEnd
            : RecurringEndType.Never;

        try
        {
            recurring.Update(
                name: request.Name,
                description: request.Description,
                flowType: flowType,
                amount: money,
                frequency: frequency,
                categoryId: request.CategoryId,
                defaultAccountId: request.DefaultAccountId,
                nextDueDate: request.NextDueDate,
                endType: endType,
                endDate: request.EndDate,
                totalOccurrences: request.TotalOccurrences,
                autoCreateDraft: request.AutoCreateDraft);
        }
        catch (ArgumentException ex)
        {
            return Result.Failure(Error.Validation("Recurring.InvalidEndCondition", ex.Message));
        }

        await _repository.UpdateAsync(recurring, ct);
        await _unitOfWork.SaveChangesAsync(ct);

        return Result.Success();
    }

    public async Task<Result> DeleteAsync(Guid id, CancellationToken ct = default)
    {
        if (!_currentUserContext.IsAuthenticated || _currentUserContext.UserId is null)
            return Result.Failure(Error.Unauthorized("Auth.Unauthorized", "User is not authenticated."));

        var recurring = await _repository.GetByIdAsync(id, ct);
        if (recurring is null || recurring.UserId != _currentUserContext.UserId.Value)
            return Result.Failure(Error.NotFound("Recurring.NotFound", "Recurring payment not found."));

        await _repository.DeleteAsync(recurring, ct);
        await _unitOfWork.SaveChangesAsync(ct);

        return Result.Success();
    }

    public async Task<Result> RescheduleAsync(Guid id, RescheduleRecurringPaymentRequest request, CancellationToken ct = default)
    {
        if (!_currentUserContext.IsAuthenticated || _currentUserContext.UserId is null)
            return Result.Failure(Error.Unauthorized("Auth.Unauthorized", "User is not authenticated."));

        var recurring = await _repository.GetByIdAsync(id, ct);
        if (recurring is null || recurring.UserId != _currentUserContext.UserId.Value)
            return Result.Failure(Error.NotFound("Recurring.NotFound", "Recurring payment not found."));

        recurring.Reschedule(request.NewDueDate);
        await _repository.UpdateAsync(recurring, ct);
        await _unitOfWork.SaveChangesAsync(ct);

        return Result.Success();
    }

    public async Task<Result> PauseAsync(Guid id, CancellationToken ct = default)
    {
        if (!_currentUserContext.IsAuthenticated || _currentUserContext.UserId is null)
            return Result.Failure(Error.Unauthorized("Auth.Unauthorized", "User is not authenticated."));

        var recurring = await _repository.GetByIdAsync(id, ct);
        if (recurring is null || recurring.UserId != _currentUserContext.UserId.Value)
            return Result.Failure(Error.NotFound("Recurring.NotFound", "Recurring payment not found."));

        recurring.Pause();
        await _repository.UpdateAsync(recurring, ct);
        await _unitOfWork.SaveChangesAsync(ct);

        return Result.Success();
    }

    public async Task<Result> ResumeAsync(Guid id, CancellationToken ct = default)
    {
        if (!_currentUserContext.IsAuthenticated || _currentUserContext.UserId is null)
            return Result.Failure(Error.Unauthorized("Auth.Unauthorized", "User is not authenticated."));

        var recurring = await _repository.GetByIdAsync(id, ct);
        if (recurring is null || recurring.UserId != _currentUserContext.UserId.Value)
            return Result.Failure(Error.NotFound("Recurring.NotFound", "Recurring payment not found."));

        recurring.Resume();
        await _repository.UpdateAsync(recurring, ct);
        await _unitOfWork.SaveChangesAsync(ct);

        return Result.Success();
    }

    public async Task<Result<Guid>> ConfirmPaymentAsync(Guid id, ConfirmRecurringPaymentRequest request, CancellationToken ct = default)
    {
        if (!_currentUserContext.IsAuthenticated || _currentUserContext.UserId is null)
            return Result.Failure<Guid>(Error.Unauthorized("Auth.Unauthorized", "User is not authenticated."));

        var recurring = await _repository.GetByIdAsync(id, ct);
        if (recurring is null || recurring.UserId != _currentUserContext.UserId.Value)
            return Result.Failure<Guid>(Error.NotFound("Recurring.NotFound", "Recurring payment not found."));

        var accountId = request.AccountId ?? recurring.DefaultAccountId;
        if (!accountId.HasValue || accountId.Value == Guid.Empty)
            return Result.Failure<Guid>(Error.Validation("Recurring.MissingAccount", "An account must be selected to confirm the payment."));

        var paymentAmount = request.Amount ?? recurring.Amount.Amount;
        if (paymentAmount <= 0)
            return Result.Failure<Guid>(Error.Validation("Recurring.InvalidAmount", "Payment amount must be positive."));

        var direction = recurring.FlowType == RecurringFlowType.Income ? "Income" : "Expense";
        var description = string.IsNullOrWhiteSpace(request.Description)
            ? $"Pago programado: {recurring.Name}"
            : request.Description.Trim();

        var occurredAt = request.OccurredAt ?? _clock.UtcNow;

        Guid transactionId;
        try
        {
            transactionId = await _ledgerModule.RegisterRecurringTransactionAsync(
                new RegisterRecurringTransactionDto(
                    UserId: _currentUserContext.UserId.Value,
                    AccountId: accountId.Value,
                    Amount: paymentAmount,
                    Currency: recurring.Amount.Currency.Code,
                    Direction: direction,
                    CategoryId: recurring.CategoryId,
                    OccurredAt: occurredAt,
                    Description: description),
                ct);
        }
        catch (InvalidOperationException ex)
        {
            return Result.Failure<Guid>(Error.Validation("Recurring.LedgerError", ex.Message));
        }

        // Advance to next cycle
        recurring.AdvanceNextDueDate();
        await _repository.UpdateAsync(recurring, ct);
        await _unitOfWork.SaveChangesAsync(ct);

        return Result.Success(transactionId);
    }

    private static RecurringPaymentDto MapToDto(RecurringPayment r, DateOnly today)
    {
        var daysUntil = r.NextDueDate.DayNumber - today.DayNumber;
        var isOverdue = daysUntil < 0 && r.Status == RecurringStatus.Active;
        var isDueSoon = daysUntil >= 0 && daysUntil <= 7 && r.Status == RecurringStatus.Active;

        return new RecurringPaymentDto(
            Id: r.Id,
            Name: r.Name,
            Description: r.Description,
            FlowType: r.FlowType.ToString(),
            Amount: r.Amount.Amount,
            Currency: r.Amount.Currency.Code,
            Frequency: r.Frequency.ToString(),
            StartDate: r.StartDate,
            NextDueDate: r.NextDueDate,
            Status: r.Status.ToString(),
            EndType: r.EndType.ToString(),
            EndDate: r.EndDate,
            TotalOccurrences: r.TotalOccurrences,
            CompletedOccurrences: r.CompletedOccurrences,
            AutoCreateDraft: r.AutoCreateDraft,
            CategoryId: r.CategoryId,
            DefaultAccountId: r.DefaultAccountId,
            DaysUntilDue: daysUntil,
            IsOverdue: isOverdue,
            IsDueSoon: isDueSoon,
            CreatedAt: r.CreatedAt);
    }

    private static decimal NormalizeToMonthly(decimal amount, RecurringFrequency frequency)
    {
        return frequency switch
        {
            RecurringFrequency.Weekly => amount * 52m / 12m,
            RecurringFrequency.BiWeekly => amount * 26m / 12m,
            RecurringFrequency.Monthly => amount,
            RecurringFrequency.Quarterly => amount / 3m,
            RecurringFrequency.SemiAnnual => amount / 6m,
            RecurringFrequency.Yearly => amount / 12m,
            _ => amount
        };
    }
}
