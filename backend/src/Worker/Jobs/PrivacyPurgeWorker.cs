using Ingestion.Infrastructure;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Worker.Jobs;

public sealed class PrivacyPurgeWorker : BackgroundService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<PrivacyPurgeWorker> _logger;
    private readonly TimeSpan _interval = TimeSpan.FromHours(6);

    public PrivacyPurgeWorker(IServiceProvider serviceProvider, ILogger<PrivacyPurgeWorker> logger)
    {
        _serviceProvider = serviceProvider;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("PrivacyPurgeWorker iniciado. Purgando eventos raw > 30 días según Regla 8 y 16.");

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                using var scope = _serviceProvider.CreateScope();
                var ingestionDb = scope.ServiceProvider.GetService<IngestionDbContext>();

                if (ingestionDb != null)
                {
                    var thresholdDate = DateTime.UtcNow.AddDays(-30);

                    var oldEvents = await ingestionDb.RawEvents
                        .Where(e => e.CreatedAt < thresholdDate)
                        .ToListAsync(stoppingToken);

                    if (oldEvents.Count > 0)
                    {
                        ingestionDb.RawEvents.RemoveRange(oldEvents);
                        await ingestionDb.SaveChangesAsync(stoppingToken);

                        _logger.LogInformation("Purga de privacidad ejecutada: {Count} eventos crudos eliminados.", oldEvents.Count);
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Error en el worker de purga de privacidad.");
            }

            try
            {
                await Task.Delay(_interval, stoppingToken);
            }
            catch (OperationCanceledException)
            {
                break;
            }
        }

        _logger.LogInformation("PrivacyPurgeWorker detenido.");
    }
}
