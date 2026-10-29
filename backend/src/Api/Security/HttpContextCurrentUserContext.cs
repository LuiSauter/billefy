using System.Security.Claims;
using BuildingBlocks.Security;

namespace Api.Security;

public sealed class HttpContextCurrentUserContext : ICurrentUserContext
{
    private readonly IHttpContextAccessor _httpContextAccessor;

    public HttpContextCurrentUserContext(IHttpContextAccessor httpContextAccessor)
    {
        _httpContextAccessor = httpContextAccessor;
    }

    public Guid? UserId
    {
        get
        {
            var httpContext = _httpContextAccessor.HttpContext;
            if (httpContext is null)
            {
                return null;
            }

            // Extract UserId strictly from authenticated ClaimsPrincipal (JWT 'sub' / NameIdentifier, or DevOrTestHeader middleware in Development/Testing)
            if (httpContext.User.Identity?.IsAuthenticated != true)
            {
                return null;
            }

            var claimValue = httpContext.User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                             ?? httpContext.User.FindFirst("sub")?.Value
                             ?? httpContext.User.FindFirst("nameid")?.Value
                             ?? httpContext.User.FindFirst(c => c.Type.EndsWith("nameidentifier", StringComparison.OrdinalIgnoreCase))?.Value;

            if (Guid.TryParse(claimValue, out var claimGuid) && claimGuid != Guid.Empty)
            {
                return claimGuid;
            }

            return null;
        }
    }
}
