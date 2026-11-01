using System.Data.Common;
using BuildingBlocks.Common;
using BuildingBlocks.Security;
using BuildingBlocks.Time;
using Ledger.Contracts;
using Ledger.Infrastructure;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using Planning.Domain.Investments;
using Planning.Contracts;
using Planning.Infrastructure;

namespace Api.Infrastructure.Transactions;

public sealed class RelationalInvestmentCashTransaction(LedgerDbContext ledgerDb, PlanningDbContext planningDb)
{
    public async Task<Result<InvestmentCashResult>> RegisterAsync(Guid investmentId, string kind, InvestmentCashRequest request, ILedgerModule ledger,
        ICurrentUserContext user, IClock clock, CancellationToken ct)
    {
        if (!user.IsAuthenticated || user.UserId is null) return Result.Failure<InvestmentCashResult>(Error.Unauthorized("Auth.Unauthorized", "User is not authenticated."));
        if (request.Amount <= 0) return Result.Failure<InvestmentCashResult>(Error.Validation("InvestmentCash.InvalidAmount", "Amount must be positive."));
        if (kind is not ("Contribution" or "Disposal")) return Result.Failure<InvestmentCashResult>(Error.Validation("InvestmentCash.InvalidKind", "Kind must be Contribution or Disposal."));
        var uid = user.UserId.Value;
        var investment = await planningDb.Investments.FirstOrDefaultAsync(i => i.Id == investmentId && i.UserId == uid, ct);
        if (investment is null) return Result.Failure<InvestmentCashResult>(Error.NotFound("Investment.NotFound", "Investment not found."));
        if (investment.ArchivedAt.HasValue) return Result.Failure<InvestmentCashResult>(Error.Conflict("Investment.Archived", "Archived investments cannot receive cash movements."));

        InvestmentCashResult? response = null;
        try
        {
            await ExecuteAsync(async token =>
            {
                var registration = await ledger.RegisterInvestmentCashAsync(new(uid, investment.Id, request.AccountId,
                    request.Amount, kind, request.OccurredAt ?? clock.UtcNow, request.Description), token);
                if (registration.ErrorCode is not null || registration.TransactionId is null)
                    throw new InvestmentCashOperationException(registration.ErrorCode ?? "InvestmentCash.RegisterFailed");
                var cashKind = Enum.Parse<InvestmentCashKind>(kind);
                var link = InvestmentCashLink.Create(uid, investment.Id, registration.TransactionId.Value, cashKind, clock.UtcNow);
                await planningDb.InvestmentCashLinks.AddAsync(link, token);
                await planningDb.SaveChangesAsync(token);
                response = new(registration.TransactionId.Value, investment.Id, cashKind.ToString());
            }, ct);
        }
        catch (InvestmentCashOperationException ex)
        {
            if (ex.Code == "Account.NotFound")
                return Result.Failure<InvestmentCashResult>(Error.NotFound(ex.Code, "Account not found."));
            if (ex.Code == "Account.Archived")
                return Result.Failure<InvestmentCashResult>(Error.Conflict(ex.Code, "Archived accounts cannot fund investment cash movements."));
            return Result.Failure<InvestmentCashResult>(Error.Validation(ex.Code, "Investment cash movement could not be registered."));
        }
        return Result.Success(response!);
    }

    public async Task<Result<InvestmentCashResult>> ReverseAsync(Guid transactionId, ILedgerModule ledger,
        ICurrentUserContext user, IClock clock, CancellationToken ct)
    {
        if (!user.IsAuthenticated || user.UserId is null) return Result.Failure<InvestmentCashResult>(Error.Unauthorized("Auth.Unauthorized", "User is not authenticated."));
        var uid = user.UserId.Value;
        var original = await planningDb.InvestmentCashLinks.FirstOrDefaultAsync(link => link.LedgerTransactionId == transactionId && link.UserId == uid, ct);
        if (original is null) return Result.Failure<InvestmentCashResult>(Error.NotFound("InvestmentCash.NotFound", "Investment cash movement not found."));
        if (await planningDb.InvestmentCashLinks.AnyAsync(link => link.ReversesLinkId == original.Id, ct))
            return Result.Failure<InvestmentCashResult>(Error.Conflict("InvestmentCash.AlreadyReversed", "Investment cash movement is already reversed."));

        InvestmentCashResult? response = null;
        try
        {
            await ExecuteAsync(async token =>
            {
                var reversal = await ledger.ReverseInvestmentCashAsync(uid, transactionId, token);
                if (reversal.ErrorCode is not null || reversal.TransactionId is null)
                    throw new InvestmentCashOperationException(reversal.ErrorCode ?? "InvestmentCash.ReverseFailed");
                await planningDb.InvestmentCashLinks.AddAsync(InvestmentCashLink.Create(uid, original.InvestmentId,
                    reversal.TransactionId.Value, original.Kind, clock.UtcNow, original.Id), token);
                await planningDb.SaveChangesAsync(token);
                response = new(reversal.TransactionId.Value, original.InvestmentId, original.Kind.ToString());
            }, ct);
        }
        catch (InvestmentCashOperationException ex) when (ex.Code == "InvestmentCash.AlreadyReversed")
        {
            return Result.Failure<InvestmentCashResult>(Error.Conflict(ex.Code, "Investment cash movement is already reversed."));
        }
        catch (InvestmentCashOperationException ex) when (ex.Code == "InvestmentCash.NotFound")
        {
            return Result.Failure<InvestmentCashResult>(Error.NotFound(ex.Code, "Investment cash movement not found."));
        }
        catch (DbUpdateException)
        {
            if (await planningDb.InvestmentCashLinks.AnyAsync(link => link.ReversesLinkId == original.Id, ct))
                return Result.Failure<InvestmentCashResult>(Error.Conflict("InvestmentCash.AlreadyReversed", "Investment cash movement is already reversed."));
            throw;
        }
        return Result.Success(response!);
    }

    private async Task ExecuteAsync(Func<CancellationToken, Task> operation, CancellationToken ct)
    {
        var provider = ledgerDb.Database.ProviderName;
        if (provider != planningDb.Database.ProviderName || provider is not ("Npgsql.EntityFrameworkCore.PostgreSQL" or "Microsoft.EntityFrameworkCore.Sqlite"))
            throw new InvalidOperationException("Atomic investment cash operations require matching PostgreSQL or SQLite providers.");
        var ledgerConnection = ledgerDb.Database.GetDbConnection();
        var planningConnection = planningDb.Database.GetDbConnection();
        if (ledgerConnection.State != planningConnection.State || (!ReferenceEquals(ledgerConnection, planningConnection) && ledgerConnection.State != System.Data.ConnectionState.Closed) ||
            ledgerDb.Database.CurrentTransaction is not null || planningDb.Database.CurrentTransaction is not null)
            throw new InvalidOperationException("Atomic investment cash operations require closed idle connections.");
        DbConnection? previous = null;
        var replaced = false;
        if (!ReferenceEquals(ledgerConnection, planningConnection))
        {
            if (provider != "Npgsql.EntityFrameworkCore.PostgreSQL" || ledgerConnection.ConnectionString != planningConnection.ConnectionString)
                throw new InvalidOperationException("Planning and Ledger must share one database connection for atomic investment cash operations.");
            previous = planningConnection;
            planningDb.Database.SetDbConnection(ledgerConnection, contextOwnsConnection: false);
            replaced = true;
        }
        IDbContextTransaction? transaction = null;
        try
        {
            transaction = await ledgerDb.Database.BeginTransactionAsync(ct);
            await planningDb.Database.UseTransactionAsync(transaction.GetDbTransaction(), ct);
            await operation(ct);
            await transaction.CommitAsync(ct);
        }
        catch
        {
            try { if (transaction is not null) await transaction.RollbackAsync(CancellationToken.None); }
            finally { ledgerDb.ChangeTracker.Clear(); planningDb.ChangeTracker.Clear(); }
            throw;
        }
        finally
        {
            if (planningDb.Database.CurrentTransaction is not null) await planningDb.Database.UseTransactionAsync((DbTransaction?)null, CancellationToken.None);
            if (ledgerDb.Database.CurrentTransaction is not null) await ledgerDb.Database.UseTransactionAsync((DbTransaction?)null, CancellationToken.None);
            if (transaction is not null) await transaction.DisposeAsync();
            if (replaced && previous is not null) planningDb.Database.SetDbConnection(previous, contextOwnsConnection: true);
        }
    }
}

public sealed class InvestmentCashOperationException(string code) : Exception(code) { public string Code { get; } = code; }
