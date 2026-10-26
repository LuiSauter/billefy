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
}
