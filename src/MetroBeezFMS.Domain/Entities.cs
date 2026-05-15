namespace MetroBeezFMS.Domain;

public sealed class Tenant : AuditableEntity
{
    public required string Name { get; set; }
    public required string Slug { get; set; }
    public required string DatabaseName { get; set; }
    public string? DatabaseHost { get; set; }
    public int? DatabasePort { get; set; }
    public string? MasterDatabase { get; set; }
    public TenantStatus Status { get; set; } = TenantStatus.PendingVerification;
    public string SubscriptionStatus { get; set; } = "Trial";
    public Guid OwnerUserId { get; set; }
    public DateTimeOffset? EmailVerificationCompletedAt { get; set; }
    public ICollection<TenantUser> Users { get; set; } = new List<TenantUser>();
}

public sealed class TenantUser : AuditableEntity
{
    public Guid TenantId { get; set; }
    public Guid UserId { get; set; }
    public string Role { get; set; } = Roles.OwnerAdmin;
    public bool IsActive { get; set; } = true;
    public Tenant? Tenant { get; set; }
}

public sealed class CompanyProfile : SoftDeletableEntity
{
    public required string CompanyName { get; set; }
    public string? BusinessAddress { get; set; }
    public string? ContactNumber { get; set; }
    public string? BirDtiLguDocumentUrl { get; set; }
    public string? LogoUrl { get; set; }
}

public sealed class Driver : SoftDeletableEntity
{
    public required string FullName { get; set; }
    public string? Address { get; set; }
    public string? ContactNumber { get; set; }
    public string? Email { get; set; }
    public Guid? AppUserId { get; set; }
    public string? EmergencyContact { get; set; }
    public string? LicenseNumber { get; set; }
    public string? LicenseTypeRestrictions { get; set; }
    public DateOnly? LicenseExpirationDate { get; set; }
    public string? LicenseFrontUrl { get; set; }
    public string? LicenseBackUrl { get; set; }
    public string? ClearanceUrl { get; set; }
    public DriverStatus Status { get; set; } = DriverStatus.Active;
    public string? Notes { get; set; }
    public ICollection<Trip> Trips { get; set; } = new List<Trip>();
}

public sealed class Vehicle : SoftDeletableEntity
{
    public required string PlateNumber { get; set; }
    public string? MvFileNumber { get; set; }
    public string? EngineNumber { get; set; }
    public string? ChassisVinNumber { get; set; }
    public required string Make { get; set; }
    public required string Model { get; set; }
    public string? SeriesVariant { get; set; }
    public int YearModel { get; set; }
    public string? Color { get; set; }
    public string? VehicleType { get; set; }
    public string? BodyType { get; set; }
    public string? FuelType { get; set; }
    public int PassengerCapacity { get; set; }
    public string? Classification { get; set; }
    public decimal? GrossWeight { get; set; }
    public int CurrentOdometer { get; set; }
    public OwnershipStatus OwnershipStatus { get; set; } = OwnershipStatus.Owned;
    public VehicleStatus Status { get; set; } = VehicleStatus.Available;
    public string? Remarks { get; set; }
    public ICollection<Booking> Bookings { get; set; } = new List<Booking>();
    public ICollection<Trip> Trips { get; set; } = new List<Trip>();
}

public sealed class Renter : SoftDeletableEntity
{
    public required string FullName { get; set; }
    public string? Address { get; set; }
    public string? ContactNumber { get; set; }
    public string? Email { get; set; }
    public DateOnly? Birthdate { get; set; }
    public string? ValidIdType { get; set; }
    public string? ValidIdNumber { get; set; }
    public DateOnly? IdExpirationDate { get; set; }
    public string? IdFrontUrl { get; set; }
    public string? IdBackUrl { get; set; }
    public string? DriverLicenseNumber { get; set; }
    public string? EmergencyContact { get; set; }
    public bool IsWatchlisted { get; set; }
    public string? Notes { get; set; }
    public ICollection<Booking> Bookings { get; set; } = new List<Booking>();
    public ICollection<Trip> Trips { get; set; } = new List<Trip>();
}

public sealed class Booking : SoftDeletableEntity
{
    public required string ReferenceNumber { get; set; }
    public Guid RenterId { get; set; }
    public Guid VehicleId { get; set; }
    public Guid? DriverId { get; set; }
    public BookingType BookingType { get; set; }
    public DateTimeOffset StartDateTime { get; set; }
    public DateTimeOffset EndDateTime { get; set; }
    public string? PickupLocation { get; set; }
    public string? ReturnLocation { get; set; }
    public RateType RateType { get; set; }
    public decimal RateAmount { get; set; }
    public decimal SecurityDeposit { get; set; }
    public PaymentStatus PaymentStatus { get; set; } = PaymentStatus.Unpaid;
    public BookingStatus BookingStatus { get; set; } = BookingStatus.Pending;
    public string? Notes { get; set; }
    public string? SignedContractUrl { get; set; }
    public Renter? Renter { get; set; }
    public Vehicle? Vehicle { get; set; }
    public Driver? Driver { get; set; }
}

public sealed class Trip : SoftDeletableEntity
{
    public required string TripNumber { get; set; }
    public Guid? BookingId { get; set; }
    public string? BookingReference { get; set; }
    public Guid VehicleId { get; set; }
    public Guid? DriverId { get; set; }
    public Guid RenterId { get; set; }
    public TripType TripType { get; set; }
    public DateTimeOffset StartDateTime { get; set; }
    public DateTimeOffset? EndDateTime { get; set; }
    public int? StartingOdometer { get; set; }
    public int? EndingOdometer { get; set; }
    public int TotalKilometers { get; set; }
    public decimal FuelExpense { get; set; }
    public decimal TollExpense { get; set; }
    public decimal ParkingExpense { get; set; }
    public decimal OtherExpenses { get; set; }
    public decimal GrossRevenue { get; set; }
    public decimal DriverProceedCommission { get; set; }
    public decimal TotalExpenses { get; set; }
    public decimal NetProfit { get; set; }
    public string? PaymentMethod { get; set; }
    public PaymentStatus PaymentStatus { get; set; } = PaymentStatus.Unpaid;
    public string? Remarks { get; set; }
    public TripStatus Status { get; set; } = TripStatus.Scheduled;
    public Booking? Booking { get; set; }
    public Vehicle? Vehicle { get; set; }
    public Driver? Driver { get; set; }
    public Renter? Renter { get; set; }

    public void Recalculate()
    {
        TotalKilometers = StartingOdometer.HasValue && EndingOdometer.HasValue
            ? Math.Max(0, EndingOdometer.Value - StartingOdometer.Value)
            : 0;
        TotalExpenses = FuelExpense + TollExpense + ParkingExpense + OtherExpenses + DriverProceedCommission;
        NetProfit = GrossRevenue - TotalExpenses;
    }
}

public sealed class MaintenanceSchedule : SoftDeletableEntity
{
    public Guid VehicleId { get; set; }
    public string Title { get; set; } = "PMS";
    public DateOnly? DueDate { get; set; }
    public int? DueOdometer { get; set; }
    public int? ReminderDaysBefore { get; set; } = 7;
    public int? ReminderKilometersBefore { get; set; } = 500;
    public MaintenanceStatus Status { get; set; } = MaintenanceStatus.Upcoming;
    public string? VendorShop { get; set; }
    public decimal? EstimatedCost { get; set; }
    public string? Notes { get; set; }
    public Vehicle? Vehicle { get; set; }
}

public sealed class MaintenanceRecord : SoftDeletableEntity
{
    public Guid VehicleId { get; set; }
    public Guid? MaintenanceScheduleId { get; set; }
    public DateOnly ServiceDate { get; set; }
    public int? Odometer { get; set; }
    public string? VendorShop { get; set; }
    public decimal Cost { get; set; }
    public string? ReceiptUrl { get; set; }
    public string? Notes { get; set; }
    public Vehicle? Vehicle { get; set; }
    public MaintenanceSchedule? MaintenanceSchedule { get; set; }
}

public sealed class VehicleViolation : SoftDeletableEntity
{
    public Guid VehicleId { get; set; }
    public DateOnly ViolationDate { get; set; }
    public string? ReferenceNumber { get; set; }
    public string Description { get; set; } = "";
    public decimal? Amount { get; set; }
    public string? Status { get; set; }
    public Vehicle? Vehicle { get; set; }
}

public sealed class VehicleIncident : SoftDeletableEntity
{
    public Guid VehicleId { get; set; }
    public DateOnly IncidentDate { get; set; }
    public string IncidentType { get; set; } = "";
    public string Description { get; set; } = "";
    public decimal? Cost { get; set; }
    public string? Status { get; set; }
    public Vehicle? Vehicle { get; set; }
}

public sealed class DocumentAttachment : SoftDeletableEntity
{
    public required string EntityType { get; set; }
    public Guid EntityId { get; set; }
    public required string FileName { get; set; }
    public required string OriginalFileName { get; set; }
    public required string FileUrl { get; set; }
    public string? ContentType { get; set; }
    public long FileSize { get; set; }
    public required string DocumentType { get; set; }
    public DateOnly? ExpirationDate { get; set; }
    public string? UploadedBy { get; set; }
    public DateTimeOffset UploadedAt { get; set; } = DateTimeOffset.UtcNow;
}

public sealed class Notification : AuditableEntity
{
    public Guid TenantId { get; set; }
    public Guid? UserId { get; set; }
    public required string Title { get; set; }
    public required string Message { get; set; }
    public NotificationType Type { get; set; } = NotificationType.Info;
    public bool IsRead { get; set; }
    public string? RelatedEntityType { get; set; }
    public Guid? RelatedEntityId { get; set; }
}

public sealed class AuditLog : AuditableEntity
{
    public Guid? UserId { get; set; }
    public required string EntityType { get; set; }
    public Guid? EntityId { get; set; }
    public required string Action { get; set; }
    public string? BeforeJson { get; set; }
    public string? AfterJson { get; set; }
    public string? IpAddress { get; set; }
}
