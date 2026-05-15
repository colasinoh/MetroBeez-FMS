using MetroBeezFMS.Application;
using MetroBeezFMS.Domain;
using MetroBeezFMS.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace MetroBeezFMS.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/maintenance")]
public sealed class MaintenanceController : ControllerBase
{
    private readonly TenantDbContextFactory _tenantDbContextFactory;

    public MaintenanceController(TenantDbContextFactory tenantDbContextFactory)
    {
        _tenantDbContextFactory = tenantDbContextFactory;
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<MaintenanceScheduleDto>>> List([FromQuery] MaintenanceStatus? status, CancellationToken cancellationToken)
    {
        await using var db = await _tenantDbContextFactory.CreateAsync(cancellationToken);
        var query = db.MaintenanceSchedules.AsNoTracking().Include(x => x.Vehicle).AsQueryable();
        if (status is not null)
        {
            query = query.Where(x => x.Status == status);
        }

        return Ok(await query.OrderBy(x => x.DueDate).Select(x => x.ToDto()).ToListAsync(cancellationToken));
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<MaintenanceScheduleDto>> Get(Guid id, CancellationToken cancellationToken)
    {
        await using var db = await _tenantDbContextFactory.CreateAsync(cancellationToken);
        var schedule = await db.MaintenanceSchedules.AsNoTracking().Include(x => x.Vehicle).FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
        return schedule is null ? NotFound() : Ok(schedule.ToDto());
    }

    [HttpPost]
    [Authorize(Roles = $"{Roles.OwnerAdmin},{Roles.Manager}")]
    public async Task<ActionResult<MaintenanceScheduleDto>> Create(MaintenanceScheduleUpsertDto request, CancellationToken cancellationToken)
    {
        await using var db = await _tenantDbContextFactory.CreateAsync(cancellationToken);
        var schedule = new MaintenanceSchedule { VehicleId = request.VehicleId };
        Apply(schedule, request);
        db.MaintenanceSchedules.Add(schedule);
        await db.SaveChangesAsync(cancellationToken);

        var created = await db.MaintenanceSchedules.Include(x => x.Vehicle).FirstAsync(x => x.Id == schedule.Id, cancellationToken);
        return CreatedAtAction(nameof(Get), new { id = schedule.Id }, created.ToDto());
    }

    [HttpPut("{id:guid}")]
    [Authorize(Roles = $"{Roles.OwnerAdmin},{Roles.Manager}")]
    public async Task<ActionResult<MaintenanceScheduleDto>> Update(Guid id, MaintenanceScheduleUpsertDto request, CancellationToken cancellationToken)
    {
        await using var db = await _tenantDbContextFactory.CreateAsync(cancellationToken);
        var schedule = await db.MaintenanceSchedules.FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
        if (schedule is null)
        {
            return NotFound();
        }

        Apply(schedule, request);
        await db.SaveChangesAsync(cancellationToken);
        var updated = await db.MaintenanceSchedules.Include(x => x.Vehicle).FirstAsync(x => x.Id == schedule.Id, cancellationToken);
        return Ok(updated.ToDto());
    }

    [HttpPost("{id:guid}/complete")]
    [Authorize(Roles = $"{Roles.OwnerAdmin},{Roles.Manager}")]
    public async Task<ActionResult> Complete(Guid id, [FromBody] MaintenanceRecord record, CancellationToken cancellationToken)
    {
        await using var db = await _tenantDbContextFactory.CreateAsync(cancellationToken);
        var schedule = await db.MaintenanceSchedules.FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
        if (schedule is null)
        {
            return NotFound();
        }

        schedule.Status = MaintenanceStatus.Completed;
        record.MaintenanceScheduleId = schedule.Id;
        record.VehicleId = schedule.VehicleId;
        db.MaintenanceRecords.Add(record);
        await db.SaveChangesAsync(cancellationToken);
        return NoContent();
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Roles = Roles.OwnerAdmin)]
    public async Task<ActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        await using var db = await _tenantDbContextFactory.CreateAsync(cancellationToken);
        var schedule = await db.MaintenanceSchedules.FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
        if (schedule is null)
        {
            return NotFound();
        }

        db.MaintenanceSchedules.Remove(schedule);
        await db.SaveChangesAsync(cancellationToken);
        return NoContent();
    }

    private static void Apply(MaintenanceSchedule schedule, MaintenanceScheduleUpsertDto request)
    {
        schedule.VehicleId = request.VehicleId;
        schedule.Title = string.IsNullOrWhiteSpace(request.Title) ? "PMS" : request.Title.Trim();
        schedule.DueDate = request.DueDate;
        schedule.DueOdometer = request.DueOdometer;
        schedule.ReminderDaysBefore = request.ReminderDaysBefore;
        schedule.ReminderKilometersBefore = request.ReminderKilometersBefore;
        schedule.Status = request.Status;
        schedule.VendorShop = request.VendorShop;
        schedule.EstimatedCost = request.EstimatedCost;
        schedule.Notes = request.Notes;
    }
}
