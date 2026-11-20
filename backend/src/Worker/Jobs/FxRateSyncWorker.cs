using BuildingBlocks.Currencies;
using Fx.Domain.Rates;
using Fx.Infrastructure;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Worker.Jobs;

public sealed class FxRateSyncWorker : BackgroundService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<FxRateSyncWorker> _logger;
    private readonly TimeSpan _interval = TimeSpan.FromMinutes(5);

    public FxRateSyncWorker(IServiceProvider serviceProvider, ILogger<FxRateSyncWorker> logger)
    {
        _serviceProvider = serviceProvider;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("FxRateSyncWorker iniciado. Intervalo de actualización: {Interval} min.", _interval.TotalMinutes);

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                using var scope = _serviceProvider.CreateScope();
                var rateSource = scope.ServiceProvider.GetService<IRateSource>();
                var fxDbContext = scope.ServiceProvider.GetService<FxDbContext>();

                if (rateSource != null && fxDbContext != null)
                {
                    _logger.LogInformation("Consultando cotización de mercado paralelo P2P (DolarApi)...");
                    var rateResult = await rateSource.GetRateAsync(Currency.BOB, Currency.USD, stoppingToken);

                    if (rateResult != null)
                    {
                        var rateEntity = ExchangeRate.CreateMarketRate(
                            Currency.BOB,
                            Currency.USD,
                            rateResult.BuyRate,
                            rateResult.SellRate,
                            rateResult.Source,
                            rateResult.FetchedAt);

                        fxDbContext.ExchangeRates.Add(rateEntity);
                        await fxDbContext.SaveChangesAsync(stoppingToken);

                        _logger.LogInformation(
                            "Snapshot FX actualizado con éxito. Compra: {BuyRate} | Venta: {SellRate} | Fuente: {Source}",
                            rateResult.BuyRate,
                            rateResult.SellRate,
                            rateResult.Source);
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Error al sincronizar cotización paralela en segundo plano.");
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

        _logger.LogInformation("FxRateSyncWorker detenido.");
    }
}
