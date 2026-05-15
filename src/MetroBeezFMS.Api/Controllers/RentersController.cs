using MetroBeezFMS.Application;
using MetroBeezFMS.Domain;
using MetroBeezFMS.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace MetroBeezFMS.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/renters")]
public sealed class RentersController : ControllerBase
{
    private readonly TenantDbContextFactory _tenantDbContextFactory;

    public RentersController(TenantDbContextFactory tenantDbContextFactory)
    {
        _tenantDbContextFactory = tenantDbContextFactory;
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<RenterListDto>>> List([FromQuery] string? search, [FromQuery] bool? watchlisted, CancellationToken cancellationToken)
    {
        await using var db = await _tenantDbContextFactory.CreateAsync(cancellationToken);
        var query = db.Renters.AsNoTracking();
        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim().ToLower();
            query = query.Where(x => x.FullName.ToLower().Contains(term) || (x.Email != null && x.Email.ToLower().Contains(term)));
        }

        if (watchlisted is not null)
        {
            query = query.Where(x => x.IsWatchlisted == watchlisted);
        }

        return Ok(await query.OrderBy(x => x.FullName).Select(x => x.ToDto()).ToListAsync(cancellationToken));
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<RenterListDto>> Get(Guid id, CancellationToken cancellationToken)
    {
        await using var db = await _tenantDbContextFactory.CreateAsync(cancellationToken);
        var renter = await db.Renters.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
        return renter is null ? NotFound() : Ok(renter.ToDto());
    }

    [HttpPost]
    [Authorize(Roles = $"{Roles.OwnerAdmin},{Roles.Manager}")]
    public async Task<ActionResult<RenterListDto>> Create(RenterUpsertDto request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.FullName))
        {
            return ValidationProblem("Renter full name is required.");
        }

        await using var db = await _tenantDbContextFactory.CreateAsync(cancellationToken);
        var renter = new Renter { FullName = request.FullName.Trim() };
        Apply(renter, request);
        db.Renters.Add(renter);
        await db.SaveChangesAsync(cancellationToken);
        return CreatedAtAction(nameof(Get), new { id = renter.Id }, renter.ToDto());
    }

    [HttpPut("{id:guid}")]
    [Authorize(Roles = $"{Roles.OwnerAdmin},{Roles.Manager}")]
    public async Task<ActionResult<RenterListDto>> Update(Guid id, RenterUpsertDto request, CancellationToken cancellationToken)
    {
        await using var db = await _tenantDbContextFactory.CreateAsync(cancellationToken);
        var renter = await db.Renters.FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
        if (renter is null)
        {
            return NotFound();
        }

        Apply(renter, request);
        await db.SaveChangesAsync(cancellationToken);
        return Ok(renter.ToDto());
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Roles = Roles.OwnerAdmin)]
    public async Task<ActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        await using var db = await _tenantDbContextFactory.CreateAsync(cancellationToken);
        var renter = await db.Renters.FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
        if (renter is null)
        {
            return NotFound();
        }

        db.Renters.Remove(renter);
        await db.SaveChangesAsync(cancellationToken);
        return NoContent();
    }

    private static void Apply(Renter renter, RenterUpsertDto request)
    {
        renter.FullName = request.FullName.Trim();
        renter.Address = request.Address;
        renter.ContactNumber = request.ContactNumber;
        renter.Email = request.Email;
        renter.Birthdate = request.Birthdate;
        renter.ValidIdType = request.ValidIdType;
        renter.ValidIdNumber = request.ValidIdNumber;
        renter.IdExpirationDate = request.IdExpirationDate;
        renter.DriverLicenseNumber = request.DriverLicenseNumber;
        renter.EmergencyContact = request.EmergencyContact;
        renter.IsWatchlisted = request.IsWatchlisted;
        renter.Notes = request.Notes;
    }
}
