using BuildingBlocks.Common;
using BuildingBlocks.Currencies;
using BuildingBlocks.Security;
using BuildingBlocks.Time;
using Ledger.Contracts;
using Notifications.Contracts;
using Workspaces.Application.Abstractions;
using Workspaces.Contracts;
using Workspaces.Domain.Workspaces;

namespace Workspaces.Application.Services;

public sealed class WorkspaceAccess(IWorkspaceRepository repository, ICurrentUserContext user, IClock clock)
{
    public Guid UserId => user.IsAuthenticated ? user.UserId!.Value
        : throw new WorkspaceFailure(Error.Unauthorized("Auth.Unauthorized", "Authentication is required."));
    public DateTime Now => clock.UtcNow;

    internal async Task<(Workspace Workspace, WorkspaceMember Member)> RequireAsync(Guid id, CancellationToken ct, bool manage = false)
    {
        var userId = UserId;
        var workspace = (await repository.ListAsync<Workspace>(x => x.Id == id && x.IsActive, ct)).SingleOrDefault();
        var member = (await repository.ListAsync<WorkspaceMember>(x => x.WorkspaceId == id && x.UserId == userId && x.IsActive, ct)).SingleOrDefault();
        if (workspace is null || member is null)
            throw Missing();
        if (manage && !member.CanManage)
            throw new WorkspaceFailure(Error.Forbidden("Workspace.Forbidden", "A workspace owner or administrator is required."));
        return (workspace, member);
    }

    /// <summary>
    /// Best-effort web push fan-out to every active member of the workspace except the current (acting) user.
    /// Must be called only after the underlying write has committed. Delivery problems are swallowed so they
    /// never fail or leak into the operation that triggered the notification.
    /// </summary>
    internal async Task NotifyOtherMembersAsync(INotificationsModule notifications, Guid workspaceId,
        PushNotificationMessage message, CancellationToken ct)
    {
        try
        {
            var actorUserId = UserId;
            var recipients = (await repository.ListAsync<WorkspaceMember>(x => x.WorkspaceId == workspaceId && x.IsActive, ct))
                .Select(x => x.UserId).Where(x => x != actorUserId).Distinct().ToArray();
            foreach (var recipient in recipients)
            {
                try
                {
                    await notifications.SendPushNotificationAsync(recipient, message, ct);
                }
                catch
                {
                    // Swallowed: one recipient's delivery failure must not block the others.
                }
            }
        }
        catch
        {
            // Swallowed: push delivery is best-effort and must not fail the committed write.
        }
    }

    internal static string Amount(decimal amount, string currency) =>
        $"{amount.ToString("N2", System.Globalization.CultureInfo.InvariantCulture)} {currency}";

    internal static WorkspaceFailure Missing() => new(Error.NotFound("Workspace.NotFound", "Workspace resource not found."));
    internal static void Validate([System.Diagnostics.CodeAnalysis.DoesNotReturnIf(false)] bool condition, string message)
    {
        if (!condition)
            throw new WorkspaceFailure(Error.Validation("Workspace.InvalidRequest", message));
    }

    internal static Currency CurrencyFor(Workspace workspace, string currency)
    {
        var parsed = Currency.FromCode(currency);
        Validate(parsed == workspace.BaseCurrency, "Shared records must use the workspace base currency; implicit FX is not supported.");
        return parsed;
    }

    internal static DateOnly Period(int year, int month)
    {
        Validate(year is >= 2 and <= 9998 && month is >= 1 and <= 12, "Year must be 2–9998 and month 1–12.");
        return new DateOnly(year, month, 1);
    }

    internal static async Task<Result<T>> ReadAsync<T>(Func<Task<T>> action)
    {
        try { return Result.Success(await action()); }
        catch (WorkspaceFailure ex) { return Result.Failure<T>(ex.Error); }
        catch (ArgumentException) { return Result.Failure<T>(Error.Validation("Workspace.InvalidRequest", "One or more request values are invalid.")); }
        catch (WorkspaceWriteConflictException) { return Result.Failure<T>(Error.Conflict("Workspace.WriteConflict", "The request conflicted with a concurrent change. Retry it.")); }
    }

    internal Task<Result<T>> WriteAsync<T>(Func<Task<T>> action, CancellationToken ct) =>
        ReadAsync(() => repository.WriteAsync(action, ct));

    private const int MaxLedgerWriteAttempts = 5;

    internal Task<Result<T>> WriteLedgerAsync<T>(ILedgerModule ledger, Func<Action<Guid>, Task<T>> action, CancellationToken ct) =>
        ReadAsync(async () =>
        {
            for (var attempt = 1; attempt <= MaxLedgerWriteAttempts; attempt++)
            {
                try
                {
                    return await ledger.ExecuteWorkspaceAtomicAsync(
                        (connection, transaction, token) => repository.WriteLedgerAsync(
                            () => action(static transactionId =>
                            {
                                if (transactionId == Guid.Empty)
                                    throw new InvalidOperationException("Ledger returned an empty transaction ID.");
                            }), connection, transaction, token), ct);
                }
                catch (Exception exception) when (attempt < MaxLedgerWriteAttempts && repository.IsSerializationConflict(exception))
                {
                    await Task.Delay(TimeSpan.FromMilliseconds(10 * attempt), ct);
                }
            }

            throw new WorkspaceWriteConflictException();
        });

    internal static Guid RequireLedgerTransaction(WorkspaceLedgerTransactionResultDto result, Action<Guid> posted)
    {
        if (result.ErrorCode is not null)
            throw new WorkspaceFailure(Error.Validation(result.ErrorCode, "The personal ledger movement could not be registered."));
        if (!result.TransactionId.HasValue)
            throw new InvalidOperationException("Ledger returned no transaction ID.");
        posted(result.TransactionId.Value);
        return result.TransactionId.Value;
    }

    internal static void RequirePayer(bool isPayer)
    {
        if (!isPayer)
            throw new WorkspaceFailure(Error.Validation("Workspace.OnlyPayerCanDebitAccount", "Only the payer may debit their personal account."));
    }

    internal async Task<Result> WriteAsync(Func<Task> action, CancellationToken ct)
    {
        return await WriteAsync(async () => { await action(); return true; }, ct);
    }
}

internal sealed class WorkspaceFailure(Error error) : Exception(error.Description)
{
    internal Error Error { get; } = error;
}
