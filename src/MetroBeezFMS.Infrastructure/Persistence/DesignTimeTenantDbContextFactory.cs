using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;
using Microsoft.Extensions.Configuration;

namespace MetroBeezFMS.Infrastructure.Persistence;

public sealed class DesignTimeTenantDbContextFactory : IDesignTimeDbContextFactory<TenantDbContext>
{
    public TenantDbContext CreateDbContext(string[] args)
    {
        var configuration = new ConfigurationBuilder()
            .AddEnvironmentVariables()
            .Build();
        var databaseName = configuration["TENANT_MIGRATION_DATABASE"] ?? "metrobeez_fms_tenant_design";
        var options = new DbContextOptionsBuilder<TenantDbContext>()
            .UseNpgsql(DatabaseConnectionFactory.BuildTenantConnectionString(configuration, databaseName))
            .Options;

        return new TenantDbContext(options);
    }
}
