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
            _logger.LogInformation("MetroBeez FMS reminder worker is registered but disabled. Set Reminders__Enabled=true to run it.");
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
                _logger.LogError(ex, "Failed while processing MetroBeez FMS reminders.");
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
                    if (!string.IsNullOrWhiteSpace(ownerEmail))
                    {
                        await email.SendAsync(ownerEmail, "MetroBeez FMS - PMS Reminder", $"<p>{pms.Title} is due soon for {pms.Vehicle?.PlateNumber}.</p>", cancellationToken);
                    }
                }
            }

            await db.SaveChangesAsync(cancellationToken);
        }
    }
}
