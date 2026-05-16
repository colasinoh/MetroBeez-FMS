using System.Security.Claims;
using MetroBeezFMS.Domain;
using MetroBeezFMS.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace MetroBeezFMS.Api.Middleware;

public sealed class TenantStatusMiddleware
{
    private readonly RequestDelegate _next;

    public TenantStatusMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public async Task InvokeAsync(HttpContext context, CentralDbContext centralDbContext)
    {
        if (context.User.Identity?.IsAuthenticated == true && !context.User.IsInRole(Roles.SuperAdmin))
        {
            var tenantClaim = context.User.FindFirstValue("tenant_id");
            if (Guid.TryParse(tenantClaim, out var tenantId))
            {
                var tenantStatus = await centralDbContext.Tenants
                    .AsNoTracking()
                    .Where(x => x.Id == tenantId)
                    .Select(x => (TenantStatus?)x.Status)
                    .FirstOrDefaultAsync(context.RequestAborted);

                if (tenantStatus != TenantStatus.Active)
                {
                    context.Response.StatusCode = StatusCodes.Status403Forbidden;
                    await context.Response.WriteAsJsonAsync(new { detail = "This tenant is not active." }, context.RequestAborted);
                    return;
                }
            }
        }

        await _next(context);
    }
}
