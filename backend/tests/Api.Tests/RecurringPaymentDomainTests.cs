using BuildingBlocks.Currencies;
using BuildingBlocks.ValueObjects;
using FluentAssertions;
using Planning.Domain.Recurring;
using Xunit;

namespace Api.Tests;

public sealed class RecurringPaymentDomainTests
{
    [Fact]
    public void Create_ValidParameters_InstantiatesActiveRecurringPayment()
    {
        var userId = Guid.NewGuid();
        var categoryId = Guid.NewGuid();
        var accountId = Guid.NewGuid();
        var startDate = new DateOnly(2026, 10, 15);
        var amount = Money.Of(69.00m, Currency.BOB);

        var recurring = RecurringPayment.Create(
            userId: userId,
            name: "Netflix",
            description: "Suscripción mensual",
            flowType: RecurringFlowType.Expense,
            amount: amount,
            frequency: RecurringFrequency.Monthly,
            startDate: startDate,
            categoryId: categoryId,
            defaultAccountId: accountId);

        recurring.Id.Should().NotBeEmpty();
        recurring.UserId.Should().Be(userId);
        recurring.Name.Should().Be("Netflix");
        recurring.Description.Should().Be("Suscripción mensual");
        recurring.FlowType.Should().Be(RecurringFlowType.Expense);
        recurring.Amount.Should().Be(amount);
        recurring.Frequency.Should().Be(RecurringFrequency.Monthly);
        recurring.StartDate.Should().Be(startDate);
        recurring.NextDueDate.Should().Be(startDate);
        recurring.Status.Should().Be(RecurringStatus.Active);
        recurring.CategoryId.Should().Be(categoryId);
        recurring.DefaultAccountId.Should().Be(accountId);
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    public void Create_EmptyName_ThrowsArgumentException(string invalidName)
    {
        var act = () => RecurringPayment.Create(
            userId: Guid.NewGuid(),
            name: invalidName,
            description: null,
            flowType: RecurringFlowType.Expense,
            amount: Money.Of(10m, Currency.BOB),
            frequency: RecurringFrequency.Monthly,
            startDate: new DateOnly(2026, 1, 1));

        act.Should().Throw<ArgumentException>();
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-50)]
    public void Create_NonPositiveAmount_ThrowsArgumentOutOfRangeException(decimal invalidAmount)
    {
        var act = () => RecurringPayment.Create(
            userId: Guid.NewGuid(),
            name: "Luz",
            description: null,
            flowType: RecurringFlowType.Expense,
            amount: Money.Of(invalidAmount, Currency.BOB),
            frequency: RecurringFrequency.Monthly,
            startDate: new DateOnly(2026, 1, 1));

        act.Should().Throw<ArgumentOutOfRangeException>();
    }

    [Fact]
    public void AdvanceNextDueDate_Monthly_AdvancesByOneMonth()
    {
        var startDate = new DateOnly(2026, 10, 15);
        var recurring = RecurringPayment.Create(
            userId: Guid.NewGuid(),
            name: "Internet",
            description: null,
            flowType: RecurringFlowType.Expense,
            amount: Money.Of(280m, Currency.BOB),
            frequency: RecurringFrequency.Monthly,
            startDate: startDate);

        recurring.AdvanceNextDueDate();

        recurring.NextDueDate.Should().Be(new DateOnly(2026, 11, 15));
    }

    [Fact]
    public void AdvanceNextDueDate_Monthly_ClampsToMonthEndCorrectly()
    {
        var startDate = new DateOnly(2026, 1, 31);
        var recurring = RecurringPayment.Create(
            userId: Guid.NewGuid(),
            name: "Seguro",
            description: null,
            flowType: RecurringFlowType.Expense,
            amount: Money.Of(100m, Currency.BOB),
            frequency: RecurringFrequency.Monthly,
            startDate: startDate);

        recurring.AdvanceNextDueDate();

        recurring.NextDueDate.Should().Be(new DateOnly(2026, 2, 28));
    }

    [Theory]
    [InlineData(RecurringFrequency.Weekly, 2026, 5, 1, 2026, 5, 8)]
    [InlineData(RecurringFrequency.BiWeekly, 2026, 5, 1, 2026, 5, 15)]
    [InlineData(RecurringFrequency.Monthly, 2026, 5, 1, 2026, 6, 1)]
    [InlineData(RecurringFrequency.Quarterly, 2026, 5, 1, 2026, 8, 1)]
    [InlineData(RecurringFrequency.SemiAnnual, 2026, 5, 1, 2026, 11, 1)]
    [InlineData(RecurringFrequency.Yearly, 2026, 5, 1, 2027, 5, 1)]
    public void CalculateNextDueDate_CalculatesAccuratelyForFrequencies(
        RecurringFrequency frequency,
        int startYear, int startMonth, int startDay,
        int expYear, int expMonth, int expDay)
    {
        var fromDate = new DateOnly(startYear, startMonth, startDay);
        var expected = new DateOnly(expYear, expMonth, expDay);

        var result = RecurringPayment.CalculateNextDueDate(fromDate, frequency);

        result.Should().Be(expected);
    }

    [Fact]
    public void Reschedule_UpdatesNextDueDateWithoutModifyingFrequency()
    {
        var recurring = RecurringPayment.Create(
            userId: Guid.NewGuid(),
            name: "Alquiler",
            description: null,
            flowType: RecurringFlowType.Expense,
            amount: Money.Of(2800m, Currency.BOB),
            frequency: RecurringFrequency.Monthly,
            startDate: new DateOnly(2026, 11, 1));

        var newDate = new DateOnly(2026, 11, 5);
        recurring.Reschedule(newDate);

        recurring.NextDueDate.Should().Be(newDate);
        recurring.Frequency.Should().Be(RecurringFrequency.Monthly);
    }

    [Fact]
    public void PauseAndResume_TogglesStatusCorrectly()
    {
        var recurring = RecurringPayment.Create(
            userId: Guid.NewGuid(),
            name: "Gym",
            description: null,
            flowType: RecurringFlowType.Expense,
            amount: Money.Of(200m, Currency.BOB),
            frequency: RecurringFrequency.Monthly,
            startDate: new DateOnly(2026, 6, 1));

        recurring.Status.Should().Be(RecurringStatus.Active);

        recurring.Pause();
        recurring.Status.Should().Be(RecurringStatus.Paused);

        recurring.Resume();
        recurring.Status.Should().Be(RecurringStatus.Active);
    }

    [Fact]
    public void AdvanceNextDueDate_AfterOccurrences_MarksCompletedWhenLimitReached()
    {
        var recurring = RecurringPayment.Create(
            userId: Guid.NewGuid(),
            name: "Cuota TV",
            description: null,
            flowType: RecurringFlowType.Expense,
            amount: Money.Of(500m, Currency.BOB),
            frequency: RecurringFrequency.Monthly,
            startDate: new DateOnly(2026, 1, 15),
            endType: RecurringEndType.AfterOccurrences,
            totalOccurrences: 2);

        recurring.Status.Should().Be(RecurringStatus.Active);
        recurring.CompletedOccurrences.Should().Be(0);

        // First payment confirmed
        recurring.AdvanceNextDueDate();
        recurring.Status.Should().Be(RecurringStatus.Active);
        recurring.CompletedOccurrences.Should().Be(1);
        recurring.NextDueDate.Should().Be(new DateOnly(2026, 2, 15));

        // Second (last) payment confirmed
        recurring.AdvanceNextDueDate();
        recurring.CompletedOccurrences.Should().Be(2);
        recurring.Status.Should().Be(RecurringStatus.Completed);
    }

    [Fact]
    public void AdvanceNextDueDate_OnDate_MarksCompletedWhenNextExceedsEndDate()
    {
        var recurring = RecurringPayment.Create(
            userId: Guid.NewGuid(),
            name: "Contrato Alquiler",
            description: null,
            flowType: RecurringFlowType.Expense,
            amount: Money.Of(1200m, Currency.BOB),
            frequency: RecurringFrequency.Monthly,
            startDate: new DateOnly(2026, 10, 1),
            endType: RecurringEndType.OnDate,
            endDate: new DateOnly(2026, 11, 15));

        recurring.Status.Should().Be(RecurringStatus.Active);

        // Advance 1: from Oct 1 to Nov 1 (within Nov 15)
        recurring.AdvanceNextDueDate();
        recurring.Status.Should().Be(RecurringStatus.Active);
        recurring.NextDueDate.Should().Be(new DateOnly(2026, 11, 1));

        // Advance 2: next would be Dec 1 (> Nov 15) -> Completed!
        recurring.AdvanceNextDueDate();
        recurring.Status.Should().Be(RecurringStatus.Completed);
    }

    [Fact]
    public void GetOccurrencesBetween_ProjectsOccurrencesCorrectlyWithinWindow()
    {
        var recurring = RecurringPayment.Create(
            userId: Guid.NewGuid(),
            name: "Internet Quincenal",
            description: null,
            flowType: RecurringFlowType.Expense,
            amount: Money.Of(100m, Currency.BOB),
            frequency: RecurringFrequency.BiWeekly,
            startDate: new DateOnly(2026, 10, 1));

        // In October 2026: 1 Oct, 15 Oct, 29 Oct
        var occurrences = recurring.GetOccurrencesBetween(
            new DateOnly(2026, 10, 1),
            new DateOnly(2026, 10, 31));

        occurrences.Should().HaveCount(3);
        occurrences.Should().ContainInOrder(
            new DateOnly(2026, 10, 1),
            new DateOnly(2026, 10, 15),
            new DateOnly(2026, 10, 29));
    }
}
