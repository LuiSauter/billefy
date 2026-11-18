using BuildingBlocks.Common;
using Identity.Contracts;
using Ledger.Contracts;
using Notifications.Contracts;
using Workspaces.Application.Abstractions;
using Workspaces.Contracts;
using Workspaces.Domain.Workspaces;
using BuildingBlocks.Currencies;
using System.Security.Cryptography;
using static Workspaces.Application.Services.WorkspaceAccess;

namespace Workspaces.Application.Services;

public interface IWorkspaceService
{
    Task<Result<IReadOnlyList<WorkspaceAccountDto>>> GetMyAccountsAsync(Guid id, CancellationToken ct = default);
    Task<Result<CreateWorkspaceResponse>> CreateAsync(CreateWorkspaceRequest request, CancellationToken ct = default);
    Task<Result<IReadOnlyList<WorkspaceSummaryDto>>> ListAsync(CancellationToken ct = default);
    Task<Result<WorkspaceDetailsDto>> GetAsync(Guid id, CancellationToken ct = default);
    Task<Result> UpdateAsync(Guid id, UpdateWorkspaceRequest request, CancellationToken ct = default);
    Task<Result> UpdateSettingsAsync(Guid id, UpdateWorkspaceSettingsRequest request, CancellationToken ct = default);
    Task<Result> DeactivateAsync(Guid id, CancellationToken ct = default);
    Task<Result<WorkspaceInvitationDto>> InviteAsync(Guid id, InviteMemberRequest request, CancellationToken ct = default);
    Task<Result<IReadOnlyList<WorkspaceInvitationDto>>> PendingInvitationsAsync(CancellationToken ct = default);
    Task<Result<MemberDto>> AcceptAsync(Guid invitationId, CancellationToken ct = default);
    Task<Result> RejectAsync(Guid invitationId, CancellationToken ct = default);
    Task<Result> UpdateRoleAsync(Guid id, Guid memberId, UpdateMemberRoleRequest request, CancellationToken ct = default);
    Task<Result> RemoveMemberAsync(Guid id, Guid memberId, CancellationToken ct = default);
    Task<Result<SplitConfigurationDto>> GetSplitConfigurationAsync(Guid id, CancellationToken ct = default);
    Task<Result<SplitConfigurationDto>> UpdateSplitConfigurationAsync(Guid id, UpdateSplitConfigurationRequest request, CancellationToken ct = default);
}

public sealed class WorkspaceService(IWorkspaceRepository repository, WorkspaceAccess access, IIdentityModule identity,
    ILedgerModule ledger, INotificationsModule notifications, IAppLinkProvider appLinks) : IWorkspaceService
{
    public Task<Result<IReadOnlyList<WorkspaceAccountDto>>> GetMyAccountsAsync(Guid id, CancellationToken ct = default) =>
        ReadAsync<IReadOnlyList<WorkspaceAccountDto>>(async () =>
        {
            await access.RequireAsync(id, ct);
            return (await ledger.GetAccountsByUserIdAsync(access.UserId, ct))
                .Select(a => new WorkspaceAccountDto(a.Id, a.Name, a.Currency, a.Type)).ToArray();
        });

    public Task<Result<CreateWorkspaceResponse>> CreateAsync(CreateWorkspaceRequest request, CancellationToken ct = default) =>
        access.WriteAsync(async () =>
        {
            var userId = access.UserId;
            ValidateInfo(request.Name, request.Icon, request.Color);
            var currency = Currency.FromCode(request.BaseCurrency);
            Validate(currency.Code.Length <= 10, "Currency code is too long.");
            var workspace = new Workspace(Guid.NewGuid(), request.Name, request.WorkspaceType, currency,
                userId, access.Now, request.Description, request.Icon, request.Color,
                defaultSplitRule: request.DefaultSplitRule, startDate: request.StartDate);
            repository.Add(workspace);
            repository.Add(new WorkspaceMember(Guid.NewGuid(), workspace.Id, userId, WorkspaceRole.Owner, 100m, access.Now));
            await Task.CompletedTask;
            return new CreateWorkspaceResponse(workspace.Id);
        }, ct);

    public Task<Result<IReadOnlyList<WorkspaceSummaryDto>>> ListAsync(CancellationToken ct = default) =>
        ReadAsync<IReadOnlyList<WorkspaceSummaryDto>>(async () =>
        {
            var userId = access.UserId;
            var memberships = await repository.ListAsync<WorkspaceMember>(x => x.UserId == userId && x.IsActive, ct);
            var ids = memberships.Select(x => x.WorkspaceId).ToArray();
            var workspaces = await repository.ListAsync<Workspace>(x => ids.Contains(x.Id) && x.IsActive, ct);
            return workspaces.OrderBy(x => x.Name).Select(w => new WorkspaceSummaryDto(w.Id, w.Name,
                w.WorkspaceType, w.BaseCurrency.Code, w.Icon, w.Color, memberships.Single(m => m.WorkspaceId == w.Id).WorkspaceRole)).ToArray();
        });

    public Task<Result<WorkspaceDetailsDto>> GetAsync(Guid id, CancellationToken ct = default) => ReadAsync(async () =>
    {
        var (w, _) = await access.RequireAsync(id, ct);
        var members = await repository.ListAsync<WorkspaceMember>(x => x.WorkspaceId == id && x.IsActive, ct);
        var s = w.Settings;
        return new WorkspaceDetailsDto(w.Id, w.Name, w.Description, w.WorkspaceType, w.BaseCurrency.Code,
            w.Icon, w.Color, w.IsActive, w.CreatedBy, w.CreatedAt,
            new WorkspaceSettingsDto(s.HidePersonalPatrimony, s.MemberSeesOnlyShared, s.ShowIndividualContributions,
                s.AllowMovementComments, s.PaymentReminders, s.WeeklySummary, s.SpaceNotifications),
            members.OrderBy(x => x.JoinedAt).Select(MapMember).ToArray(), w.StartDate ?? DateOnly.FromDateTime(w.CreatedAt),
            w.DefaultSplitRule, EffectiveRule(w.DefaultSplitRule, members), IsReady(w.DefaultSplitRule, members));
    });

    public Task<Result> UpdateAsync(Guid id, UpdateWorkspaceRequest request, CancellationToken ct = default) =>
        access.WriteAsync(async () =>
        {
            var (w, _) = await access.RequireAsync(id, ct, manage: true);
            ValidateInfo(request.Name, request.Icon, request.Color);
            repository.UpdateWorkspace(w, new Workspace(w.Id, request.Name, w.WorkspaceType, w.BaseCurrency,
                w.CreatedBy, w.CreatedAt, request.Description, request.Icon, request.Color, w.Settings, w.DefaultSplitRule, w.StartDate));
        }, ct);

    public Task<Result> UpdateSettingsAsync(Guid id, UpdateWorkspaceSettingsRequest request, CancellationToken ct = default) =>
        access.WriteAsync(async () =>
        {
            var (w, _) = await access.RequireAsync(id, ct, manage: true);
            var settings = new WorkspaceSettings(request.HidePersonalPatrimony, request.MemberSeesOnlyShared,
                request.ShowIndividualContributions, request.AllowMovementComments, request.PaymentReminders,
                request.WeeklySummary, request.SpaceNotifications);
            repository.UpdateWorkspace(w, new Workspace(w.Id, w.Name, w.WorkspaceType, w.BaseCurrency,
                w.CreatedBy, w.CreatedAt, w.Description, w.Icon, w.Color, settings, w.DefaultSplitRule, w.StartDate));
        }, ct);

    public Task<Result> DeactivateAsync(Guid id, CancellationToken ct = default) => access.WriteAsync(async () =>
    {
        var (workspace, member) = await access.RequireAsync(id, ct, manage: true);
        RequireOwner(member);
        workspace.Deactivate();
    }, ct);

    public async Task<Result<WorkspaceInvitationDto>> InviteAsync(Guid id, InviteMemberRequest request, CancellationToken ct = default)
    {
        var email = request.Email?.Trim().ToLowerInvariant();
        var result = await access.WriteAsync(async () =>
        {
            var (workspace, _) = await access.RequireAsync(id, ct, manage: true);
            var invitation = new WorkspaceInvitation(Guid.NewGuid(), id, email!,
                Convert.ToHexString(RandomNumberGenerator.GetBytes(32)), request.WorkspaceRole, access.Now.AddDays(7),
                request.PlannedIncomeSharePercentage, request.PlannedCustomSharePercentage, request.PlannedResponsibilityWeight);
            var now = access.Now;
            var duplicates = await repository.ListAsync<WorkspaceInvitation>(x => x.WorkspaceId == id &&
                x.InvitedEmail == email && x.Status == InvitationStatus.Pending && x.ExpiresAt > now, ct);
            Validate(duplicates.Count == 0, "A pending invitation already exists.");
            repository.Add(invitation);
            return MapInvitation(invitation, workspace);
        }, ct);
        if (result.IsSuccess && email is not null)
            await SendInvitationEmailAsync(email, result.Value.WorkspaceName, ct);
        return result;
    }

    private async Task SendInvitationEmailAsync(string invitedEmail, string workspaceName, CancellationToken ct)
    {
        // Best-effort: the invitation already exists and is visible in the recipient's
        // pending-invitations panel once they sign in, regardless of email delivery.
        try
        {
            var appUrl = appLinks.GetAppRootUrl();
            await notifications.SendEmailNotificationAsync(new SendEmailRequest(invitedEmail,
                $"Te invitaron a \"{workspaceName}\" en Billefy",
                $"Te invitaron a unirte al espacio compartido \"{workspaceName}\" en Billefy. " +
                $"Inicia sesion o crea tu cuenta en {appUrl} y encontraras la invitacion pendiente para aceptarla."), ct);
        }
        catch
        {
            // Swallowed: delivery failure must not fail invitation creation or leak to the caller.
        }
    }

    public Task<Result<IReadOnlyList<WorkspaceInvitationDto>>> PendingInvitationsAsync(CancellationToken ct = default) =>
        ReadAsync<IReadOnlyList<WorkspaceInvitationDto>>(async () =>
        {
            var email = await CurrentEmail(ct);
            var now = access.Now;
            var invitations = await repository.ListAsync<WorkspaceInvitation>(x => x.InvitedEmail == email &&
                x.Status == InvitationStatus.Pending && x.ExpiresAt > now, ct);
            var ids = invitations.Select(x => x.WorkspaceId).ToArray();
            var workspaces = await repository.ListAsync<Workspace>(x => ids.Contains(x.Id) && x.IsActive, ct);
            return invitations.Where(i => workspaces.Any(w => w.Id == i.WorkspaceId))
                .OrderBy(x => x.ExpiresAt).Select(i => MapInvitation(i, workspaces.Single(w => w.Id == i.WorkspaceId))).ToArray();
        });

    public Task<Result<MemberDto>> AcceptAsync(Guid invitationId, CancellationToken ct = default) => access.WriteAsync(async () =>
    {
        var (invitation, _) = await RequireInvitation(invitationId, ct);
        var userId = access.UserId;
        var members = await repository.ListAsync<WorkspaceMember>(x => x.WorkspaceId == invitation.WorkspaceId && x.UserId == userId, ct);
        Validate(members.Count == 0, "This user already has a membership in this workspace.");
        invitation.Accept(access.Now);
        var member = new WorkspaceMember(Guid.NewGuid(), invitation.WorkspaceId, userId, invitation.WorkspaceRole,
            invitation.PlannedIncomeSharePercentage, access.Now, invitation.PlannedCustomSharePercentage,
            invitation.PlannedResponsibilityWeight);
        repository.Add(member);
        return MapMember(member);
    }, ct);

    public Task<Result> RejectAsync(Guid invitationId, CancellationToken ct = default) => access.WriteAsync(async () =>
    {
        var (invitation, _) = await RequireInvitation(invitationId, ct);
        invitation.Reject();
    }, ct);

    public Task<Result> UpdateRoleAsync(Guid id, Guid memberId, UpdateMemberRoleRequest request, CancellationToken ct = default) =>
        access.WriteAsync(async () =>
        {
            var (_, actor) = await access.RequireAsync(id, ct, manage: true);
            RequireOwner(actor);
            var member = await FindMember(id, memberId, ct);
            Validate(member.WorkspaceRole != WorkspaceRole.Owner && request.WorkspaceRole != WorkspaceRole.Owner,
                "Ownership cannot be changed through member role updates.");
            member.ChangeRole(request.WorkspaceRole);
        }, ct);

    public Task<Result> RemoveMemberAsync(Guid id, Guid memberId, CancellationToken ct = default) => access.WriteAsync(async () =>
    {
        var (_, actor) = await access.RequireAsync(id, ct, manage: true);
        var member = await FindMember(id, memberId, ct);
        Validate(member.WorkspaceRole != WorkspaceRole.Owner, "The owner cannot be removed.");
        if (member.WorkspaceRole == WorkspaceRole.Admin) RequireOwner(actor);
        member.Deactivate();
    }, ct);

    private async Task<WorkspaceMember> FindMember(Guid id, Guid memberId, CancellationToken ct) =>
        (await repository.ListAsync<WorkspaceMember>(x => x.WorkspaceId == id && x.Id == memberId && x.IsActive, ct)).SingleOrDefault() ?? throw Missing();

    private async Task<string> CurrentEmail(CancellationToken ct)
    {
        var profile = await identity.GetCurrentUserAsync(access.UserId, ct);
        if (profile.IsFailure) throw new WorkspaceFailure(profile.Error);
        return profile.Value.Email.Trim().ToLowerInvariant();
    }

    private async Task<(WorkspaceInvitation Invitation, Workspace Workspace)> RequireInvitation(Guid id, CancellationToken ct)
    {
        var email = await CurrentEmail(ct);
        var invitation = (await repository.ListAsync<WorkspaceInvitation>(x => x.Id == id && x.InvitedEmail == email, ct)).SingleOrDefault() ?? throw Missing();
        var workspace = (await repository.ListAsync<Workspace>(x => x.Id == invitation.WorkspaceId && x.IsActive, ct)).SingleOrDefault() ?? throw Missing();
        Validate(invitation.Status == InvitationStatus.Pending && access.Now < invitation.ExpiresAt, "Invitation is expired or no longer pending.");
        return (invitation, workspace);
    }

    private static void ValidateInfo(string name, string? icon, string? color) =>
        Validate(!string.IsNullOrWhiteSpace(name) && name.Trim().Length <= 150 && (icon?.Length ?? 0) <= 100 && (color?.Length ?? 0) <= 30,
            "Workspace name, icon or color is invalid.");
    private static void RequireOwner(WorkspaceMember member)
    {
        if (member.WorkspaceRole != WorkspaceRole.Owner)
            throw new WorkspaceFailure(Error.Forbidden("Workspace.OwnerRequired", "Only the owner can perform this operation."));
    }
    internal static MemberDto MapMember(WorkspaceMember member) => new(member.Id, member.UserId, member.WorkspaceRole,
        member.IncomeSharePercentage, member.JoinedAt, member.IsActive, member.DefaultCustomSharePercentage,
        member.DefaultResponsibilityWeight);
    private static WorkspaceInvitationDto MapInvitation(WorkspaceInvitation i, Workspace w) =>
        new(i.Id, w.Id, w.Name, i.WorkspaceRole, i.ExpiresAt, i.Status, i.PlannedIncomeSharePercentage,
            i.PlannedCustomSharePercentage, i.PlannedResponsibilityWeight);

    public Task<Result<SplitConfigurationDto>> GetSplitConfigurationAsync(Guid id, CancellationToken ct = default) => ReadAsync(async () =>
    {
        var (workspace, _) = await access.RequireAsync(id, ct, manage: true);
        var members = await repository.ListAsync<WorkspaceMember>(x => x.WorkspaceId == id && x.IsActive, ct);
        var invitations = await repository.ListAsync<WorkspaceInvitation>(x => x.WorkspaceId == id &&
            x.Status == InvitationStatus.Pending && x.ExpiresAt > access.Now, ct);
        return MapSplitConfiguration(workspace, members, invitations);
    });

    public Task<Result<SplitConfigurationDto>> UpdateSplitConfigurationAsync(Guid id, UpdateSplitConfigurationRequest request, CancellationToken ct = default) =>
        access.WriteAsync(async () =>
        {
            var (workspace, _) = await access.RequireAsync(id, ct, manage: true);
            Validate(request.ActiveMembers is not null && request.PendingInvitations is not null, "Complete member and invitation lists are required.");
            Validate(request.ActiveMembers.All(x => x is not null) && request.PendingInvitations.All(x => x is not null),
                "Member and invitation entries cannot be null.");
            Validate(Enum.IsDefined(request.DefaultSplitRule), "Unknown split rule.");
            var members = await repository.ListAsync<WorkspaceMember>(x => x.WorkspaceId == id && x.IsActive, ct);
            var invitations = await repository.ListAsync<WorkspaceInvitation>(x => x.WorkspaceId == id &&
                x.Status == InvitationStatus.Pending && x.ExpiresAt > access.Now, ct);
            Validate(request.ActiveMembers.Select(x => x.MemberId).Distinct().Count() == request.ActiveMembers.Count &&
                request.ActiveMembers.Count == members.Count && members.All(m => request.ActiveMembers.Any(x => x.MemberId == m.Id)),
                "Active member configuration must include every active member exactly once.");
            Validate(request.PendingInvitations.Select(x => x.InvitationId).Distinct().Count() == request.PendingInvitations.Count &&
                request.PendingInvitations.Count == invitations.Count && invitations.All(i => request.PendingInvitations.Any(x => x.InvitationId == i.Id)),
                "Pending invitation configuration must include every unexpired invitation exactly once.");
            foreach (var c in request.ActiveMembers) ValidateConfiguration(c.IncomeSharePercentage, c.CustomSharePercentage, c.ResponsibilityWeight);
            foreach (var c in request.PendingInvitations) ValidateConfiguration(c.IncomeSharePercentage, c.CustomSharePercentage, c.ResponsibilityWeight);
            var allShares = request.ActiveMembers.Select(x => x).Concat(request.PendingInvitations.Select(x =>
                new SplitMemberConfigurationRequest(x.InvitationId, x.IncomeSharePercentage, x.CustomSharePercentage, x.ResponsibilityWeight))).ToArray();
            if (request.DefaultSplitRule == SplitRuleType.IncomeProportional)
                Validate(allShares.Sum(x => x.IncomeSharePercentage) == 100m, "Income shares must sum to 100.");
            if (request.DefaultSplitRule == SplitRuleType.CustomPercentage)
                Validate(allShares.Sum(x => x.CustomSharePercentage) == 100m, "Custom shares must sum to 100.");
            if (request.DefaultSplitRule == SplitRuleType.ByResponsibility)
                Validate(allShares.Sum(x => x.ResponsibilityWeight) > 0m, "Responsibility weights must have a positive total.");
            workspace.SetDefaultSplitRule(request.DefaultSplitRule);
            foreach (var member in members)
            {
                var c = request.ActiveMembers.Single(x => x.MemberId == member.Id);
                member.SetSplitConfiguration(c.IncomeSharePercentage, c.CustomSharePercentage, c.ResponsibilityWeight);
            }
            foreach (var invitation in invitations)
            {
                var c = request.PendingInvitations.Single(x => x.InvitationId == invitation.Id);
                invitation.SetPlannedSplitConfiguration(c.IncomeSharePercentage, c.CustomSharePercentage, c.ResponsibilityWeight);
            }
            return MapSplitConfiguration(workspace, members, invitations);
        }, ct);

    private static void ValidateConfiguration(decimal income, decimal custom, decimal weight)
    {
        Validate(income is >= 0m and <= 100m && income == decimal.Round(income, 6), "Income share is invalid.");
        Validate(custom is >= 0m and <= 100m && custom == decimal.Round(custom, 6), "Custom share is invalid.");
        Validate(weight >= 0m && weight <= 99999999999999.999999m && weight == decimal.Round(weight, 6), "Responsibility weight is invalid.");
    }

    private static bool IsReady(SplitRuleType rule, IReadOnlyList<WorkspaceMember> members) => rule switch
    {
        SplitRuleType.EqualParts => members.Count > 0,
        SplitRuleType.IncomeProportional => members.Count > 0 && members.Sum(x => x.IncomeSharePercentage) == 100m,
        SplitRuleType.CustomPercentage => members.Count > 0 && members.Sum(x => x.DefaultCustomSharePercentage) == 100m,
        SplitRuleType.ByResponsibility => members.Count > 0 && members.Sum(x => x.DefaultResponsibilityWeight) > 0m,
        _ => false
    };
    private static SplitRuleType EffectiveRule(SplitRuleType rule, IReadOnlyList<WorkspaceMember> members) =>
        IsReady(rule, members) ? rule : SplitRuleType.EqualParts;
    private static SplitConfigurationDto MapSplitConfiguration(Workspace w, IReadOnlyList<WorkspaceMember> members,
        IReadOnlyList<WorkspaceInvitation> invitations) => new(w.DefaultSplitRule, EffectiveRule(w.DefaultSplitRule, members),
        IsReady(w.DefaultSplitRule, members), members.Select(x => new SplitConfigurationMemberDto(x.Id,
            x.IncomeSharePercentage, x.DefaultCustomSharePercentage, x.DefaultResponsibilityWeight)).ToArray(),
        invitations.Select(x => new SplitConfigurationInvitationDto(x.Id, x.InvitedEmail, x.PlannedIncomeSharePercentage,
            x.PlannedCustomSharePercentage, x.PlannedResponsibilityWeight)).ToArray());
}
