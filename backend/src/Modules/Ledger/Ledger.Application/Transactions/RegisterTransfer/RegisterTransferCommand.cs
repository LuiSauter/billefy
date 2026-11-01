using BuildingBlocks.Common;
using BuildingBlocks.Currencies;
using BuildingBlocks.Security;
using BuildingBlocks.Time;
using BuildingBlocks.ValueObjects;
using Ledger.Application.Abstractions;
using Ledger.Domain.Transactions;
using Ledger.Domain.Accounts;
using Fx.Contracts;

namespace Ledger.Application.Transactions.RegisterTransfer;

public sealed record RegisterTransferCommand(
    Guid SourceAccountId,
    decimal SourceAmount,
    Guid DestinationAccountId,
    decimal DestinationAmount,
    DateTime OccurredAt,
    decimal? AppliedRate,
    string? RateSource,
    string? Description);

public sealed class RegisterTransferCommandHandler
{
    private readonly IAccountRepository _accountRepository;
    private readonly ITransactionRepository _transactionRepository;
    private readonly ICurrentUserContext _currentUserContext;
    private readonly IClock _clock;
    private readonly IUnitOfWork _unitOfWork;
    private readonly IRateSnapshotProvider? _rateSnapshotProvider;

    public RegisterTransferCommandHandler(
        IAccountRepository accountRepository,
        ITransactionRepository transactionRepository,
        ICurrentUserContext currentUserContext,
        IClock clock,
        IUnitOfWork unitOfWork,
        IRateSnapshotProvider? rateSnapshotProvider = null)
    {
        _accountRepository = accountRepository;
        _transactionRepository = transactionRepository;
        _currentUserContext = currentUserContext;
        _clock = clock;
        _unitOfWork = unitOfWork;
        _rateSnapshotProvider = rateSnapshotProvider;
    }

    public async Task<Result<(Guid OutflowId, Guid InflowId)>> HandleAsync(RegisterTransferCommand command, CancellationToken cancellationToken = default)
    {
        if (!_currentUserContext.IsAuthenticated)
        {
            return Result.Failure<(Guid, Guid)>(Error.Unauthorized("Auth.Unauthorized", "User is not authenticated."));
        }

        if (command.SourceAccountId == command.DestinationAccountId)
        {
            return Result.Failure<(Guid, Guid)>(Error.Validation("Transfer.SameAccount", "Source and destination accounts must be distinct."));
        }

        if (command.SourceAmount <= decimal.Zero || command.DestinationAmount <= decimal.Zero)
        {
            return Result.Failure<(Guid, Guid)>(Error.Validation("Transfer.InvalidAmount", "Transfer amounts must be strictly greater than zero."));
        }

        var sourceAccount = await _accountRepository.GetByIdAsync(command.SourceAccountId, cancellationToken);
        if (sourceAccount is null)
        {
            return Result.Failure<(Guid, Guid)>(Error.NotFound("Account.SourceNotFound", "Source account was not found."));
        }

        var destAccount = await _accountRepository.GetByIdAsync(command.DestinationAccountId, cancellationToken);
        if (destAccount is null)
        {
            return Result.Failure<(Guid, Guid)>(Error.NotFound("Account.DestinationNotFound", "Destination account was not found."));
        }

        var quoteResult = await ValidateAmountsAsync(sourceAccount, command.SourceAmount, destAccount,
            command.DestinationAmount, command.AppliedRate, command.RateSource, _currentUserContext.UserId!.Value, cancellationToken);
        if (quoteResult.IsFailure) return Result.Failure<(Guid, Guid)>(quoteResult.Error);
        var quote = quoteResult.Value;
        var sourceMoney = Money.Of(command.SourceAmount, sourceAccount.Currency);
        var destMoney = Money.Of(command.DestinationAmount, destAccount.Currency);

        var (outflow, inflow) = Transaction.CreateTransfer(
            _currentUserContext.UserId!.Value,
            command.SourceAccountId,
            sourceMoney,
            command.DestinationAccountId,
            destMoney,
            command.OccurredAt,
            quote.AppliedRate,
            quote.RateSource,
            command.Description,
            _clock.UtcNow);

        await _transactionRepository.AddRangeAsync([outflow, inflow], cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return Result.Success((outflow.Id, inflow.Id));
    }

    public async Task<Result<TransferFxQuote>> ValidateAmountsAsync(
        Account sourceAccount, decimal sourceAmount, Account destinationAccount, decimal destinationAmount,
        decimal? requestedRate, string? requestedRateSource, Guid userId, CancellationToken cancellationToken = default)
    {
        if (sourceAmount <= 0 || destinationAmount <= 0 ||
            sourceAmount != decimal.Round(sourceAmount, sourceAccount.Currency.DecimalPlaces, MidpointRounding.AwayFromZero) ||
            destinationAmount != decimal.Round(destinationAmount, destinationAccount.Currency.DecimalPlaces, MidpointRounding.AwayFromZero))
            return Result.Failure<TransferFxQuote>(Error.Validation("Transfer.InvalidNativeAmount", "Transfer amounts must be positive and use the precision supported by each account currency."));

        var sourceCurrency = sourceAccount.Currency.Code;
        var destinationCurrency = destinationAccount.Currency.Code;
        if (sourceCurrency == destinationCurrency)
        {
            if (sourceAmount != destinationAmount || requestedRate.HasValue || !string.IsNullOrWhiteSpace(requestedRateSource))
                return Result.Failure<TransferFxQuote>(Error.Validation("Transfer.SameCurrencyMismatch", "Same-currency transfers require equal amounts and no exchange-rate metadata."));
            return Result.Success(new TransferFxQuote(null, null));
        }

        if ((sourceCurrency is "USD" or "USDT") && (destinationCurrency is "USD" or "USDT"))
        {
            if (sourceAmount != destinationAmount || requestedRate.HasValue || !string.IsNullOrWhiteSpace(requestedRateSource))
                return Result.Failure<TransferFxQuote>(Error.Validation("Transfer.DollarProxyMismatch", "USD and USDT transfers use the 1:1 proxy and require equal amounts."));
            return Result.Success(new TransferFxQuote(1m, "USD/USDT parity"));
        }

        var isBobToDollar = sourceCurrency == "BOB" && (destinationCurrency is "USD" or "USDT");
        var isDollarToBob = (sourceCurrency is "USD" or "USDT") && destinationCurrency == "BOB";
        if (!isBobToDollar && !isDollarToBob)
            return Result.Failure<TransferFxQuote>(Error.Validation("Transfer.UnsupportedCurrencyPair", "No supported BOB/USD exchange-rate convention exists for this currency pair."));

        decimal rate;
        string rateSource;
        if (requestedRate.HasValue || !string.IsNullOrWhiteSpace(requestedRateSource))
        {
            if (requestedRate is not > 0 || !StringComparer.Ordinal.Equals(requestedRateSource, "Manual"))
                return Result.Failure<TransferFxQuote>(Error.Validation("Transfer.UnverifiedRate", "Client-supplied exchange rates must be positive and explicitly labeled Manual."));
            rate = requestedRate.Value;
            rateSource = "Manual";
        }
        else
        {
            if (_rateSnapshotProvider is null)
                return Result.Failure<TransferFxQuote>(Error.Validation("Transfer.RateUnavailable", "A server exchange-rate snapshot is required for this transfer."));

            var side = isBobToDollar ? RateSide.Buy : RateSide.Sell;
            var snapshot = await _rateSnapshotProvider.GetSnapshotAsync("BOB", "USD", side, userId, cancellationToken);
            if (snapshot is null)
            {
                var error = isDollarToBob
                    ? Error.Validation("Transfer.SellRateUnavailable", "No sell-side exchange-rate snapshot is available for this currency pair.")
                    : Error.Validation("Transfer.RateUnavailable", "No exchange-rate snapshot is available for this currency pair.");
                return Result.Failure<TransferFxQuote>(error);
            }
            if (snapshot.AppliedRate <= 0)
                return Result.Failure<TransferFxQuote>(Error.Validation("Transfer.RateUnavailable", "The exchange-rate snapshot is not positive."));
            if (!StringComparer.Ordinal.Equals(snapshot.RateSource, "Manual") && snapshot.Side != side)
            {
                var error = isDollarToBob
                    ? Error.Validation("Transfer.SellRateUnavailable", "The exchange-rate provider did not return an explicit sell-side snapshot.")
                    : Error.Validation("Transfer.RateUnavailable", "The exchange-rate provider did not return an explicit buy-side snapshot.");
                return Result.Failure<TransferFxQuote>(error);
            }
            rate = snapshot.AppliedRate;
            rateSource = snapshot.RateSource;
        }

        rate = decimal.Round(rate, 6, MidpointRounding.AwayFromZero);
        if (rate <= 0)
            return Result.Failure<TransferFxQuote>(Error.Validation("Transfer.InvalidRate", "Exchange rate must remain positive at ledger precision."));

        var expectedDestination = sourceCurrency == "BOB"
            ? decimal.Round(sourceAmount / rate, destinationAccount.Currency.DecimalPlaces, MidpointRounding.AwayFromZero)
            : decimal.Round(sourceAmount * rate, destinationAccount.Currency.DecimalPlaces, MidpointRounding.AwayFromZero);
        if (expectedDestination != destinationAmount)
            return Result.Failure<TransferFxQuote>(Error.Validation("Transfer.RateAmountMismatch", "Destination amount does not match the selected exchange rate and currency precision."));

        return Result.Success(new TransferFxQuote(rate, rateSource));
    }
}

public sealed record TransferFxQuote(decimal? AppliedRate, string? RateSource);
