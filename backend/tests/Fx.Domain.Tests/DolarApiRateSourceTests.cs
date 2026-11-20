using System.Net;
using Billefy.Integrations.Fx.DolarApi;
using BuildingBlocks.Currencies;
using FluentAssertions;
using Xunit;

namespace Fx.Domain.Tests;

public class DolarApiRateSourceTests
{
    private class MockHttpMessageHandler : HttpMessageHandler
    {
        private readonly HttpStatusCode _statusCode;
        private readonly string _responseContent;

        public MockHttpMessageHandler(HttpStatusCode statusCode, string responseContent)
        {
            _statusCode = statusCode;
            _responseContent = responseContent;
        }

        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            var response = new HttpResponseMessage(_statusCode)
            {
                Content = new StringContent(_responseContent, System.Text.Encoding.UTF8, "application/json")
            };
            return Task.FromResult(response);
        }
    }

    [Fact]
    public async Task GetRateAsync_ValidResponse_ShouldReturnExchangeRateWithBuyAndSell()
    {
        var json = """
        {
            "moneda": "USD",
            "casa": "binance",
            "nombre": "Binance",
            "compra": 11.96,
            "venta": 12.00,
            "fechaActualizacion": "2026-10-25T21:01:09.047Z"
        }
        """;

        var handler = new MockHttpMessageHandler(HttpStatusCode.OK, json);
        var httpClient = new HttpClient(handler);
        var rateSource = new DolarApiRateSource(httpClient);

        var rate = await rateSource.GetRateAsync(Currency.BOB, Currency.USD);

        rate.Should().NotBeNull();
        rate!.BuyRate.Should().Be(11.96m);
        rate.SellRate.Should().Be(12.00m);
        rate.Currency.Should().Be(Currency.BOB);
        rate.BaseCurrency.Should().Be(Currency.USD);
        rate.Source.Should().Be("DolarApi:BinanceP2P");
        rate.FetchedAt.Should().Be(DateTime.Parse("2026-10-25T21:01:09.047Z").ToUniversalTime());
    }

    [Fact]
    public async Task GetRateAsync_HttpError_ShouldReturnNullGracefully()
    {
        var handler = new MockHttpMessageHandler(HttpStatusCode.InternalServerError, "Server Error");
        var httpClient = new HttpClient(handler);
        var rateSource = new DolarApiRateSource(httpClient);

        var rate = await rateSource.GetRateAsync(Currency.BOB, Currency.USD);

        rate.Should().BeNull();
    }
}
