using Api.Common;
using BuildingBlocks.Security;
using Identity.Contracts;
using Ingestion.Contracts;
using Ledger.Contracts;
using Lending.Contracts;
using Planning.Contracts;
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

        // 3. Update the user's base/reporting currency preference.
        var currencyRoute = group.MapPut("/preferred-currency", async (
            [FromBody] UpdatePreferredCurrencyRequest request,
            [FromServices] ICurrentUserContext currentUser,
            [FromServices] IIdentityModule identityModule,
            CancellationToken ct) =>
        {
            if (!currentUser.IsAuthenticated)
            {
                return Results.Unauthorized();
            }

            var result = await identityModule.UpdatePreferredCurrencyAsync(
                currentUser.UserId!.Value, request.PreferredCurrency, ct);
            return result.ToHttpResult();
        })
        .WithSummary("Actualiza la moneda base y de visualización del usuario")
        .RequireAuthorization();

        if (includeNames) currencyRoute.WithName("UpdatePreferredCurrency");

        // 4. Update number display preferences.
        var numberFormatRoute = group.MapPut("/number-format", async (
            [FromBody] UpdateNumberFormatRequest request,
            [FromServices] ICurrentUserContext currentUser,
            [FromServices] IIdentityModule identityModule,
            CancellationToken ct) =>
        {
            if (!currentUser.IsAuthenticated)
            {
                return Results.Unauthorized();
            }

            var result = await identityModule.UpdateNumberFormatPreferencesAsync(
                currentUser.UserId!.Value, request.NumberGroupingConvention, request.MaximumDecimalPlaces, ct);
            return result.ToHttpResult();
        })
        .WithSummary("Actualiza la convención de agrupación y los decimales máximos del usuario")
        .RequireAuthorization();

        if (includeNames) numberFormatRoute.WithName("UpdateNumberFormatPreferences");

        // 5. Logout / Revoke Token
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
            [FromServices] ILedgerFinancialDataExport ledgerExport,
            [FromServices] IIngestionFinancialDataExport ingestionExport,
            [FromServices] ILendingFinancialDataExport lendingExport,
            [FromServices] IPlanningFinancialDataExport planningExport,
            CancellationToken ct) =>
        {
            if (!currentUser.IsAuthenticated)
            {
                return Results.Unauthorized();
            }

            var userId = currentUser.UserId!.Value;
            var result = await identityModule.ExportUserDataAsync(userId, ct);
            if (result.IsFailure)
            {
                return result.ToHttpResult();
            }

            var financialData = new
            {
                ledger = await ledgerExport.ExportForUserAsync(userId, ct),
                ingestion = await ingestionExport.ExportForUserAsync(userId, ct),
                lending = await lendingExport.ExportForUserAsync(userId, ct),
                planning = await planningExport.ExportForUserAsync(userId, ct)
            };

            return Results.Ok(new
            {
                result.Value.User,
                result.Value.ExportedAt,
                result.Value.SystemVersion,
                FinancialData = financialData
            });
        })
        .WithSummary("Exporta los datos completos del usuario (Regla AUTH-07)")
        .RequireAuthorization();

        if (includeNames) exportRoute.WithName("ExportUserData");

        var resetFinancialDataRoute = group.MapDelete("/financial-data", async (
            [FromServices] ICurrentUserContext currentUser,
            [FromServices] ILedgerFinancialDataReset ledgerReset,
            [FromServices] IIngestionFinancialDataReset ingestionReset,
            [FromServices] ILendingFinancialDataReset lendingReset,
            [FromServices] IPlanningFinancialDataReset planningReset,
            [FromServices] Api.Infrastructure.Transactions.RelationalFinancialDataReset transaction,
            CancellationToken ct) =>
        {
            if (!currentUser.IsAuthenticated || currentUser.UserId is null)
            {
                return Results.Unauthorized();
            }

            var userId = currentUser.UserId.Value;
            await transaction.ExecuteAsync(async transactionToken =>
            {
                // Planning links restrict investment deletion, so Planning is reset before Ledger.
                await planningReset.ResetForUserAsync(userId, transactionToken);
                await lendingReset.ResetForUserAsync(userId, transactionToken);
                await ingestionReset.ResetForUserAsync(userId, transactionToken);
                await ledgerReset.ResetForUserAsync(userId, transactionToken);
            }, ct);

            return Results.NoContent();
        })
        .WithSummary("Borra todos los datos financieros del usuario y conserva su cuenta, perfil y preferencias.")
        .Produces(StatusCodes.Status204NoContent)
        .ProducesProblem(StatusCodes.Status401Unauthorized)
        .RequireAuthorization();

        if (includeNames) resetFinancialDataRoute.WithName("ResetFinancialData");
    }
}
