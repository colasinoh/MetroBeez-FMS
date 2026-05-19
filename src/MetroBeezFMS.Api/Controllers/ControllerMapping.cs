using MetroBeezFMS.Application;
using MetroBeezFMS.Domain;

namespace MetroBeezFMS.Api.Controllers;

public static class ControllerMapping
{
    public static VehicleListDto ToDto(this Vehicle vehicle)
    {
        return new VehicleListDto(
            vehicle.Id,
            vehicle.PlateNumber,
            vehicle.MvFileNumber,
            vehicle.EngineNumber,
            vehicle.ChassisVinNumber,
            vehicle.Make,
            vehicle.Model,
            vehicle.SeriesVariant,
            vehicle.YearModel,
            vehicle.Color,
            vehicle.VehicleType,
            vehicle.BodyType,
            vehicle.FuelType,
            vehicle.PassengerCapacity,
            vehicle.Classification,
            vehicle.GrossWeight,
            vehicle.CurrentOdometer,
            vehicle.OwnershipStatus,
            vehicle.Status,
            vehicle.Remarks);
    }

    public static DriverListDto ToDto(this Driver driver)
    {
        return new DriverListDto(
            driver.Id,
            driver.FullName,
            driver.Address,
            driver.ContactNumber,
            driver.Email,
            driver.EmergencyContact,
            driver.LicenseNumber,
            driver.LicenseTypeRestrictions,
            driver.LicenseExpirationDate,
            driver.Status,
            driver.Notes);
    }

    public static RenterListDto ToDto(this Renter renter)
    {
        return new RenterListDto(
            renter.Id,
            renter.FullName,
            renter.Address,
            renter.ContactNumber,
            renter.Email,
            renter.ValidIdType,
            renter.ValidIdNumber,
            renter.DriverLicenseNumber,
            renter.EmergencyContact,
            renter.IsWatchlisted,
            renter.Notes);
    }

    public static BookingListDto ToDto(this Booking booking)
    {
        return new BookingListDto(
            booking.Id,
            booking.ReferenceNumber,
            booking.RenterId,
            booking.VehicleId,
            booking.DriverId,
            booking.Renter?.FullName ?? "",
            $"{booking.Vehicle?.PlateNumber} - {booking.Vehicle?.Make} {booking.Vehicle?.Model}".Trim(),
            booking.Driver?.FullName,
            booking.BookingType,
            booking.StartDateTime,
            booking.EndDateTime,
            booking.PickupLocation,
            booking.ReturnLocation,
            booking.RateType,
            booking.RateAmount,
            booking.SecurityDeposit,
            booking.PaymentStatus,
            booking.BookingStatus,
            booking.Notes);
    }

    public static TripListDto ToDto(this Trip trip)
    {
        return new TripListDto(
            trip.Id,
            trip.TripNumber,
            trip.BookingId,
            trip.BookingReference,
            trip.VehicleId,
            trip.DriverId,
            trip.RenterId,
            $"{trip.Vehicle?.PlateNumber} - {trip.Vehicle?.Make} {trip.Vehicle?.Model}".Trim(),
            trip.Driver?.FullName,
            trip.Renter?.FullName ?? "",
            trip.TripType,
            trip.StartDateTime,
            trip.EndDateTime,
            trip.StartingOdometer,
            trip.EndingOdometer,
            trip.TotalKilometers,
            trip.FuelExpense,
            trip.TollExpense,
            trip.ParkingExpense,
            trip.OtherExpenses,
            trip.GrossRevenue,
            trip.DriverProceedCommission,
            trip.TotalExpenses,
            trip.NetProfit,
            trip.PaymentMethod,
            trip.PaymentStatus,
            trip.Remarks,
            trip.Status);
    }

    public static MaintenanceScheduleDto ToDto(this MaintenanceSchedule schedule)
    {
        return new MaintenanceScheduleDto(
            schedule.Id,
            schedule.VehicleId,
            $"{schedule.Vehicle?.PlateNumber} - {schedule.Vehicle?.Make} {schedule.Vehicle?.Model}".Trim(),
            schedule.Title,
            schedule.DueDate,
            schedule.DueOdometer,
            schedule.Status,
            schedule.VendorShop,
            schedule.EstimatedCost,
            schedule.Notes);
    }

    public static DocumentAttachmentDto ToDto(this DocumentAttachment document, string? displayUrl = null)
    {
        return new DocumentAttachmentDto(
            document.Id,
            document.EntityType,
            document.EntityId,
            document.FileName,
            document.OriginalFileName,
            document.FileUrl,
            displayUrl,
            document.ContentType,
            document.FileSize,
            document.DocumentType,
            document.ExpirationDate,
            document.UploadedAt,
            document.IsPhoto,
            document.IsPublic,
            document.Caption,
            document.DisplayOrder);
    }

    public static NotificationDto ToDto(this Notification notification)
    {
        return new NotificationDto(
            notification.Id,
            notification.Title,
            notification.Message,
            notification.Type,
            notification.IsRead,
            notification.CreatedAt,
            notification.RelatedEntityType,
            notification.RelatedEntityId);
    }
}
