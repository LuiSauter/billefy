using BuildingBlocks.Currencies;
using BuildingBlocks.ValueObjects;
using FluentAssertions;
using Ingestion.Domain.Deduplication;
using Ingestion.Domain.Drafts;
using Ingestion.Domain.RawEvents;
using Xunit;

namespace Ingestion.Domain.Tests;

public class IngestionDomainTests
{
    private readonly Guid _userId = Guid.NewGuid();
    private readonly DateTime _now = DateTime.UtcNow;

    [Fact]
    public void FingerprintGenerator_ShouldGenerateIdenticalHash_WhenInputsMatch()
    {
        var hash1 = FingerprintGenerator.Generate(
            _userId,
            150.50m,
            "BOB",
            DraftDirection.Expense,
            _now,
            "TX-998877");

        var hash2 = FingerprintGenerator.Generate(
            _userId,
            150.50m,
            "BOB",
            DraftDirection.Expense,
            _now.AddMinutes(2), // Date diff shouldn't matter when reference exists
            "TX-998877");

        hash1.Should().Be(hash2);
        hash1.Length.Should().Be(64); // SHA-256 hex string
    }

    [Fact]
    public void FingerprintGenerator_ShouldBucketTime_WithinFiveMinutes_WhenNoReference()
    {
        // Pick a base time aligned to start of a 5-min bucket
        var baseSeconds = (new DateTimeOffset(_now).ToUnixTimeSeconds() / 300) * 300;
        var bucketStart = DateTimeOffset.FromUnixTimeSeconds(baseSeconds).UtcDateTime;

        var hash1 = FingerprintGenerator.Generate(
            _userId,
            200m,
            "USD",
            DraftDirection.Income,
            bucketStart.AddSeconds(30),
            null);

        var hash2 = FingerprintGenerator.Generate(
            _userId,
            200m,
            "USD",
            DraftDirection.Income,
            bucketStart.AddSeconds(120),
            null);

        var hashNextBucket = FingerprintGenerator.Generate(
            _userId,
            200m,
            "USD",
            DraftDirection.Income,
            bucketStart.AddSeconds(350), // Next bucket
            null);

        hash1.Should().Be(hash2);
        hash1.Should().NotBe(hashNextBucket);
    }

    [Fact]
    public void Draft_CreatePending_ShouldInitializeCorrectly()
    {
        var eventId = Guid.NewGuid();
        var amount = Money.Of(75.20m, Currency.BOB);

        var draft = Draft.CreatePending(
            _userId,
            DraftSource.Notification,
            DraftDirection.Expense,
            amount,
            _now,
            "REF-123",
            suggestedAccountId: null,
            suggestedCategoryId: null,
            confidence: 0.95m,
            initialEventId: eventId,
            createdAt: _now);

        draft.Status.Should().Be(DraftStatus.Pending);
        draft.Source.Should().Be(DraftSource.Notification);
        draft.Amount.Amount.Should().Be(75.20m);
        draft.Amount.Currency.Code.Should().Be("BOB");
        draft.Events.Should().HaveCount(1);
        draft.Events.First().EventId.Should().Be(eventId);
        draft.Fingerprint.Should().NotBeNullOrEmpty();
    }

    [Fact]
    public void Draft_Confirm_ShouldTransitionToConfirmed_AndRecordDetails()
    {
        var draft = Draft.CreatePending(
            _userId,
            DraftSource.Notification,
            DraftDirection.Expense,
            Money.Of(50m, Currency.BOB),
            _now,
            null,
            null,
            null,
            0.9m,
            Guid.NewGuid(),
            _now);

        var accountId = Guid.NewGuid();
        var categoryId = Guid.NewGuid();
        var txnId = Guid.NewGuid();
        var confirmedAt = _now.AddMinutes(5);

        draft.Confirm(accountId, categoryId, txnId, confirmedAt);

        draft.Status.Should().Be(DraftStatus.Confirmed);
        draft.ConfirmedAccountId.Should().Be(accountId);
        draft.ConfirmedCategoryId.Should().Be(categoryId);
        draft.LedgerTransactionId.Should().Be(txnId);
        draft.ConfirmedAt.Should().Be(confirmedAt);
    }

    [Fact]
    public void Draft_Confirm_ShouldThrow_WhenAlreadyConfirmedOrDiscarded()
    {
        var draft = Draft.CreatePending(
            _userId,
            DraftSource.Notification,
            DraftDirection.Expense,
            Money.Of(50m, Currency.BOB),
            _now,
            null,
            null,
            null,
            0.9m,
            null,
            _now);

        draft.Confirm(Guid.NewGuid(), null, Guid.NewGuid(), _now);

        var actConfirmAgain = () => draft.Confirm(Guid.NewGuid(), null, Guid.NewGuid(), _now);
        actConfirmAgain.Should().Throw<InvalidOperationException>();

        var discardedDraft = Draft.CreatePending(
            _userId,
            DraftSource.Notification,
            DraftDirection.Expense,
            Money.Of(50m, Currency.BOB),
            _now,
            null,
            null,
            null,
            0.9m,
            null,
            _now);

        discardedDraft.Discard(_now);
        var actConfirmDiscarded = () => discardedDraft.Confirm(Guid.NewGuid(), null, Guid.NewGuid(), _now);
        actConfirmDiscarded.Should().Throw<InvalidOperationException>();
    }

    [Fact]
    public void Draft_Discard_ShouldRetainFingerprint()
    {
        var draft = Draft.CreatePending(
            _userId,
            DraftSource.Notification,
            DraftDirection.Expense,
            Money.Of(100m, Currency.BOB),
            _now,
            "REF-ORIG",
            null,
            null,
            0.85m,
            null,
            _now);

        var originalFingerprint = draft.Fingerprint;
        draft.Discard(_now.AddMinutes(1));

        draft.Status.Should().Be(DraftStatus.Discarded);
        draft.DiscardedAt.Should().Be(_now.AddMinutes(1));
        draft.Fingerprint.Should().Be(originalFingerprint, "Discarded drafts must keep their fingerprint so movements do not reappear (ING-10).");
    }

    [Fact]
    public void RawEvent_Create_ShouldSet30DayPurgeWindow()
    {
        var eventId = Guid.NewGuid();
        var rawEvent = RawEvent.Create(
            _userId,
            eventId,
            "notification",
            "com.banco.union",
            "Transferencia recibida por Bs 100",
            _now);

        rawEvent.PurgeAfter.Should().Be(_now.AddDays(30), "Raw event text must be purged after 30 days (ING-13, Rule 17).");
        rawEvent.EventId.Should().Be(eventId);
    }
}
