using MetroBeezFMS.Application;
using MetroBeezFMS.Domain;
using MetroBeezFMS.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace MetroBeezFMS.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/documents")]
public sealed class DocumentsController : ControllerBase
{
    private readonly TenantDbContextFactory _tenantDbContextFactory;
    private readonly IFileStorageService _fileStorageService;
    private readonly ITenantStoragePathResolver _tenantStoragePathResolver;
    private readonly ICurrentTenantService _currentTenant;

    public DocumentsController(
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
    public async Task<ActionResult<IReadOnlyList<DocumentAttachmentDto>>> List([FromQuery] string? entityType, [FromQuery] Guid? entityId, [FromQuery] string? expires, CancellationToken cancellationToken)
    {
        await using var db = await _tenantDbContextFactory.CreateAsync(cancellationToken);
        var query = db.DocumentAttachments.AsNoTracking();
        if (!string.IsNullOrWhiteSpace(entityType))
        {
            query = query.Where(x => x.EntityType == entityType);
        }

        if (entityId is not null)
        {
            query = query.Where(x => x.EntityId == entityId);
        }

        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        query = expires?.ToLowerInvariant() switch
        {
            "7" => query.Where(x => x.ExpirationDate != null && x.ExpirationDate <= today.AddDays(7)),
            "30" => query.Where(x => x.ExpirationDate != null && x.ExpirationDate <= today.AddDays(30)),
            "expired" => query.Where(x => x.ExpirationDate != null && x.ExpirationDate < today),
            _ => query
        };

        var documents = await query
            .OrderBy(x => x.ExpirationDate)
            .ThenByDescending(x => x.UploadedAt)
            .ToListAsync(cancellationToken);

        return Ok(await ToDocumentDtosAsync(documents, cancellationToken));
    }

    [HttpPost("upload")]
    [RequestSizeLimit(25_000_000)]
    [Authorize(Roles = $"{Roles.OwnerAdmin},{Roles.Manager},{Roles.Driver}")]
    public async Task<ActionResult<DocumentAttachmentDto>> Upload(
        IFormFile file,
        [FromForm] string entityType,
        [FromForm] Guid entityId,
        [FromForm] string documentType,
        [FromForm] DateOnly? expirationDate,
        CancellationToken cancellationToken)
    {
        var fileValidationError = ValidateDocumentFile(file);
        if (fileValidationError is not null || string.IsNullOrWhiteSpace(entityType) || string.IsNullOrWhiteSpace(documentType))
        {
            return ValidationProblem(fileValidationError ?? "A file, entity type, entity id, and document type are required.");
        }

        if (_currentTenant.TenantId is null)
        {
            return Forbid();
        }

        await using var stream = file.OpenReadStream();
        var tenantStorageRoot = await _tenantStoragePathResolver.GetStorageRootAsync(_currentTenant.TenantId.Value, cancellationToken);
        var storedFile = await _fileStorageService.SaveAsync(
            stream,
            file.FileName,
            file.ContentType,
            tenantStorageRoot,
            TenantStorageFolders.ForEntity(entityType),
            cancellationToken);

        await using var db = await _tenantDbContextFactory.CreateAsync(cancellationToken);
        var document = new DocumentAttachment
        {
            EntityType = entityType.Trim(),
            EntityId = entityId,
            FileName = storedFile.FileName,
            OriginalFileName = storedFile.OriginalFileName,
            FileUrl = storedFile.FileUrl,
            ContentType = storedFile.ContentType,
            FileSize = storedFile.FileSize,
            DocumentType = documentType.Trim(),
            ExpirationDate = expirationDate,
            UploadedBy = _currentTenant.UserId?.ToString()
        };

        db.DocumentAttachments.Add(document);
        await db.SaveChangesAsync(cancellationToken);
        return CreatedAtAction(nameof(List), new { entityType, entityId }, await ToDocumentDtoAsync(document, cancellationToken));
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Roles = $"{Roles.OwnerAdmin},{Roles.Manager}")]
    public async Task<ActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        await using var db = await _tenantDbContextFactory.CreateAsync(cancellationToken);
        var document = await db.DocumentAttachments.FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
        if (document is null)
        {
            return NotFound();
        }

        db.DocumentAttachments.Remove(document);
        await db.SaveChangesAsync(cancellationToken);
        return NoContent();
    }

    private async Task<IReadOnlyList<DocumentAttachmentDto>> ToDocumentDtosAsync(IEnumerable<DocumentAttachment> documents, CancellationToken cancellationToken)
    {
        var items = new List<DocumentAttachmentDto>();
        foreach (var document in documents)
        {
            items.Add(await ToDocumentDtoAsync(document, cancellationToken));
        }

        return items;
    }

    private async Task<DocumentAttachmentDto> ToDocumentDtoAsync(DocumentAttachment document, CancellationToken cancellationToken)
    {
        var displayUrl = await _fileStorageService.GetDisplayUrlAsync(document.FileUrl, TimeSpan.FromMinutes(30), cancellationToken);
        return document.ToDto(displayUrl);
    }

    private static string? ValidateDocumentFile(IFormFile file)
    {
        if (file.Length == 0)
        {
            return "Choose a non-empty document file.";
        }

        const long maxBytes = 20 * 1024 * 1024;
        if (file.Length > maxBytes)
        {
            return "Use a document smaller than 20 MB.";
        }

        var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
        var supported = extension is ".pdf" or ".jpg" or ".jpeg" or ".png" or ".webp" or ".doc" or ".docx" or ".xls" or ".xlsx";
        return supported ? null : "Use a PDF, JPG, PNG, WebP, Word, or Excel file.";
    }
}
