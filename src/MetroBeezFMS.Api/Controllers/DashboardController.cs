using MetroBeezFMS.Application;
using MetroBeezFMS.Domain;
using MetroBeezFMS.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace MetroBeezFMS.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/dashboard")]
public sealed class DashboardController : ControllerBase
{
    private readonly TenantDbContextFactory _tenantDbContextFactory;

    public DashboardController(TenantDbContextFactory tenantDbContextFactory)
    {
        _tenantDbContextFactory = tenantDbContextFactory;
    }

    [HttpGet("summary")]
    public async Task<ActionResult<DashboardSummaryDto>> GetSummary(CancellationToken cancellationToken)
    {
        await using var db = await _tenantDbContextFactory.CreateAsync(cancellationToken);
        var monthStart = new DateTimeOffset(DateTime.UtcNow.Year, DateTime.UtcNow.Month, 1, 0, 0, 0, TimeSpan.Zero);
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var thirtyDays = today.AddDays(30);

        var tripsThisMonth = db.Trips.Where(x => x.StartDateTime >= monthStart && x.Status != TripStatus.Cancelled);

        var summary = new DashboardSummaryDto(
            TotalVehicles: await db.Vehicles.CountAsync(cancellationToken),
            AvailableVehicles: await db.Vehicles.CountAsync(x => x.Status == VehicleStatus.Available, cancellationToken),
            BookedVehicles: await db.Vehicles.CountAsync(x => x.Status == VehicleStatus.Booked, cancellationToken),
            VehiclesUnderMaintenance: await db.Vehicles.CountAsync(x => x.Status == VehicleStatus.UnderMaintenance, cancellationToken),
            ActiveTrips: await db.Trips.CountAsync(x => x.Status == TripStatus.Active, cancellationToken),
            UpcomingPms: await db.MaintenanceSchedules.CountAsync(x => x.Status == MaintenanceStatus.DueSoon || x.Status == MaintenanceStatus.Upcoming, cancellationToken),
            MonthlyGrossRevenue: await tripsThisMonth.SumAsync(x => x.GrossRevenue, cancellationToken),
            MonthlyNetProfit: await tripsThisMonth.SumAsync(x => x.NetProfit, cancellationToken),
            FuelTollExpenses: await tripsThisMonth.SumAsync(x => x.FuelExpense + x.TollExpense, cancellationToken),
            RecentBookings: await db.Bookings
                .Include(x => x.Renter)
                .Include(x => x.Vehicle)
                .Include(x => x.Driver)
                .OrderByDescending(x => x.CreatedAt)
                .Take(5)
                .Select(x => x.ToDto())
                .ToListAsync(cancellationToken),
            RecentTrips: await db.Trips
                .Include(x => x.Renter)
                .Include(x => x.Vehicle)
                .Include(x => x.Driver)
                .OrderByDescending(x => x.StartDateTime)
                .Take(5)
                .Select(x => x.ToDto())
                .ToListAsync(cancellationToken),
            ExpiringDocuments: await db.DocumentAttachments
                .Where(x => x.ExpirationDate != null && x.ExpirationDate <= thirtyDays)
                .OrderBy(x => x.ExpirationDate)
                .Take(8)
                .Select(x => x.ToDto(null))
                .ToListAsync(cancellationToken),
            DriverActivity: await db.Notifications
                .OrderByDescending(x => x.CreatedAt)
                .Take(8)
                .Select(x => x.ToDto())
                .ToListAsync(cancellationToken));

        return Ok(summary);
    }
}
