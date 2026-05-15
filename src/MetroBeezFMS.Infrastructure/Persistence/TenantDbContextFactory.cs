using MetroBeezFMS.Application;
using MetroBeezFMS.Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;

namespace MetroBeezFMS.Infrastructure.Persistence;

public sealed class TenantDbContextFactory : ITenantDbContextFactory
{
    private readonly CentralDbContext _centralDbContext;
    private readonly ICurrentTenantService _currentTenant;
    private readonly IConfiguration _configuration;

    public TenantDbContextFactory(
        CentralDbContext centralDbContext,
        ICurrentTenantService currentTenant,
        IConfiguration configuration)
    {
        _centralDbContext = centralDbContext;
        _currentTenant = currentTenant;
        _configuration = configuration;
    }

    async Task<DbContext> ITenantDbContextFactory.CreateDbContextAsync(CancellationToken cancellationToken)
    {
        return await CreateAsync(cancellationToken);
    }

    public async Task<TenantDbContext> CreateAsync(CancellationToken cancellationToken = default)
    {
        if (_currentTenant.TenantId is null || _currentTenant.UserId is null)
        {
            throw new UnauthorizedAccessException("A tenant-scoped request requires an authenticated user and tenant.");
        }

        var tenantUser = await _centralDbContext.TenantUsers
            .AsNoTracking()
            .Include(x => x.Tenant)
            .FirstOrDefaultAsync(x =>
                x.TenantId == _currentTenant.TenantId.Value &&
                x.UserId == _currentTenant.UserId.Value &&
                x.IsActive,
                cancellationToken);

        if (tenantUser?.Tenant is null || tenantUser.Tenant.Status != TenantStatus.Active)
        {
            throw new UnauthorizedAccessException("The requested tenant is not active or is not assigned to the current user.");
        }

        var connectionString = DatabaseConnectionFactory.BuildTenantConnectionString(_configuration, tenantUser.Tenant.DatabaseName);
        var options = new DbContextOptionsBuilder<TenantDbContext>()
            .UseNpgsql(connectionString)
            .Options;

        return new TenantDbContext(options);
    }
}
