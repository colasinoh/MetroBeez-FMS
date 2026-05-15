using Microsoft.AspNetCore.Identity;

namespace MetroBeezFMS.Infrastructure.Identity;

public sealed class AppUser : IdentityUser<Guid>
{
    public string FullName { get; set; } = "";
    public DateTimeOffset? EmailVerifiedAt { get; set; }
    public bool IsActive { get; set; } = true;
}
