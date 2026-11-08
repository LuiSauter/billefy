namespace Workspaces.Domain.Workspaces;

public sealed record WorkspaceSettings(
    bool HidePersonalPatrimony = true,
    bool MemberSeesOnlyShared = true,
    bool ShowIndividualContributions = true,
    bool AllowMovementComments = true,
    bool PaymentReminders = true,
    bool WeeklySummary = true,
    bool SpaceNotifications = true);
