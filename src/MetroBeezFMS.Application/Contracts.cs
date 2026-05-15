using MetroBeezFMS.Domain;

namespace MetroBeezFMS.Application;

public sealed record RegisterRequest(string FullName, string Email, string Password);
public sealed record VerifyEmailRequest(string Email, string Token, string CompanyName);
public sealed record LoginRequest(string Email, string Password);
public sealed record ForgotPasswordRequest(string Email);
public sealed record AuthResponse(string Token, Guid UserId, Guid? TenantId, string Email, string FullName, string Role, string? TenantName, bool RequiresEmailVerification, bool RequiresOnboarding);
public sealed record CompanyProfileRequest(string CompanyName, string? BusinessAddress, string? ContactNumber, string? BirDtiLguDocumentUrl, string? LogoUrl);

public sealed record DashboardSummaryDto(
    int TotalVehicles,
    int AvailableVehicles,
    int BookedVehicles,
    int VehiclesUnderMaintenance,
    int ActiveTrips,
    int UpcomingPms,
    decimal MonthlyGrossRevenue,
    decimal MonthlyNetProfit,
    decimal FuelTollExpenses,
    IEnumerable<BookingListDto> RecentBookings,
    IEnumerable<TripListDto> RecentTrips,
    IEnumerable<DocumentAttachmentDto> ExpiringDocuments,
    IEnumerable<NotificationDto> DriverActivity);

public sealed record VehicleUpsertDto(
    string PlateNumber,
    string? MvFileNumber,
    string? EngineNumber,
    string? ChassisVinNumber,
    string Make,
    string Model,
    string? SeriesVariant,
    int YearModel,
    string? Color,
    string? VehicleType,
    string? BodyType,
    string? FuelType,
    int PassengerCapacity,
    string? Classification,
    decimal? GrossWeight,
    int CurrentOdometer,
    OwnershipStatus OwnershipStatus,
    VehicleStatus Status,
    string? Remarks);

public sealed record VehicleListDto(
    Guid Id,
    string PlateNumber,
    string Make,
    string Model,
    int YearModel,
    string? Color,
    string? FuelType,
    int CurrentOdometer,
    OwnershipStatus OwnershipStatus,
    VehicleStatus Status,
    string? Remarks);

public sealed record DriverUpsertDto(
    string FullName,
    string? Address,
    string? ContactNumber,
    string? Email,
    string? EmergencyContact,
    string? LicenseNumber,
    string? LicenseTypeRestrictions,
    DateOnly? LicenseExpirationDate,
    DriverStatus Status,
    string? Notes);

public sealed record DriverListDto(
    Guid Id,
    string FullName,
    string? ContactNumber,
    string? Email,
    string? LicenseNumber,
    DateOnly? LicenseExpirationDate,
    DriverStatus Status,
    string? Notes);

public sealed record RenterUpsertDto(
    string FullName,
    string? Address,
    string? ContactNumber,
    string? Email,
    DateOnly? Birthdate,
    string? ValidIdType,
    string? ValidIdNumber,
    DateOnly? IdExpirationDate,
    string? DriverLicenseNumber,
    string? EmergencyContact,
    bool IsWatchlisted,
    string? Notes);

public sealed record RenterListDto(
    Guid Id,
    string FullName,
    string? ContactNumber,
    string? Email,
    string? ValidIdType,
    bool IsWatchlisted,
    string? Notes);

public sealed record BookingUpsertDto(
    Guid RenterId,
    Guid VehicleId,
    Guid? DriverId,
    BookingType BookingType,
    DateTimeOffset StartDateTime,
    DateTimeOffset EndDateTime,
    string? PickupLocation,
    string? ReturnLocation,
    RateType RateType,
    decimal RateAmount,
    decimal SecurityDeposit,
    PaymentStatus PaymentStatus,
    BookingStatus BookingStatus,
    string? Notes);

public sealed record BookingListDto(
    Guid Id,
    string ReferenceNumber,
    string RenterName,
    string VehicleLabel,
    string? DriverName,
    BookingType BookingType,
    DateTimeOffset StartDateTime,
    DateTimeOffset EndDateTime,
    decimal RateAmount,
    PaymentStatus PaymentStatus,
    BookingStatus BookingStatus);

public sealed record TripUpsertDto(
    Guid? BookingId,
    Guid VehicleId,
    Guid? DriverId,
    Guid RenterId,
    TripType TripType,
    DateTimeOffset StartDateTime,
    DateTimeOffset? EndDateTime,
    int? StartingOdometer,
    int? EndingOdometer,
    decimal FuelExpense,
    decimal TollExpense,
    decimal ParkingExpense,
    decimal OtherExpenses,
    decimal GrossRevenue,
    decimal DriverProceedCommission,
    string? PaymentMethod,
    PaymentStatus PaymentStatus,
    string? Remarks,
    TripStatus Status);

public sealed record TripCompleteRequest(
    DateTimeOffset EndDateTime,
    int EndingOdometer,
    decimal FuelExpense,
    decimal TollExpense,
    decimal ParkingExpense,
    decimal OtherExpenses,
    decimal DriverProceedCommission,
    string? Remarks);

public sealed record TripStartRequest(int StartingOdometer, string? Remarks);

public sealed record TripListDto(
    Guid Id,
    string TripNumber,
    string? BookingReference,
    string VehicleLabel,
    string? DriverName,
    string RenterName,
    TripType TripType,
    DateTimeOffset StartDateTime,
    DateTimeOffset? EndDateTime,
    int TotalKilometers,
    decimal GrossRevenue,
    decimal TotalExpenses,
    decimal NetProfit,
    PaymentStatus PaymentStatus,
    TripStatus Status);

public sealed record MaintenanceScheduleUpsertDto(
    Guid VehicleId,
    string Title,
    DateOnly? DueDate,
    int? DueOdometer,
    int? ReminderDaysBefore,
    int? ReminderKilometersBefore,
    MaintenanceStatus Status,
    string? VendorShop,
    decimal? EstimatedCost,
    string? Notes);

public sealed record MaintenanceScheduleDto(
    Guid Id,
    string VehicleLabel,
    string Title,
    DateOnly? DueDate,
    int? DueOdometer,
    MaintenanceStatus Status,
    string? VendorShop,
    decimal? EstimatedCost,
    string? Notes);

public sealed record DocumentAttachmentDto(
    Guid Id,
    string EntityType,
    Guid EntityId,
    string FileName,
    string OriginalFileName,
    string FileUrl,
    string? ContentType,
    long FileSize,
    string DocumentType,
    DateOnly? ExpirationDate,
    DateTimeOffset UploadedAt);

public sealed record NotificationDto(
    Guid Id,
    string Title,
    string Message,
    NotificationType Type,
    bool IsRead,
    DateTimeOffset CreatedAt,
    string? RelatedEntityType,
    Guid? RelatedEntityId);

public sealed record ProfitabilityReportDto(
    decimal MonthlyGrossRevenue,
    decimal MonthlyNetProfit,
    decimal FuelExpenses,
    decimal TollExpenses,
    decimal MaintenanceExpenses,
    IEnumerable<VehicleProfitabilityDto> Vehicles,
    IEnumerable<DriverRevenueDto> Drivers);

public sealed record VehicleProfitabilityDto(Guid VehicleId, string VehicleLabel, decimal GrossRevenue, decimal Expenses, decimal NetProfit);
public sealed record DriverRevenueDto(Guid DriverId, string DriverName, decimal GrossRevenue, decimal DriverProceedCommission);
