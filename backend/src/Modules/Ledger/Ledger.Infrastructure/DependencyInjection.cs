using Ledger.Application.Abstractions;
using Ledger.Application.Accounts.CreateAccount;
using Ledger.Application.Accounts.Services;
using Ledger.Application.Categories.Services;
using Ledger.Application.Services;
using Ledger.Application.Transactions.RegisterTransaction;
using Ledger.Application.Transactions.RegisterTransfer;
using Ledger.Application.Transactions.ReverseTransaction;
using Ledger.Application.Transactions.Services;
using Ledger.Contracts;
using Ledger.Infrastructure.Repositories;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace Ledger.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddLedgerModule(this IServiceCollection services, IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("PostgreSQL");
        if (!string.IsNullOrWhiteSpace(connectionString))
        {
            services.AddDbContext<LedgerDbContext>(options =>
                options.UseNpgsql(connectionString));
        }

        // Repositories & Unit of Work
        services.AddScoped<IAccountRepository, AccountRepository>();
        services.AddScoped<ICategoryRepository, CategoryRepository>();
        services.AddScoped<ITransactionRepository, TransactionRepository>();
        services.AddScoped<IUnitOfWork, UnitOfWork>();

        // Application Handlers
        services.AddScoped<CreateAccountCommandHandler>();
        services.AddScoped<RegisterTransactionCommandHandler>();
        services.AddScoped<ReverseTransactionCommandHandler>();
        services.AddScoped<RegisterTransferCommandHandler>();

        // Application Services (Cohesive Facade for Driving Adapters)
        services.AddScoped<IAccountService, AccountService>();
        services.AddScoped<ICategoryService, CategoryService>();
        services.AddScoped<ITransactionService, TransactionService>();

        // Module interop contracts
        services.AddScoped<ILedgerModule, LedgerModule>();
        services.AddScoped<ILedgerFinancialDataExport, LedgerFinancialDataExport>();
        services.AddScoped<ILedgerFinancialDataReset, LedgerFinancialDataReset>();

        return services;
    }
}
