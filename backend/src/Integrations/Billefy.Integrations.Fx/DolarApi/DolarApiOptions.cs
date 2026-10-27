namespace Billefy.Integrations.Fx.DolarApi;

public sealed record DolarApiOptions
{
    public string RateSourceUrl { get; init; } = "https://bo.dolarapi.com/v1/dolares/binance";
}
