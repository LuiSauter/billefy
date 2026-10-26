using Lending.Domain.Enums;

namespace Lending.Domain.Engine.Schemes;

public interface ILoanScheduleGenerator
{
    LoanSchedule GenerateSchedule(LoanParameters parameters);
}

public static class LoanScheduleGeneratorFactory
{
    public static ILoanScheduleGenerator Create(LoanTemplate template) => template switch
    {
        LoanTemplate.NoInterest => new NoInterestScheduleGenerator(),
        LoanTemplate.FlatOnInitialCapital => new FlatOnInitialCapitalScheduleGenerator(),
        LoanTemplate.SimpleOnBalance => new SimpleOnBalanceScheduleGenerator(),
        LoanTemplate.FixedInstallment => new FixedInstallmentScheduleGenerator(),
        LoanTemplate.InterestOnly => new InterestOnlyScheduleGenerator(),
        LoanTemplate.SinglePaymentCompound => new SinglePaymentCompoundScheduleGenerator(),
        _ => throw new NotSupportedException($"Loan template '{template}' is not supported.")
    };
}
