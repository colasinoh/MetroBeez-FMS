using System.Text.RegularExpressions;
using MetroBeezFMS.Application;
using MetroBeezFMS.Domain;
using MetroBeezFMS.Infrastructure.Identity;
using MetroBeezFMS.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Npgsql;

namespace MetroBeezFMS.Infrastructure.Services;

public sealed class TenantAdministrationService : ITenantAdministrationService
{
    private static readonly Regex SafeNameRegex = new("^[a-z0-9_]+$", RegexOptions.Compiled);
    private readonly CentralDbContext _centralDbContext;
    private readonly IConfiguration _configuration;
    private readonly IFileStorageService _fileStorageService;

    public TenantAdministrationService(
        CentralDbContext centralDbContext,
        IConfiguration configuration,
        IFileStorageService fileStorageService)
    {
        _centralDbContext = centralDbContext;
        _configuration = configuration;
        _fileStorageService = fileStorageService;
    }

    public async Task<IReadOnlyList<AdminTenantDto>> ListTenantsAsync(CancellationToken cancellationToken = default)
    {
        var tenants = await _centralDbContext.Tenants
            .Include(x => x.Users)
            .AsNoTracking()
            .OrderByDescending(x => x.CreatedAt)
            .ToListAsync(cancellationToken);

        var ownerIds = tenants.Select(x => x.OwnerUserId).Distinct().ToArray();
        var owners = await _centralDbContext.Users
            .AsNoTracking()
            .Where(x => ownerIds.Contains(x.Id))
            .ToDictionaryAsync(x => x.Id, cancellationToken);

        return tenants.Select(tenant => ToDto(tenant, owners.GetValueOrDefault(tenant.OwnerUserId))).ToList();
    }

    public async Task<AdminTenantDto> UpdateStatusAsync(Guid tenantId, TenantStatus status, CancellationToken cancellationToken = default)
    {
        var tenant = await _centralDbContext.Tenants
            .Include(x => x.Users)
            .FirstOrDefaultAsync(x => x.Id == tenantId, cancellationToken)
            ?? throw new KeyNotFoundException("Tenant was not found.");

        tenant.Status = status;
        tenant.UpdatedAt = DateTimeOffset.UtcNow;
        await _centralDbContext.SaveChangesAsync(cancellationToken);

        var owner = await _centralDbContext.Users.AsNoTracking().FirstOrDefaultAsync(x => x.Id == tenant.OwnerUserId, cancellationToken);
        return ToDto(tenant, owner);
    }

    public async Task DeleteTenantAsync(Guid tenantId, CancellationToken cancellationToken = default)
    {
        var tenant = await _centralDbContext.Tenants
            .Include(x => x.Users)
            .FirstOrDefaultAsync(x => x.Id == tenantId, cancellationToken)
            ?? throw new KeyNotFoundException("Tenant was not found.");

        var databaseName = tenant.DatabaseName;
        EnsureSafeDatabaseName(databaseName);
        EnsureDroppableDatabaseName(databaseName);

        await _fileStorageService.DeleteTenantRootAsync(tenant.Id.ToString("N"), cancellationToken);
        await DropTenantDatabaseIfExistsAsync(databaseName, cancellationToken);
        await DeleteCentralTenantRowsAsync(tenant, cancellationToken);
    }

    private async Task DeleteCentralTenantRowsAsync(Tenant tenant, CancellationToken cancellationToken)
    {
        var candidateUserIds = tenant.Users.Select(x => x.UserId)
            .Append(tenant.OwnerUserId)
            .Distinct()
            .ToArray();

        await using var transaction = await _centralDbContext.Database.BeginTransactionAsync(cancellationToken);

        _centralDbContext.Tenants.Remove(tenant);
        await _centralDbContext.SaveChangesAsync(cancellationToken);

        var remainingTenantUserIds = await _centralDbContext.TenantUsers
            .Where(x => candidateUserIds.Contains(x.UserId))
            .Select(x => x.UserId)
            .Distinct()
            .ToListAsync(cancellationToken);

        var superAdminRoleId = await _centralDbContext.Roles
            .Where(x => x.Name == Roles.SuperAdmin)
            .Select(x => (Guid?)x.Id)
            .FirstOrDefaultAsync(cancellationToken);

        var superAdminUserIds = superAdminRoleId.HasValue
            ? await _centralDbContext.UserRoles
                .Where(x => x.RoleId == superAdminRoleId.Value && candidateUserIds.Contains(x.UserId))
                .Select(x => x.UserId)
                .Distinct()
                .ToListAsync(cancellationToken)
            : new List<Guid>();

        var usersToDelete = candidateUserIds
            .Except(remainingTenantUserIds)
            .Except(superAdminUserIds)
            .ToArray();

        if (usersToDelete.Length > 0)
        {
            var users = await _centralDbContext.Users
                .Where(x => usersToDelete.Contains(x.Id))
                .ToListAsync(cancellationToken);
            _centralDbContext.Users.RemoveRange(users);
            await _centralDbContext.SaveChangesAsync(cancellationToken);
        }

        await transaction.CommitAsync(cancellationToken);
    }

    private async Task DropTenantDatabaseIfExistsAsync(string databaseName, CancellationToken cancellationToken)
    {
        EnsureDroppableDatabaseName(databaseName);

        await using var connection = new NpgsqlConnection(DatabaseConnectionFactory.BuildAdminConnectionString(_configuration));
        await connection.OpenAsync(cancellationToken);

        if (string.Equals(connection.Database, databaseName, StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException("Refusing to drop the currently connected database.");
        }

        await using (var terminateCommand = connection.CreateCommand())
        {
            terminateCommand.CommandText = """
                select pg_terminate_backend(pid)
                from pg_stat_activity
                where datname = @databaseName
                  and pid <> pg_backend_pid()
                """;
            terminateCommand.Parameters.AddWithValue("databaseName", databaseName);
            await terminateCommand.ExecuteNonQueryAsync(cancellationToken);
        }

        await using var dropCommand = connection.CreateCommand();
        dropCommand.CommandText = $"drop database if exists {QuoteIdentifier(databaseName)}";
        await dropCommand.ExecuteNonQueryAsync(cancellationToken);
    }

    private static AdminTenantDto ToDto(Tenant tenant, AppUser? owner)
    {
        return new AdminTenantDto(
            tenant.Id,
            tenant.Name,
            tenant.Slug,
            tenant.DatabaseName,
            tenant.Status,
            tenant.SubscriptionStatus,
            tenant.OwnerUserId,
            owner?.Email,
            owner?.FullName,
            tenant.Users.Count,
            tenant.CreatedAt,
            tenant.UpdatedAt);
    }

    private void EnsureDroppableDatabaseName(string databaseName)
    {
        var protectedDatabases = new[]
        {
            _configuration["DB_MASTER_DATABASE"] ?? "metrobeez_fms_central",
            "postgres",
            "template0",
            "template1"
        };
        if (protectedDatabases.Contains(databaseName, StringComparer.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException("Refusing to drop a protected PostgreSQL database.");
        }
    }

    private static void EnsureSafeDatabaseName(string databaseName)
    {
        if (!SafeNameRegex.IsMatch(databaseName))
        {
            throw new InvalidOperationException("Tenant database name is not safe to drop.");
        }
    }

    private static string QuoteIdentifier(string identifier)
    {
        return "\"" + identifier.Replace("\"", "\"\"") + "\"";
    }
}
