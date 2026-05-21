using System.Text.RegularExpressions;
using MetroBeezFMS.Application;
using MetroBeezFMS.Domain;
using MetroBeezFMS.Infrastructure.Identity;
using MetroBeezFMS.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Npgsql;

namespace MetroBeezFMS.Infrastructure.Services;

public sealed class TenantAdministrationService : ITenantAdministrationService
{
    private static readonly Regex SafeNameRegex = new("^[a-z0-9_]+$", RegexOptions.Compiled);
    private static readonly Guid[] SeedVehicleIds =
    [
        Guid.Parse("11111111-1111-4111-8111-111111111111"),
        Guid.Parse("22222222-2222-4222-8222-222222222222")
    ];

    private readonly CentralDbContext _centralDbContext;
    private readonly IConfiguration _configuration;
    private readonly IFileStorageService _fileStorageService;
    private readonly ILogger<TenantAdministrationService> _logger;

    public TenantAdministrationService(
        CentralDbContext centralDbContext,
        IConfiguration configuration,
        IFileStorageService fileStorageService,
        ILogger<TenantAdministrationService> logger)
    {
        _centralDbContext = centralDbContext;
        _configuration = configuration;
        _fileStorageService = fileStorageService;
        _logger = logger;
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

    public async Task<IReadOnlyList<AdminRegisteredVehicleDto>> ListRegisteredVehiclesAsync(CancellationToken cancellationToken = default)
    {
        var tenants = await _centralDbContext.Tenants
            .AsNoTracking()
            .OrderByDescending(x => x.CreatedAt)
            .ToListAsync(cancellationToken);

        var ownerIds = tenants.Select(x => x.OwnerUserId).Distinct().ToArray();
        var owners = await _centralDbContext.Users
            .AsNoTracking()
            .Where(x => ownerIds.Contains(x.Id))
            .ToDictionaryAsync(x => x.Id, cancellationToken);

        var registeredVehicles = new List<AdminRegisteredVehicleDto>();
        foreach (var tenant in tenants)
        {
            cancellationToken.ThrowIfCancellationRequested();
            var owner = owners.GetValueOrDefault(tenant.OwnerUserId);

            try
            {
                registeredVehicles.AddRange(await ListTenantRegisteredVehiclesAsync(tenant, owner, cancellationToken));
            }
            catch (Exception exception) when (exception is not OperationCanceledException)
            {
                _logger.LogWarning(exception, "Could not read registered vehicles for tenant {TenantId} ({DatabaseName}).", tenant.Id, tenant.DatabaseName);
            }
        }

        return registeredVehicles
            .OrderByDescending(x => x.CreatedAt)
            .ThenBy(x => x.TenantName)
            .ThenBy(x => x.PlateNumber)
            .ToList();
    }

    public async Task<AdminTenantDetailDto> GetTenantDetailAsync(Guid tenantId, CancellationToken cancellationToken = default)
    {
        var tenant = await _centralDbContext.Tenants
            .Include(x => x.Users)
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == tenantId, cancellationToken)
            ?? throw new KeyNotFoundException("Tenant was not found.");

        var owner = await _centralDbContext.Users.AsNoTracking().FirstOrDefaultAsync(x => x.Id == tenant.OwnerUserId, cancellationToken);
        var supportTickets = await _centralDbContext.SupportTickets
            .AsNoTracking()
            .Where(x => x.TenantId == tenant.Id)
            .OrderByDescending(x => x.CreatedAt)
            .Take(100)
            .ToListAsync(cancellationToken);
        var tickets = supportTickets.Select(x => ToSupportTicketDto(x, tenant.Name)).ToList();

        var vehicles = await ListTenantVehiclesAsync(tenant, cancellationToken);
        return new AdminTenantDetailDto(ToDto(tenant, owner), vehicles, tickets);
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

        try
        {
            foreach (var storageRoot in StorageRootsFor(tenant))
            {
                await _fileStorageService.DeleteTenantRootAsync(storageRoot, cancellationToken);
            }
        }
        catch (Exception exception)
        {
            throw new InvalidOperationException(
                $"Tenant storage cleanup failed. Confirm the app credentials can list and delete objects under the tenant folder. Details: {exception.Message}",
                exception);
        }

        try
        {
            await DropTenantDatabaseIfExistsAsync(databaseName, cancellationToken);
        }
        catch (Exception exception)
        {
            throw new InvalidOperationException(
                $"Tenant database drop failed. Confirm DB_ADMIN_USERNAME can terminate connections and drop the tenant database. Details: {exception.Message}",
                exception);
        }

        try
        {
            await DeleteCentralTenantRowsAsync(tenant, cancellationToken);
        }
        catch (Exception exception)
        {
            throw new InvalidOperationException(
                $"Tenant central records cleanup failed. The tenant database may already be deleted. Details: {exception.Message}",
                exception);
        }
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

    private async Task<IReadOnlyList<AdminTenantVehicleDto>> ListTenantVehiclesAsync(Tenant tenant, CancellationToken cancellationToken)
    {
        var options = new DbContextOptionsBuilder<TenantDbContext>()
            .UseNpgsql(DatabaseConnectionFactory.BuildTenantConnectionString(_configuration, tenant.DatabaseName))
            .Options;

        await using var db = new TenantDbContext(options);
        return await db.Vehicles
            .AsNoTracking()
            .Where(x => (x.CreatedBy == null || x.CreatedBy != "TenantSeeder") && !SeedVehicleIds.Contains(x.Id))
            .OrderBy(x => x.PlateNumber)
            .Select(x => new AdminTenantVehicleDto(
                x.Id,
                x.PlateNumber,
                x.Make,
                x.Model,
                x.YearModel,
                x.VehicleType,
                x.FuelType,
                x.PassengerCapacity,
                x.Status))
            .ToListAsync(cancellationToken);
    }

    private async Task<IReadOnlyList<AdminRegisteredVehicleDto>> ListTenantRegisteredVehiclesAsync(Tenant tenant, AppUser? owner, CancellationToken cancellationToken)
    {
        var options = new DbContextOptionsBuilder<TenantDbContext>()
            .UseNpgsql(DatabaseConnectionFactory.BuildTenantConnectionString(_configuration, tenant.DatabaseName))
            .Options;

        await using var db = new TenantDbContext(options);
        return await db.Vehicles
            .AsNoTracking()
            .Where(x => (x.CreatedBy == null || x.CreatedBy != "TenantSeeder") && !SeedVehicleIds.Contains(x.Id))
            .OrderBy(x => x.PlateNumber)
            .Select(x => new AdminRegisteredVehicleDto(
                tenant.Id,
                tenant.Name,
                tenant.Slug,
                owner == null ? null : owner.Email,
                owner == null ? null : owner.FullName,
                x.Id,
                x.PlateNumber,
                x.Make,
                x.Model,
                x.YearModel,
                x.VehicleType,
                x.FuelType,
                x.PassengerCapacity,
                x.Status,
                x.CreatedAt,
                x.UpdatedAt))
            .ToListAsync(cancellationToken);
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

    private static SupportTicketDto ToSupportTicketDto(SupportTicket ticket, string tenantName)
    {
        return new SupportTicketDto(
            ticket.Id,
            ticket.TenantId,
            tenantName,
            ticket.RequesterUserId,
            ticket.RequesterName,
            ticket.RequesterEmail,
            ticket.Subject,
            ticket.Message,
            ticket.Status,
            ticket.CreatedAt);
    }

    private static IEnumerable<string> StorageRootsFor(Tenant tenant)
    {
        var legacyRoot = tenant.Id.ToString("N");
        return new[] { tenant.Slug, legacyRoot }
            .Where(root => !string.IsNullOrWhiteSpace(root))
            .Distinct(StringComparer.OrdinalIgnoreCase)!;
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
