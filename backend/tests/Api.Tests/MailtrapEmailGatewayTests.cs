using System.Net;
using System.Net.Http.Headers;
using FluentAssertions;
using Microsoft.Extensions.Logging.Abstractions;
using Notifications.Infrastructure;
using Xunit;

namespace Api.Tests;

public class MailtrapEmailGatewayTests
{
    private sealed class RecordingHandler(HttpStatusCode statusCode, string responseBody) : HttpMessageHandler
    {
        public HttpRequestMessage? LastRequest { get; private set; }
        public string? LastBody { get; private set; }

        protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            LastRequest = request;
            LastBody = request.Content is null ? null : await request.Content.ReadAsStringAsync(cancellationToken);
            return new HttpResponseMessage(statusCode) { Content = new StringContent(responseBody) };
        }
    }

    private static MailtrapOptions Configured() => new()
    {
        ServiceUrl = "https://send.api.mailtrap.io/api/send",
        FromEmail = "no-reply@devhooh.com",
        SecretKey = "test-secret-key",
        FromName = "Billefy"
    };

    [Fact]
    public async Task SendEmailAsync_Success_PostsExpectedPayloadAndAuthHeaderAndReturnsTrue()
    {
        var handler = new RecordingHandler(HttpStatusCode.OK, "{}");
        var gateway = new MailtrapEmailGateway(new HttpClient(handler), Configured(), NullLogger<MailtrapEmailGateway>.Instance);

        var sent = await gateway.SendEmailAsync("invitee@example.test", "Te invitaron", "<p>Hola</p>");

        sent.Should().BeTrue();
        handler.LastRequest.Should().NotBeNull();
        handler.LastRequest!.RequestUri.Should().Be(new Uri("https://send.api.mailtrap.io/api/send"));
        handler.LastRequest.Headers.Authorization.Should().Be(new AuthenticationHeaderValue("Bearer", "test-secret-key"));
        handler.LastBody.Should().Contain("\"email\":\"no-reply@devhooh.com\"")
            .And.Contain("\"name\":\"Billefy\"")
            .And.Contain("\"email\":\"invitee@example.test\"")
            .And.Contain("\"subject\":\"Te invitaron\"");
        handler.LastBody.Should().Contain("Hola");
    }

    [Fact]
    public async Task SendEmailAsync_GatewayRespondsWithError_ReturnsFalse()
    {
        var handler = new RecordingHandler(HttpStatusCode.Unauthorized, "{\"error\":\"invalid key\"}");
        var gateway = new MailtrapEmailGateway(new HttpClient(handler), Configured(), NullLogger<MailtrapEmailGateway>.Instance);

        var sent = await gateway.SendEmailAsync("invitee@example.test", "Subject", "Body");

        sent.Should().BeFalse();
    }

    [Theory]
    [InlineData("", "no-reply@devhooh.com", "secret")]
    [InlineData("https://send.api.mailtrap.io/api/send", "", "secret")]
    [InlineData("https://send.api.mailtrap.io/api/send", "no-reply@devhooh.com", "")]
    public async Task SendEmailAsync_MissingConfiguration_ReturnsFalseWithoutCallingGateway(string serviceUrl, string fromEmail, string secretKey)
    {
        var handler = new RecordingHandler(HttpStatusCode.OK, "{}");
        var options = new MailtrapOptions { ServiceUrl = serviceUrl, FromEmail = fromEmail, SecretKey = secretKey };
        var gateway = new MailtrapEmailGateway(new HttpClient(handler), options, NullLogger<MailtrapEmailGateway>.Instance);

        var sent = await gateway.SendEmailAsync("invitee@example.test", "Subject", "Body");

        sent.Should().BeFalse();
        handler.LastRequest.Should().BeNull();
    }
}
