namespace Lending.Application.Abstractions;

public interface ILoanTransaction
{
    Task ExecuteAsync(Func<CancellationToken, Task> operation, CancellationToken cancellationToken = default);
}
