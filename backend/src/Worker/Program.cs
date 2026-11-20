using Billefy.Integrations.Fx;
using Fx.Infrastructure;
using Ingestion.Infrastructure;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Worker.Jobs;

var builder = Host.CreateApplicationBuilder(args);

// Resolve PostgreSQL Connection String
var connectionString = ResolvePostgreSqlConnectionString(builder.Configuration)
    ?? builder.Configuration.GetConnectionString("PostgreSQL");

if (!string.IsNullOrWhiteSpace(connectionString))
{
    builder.Configuration["ConnectionStrings:PostgreSQL"] = connectionString;
}

// Module Registrations
builder.Services.AddFxModule(builder.Configuration);
builder.Services.AddIngestionModule(builder.Configuration);

// Background Jobs
builder.Services.AddHostedService<FxRateSyncWorker>();
builder.Services.AddHostedService<PrivacyPurgeWorker>();

var host = builder.Build();
host.Run();

static string? ResolvePostgreSqlConnectionString(IConfiguration configuration)
{
    var directConn = configuration["DB_CONNECTION"]
                     ?? configuration["DB_CONNECTION_STRING"]
                     ?? configuration["ConnectionStrings:PostgreSQL"];

    var databaseUrl = configuration["DATABASE_URL"];
    if (!string.IsNullOrWhiteSpace(databaseUrl))
    {
        try
        {
            var uri = new Uri(databaseUrl);
            var userInfo = uri.UserInfo.Split(':');
            var username = userInfo.Length > 0 ? userInfo[0] : "postgres";
            var password = userInfo.Length > 1 ? userInfo[1] : "";
            var host = uri.Host;
            var port = uri.Port > 0 ? uri.Port : 5432;
            var database = uri.AbsolutePath.TrimStart('/');

            return $"Host={host};Port={port};Database={database};Username={username};Password={password};";
        }
        catch
        {
            // fallback
        }
    }

    var dbHost = configuration["DB_HOST"];
    var dbDatabase = configuration["DB_DATABASE"];

    if (!string.IsNullOrWhiteSpace(dbHost) && !string.IsNullOrWhiteSpace(dbDatabase))
    {
        var dbPort = configuration["DB_PORT"] ?? "5432";
        var dbUser = configuration["DB_USERNAME"] ?? configuration["DB_USER"] ?? "postgres";
        var dbPass = configuration["DB_PASSWORD"] ?? configuration["DB_PASS"] ?? "";

        return $"Host={dbHost};Port={dbPort};Database={dbDatabase};Username={dbUser};Password={dbPass};";
    }

    return directConn;
}
