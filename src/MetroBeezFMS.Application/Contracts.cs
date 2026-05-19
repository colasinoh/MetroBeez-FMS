using MetroBeezFMS.Domain;

namespace MetroBeezFMS.Application;

public sealed record RegisterRequest(string FullName, string Email, string Password);
public sealed record VerifyEmailRequest(string Email, string Token, string CompanyName);
public sealed record LoginRequest(string Email, string Password);
public sealed record ResendVerificationRequest(string Email);
public sealed record ForgotPasswordRequest(string Email);
public sealed record ResetPasswordRequest(string Email, string Token, string NewPassword);
public sealed record ChangePasswordRequest(string CurrentPassword, string NewPassword);
public sealed record AuthResponse(string Token, Guid UserId, Guid? TenantId, string Email, string FullName, string Role, string? TenantName, bool RequiresEmailVerification, bool RequiresOnboarding);
public sealed record AdminTenantDto(
    Guid Id,
    string Name,
    string Slug,
    string DatabaseName,
    TenantStatus Status,
    string SubscriptionStatus,
    Guid OwnerUserId,
    string? OwnerEmail,
    string? OwnerName,
    int UserCount,
    DateTimeOffset CreatedAt,
    DateTimeOffset? UpdatedAt);

public sealed record UpdateTenantStatusRequest(TenantStatus Status);
public sealed record CompanyProfileRequest(string CompanyName, string? BusinessAddress, string? ContactNumber, string? BirDtiLguDocumentUrl, string? LogoUrl);
public sealed record UserProfileDto(
    Guid UserId,
    string FullName,
    string Email,
    string? ProfilePhotoUrl,
    string? ProfilePhotoDisplayUrl,
    string? GravatarUrl,
    string? Address,
    string? MobileNumber,
    string? JobTitle,
    string? EmergencyContact,
    string? TimeZone,
    string? DateFormat,
    string? NotificationEmail);

public sealed record UpdateUserProfileRequest(
    string FullName,
    string? ProfilePhotoUrl,
    string? Address,
    string? MobileNumber,
    string? JobTitle,
    string? EmergencyContact,
    string? TimeZone,
    string? DateFormat,
    string? NotificationEmail);

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
    string? Address,
    string? ContactNumber,
    string? Email,
    string? EmergencyContact,
    string? LicenseNumber,
    string? LicenseTypeRestrictions,
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
    string? Address,
    string? ContactNumber,
    string? Email,
    string? ValidIdType,
    string? ValidIdNumber,
    string? DriverLicenseNumber,
    string? EmergencyContact,
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
    Guid RenterId,
    Guid VehicleId,
    Guid? DriverId,
    string RenterName,
    string VehicleLabel,
    string? DriverName,
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
    Guid? BookingId,
    string? BookingReference,
    Guid VehicleId,
    Guid? DriverId,
    Guid RenterId,
    string VehicleLabel,
    string? DriverName,
    string RenterName,
    TripType TripType,
    DateTimeOffset StartDateTime,
    DateTimeOffset? EndDateTime,
    int? StartingOdometer,
    int? EndingOdometer,
    int TotalKilometers,
    decimal FuelExpense,
    decimal TollExpense,
    decimal ParkingExpense,
    decimal OtherExpenses,
    decimal GrossRevenue,
    decimal DriverProceedCommission,
    decimal TotalExpenses,
    decimal NetProfit,
    string? PaymentMethod,
    PaymentStatus PaymentStatus,
    string? Remarks,
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
    Guid VehicleId,
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
    string? DisplayUrl,
    string? ContentType,
    long FileSize,
    string DocumentType,
    DateOnly? ExpirationDate,
    DateTimeOffset UploadedAt,
    bool IsPhoto,
    bool IsPublic,
    string? Caption,
    int DisplayOrder);

public sealed record PhotoDto(
    Guid Id,
    string EntityType,
    Guid EntityId,
    string OriginalFileName,
    string FileUrl,
    string? DisplayUrl,
    string? ContentType,
    long FileSize,
    bool IsPublic,
    string? Caption,
    int DisplayOrder,
    DateTimeOffset UploadedAt);

public sealed record UpdatePhotoRequest(bool IsPublic, string? Caption, int DisplayOrder);

public sealed record PublicPageSettingsDto(
    bool Enabled,
    string? Slug,
    string? PublicUrl,
    string CompanyName,
    string? Headline,
    string? Description,
    string? BookingInstructions);

public sealed record UpdatePublicPageSettingsRequest(
    bool Enabled,
    string? Headline,
    string? Description,
    string? BookingInstructions);

public sealed record VehicleFeatureDefinitionDto(
    Guid Id,
    string Code,
    string Label,
    string Icon,
    int SortOrder);

public sealed record PublicVehicleFeatureDto(
    Guid? FeatureDefinitionId,
    string Label,
    string Icon,
    bool IsCustom,
    int DisplayOrder);

public sealed record CustomVehicleFeatureRequest(string Label, string? Icon, int DisplayOrder);

public sealed record UpdatePublicVehicleListingRequest(
    bool IsPublished,
    decimal? PriceAmount,
    string? PriceUnit,
    string? Description,
    string? RentalNotes,
    bool ShowPlateNumber,
    int DisplayOrder,
    IEnumerable<Guid> FeatureDefinitionIds,
    IEnumerable<CustomVehicleFeatureRequest> CustomFeatures);

public sealed record PublicVehicleListingDto(
    Guid? Id,
    Guid VehicleId,
    string VehicleLabel,
    string Status,
    int PhotoCount,
    int PublicPhotoCount,
    bool IsPublished,
    decimal? PriceAmount,
    string? PriceUnit,
    string? Description,
    string? RentalNotes,
    bool ShowPlateNumber,
    int DisplayOrder,
    IEnumerable<PhotoDto> Photos,
    IEnumerable<PublicVehicleFeatureDto> Features);

public sealed record PublicPageManagementDto(
    PublicPageSettingsDto Settings,
    IEnumerable<VehicleFeatureDefinitionDto> FeatureDefinitions,
    IEnumerable<PublicVehicleListingDto> Vehicles);

public sealed record PublicTenantPhotoDto(
    Guid Id,
    string? DisplayUrl,
    string? Caption,
    int DisplayOrder);

public sealed record PublicTenantVehicleDto(
    Guid VehicleId,
    string VehicleLabel,
    string? PlateNumber,
    string? VehicleType,
    string? FuelType,
    int PassengerCapacity,
    decimal? PriceAmount,
    string? PriceUnit,
    string? Description,
    string? RentalNotes,
    IEnumerable<PublicTenantPhotoDto> Photos,
    IEnumerable<PublicVehicleFeatureDto> Features);

public sealed record PublicTenantPageDto(
    string CompanyName,
    string Slug,
    string? Headline,
    string? Description,
    string? BookingInstructions,
    IEnumerable<PublicTenantVehicleDto> Vehicles);

public sealed record PublicBookingInquiryRequest(
    Guid VehicleId,
    string RenterName,
    string ContactNumber,
    string? Email,
    DateTimeOffset StartDateTime,
    DateTimeOffset EndDateTime,
    string? Message);

public sealed record PublicBookingInquiryDto(
    Guid Id,
    Guid? VehicleId,
    string RenterName,
    string ContactNumber,
    string? Email,
    DateTimeOffset StartDateTime,
    DateTimeOffset EndDateTime,
    string? Message,
    string Status,
    DateTimeOffset CreatedAt);

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
