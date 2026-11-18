using Microsoft.Extensions.Configuration;
using Workspaces.Application.Abstractions;

namespace Workspaces.Infrastructure;

internal sealed class AppLinkProvider(IConfiguration configuration) : IAppLinkProvider
{
    private static readonly Uri DefaultAppRootUrl = new("http://localhost:3000");

    public Uri GetAppRootUrl()
    {
        var configured = Environment.GetEnvironmentVariable("WEB_APP_BASE_URL") ?? configuration["WebApp:BaseUrl"];
        return !string.IsNullOrWhiteSpace(configured) && Uri.TryCreate(configured, UriKind.Absolute, out var uri)
            ? uri : DefaultAppRootUrl;
    }
}
