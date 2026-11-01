using Api.Endpoints;
using Api.Security;
using Api.Infrastructure.Transactions;
using BuildingBlocks.Security;
using BuildingBlocks.Time;
using Fx.Infrastructure;
using Ingestion.Infrastructure;
using Ledger.Infrastructure;
using Lending.Infrastructure;
using Messaging.Infrastructure;
using Planning.Infrastructure;
using Identity.Infrastructure;
using Notifications.Infrastructure;
using Billefy.Integrations.WhatsApp;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using Scalar.AspNetCore;

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
builder.Services.ConfigureHttpJsonOptions(options =>
{
    options.SerializerOptions.NumberHandling = System.Text.Json.Serialization.JsonNumberHandling.AllowReadingFromString;
    options.SerializerOptions.Converters.Add(new System.Text.Json.Serialization.JsonStringEnumConverter());
});
builder.Services.Configure<Microsoft.AspNetCore.Http.Json.JsonOptions>(options =>
{
    options.SerializerOptions.NumberHandling = System.Text.Json.Serialization.JsonNumberHandling.AllowReadingFromString;
    options.SerializerOptions.Converters.Add(new System.Text.Json.Serialization.JsonStringEnumConverter());
});

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
const string DefaultDevJwtSecret = "billefy_super_secret_jwt_signing_key_2026_at_least_32_bytes_long!";
var isDevOrTesting = builder.Environment.IsDevelopment() || builder.Environment.IsEnvironment("Testing");

var jwtSecret = builder.Configuration["Jwt:Secret"]
    ?? Environment.GetEnvironmentVariable("JWT_SECRET");

if (string.IsNullOrWhiteSpace(jwtSecret))
{
    if (!isDevOrTesting)
    {
        throw new InvalidOperationException("CRITICAL SECURITY ERROR: Jwt:Secret (or JWT_SECRET) must be explicitly configured with a strong 32+ byte secret in Production.");
    }
    jwtSecret = DefaultDevJwtSecret;
}
else if (!isDevOrTesting && (jwtSecret == DefaultDevJwtSecret || Encoding.UTF8.GetByteCount(jwtSecret) < 32))
{
    throw new InvalidOperationException("CRITICAL SECURITY ERROR: Production Jwt:Secret cannot use the default placeholder and must be at least 32 bytes long.");
}

var jwtIssuer = builder.Configuration["Jwt:Issuer"] ?? "BillefyApi";
var jwtAudience = builder.Configuration["Jwt:Audience"] ?? "BillefyClients";

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.RequireHttpsMetadata = !isDevOrTesting;
    options.SaveToken = true;
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret)),
        ValidateIssuer = true,
        ValidIssuer = jwtIssuer,
        ValidateAudience = true,
        ValidAudience = jwtAudience,
        ValidateLifetime = true,
        ClockSkew = TimeSpan.FromSeconds(30)
    };
});
builder.Services.AddAuthorization();

// Rate Limiting (Defense against brute-force and webhook/ingestion flooding)
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.GlobalLimiter = System.Threading.RateLimiting.PartitionedRateLimiter.Create<HttpContext, string>(httpContext =>
        System.Threading.RateLimiting.RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: httpContext.Connection.RemoteIpAddress?.ToString() ?? "local",
            factory: _ => new System.Threading.RateLimiting.FixedWindowRateLimiterOptions
            {
                AutoReplenishment = true,
                PermitLimit = 300,
                QueueLimit = 0,
                Window = TimeSpan.FromMinutes(1)
            }));
});

// Modular Monolith Modules
builder.Services.AddIdentityModule(builder.Configuration);
builder.Services.AddLedgerModule(builder.Configuration);
builder.Services.AddFxModule(builder.Configuration);
builder.Services.AddIngestionModule(builder.Configuration);
builder.Services.AddLendingModule(builder.Configuration);
builder.Services.AddScoped<Lending.Application.Abstractions.ILoanTransaction, RelationalLoanTransaction>();
builder.Services.AddScoped<RelationalInvestmentCashTransaction>();
builder.Services.AddPlanningModule(builder.Configuration);
builder.Services.AddNotificationsModule(builder.Configuration);
builder.Services.AddWhatsAppIntegration(builder.Configuration);
builder.Services.AddMessagingModule(builder.Configuration);

// OpenAPI & Swagger Documentation
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddOpenApi(options =>
{
    options.AddDocumentTransformer((document, context, cancellationToken) =>
    {
        document.Info.Title = "Billefy API";
        document.Info.Version = "v1";
        document.Info.Description = "Billefy Personal Finance Manager API (.NET 10 Modular Monolith) - Multi-currency ledger, parallel FX, lending engine, planning & smart capture.";

        var securityScheme = new Microsoft.OpenApi.OpenApiSecurityScheme
        {
            Name = "Authorization",
            Description = "Enter JWT Bearer token: Bearer {token}",
            In = Microsoft.OpenApi.ParameterLocation.Header,
            Type = Microsoft.OpenApi.SecuritySchemeType.Http,
            Scheme = "bearer",
            BearerFormat = "JWT"
        };

        document.Components ??= new Microsoft.OpenApi.OpenApiComponents();
        document.Components.SecuritySchemes ??= new Dictionary<string, Microsoft.OpenApi.IOpenApiSecurityScheme>();
        document.Components.SecuritySchemes["Bearer"] = securityScheme;

        var requirement = new Microsoft.OpenApi.OpenApiSecurityRequirement
        {
            [new Microsoft.OpenApi.OpenApiSecuritySchemeReference("Bearer", document)] = []
        };
        document.Security ??= [];
        document.Security.Add(requirement);

        return Task.CompletedTask;
    });
});

var app = builder.Build();

app.UseExceptionHandler();

// Enable CORS & Rate Limiting
app.UseCors();
app.UseRateLimiter();

app.UseAuthentication();

// Fallback authentication for integration tests and local dev clients providing X-User-Id header (STRICTLY disabled in Production)
if (app.Environment.IsDevelopment() || app.Environment.IsEnvironment("Testing"))
{
    app.Use(async (context, next) =>
    {
        if ((context.User.Identity == null || !context.User.Identity.IsAuthenticated) &&
            context.Request.Headers.TryGetValue("X-User-Id", out var userIdVal) &&
            Guid.TryParse(userIdVal.ToString(), out var userIdGuid) &&
            userIdGuid != Guid.Empty)
        {
            var claims = new[]
            {
                new System.Security.Claims.Claim(System.Security.Claims.ClaimTypes.NameIdentifier, userIdGuid.ToString()),
                new System.Security.Claims.Claim("sub", userIdGuid.ToString())
            };
            var identity = new System.Security.Claims.ClaimsIdentity(claims, "DevOrTestHeader");
            context.User = new System.Security.Claims.ClaimsPrincipal(identity);
        }
        await next();
    });
}

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

        var notificationsDb = scope.ServiceProvider.GetRequiredService<NotificationsDbContext>();
        if (notificationsDb.Database.IsRelational())
        {
            notificationsDb.Database.Migrate();
        }
    }
    catch (Exception ex)
    {
        app.Logger.LogWarning(ex, "Could not apply database migrations on startup. Ensure PostgreSQL is reachable.");
    }
}

if (app.Environment.IsDevelopment() || app.Environment.IsEnvironment("Testing") || builder.Configuration.GetValue<bool>("EnableSwagger", false))
{
    app.MapOpenApi();
    app.UseSwaggerUI(options =>
    {
        options.SwaggerEndpoint("/openapi/v1.json", "Billefy API v1");
        options.RoutePrefix = "swagger";
    });
    app.MapScalarApiReference();
}

app.UseHttpsRedirection();

// Map REST API Endpoints
app.MapAuthEndpoints();
app.MapAccountEndpoints();
app.MapCategoryEndpoints();
app.MapTransactionEndpoints();
app.MapRateEndpoints();
app.MapIngestionEndpoints();
app.MapDraftEndpoints();
app.MapLoanEndpoints();
app.MapPlanningEndpoints();
app.MapNotificationEndpoints();
app.MapMessagingEndpoints();
app.MapBinanceEndpoints();

// Root & Health Checks
app.MapGet("/health", () => Results.Ok(new { status = "Healthy", timestamp = DateTime.UtcNow }));
app.MapGet("/", () => Results.Redirect("/swagger"));

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
