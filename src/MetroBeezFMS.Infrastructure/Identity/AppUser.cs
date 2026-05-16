using Microsoft.AspNetCore.Identity;

namespace MetroBeezFMS.Infrastructure.Identity;

public sealed class AppUser : IdentityUser<Guid>
{
    public string FullName { get; set; } = "";
    public string? ProfilePhotoUrl { get; set; }
    public string? Address { get; set; }
    public string? JobTitle { get; set; }
    public string? EmergencyContact { get; set; }
    public string? TimeZone { get; set; }
    public string? DateFormat { get; set; }
    public string? NotificationEmail { get; set; }
    public DateTimeOffset? EmailVerifiedAt { get; set; }
    public bool IsActive { get; set; } = true;
}
