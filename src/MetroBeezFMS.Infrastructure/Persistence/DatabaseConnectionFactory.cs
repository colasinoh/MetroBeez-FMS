using Microsoft.Extensions.Configuration;
using Npgsql;

namespace MetroBeezFMS.Infrastructure.Persistence;

public static class DatabaseConnectionFactory
{
    public static string BuildCentralConnectionString(IConfiguration configuration)
    {
        var database = configuration["DB_MASTER_DATABASE"] ?? "metrobeez_fms_central";
        return BuildConnectionString(configuration, database);
    }

    public static string BuildTenantConnectionString(IConfiguration configuration, string databaseName)
    {
        return BuildConnectionString(configuration, databaseName);
    }

    public static string BuildAdminConnectionString(IConfiguration configuration)
    {
        var database = configuration["DB_MASTER_DATABASE"] ?? "postgres";
        return BuildConnectionString(configuration, database);
    }

    private static string BuildConnectionString(IConfiguration configuration, string databaseName)
    {
        var port = int.TryParse(configuration["DB_PORT"], out var parsedPort) ? parsedPort : 5432;
        var builder = new NpgsqlConnectionStringBuilder
        {
            Host = configuration["DB_HOST"] ?? "localhost",
            Port = port,
            Database = databaseName,
            Username = configuration["DB_ADMIN_USERNAME"] ?? "",
            Password = configuration["DB_ADMIN_PASSWORD"] ?? "",
            IncludeErrorDetail = true
        };

        return builder.ConnectionString;
    }
}
