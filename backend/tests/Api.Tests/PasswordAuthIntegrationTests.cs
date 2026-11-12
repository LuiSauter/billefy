using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Api.Tests;
using FluentAssertions;
using Identity.Contracts;
using Identity.Infrastructure;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace Api.Tests;

public sealed class PasswordAuthIntegrationTests
{
    [Fact]
    public async Task Register_ValidCredentials_CreatesUserAndReturnsTokens()
    {
        using var factory = new CustomWebApplicationFactory();
        using var client = factory.CreateClient();

        var request = new RegisterWithPasswordRequest(
            "Test Architect",
            $"architect_{Guid.NewGuid():N}@billefy.test",
            "Secure@Pass123",
            "BOB");

        using var response = await client.PostAsJsonAsync("/v1/auth/register", request);
        response.StatusCode.Should().Be(HttpStatusCode.Created);

        var auth = await response.Content.ReadFromJsonAsync<AuthResponseDto>();
        auth.Should().NotBeNull();
        auth!.AccessToken.Should().NotBeNullOrWhiteSpace();
        auth.RefreshToken.Should().NotBeNullOrWhiteSpace();
        auth.User.Email.Should().Be(request.Email.ToLowerInvariant());
        auth.User.FullName.Should().Be("Test Architect");
        auth.User.PreferredCurrency.Should().Be("BOB");

        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<IdentityDbContext>();
        var user = await db.Users.SingleAsync(u => u.Email == request.Email.ToLowerInvariant());
        user.PasswordHash.Should().NotBeNullOrWhiteSpace();
        user.PasswordHash.Should().StartWith("v1.");
        user.PasswordHash.Should().NotContain("Secure@Pass123");
    }

    [Theory]
    [InlineData("short", "Length under 8")]
    [InlineData("nouppercase123!", "No uppercase")]
    [InlineData("NOLOWERCASENUMBERS!", "No digit")]
    [InlineData("NoSpecialChars123", "No symbol")]
    public async Task Register_WeakPassword_ReturnsBadRequest(string weakPassword, string reason)
    {
        using var factory = new CustomWebApplicationFactory();
        using var client = factory.CreateClient();

        var request = new RegisterWithPasswordRequest(
            "Weak User",
            $"weak_{Guid.NewGuid():N}@billefy.test",
            weakPassword,
            "BOB");

        using var response = await client.PostAsJsonAsync("/v1/auth/register", request);
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest, reason);
    }

    [Fact]
    public async Task Register_DuplicateEmail_ReturnsConflict()
    {
        using var factory = new CustomWebApplicationFactory();
        using var client = factory.CreateClient();

        var email = $"dup_{Guid.NewGuid():N}@billefy.test";
        var request = new RegisterWithPasswordRequest("First", email, "Secure@Pass123", "BOB");

        using var first = await client.PostAsJsonAsync("/v1/auth/register", request);
        first.StatusCode.Should().Be(HttpStatusCode.Created);

        using var second = await client.PostAsJsonAsync("/v1/auth/register", request);
        second.StatusCode.Should().Be(HttpStatusCode.Conflict);
    }

    [Fact]
    public async Task Login_ValidCredentials_ReturnsTokens()
    {
        using var factory = new CustomWebApplicationFactory();
        using var client = factory.CreateClient();

        var email = $"login_{Guid.NewGuid():N}@billefy.test";
        var password = "My@Password2026";
        var reg = new RegisterWithPasswordRequest("Login User", email, password, "USD");

        using var regResponse = await client.PostAsJsonAsync("/v1/auth/register", reg);
        regResponse.StatusCode.Should().Be(HttpStatusCode.Created);

        var loginReq = new LoginWithPasswordRequest(email, password);
        using var loginResponse = await client.PostAsJsonAsync("/v1/auth/login", loginReq);
        loginResponse.StatusCode.Should().Be(HttpStatusCode.OK);

        var auth = await loginResponse.Content.ReadFromJsonAsync<AuthResponseDto>();
        auth.Should().NotBeNull();
        auth!.AccessToken.Should().NotBeNullOrWhiteSpace();
        auth.User.Email.Should().Be(email.ToLowerInvariant());
    }

    [Fact]
    public async Task Login_WrongPassword_ReturnsUnauthorized()
    {
        using var factory = new CustomWebApplicationFactory();
        using var client = factory.CreateClient();

        var email = $"wrong_{Guid.NewGuid():N}@billefy.test";
        var reg = new RegisterWithPasswordRequest("Wrong Pass User", email, "Valid@Pass123", "BOB");
        using var regResponse = await client.PostAsJsonAsync("/v1/auth/register", reg);
        regResponse.StatusCode.Should().Be(HttpStatusCode.Created);

        var loginReq = new LoginWithPasswordRequest(email, "Wrong@Pass999");
        using var loginResponse = await client.PostAsJsonAsync("/v1/auth/login", loginReq);
        loginResponse.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task Login_NonExistentEmail_ReturnsUnauthorized()
    {
        using var factory = new CustomWebApplicationFactory();
        using var client = factory.CreateClient();

        var loginReq = new LoginWithPasswordRequest("nobody@billefy.test", "Some@Pass123");
        using var loginResponse = await client.PostAsJsonAsync("/v1/auth/login", loginReq);
        loginResponse.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }
}
