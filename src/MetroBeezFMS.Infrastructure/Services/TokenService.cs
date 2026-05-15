using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using MetroBeezFMS.Application;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;

namespace MetroBeezFMS.Infrastructure.Services;

public sealed class TokenService : ITokenService
{
    private readonly JwtTokenOptions _options;

    public TokenService(IOptions<JwtTokenOptions> options)
    {
        _options = options.Value;
    }

    public string CreateToken(TokenUser user, Domain.TenantUser tenantUser, string tenantName)
    {
        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new(ClaimTypes.Email, user.Email),
            new(ClaimTypes.Name, user.FullName),
            new("tenant_id", tenantUser.TenantId.ToString()),
            new("tenant_name", tenantName),
            new(ClaimTypes.Role, tenantUser.Role),
            new("role", tenantUser.Role)
        };

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_options.Secret));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
        var token = new JwtSecurityToken(
            issuer: _options.Issuer,
            audience: _options.Audience,
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(_options.ExpiresMinutes),
            signingCredentials: credentials);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
