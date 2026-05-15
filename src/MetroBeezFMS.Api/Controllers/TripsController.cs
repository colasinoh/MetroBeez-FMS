using MetroBeezFMS.Application;
using MetroBeezFMS.Domain;
using MetroBeezFMS.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace MetroBeezFMS.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/trips")]
public sealed class TripsController : ControllerBase
{
    private readonly TenantDbContextFactory _tenantDbContextFactory;
    private readonly ICurrentTenantService _currentTenant;

    public TripsController(TenantDbContextFactory tenantDbContextFactory, ICurrentTenantService currentTenant)
    {
        _tenantDbContextFactory = tenantDbContextFactory;
        _currentTenant = currentTenant;
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<TripListDto>>> List([FromQuery] TripStatus? status, CancellationToken cancellationToken)
    {
        await using var db = await _tenantDbContextFactory.CreateAsync(cancellationToken);
        var query = db.Trips
            .AsNoTracking()
            .Include(x => x.Renter)
            .Include(x => x.Vehicle)
            .Include(x => x.Driver)
            .AsQueryable();

        if (_currentTenant.IsInRole(Roles.Driver))
        {
            query = query.Where(x => x.Driver != null && (x.Driver.Email == _currentTenant.UserEmail || x.Driver.AppUserId == _currentTenant.UserId));
        }

        if (status is not null)
        {
            query = query.Where(x => x.Status == status);
        }

        return Ok(await query.OrderByDescending(x => x.StartDateTime).Select(x => x.ToDto()).ToListAsync(cancellationToken));
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<TripListDto>> Get(Guid id, CancellationToken cancellationToken)
    {
        await using var db = await _tenantDbContextFactory.CreateAsync(cancellationToken);
        var trip = await db.Trips
            .AsNoTracking()
            .Include(x => x.Renter)
            .Include(x => x.Vehicle)
            .Include(x => x.Driver)
            .FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
        if (trip is null)
        {
            return NotFound();
        }

        if (_currentTenant.IsInRole(Roles.Driver) && trip.Driver?.Email != _currentTenant.UserEmail && trip.Driver?.AppUserId != _currentTenant.UserId)
        {
            return Forbid();
        }

        return Ok(trip.ToDto());
    }

    [HttpPost]
    [Authorize(Roles = $"{Roles.OwnerAdmin},{Roles.Manager}")]
    public async Task<ActionResult<TripListDto>> Create(TripUpsertDto request, CancellationToken cancellationToken)
    {
        await using var db = await _tenantDbContextFactory.CreateAsync(cancellationToken);
        var trip = new Trip
        {
            TripNumber = await GenerateTripNumberAsync(db, cancellationToken),
            VehicleId = request.VehicleId,
            RenterId = request.RenterId
        };
        Apply(trip, request);
        trip.Recalculate();
        db.Trips.Add(trip);
        await db.SaveChangesAsync(cancellationToken);

        var created = await LoadTripAsync(db, trip.Id, cancellationToken);
        return CreatedAtAction(nameof(Get), new { id = trip.Id }, created!.ToDto());
    }

    [HttpPut("{id:guid}")]
    [Authorize(Roles = $"{Roles.OwnerAdmin},{Roles.Manager}")]
    public async Task<ActionResult<TripListDto>> Update(Guid id, TripUpsertDto request, CancellationToken cancellationToken)
    {
        await using var db = await _tenantDbContextFactory.CreateAsync(cancellationToken);
        var trip = await db.Trips.FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
        if (trip is null)
        {
            return NotFound();
        }

        Apply(trip, request);
        trip.Recalculate();
        await db.SaveChangesAsync(cancellationToken);

        var updated = await LoadTripAsync(db, trip.Id, cancellationToken);
        return Ok(updated!.ToDto());
    }

    [HttpPut("{id:guid}/start")]
    [Authorize(Roles = $"{Roles.OwnerAdmin},{Roles.Manager},{Roles.Driver}")]
    public async Task<ActionResult<TripListDto>> StartTrip(Guid id, TripStartRequest request, CancellationToken cancellationToken)
    {
        await using var db = await _tenantDbContextFactory.CreateAsync(cancellationToken);
        var trip = await db.Trips.Include(x => x.Vehicle).Include(x => x.Driver).FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
        if (trip is null)
        {
            return NotFound();
        }

        if (_currentTenant.IsInRole(Roles.Driver) && trip.Driver?.Email != _currentTenant.UserEmail && trip.Driver?.AppUserId != _currentTenant.UserId)
        {
            return Forbid();
        }

        trip.StartingOdometer = request.StartingOdometer;
        trip.Remarks = request.Remarks;
        trip.Status = TripStatus.Active;
        if (trip.Vehicle is not null)
        {
            trip.Vehicle.Status = VehicleStatus.Booked;
        }

        trip.Recalculate();
        await db.SaveChangesAsync(cancellationToken);
        var updated = await LoadTripAsync(db, trip.Id, cancellationToken);
        return Ok(updated!.ToDto());
    }

    [HttpPut("{id:guid}/complete")]
    [Authorize(Roles = $"{Roles.OwnerAdmin},{Roles.Manager},{Roles.Driver}")]
    public async Task<ActionResult<TripListDto>> CompleteTrip(Guid id, TripCompleteRequest request, CancellationToken cancellationToken)
    {
        await using var db = await _tenantDbContextFactory.CreateAsync(cancellationToken);
        var trip = await db.Trips
            .Include(x => x.Vehicle)
            .Include(x => x.Driver)
            .Include(x => x.Booking)
            .FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
        if (trip is null)
        {
            return NotFound();
        }

        if (_currentTenant.IsInRole(Roles.Driver) && trip.Driver?.Email != _currentTenant.UserEmail && trip.Driver?.AppUserId != _currentTenant.UserId)
        {
            return Forbid();
        }

        trip.EndDateTime = request.EndDateTime;
        trip.EndingOdometer = request.EndingOdometer;
        trip.FuelExpense = request.FuelExpense;
        trip.TollExpense = request.TollExpense;
        trip.ParkingExpense = request.ParkingExpense;
        trip.OtherExpenses = request.OtherExpenses;
        trip.DriverProceedCommission = request.DriverProceedCommission;
        trip.Remarks = request.Remarks;
        trip.Status = TripStatus.Completed;
        trip.PaymentStatus = trip.PaymentStatus == PaymentStatus.Unpaid ? PaymentStatus.Paid : trip.PaymentStatus;
        trip.Recalculate();

        if (trip.Vehicle is not null)
        {
            trip.Vehicle.CurrentOdometer = Math.Max(trip.Vehicle.CurrentOdometer, request.EndingOdometer);
            trip.Vehicle.Status = VehicleStatus.Available;
        }

        if (trip.Booking is not null)
        {
            trip.Booking.BookingStatus = BookingStatus.Completed;
        }

        await db.SaveChangesAsync(cancellationToken);
        var updated = await LoadTripAsync(db, trip.Id, cancellationToken);
        return Ok(updated!.ToDto());
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Roles = Roles.OwnerAdmin)]
    public async Task<ActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        await using var db = await _tenantDbContextFactory.CreateAsync(cancellationToken);
        var trip = await db.Trips.FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
        if (trip is null)
        {
            return NotFound();
        }

        db.Trips.Remove(trip);
        await db.SaveChangesAsync(cancellationToken);
        return NoContent();
    }

    private static void Apply(Trip trip, TripUpsertDto request)
    {
        trip.BookingId = request.BookingId;
        trip.VehicleId = request.VehicleId;
        trip.DriverId = request.DriverId;
        trip.RenterId = request.RenterId;
        trip.TripType = request.TripType;
        trip.StartDateTime = request.StartDateTime;
        trip.EndDateTime = request.EndDateTime;
        trip.StartingOdometer = request.StartingOdometer;
        trip.EndingOdometer = request.EndingOdometer;
        trip.FuelExpense = request.FuelExpense;
        trip.TollExpense = request.TollExpense;
        trip.ParkingExpense = request.ParkingExpense;
        trip.OtherExpenses = request.OtherExpenses;
        trip.GrossRevenue = request.GrossRevenue;
        trip.DriverProceedCommission = request.DriverProceedCommission;
        trip.PaymentMethod = request.PaymentMethod;
        trip.PaymentStatus = request.PaymentStatus;
        trip.Remarks = request.Remarks;
        trip.Status = request.Status;
    }

    private static async Task<string> GenerateTripNumberAsync(TenantDbContext db, CancellationToken cancellationToken)
    {
        var count = await db.Trips.IgnoreQueryFilters().CountAsync(cancellationToken) + 1;
        return $"TR-{DateTime.UtcNow:yyyy}-{count:0000}";
    }

    private static Task<Trip?> LoadTripAsync(TenantDbContext db, Guid id, CancellationToken cancellationToken)
    {
        return db.Trips
            .Include(x => x.Renter)
            .Include(x => x.Vehicle)
            .Include(x => x.Driver)
            .FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
    }
}
