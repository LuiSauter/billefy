using BuildingBlocks.Currencies;
using BuildingBlocks.ValueObjects;
using Ingestion.Application.Abstractions;
using Ingestion.Domain.Deduplication;
using Ingestion.Domain.Drafts;

namespace Ingestion.Application.Deduplication;

public sealed record DeduplicationResult(
    Guid DraftId,
    bool IsDuplicate,
    DraftStatus Status,
    string Fingerprint);

public interface IDeduplicationService
{
    Task<DeduplicationResult> ProcessMovementAsync(
        Guid userId,
        Guid eventId,
        string source,
        decimal amount,
        string currencyCode,
        DraftDirection direction,
        DateTimeOffset estimatedDate,
        string? reference,
        decimal confidence,
        Guid? suggestedAccountId = null,
        Guid? suggestedCategoryId = null,
        CancellationToken cancellationToken = default);
}

public sealed class DeduplicationService(
    IDraftRepository draftRepository,
    IIngestionUnitOfWork unitOfWork) : IDeduplicationService
{
    public async Task<DeduplicationResult> ProcessMovementAsync(
        Guid userId,
        Guid eventId,
        string source,
        decimal amount,
        string currencyCode,
        DraftDirection direction,
        DateTimeOffset estimatedDate,
        string? reference,
        decimal confidence,
        Guid? suggestedAccountId = null,
        Guid? suggestedCategoryId = null,
        CancellationToken cancellationToken = default)
    {
        var currency = Currency.FromCode(currencyCode);
        var money = Money.Of(amount, currency);

        var fingerprint = FingerprintGenerator.Generate(
            userId,
            amount,
            currency.Code,
            direction,
            estimatedDate,
            reference);

        // Check for duplicate in window ±5 min
        var windowStart = estimatedDate.AddMinutes(-5);
        var windowEnd = estimatedDate.AddMinutes(5);

        var existing = await draftRepository.FindDuplicateAsync(
            userId,
            fingerprint,
            reference,
            amount,
            currency.Code,
            direction,
            windowStart,
            windowEnd,
            cancellationToken);

        if (existing is not null)
        {
            // Link this event as an additional source
            existing.LinkAdditionalEvent(eventId, DateTimeOffset.UtcNow);
            await draftRepository.UpdateAsync(existing, cancellationToken);
            await unitOfWork.SaveChangesAsync(cancellationToken);

            return new DeduplicationResult(
                existing.Id,
                IsDuplicate: true,
                existing.Status,
                existing.Fingerprint);
        }

        // Create new draft (Pending if confidence >= 0.70, otherwise Review)
        Draft draft;
        var now = DateTimeOffset.UtcNow;

        if (confidence >= 0.70m)
        {
            draft = Draft.CreatePending(
                userId,
                source,
                direction,
                money,
                estimatedDate,
                reference,
                suggestedAccountId,
                suggestedCategoryId,
                confidence,
                eventId,
                now);
        }
        else
        {
            draft = Draft.CreateReview(
                userId,
                source,
                direction,
                money,
                estimatedDate,
                reference,
                suggestedAccountId,
                suggestedCategoryId,
                confidence,
                eventId,
                now);
        }

        await draftRepository.AddAsync(draft, cancellationToken);
        await unitOfWork.SaveChangesAsync(cancellationToken);

        return new DeduplicationResult(
            draft.Id,
            IsDuplicate: false,
            draft.Status,
            draft.Fingerprint);
    }
}
