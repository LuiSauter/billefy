using System.Net;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.DependencyInjection;
using Planning.Domain.Goals;
using Planning.Infrastructure;
using Xunit;

namespace Api.Tests;

public sealed class GoalFundingConcurrencyTests
{
    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task ConcurrentCrossGoalAssignments_CommitOnlyOne_AndDoNotConsumeRejectedFunds(bool existingBucket)
    {
        var gate = new FundingSaveGate();
        using var factory = new CustomWebApplicationFactory(configureServices: services =>
            services.AddDbContext<PlanningDbContext>(options => options.AddInterceptors(gate)));
        using var client = GoalFundingTests.Client(factory);
        var account = await GoalFundingTests.Account(client, 1000m);
        var first = await GoalFundingTests.Goal(client, account);
        var second = await GoalFundingTests.Goal(client, account);
        if (existingBucket)
        {
            // Establish the serialization row through public operations, never direct test inserts.
            using var seed = await GoalFundingTests.Funding(client, first, "assign", 1m, Guid.NewGuid());
            seed.StatusCode.Should().Be(HttpStatusCode.Created);
            using var release = await GoalFundingTests.Funding(client, first, "release", 1m, Guid.NewGuid());
            release.StatusCode.Should().Be(HttpStatusCode.Created);
        }
        gate.Armed = true;
        var winnerTask = GoalFundingTests.Funding(client, first, "assign", 700m, Guid.NewGuid());
        await gate.FirstReached.Task.WaitAsync(TimeSpan.FromSeconds(10));
        var loserKey = Guid.NewGuid();
        var loserTask = GoalFundingTests.Funding(client, second, "assign", 700m, loserKey);
        await gate.SecondReached.Task.WaitAsync(TimeSpan.FromSeconds(10));
        gate.AllowFirst.SetResult();
        using var winner = await winnerTask;
        winner.StatusCode.Should().Be(HttpStatusCode.Created);
        gate.AllowSecond.SetResult();
        using var loser = await loserTask;
        await GoalFundingTests.Problem(loser, HttpStatusCode.Conflict, "GoalFunding.ConcurrentChange");
        var history = await GoalFundingTests.Json(client, $"/v1/planning/goals/{second}/funding");
        history.GetArrayLength().Should().Be(0);
        var before = await GoalFundingTests.Snapshot(client, first, second);
        using var retry = await GoalFundingTests.Funding(client, second, "assign", 700m, loserKey);
        await GoalFundingTests.Problem(retry, HttpStatusCode.Conflict, "GoalFunding.InsufficientFunds");
        (await GoalFundingTests.Snapshot(client, first, second)).Should().Equal(before);
        using var remainder = await GoalFundingTests.Funding(client, second, "assign", 300m, Guid.NewGuid());
        remainder.StatusCode.Should().Be(HttpStatusCode.Created);
        var goals = await GoalFundingTests.Json(client, "/v1/planning/goals");
        goals.EnumerateArray().Sum(g => g.GetProperty("currentAmount").GetDecimal()).Should().Be(1000m);
        (await GoalFundingTests.Json(client, "/v1/accounts"))[0].GetProperty("balance").GetDecimal().Should().Be(1000m);
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task ConcurrentDeleteAndAssignment_DoNotLoseOrOrphanHistory(bool fundingWins)
    {
        var gate = new FundingSaveGate();
        using var factory = new CustomWebApplicationFactory(configureServices: services =>
            services.AddDbContext<PlanningDbContext>(options => options.AddInterceptors(gate)));
        using var client = GoalFundingTests.Client(factory);
        var goal = await GoalFundingTests.Goal(client, await GoalFundingTests.Account(client, 1000m));
        gate.Armed = true;
        var fundingTask = GoalFundingTests.Funding(client, goal, "assign", 700m, Guid.NewGuid());
        await gate.FirstReached.Task.WaitAsync(TimeSpan.FromSeconds(10));
        var deleteTask = client.DeleteAsync($"/v1/planning/goals/{goal}");
        await gate.SecondReached.Task.WaitAsync(TimeSpan.FromSeconds(10));
        if (fundingWins)
        {
            gate.AllowFirst.SetResult();
            using var funding = await fundingTask;
            funding.StatusCode.Should().Be(HttpStatusCode.Created);
            gate.AllowSecond.SetResult();
            using var deleted = await deleteTask;
            await GoalFundingTests.Problem(deleted, HttpStatusCode.Conflict, "GoalFunding.ConcurrentChange");
            (await GoalFundingTests.Json(client, $"/v1/planning/goals/{goal}/funding")).GetArrayLength().Should().Be(1);
        }
        else
        {
            gate.AllowSecond.SetResult();
            using var deleted = await deleteTask;
            deleted.StatusCode.Should().Be(HttpStatusCode.OK);
            gate.AllowFirst.SetResult();
            using var funding = await fundingTask;
            await GoalFundingTests.Problem(funding, HttpStatusCode.Conflict, "GoalFunding.ConcurrentChange");
            (await GoalFundingTests.Json(client, "/v1/planning/goals")).GetArrayLength().Should().Be(0);
        }
        (await GoalFundingTests.Json(client, "/v1/accounts"))[0].GetProperty("balance").GetDecimal().Should().Be(1000m);
        var ledger = await GoalFundingTests.Json(client, "/v1/transactions");
        ledger.GetArrayLength().Should().Be(0);
    }

    private sealed class FundingSaveGate : SaveChangesInterceptor
    {
        public bool Armed { get; set; }
        private int _arrivals;
        public TaskCompletionSource FirstReached { get; } = new(TaskCreationOptions.RunContinuationsAsynchronously);
        public TaskCompletionSource SecondReached { get; } = new(TaskCreationOptions.RunContinuationsAsynchronously);
        public TaskCompletionSource AllowFirst { get; } = new(TaskCreationOptions.RunContinuationsAsynchronously);
        public TaskCompletionSource AllowSecond { get; } = new(TaskCreationOptions.RunContinuationsAsynchronously);
        public override async ValueTask<InterceptionResult<int>> SavingChangesAsync(DbContextEventData data,
            InterceptionResult<int> result, CancellationToken ct = default)
        {
            if (Armed && (data.Context!.ChangeTracker.Entries<GoalFundingEntry>().Any(e => e.State == EntityState.Added) ||
                data.Context.ChangeTracker.Entries<Goal>().Any(e => e.State == EntityState.Deleted)))
            {
                var arrival = Interlocked.Increment(ref _arrivals);
                if (arrival == 1) { FirstReached.SetResult(); await AllowFirst.Task.WaitAsync(TimeSpan.FromSeconds(10), ct); }
                if (arrival == 2) { SecondReached.SetResult(); await AllowSecond.Task.WaitAsync(TimeSpan.FromSeconds(10), ct); }
            }
            return result;
        }
    }
}
