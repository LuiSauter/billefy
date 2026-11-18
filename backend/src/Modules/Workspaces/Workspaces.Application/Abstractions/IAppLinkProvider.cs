namespace Workspaces.Application.Abstractions;

/// <summary>Resolves absolute links to the web app for outbound emails. No token is embedded: recipients land on the app, sign in or sign up, and see their pending invitations there.</summary>
public interface IAppLinkProvider
{
    Uri GetAppRootUrl();
}
