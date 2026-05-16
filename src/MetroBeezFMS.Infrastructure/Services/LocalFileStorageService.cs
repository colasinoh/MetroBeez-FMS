using MetroBeezFMS.Application;
using Microsoft.Extensions.Configuration;

namespace MetroBeezFMS.Infrastructure.Services;

public sealed class LocalFileStorageService : IFileStorageService
{
    private readonly string _storageRoot;
    private readonly string _publicBasePath;

    public LocalFileStorageService(IConfiguration configuration)
    {
        _storageRoot = string.IsNullOrWhiteSpace(configuration["FileStorage:LocalRoot"])
            ? Path.Combine(AppContext.BaseDirectory, "wwwroot", "uploads")
            : configuration["FileStorage:LocalRoot"]!;
        _publicBasePath = string.IsNullOrWhiteSpace(configuration["FileStorage:PublicBasePath"]) ? "/uploads" : configuration["FileStorage:PublicBasePath"]!;
    }

    public async Task<StoredFile> SaveAsync(Stream stream, string originalFileName, string? contentType, string tenantId, CancellationToken cancellationToken = default)
    {
        var extension = Path.GetExtension(originalFileName);
        var safeExtension = string.IsNullOrWhiteSpace(extension) ? "" : extension.ToLowerInvariant();
        var fileName = $"{Guid.NewGuid():N}{safeExtension}";
        var relativeFolder = Path.Combine(tenantId, DateTime.UtcNow.ToString("yyyy"), DateTime.UtcNow.ToString("MM"));
        var absoluteFolder = Path.Combine(_storageRoot, relativeFolder);
        Directory.CreateDirectory(absoluteFolder);

        var absolutePath = Path.Combine(absoluteFolder, fileName);
        await using (var output = File.Create(absolutePath))
        {
            await stream.CopyToAsync(output, cancellationToken);
        }

        var fileInfo = new FileInfo(absolutePath);
        var publicPath = $"{_publicBasePath}/{relativeFolder.Replace('\\', '/')}/{fileName}";
        return new StoredFile(fileName, originalFileName, publicPath, contentType, fileInfo.Length);
    }

    public Task EnsureTenantRootAsync(string tenantId, CancellationToken cancellationToken = default)
    {
        Directory.CreateDirectory(Path.Combine(_storageRoot, tenantId));
        return Task.CompletedTask;
    }
}
