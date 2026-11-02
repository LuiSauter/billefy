using BuildingBlocks.Currencies;
using BuildingBlocks.ValueObjects;
using FluentAssertions;
using NetArchTest.Rules;
using Xunit;

namespace Architecture.Tests;

public class ArchitectureTests
{
    private static readonly System.Reflection.Assembly BuildingBlocksAssembly = typeof(Money).Assembly;
    private static readonly System.Reflection.Assembly ApiAssembly = typeof(Program).Assembly;

    [Fact]
    public void BuildingBlocks_Should_Not_Depend_On_Any_Module()
    {
        var result = Types.InAssembly(BuildingBlocksAssembly)
            .ShouldNot()
            .HaveDependencyOnAny(
                "Identity",
                "Ledger",
                "Ingestion",
                "Lending",
                "Fx",
                "Planning",
                "Analytics",
                "Messaging",
                "Notifications")
            .GetResult();

        result.IsSuccessful.Should().BeTrue("BuildingBlocks must be foundational and never depend on modules.");
    }

    [Fact]
    public void Money_ValueObject_Must_Not_Use_Float_Or_Double()
    {
        var moneyType = typeof(Money);

        var floatOrDoubleProperties = moneyType.GetProperties()
            .Where(p => p.PropertyType == typeof(float) || p.PropertyType == typeof(double))
            .ToList();

        var floatOrDoubleFields = moneyType.GetFields()
            .Where(f => f.FieldType == typeof(float) || f.FieldType == typeof(double))
            .ToList();

        floatOrDoubleProperties.Should().BeEmpty("Money must never use float or double for properties (rule 1).");
        floatOrDoubleFields.Should().BeEmpty("Money must never use float or double for fields (rule 1).");
    }

    [Fact]
    public void Money_Amount_Must_Be_Decimal()
    {
        var prop = typeof(Money).GetProperty(nameof(Money.Amount));
        prop.Should().NotBeNull();
        prop!.PropertyType.Should().Be(typeof(decimal), "Money amount must strictly be of type System.Decimal.");
    }

    [Fact]
    public void ModuleContracts_Should_Not_Depend_On_Api_Or_Worker()
    {
        var contractAssemblies = new[]
        {
            typeof(Identity.Contracts.IIdentityModule).Assembly,
            typeof(Ledger.Contracts.ILedgerModule).Assembly,
            typeof(Ingestion.Contracts.IIngestionModule).Assembly,
            typeof(Lending.Contracts.ILendingModule).Assembly,
            typeof(Fx.Contracts.IFxModule).Assembly,
            typeof(Planning.Contracts.IPlanningModule).Assembly,
            typeof(Analytics.Contracts.IAnalyticsModule).Assembly,
            typeof(Messaging.Contracts.IMessagingModule).Assembly,
            typeof(Notifications.Contracts.INotificationsModule).Assembly,
        };

        foreach (var assembly in contractAssemblies)
        {
            var result = Types.InAssembly(assembly)
                .ShouldNot()
                .HaveDependencyOnAny("Api", "Worker")
                .GetResult();

            result.IsSuccessful.Should().BeTrue($"Contract assembly {assembly.GetName().Name} must not depend on application hosts.");
        }
    }

    [Fact]
    public void Api_Endpoints_Should_Not_Depend_On_DbContext_Or_Repositories()
    {
        var result = Types.InAssembly(ApiAssembly)
            .That()
            .ResideInNamespace("Api.Endpoints")
            .ShouldNot()
            .HaveDependencyOnAny(
                "Microsoft.EntityFrameworkCore.DbContext",
                "Ledger.Infrastructure.LedgerDbContext",
                "Ingestion.Infrastructure.IngestionDbContext",
                "Fx.Infrastructure.FxDbContext",
                "Ledger.Application.Abstractions.IAccountRepository",
                "Ledger.Application.Abstractions.ITransactionRepository",
                "Ingestion.Application.Abstractions.IDraftRepository",
                "Ingestion.Application.Abstractions.IRawEventRepository")
            .GetResult();

        result.IsSuccessful.Should().BeTrue("API Endpoints must be ultra-thin and delegate strictly to Application Services, never directly touching DbContext or Repositories.");
    }

    [Fact]
    public void Identity_Application_May_Use_Only_Fx_Contracts_For_CurrencyCatalog()
    {
        var identityApplication = typeof(Identity.Application.Services.IdentityService).Assembly;
        identityApplication.GetReferencedAssemblies().Select(reference => reference.Name)
            .Should().Contain("Fx.Contracts", "Identity validates preferences through the Fx public catalog contract.");

        var avoidsFxInternals = Types.InAssembly(identityApplication)
            .ShouldNot().HaveDependencyOnAny("Fx.Domain", "Fx.Application", "Fx.Infrastructure").GetResult();
        avoidsFxInternals.IsSuccessful.Should().BeTrue("Identity may not depend on Fx internals.");
    }

    [Fact]
    public void ModuleApplication_Should_Only_Depend_On_Other_Modules_Via_Contracts()
    {
        var moduleApplications = new (string ModuleName, System.Reflection.Assembly Assembly)[]
        {
            ("Identity", typeof(Identity.Application.Services.IdentityService).Assembly),
            ("Ledger", typeof(Ledger.Application.Services.LedgerModule).Assembly),
            ("Ingestion", typeof(Ingestion.Application.Services.IngestionModule).Assembly),
            ("Lending", typeof(Lending.Application.Services.LoanService).Assembly),
            ("Planning", typeof(Planning.Application.Services.BudgetService).Assembly),
            ("Messaging", typeof(Messaging.Application.Services.WhatsAppBotService).Assembly),
            ("Notifications", typeof(Notifications.Application.Services.NotificationsService).Assembly),
        };

        var allModuleNames = new[] { "Identity", "Ledger", "Ingestion", "Lending", "Fx", "Planning", "Analytics", "Messaging", "Notifications" };

        foreach (var (moduleName, assembly) in moduleApplications)
        {
            var forbiddenNamespaces = allModuleNames
                .Where(other => other != moduleName)
                .SelectMany(other => new[]
                {
                    $"{other}.Domain",
                    $"{other}.Application",
                    $"{other}.Infrastructure"
                })
                .ToArray();

            var result = Types.InAssembly(assembly)
                .ShouldNot()
                .HaveDependencyOnAny(forbiddenNamespaces)
                .GetResult();

            result.IsSuccessful.Should().BeTrue(
                $"{moduleName}.Application must communicate with other modules strictly through <Module>.Contracts, never referencing their Domain, Application, or Infrastructure layers.");
        }
    }
}
