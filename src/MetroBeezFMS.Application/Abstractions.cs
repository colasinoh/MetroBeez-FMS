using MetroBeezFMS.Domain;
using Microsoft.EntityFrameworkCore;

namespace MetroBeezFMS.Application;

public interface IEmailService
{
    Task SendAsync(string toEmail, string subject, string htmlBody, CancellationToken cancellationToken = default);
}

public interface IFileStorageService
{
    Task<StoredFile> SaveAsync(Stream stream, string originalFileName, string? contentType, string tenantId, CancellationToken cancellationToken = default);
    Task EnsureTenantRootAsync(string tenantId, CancellationToken cancellationToken = default);
    Task DeleteTenantRootAsync(string tenantId, CancellationToken cancellationToken = default);
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
