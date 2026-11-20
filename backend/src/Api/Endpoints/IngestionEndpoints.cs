using Api.Common;
using Ingestion.Application.Services;
using Ingestion.Contracts;
using Microsoft.AspNetCore.Mvc;

namespace Api.Endpoints;

public static class IngestionEndpoints
{
    public static RouteGroupBuilder MapIngestionEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/v1/ingestion")
            .WithTags("Ingestion")
            .RequireAuthorization();

        group.MapPost("/events", async (
            [FromHeader(Name = "Idempotency-Key")] Guid? idempotencyKey,
            [FromBody] CreateRawEventRequest request,
            IIngestionService service,
            CancellationToken ct) =>
        {
            var result = await service.IngestEventAsync(idempotencyKey, request, ct);

            return result.ToHttpResult(response => response.IsNewEvent
                ? Results.Accepted($"/v1/ingestion/events/{response.EventId}", response)
                : Results.Ok(response));
        })
        .WithName("RegisterRawEvent")
        .WithSummary("Idempotently ingest a financial raw event (notification, whatsapp, csv).")
        .Produces<RegisterEventResponse>(StatusCodes.Status202Accepted)
        .Produces<RegisterEventResponse>(StatusCodes.Status200OK)
        .ProducesProblem(StatusCodes.Status400BadRequest)
        .ProducesProblem(StatusCodes.Status401Unauthorized);

        group.MapPost("/statements/import-csv", async (
            [FromBody] ImportStatementCsvRequest request,
            IStatementImportService service,
            CancellationToken ct) =>
        {
            var result = await service.ImportCsvAsync(request, ct);
            return result.ToHttpResult();
        })
        .WithName("ImportStatementCsv")
        .WithSummary("Import bank statement movements from a CSV file with automatic deduplication (ING-11).")
        .Produces<StatementImportResult>(StatusCodes.Status200OK)
        .ProducesProblem(StatusCodes.Status400BadRequest)
        .ProducesProblem(StatusCodes.Status401Unauthorized);

        group.MapPost("/statements/import-pdf", async (
            [FromBody] ImportStatementPdfRequest request,
            IStatementImportService service,
            CancellationToken ct) =>
        {
            var result = await service.ImportPdfAsync(request, ct);
            return result.ToHttpResult();
        })
        .WithName("ImportStatementPdf")
        .WithSummary("Import bank statement movements from a PDF statement with automatic deduplication (ING-12).")
        .Produces<StatementImportResult>(StatusCodes.Status200OK)
        .ProducesProblem(StatusCodes.Status400BadRequest)
        .ProducesProblem(StatusCodes.Status401Unauthorized);

        return group;
    }
}
