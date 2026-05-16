using MetroBeezFMS.Domain;
using MetroBeezFMS.Infrastructure.Identity;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace MetroBeezFMS.Infrastructure.Persistence;

public sealed class CentralDbContext : IdentityDbContext<AppUser, IdentityRole<Guid>, Guid>
{
    public CentralDbContext(DbContextOptions<CentralDbContext> options) : base(options)
    {
    }

    public DbSet<Tenant> Tenants => Set<Tenant>();
    public DbSet<TenantUser> TenantUsers => Set<TenantUser>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        builder.Entity<AppUser>(entity =>
        {
            entity.ToTable("Users");
            entity.Property(x => x.FullName).HasMaxLength(180);
            entity.Property(x => x.ProfilePhotoUrl).HasMaxLength(1000);
            entity.Property(x => x.Address).HasMaxLength(500);
            entity.Property(x => x.JobTitle).HasMaxLength(120);
            entity.Property(x => x.EmergencyContact).HasMaxLength(220);
            entity.Property(x => x.TimeZone).HasMaxLength(80);
            entity.Property(x => x.DateFormat).HasMaxLength(40);
            entity.Property(x => x.NotificationEmail).HasMaxLength(256);
        });

        builder.Entity<IdentityRole<Guid>>().ToTable("Roles");
        builder.Entity<IdentityUserRole<Guid>>().ToTable("UserRoles");
        builder.Entity<IdentityUserClaim<Guid>>().ToTable("UserClaims");
        builder.Entity<IdentityUserLogin<Guid>>().ToTable("UserLogins");
        builder.Entity<IdentityRoleClaim<Guid>>().ToTable("RoleClaims");
        builder.Entity<IdentityUserToken<Guid>>().ToTable("UserTokens");

        builder.Entity<Tenant>(entity =>
        {
            entity.ToTable("Tenants");
            entity.HasIndex(x => x.Slug).IsUnique();
            entity.HasIndex(x => x.DatabaseName).IsUnique();
            entity.Property(x => x.Name).HasMaxLength(220).IsRequired();
            entity.Property(x => x.Slug).HasMaxLength(180).IsRequired();
            entity.Property(x => x.DatabaseName).HasMaxLength(120).IsRequired();
            entity.Property(x => x.DatabaseHost).HasMaxLength(180);
            entity.Property(x => x.MasterDatabase).HasMaxLength(120);
            entity.Property(x => x.Status).HasConversion<string>().HasMaxLength(40);
            entity.Property(x => x.SubscriptionStatus).HasMaxLength(60);
        });

        builder.Entity<TenantUser>(entity =>
        {
            entity.ToTable("TenantUsers");
            entity.HasIndex(x => new { x.TenantId, x.UserId }).IsUnique();
            entity.Property(x => x.Role).HasMaxLength(40).IsRequired();
            entity.HasOne(x => x.Tenant)
                .WithMany(x => x.Users)
                .HasForeignKey(x => x.TenantId)
                .OnDelete(DeleteBehavior.Cascade);
        });
    }
}
