using MetroBeezFMS.Application;
using Microsoft.Extensions.Configuration;
using System.Text.RegularExpressions;

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

    public async Task<StoredFile> SaveAsync(Stream stream, string originalFileName, string? contentType, string tenantStorageRoot, string? folder = null, CancellationToken cancellationToken = default)
    {
        var extension = Path.GetExtension(originalFileName);
        var safeExtension = string.IsNullOrWhiteSpace(extension) ? "" : extension.ToLowerInvariant();
        var fileName = $"{Guid.NewGuid():N}{safeExtension}";
        var safeTenantStorageRoot = NormalizeTenantStorageRoot(tenantStorageRoot);
        var relativeFolder = Path.Combine(
            new[] { safeTenantStorageRoot }
                .Concat(NormalizeFolderSegments(folder))
                .Concat([DateTime.UtcNow.ToString("yyyy"), DateTime.UtcNow.ToString("MM")])
                .ToArray());
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

    public Task<string?> GetDisplayUrlAsync(string? fileUrl, TimeSpan? expiresIn = null, CancellationToken cancellationToken = default)
    {
        return Task.FromResult(fileUrl);
    }

    public Task EnsureTenantRootAsync(string tenantStorageRoot, CancellationToken cancellationToken = default)
    {
        var safeTenantStorageRoot = NormalizeTenantStorageRoot(tenantStorageRoot);
        Directory.CreateDirectory(Path.Combine(_storageRoot, safeTenantStorageRoot));
        foreach (var folder in TenantStorageFolders.DefaultFolders)
        {
            Directory.CreateDirectory(Path.Combine(
                new[] { _storageRoot, safeTenantStorageRoot }
                    .Concat(NormalizeFolderSegments(folder))
                    .ToArray()));
        }

        return Task.CompletedTask;
    }

    public Task DeleteTenantRootAsync(string tenantStorageRoot, CancellationToken cancellationToken = default)
    {
        var safeTenantStorageRoot = NormalizeTenantStorageRoot(tenantStorageRoot);
        var tenantPath = Path.GetFullPath(Path.Combine(_storageRoot, safeTenantStorageRoot));
        var storageRoot = Path.GetFullPath(_storageRoot);
        if (!tenantPath.StartsWith(storageRoot, StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException("Tenant storage path is outside the configured storage root.");
        }

        if (Directory.Exists(tenantPath))
        {
            Directory.Delete(tenantPath, recursive: true);
        }

        return Task.CompletedTask;
    }

    private static string NormalizeTenantStorageRoot(string value)
    {
        var normalized = Regex.Replace(value.Trim().ToLowerInvariant(), "[^a-z0-9._-]+", "-").Trim('-', '.', '_');
        return string.IsNullOrWhiteSpace(normalized) ? "tenant" : normalized;
    }

    private static IEnumerable<string> NormalizeFolderSegments(string? folder)
    {
        if (string.IsNullOrWhiteSpace(folder))
        {
            return [];
        }

        return folder
            .Replace('\\', '/')
            .Split('/', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Select(segment => Regex.Replace(segment.ToLowerInvariant(), "[^a-z0-9._-]+", "-").Trim('-', '.', '_'))
            .Where(segment => !string.IsNullOrWhiteSpace(segment));
    }
}
