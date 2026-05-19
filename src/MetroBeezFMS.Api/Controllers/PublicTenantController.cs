using MetroBeezFMS.Application;
using MetroBeezFMS.Domain;
using MetroBeezFMS.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace MetroBeezFMS.Api.Controllers;

[ApiController]
[AllowAnonymous]
[Route("api/public/{slug}")]
public sealed class PublicTenantController : ControllerBase
{
    private readonly CentralDbContext _centralDbContext;
    private readonly IConfiguration _configuration;
    private readonly IFileStorageService _fileStorageService;

    public PublicTenantController(
        CentralDbContext centralDbContext,
        IConfiguration configuration,
        IFileStorageService fileStorageService)
    {
        _centralDbContext = centralDbContext;
        _configuration = configuration;
        _fileStorageService = fileStorageService;
    }

    [HttpGet]
    public async Task<ActionResult<PublicTenantPageDto>> Get(string slug, CancellationToken cancellationToken)
    {
        var tenant = await FindPublicTenantAsync(slug, cancellationToken);
        if (tenant is null)
        {
            return NotFound();
        }

        await using var db = CreateTenantDb(tenant.DatabaseName);
        var profile = await db.CompanyProfiles.AsNoTracking().FirstOrDefaultAsync(cancellationToken);
        if (profile?.PublicPageEnabled != true)
        {
            return NotFound();
        }

        return Ok(await BuildPublicPageDtoAsync(db, tenant, profile, cancellationToken));
    }

    [HttpPost("booking-inquiries")]
    public async Task<ActionResult<PublicBookingInquiryDto>> CreateBookingInquiry(string slug, PublicBookingInquiryRequest request, CancellationToken cancellationToken)
    {
        var tenant = await FindPublicTenantAsync(slug, cancellationToken);
        if (tenant is null)
        {
            return NotFound();
        }

        await using var db = CreateTenantDb(tenant.DatabaseName);
        var profile = await db.CompanyProfiles.AsNoTracking().FirstOrDefaultAsync(cancellationToken);
        if (profile?.PublicPageEnabled != true)
        {
            return NotFound();
        }

        if (string.IsNullOrWhiteSpace(request.RenterName) || string.IsNullOrWhiteSpace(request.ContactNumber))
        {
            return ValidationProblem("Name and contact number are required.");
        }

        if (request.EndDateTime <= request.StartDateTime)
        {
            return ValidationProblem("End date/time must be after the start date/time.");
        }

        var vehicleIsPublic = await db.PublicVehicleListings
            .AsNoTracking()
            .AnyAsync(x =>
                x.VehicleId == request.VehicleId &&
                x.IsPublished &&
                db.DocumentAttachments.Any(photo => photo.IsPhoto && photo.IsPublic && photo.EntityType == "Vehicle" && photo.EntityId == x.VehicleId),
                cancellationToken);

        if (!vehicleIsPublic)
        {
            return ValidationProblem("This vehicle is not available on the public booking page.");
        }

        var inquiry = new PublicBookingInquiry
        {
            VehicleId = request.VehicleId,
            RenterName = request.RenterName.Trim(),
            ContactNumber = request.ContactNumber.Trim(),
            Email = TrimToNull(request.Email),
            StartDateTime = request.StartDateTime,
            EndDateTime = request.EndDateTime,
            Message = TrimToNull(request.Message)
        };

        db.PublicBookingInquiries.Add(inquiry);
        db.Notifications.Add(new Notification
        {
            TenantId = tenant.Id,
            Title = "Public booking inquiry",
            Message = $"{inquiry.RenterName} requested a vehicle from the public page.",
            Type = NotificationType.Booking,
            RelatedEntityType = nameof(PublicBookingInquiry),
            RelatedEntityId = inquiry.Id
        });
        await db.SaveChangesAsync(cancellationToken);

        return CreatedAtAction(nameof(Get), new { slug }, ToInquiryDto(inquiry));
    }

    private async Task<Tenant?> FindPublicTenantAsync(string slug, CancellationToken cancellationToken)
    {
        return await _centralDbContext.Tenants
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.Slug == slug && x.Status == TenantStatus.Active, cancellationToken);
    }

    private TenantDbContext CreateTenantDb(string databaseName)
    {
        var options = new DbContextOptionsBuilder<TenantDbContext>()
            .UseNpgsql(DatabaseConnectionFactory.BuildTenantConnectionString(_configuration, databaseName))
            .Options;

        return new TenantDbContext(options);
    }

    private async Task<PublicTenantPageDto> BuildPublicPageDtoAsync(TenantDbContext db, Tenant tenant, CompanyProfile profile, CancellationToken cancellationToken)
    {
        var listings = await db.PublicVehicleListings
            .AsNoTracking()
            .Include(x => x.Vehicle)
            .Include(x => x.Features)
            .ThenInclude(x => x.FeatureDefinition)
            .Where(x => x.IsPublished)
            .OrderBy(x => x.DisplayOrder)
            .ThenBy(x => x.Vehicle!.PlateNumber)
            .ToListAsync(cancellationToken);

        var vehicleIds = listings.Select(x => x.VehicleId).ToList();
        var photos = await db.DocumentAttachments
            .AsNoTracking()
            .Where(x => x.IsPhoto && x.IsPublic && x.EntityType == "Vehicle" && vehicleIds.Contains(x.EntityId))
            .OrderBy(x => x.DisplayOrder)
            .ThenByDescending(x => x.UploadedAt)
            .ToListAsync(cancellationToken);

        var vehicles = new List<PublicTenantVehicleDto>();
        foreach (var listing in listings)
        {
            if (listing.Vehicle is null)
            {
                continue;
            }

            var vehiclePhotos = photos.Where(x => x.EntityId == listing.VehicleId).ToList();
            if (vehiclePhotos.Count == 0)
            {
                continue;
            }

            vehicles.Add(new PublicTenantVehicleDto(
                listing.VehicleId,
                $"{listing.Vehicle.YearModel} {listing.Vehicle.Make} {listing.Vehicle.Model}",
                listing.ShowPlateNumber ? listing.Vehicle.PlateNumber : null,
                listing.Vehicle.VehicleType,
                listing.Vehicle.FuelType,
                listing.Vehicle.PassengerCapacity,
                listing.PriceAmount,
                listing.PriceUnit,
                listing.Description,
                listing.RentalNotes,
                await ToPublicPhotoDtosAsync(vehiclePhotos, cancellationToken),
                listing.Features.OrderBy(x => x.DisplayOrder).Select(ToFeatureDto)));
        }

        return new PublicTenantPageDto(
            profile.CompanyName,
            tenant.Slug,
            profile.PublicPageHeadline,
            profile.PublicPageDescription,
            profile.PublicBookingInstructions,
            vehicles);
    }

    private async Task<IReadOnlyList<PublicTenantPhotoDto>> ToPublicPhotoDtosAsync(IEnumerable<DocumentAttachment> photos, CancellationToken cancellationToken)
    {
        return await Task.WhenAll(photos.Select(async photo => new PublicTenantPhotoDto(
            photo.Id,
            await _fileStorageService.GetDisplayUrlAsync(photo.FileUrl, TimeSpan.FromMinutes(30), cancellationToken),
            photo.Caption,
            photo.DisplayOrder)));
    }

    private static PublicVehicleFeatureDto ToFeatureDto(PublicVehicleFeature feature)
    {
        if (feature.FeatureDefinition is not null)
        {
            return new PublicVehicleFeatureDto(feature.FeatureDefinitionId, feature.FeatureDefinition.Label, feature.FeatureDefinition.Icon, false, feature.DisplayOrder);
        }

        return new PublicVehicleFeatureDto(null, feature.CustomLabel ?? "Custom feature", string.IsNullOrWhiteSpace(feature.CustomIcon) ? "+" : feature.CustomIcon, true, feature.DisplayOrder);
    }

    private static PublicBookingInquiryDto ToInquiryDto(PublicBookingInquiry inquiry)
    {
        return new PublicBookingInquiryDto(
            inquiry.Id,
            inquiry.VehicleId,
            inquiry.RenterName,
            inquiry.ContactNumber,
            inquiry.Email,
            inquiry.StartDateTime,
            inquiry.EndDateTime,
            inquiry.Message,
            inquiry.Status,
            inquiry.CreatedAt);
    }

    private static string? TrimToNull(string? value)
    {
        return string.IsNullOrWhiteSpace(value) ? null : value.Trim();
    }
}
