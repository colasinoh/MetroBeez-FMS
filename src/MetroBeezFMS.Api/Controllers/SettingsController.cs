using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using MetroBeezFMS.Application;
using MetroBeezFMS.Infrastructure.Identity;
using MetroBeezFMS.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace MetroBeezFMS.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/settings")]
public sealed class SettingsController : ControllerBase
{
    private readonly TenantDbContextFactory _tenantDbContextFactory;
    private readonly UserManager<AppUser> _userManager;
    private readonly IFileStorageService _fileStorageService;
    private readonly ITenantStoragePathResolver _tenantStoragePathResolver;
    private readonly ICurrentTenantService _currentTenant;

    public SettingsController(
        TenantDbContextFactory tenantDbContextFactory,
        UserManager<AppUser> userManager,
        IFileStorageService fileStorageService,
        ITenantStoragePathResolver tenantStoragePathResolver,
        ICurrentTenantService currentTenant)
    {
        _tenantDbContextFactory = tenantDbContextFactory;
        _userManager = userManager;
        _fileStorageService = fileStorageService;
        _tenantStoragePathResolver = tenantStoragePathResolver;
        _currentTenant = currentTenant;
    }

    [HttpGet("company-profile")]
    public async Task<ActionResult> CompanyProfile(CancellationToken cancellationToken)
    {
        await using var db = await _tenantDbContextFactory.CreateAsync(cancellationToken);
        var profile = await db.CompanyProfiles.AsNoTracking().FirstOrDefaultAsync(cancellationToken);
        return profile is null ? NotFound() : Ok(profile);
    }

    [HttpGet("me")]
    public async Task<ActionResult<UserProfileDto>> Me(CancellationToken cancellationToken)
    {
        var user = await CurrentUserAsync();
        return user is null ? Unauthorized() : Ok(await ToProfileDtoAsync(user, cancellationToken));
    }

    [HttpPut("me")]
    public async Task<ActionResult<UserProfileDto>> UpdateMe(UpdateUserProfileRequest request, CancellationToken cancellationToken)
    {
        var user = await CurrentUserAsync();
        if (user is null)
        {
            return Unauthorized();
        }

        if (string.IsNullOrWhiteSpace(request.FullName))
        {
            return ValidationProblem("Full name is required.");
        }

        user.FullName = request.FullName.Trim();
        user.ProfilePhotoUrl = string.IsNullOrWhiteSpace(request.ProfilePhotoUrl) ? null : request.ProfilePhotoUrl.Trim();
        user.Address = string.IsNullOrWhiteSpace(request.Address) ? null : request.Address.Trim();
        user.PhoneNumber = string.IsNullOrWhiteSpace(request.MobileNumber) ? null : request.MobileNumber.Trim();
        user.JobTitle = string.IsNullOrWhiteSpace(request.JobTitle) ? null : request.JobTitle.Trim();
        user.EmergencyContact = string.IsNullOrWhiteSpace(request.EmergencyContact) ? null : request.EmergencyContact.Trim();
        user.TimeZone = string.IsNullOrWhiteSpace(request.TimeZone) ? "Asia/Manila" : request.TimeZone.Trim();
        user.DateFormat = string.IsNullOrWhiteSpace(request.DateFormat) ? "MMM d, yyyy" : request.DateFormat.Trim();
        user.NotificationEmail = string.IsNullOrWhiteSpace(request.NotificationEmail) ? user.Email : request.NotificationEmail.Trim();

        var result = await _userManager.UpdateAsync(user);
        if (!result.Succeeded)
        {
            return ValidationProblem(string.Join("; ", result.Errors.Select(x => x.Description)));
        }

        return Ok(await ToProfileDtoAsync(user, cancellationToken));
    }

    [HttpPost("profile-photo")]
    [RequestSizeLimit(5_000_000)]
    public async Task<ActionResult<UserProfileDto>> UploadProfilePhoto([FromForm] IFormFile file, CancellationToken cancellationToken)
    {
        var fileValidationError = ValidateProfilePhoto(file);
        if (fileValidationError is not null)
        {
            return ValidationProblem(fileValidationError);
        }

        var user = await CurrentUserAsync();
        if (user is null || _currentTenant.TenantId is null)
        {
            return Unauthorized();
        }

        await using var stream = file.OpenReadStream();
        var tenantStorageRoot = await _tenantStoragePathResolver.GetStorageRootAsync(_currentTenant.TenantId.Value, cancellationToken);
        var storedFile = await _fileStorageService.SaveAsync(
            stream,
            file.FileName,
            file.ContentType,
            tenantStorageRoot,
            TenantStorageFolders.ProfilePhotos,
            cancellationToken);
        user.ProfilePhotoUrl = storedFile.FileUrl;

        var result = await _userManager.UpdateAsync(user);
        if (!result.Succeeded)
        {
            return ValidationProblem(string.Join("; ", result.Errors.Select(x => x.Description)));
        }

        return Ok(await ToProfileDtoAsync(user, cancellationToken));
    }

    private async Task<AppUser?> CurrentUserAsync()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return Guid.TryParse(userId, out var id) ? await _userManager.FindByIdAsync(id.ToString()) : null;
    }

    private static string? ValidateProfilePhoto(IFormFile file)
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

        var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
        var contentType = file.ContentType?.ToLowerInvariant();
        var supported = contentType is "image/jpeg" or "image/png" or "image/webp"
            || extension is ".jpg" or ".jpeg" or ".png" or ".webp";

        return supported
            ? null
            : "Use a JPG, PNG, or WebP image. HEIC photos need to be converted first so browsers can preview them.";
    }

    private async Task<UserProfileDto> ToProfileDtoAsync(AppUser user, CancellationToken cancellationToken)
    {
        var profilePhotoDisplayUrl = await _fileStorageService.GetDisplayUrlAsync(user.ProfilePhotoUrl, TimeSpan.FromMinutes(30), cancellationToken);
        return new UserProfileDto(
            user.Id,
            user.FullName,
            user.Email ?? "",
            user.ProfilePhotoUrl,
            profilePhotoDisplayUrl,
            GravatarUrl(user.Email),
            user.Address,
            user.PhoneNumber,
            user.JobTitle,
            user.EmergencyContact,
            user.TimeZone,
            user.DateFormat,
            user.NotificationEmail);
    }

    private static string? GravatarUrl(string? email)
    {
        if (string.IsNullOrWhiteSpace(email))
        {
            return null;
        }

        var normalized = email.Trim().ToLowerInvariant();
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(normalized));
        var hash = Convert.ToHexString(bytes).ToLowerInvariant();
        return $"https://www.gravatar.com/avatar/{hash}?s=160&d=404";
    }
}
