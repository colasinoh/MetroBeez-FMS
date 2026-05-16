using MetroBeezFMS.Application;
using MetroBeezFMS.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace MetroBeezFMS.Infrastructure.Services;

public sealed class TenantStoragePathResolver : ITenantStoragePathResolver
{
    private readonly CentralDbContext _centralDbContext;

    public TenantStoragePathResolver(CentralDbContext centralDbContext)
    {
        _centralDbContext = centralDbContext;
    }

    public async Task<string> GetStorageRootAsync(Guid tenantId, CancellationToken cancellationToken = default)
    {
        var slug = await _centralDbContext.Tenants
            .AsNoTracking()
            .Where(x => x.Id == tenantId)
            .Select(x => x.Slug)
            .FirstOrDefaultAsync(cancellationToken);

        return string.IsNullOrWhiteSpace(slug) ? tenantId.ToString("N") : slug;
    }
}
