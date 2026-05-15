using System.Text.RegularExpressions;
using MetroBeezFMS.Application;
using MetroBeezFMS.Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Npgsql;

namespace MetroBeezFMS.Infrastructure.Persistence;

public sealed class TenantDatabaseProvisioner : ITenantDatabaseProvisioner
{
    private static readonly Regex SafeNameRegex = new("^[a-z0-9_]+$", RegexOptions.Compiled);
    private readonly CentralDbContext _centralDbContext;
    private readonly IConfiguration _configuration;

    public TenantDatabaseProvisioner(CentralDbContext centralDbContext, IConfiguration configuration)
    {
        _centralDbContext = centralDbContext;
        _configuration = configuration;
    }

    public async Task<Tenant> ProvisionTenantForVerifiedUserAsync(Guid ownerUserId, string companyName, CancellationToken cancellationToken = default)
    {
        var existingTenant = await _centralDbContext.TenantUsers
            .Include(x => x.Tenant)
            .Where(x => x.UserId == ownerUserId && x.Role == Roles.OwnerAdmin)
            .Select(x => x.Tenant)
            .FirstOrDefaultAsync(cancellationToken);

        if (existingTenant is not null)
        {
            return existingTenant;
        }

        var tenantId = Guid.NewGuid();
        var databaseName = $"metrobeez_fms_tenant_{tenantId:N}".ToLowerInvariant();
        EnsureSafeDatabaseName(databaseName);

        var tenant = new Tenant
        {
            Id = tenantId,
            Name = companyName.Trim(),
            Slug = BuildSlug(companyName, tenantId),
            DatabaseName = databaseName,
            DatabaseHost = _configuration["DB_HOST"],
            DatabasePort = int.TryParse(_configuration["DB_PORT"], out var port) ? port : 5432,
            MasterDatabase = _configuration["DB_MASTER_DATABASE"] ?? "metrobeez_fms_central",
            OwnerUserId = ownerUserId,
            Status = TenantStatus.Provisioning,
            EmailVerificationCompletedAt = DateTimeOffset.UtcNow
        };

        _centralDbContext.Tenants.Add(tenant);
        _centralDbContext.TenantUsers.Add(new TenantUser
        {
            TenantId = tenant.Id,
            UserId = ownerUserId,
            Role = Roles.OwnerAdmin
        });
        await _centralDbContext.SaveChangesAsync(cancellationToken);

        await CreateDatabaseIfMissingAsync(databaseName, cancellationToken);

        var options = new DbContextOptionsBuilder<TenantDbContext>()
            .UseNpgsql(DatabaseConnectionFactory.BuildTenantConnectionString(_configuration, databaseName))
            .Options;

        await using var tenantDb = new TenantDbContext(options);
        await tenantDb.Database.MigrateAsync(cancellationToken);
        await TenantSeeder.SeedAsync(tenantDb, tenant.Id, ownerUserId, tenant.Name, cancellationToken);

        tenant.Status = TenantStatus.Active;
        tenant.UpdatedAt = DateTimeOffset.UtcNow;
        await _centralDbContext.SaveChangesAsync(cancellationToken);

        return tenant;
    }

    private async Task CreateDatabaseIfMissingAsync(string databaseName, CancellationToken cancellationToken)
    {
        await using var connection = new NpgsqlConnection(DatabaseConnectionFactory.BuildAdminConnectionString(_configuration));
        await connection.OpenAsync(cancellationToken);

        await using (var existsCommand = connection.CreateCommand())
        {
            existsCommand.CommandText = "select 1 from pg_database where datname = @name";
            existsCommand.Parameters.AddWithValue("name", databaseName);
            var exists = await existsCommand.ExecuteScalarAsync(cancellationToken);
            if (exists is not null)
            {
                return;
            }
        }

        await using var createCommand = connection.CreateCommand();
        createCommand.CommandText = $"create database {QuoteIdentifier(databaseName)}";
        await createCommand.ExecuteNonQueryAsync(cancellationToken);
    }

    private static void EnsureSafeDatabaseName(string databaseName)
    {
        if (!SafeNameRegex.IsMatch(databaseName))
        {
            throw new InvalidOperationException("Generated tenant database name is not safe.");
        }
    }

    private static string QuoteIdentifier(string identifier)
    {
        return "\"" + identifier.Replace("\"", "\"\"") + "\"";
    }

    private static string BuildSlug(string name, Guid id)
    {
        var slug = Regex.Replace(name.Trim().ToLowerInvariant(), "[^a-z0-9]+", "-").Trim('-');
        if (string.IsNullOrWhiteSpace(slug))
        {
            slug = "tenant";
        }

        return $"{slug}-{id.ToString("N")[..8]}";
    }
}
