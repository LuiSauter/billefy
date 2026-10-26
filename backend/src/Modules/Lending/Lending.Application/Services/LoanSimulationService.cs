using BuildingBlocks.Common;
using Lending.Contracts;
using Lending.Domain.Engine;
using Lending.Domain.Engine.Schemes;
using Lending.Domain.Enums;

namespace Lending.Application.Services;

public interface ILoanSimulationService
{
    Result<LoanScheduleDto> Simulate(SimulateLoanRequest request);
}

public sealed class LoanSimulationService : ILoanSimulationService
{
    public Result<LoanScheduleDto> Simulate(SimulateLoanRequest request)
    {
        if (request.Principal <= decimal.Zero)
        {
            return Result.Failure<LoanScheduleDto>(
                Error.Validation("Loan.InvalidPrincipal", "Principal amount must be positive."));
        }

        if (request.TotalInstallments < 1)
        {
            return Result.Failure<LoanScheduleDto>(
                Error.Validation("Loan.InvalidInstallments", "Total installments must be at least 1."));
        }

        if (!Enum.TryParse<LoanTemplate>(request.Template, ignoreCase: true, out var template))
        {
            return Result.Failure<LoanScheduleDto>(
                Error.Validation("Loan.InvalidTemplate", $"Unknown template '{request.Template}'."));
        }

        Enum.TryParse<RateUnit>(request.RateUnit, ignoreCase: true, out var rateUnit);
        Enum.TryParse<DayCount>(request.DayCount, ignoreCase: true, out var dayCount);
        Enum.TryParse<PaymentFrequency>(request.Frequency, ignoreCase: true, out var frequency);
        PaymentFrequency? compounding = null;
        if (!string.IsNullOrWhiteSpace(request.Compounding) &&
            Enum.TryParse<PaymentFrequency>(request.Compounding, ignoreCase: true, out var comp))
        {
            compounding = comp;
        }

        var disbursement = request.DisbursementDate ?? DateOnly.FromDateTime(DateTime.UtcNow);

        var parameters = new LoanParameters(
            Principal: request.Principal,
            Rate: request.Rate,
            RateUnit: rateUnit,
            DayCount: dayCount,
            Frequency: frequency,
            TotalInstallments: request.TotalInstallments,
            DisbursementDate: disbursement,
            GraceDays: request.GraceDays,
            LateRate: request.LateRate,
            Compounding: compounding,
            CompoundingPeriods: request.CompoundingPeriods,
            MaturityDate: request.MaturityDate);

        var generator = LoanScheduleGeneratorFactory.Create(template);
        var schedule = generator.GenerateSchedule(parameters);

        var dtos = schedule.Installments.Select(i => new InstallmentScheduleDto(
            i.Number,
            i.DueDate,
            i.Principal,
            i.Interest,
            i.Total,
            i.BalanceAfter)).ToList();

        return Result.Success(new LoanScheduleDto(
            dtos,
            schedule.TotalPrincipal,
            schedule.TotalInterest,
            schedule.TotalToPay,
            schedule.AnnualEffectiveRate));
    }
}
