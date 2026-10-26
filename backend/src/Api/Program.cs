using Api.Endpoints;
using Api.Security;
using BuildingBlocks.Security;
using BuildingBlocks.Time;
using Fx.Infrastructure;
using Ledger.Infrastructure;
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

app.Run();

// Required for WebApplicationFactory in integration tests
public partial class Program;
