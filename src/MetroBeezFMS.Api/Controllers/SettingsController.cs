using MetroBeezFMS.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace MetroBeezFMS.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/settings")]
public sealed class SettingsController : ControllerBase
{
    private readonly TenantDbContextFactory _tenantDbContextFactory;

    public SettingsController(TenantDbContextFactory tenantDbContextFactory)
    {
        _tenantDbContextFactory = tenantDbContextFactory;
    }

    [HttpGet("company-profile")]
    public async Task<ActionResult> CompanyProfile(CancellationToken cancellationToken)
    {
        await using var db = await _tenantDbContextFactory.CreateAsync(cancellationToken);
        var profile = await db.CompanyProfiles.AsNoTracking().FirstOrDefaultAsync(cancellationToken);
        return profile is null ? NotFound() : Ok(profile);
    }
}
