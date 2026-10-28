using Api.Common;
using BuildingBlocks.Security;
using Identity.Contracts;
using Microsoft.AspNetCore.Mvc;

namespace Api.Endpoints;

public static class AuthEndpoints
{
    public static IEndpointRouteBuilder MapAuthEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/v1/auth")
            .WithTags("Identity & Authentication (Google OAuth Only)");

        // 1. Google OAuth (The sole authentication provider allowed)
        group.MapPost("/google", async (
            [FromBody] GoogleLoginRequest request,
            [FromServices] IIdentityModule identityModule,
            CancellationToken ct) =>
        {
            var result = await identityModule.LoginWithGoogleAsync(request, ct);
            return result.ToHttpResult();
        })
        .WithName("LoginWithGoogle")
        .WithSummary("Inicia sesión o registra usuario mediante Google OAuth (proveedor único)");

        // 2. Token Refresh (Rotation)
        group.MapPost("/refresh", async (
            [FromBody] RefreshTokenRequest request,
            [FromServices] IIdentityModule identityModule,
            CancellationToken ct) =>
        {
            var result = await identityModule.RefreshTokenAsync(request.RefreshToken, ct);
            return result.ToHttpResult();
        })
        .WithName("RefreshToken")
        .WithSummary("Rota el Refresh Token y emite un nuevo Access Token JWT");

        // 3. Logout / Revoke Token
        group.MapPost("/logout", async (
            [FromBody] RefreshTokenRequest request,
            [FromServices] IIdentityModule identityModule,
            CancellationToken ct) =>
        {
            var result = await identityModule.LogoutAsync(request.RefreshToken, ct);
            return result.ToHttpResult();
        })
        .WithName("Logout")
        .WithSummary("Cierra sesión y revoca el Refresh Token");

        // 4. Current User Profile (Strictly Authenticated)
        group.MapGet("/me", async (
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
        .WithName("GetCurrentUser")
        .WithSummary("Obtiene el perfil del usuario autenticado");

        // 5. Request Account Deletion (Grace period 30 days - AUTH-06)
        group.MapDelete("/account", async (
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
        .WithName("RequestAccountDeletion")
        .WithSummary("Solicita la baja de la cuenta con período de gracia de 30 días (Regla AUTH-06)");

        // 6. Export User Data (AUTH-07)
        group.MapGet("/export", async (
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
        .WithName("ExportUserData")
        .WithSummary("Exporta los datos completos del usuario (Regla AUTH-07)");

        return app;
    }
}
