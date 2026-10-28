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
using Identity.Infrastructure;
using Billefy.Integrations.WhatsApp;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

// Configurable Port (PORT or API_PORT)
var customPort = Environment.GetEnvironmentVariable("PORT") ?? Environment.GetEnvironmentVariable("API_PORT");
if (!string.IsNullOrWhiteSpace(customPort) && string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable("ASPNETCORE_URLS")))
{
    builder.WebHost.UseUrls($"http://localhost:{customPort}");
}

// Security & Base Abstractions
builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<ICurrentUserContext, HttpContextCurrentUserContext>();
builder.Services.AddSingleton<IClock>(SystemClock.Instance);

// Problem Details (RFC 9457)
builder.Services.AddProblemDetails();

// CORS (Configurable Allowed Origins)
var allowedOriginsRaw = Environment.GetEnvironmentVariable("CORS_ALLOWED_ORIGINS")
    ?? builder.Configuration["Cors:AllowedOrigins"];

var allowedOrigins = !string.IsNullOrWhiteSpace(allowedOriginsRaw)
    ? allowedOriginsRaw.Split([',', ';'], StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
    : builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>()
      ?? ["http://localhost:3000", "http://127.0.0.1:3000"];

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.WithOrigins(allowedOrigins)
              .AllowAnyMethod()
              .AllowAnyHeader()
              .AllowCredentials();
    });
});

// Resolve PostgreSQL Connection String (supports DB_* individual env vars, DATABASE_URL, and ConnectionStrings:PostgreSQL)
var resolvedConnectionString = ResolvePostgreSqlConnectionString(builder.Configuration);
if (resolvedConnectionString != null)
{
    builder.Configuration["ConnectionStrings:PostgreSQL"] = resolvedConnectionString;
}

// JWT Authentication & Authorization
var jwtSecret = builder.Configuration["Jwt:Secret"]
    ?? Environment.GetEnvironmentVariable("JWT_SECRET")
    ?? "billefy_super_secret_jwt_signing_key_2026_at_least_32_bytes_long!";
var jwtIssuer = builder.Configuration["Jwt:Issuer"] ?? "BillefyApi";
var jwtAudience = builder.Configuration["Jwt:Audience"] ?? "BillefyClients";

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.RequireHttpsMetadata = false;
    options.SaveToken = true;
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret)),
        ValidateIssuer = false, // flexible for multi-client origins in dev
        ValidateAudience = false,
        ValidateLifetime = true,
        ClockSkew = TimeSpan.FromSeconds(30)
    };
});
builder.Services.AddAuthorization();

// Modular Monolith Modules
builder.Services.AddIdentityModule(builder.Configuration);
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

// Enable CORS
app.UseCors();
app.UseAuthentication();
app.UseAuthorization();

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

        var identityDb = scope.ServiceProvider.GetRequiredService<IdentityDbContext>();
        if (identityDb.Database.IsRelational())
        {
            identityDb.Database.Migrate();
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
app.MapAuthEndpoints();
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
public partial class Program
{
    public static string? ResolvePostgreSqlConnectionString(IConfiguration configuration)
    {
        // If explicitly set to empty (such as in testing harness), respect it
        var explicitConnStr = configuration.GetConnectionString("PostgreSQL");
        if (explicitConnStr != null && string.IsNullOrWhiteSpace(explicitConnStr))
        {
            return null;
        }

        // 1. Check individual DB_* environment variables (e.g. DBngin / TablePlus local setup)
        var dbHost = Environment.GetEnvironmentVariable("DB_HOST") ?? configuration["DB_HOST"];
        var dbPort = Environment.GetEnvironmentVariable("DB_PORT") ?? configuration["DB_PORT"];
        var dbDatabase = Environment.GetEnvironmentVariable("DB_DATABASE") ?? configuration["DB_DATABASE"];
        var dbUsername = Environment.GetEnvironmentVariable("DB_USERNAME") ?? configuration["DB_USERNAME"];
        var dbPassword = Environment.GetEnvironmentVariable("DB_PASSWORD") ?? configuration["DB_PASSWORD"];

        if (!string.IsNullOrWhiteSpace(dbHost) || !string.IsNullOrWhiteSpace(dbDatabase))
        {
            var host = string.IsNullOrWhiteSpace(dbHost) ? "localhost" : dbHost;
            var port = string.IsNullOrWhiteSpace(dbPort) ? "5432" : dbPort;
            var database = string.IsNullOrWhiteSpace(dbDatabase) ? "billefy-db" : dbDatabase;
            var user = string.IsNullOrWhiteSpace(dbUsername) ? "postgres" : dbUsername;
            var pass = dbPassword ?? "";

            return $"Host={host};Port={port};Database={database};Username={user};Password={pass};";
        }

        // 2. Check DATABASE_URL (12-factor standard URL: postgres://user:pass@host:port/dbname)
        var databaseUrl = Environment.GetEnvironmentVariable("DATABASE_URL") ?? configuration["DATABASE_URL"];
        if (!string.IsNullOrWhiteSpace(databaseUrl) && Uri.TryCreate(databaseUrl, UriKind.Absolute, out var uri))
        {
            var userInfo = uri.UserInfo.Split(':');
            var user = userInfo.Length > 0 ? Uri.UnescapeDataString(userInfo[0]) : "postgres";
            var pass = userInfo.Length > 1 ? Uri.UnescapeDataString(userInfo[1]) : "";
            var host = uri.Host;
            var port = uri.Port > 0 ? uri.Port : 5432;
            var database = uri.AbsolutePath.TrimStart('/');

            return $"Host={host};Port={port};Database={database};Username={user};Password={pass};";
        }

        // 3. Fallback to ConnectionStrings:PostgreSQL
        if (!string.IsNullOrWhiteSpace(explicitConnStr))
        {
            return explicitConnStr;
        }

        // 4. Default local development fallback (DBngin / Local Postgres)
        return "Host=localhost;Port=5432;Database=billefy-db;Username=postgres;Password=;";
    }
}
