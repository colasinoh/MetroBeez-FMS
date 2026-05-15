namespace MetroBeezFMS.Domain;

public enum TenantStatus
{
    PendingVerification,
    Provisioning,
    Active,
    Suspended,
    Cancelled
}

public enum DriverStatus
{
    Active,
    Inactive,
    Suspended
}

public enum VehicleStatus
{
    Available,
    Booked,
    UnderMaintenance,
    Inactive
}

public enum OwnershipStatus
{
    Owned,
    Financed,
    Leased
}

public enum BookingType
{
    SelfDrive,
    WithDriver,
    DeliveryLogistics,
    CorporateLease
}

public enum RateType
{
    Daily,
    Weekly,
    Monthly,
    Custom
}

public enum PaymentStatus
{
    Unpaid,
    Partial,
    Paid,
    Refunded
}

public enum BookingStatus
{
    Pending,
    Confirmed,
    Active,
    Completed,
    Cancelled
}

public enum TripType
{
    Rental,
    Delivery,
    PrivateBooking,
    Corporate,
    Other
}

public enum TripStatus
{
    Scheduled,
    Active,
    Completed,
    Cancelled
}

public enum MaintenanceStatus
{
    Upcoming,
    DueSoon,
    Overdue,
    Completed
}

public enum NotificationType
{
    Info,
    Booking,
    PmsReminder,
    DocumentExpiry,
    DriverLicenseExpiry,
    Warning
}
