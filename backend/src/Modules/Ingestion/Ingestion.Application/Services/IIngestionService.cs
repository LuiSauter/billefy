using BuildingBlocks.Common;
using Ingestion.Contracts;

namespace Ingestion.Application.Services;

public interface IIngestionService
{
    Task<Result<RegisterEventResponse>> IngestEventAsync(
        Guid? idempotencyKey,
        CreateRawEventRequest request,
        CancellationToken cancellationToken = default);
}
