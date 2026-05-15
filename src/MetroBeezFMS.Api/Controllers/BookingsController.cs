using MetroBeezFMS.Application;
using MetroBeezFMS.Domain;
using MetroBeezFMS.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace MetroBeezFMS.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/bookings")]
public sealed class BookingsController : ControllerBase
{
    private readonly TenantDbContextFactory _tenantDbContextFactory;

    public BookingsController(TenantDbContextFactory tenantDbContextFactory)
    {
        _tenantDbContextFactory = tenantDbContextFactory;
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<BookingListDto>>> List([FromQuery] BookingStatus? status, [FromQuery] Guid? vehicleId, CancellationToken cancellationToken)
    {
        await using var db = await _tenantDbContextFactory.CreateAsync(cancellationToken);
        var query = db.Bookings
            .AsNoTracking()
            .Include(x => x.Renter)
            .Include(x => x.Vehicle)
            .Include(x => x.Driver)
            .AsQueryable();

        if (status is not null)
        {
            query = query.Where(x => x.BookingStatus == status);
        }

        if (vehicleId is not null)
        {
            query = query.Where(x => x.VehicleId == vehicleId);
        }

        return Ok(await query.OrderByDescending(x => x.StartDateTime).Select(x => x.ToDto()).ToListAsync(cancellationToken));
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<BookingListDto>> Get(Guid id, CancellationToken cancellationToken)
    {
        await using var db = await _tenantDbContextFactory.CreateAsync(cancellationToken);
        var booking = await db.Bookings
            .AsNoTracking()
            .Include(x => x.Renter)
            .Include(x => x.Vehicle)
            .Include(x => x.Driver)
            .FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
        return booking is null ? NotFound() : Ok(booking.ToDto());
    }

    [HttpPost]
    [Authorize(Roles = $"{Roles.OwnerAdmin},{Roles.Manager}")]
    public async Task<ActionResult<BookingListDto>> Create(BookingUpsertDto request, CancellationToken cancellationToken)
    {
        if (request.EndDateTime <= request.StartDateTime)
        {
            return ValidationProblem("Booking end date/time must be after start date/time.");
        }

        await using var db = await _tenantDbContextFactory.CreateAsync(cancellationToken);
        if (await HasVehicleConflictAsync(db, request.VehicleId, request.StartDateTime, request.EndDateTime, null, cancellationToken))
        {
            return Conflict("Vehicle already has a pending, confirmed, or active booking in that schedule.");
        }

        var booking = new Booking
        {
            ReferenceNumber = await GenerateReferenceAsync(db, cancellationToken),
            RenterId = request.RenterId,
            VehicleId = request.VehicleId
        };
        Apply(booking, request);
        db.Bookings.Add(booking);
        await db.SaveChangesAsync(cancellationToken);

        var created = await LoadBookingAsync(db, booking.Id, cancellationToken);
        return CreatedAtAction(nameof(Get), new { id = booking.Id }, created!.ToDto());
    }

    [HttpPut("{id:guid}")]
    [Authorize(Roles = $"{Roles.OwnerAdmin},{Roles.Manager}")]
    public async Task<ActionResult<BookingListDto>> Update(Guid id, BookingUpsertDto request, CancellationToken cancellationToken)
    {
        if (request.EndDateTime <= request.StartDateTime)
        {
            return ValidationProblem("Booking end date/time must be after start date/time.");
        }

        await using var db = await _tenantDbContextFactory.CreateAsync(cancellationToken);
        var booking = await db.Bookings.FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
        if (booking is null)
        {
            return NotFound();
        }

        if (await HasVehicleConflictAsync(db, request.VehicleId, request.StartDateTime, request.EndDateTime, id, cancellationToken))
        {
            return Conflict("Vehicle already has a pending, confirmed, or active booking in that schedule.");
        }

        Apply(booking, request);
        await db.SaveChangesAsync(cancellationToken);

        var updated = await LoadBookingAsync(db, booking.Id, cancellationToken);
        return Ok(updated!.ToDto());
    }

    [HttpPost("{id:guid}/convert-to-trip")]
    [Authorize(Roles = $"{Roles.OwnerAdmin},{Roles.Manager}")]
    public async Task<ActionResult<TripListDto>> ConvertToTrip(Guid id, CancellationToken cancellationToken)
    {
        await using var db = await _tenantDbContextFactory.CreateAsync(cancellationToken);
        var booking = await db.Bookings
            .Include(x => x.Renter)
            .Include(x => x.Vehicle)
            .Include(x => x.Driver)
            .FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
        if (booking is null)
        {
            return NotFound();
        }

        var existingTrip = await db.Trips
            .Include(x => x.Renter)
            .Include(x => x.Vehicle)
            .Include(x => x.Driver)
            .FirstOrDefaultAsync(x => x.BookingId == id, cancellationToken);
        if (existingTrip is not null)
        {
            return Ok(existingTrip.ToDto());
        }

        var trip = new Trip
        {
            TripNumber = await GenerateTripNumberAsync(db, cancellationToken),
            BookingId = booking.Id,
            BookingReference = booking.ReferenceNumber,
            VehicleId = booking.VehicleId,
            DriverId = booking.DriverId,
            RenterId = booking.RenterId,
            TripType = booking.BookingType == BookingType.DeliveryLogistics ? TripType.Delivery : TripType.Rental,
            StartDateTime = booking.StartDateTime,
            EndDateTime = booking.EndDateTime,
            GrossRevenue = booking.RateAmount,
            PaymentStatus = booking.PaymentStatus,
            Status = TripStatus.Scheduled
        };
        trip.Recalculate();
        booking.BookingStatus = BookingStatus.Active;
        if (booking.Vehicle is not null)
        {
            booking.Vehicle.Status = VehicleStatus.Booked;
        }

        db.Trips.Add(trip);
        await db.SaveChangesAsync(cancellationToken);

        var created = await db.Trips.Include(x => x.Renter).Include(x => x.Vehicle).Include(x => x.Driver).FirstAsync(x => x.Id == trip.Id, cancellationToken);
        return CreatedAtAction("Get", "Trips", new { id = trip.Id }, created.ToDto());
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Roles = Roles.OwnerAdmin)]
    public async Task<ActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        await using var db = await _tenantDbContextFactory.CreateAsync(cancellationToken);
        var booking = await db.Bookings.FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
        if (booking is null)
        {
            return NotFound();
        }

        db.Bookings.Remove(booking);
        await db.SaveChangesAsync(cancellationToken);
        return NoContent();
    }

    private static void Apply(Booking booking, BookingUpsertDto request)
    {
        booking.RenterId = request.RenterId;
        booking.VehicleId = request.VehicleId;
        booking.DriverId = request.DriverId;
        booking.BookingType = request.BookingType;
        booking.StartDateTime = request.StartDateTime;
        booking.EndDateTime = request.EndDateTime;
        booking.PickupLocation = request.PickupLocation;
        booking.ReturnLocation = request.ReturnLocation;
        booking.RateType = request.RateType;
        booking.RateAmount = request.RateAmount;
        booking.SecurityDeposit = request.SecurityDeposit;
        booking.PaymentStatus = request.PaymentStatus;
        booking.BookingStatus = request.BookingStatus;
        booking.Notes = request.Notes;
    }

    private static async Task<bool> HasVehicleConflictAsync(TenantDbContext db, Guid vehicleId, DateTimeOffset startsAt, DateTimeOffset endsAt, Guid? ignoreBookingId, CancellationToken cancellationToken)
    {
        return await db.Bookings.AnyAsync(x =>
            x.VehicleId == vehicleId &&
            x.Id != ignoreBookingId &&
            (x.BookingStatus == BookingStatus.Pending || x.BookingStatus == BookingStatus.Confirmed || x.BookingStatus == BookingStatus.Active) &&
            x.StartDateTime < endsAt &&
            x.EndDateTime > startsAt,
            cancellationToken);
    }

    private static async Task<string> GenerateReferenceAsync(TenantDbContext db, CancellationToken cancellationToken)
    {
        var count = await db.Bookings.IgnoreQueryFilters().CountAsync(cancellationToken) + 1;
        return $"BK-{DateTime.UtcNow:yyyy}-{count:0000}";
    }

    private static async Task<string> GenerateTripNumberAsync(TenantDbContext db, CancellationToken cancellationToken)
    {
        var count = await db.Trips.IgnoreQueryFilters().CountAsync(cancellationToken) + 1;
        return $"TR-{DateTime.UtcNow:yyyy}-{count:0000}";
    }

    private static Task<Booking?> LoadBookingAsync(TenantDbContext db, Guid id, CancellationToken cancellationToken)
    {
        return db.Bookings
            .Include(x => x.Renter)
            .Include(x => x.Vehicle)
            .Include(x => x.Driver)
            .FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
    }
}
