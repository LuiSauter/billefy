using Api.Common;
using BuildingBlocks.Security;
using Identity.Contracts;
using Microsoft.AspNetCore.Mvc;

namespace Api.Endpoints;

public static class AuthEndpoints
{
    public static IEndpointRouteBuilder MapAuthEndpoints(this IEndpointRouteBuilder app)
    {
        MapAuthGroup(app.MapGroup("/api/v1/auth").WithTags("Identity & Authentication (Google OAuth Only)"), includeNames: true);
        MapAuthGroup(app.MapGroup("/v1/auth").WithTags("Identity & Authentication (Google OAuth Only)"), includeNames: false);

        return app;
    }

    private static void MapAuthGroup(RouteGroupBuilder group, bool includeNames)
    {
        // 1. Google OAuth (The sole authentication provider allowed)
        var googleRoute = group.MapPost("/google", async (
            [FromBody] GoogleLoginRequest request,
            [FromServices] IIdentityModule identityModule,
            CancellationToken ct) =>
        {
            var result = await identityModule.LoginWithGoogleAsync(request, ct);
            return result.ToHttpResult();
        })
        .WithSummary("Inicia sesión o registra usuario mediante Google OAuth (proveedor único)")
        .AllowAnonymous();

        if (includeNames) googleRoute.WithName("LoginWithGoogle");

        // 2. Token Refresh (Rotation)
        var refreshRoute = group.MapPost("/refresh", async (
            [FromBody] RefreshTokenRequest request,
            [FromServices] IIdentityModule identityModule,
            CancellationToken ct) =>
        {
            var result = await identityModule.RefreshTokenAsync(request.RefreshToken, ct);
            return result.ToHttpResult();
        })
        .WithSummary("Rota el Refresh Token y emite un nuevo Access Token JWT")
        .AllowAnonymous();

        if (includeNames) refreshRoute.WithName("RefreshToken");

        // 3. Logout / Revoke Token
        var logoutRoute = group.MapPost("/logout", async (
            [FromBody] RefreshTokenRequest request,
            [FromServices] ICurrentUserContext currentUser,
            [FromServices] IIdentityModule identityModule,
            CancellationToken ct) =>
        {
            var result = await identityModule.LogoutAsync(request.RefreshToken, currentUser.UserId, ct);
            return result.ToHttpResult();
        })
        .WithSummary("Cierra sesión y revoca el Refresh Token")
        .RequireAuthorization();

        if (includeNames) logoutRoute.WithName("Logout");

        // 4. Current User Profile (Strictly Authenticated)
        var meRoute = group.MapGet("/me", async (
            [FromServices] ICurrentUserContext currentUser,
            [FromServices] IIdentityModule identityModule,
            CancellationToken ct) =>
        {
            if (!currentUser.IsAuthenticated)
            {
                return Results.Unauthorized();
            }

            var result = await identityModule.GetCurrentUserAsync(currentUser.UserId!.Value, ct);
            return result.ToHttpResult();
        })
        .WithSummary("Obtiene el perfil del usuario autenticado")
        .RequireAuthorization();

        if (includeNames) meRoute.WithName("GetCurrentUser");

        // 5. Request Account Deletion (Grace period 30 days - AUTH-06)
        var deleteRoute = group.MapDelete("/account", async (
            [FromServices] ICurrentUserContext currentUser,
            [FromServices] IIdentityModule identityModule,
            CancellationToken ct) =>
        {
            if (!currentUser.IsAuthenticated)
            {
                return Results.Unauthorized();
            }

            var result = await identityModule.RequestAccountDeletionAsync(currentUser.UserId!.Value, ct);
            return result.ToHttpResult();
        })
        .WithSummary("Solicita la baja de la cuenta con período de gracia de 30 días (Regla AUTH-06)")
        .RequireAuthorization();

        if (includeNames) deleteRoute.WithName("RequestAccountDeletion");

        // 6. Export User Data (AUTH-07)
        var exportRoute = group.MapGet("/export", async (
            [FromServices] ICurrentUserContext currentUser,
            [FromServices] IIdentityModule identityModule,
            CancellationToken ct) =>
        {
            if (!currentUser.IsAuthenticated)
            {
                return Results.Unauthorized();
            }

            var result = await identityModule.ExportUserDataAsync(currentUser.UserId!.Value, ct);
            return result.ToHttpResult();
        })
        .WithSummary("Exporta los datos completos del usuario (Regla AUTH-07)")
        .RequireAuthorization();

        if (includeNames) exportRoute.WithName("ExportUserData");
    }
}
