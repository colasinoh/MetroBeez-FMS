using MetroBeezFMS.Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;

namespace MetroBeezFMS.Infrastructure.Persistence;

public sealed class TenantDbContext : DbContext
{
    public TenantDbContext(DbContextOptions<TenantDbContext> options) : base(options)
    {
    }

    public DbSet<CompanyProfile> CompanyProfiles => Set<CompanyProfile>();
    public DbSet<Vehicle> Vehicles => Set<Vehicle>();
    public DbSet<Driver> Drivers => Set<Driver>();
    public DbSet<Renter> Renters => Set<Renter>();
    public DbSet<Booking> Bookings => Set<Booking>();
    public DbSet<Trip> Trips => Set<Trip>();
    public DbSet<MaintenanceSchedule> MaintenanceSchedules => Set<MaintenanceSchedule>();
    public DbSet<MaintenanceRecord> MaintenanceRecords => Set<MaintenanceRecord>();
    public DbSet<VehicleViolation> VehicleViolations => Set<VehicleViolation>();
    public DbSet<VehicleIncident> VehicleIncidents => Set<VehicleIncident>();
    public DbSet<DocumentAttachment> DocumentAttachments => Set<DocumentAttachment>();
    public DbSet<VehicleFeatureDefinition> VehicleFeatureDefinitions => Set<VehicleFeatureDefinition>();
    public DbSet<PublicVehicleListing> PublicVehicleListings => Set<PublicVehicleListing>();
    public DbSet<PublicVehicleFeature> PublicVehicleFeatures => Set<PublicVehicleFeature>();
    public DbSet<PublicBookingInquiry> PublicBookingInquiries => Set<PublicBookingInquiry>();
    public DbSet<Notification> Notifications => Set<Notification>();
    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        ConfigureSoftDeleteFilters(builder);

        builder.Entity<CompanyProfile>(entity =>
        {
            entity.ToTable("CompanyProfiles");
            entity.Property(x => x.CompanyName).HasMaxLength(220).IsRequired();
            entity.Property(x => x.ContactNumber).HasMaxLength(80);
            entity.Property(x => x.PublicPageHeadline).HasMaxLength(180);
            entity.Property(x => x.PublicBookingInstructions).HasMaxLength(600);
        });

        builder.Entity<Vehicle>(entity =>
        {
            entity.ToTable("Vehicles");
            entity.HasIndex(x => x.PlateNumber).IsUnique();
            entity.Property(x => x.PlateNumber).HasMaxLength(40).IsRequired();
            entity.Property(x => x.Make).HasMaxLength(120).IsRequired();
            entity.Property(x => x.Model).HasMaxLength(120).IsRequired();
            entity.Property(x => x.OwnershipStatus).HasConversion<string>().HasMaxLength(40);
            entity.Property(x => x.Status).HasConversion<string>().HasMaxLength(40);
            entity.Property(x => x.GrossWeight).HasPrecision(12, 2);
        });

        builder.Entity<Driver>(entity =>
        {
            entity.ToTable("Drivers");
            entity.Property(x => x.FullName).HasMaxLength(180).IsRequired();
            entity.Property(x => x.Email).HasMaxLength(220);
            entity.Property(x => x.Status).HasConversion<string>().HasMaxLength(40);
        });

        builder.Entity<Renter>(entity =>
        {
            entity.ToTable("Renters");
            entity.Property(x => x.FullName).HasMaxLength(180).IsRequired();
            entity.Property(x => x.Email).HasMaxLength(220);
        });

        builder.Entity<Booking>(entity =>
        {
            entity.ToTable("Bookings");
            entity.HasIndex(x => x.ReferenceNumber).IsUnique();
            entity.Property(x => x.ReferenceNumber).HasMaxLength(60).IsRequired();
            entity.Property(x => x.BookingType).HasConversion<string>().HasMaxLength(40);
            entity.Property(x => x.RateType).HasConversion<string>().HasMaxLength(40);
            entity.Property(x => x.PaymentStatus).HasConversion<string>().HasMaxLength(40);
            entity.Property(x => x.BookingStatus).HasConversion<string>().HasMaxLength(40);
            entity.Property(x => x.RateAmount).HasPrecision(14, 2);
            entity.Property(x => x.SecurityDeposit).HasPrecision(14, 2);
            entity.HasOne(x => x.Renter).WithMany(x => x.Bookings).HasForeignKey(x => x.RenterId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(x => x.Vehicle).WithMany(x => x.Bookings).HasForeignKey(x => x.VehicleId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(x => x.Driver).WithMany().HasForeignKey(x => x.DriverId).OnDelete(DeleteBehavior.SetNull);
        });

        builder.Entity<Trip>(entity =>
        {
            entity.ToTable("Trips");
            entity.HasIndex(x => x.TripNumber).IsUnique();
            entity.Property(x => x.TripNumber).HasMaxLength(60).IsRequired();
            entity.Property(x => x.TripType).HasConversion<string>().HasMaxLength(40);
            entity.Property(x => x.PaymentStatus).HasConversion<string>().HasMaxLength(40);
            entity.Property(x => x.Status).HasConversion<string>().HasMaxLength(40);
            entity.Property(x => x.FuelExpense).HasPrecision(14, 2);
            entity.Property(x => x.TollExpense).HasPrecision(14, 2);
            entity.Property(x => x.ParkingExpense).HasPrecision(14, 2);
            entity.Property(x => x.OtherExpenses).HasPrecision(14, 2);
            entity.Property(x => x.GrossRevenue).HasPrecision(14, 2);
            entity.Property(x => x.DriverProceedCommission).HasPrecision(14, 2);
            entity.Property(x => x.TotalExpenses).HasPrecision(14, 2);
            entity.Property(x => x.NetProfit).HasPrecision(14, 2);
            entity.HasOne(x => x.Booking).WithMany().HasForeignKey(x => x.BookingId).OnDelete(DeleteBehavior.SetNull);
            entity.HasOne(x => x.Renter).WithMany(x => x.Trips).HasForeignKey(x => x.RenterId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(x => x.Vehicle).WithMany(x => x.Trips).HasForeignKey(x => x.VehicleId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(x => x.Driver).WithMany(x => x.Trips).HasForeignKey(x => x.DriverId).OnDelete(DeleteBehavior.SetNull);
        });

        builder.Entity<MaintenanceSchedule>(entity =>
        {
            entity.ToTable("MaintenanceSchedules");
            entity.Property(x => x.Status).HasConversion<string>().HasMaxLength(40);
            entity.Property(x => x.EstimatedCost).HasPrecision(14, 2);
            entity.HasOne(x => x.Vehicle).WithMany().HasForeignKey(x => x.VehicleId).OnDelete(DeleteBehavior.Cascade);
        });

        builder.Entity<MaintenanceRecord>(entity =>
        {
            entity.ToTable("MaintenanceRecords");
            entity.Property(x => x.Cost).HasPrecision(14, 2);
            entity.HasOne(x => x.Vehicle).WithMany().HasForeignKey(x => x.VehicleId).OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(x => x.MaintenanceSchedule).WithMany().HasForeignKey(x => x.MaintenanceScheduleId).OnDelete(DeleteBehavior.SetNull);
        });

        builder.Entity<VehicleViolation>(entity =>
        {
            entity.ToTable("VehicleViolations");
            entity.Property(x => x.Amount).HasPrecision(14, 2);
            entity.HasOne(x => x.Vehicle).WithMany().HasForeignKey(x => x.VehicleId).OnDelete(DeleteBehavior.Cascade);
        });

        builder.Entity<VehicleIncident>(entity =>
        {
            entity.ToTable("VehicleIncidents");
            entity.Property(x => x.Cost).HasPrecision(14, 2);
            entity.HasOne(x => x.Vehicle).WithMany().HasForeignKey(x => x.VehicleId).OnDelete(DeleteBehavior.Cascade);
        });

        builder.Entity<DocumentAttachment>(entity =>
        {
            entity.ToTable("DocumentAttachments");
            entity.Property(x => x.EntityType).HasMaxLength(80).IsRequired();
            entity.Property(x => x.FileName).HasMaxLength(260).IsRequired();
            entity.Property(x => x.OriginalFileName).HasMaxLength(260).IsRequired();
            entity.Property(x => x.DocumentType).HasMaxLength(120).IsRequired();
            entity.Property(x => x.Caption).HasMaxLength(220);
            entity.HasIndex(x => new { x.EntityType, x.EntityId, x.IsPhoto });
        });

        builder.Entity<VehicleFeatureDefinition>(entity =>
        {
            entity.ToTable("VehicleFeatureDefinitions");
            entity.HasIndex(x => x.Code).IsUnique();
            entity.Property(x => x.Code).HasMaxLength(80).IsRequired();
            entity.Property(x => x.Label).HasMaxLength(120).IsRequired();
            entity.Property(x => x.Icon).HasMaxLength(24).IsRequired();
        });

        builder.Entity<PublicVehicleListing>(entity =>
        {
            entity.ToTable("PublicVehicleListings");
            entity.HasIndex(x => x.VehicleId).IsUnique();
            entity.Property(x => x.PriceAmount).HasPrecision(14, 2);
            entity.Property(x => x.PriceUnit).HasMaxLength(40);
            entity.Property(x => x.Description).HasMaxLength(1400);
            entity.Property(x => x.RentalNotes).HasMaxLength(1000);
            entity.HasOne(x => x.Vehicle)
                .WithOne(x => x.PublicListing)
                .HasForeignKey<PublicVehicleListing>(x => x.VehicleId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        builder.Entity<PublicVehicleFeature>(entity =>
        {
            entity.ToTable("PublicVehicleFeatures");
            entity.Property(x => x.CustomLabel).HasMaxLength(120);
            entity.Property(x => x.CustomIcon).HasMaxLength(24);
            entity.HasOne(x => x.PublicVehicleListing)
                .WithMany(x => x.Features)
                .HasForeignKey(x => x.PublicVehicleListingId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(x => x.FeatureDefinition)
                .WithMany(x => x.PublicVehicleFeatures)
                .HasForeignKey(x => x.FeatureDefinitionId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        builder.Entity<PublicBookingInquiry>(entity =>
        {
            entity.ToTable("PublicBookingInquiries");
            entity.Property(x => x.RenterName).HasMaxLength(180).IsRequired();
            entity.Property(x => x.ContactNumber).HasMaxLength(80).IsRequired();
            entity.Property(x => x.Email).HasMaxLength(220);
            entity.Property(x => x.Status).HasMaxLength(40).IsRequired();
            entity.HasOne(x => x.Vehicle)
                .WithMany()
                .HasForeignKey(x => x.VehicleId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        builder.Entity<Notification>(entity =>
        {
            entity.ToTable("Notifications");
            entity.Property(x => x.Type).HasConversion<string>().HasMaxLength(40);
            entity.Property(x => x.Title).HasMaxLength(160).IsRequired();
            entity.Property(x => x.RelatedEntityType).HasMaxLength(80);
        });

        builder.Entity<AuditLog>(entity =>
        {
            entity.ToTable("AuditLogs");
            entity.Property(x => x.EntityType).HasMaxLength(120).IsRequired();
            entity.Property(x => x.Action).HasMaxLength(80).IsRequired();
        });
    }

    public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        ApplyAuditState();
        return base.SaveChangesAsync(cancellationToken);
    }

    public override int SaveChanges()
    {
        ApplyAuditState();
        return base.SaveChanges();
    }

    private void ApplyAuditState()
    {
        var now = DateTimeOffset.UtcNow;
        foreach (var entry in ChangeTracker.Entries<AuditableEntity>())
        {
            if (entry.State == EntityState.Added)
            {
                entry.Entity.CreatedAt = now;
            }

            if (entry.State == EntityState.Modified)
            {
                entry.Entity.UpdatedAt = now;
            }
        }

        foreach (var entry in ChangeTracker.Entries<SoftDeletableEntity>())
        {
            if (entry.State == EntityState.Deleted)
            {
                entry.State = EntityState.Modified;
                entry.Entity.IsDeleted = true;
                entry.Entity.DeletedAt = now;
            }
        }
    }

    private static void ConfigureSoftDeleteFilters(ModelBuilder builder)
    {
        ConfigureSoftDelete<CompanyProfile>(builder);
        ConfigureSoftDelete<Vehicle>(builder);
        ConfigureSoftDelete<Driver>(builder);
        ConfigureSoftDelete<Renter>(builder);
        ConfigureSoftDelete<Booking>(builder);
        ConfigureSoftDelete<Trip>(builder);
        ConfigureSoftDelete<MaintenanceSchedule>(builder);
        ConfigureSoftDelete<MaintenanceRecord>(builder);
        ConfigureSoftDelete<VehicleViolation>(builder);
        ConfigureSoftDelete<VehicleIncident>(builder);
        ConfigureSoftDelete<DocumentAttachment>(builder);
        ConfigureSoftDelete<PublicVehicleListing>(builder);
    }

    private static void ConfigureSoftDelete<TEntity>(ModelBuilder builder)
        where TEntity : SoftDeletableEntity
    {
        builder.Entity<TEntity>().HasQueryFilter(x => !x.IsDeleted);
    }
}
