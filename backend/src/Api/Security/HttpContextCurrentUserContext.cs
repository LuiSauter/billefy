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

            // 1. Check Claims (e.g. JWT 'sub' / NameIdentifier)
            var claimValue = httpContext.User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                             ?? httpContext.User.FindFirst("sub")?.Value
                             ?? httpContext.User.FindFirst("nameid")?.Value
                             ?? httpContext.User.FindFirst(c => c.Type.EndsWith("nameidentifier", StringComparison.OrdinalIgnoreCase))?.Value;

            if (Guid.TryParse(claimValue, out var claimGuid))
            {
                return claimGuid;
            }

            // 2. Check X-User-Id header (for development, tests, and API clients in Phase 1)
            if (httpContext.Request.Headers.TryGetValue("X-User-Id", out var headerValue) &&
                Guid.TryParse(headerValue.ToString(), out var headerGuid))
            {
                return headerGuid;
            }

            return null;
        }
    }
}
