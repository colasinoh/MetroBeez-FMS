using MetroBeezFMS.Domain;
using Microsoft.EntityFrameworkCore;

namespace MetroBeezFMS.Application;

public interface IEmailService
{
    Task SendAsync(string toEmail, string subject, string htmlBody, CancellationToken cancellationToken = default);
}

public interface IFileStorageService
{
    Task<StoredFile> SaveAsync(Stream stream, string originalFileName, string? contentType, string tenantStorageRoot, string? folder = null, CancellationToken cancellationToken = default);
    Task EnsureTenantRootAsync(string tenantStorageRoot, CancellationToken cancellationToken = default);
    Task DeleteTenantRootAsync(string tenantStorageRoot, CancellationToken cancellationToken = default);
}

public interface ITenantStoragePathResolver
{
    Task<string> GetStorageRootAsync(Guid tenantId, CancellationToken cancellationToken = default);
}

public static class TenantStorageFolders
{
    public const string Photos = "photos";
    public const string ProfilePhotos = "photos/profile";
    public const string Renters = "renters";
    public const string Vehicles = "vehicles";
    public const string Drivers = "drivers";
    public const string Bookings = "bookings";
    public const string Trips = "trips";
    public const string Documents = "documents";
    public const string Receipts = "receipts";
    public const string Pms = "pms";
    public const string Maintenance = "maintenance";
    public const string Company = "company";
    public const string Reports = "reports";
    public const string Audit = "audit";

    public static readonly string[] DefaultFolders =
    [
        Photos,
        ProfilePhotos,
        Renters,
        Vehicles,
        Drivers,
        Bookings,
        Trips,
        Documents,
        Receipts,
        Pms,
        Maintenance,
        Company,
        Reports,
        Audit
    ];

    public static string ForEntity(string? entityType)
    {
        return entityType?.Trim().ToLowerInvariant() switch
        {
            "vehicle" or "vehicles" => Vehicles,
            "driver" or "drivers" => Drivers,
            "renter" or "renters" or "customer" or "customers" => Renters,
            "booking" or "bookings" => Bookings,
            "trip" or "trips" => Trips,
            "maintenance" or "maintenanceschedule" or "maintenancerecord" or "pms" => Pms,
            "company" or "companyprofile" => Company,
            _ => Documents
        };
    }
}

public interface ITenantDatabaseProvisioner
{
    Task<Tenant> ProvisionTenantForVerifiedUserAsync(Guid ownerUserId, string companyName, CancellationToken cancellationToken = default);
}

public interface ITenantAdministrationService
{
    Task<IReadOnlyList<AdminTenantDto>> ListTenantsAsync(CancellationToken cancellationToken = default);
    Task<AdminTenantDto> UpdateStatusAsync(Guid tenantId, TenantStatus status, CancellationToken cancellationToken = default);
    Task DeleteTenantAsync(Guid tenantId, CancellationToken cancellationToken = default);
}

public interface ITenantDbContextFactory
{
    Task<DbContext> CreateDbContextAsync(CancellationToken cancellationToken = default);
}

public interface ICurrentTenantService
{
    Guid? TenantId { get; }
    Guid? UserId { get; }
    string? UserEmail { get; }
    bool IsInRole(string role);
}

public interface ITokenService
{
    string CreateToken(TokenUser user, TenantUser tenantUser, string tenantName);
    string CreatePlatformToken(TokenUser user, string role);
}

public sealed record StoredFile(
    string FileName,
    string OriginalFileName,
    string FileUrl,
    string? ContentType,
    long FileSize);

public sealed record TokenUser(Guid Id, string Email, string FullName);
