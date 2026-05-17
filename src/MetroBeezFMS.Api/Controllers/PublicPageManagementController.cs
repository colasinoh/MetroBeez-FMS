using MetroBeezFMS.Application;
using MetroBeezFMS.Domain;
using MetroBeezFMS.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace MetroBeezFMS.Api.Controllers;

[ApiController]
[Authorize(Roles = $"{Roles.OwnerAdmin},{Roles.Manager}")]
[Route("api/public-page")]
public sealed class PublicPageManagementController : ControllerBase
{
    private static readonly (string Code, string Label, string Icon, int SortOrder)[] DefaultFeatures =
    [
        ("aircon", "Air conditioning", "❄️", 10),
        ("automatic", "Automatic transmission", "⚙️", 20),
        ("manual", "Manual transmission", "🕹️", 30),
        ("driver", "Driver available", "🧑", 40),
        ("self_drive", "Self-drive ready", "🗝️", 50),
        ("fuel_efficient", "Fuel efficient", "⛽", 60),
        ("large_luggage", "Large luggage space", "🧳", 70),
        ("bluetooth", "Bluetooth audio", "🎵", 80),
        ("dashcam", "Dashcam", "📷", 90),
        ("delivery", "Delivery/logistics", "📦", 100)
    ];

    private static readonly (string Code, string Label, string Icon, int SortOrder)[] CleanDefaultFeatures =
    [
        ("aircon", "Air conditioning", "AC", 10),
        ("automatic", "Automatic transmission", "AT", 20),
        ("manual", "Manual transmission", "MT", 30),
        ("driver", "Driver available", "DR", 40),
        ("self_drive", "Self-drive ready", "SD", 50),
        ("fuel_efficient", "Fuel efficient", "FE", 60),
        ("large_luggage", "Large luggage space", "LG", 70),
        ("bluetooth", "Bluetooth audio", "BT", 80),
        ("dashcam", "Dashcam", "DC", 90),
        ("delivery", "Delivery/logistics", "DL", 100)
    ];

    private readonly TenantDbContextFactory _tenantDbContextFactory;
    private readonly CentralDbContext _centralDbContext;
    private readonly ICurrentTenantService _currentTenant;
    private readonly IFileStorageService _fileStorageService;

    public PublicPageManagementController(
        TenantDbContextFactory tenantDbContextFactory,
        CentralDbContext centralDbContext,
        ICurrentTenantService currentTenant,
        IFileStorageService fileStorageService)
    {
        _tenantDbContextFactory = tenantDbContextFactory;
        _centralDbContext = centralDbContext;
        _currentTenant = currentTenant;
        _fileStorageService = fileStorageService;
    }

    [HttpGet]
    public async Task<ActionResult<PublicPageManagementDto>> Get(CancellationToken cancellationToken)
    {
        var tenant = await CurrentTenantAsync(cancellationToken);
        if (tenant is null)
        {
            return Forbid();
        }

        await using var db = await _tenantDbContextFactory.CreateAsync(cancellationToken);
        await EnsureFeatureDefinitionsAsync(db, cancellationToken);

        var profile = await EnsureCompanyProfileAsync(db, tenant.Name, cancellationToken);
        var features = await db.VehicleFeatureDefinitions
            .AsNoTracking()
            .Where(x => x.IsActive)
            .OrderBy(x => x.SortOrder)
            .ThenBy(x => x.Label)
            .ToListAsync(cancellationToken);

        var listings = await BuildListingDtosAsync(db, cancellationToken);
        return Ok(new PublicPageManagementDto(
            new PublicPageSettingsDto(
                profile.PublicPageEnabled,
                tenant.Slug,
                $"{Request.Scheme}://{Request.Host}/{tenant.Slug}",
                profile.CompanyName,
                profile.PublicPageHeadline,
                profile.PublicPageDescription,
                profile.PublicBookingInstructions),
            features.Select(x => new VehicleFeatureDefinitionDto(x.Id, x.Code, x.Label, x.Icon, x.SortOrder)),
            listings));
    }

    [HttpPut("settings")]
    public async Task<ActionResult<PublicPageSettingsDto>> UpdateSettings(UpdatePublicPageSettingsRequest request, CancellationToken cancellationToken)
    {
        var tenant = await CurrentTenantAsync(cancellationToken);
        if (tenant is null)
        {
            return Forbid();
        }

        await using var db = await _tenantDbContextFactory.CreateAsync(cancellationToken);
        var profile = await EnsureCompanyProfileAsync(db, tenant.Name, cancellationToken);
        profile.PublicPageEnabled = request.Enabled;
        profile.PublicPageHeadline = TrimToNull(request.Headline);
        profile.PublicPageDescription = TrimToNull(request.Description);
        profile.PublicBookingInstructions = TrimToNull(request.BookingInstructions);
        await db.SaveChangesAsync(cancellationToken);

        return Ok(new PublicPageSettingsDto(
            profile.PublicPageEnabled,
            tenant.Slug,
            $"{Request.Scheme}://{Request.Host}/{tenant.Slug}",
            profile.CompanyName,
            profile.PublicPageHeadline,
            profile.PublicPageDescription,
            profile.PublicBookingInstructions));
    }

    [HttpPut("vehicles/{vehicleId:guid}")]
    public async Task<ActionResult<PublicVehicleListingDto>> UpdateVehicleListing(Guid vehicleId, UpdatePublicVehicleListingRequest request, CancellationToken cancellationToken)
    {
        await using var db = await _tenantDbContextFactory.CreateAsync(cancellationToken);
        await EnsureFeatureDefinitionsAsync(db, cancellationToken);

        var vehicle = await db.Vehicles.AsNoTracking().FirstOrDefaultAsync(x => x.Id == vehicleId, cancellationToken);
        if (vehicle is null)
        {
            return NotFound();
        }

        var publicPhotoCount = await db.DocumentAttachments.CountAsync(
            x => x.IsPhoto && x.IsPublic && x.EntityType == "Vehicle" && x.EntityId == vehicleId,
            cancellationToken);

        if (request.IsPublished && publicPhotoCount == 0)
        {
            return ValidationProblem("Choose at least one public vehicle photo before publishing this vehicle.");
        }

        var listing = await db.PublicVehicleListings
            .FirstOrDefaultAsync(x => x.VehicleId == vehicleId, cancellationToken);

        if (listing is null)
        {
            listing = new PublicVehicleListing { VehicleId = vehicleId };
            db.PublicVehicleListings.Add(listing);
        }

        listing.IsPublished = request.IsPublished;
        listing.PriceAmount = request.PriceAmount;
        listing.PriceUnit = TrimToNull(request.PriceUnit) ?? "per day";
        listing.Description = TrimToNull(request.Description);
        listing.RentalNotes = TrimToNull(request.RentalNotes);
        listing.ShowPlateNumber = request.ShowPlateNumber;
        listing.DisplayOrder = request.DisplayOrder;

        var requestedFeatureIds = (request.FeatureDefinitionIds ?? Enumerable.Empty<Guid>()).Distinct().ToList();
        var validFeatureIds = await db.VehicleFeatureDefinitions
            .Where(x => requestedFeatureIds.Contains(x.Id) && x.IsActive)
            .Select(x => x.Id)
            .ToListAsync(cancellationToken);

        await db.PublicVehicleFeatures
            .Where(x => x.PublicVehicleListingId == listing.Id)
            .ExecuteDeleteAsync(cancellationToken);

        var displayOrder = 0;
        foreach (var featureId in validFeatureIds)
        {
            db.PublicVehicleFeatures.Add(new PublicVehicleFeature
            {
                PublicVehicleListingId = listing.Id,
                FeatureDefinitionId = featureId,
                DisplayOrder = displayOrder++
            });
        }

        foreach (var custom in request.CustomFeatures ?? Enumerable.Empty<CustomVehicleFeatureRequest>())
        {
            if (string.IsNullOrWhiteSpace(custom.Label))
            {
                continue;
            }

            db.PublicVehicleFeatures.Add(new PublicVehicleFeature
            {
                PublicVehicleListingId = listing.Id,
                CustomLabel = custom.Label.Trim(),
                CustomIcon = TrimToNull(custom.Icon) ?? "+",
                DisplayOrder = custom.DisplayOrder
            });
        }

        await db.SaveChangesAsync(cancellationToken);
        var listings = await BuildListingDtosAsync(db, cancellationToken);
        return Ok(listings.First(x => x.VehicleId == vehicleId));
    }

    private async Task<Tenant?> CurrentTenantAsync(CancellationToken cancellationToken)
    {
        if (_currentTenant.TenantId is null)
        {
            return null;
        }

        return await _centralDbContext.Tenants
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == _currentTenant.TenantId.Value, cancellationToken);
    }

    private static async Task<CompanyProfile> EnsureCompanyProfileAsync(TenantDbContext db, string companyName, CancellationToken cancellationToken)
    {
        var profile = await db.CompanyProfiles.FirstOrDefaultAsync(cancellationToken);
        if (profile is not null)
        {
            return profile;
        }

        profile = new CompanyProfile { CompanyName = companyName };
        db.CompanyProfiles.Add(profile);
        await db.SaveChangesAsync(cancellationToken);
        return profile;
    }

    private static async Task EnsureFeatureDefinitionsAsync(TenantDbContext db, CancellationToken cancellationToken)
    {
        var definitions = await db.VehicleFeatureDefinitions
            .ToListAsync(cancellationToken);

        foreach (var feature in CleanDefaultFeatures)
        {
            var existing = definitions.FirstOrDefault(x => x.Code == feature.Code);
            if (existing is null)
            {
                db.VehicleFeatureDefinitions.Add(new VehicleFeatureDefinition
                {
                    Code = feature.Code,
                    Label = feature.Label,
                    Icon = feature.Icon,
                    SortOrder = feature.SortOrder,
                    IsActive = true
                });
                continue;
            }

            existing.Label = feature.Label;
            existing.Icon = feature.Icon;
            existing.SortOrder = feature.SortOrder;
            existing.IsActive = true;
        }

        await db.SaveChangesAsync(cancellationToken);
    }

    private async Task<IReadOnlyList<PublicVehicleListingDto>> BuildListingDtosAsync(TenantDbContext db, CancellationToken cancellationToken)
    {
        var vehicles = await db.Vehicles
            .AsNoTracking()
            .OrderBy(x => x.PlateNumber)
            .ToListAsync(cancellationToken);
        var vehicleIds = vehicles.Select(x => x.Id).ToList();

        var photos = await db.DocumentAttachments
            .AsNoTracking()
            .Where(x => x.IsPhoto && x.EntityType == "Vehicle" && vehicleIds.Contains(x.EntityId))
            .OrderBy(x => x.DisplayOrder)
            .ThenByDescending(x => x.UploadedAt)
            .ToListAsync(cancellationToken);

        var listings = await db.PublicVehicleListings
            .AsNoTracking()
            .Include(x => x.Features)
            .ThenInclude(x => x.FeatureDefinition)
            .Where(x => vehicleIds.Contains(x.VehicleId))
            .ToListAsync(cancellationToken);

        var result = new List<PublicVehicleListingDto>();
        foreach (var vehicle in vehicles)
        {
            var listing = listings.FirstOrDefault(x => x.VehicleId == vehicle.Id);
            var vehiclePhotos = photos.Where(x => x.EntityId == vehicle.Id).ToList();
            result.Add(new PublicVehicleListingDto(
                listing?.Id,
                vehicle.Id,
                $"{vehicle.PlateNumber} - {vehicle.YearModel} {vehicle.Make} {vehicle.Model}",
                vehicle.Status.ToString(),
                vehiclePhotos.Count,
                vehiclePhotos.Count(x => x.IsPublic),
                listing?.IsPublished ?? false,
                listing?.PriceAmount,
                listing?.PriceUnit,
                listing?.Description,
                listing?.RentalNotes,
                listing?.ShowPlateNumber ?? false,
                listing?.DisplayOrder ?? 0,
                await ToPhotoDtosAsync(vehiclePhotos, cancellationToken),
                (listing?.Features ?? Enumerable.Empty<PublicVehicleFeature>()).OrderBy(x => x.DisplayOrder).Select(ToFeatureDto)));
        }

        return result.OrderBy(x => x.DisplayOrder).ThenBy(x => x.VehicleLabel).ToList();
    }

    private async Task<IReadOnlyList<PhotoDto>> ToPhotoDtosAsync(IEnumerable<DocumentAttachment> photos, CancellationToken cancellationToken)
    {
        var items = new List<PhotoDto>();
        foreach (var photo in photos)
        {
            items.Add(new PhotoDto(
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
                photo.UploadedAt));
        }

        return items;
    }

    private static PublicVehicleFeatureDto ToFeatureDto(PublicVehicleFeature feature)
    {
        if (feature.FeatureDefinition is not null)
        {
            return new PublicVehicleFeatureDto(
                feature.FeatureDefinitionId,
                feature.FeatureDefinition.Label,
                feature.FeatureDefinition.Icon,
                false,
                feature.DisplayOrder);
        }

        return new PublicVehicleFeatureDto(
            null,
            feature.CustomLabel ?? "Custom feature",
            string.IsNullOrWhiteSpace(feature.CustomIcon) ? "+" : feature.CustomIcon,
            true,
            feature.DisplayOrder);
    }

    private static string? TrimToNull(string? value)
    {
        return string.IsNullOrWhiteSpace(value) ? null : value.Trim();
    }
}
