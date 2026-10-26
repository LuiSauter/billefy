using Ledger.Application.Abstractions;
using Ledger.Application.Accounts.CreateAccount;
using Ledger.Application.Services;
using Ledger.Application.Transactions.RegisterTransaction;
using Ledger.Application.Transactions.RegisterTransfer;
using Ledger.Application.Transactions.ReverseTransaction;
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
        services.AddScoped<ITransactionRepository, TransactionRepository>();
        services.AddScoped<IUnitOfWork, UnitOfWork>();

        // Application Handlers
        services.AddScoped<CreateAccountCommandHandler>();
        services.AddScoped<RegisterTransactionCommandHandler>();
        services.AddScoped<ReverseTransactionCommandHandler>();
        services.AddScoped<RegisterTransferCommandHandler>();

        // Module interop contract
        services.AddScoped<ILedgerModule, LedgerModule>();

        return services;
    }
}
