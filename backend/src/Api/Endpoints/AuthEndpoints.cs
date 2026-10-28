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
            .WithTags("Identity & Authentication");

        // 1. Email Sign-In / Sign-Up
        group.MapPost("/email", async (
            [FromBody] EmailLoginRequest request,
            [FromServices] IIdentityModule identityModule,
            CancellationToken ct) =>
        {
            var result = await identityModule.LoginWithEmailAsync(request, ct);
            return result.ToHttpResult();
        })
        .WithName("LoginWithEmail")
        .WithSummary("Inicia sesión o registra usuario mediante correo electrónico");

        // 2. Google OAuth
        group.MapPost("/google", async (
            [FromBody] GoogleLoginRequest request,
            [FromServices] IIdentityModule identityModule,
            CancellationToken ct) =>
        {
            var result = await identityModule.LoginWithGoogleAsync(request, ct);
            return result.ToHttpResult();
        })
        .WithName("LoginWithGoogle")
        .WithSummary("Inicia sesión con Google Workspace o Google Account");

        // 3. Apple Sign In
        group.MapPost("/apple", async (
            [FromBody] AppleLoginRequest request,
            [FromServices] IIdentityModule identityModule,
            CancellationToken ct) =>
        {
            var result = await identityModule.LoginWithAppleAsync(request, ct);
            return result.ToHttpResult();
        })
        .WithName("LoginWithApple")
        .WithSummary("Inicia sesión con Sign in with Apple");

        // 4. Token Refresh (Rotation)
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

        // 5. Logout / Revoke Token
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

        // 6. Current User Profile
        group.MapGet("/me", async (
            [FromServices] ICurrentUserContext currentUser,
            [FromServices] IIdentityModule identityModule,
            CancellationToken ct) =>
        {
            var userId = currentUser.UserId ?? Guid.Parse("11111111-1111-1111-1111-111111111111");
            var result = await identityModule.GetCurrentUserAsync(userId, ct);
            return result.ToHttpResult();
        })
        .WithName("GetCurrentUser")
        .WithSummary("Obtiene el perfil del usuario autenticado");

        // 7. Request Account Deletion (Grace period 30 days - AUTH-06)
        group.MapDelete("/account", async (
            [FromServices] ICurrentUserContext currentUser,
            [FromServices] IIdentityModule identityModule,
            CancellationToken ct) =>
        {
            var userId = currentUser.UserId ?? Guid.Parse("11111111-1111-1111-1111-111111111111");
            var result = await identityModule.RequestAccountDeletionAsync(userId, ct);
            return result.ToHttpResult();
        })
        .WithName("RequestAccountDeletion")
        .WithSummary("Solicita la baja de la cuenta con período de gracia de 30 días (Regla AUTH-06)");

        // 8. Export User Data (AUTH-07)
        group.MapGet("/export", async (
            [FromServices] ICurrentUserContext currentUser,
            [FromServices] IIdentityModule identityModule,
            CancellationToken ct) =>
        {
            var userId = currentUser.UserId ?? Guid.Parse("11111111-1111-1111-1111-111111111111");
            var result = await identityModule.ExportUserDataAsync(userId, ct);
            return result.ToHttpResult();
        })
        .WithName("ExportUserData")
        .WithSummary("Exporta los datos completos del usuario (Regla AUTH-07)");

        return app;
    }
}
