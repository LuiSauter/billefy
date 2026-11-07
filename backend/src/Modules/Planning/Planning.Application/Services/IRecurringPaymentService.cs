using BuildingBlocks.Common;
using Planning.Contracts;

namespace Planning.Application.Services;

public interface IRecurringPaymentService
{
    Task<Result<List<RecurringPaymentDto>>> GetAllAsync(
        string? flowType = null,
        string? status = null,
        string? search = null,
        CancellationToken ct = default);

    Task<Result<RecurringSummaryDto>> GetSummaryAsync(
        string? currency = null,
        CancellationToken ct = default);

    Task<Result<List<RecurringCalendarOccurrenceDto>>> GetCalendarOccurrencesAsync(
        DateOnly fromDate,
        DateOnly toDate,
        CancellationToken ct = default);

    Task<Result<RecurringPaymentDto>> GetByIdAsync(
        Guid id,
        CancellationToken ct = default);

    Task<Result<Guid>> CreateAsync(
        CreateRecurringPaymentRequest request,
        CancellationToken ct = default);

    Task<Result> UpdateAsync(
        Guid id,
        UpdateRecurringPaymentRequest request,
        CancellationToken ct = default);

    Task<Result> DeleteAsync(
        Guid id,
        CancellationToken ct = default);

    Task<Result> RescheduleAsync(
        Guid id,
        RescheduleRecurringPaymentRequest request,
        CancellationToken ct = default);

    Task<Result> PauseAsync(
        Guid id,
        CancellationToken ct = default);

    Task<Result> ResumeAsync(
        Guid id,
        CancellationToken ct = default);

    Task<Result<Guid>> ConfirmPaymentAsync(
        Guid id,
        ConfirmRecurringPaymentRequest request,
        CancellationToken ct = default);
}
