using MetroBeezFMS.Application;
using MetroBeezFMS.Domain;
using MetroBeezFMS.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace MetroBeezFMS.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/vehicles")]
public sealed class VehiclesController : ControllerBase
{
    private readonly TenantDbContextFactory _tenantDbContextFactory;

    public VehiclesController(TenantDbContextFactory tenantDbContextFactory)
    {
        _tenantDbContextFactory = tenantDbContextFactory;
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<VehicleListDto>>> List([FromQuery] string? search, [FromQuery] VehicleStatus? status, CancellationToken cancellationToken)
    {
        await using var db = await _tenantDbContextFactory.CreateAsync(cancellationToken);
        var query = db.Vehicles.AsNoTracking();
        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim().ToLower();
            query = query.Where(x => x.PlateNumber.ToLower().Contains(term) || x.Make.ToLower().Contains(term) || x.Model.ToLower().Contains(term));
        }

        if (status is not null)
        {
            query = query.Where(x => x.Status == status);
        }

        return Ok(await query.OrderBy(x => x.PlateNumber).Select(x => x.ToDto()).ToListAsync(cancellationToken));
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<VehicleListDto>> Get(Guid id, CancellationToken cancellationToken)
    {
        await using var db = await _tenantDbContextFactory.CreateAsync(cancellationToken);
        var vehicle = await db.Vehicles.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
        return vehicle is null ? NotFound() : Ok(vehicle.ToDto());
    }

    [HttpPost]
    [Authorize(Roles = $"{Roles.OwnerAdmin},{Roles.Manager}")]
    public async Task<ActionResult<VehicleListDto>> Create(VehicleUpsertDto request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.PlateNumber) || string.IsNullOrWhiteSpace(request.Make) || string.IsNullOrWhiteSpace(request.Model))
        {
            return ValidationProblem("Plate number, make, and model are required.");
        }

        await using var db = await _tenantDbContextFactory.CreateAsync(cancellationToken);
        var vehicle = new Vehicle { PlateNumber = request.PlateNumber.Trim(), Make = request.Make.Trim(), Model = request.Model.Trim() };
        Apply(vehicle, request);
        db.Vehicles.Add(vehicle);
        await db.SaveChangesAsync(cancellationToken);
        return CreatedAtAction(nameof(Get), new { id = vehicle.Id }, vehicle.ToDto());
    }

    [HttpPut("{id:guid}")]
    [Authorize(Roles = $"{Roles.OwnerAdmin},{Roles.Manager}")]
    public async Task<ActionResult<VehicleListDto>> Update(Guid id, VehicleUpsertDto request, CancellationToken cancellationToken)
    {
        await using var db = await _tenantDbContextFactory.CreateAsync(cancellationToken);
        var vehicle = await db.Vehicles.FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
        if (vehicle is null)
        {
            return NotFound();
        }

        Apply(vehicle, request);
        await db.SaveChangesAsync(cancellationToken);
        return Ok(vehicle.ToDto());
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Roles = Roles.OwnerAdmin)]
    public async Task<ActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        await using var db = await _tenantDbContextFactory.CreateAsync(cancellationToken);
        var vehicle = await db.Vehicles.FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
        if (vehicle is null)
        {
            return NotFound();
        }

        db.Vehicles.Remove(vehicle);
        await db.SaveChangesAsync(cancellationToken);
        return NoContent();
    }

    private static void Apply(Vehicle vehicle, VehicleUpsertDto request)
    {
        vehicle.PlateNumber = request.PlateNumber.Trim();
        vehicle.MvFileNumber = request.MvFileNumber;
        vehicle.EngineNumber = request.EngineNumber;
        vehicle.ChassisVinNumber = request.ChassisVinNumber;
        vehicle.Make = request.Make.Trim();
        vehicle.Model = request.Model.Trim();
        vehicle.SeriesVariant = request.SeriesVariant;
        vehicle.YearModel = request.YearModel;
        vehicle.Color = request.Color;
        vehicle.VehicleType = request.VehicleType;
        vehicle.BodyType = request.BodyType;
        vehicle.FuelType = request.FuelType;
        vehicle.PassengerCapacity = request.PassengerCapacity;
        vehicle.Classification = request.Classification;
        vehicle.GrossWeight = request.GrossWeight;
        vehicle.CurrentOdometer = request.CurrentOdometer;
        vehicle.OwnershipStatus = request.OwnershipStatus;
        vehicle.Status = request.Status;
        vehicle.Remarks = request.Remarks;
    }
}
