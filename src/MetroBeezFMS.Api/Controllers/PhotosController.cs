using MetroBeezFMS.Application;
using MetroBeezFMS.Domain;
using MetroBeezFMS.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using System.Text;

namespace MetroBeezFMS.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/photos")]
public sealed class PhotosController : ControllerBase
{
    private readonly TenantDbContextFactory _tenantDbContextFactory;
    private readonly IFileStorageService _fileStorageService;
    private readonly ITenantStoragePathResolver _tenantStoragePathResolver;
    private readonly ICurrentTenantService _currentTenant;

    public PhotosController(
        TenantDbContextFactory tenantDbContextFactory,
        IFileStorageService fileStorageService,
        ITenantStoragePathResolver tenantStoragePathResolver,
        ICurrentTenantService currentTenant)
    {
        _tenantDbContextFactory = tenantDbContextFactory;
        _fileStorageService = fileStorageService;
        _tenantStoragePathResolver = tenantStoragePathResolver;
        _currentTenant = currentTenant;
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<PhotoDto>>> List([FromQuery] string entityType, [FromQuery] Guid entityId, CancellationToken cancellationToken)
    {
        var normalizedEntityType = NormalizeEntityType(entityType);
        if (normalizedEntityType is null)
        {
            return ValidationProblem("Photos are currently supported for vehicles and drivers.");
        }

        await using var db = await _tenantDbContextFactory.CreateAsync(cancellationToken);
        List<DocumentAttachment> photos;
        try
        {
            photos = await db.DocumentAttachments
                .AsNoTracking()
                .Where(x => x.IsPhoto && x.EntityType == normalizedEntityType && x.EntityId == entityId)
                .OrderBy(x => x.DisplayOrder)
                .ThenByDescending(x => x.UploadedAt)
                .ToListAsync(cancellationToken);
        }
        catch (PostgresException exception) when (IsMissingPhotoMigration(exception))
        {
            return Problem(
                "This tenant database needs the latest photo/public-page migration before photos can be used.",
                statusCode: StatusCodes.Status503ServiceUnavailable,
                title: "Tenant database migration required");
        }

        return Ok(await ToPhotoDtosAsync(photos, cancellationToken));
    }

    [HttpPost("upload")]
    [RequestSizeLimit(12_000_000)]
    [Authorize(Roles = $"{Roles.OwnerAdmin},{Roles.Manager}")]
    public async Task<ActionResult<PhotoDto>> Upload(
        [FromForm] IFormFile file,
        [FromForm] string entityType,
        [FromForm] Guid entityId,
        [FromForm] string? caption,
        [FromForm] bool isPublic,
        [FromForm] int displayOrder,
        CancellationToken cancellationToken)
    {
        var normalizedEntityType = NormalizeEntityType(entityType);
        if (normalizedEntityType is null)
        {
            return ValidationProblem("Photos are currently supported for vehicles and drivers.");
        }

        var fileValidationError = ValidatePhotoFile(file);
        if (fileValidationError is not null)
        {
            return ValidationProblem(fileValidationError);
        }

        if (_currentTenant.TenantId is null)
        {
            return Forbid();
        }

        await using var db = await _tenantDbContextFactory.CreateAsync(cancellationToken);
        var entityExists = normalizedEntityType == "Vehicle"
            ? await db.Vehicles.AnyAsync(x => x.Id == entityId, cancellationToken)
            : await db.Drivers.AnyAsync(x => x.Id == entityId, cancellationToken);

        if (!entityExists)
        {
            return NotFound();
        }

        await using var stream = file.OpenReadStream();
        var tenantStorageRoot = await _tenantStoragePathResolver.GetStorageRootAsync(_currentTenant.TenantId.Value, cancellationToken);
        var storedFile = await _fileStorageService.SaveAsync(
            stream,
            file.FileName,
            file.ContentType,
            tenantStorageRoot,
            normalizedEntityType == "Vehicle" ? TenantStorageFolders.VehiclePhotos : TenantStorageFolders.DriverPhotos,
            cancellationToken);

        var photo = new DocumentAttachment
        {
            EntityType = normalizedEntityType,
            EntityId = entityId,
            FileName = storedFile.FileName,
            OriginalFileName = storedFile.OriginalFileName,
            FileUrl = storedFile.FileUrl,
            ContentType = storedFile.ContentType,
            FileSize = storedFile.FileSize,
            DocumentType = "Photo",
            UploadedBy = _currentTenant.UserId?.ToString(),
            IsPhoto = true,
            IsPublic = isPublic,
            Caption = string.IsNullOrWhiteSpace(caption) ? null : caption.Trim(),
            DisplayOrder = displayOrder
        };

        db.DocumentAttachments.Add(photo);
        try
        {
            await db.SaveChangesAsync(cancellationToken);
        }
        catch (PostgresException exception) when (IsMissingPhotoMigration(exception))
        {
            return Problem(
                "This tenant database needs the latest photo/public-page migration before photos can be used.",
                statusCode: StatusCodes.Status503ServiceUnavailable,
                title: "Tenant database migration required");
        }

        return CreatedAtAction(nameof(List), new { entityType = normalizedEntityType, entityId }, await ToPhotoDtoAsync(photo, cancellationToken));
    }

    [HttpPut("{id:guid}")]
    [Authorize(Roles = $"{Roles.OwnerAdmin},{Roles.Manager}")]
    public async Task<ActionResult<PhotoDto>> Update(Guid id, UpdatePhotoRequest request, CancellationToken cancellationToken)
    {
        await using var db = await _tenantDbContextFactory.CreateAsync(cancellationToken);
        var photo = await db.DocumentAttachments.FirstOrDefaultAsync(x => x.Id == id && x.IsPhoto, cancellationToken);
        if (photo is null)
        {
            return NotFound();
        }

        photo.IsPublic = request.IsPublic;
        photo.Caption = string.IsNullOrWhiteSpace(request.Caption) ? null : request.Caption.Trim();
        photo.DisplayOrder = request.DisplayOrder;
        await db.SaveChangesAsync(cancellationToken);

        return Ok(await ToPhotoDtoAsync(photo, cancellationToken));
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Roles = $"{Roles.OwnerAdmin},{Roles.Manager}")]
    public async Task<ActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        await using var db = await _tenantDbContextFactory.CreateAsync(cancellationToken);
        var photo = await db.DocumentAttachments.FirstOrDefaultAsync(x => x.Id == id && x.IsPhoto, cancellationToken);
        if (photo is null)
        {
            return NotFound();
        }

        db.DocumentAttachments.Remove(photo);
        await db.SaveChangesAsync(cancellationToken);
        return NoContent();
    }

    private static string? NormalizeEntityType(string? entityType)
    {
        return entityType?.Trim().ToLowerInvariant() switch
        {
            "vehicle" or "vehicles" => "Vehicle",
            "driver" or "drivers" => "Driver",
            _ => null
        };
    }

    private static string? ValidatePhotoFile(IFormFile file)
    {
        if (file.Length == 0)
        {
            return "Choose a non-empty image file.";
        }

        const long maxBytes = 8 * 1024 * 1024;
        if (file.Length > maxBytes)
        {
            return "Use an image smaller than 8 MB.";
        }

        var detectedType = DetectBrowserImageType(file);
        if (detectedType == "heic")
        {
            return "This file is a HEIC/HEIF photo. Convert it to JPG, PNG, or WebP first so browsers can preview it.";
        }

        if (detectedType is not "jpeg" and not "png" and not "webp")
        {
            return "Use a real JPG, PNG, or WebP image. Renamed HEIC or unsupported files cannot be previewed by browsers.";
        }

        return null;
    }

    private static string? DetectBrowserImageType(IFormFile file)
    {
        Span<byte> buffer = stackalloc byte[32];
        using var stream = file.OpenReadStream();
        var bytesRead = stream.Read(buffer);
        var bytes = buffer[..bytesRead];

        if (bytesRead >= 3 && bytes[0] == 0xFF && bytes[1] == 0xD8 && bytes[2] == 0xFF)
        {
            return "jpeg";
        }

        if (bytesRead >= 8
            && bytes[0] == 0x89
            && bytes[1] == 0x50
            && bytes[2] == 0x4E
            && bytes[3] == 0x47
            && bytes[4] == 0x0D
            && bytes[5] == 0x0A
            && bytes[6] == 0x1A
            && bytes[7] == 0x0A)
        {
            return "png";
        }

        if (bytesRead >= 12
            && Encoding.ASCII.GetString(bytes[..4]) == "RIFF"
            && Encoding.ASCII.GetString(bytes.Slice(8, 4)) == "WEBP")
        {
            return "webp";
        }

        if (bytesRead >= 12 && Encoding.ASCII.GetString(bytes.Slice(4, 4)) == "ftyp")
        {
            var brand = Encoding.ASCII.GetString(bytes.Slice(8, Math.Min(bytesRead - 8, 16))).ToLowerInvariant();
            if (brand.Contains("heic") || brand.Contains("heix") || brand.Contains("hevc") || brand.Contains("hevx") || brand.Contains("mif1") || brand.Contains("msf1"))
            {
                return "heic";
            }
        }

        return null;
    }

    private static bool IsMissingPhotoMigration(PostgresException exception)
    {
        return exception.SqlState is PostgresErrorCodes.UndefinedColumn or PostgresErrorCodes.UndefinedTable;
    }

    private async Task<IReadOnlyList<PhotoDto>> ToPhotoDtosAsync(IEnumerable<DocumentAttachment> photos, CancellationToken cancellationToken)
    {
        var items = new List<PhotoDto>();
        foreach (var photo in photos)
        {
            items.Add(await ToPhotoDtoAsync(photo, cancellationToken));
        }

        return items;
    }

    private async Task<PhotoDto> ToPhotoDtoAsync(DocumentAttachment photo, CancellationToken cancellationToken)
    {
        return new PhotoDto(
            photo.Id,
            photo.EntityType,
            photo.EntityId,
            photo.OriginalFileName,
            photo.FileUrl,
            await _fileStorageService.GetDisplayUrlAsync(photo.FileUrl, TimeSpan.FromMinutes(30), cancellationToken),
            photo.ContentType,
            photo.FileSize,
            photo.IsPublic,
            photo.Caption,
            photo.DisplayOrder,
            photo.UploadedAt);
    }
}
