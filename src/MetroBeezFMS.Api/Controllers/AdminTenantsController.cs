using MetroBeezFMS.Application;
using MetroBeezFMS.Domain;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace MetroBeezFMS.Api.Controllers;

[ApiController]
[Route("api/admin/tenants")]
[Authorize(Roles = Roles.SuperAdmin)]
public sealed class AdminTenantsController : ControllerBase
{
    private readonly ITenantAdministrationService _tenantAdministrationService;

    public AdminTenantsController(ITenantAdministrationService tenantAdministrationService)
    {
        _tenantAdministrationService = tenantAdministrationService;
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<AdminTenantDto>>> List(CancellationToken cancellationToken)
    {
        var tenants = await _tenantAdministrationService.ListTenantsAsync(cancellationToken);
        return Ok(tenants);
    }

    [HttpGet("{tenantId:guid}")]
    public async Task<ActionResult<AdminTenantDetailDto>> Get(Guid tenantId, CancellationToken cancellationToken)
    {
        try
        {
            var tenant = await _tenantAdministrationService.GetTenantDetailAsync(tenantId, cancellationToken);
            return Ok(tenant);
        }
        catch (KeyNotFoundException)
        {
            return NotFound("Tenant was not found.");
        }
    }

    [HttpPut("{tenantId:guid}/status")]
    public async Task<ActionResult<AdminTenantDto>> UpdateStatus(Guid tenantId, UpdateTenantStatusRequest request, CancellationToken cancellationToken)
    {
        try
        {
            var tenant = await _tenantAdministrationService.UpdateStatusAsync(tenantId, request.Status, cancellationToken);
            return Ok(tenant);
        }
        catch (KeyNotFoundException)
        {
            return NotFound("Tenant was not found.");
        }
    }

    [HttpDelete("{tenantId:guid}")]
    public async Task<ActionResult> Delete(Guid tenantId, CancellationToken cancellationToken)
    {
        try
        {
            await _tenantAdministrationService.DeleteTenantAsync(tenantId, cancellationToken);
            return NoContent();
        }
        catch (KeyNotFoundException)
        {
            return NotFound("Tenant was not found.");
        }
    }
}
