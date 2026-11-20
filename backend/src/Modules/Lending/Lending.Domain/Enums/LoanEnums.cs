namespace Lending.Domain.Enums;

public enum LoanTemplate
{
    NoInterest = 1,
    FlatOnInitialCapital = 2,
    SimpleOnBalance = 3,
    FixedInstallment = 4,
    InterestOnly = 5,
    SinglePaymentCompound = 6
}

public enum RateUnit
{
    Monthly = 1,
    Annual = 2
}

public enum DayCount
{
    Thirty360 = 1,
    Actual365 = 2
}

public enum PaymentFrequency
{
    Monthly = 1,
    Biweekly = 2,
    Weekly = 3,
    Single = 4
}

public enum PaymentAllocationOrder
{
    LateInterestInterestPrincipal = 1,
    InterestPrincipalLateInterest = 2
}

public enum EarlyPaymentPolicy
{
    AdvanceInstallments = 1,
    ReduceTerm = 2,
    ReduceInstallment = 3
}

public enum LoanType
{
    Lent = 1,     // Money lent to someone else (Asset / Receivable)
    Borrowed = 2  // Money borrowed from someone else (Liability / Payable)
}

public enum LoanStatus
{
    Simulated = 1,
    PendingAcceptance = 2,
    Active = 3,
    InArrears = 4,
    Paid = 5,
    Forgiven = 6,
    Cancelled = 7
}

public enum InstallmentStatus
{
    Pending = 1,
    Overdue = 2,
    PartiallyPaid = 3,
    Paid = 4,
    Forgiven = 5
}
