using Amazon;
using Amazon.S3;
using Amazon.S3.Model;
using MetroBeezFMS.Application;
using Microsoft.Extensions.Configuration;

namespace MetroBeezFMS.Infrastructure.Services;

public sealed class S3FileStorageService : IFileStorageService
{
    private readonly IAmazonS3 _s3Client;
    private readonly string _bucketName;
    private readonly string? _publicBaseUrl;
    private readonly string _keyPrefix;

    public S3FileStorageService(IConfiguration configuration)
    {
        _bucketName = FirstNonEmpty(configuration["AWS_S3_BUCKET"], configuration["FileStorage:S3:BucketName"])
            ?? throw new InvalidOperationException("AWS_S3_BUCKET is required when FileStorage__Provider=S3.");
        _publicBaseUrl = FirstNonEmpty(configuration["AWS_S3_PUBLIC_BASE_URL"], configuration["FileStorage:S3:PublicBaseUrl"]);
        _keyPrefix = NormalizePrefix(FirstNonEmpty(configuration["AWS_S3_KEY_PREFIX"], configuration["FileStorage:S3:KeyPrefix"]) ?? "prod-media");

        var regionName = FirstNonEmpty(configuration["AWS_REGION"], configuration["FileStorage:S3:Region"])
            ?? throw new InvalidOperationException("AWS_REGION is required when FileStorage__Provider=S3.");
        var serviceUrl = FirstNonEmpty(configuration["AWS_S3_SERVICE_URL"], configuration["FileStorage:S3:ServiceUrl"]);

        var config = new AmazonS3Config();
        if (!string.IsNullOrWhiteSpace(serviceUrl))
        {
            config.ServiceURL = serviceUrl;
            config.ForcePathStyle = true;
        }
        else
        {
            config.RegionEndpoint = RegionEndpoint.GetBySystemName(regionName);
        }

        _s3Client = new AmazonS3Client(config);
    }

    public async Task<StoredFile> SaveAsync(Stream stream, string originalFileName, string? contentType, string tenantId, CancellationToken cancellationToken = default)
    {
        var extension = Path.GetExtension(originalFileName);
        var safeExtension = string.IsNullOrWhiteSpace(extension) ? "" : extension.ToLowerInvariant();
        var fileName = $"{Guid.NewGuid():N}{safeExtension}";
        var key = $"{TenantRootKey(tenantId)}{DateTime.UtcNow:yyyy/MM}/{fileName}";

        var request = new PutObjectRequest
        {
            BucketName = _bucketName,
            Key = key,
            InputStream = stream,
            ContentType = string.IsNullOrWhiteSpace(contentType) ? "application/octet-stream" : contentType,
            AutoCloseStream = false
        };

        await _s3Client.PutObjectAsync(request, cancellationToken);

        var fileUrl = !string.IsNullOrWhiteSpace(_publicBaseUrl)
            ? BuildPublicUrl(key)
            : $"s3://{_bucketName}/{key}";

        return new StoredFile(key, originalFileName, fileUrl, contentType, stream.CanSeek ? stream.Length : 0);
    }

    public async Task EnsureTenantRootAsync(string tenantId, CancellationToken cancellationToken = default)
    {
        var request = new PutObjectRequest
        {
            BucketName = _bucketName,
            Key = TenantRootKey(tenantId),
            ContentBody = string.Empty,
            ContentType = "application/x-directory"
        };

        await _s3Client.PutObjectAsync(request, cancellationToken);
    }

    private static string? FirstNonEmpty(params string?[] values)
    {
        return values.FirstOrDefault(value => !string.IsNullOrWhiteSpace(value));
    }

    private string TenantRootKey(string tenantId)
    {
        return string.IsNullOrWhiteSpace(_keyPrefix)
            ? $"tenants/{tenantId}/"
            : $"{_keyPrefix}/tenants/{tenantId}/";
    }

    private string BuildPublicUrl(string key)
    {
        var baseUrl = _publicBaseUrl!.TrimEnd('/');
        if (!string.IsNullOrWhiteSpace(_keyPrefix)
            && baseUrl.EndsWith($"/{_keyPrefix}", StringComparison.OrdinalIgnoreCase)
            && key.StartsWith($"{_keyPrefix}/", StringComparison.OrdinalIgnoreCase))
        {
            key = key[(_keyPrefix.Length + 1)..];
        }

        return $"{baseUrl}/{key}";
    }

    private static string NormalizePrefix(string value)
    {
        return value.Trim().Trim('/');
    }
}
