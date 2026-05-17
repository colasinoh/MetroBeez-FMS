using MetroBeezFMS.Domain;
using Microsoft.EntityFrameworkCore;

namespace MetroBeezFMS.Infrastructure.Persistence;

public static class TenantSeeder
{
    private static readonly (string Code, string Label, string Icon, int SortOrder)[] PublicVehicleFeatures =
    [
        ("aircon", "Air conditioning", "❄️", 10),
        ("automatic", "Automatic transmission", "⚙️", 20),
        ("manual", "Manual transmission", "🕹️", 30),
        ("driver", "Driver available", "🧑", 40),
        ("self_drive", "Self-drive ready", "🗝️", 50),
        ("fuel_efficient", "Fuel efficient", "⛽", 60),
        ("large_luggage", "Large luggage space", "🧳", 70),
        ("bluetooth", "Bluetooth audio", "🎵", 80),
        ("dashcam", "Dashcam", "📷", 90),
        ("delivery", "Delivery/logistics", "📦", 100)
    ];

    private static readonly (string Code, string Label, string Icon, int SortOrder)[] CleanPublicVehicleFeatures =
    [
        ("aircon", "Air conditioning", "AC", 10),
        ("automatic", "Automatic transmission", "AT", 20),
        ("manual", "Manual transmission", "MT", 30),
        ("driver", "Driver available", "DR", 40),
        ("self_drive", "Self-drive ready", "SD", 50),
        ("fuel_efficient", "Fuel efficient", "FE", 60),
        ("large_luggage", "Large luggage space", "LG", 70),
        ("bluetooth", "Bluetooth audio", "BT", 80),
        ("dashcam", "Dashcam", "DC", 90),
        ("delivery", "Delivery/logistics", "DL", 100)
    ];

    public static async Task SeedAsync(TenantDbContext dbContext, Guid tenantId, Guid ownerUserId, string companyName, CancellationToken cancellationToken = default)
    {
        if (await dbContext.CompanyProfiles.AnyAsync(cancellationToken))
        {
            return;
        }

        var now = DateTimeOffset.UtcNow;
        var vehicleA = new Vehicle
        {
            Id = Guid.Parse("11111111-1111-4111-8111-111111111111"),
            PlateNumber = "MBZ-1024",
            Make = "Toyota",
            Model = "Innova",
            SeriesVariant = "2.8 E Diesel",
            YearModel = 2022,
            Color = "White",
            VehicleType = "MPV",
            BodyType = "Wagon",
            FuelType = "Diesel",
            PassengerCapacity = 7,
            Classification = "Private",
            CurrentOdometer = 35240,
            OwnershipStatus = OwnershipStatus.Owned,
            Status = VehicleStatus.Available,
            Remarks = "Primary airport rental unit"
        };
        var vehicleB = new Vehicle
        {
            Id = Guid.Parse("22222222-2222-4222-8222-222222222222"),
            PlateNumber = "MBZ-2048",
            Make = "Mitsubishi",
            Model = "L300",
            SeriesVariant = "Exceed",
            YearModel = 2021,
            Color = "Silver",
            VehicleType = "Van",
            BodyType = "Delivery Van",
            FuelType = "Diesel",
            PassengerCapacity = 3,
            Classification = "Logistics",
            CurrentOdometer = 61200,
            OwnershipStatus = OwnershipStatus.Financed,
            Status = VehicleStatus.Booked,
            Remarks = "Corporate delivery route"
        };

        var driverA = new Driver
        {
            Id = Guid.Parse("33333333-3333-4333-8333-333333333333"),
            FullName = "Miguel Santos",
            ContactNumber = "+63 917 555 0142",
            Email = "miguel.driver@example.com",
            EmergencyContact = "Ana Santos - +63 917 555 0111",
            LicenseNumber = "N01-23-456789",
            LicenseTypeRestrictions = "Professional, Restriction B/B1",
            LicenseExpirationDate = DateOnly.FromDateTime(DateTime.UtcNow.AddMonths(8)),
            Status = DriverStatus.Active,
            Notes = "Preferred for airport and executive bookings"
        };
        var driverB = new Driver
        {
            Id = Guid.Parse("44444444-4444-4444-8444-444444444444"),
            FullName = "Carlo Reyes",
            ContactNumber = "+63 918 555 0199",
            Email = "carlo.driver@example.com",
            EmergencyContact = "Lina Reyes - +63 918 555 0100",
            LicenseNumber = "N02-88-224466",
            LicenseTypeRestrictions = "Professional, Restriction B/B2",
            LicenseExpirationDate = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(24)),
            Status = DriverStatus.Active,
            Notes = "Delivery/logistics specialist"
        };

        var renterA = new Renter
        {
            Id = Guid.Parse("55555555-5555-4555-8555-555555555555"),
            FullName = "Alyssa Cruz",
            ContactNumber = "+63 919 555 0101",
            Email = "alyssa@example.com",
            ValidIdType = "Passport",
            ValidIdNumber = "P1234567A",
            EmergencyContact = "Ramon Cruz - +63 919 555 0102"
        };
        var renterB = new Renter
        {
            Id = Guid.Parse("66666666-6666-4666-8666-666666666666"),
            FullName = "Northstar Trading Corp.",
            ContactNumber = "+63 2 8555 0188",
            Email = "operations@northstar.example",
            ValidIdType = "SEC Registration",
            ValidIdNumber = "CS202312345",
            Notes = "Corporate logistics account"
        };
        var renterC = new Renter
        {
            Id = Guid.Parse("77777777-7777-4777-8777-777777777777"),
            FullName = "Jose Villanueva",
            ContactNumber = "+63 920 555 0133",
            Email = "jose@example.com",
            ValidIdType = "Driver License",
            ValidIdNumber = "D11-44-998877",
            DriverLicenseNumber = "D11-44-998877"
        };

        var bookingA = new Booking
        {
            Id = Guid.Parse("88888888-8888-4888-8888-888888888888"),
            ReferenceNumber = "BK-2026-0001",
            Vehicle = vehicleA,
            Renter = renterA,
            Driver = driverA,
            BookingType = BookingType.WithDriver,
            StartDateTime = now.AddDays(1),
            EndDateTime = now.AddDays(3),
            PickupLocation = "NAIA Terminal 3",
            ReturnLocation = "BGC Taguig",
            RateType = RateType.Daily,
            RateAmount = 4200,
            SecurityDeposit = 5000,
            PaymentStatus = PaymentStatus.Partial,
            BookingStatus = BookingStatus.Confirmed
        };
        var bookingB = new Booking
        {
            Id = Guid.Parse("99999999-9999-4999-8999-999999999999"),
            ReferenceNumber = "BK-2026-0002",
            Vehicle = vehicleB,
            Renter = renterB,
            Driver = driverB,
            BookingType = BookingType.DeliveryLogistics,
            StartDateTime = now.AddDays(-1),
            EndDateTime = now.AddDays(2),
            PickupLocation = "Makati Warehouse",
            ReturnLocation = "Quezon City Hub",
            RateType = RateType.Custom,
            RateAmount = 18500,
            SecurityDeposit = 0,
            PaymentStatus = PaymentStatus.Paid,
            BookingStatus = BookingStatus.Active
        };
        var bookingC = new Booking
        {
            Id = Guid.Parse("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"),
            ReferenceNumber = "BK-2026-0003",
            Vehicle = vehicleA,
            Renter = renterC,
            BookingType = BookingType.SelfDrive,
            StartDateTime = now.AddDays(9),
            EndDateTime = now.AddDays(11),
            PickupLocation = "BeezFleet Garage",
            ReturnLocation = "BeezFleet Garage",
            RateType = RateType.Daily,
            RateAmount = 3600,
            SecurityDeposit = 8000,
            PaymentStatus = PaymentStatus.Unpaid,
            BookingStatus = BookingStatus.Pending
        };

        var tripA = new Trip
        {
            Id = Guid.Parse("bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"),
            TripNumber = "TR-2026-0001",
            Booking = bookingB,
            BookingReference = bookingB.ReferenceNumber,
            Vehicle = vehicleB,
            Driver = driverB,
            Renter = renterB,
            TripType = TripType.Delivery,
            StartDateTime = now.AddDays(-1),
            StartingOdometer = 60980,
            EndingOdometer = 61200,
            FuelExpense = 3200,
            TollExpense = 820,
            ParkingExpense = 180,
            OtherExpenses = 0,
            GrossRevenue = 18500,
            DriverProceedCommission = 2500,
            PaymentMethod = "Bank transfer",
            PaymentStatus = PaymentStatus.Paid,
            Status = TripStatus.Active
        };
        tripA.Recalculate();

        var tripB = new Trip
        {
            Id = Guid.Parse("cccccccc-cccc-4ccc-8ccc-cccccccccccc"),
            TripNumber = "TR-2026-0002",
            Vehicle = vehicleA,
            Driver = driverA,
            Renter = renterA,
            TripType = TripType.PrivateBooking,
            StartDateTime = now.AddDays(-12),
            EndDateTime = now.AddDays(-11),
            StartingOdometer = 34820,
            EndingOdometer = 35020,
            FuelExpense = 2100,
            TollExpense = 640,
            ParkingExpense = 120,
            OtherExpenses = 0,
            GrossRevenue = 9500,
            DriverProceedCommission = 1500,
            PaymentMethod = "GCash",
            PaymentStatus = PaymentStatus.Paid,
            Status = TripStatus.Completed
        };
        tripB.Recalculate();

        var tripC = new Trip
        {
            Id = Guid.Parse("dddddddd-dddd-4ddd-8ddd-dddddddddddd"),
            TripNumber = "TR-2026-0003",
            Booking = bookingA,
            BookingReference = bookingA.ReferenceNumber,
            Vehicle = vehicleA,
            Driver = driverA,
            Renter = renterA,
            TripType = TripType.Rental,
            StartDateTime = bookingA.StartDateTime,
            GrossRevenue = 12600,
            PaymentStatus = PaymentStatus.Partial,
            Status = TripStatus.Scheduled
        };
        tripC.Recalculate();

        var pmsA = new MaintenanceSchedule
        {
            Vehicle = vehicleA,
            Title = "10,000 km PMS",
            DueDate = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(18)),
            DueOdometer = 36000,
            Status = MaintenanceStatus.DueSoon,
            VendorShop = "BeezFleet Partner Garage",
            EstimatedCost = 8500,
            Notes = "Oil, filters, brake inspection"
        };
        var pmsB = new MaintenanceSchedule
        {
            Vehicle = vehicleB,
            Title = "Brake and suspension inspection",
            DueDate = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(5)),
            DueOdometer = 62000,
            Status = MaintenanceStatus.DueSoon,
            VendorShop = "North EDSA Auto Care",
            EstimatedCost = 12000
        };

        dbContext.CompanyProfiles.Add(new CompanyProfile
        {
            CompanyName = companyName,
            BusinessAddress = "Metro Manila, Philippines",
            ContactNumber = "+63 2 8555 0100"
        });
        dbContext.AddRange(vehicleA, vehicleB, driverA, driverB, renterA, renterB, renterC, bookingA, bookingB, bookingC, tripA, tripB, tripC, pmsA, pmsB);
        foreach (var feature in CleanPublicVehicleFeatures)
        {
            dbContext.VehicleFeatureDefinitions.Add(new VehicleFeatureDefinition
            {
                Code = feature.Code,
                Label = feature.Label,
                Icon = feature.Icon,
                SortOrder = feature.SortOrder,
                IsActive = true
            });
        }

        dbContext.Notifications.Add(new Notification
        {
            TenantId = tenantId,
            UserId = ownerUserId,
            Title = "Welcome to BeezFleet",
            Message = "Your demo fleet workspace is ready.",
            Type = NotificationType.Info
        });

        await dbContext.SaveChangesAsync(cancellationToken);
    }
}
