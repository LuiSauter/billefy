using Api.Endpoints;
using Api.Security;
using BuildingBlocks.Security;
using BuildingBlocks.Time;
using Fx.Infrastructure;
using Ledger.Infrastructure;

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
