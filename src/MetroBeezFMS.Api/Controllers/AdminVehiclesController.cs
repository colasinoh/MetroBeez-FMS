using MetroBeezFMS.Application;
using MetroBeezFMS.Domain;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace MetroBeezFMS.Api.Controllers;

[ApiController]
[Route("api/admin/vehicles")]
[Authorize(Roles = Roles.SuperAdmin)]
public sealed class AdminVehiclesController : ControllerBase
{
    private readonly ITenantAdministrationService _tenantAdministrationService;

    public AdminVehiclesController(ITenantAdministrationService tenantAdministrationService)
    {
        _tenantAdministrationService = tenantAdministrationService;
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<AdminRegisteredVehicleDto>>> List(CancellationToken cancellationToken)
    {
        var vehicles = await _tenantAdministrationService.ListRegisteredVehiclesAsync(cancellationToken);
        return Ok(vehicles);
    }
}
