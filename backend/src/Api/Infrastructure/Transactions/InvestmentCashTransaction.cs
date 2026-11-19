using System.Data.Common;
using System.Globalization;
using System.Runtime.CompilerServices;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
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
using Planning.Application.Abstractions;
using Planning.Application.Services;

namespace Api.Infrastructure.Transactions;

public sealed class RelationalInvestmentCashTransaction(LedgerDbContext ledgerDb, PlanningDbContext planningDb, IInvestmentRepository investments)
{
    // SQLite test scopes share a connection; serialize its transaction lifetime, not only SaveChanges.
    // PostgreSQL processes are additionally protected by position concurrency and the unique owner/key index.
    private static readonly ConditionalWeakTable<DbConnection, SemaphoreSlim> ConnectionGates = new();

    public async Task<Result<InvestmentPurchaseResult>> PurchaseAsync(Guid investmentId, RegisterInvestmentOperationRequest request,
        Guid? key, ILedgerModule ledger, ICurrentUserContext user, IClock clock, CancellationToken ct)
    {
        if (!user.IsAuthenticated || user.UserId is null)
            return Result.Failure<InvestmentPurchaseResult>(Error.Unauthorized("Auth.Unauthorized", "User is not authenticated."));
        if (!key.HasValue || key.Value == Guid.Empty)
            return Result.Failure<InvestmentPurchaseResult>(Error.Validation("Investment.IdempotencyKeyRequired", "A nonempty Idempotency-Key UUID is required for a funded purchase."));
        var uid = user.UserId.Value;
        var dividend = string.Equals(request.Type, "Dividend", StringComparison.OrdinalIgnoreCase);
        DateTime? requestedAt = request.OccurredAt is { } suppliedAt ? PurchaseTimestamp(suppliedAt) : null;
        // Canonical decimal values make 600 and 600.00 the same economic retry.
        var hash = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(JsonSerializer.Serialize(new
        {
            investmentId, type = request.Type?.ToLowerInvariant(),
            quantity = request.Quantity.ToString("G29", CultureInfo.InvariantCulture),
            unitPrice = request.UnitPrice.ToString("G29", CultureInfo.InvariantCulture),
            totalAmount = request.TotalAmount.ToString("G29", CultureInfo.InvariantCulture),
            fees = request.Fees.ToString("G29", CultureInfo.InvariantCulture),
            occurredAt = requestedAt, notes = request.Notes?.Trim(), request.LinkedAccountId
        }))));
        InvestmentPurchaseResult? response = null;
        try
        {
            await ExecuteAsync(async token =>
            {
                // Check persisted retry identity before validating a changed payload or current lifecycle state.
                var prior = await planningDb.InvestmentTransactions.FirstOrDefaultAsync(t => t.UserId == uid && t.PurchaseKey == key.Value, token);
                if (prior is not null)
                {
                    if (prior.PurchasePayloadHash != hash) throw new InvestmentCashOperationException("Investment.IdempotencyConflict");
                    response = new(PurchaseDto(prior), true);
                    return;
                }
                if (!dividend && !string.Equals(request.Type, "Buy", StringComparison.OrdinalIgnoreCase))
                    throw new InvestmentCashOperationException("Investment.InvalidOperationType");
                if (!request.LinkedAccountId.HasValue)
                    throw new InvestmentCashOperationException("Investment.FundingAccountRequired");
                var position = await planningDb.Investments.FirstOrDefaultAsync(i => i.Id == investmentId && i.UserId == uid, token);
                if (position is null) throw new InvestmentCashOperationException("Investment.NotFound");
                if (position.ArchivedAt.HasValue) throw new InvestmentCashOperationException("Investment.Archived");
                if (dividend ? request.Quantity != 0 : request.Quantity <= 0 || request.Quantity != decimal.Round(request.Quantity, 10) || request.Quantity >= 1_000_000_000_000_000_000m)
                    throw new InvestmentCashOperationException("Investment.InvalidQuantity");
                if (dividend ? request.UnitPrice != 0 : request.UnitPrice <= 0 || request.UnitPrice != decimal.Round(request.UnitPrice, 6) || request.UnitPrice > 99_999_999_999_999.999999m)
                    throw new InvestmentCashOperationException("Investment.InvalidUnitPrice");
                if (dividend ? request.Fees != 0 : request.Fees < 0 || request.Fees > 99_999_999_999_999.999999m)
                    throw new InvestmentCashOperationException("Investment.InvalidFees");
                var account = (await ledger.GetAccountsByUserIdAsync(uid, token)).SingleOrDefault(a => a.Id == request.LinkedAccountId);
                if (account is null) throw new InvestmentCashOperationException("Account.NotFound");
                if (!StringComparer.Ordinal.Equals(account.Currency, position.Currency))
                    throw new InvestmentCashOperationException("Investment.CurrencyMismatch");
                var precision = BuildingBlocks.Currencies.Currency.FromCode(account.Currency).DecimalPlaces;
                if (request.TotalAmount <= 0 || request.TotalAmount > 99_999_999_999_999.999999m ||
                    request.TotalAmount != decimal.Round(request.TotalAmount, Math.Min(precision, 6)) ||
                    (!dividend && request.TotalAmount != decimal.Round(request.Quantity * request.UnitPrice, precision, MidpointRounding.AwayFromZero)))
                    throw new InvestmentCashOperationException("Investment.InvalidAmount");
                if (request.Fees != decimal.Round(request.Fees, Math.Min(precision, 6))) throw new InvestmentCashOperationException("Investment.InvalidFees");
                if (request.Notes?.Trim().Length > 500) throw new InvestmentCashOperationException("Investment.InvalidNotes");
                var acquisitionCost = request.TotalAmount + request.Fees;
                if (!dividend && (acquisitionCost > 99_999_999_999_999.999999m || position.CurrentValue + acquisitionCost > 99_999_999_999_999.999999m ||
                    position.CostBasis + acquisitionCost > 99_999_999_999_999.999999m || position.Quantity + request.Quantity >= 1_000_000_000_000_000_000m))
                    throw new InvestmentCashOperationException("Investment.InvalidAmount");
                var date = requestedAt ?? PurchaseTimestamp(clock.UtcNow);
                var registration = await ledger.RegisterInvestmentCashAsync(new(uid, investmentId, account.Id,
                    acquisitionCost, dividend ? "Dividend" : "Contribution", date, request.Notes), token);
                if (registration.ErrorCode is not null || registration.TransactionId is null)
                    throw new InvestmentCashOperationException(registration.ErrorCode ?? "InvestmentCash.RegisterFailed");
                if (!dividend) position.ApplyPurchase(request.Quantity, acquisitionCost, date);
                var operation = InvestmentTransaction.Create(uid, investmentId, dividend ? InvestmentTransactionType.Dividend : InvestmentTransactionType.Buy,
                    request.Quantity, request.UnitPrice, request.TotalAmount, request.Fees, date, request.Notes,
                    registration.TransactionId.Value, PurchaseTimestamp(clock.UtcNow));
                operation.BindCashOperation(key.Value, hash);
                await investments.AddTransactionAsync(operation, token);
                if (!dividend)
                    await investments.AddCashLinkAsync(InvestmentCashLink.Create(uid, investmentId,
                        registration.TransactionId.Value, InvestmentCashKind.Contribution, clock.UtcNow), token);
                await planningDb.SaveChangesAsync(token);
                response = new(PurchaseDto(operation), false);
            }, ct);
        }
        catch (InvestmentCashOperationException ex)
        {
            var error = ex.Code switch
            {
                "Account.NotFound" or "Investment.NotFound" => Error.NotFound(ex.Code, "The owned account or investment was not found."),
                "Investment.IdempotencyConflict" => Error.Conflict(ex.Code, "The purchase key is already bound to another payload."),
                "Investment.Archived" or "Account.Archived" => Error.Conflict(ex.Code, "Archived records cannot receive purchases."),
                _ => Error.Validation(ex.Code, "The purchase input is invalid; no financial state was changed.")
            };
            return Result.Failure<InvestmentPurchaseResult>(error);
        }
        catch (OverflowException)
        {
            return Result.Failure<InvestmentPurchaseResult>(Error.Validation("Investment.InvalidAmount", "The purchase exceeds supported precision."));
        }
        catch (DbUpdateException)
        {
            return Result.Failure<InvestmentPurchaseResult>(Error.Conflict("Investment.ConcurrentChange", "A competing write occurred; reload before retrying with the same key."));
        }
        return Result.Success(response!);
    }

    private static DateTime PurchaseTimestamp(DateTime value)
    {
        var utc = value.Kind == DateTimeKind.Local ? value.ToUniversalTime() : value;
        // PostgreSQL stores microseconds; SQLite materializes UTC timestamps as Unspecified.
        return new DateTime(utc.Ticks - utc.Ticks % 10, DateTimeKind.Utc);
    }

    private static decimal PurchaseDecimal(decimal value) => decimal.Parse(value.ToString("G29", CultureInfo.InvariantCulture), NumberStyles.Float, CultureInfo.InvariantCulture);

    private static InvestmentTransactionDto PurchaseDto(InvestmentTransaction operation)
    {
        var dto = InvestmentService.ToTransactionDto(operation);
        return dto with
        {
            Quantity = PurchaseDecimal(dto.Quantity), UnitPrice = PurchaseDecimal(dto.UnitPrice),
            TotalAmount = PurchaseDecimal(dto.TotalAmount), Fees = PurchaseDecimal(dto.Fees),
            OccurredAt = PurchaseTimestamp(dto.OccurredAt), CreatedAt = PurchaseTimestamp(dto.CreatedAt)
        };
    }

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
        if (await planningDb.InvestmentTransactions.AnyAsync(t => t.LedgerTransactionId == transactionId && t.PurchaseKey != null, ct))
            return Result.Failure<InvestmentCashResult>(Error.Conflict("InvestmentCash.PositionOperation", "Purchase cash cannot be reversed independently of its position; a position-aware correction is required."));
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
        var gate = ConnectionGates.GetValue(ledgerDb.Database.GetDbConnection(), _ => new SemaphoreSlim(1, 1));
        await gate.WaitAsync(ct);
        try { await ExecuteCoreAsync(operation, ct); }
        finally { gate.Release(); }
    }

    private async Task ExecuteCoreAsync(Func<CancellationToken, Task> operation, CancellationToken ct)
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
