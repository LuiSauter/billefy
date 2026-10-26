using Ingestion.Application.Abstractions;
using Ingestion.Application.Deduplication;
using Ingestion.Application.Drafts.ConfirmDraft;
using Ingestion.Application.Drafts.DiscardDraft;
using Ingestion.Application.Drafts.GetDrafts;
using Ingestion.Application.Events.RegisterEvent;
using Ingestion.Application.Parsing;
using Ingestion.Application.Services;
using Ingestion.Infrastructure.Repositories;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace Ingestion.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddIngestionModule(this IServiceCollection services, IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("PostgreSQL");
        if (!string.IsNullOrWhiteSpace(connectionString))
        {
            services.AddDbContext<IngestionDbContext>(options =>
                options.UseNpgsql(connectionString));
        }

        // Repositories & Unit of Work
        services.AddScoped<IDraftRepository, DraftRepository>();
        services.AddScoped<IRawEventRepository, RawEventRepository>();
        services.AddScoped<IFinancialSourceRepository, FinancialSourceRepository>();
        services.AddScoped<IStatementImportRepository, StatementImportRepository>();
        services.AddScoped<IIngestionUnitOfWork, IngestionUnitOfWork>();

        // Parsing & Deduplication Services
        services.AddSingleton<IFinancialTextParser, RuleBasedFinancialParser>();
        services.AddScoped<IDeduplicationService, DeduplicationService>();

        // Application Handlers
        services.AddScoped<RegisterEventCommandHandler>();
        services.AddScoped<GetDraftsQueryHandler>();
        services.AddScoped<ConfirmDraftCommandHandler>();
        services.AddScoped<DiscardDraftCommandHandler>();

        // Application Services (Cohesive Facade for Driving Adapters)
        services.AddScoped<IIngestionService, IngestionService>();
        services.AddScoped<IDraftService, DraftService>();
        services.AddScoped<IStatementImportService, StatementImportService>();
        services.AddScoped<IBinanceSyncService, BinanceSyncService>();

        return services;
    }
}
