using MetroBeezFMS.Application;
using MetroBeezFMS.Domain;
using MetroBeezFMS.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace MetroBeezFMS.Infrastructure.Services;

public sealed class ReminderBackgroundService : BackgroundService
{
    private static readonly Guid[] SeedVehicleIds =
    [
        Guid.Parse("11111111-1111-4111-8111-111111111111"),
        Guid.Parse("22222222-2222-4222-8222-222222222222")
    ];

    private readonly IServiceScopeFactory _scopeFactory;
    private readonly IConfiguration _configuration;
    private readonly ILogger<ReminderBackgroundService> _logger;

    public ReminderBackgroundService(
        IServiceScopeFactory scopeFactory,
        IConfiguration configuration,
        ILogger<ReminderBackgroundService> logger)
    {
        _scopeFactory = scopeFactory;
        _configuration = configuration;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        if (!bool.TryParse(_configuration["Reminders:Enabled"], out var enabled) || !enabled)
        {
            _logger.LogInformation("BeezFleet reminder worker is registered but disabled. Set Reminders__Enabled=true to run it.");
            return;
        }

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await ProcessRemindersAsync(stoppingToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed while processing BeezFleet reminders.");
            }

            await Task.Delay(TimeSpan.FromHours(12), stoppingToken);
        }
    }

    private async Task ProcessRemindersAsync(CancellationToken cancellationToken)
    {
        using var scope = _scopeFactory.CreateScope();
        var centralDb = scope.ServiceProvider.GetRequiredService<CentralDbContext>();
        var email = scope.ServiceProvider.GetRequiredService<IEmailService>();
        var tenants = await centralDb.Tenants
            .AsNoTracking()
            .Where(x => x.Status == TenantStatus.Active)
            .ToListAsync(cancellationToken);

        foreach (var tenant in tenants)
        {
            var ownerEmail = await centralDb.Users
                .Where(x => x.Id == tenant.OwnerUserId)
                .Select(x => x.Email)
                .FirstOrDefaultAsync(cancellationToken);
            var options = new DbContextOptionsBuilder<TenantDbContext>()
                .UseNpgsql(DatabaseConnectionFactory.BuildTenantConnectionString(_configuration, tenant.DatabaseName))
                .Options;
            await using var db = new TenantDbContext(options);

            var today = DateOnly.FromDateTime(DateTime.UtcNow);
            var thirtyDays = today.AddDays(30);
            var expiringDocuments = await db.DocumentAttachments
                .Where(x => x.ExpirationDate != null && x.ExpirationDate <= thirtyDays)
                .ToListAsync(cancellationToken);

            foreach (var doc in expiringDocuments)
            {
                if (!await db.Notifications.AnyAsync(x => x.RelatedEntityId == doc.Id && x.Type == NotificationType.DocumentExpiry, cancellationToken))
                {
                    db.Notifications.Add(new Notification
                    {
                        TenantId = tenant.Id,
                        UserId = tenant.OwnerUserId,
                        Title = "Document expiring soon",
                        Message = $"{doc.DocumentType} for {doc.EntityType} expires on {doc.ExpirationDate:yyyy-MM-dd}.",
                        Type = NotificationType.DocumentExpiry,
                        RelatedEntityType = nameof(DocumentAttachment),
                        RelatedEntityId = doc.Id
                    });
                }
            }

            var driverLicenses = await db.Drivers
                .Where(x => x.LicenseExpirationDate != null && x.LicenseExpirationDate <= thirtyDays)
                .ToListAsync(cancellationToken);
            foreach (var driver in driverLicenses)
            {
                if (!await db.Notifications.AnyAsync(x => x.RelatedEntityId == driver.Id && x.Type == NotificationType.DriverLicenseExpiry, cancellationToken))
                {
                    db.Notifications.Add(new Notification
                    {
                        TenantId = tenant.Id,
                        UserId = tenant.OwnerUserId,
                        Title = "Driver license expiring soon",
                        Message = $"{driver.FullName}'s license expires on {driver.LicenseExpirationDate:yyyy-MM-dd}.",
                        Type = NotificationType.DriverLicenseExpiry,
                        RelatedEntityType = nameof(Driver),
                        RelatedEntityId = driver.Id
                    });
                }
            }

            var pmsItems = await db.MaintenanceSchedules
                .Include(x => x.Vehicle)
                .Where(x => x.Status != MaintenanceStatus.Completed &&
                    ((x.DueDate != null && x.DueDate <= thirtyDays) ||
                     (x.DueOdometer != null && x.Vehicle != null && x.Vehicle.CurrentOdometer + (x.ReminderKilometersBefore ?? 0) >= x.DueOdometer)))
                .ToListAsync(cancellationToken);
            foreach (var pms in pmsItems)
            {
                if (!await db.Notifications.AnyAsync(x => x.RelatedEntityId == pms.Id && x.Type == NotificationType.PmsReminder, cancellationToken))
                {
                    db.Notifications.Add(new Notification
                    {
                        TenantId = tenant.Id,
                        UserId = tenant.OwnerUserId,
                        Title = "PMS reminder",
                        Message = $"{pms.Vehicle?.PlateNumber ?? "Vehicle"} has upcoming PMS: {pms.Title}.",
                        Type = NotificationType.PmsReminder,
                        RelatedEntityType = nameof(MaintenanceSchedule),
                        RelatedEntityId = pms.Id
                    });
                    if (!string.IsNullOrWhiteSpace(ownerEmail) && !IsSeededDemoReminder(pms))
                    {
                        await email.SendAsync(ownerEmail, "BeezFleet - PMS Reminder", BuildPmsReminderEmail(pms), cancellationToken);
                    }
                }
            }

            await db.SaveChangesAsync(cancellationToken);
        }
    }

    private static string BuildPmsReminderEmail(MaintenanceSchedule schedule)
    {
        var vehicle = schedule.Vehicle;
        var dueDate = schedule.DueDate?.ToString("yyyy-MM-dd") ?? "No due date set";
        var dueOdometer = schedule.DueOdometer.HasValue ? $"{schedule.DueOdometer:N0} km" : "No odometer target set";
        var currentOdometer = vehicle is null ? "Not available" : $"{vehicle.CurrentOdometer:N0} km";
        var vehicleLabel = vehicle is null
            ? "Vehicle"
            : $"{vehicle.PlateNumber} - {vehicle.YearModel} {vehicle.Make} {vehicle.Model}";

        return $"""
            <p><strong>{Html(schedule.Title)}</strong> is due soon for <strong>{Html(vehicleLabel)}</strong>.</p>
            <p>Use this reminder to plan shop scheduling, parts availability, and renter handoffs before the unit becomes overdue.</p>
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:12px;">
              <tr><td style="padding:8px 0;color:#64748b;">Due date</td><td style="padding:8px 0;text-align:right;font-weight:700;">{Html(dueDate)}</td></tr>
              <tr><td style="padding:8px 0;color:#64748b;">Due odometer</td><td style="padding:8px 0;text-align:right;font-weight:700;">{Html(dueOdometer)}</td></tr>
              <tr><td style="padding:8px 0;color:#64748b;">Current odometer</td><td style="padding:8px 0;text-align:right;font-weight:700;">{Html(currentOdometer)}</td></tr>
              <tr><td style="padding:8px 0;color:#64748b;">Vendor/shop</td><td style="padding:8px 0;text-align:right;font-weight:700;">{Html(schedule.VendorShop ?? "Not assigned")}</td></tr>
            </table>
            """;
    }

    private static bool IsSeededDemoReminder(MaintenanceSchedule schedule)
    {
        return string.Equals(schedule.CreatedBy, "TenantSeeder", StringComparison.OrdinalIgnoreCase)
            || SeedVehicleIds.Contains(schedule.VehicleId);
    }

    private static string Html(string value)
    {
        return System.Net.WebUtility.HtmlEncode(value);
    }
}
