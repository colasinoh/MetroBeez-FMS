using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;
using Microsoft.Extensions.Configuration;

namespace MetroBeezFMS.Infrastructure.Persistence;

public sealed class DesignTimeCentralDbContextFactory : IDesignTimeDbContextFactory<CentralDbContext>
{
    public CentralDbContext CreateDbContext(string[] args)
    {
        var configuration = new ConfigurationBuilder()
            .AddEnvironmentVariables()
            .Build();
        var options = new DbContextOptionsBuilder<CentralDbContext>()
            .UseNpgsql(DatabaseConnectionFactory.BuildCentralConnectionString(configuration))
            .Options;

        return new CentralDbContext(options);
    }
}
