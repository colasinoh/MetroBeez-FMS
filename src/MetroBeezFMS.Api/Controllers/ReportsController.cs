using MetroBeezFMS.Application;
using MetroBeezFMS.Domain;
using MetroBeezFMS.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace MetroBeezFMS.Api.Controllers;

[ApiController]
[Authorize(Roles = $"{Roles.OwnerAdmin},{Roles.Manager}")]
[Route("api/reports")]
public sealed class ReportsController : ControllerBase
{
    private readonly TenantDbContextFactory _tenantDbContextFactory;

    public ReportsController(TenantDbContextFactory tenantDbContextFactory)
    {
        _tenantDbContextFactory = tenantDbContextFactory;
    }

    [HttpGet("profitability")]
    public async Task<ActionResult<ProfitabilityReportDto>> Profitability([FromQuery] int? year, [FromQuery] int? month, CancellationToken cancellationToken)
    {
        await using var db = await _tenantDbContextFactory.CreateAsync(cancellationToken);
        var targetYear = year ?? DateTime.UtcNow.Year;
        var targetMonth = month ?? DateTime.UtcNow.Month;
        var startsAt = new DateTimeOffset(targetYear, targetMonth, 1, 0, 0, 0, TimeSpan.Zero);
        var endsAt = startsAt.AddMonths(1);
        var serviceStart = DateOnly.FromDateTime(startsAt.UtcDateTime);
        var serviceEnd = serviceStart.AddMonths(1);
        var trips = db.Trips.Where(x => x.StartDateTime >= startsAt && x.StartDateTime < endsAt && x.Status != TripStatus.Cancelled);
        var maintenance = db.MaintenanceRecords.Where(x => x.ServiceDate >= serviceStart && x.ServiceDate < serviceEnd);

        var vehicleRows = await trips
            .GroupBy(x => new { x.VehicleId, x.Vehicle!.PlateNumber, x.Vehicle.Make, x.Vehicle.Model })
            .Select(x => new VehicleProfitabilityDto(
                x.Key.VehicleId,
                x.Key.PlateNumber + " - " + x.Key.Make + " " + x.Key.Model,
                x.Sum(t => t.GrossRevenue),
                x.Sum(t => t.TotalExpenses),
                x.Sum(t => t.NetProfit)))
            .ToListAsync(cancellationToken);

        var driverRows = await trips
            .Where(x => x.DriverId != null)
            .GroupBy(x => new { DriverId = x.DriverId!.Value, x.Driver!.FullName })
            .Select(x => new DriverRevenueDto(
                x.Key.DriverId,
                x.Key.FullName,
                x.Sum(t => t.GrossRevenue),
                x.Sum(t => t.DriverProceedCommission)))
            .ToListAsync(cancellationToken);

        var dto = new ProfitabilityReportDto(
            MonthlyGrossRevenue: await trips.SumAsync(x => x.GrossRevenue, cancellationToken),
            MonthlyNetProfit: await trips.SumAsync(x => x.NetProfit, cancellationToken),
            FuelExpenses: await trips.SumAsync(x => x.FuelExpense, cancellationToken),
            TollExpenses: await trips.SumAsync(x => x.TollExpense, cancellationToken),
            MaintenanceExpenses: await maintenance.SumAsync(x => x.Cost, cancellationToken),
            Vehicles: vehicleRows,
            Drivers: driverRows);

        return Ok(dto);
    }
}
