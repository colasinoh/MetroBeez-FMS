using MetroBeezFMS.Application;
using MetroBeezFMS.Domain;
using MetroBeezFMS.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace MetroBeezFMS.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/drivers")]
public sealed class DriversController : ControllerBase
{
    private readonly TenantDbContextFactory _tenantDbContextFactory;

    public DriversController(TenantDbContextFactory tenantDbContextFactory)
    {
        _tenantDbContextFactory = tenantDbContextFactory;
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<DriverListDto>>> List([FromQuery] string? search, [FromQuery] DriverStatus? status, CancellationToken cancellationToken)
    {
        await using var db = await _tenantDbContextFactory.CreateAsync(cancellationToken);
        var query = db.Drivers.AsNoTracking();
        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim().ToLower();
            query = query.Where(x => x.FullName.ToLower().Contains(term) || (x.Email != null && x.Email.ToLower().Contains(term)));
        }

        if (status is not null)
        {
            query = query.Where(x => x.Status == status);
        }

        return Ok(await query.OrderBy(x => x.FullName).Select(x => x.ToDto()).ToListAsync(cancellationToken));
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<DriverListDto>> Get(Guid id, CancellationToken cancellationToken)
    {
        await using var db = await _tenantDbContextFactory.CreateAsync(cancellationToken);
        var driver = await db.Drivers.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
        return driver is null ? NotFound() : Ok(driver.ToDto());
    }

    [HttpPost]
    [Authorize(Roles = $"{Roles.OwnerAdmin},{Roles.Manager}")]
    public async Task<ActionResult<DriverListDto>> Create(DriverUpsertDto request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.FullName))
        {
            return ValidationProblem("Driver full name is required.");
        }

        await using var db = await _tenantDbContextFactory.CreateAsync(cancellationToken);
        var driver = new Driver { FullName = request.FullName.Trim() };
        Apply(driver, request);
        db.Drivers.Add(driver);
        await db.SaveChangesAsync(cancellationToken);
        return CreatedAtAction(nameof(Get), new { id = driver.Id }, driver.ToDto());
    }

    [HttpPut("{id:guid}")]
    [Authorize(Roles = $"{Roles.OwnerAdmin},{Roles.Manager}")]
    public async Task<ActionResult<DriverListDto>> Update(Guid id, DriverUpsertDto request, CancellationToken cancellationToken)
    {
        await using var db = await _tenantDbContextFactory.CreateAsync(cancellationToken);
        var driver = await db.Drivers.FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
        if (driver is null)
        {
            return NotFound();
        }

        Apply(driver, request);
        await db.SaveChangesAsync(cancellationToken);
        return Ok(driver.ToDto());
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Roles = Roles.OwnerAdmin)]
    public async Task<ActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        await using var db = await _tenantDbContextFactory.CreateAsync(cancellationToken);
        var driver = await db.Drivers.FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
        if (driver is null)
        {
            return NotFound();
        }

        db.Drivers.Remove(driver);
        await db.SaveChangesAsync(cancellationToken);
        return NoContent();
    }

    private static void Apply(Driver driver, DriverUpsertDto request)
    {
        driver.FullName = request.FullName.Trim();
        driver.Address = request.Address;
        driver.ContactNumber = request.ContactNumber;
        driver.Email = request.Email;
        driver.EmergencyContact = request.EmergencyContact;
        driver.LicenseNumber = request.LicenseNumber;
        driver.LicenseTypeRestrictions = request.LicenseTypeRestrictions;
        driver.LicenseExpirationDate = request.LicenseExpirationDate;
        driver.Status = request.Status;
        driver.Notes = request.Notes;
    }
}
