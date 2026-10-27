using Api.Endpoints;
using Api.Security;
using BuildingBlocks.Security;
using BuildingBlocks.Time;
using Fx.Infrastructure;
using Ingestion.Infrastructure;
using Ledger.Infrastructure;
using Lending.Infrastructure;
using Messaging.Infrastructure;
using Planning.Infrastructure;
using Billefy.Integrations.WhatsApp;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

// Security & Base Abstractions
builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<ICurrentUserContext, HttpContextCurrentUserContext>();
builder.Services.AddSingleton<IClock>(SystemClock.Instance);

// Problem Details (RFC 9457)
builder.Services.AddProblemDetails();

// Modular Monolith Modules
builder.Services.AddLedgerModule(builder.Configuration);
builder.Services.AddFxModule(builder.Configuration);
builder.Services.AddIngestionModule(builder.Configuration);
builder.Services.AddLendingModule(builder.Configuration);
builder.Services.AddPlanningModule(builder.Configuration);
builder.Services.AddWhatsAppIntegration(builder.Configuration);
builder.Services.AddMessagingModule(builder.Configuration);

// OpenAPI Documentation
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddOpenApi();

var app = builder.Build();

app.UseExceptionHandler();

// Automatically apply relational database migrations on startup when PostgreSQL connection string is configured
if (!string.IsNullOrWhiteSpace(builder.Configuration.GetConnectionString("PostgreSQL")))
{
    using var scope = app.Services.CreateScope();
    try
    {
        var ledgerDb = scope.ServiceProvider.GetRequiredService<LedgerDbContext>();
        if (ledgerDb.Database.IsRelational())
        {
            ledgerDb.Database.Migrate();
        }

        var fxDb = scope.ServiceProvider.GetRequiredService<FxDbContext>();
        if (fxDb.Database.IsRelational())
        {
            fxDb.Database.Migrate();
        }

        var ingestionDb = scope.ServiceProvider.GetRequiredService<IngestionDbContext>();
        if (ingestionDb.Database.IsRelational())
        {
            ingestionDb.Database.Migrate();
        }

        var lendingDb = scope.ServiceProvider.GetRequiredService<LendingDbContext>();
        if (lendingDb.Database.IsRelational())
        {
            lendingDb.Database.Migrate();
        }

        var planningDb = scope.ServiceProvider.GetRequiredService<PlanningDbContext>();
        if (planningDb.Database.IsRelational())
        {
            planningDb.Database.Migrate();
        }

        var messagingDb = scope.ServiceProvider.GetRequiredService<MessagingDbContext>();
        if (messagingDb.Database.IsRelational())
        {
            messagingDb.Database.Migrate();
        }
    }
    catch (Exception ex)
    {
        app.Logger.LogWarning(ex, "Could not apply database migrations on startup. Ensure PostgreSQL is reachable.");
    }
}

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseHttpsRedirection();

// Map REST API Endpoints
app.MapAccountEndpoints();
app.MapTransactionEndpoints();
app.MapRateEndpoints();
app.MapIngestionEndpoints();
app.MapDraftEndpoints();
app.MapLoanEndpoints();
app.MapPlanningEndpoints();
app.MapMessagingEndpoints();
app.MapBinanceEndpoints();

app.Run();

// Required for WebApplicationFactory in integration tests
public partial class Program;
