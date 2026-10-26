using Lending.Domain.Enums;

namespace Lending.Domain.Entities;

public sealed class LoanInstallment
{
    public Guid Id { get; private init; }
    public Guid LoanId { get; private init; }
    public int Number { get; private init; }
    public DateOnly DueDate { get; private init; }
    public decimal ExpectedPrincipal { get; private init; }
    public decimal ExpectedInterest { get; private init; }
    public decimal ExpectedTotal { get; private init; }
    public decimal PaidPrincipal { get; private set; }
    public decimal PaidInterest { get; private set; }
    public decimal PaidLateInterest { get; private set; }
    public InstallmentStatus Status { get; private set; }

    public decimal RemainingPrincipal => Math.Max(decimal.Zero, ExpectedPrincipal - PaidPrincipal);
    public decimal RemainingInterest => Math.Max(decimal.Zero, ExpectedInterest - PaidInterest);

    private LoanInstallment()
    {
    }

    public LoanInstallment(
        Guid id,
        Guid loanId,
        int number,
        DateOnly dueDate,
        decimal expectedPrincipal,
        decimal expectedInterest,
        decimal expectedTotal,
        decimal paidPrincipal = decimal.Zero,
        decimal paidInterest = decimal.Zero,
        decimal paidLateInterest = decimal.Zero,
        InstallmentStatus status = InstallmentStatus.Pending)
    {
        Id = id == Guid.Empty ? Guid.NewGuid() : id;
        LoanId = loanId;
        Number = number;
        DueDate = dueDate;
        ExpectedPrincipal = expectedPrincipal;
        ExpectedInterest = expectedInterest;
        ExpectedTotal = expectedTotal;
        PaidPrincipal = paidPrincipal;
        PaidInterest = paidInterest;
        PaidLateInterest = paidLateInterest;
        Status = status;
    }

    public void ApplyPayment(decimal toLate, decimal toInterest, decimal toPrincipal)
    {
        PaidLateInterest += toLate;
        PaidInterest += toInterest;
        PaidPrincipal += toPrincipal;

        if (RemainingPrincipal == decimal.Zero && RemainingInterest == decimal.Zero)
        {
            Status = InstallmentStatus.Paid;
        }
        else
        {
            Status = InstallmentStatus.PartiallyPaid;
        }
    }

    public void CheckOverdue(DateOnly currentDate, int graceDays)
    {
        if (Status == InstallmentStatus.Paid || Status == InstallmentStatus.Forgiven)
        {
            return;
        }

        var limitDate = DueDate.AddDays(graceDays);
        if (currentDate > limitDate)
        {
            Status = InstallmentStatus.Overdue;
        }
    }

    public void Forgive()
    {
        Status = InstallmentStatus.Forgiven;
    }
}
