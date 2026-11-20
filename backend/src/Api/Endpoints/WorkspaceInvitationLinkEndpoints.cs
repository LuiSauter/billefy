using System.Text.Json;
using Api.Common;
using Microsoft.Extensions.Options;
using Workspaces.Application.Services;
using Workspaces.Contracts;

namespace Api.Endpoints;

public static class WorkspaceInvitationLinkEndpoints
{
    private const string RatePolicy = "WorkspaceInvitationLinks";

    public static IEndpointRouteBuilder MapWorkspaceInvitationLinkEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/v1/workspaces").WithTags("Workspace invitation links")
            .RequireAuthorization().RequireRateLimiting(RatePolicy);

        group.MapPost("/{workspaceId:guid}/invitation-links", async (Guid workspaceId,
            IWorkspaceInvitationLinkService service, CancellationToken ct) =>
        {
            var result = await service.IssueAsync(workspaceId, ct);
            return result.ToHttpResult(value => Results.Created((string?)null, value));
        })
            .WithName("IssueWorkspaceInvitationLink")
            .Produces<IssueWorkspaceInvitationLinkResponse>(StatusCodes.Status201Created)
            .ProducesProblem(StatusCodes.Status401Unauthorized)
            .ProducesProblem(StatusCodes.Status403Forbidden)
            .ProducesProblem(StatusCodes.Status404NotFound)
            .ProducesProblem(StatusCodes.Status429TooManyRequests);

        group.MapPost("/invitation-links/accept", async (HttpRequest request,
            IOptions<Microsoft.AspNetCore.Http.Json.JsonOptions> jsonOptions,
            IWorkspaceInvitationLinkService service, CancellationToken ct) =>
        {
            if (!request.HasJsonContentType())
                return Results.Problem(statusCode: StatusCodes.Status415UnsupportedMediaType, title: "Unsupported media type.");

            AcceptWorkspaceInvitationLinkRequest? input;
            try
            {
                input = await request.ReadFromJsonAsync<AcceptWorkspaceInvitationLinkRequest>(jsonOptions.Value.SerializerOptions, ct);
            }
            catch (JsonException)
            {
                return Results.Problem(statusCode: StatusCodes.Status400BadRequest, title: "Invalid request body.");
            }
            catch (BadHttpRequestException exception)
            {
                return Results.Problem(statusCode: exception.StatusCode, title: "Invalid request body.");
            }

            if (input is null)
                return Results.Problem(statusCode: StatusCodes.Status400BadRequest, title: "Invalid request body.");
            var result = await service.AcceptAsync(input.Token, ct);
            return result.ToHttpResult(value => Results.Ok(value));
        })
            .WithName("AcceptWorkspaceInvitationLink")
            .Accepts<AcceptWorkspaceInvitationLinkRequest>("application/json")
            .Produces<AcceptWorkspaceInvitationLinkResponse>(StatusCodes.Status200OK)
            .ProducesProblem(StatusCodes.Status400BadRequest)
            .ProducesProblem(StatusCodes.Status401Unauthorized)
            .ProducesProblem(StatusCodes.Status404NotFound)
            .ProducesProblem(StatusCodes.Status409Conflict)
            .ProducesProblem(StatusCodes.Status413PayloadTooLarge)
            .ProducesProblem(StatusCodes.Status415UnsupportedMediaType)
            .ProducesProblem(StatusCodes.Status429TooManyRequests);

        group.MapDelete("/{workspaceId:guid}/invitation-links/{linkId:guid}", async (Guid workspaceId, Guid linkId,
            IWorkspaceInvitationLinkService service, CancellationToken ct) =>
        {
            var result = await service.RevokeAsync(workspaceId, linkId, ct);
            return result.ToHttpResult(() => Results.NoContent());
        })
            .WithName("RevokeWorkspaceInvitationLink")
            .Produces(StatusCodes.Status204NoContent)
            .ProducesProblem(StatusCodes.Status401Unauthorized)
            .ProducesProblem(StatusCodes.Status403Forbidden)
            .ProducesProblem(StatusCodes.Status404NotFound)
            .ProducesProblem(StatusCodes.Status409Conflict)
            .ProducesProblem(StatusCodes.Status429TooManyRequests);

        group.MapPost("/invitation-links/preview", async (HttpRequest request,
            IOptions<Microsoft.AspNetCore.Http.Json.JsonOptions> jsonOptions,
            IWorkspaceInvitationLinkService service, CancellationToken ct) =>
        {
            if (!request.HasJsonContentType())
                return Results.Problem(statusCode: StatusCodes.Status415UnsupportedMediaType, title: "Unsupported media type.");

            PreviewWorkspaceInvitationLinkRequest? input;
            try
            {
                input = await request.ReadFromJsonAsync<PreviewWorkspaceInvitationLinkRequest>(jsonOptions.Value.SerializerOptions, ct);
            }
            catch (JsonException)
            {
                return Results.Problem(statusCode: StatusCodes.Status400BadRequest, title: "Invalid request body.");
            }
            catch (BadHttpRequestException exception)
            {
                return Results.Problem(statusCode: exception.StatusCode, title: "Invalid request body.");
            }

            if (input is null)
                return Results.Problem(statusCode: StatusCodes.Status400BadRequest, title: "Invalid request body.");
            return (await service.PreviewAsync(input.Token, ct)).ToHttpResult();
        })
            .WithName("PreviewWorkspaceInvitationLink")
            .Accepts<PreviewWorkspaceInvitationLinkRequest>("application/json")
            .Produces<WorkspaceInvitationLinkPreviewDto>(StatusCodes.Status200OK)
            .ProducesProblem(StatusCodes.Status400BadRequest)
            .ProducesProblem(StatusCodes.Status401Unauthorized)
            .ProducesProblem(StatusCodes.Status404NotFound)
            .ProducesProblem(StatusCodes.Status413PayloadTooLarge)
            .ProducesProblem(StatusCodes.Status415UnsupportedMediaType)
            .ProducesProblem(StatusCodes.Status429TooManyRequests);

        return app;
    }
}
