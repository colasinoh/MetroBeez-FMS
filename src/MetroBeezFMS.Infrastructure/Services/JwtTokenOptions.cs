using System.Security.Cryptography;
using Microsoft.Extensions.Configuration;

namespace MetroBeezFMS.Infrastructure.Services;

public sealed class JwtTokenOptions
{
    private static readonly Lazy<string> EphemeralSecret = new(() => Convert.ToBase64String(RandomNumberGenerator.GetBytes(64)));

    public string Secret { get; set; } = "";
    public string Issuer { get; set; } = "MetroBeezFMS";
    public string Audience { get; set; } = "MetroBeezFMS.Web";
    public int ExpiresMinutes { get; set; } = 720;

    public static JwtTokenOptions FromConfiguration(IConfiguration configuration)
    {
        var configuredSecret = FirstNonEmpty(configuration["JWT_SECRET"], configuration["Jwt:Secret"]);
        var isProduction = string.Equals(configuration["ASPNETCORE_ENVIRONMENT"], "Production", StringComparison.OrdinalIgnoreCase);
        if (isProduction && configuredSecret is null)
        {
            throw new InvalidOperationException("JWT_SECRET must be configured in production.");
        }

        return new JwtTokenOptions
        {
            Secret = configuredSecret ?? EphemeralSecret.Value,
            Issuer = configuration["Jwt:Issuer"] ?? "MetroBeezFMS",
            Audience = configuration["Jwt:Audience"] ?? "MetroBeezFMS.Web",
            ExpiresMinutes = int.TryParse(configuration["Jwt:ExpiresMinutes"], out var minutes) ? minutes : 720
        };
    }

    private static string? FirstNonEmpty(params string?[] values)
    {
        return values.FirstOrDefault(value => !string.IsNullOrWhiteSpace(value));
    }
}
