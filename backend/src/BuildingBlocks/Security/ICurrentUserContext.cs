namespace BuildingBlocks.Security;

public interface ICurrentUserContext
{
    Guid? UserId { get; }
    bool IsAuthenticated => UserId.HasValue && UserId.Value != Guid.Empty;
}
