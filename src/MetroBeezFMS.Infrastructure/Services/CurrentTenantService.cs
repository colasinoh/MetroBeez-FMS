using System.Security.Claims;
using MetroBeezFMS.Application;
using Microsoft.AspNetCore.Http;

namespace MetroBeezFMS.Infrastructure.Services;

public sealed class CurrentTenantService : ICurrentTenantService
{
    private readonly IHttpContextAccessor _httpContextAccessor;

    public CurrentTenantService(IHttpContextAccessor httpContextAccessor)
    {
        _httpContextAccessor = httpContextAccessor;
    }

    public Guid? TenantId
    {
        get
        {
            var httpContext = _httpContextAccessor.HttpContext;
            var claimValue = httpContext?.User.FindFirstValue("tenant_id");
            if (Guid.TryParse(claimValue, out var claimTenantId))
            {
                return claimTenantId;
            }

            var headerValue = httpContext?.Request.Headers["X-Tenant-Id"].FirstOrDefault();
            return Guid.TryParse(headerValue, out var headerTenantId) ? headerTenantId : null;
        }
    }

    public Guid? UserId
    {
        get
        {
            var value = _httpContextAccessor.HttpContext?.User.FindFirstValue(ClaimTypes.NameIdentifier)
                ?? _httpContextAccessor.HttpContext?.User.FindFirstValue("sub");
            return Guid.TryParse(value, out var userId) ? userId : null;
        }
    }

    public string? UserEmail => _httpContextAccessor.HttpContext?.User.FindFirstValue(ClaimTypes.Email);

    public bool IsInRole(string role)
    {
        return _httpContextAccessor.HttpContext?.User.IsInRole(role) ?? false;
    }
}
