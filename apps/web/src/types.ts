export type VehicleStatus = 'Available' | 'Booked' | 'Under Maintenance' | 'Inactive'
export type DriverStatus = 'Active' | 'Inactive' | 'Suspended'
export type BookingStatus = 'Pending' | 'Confirmed' | 'Active' | 'Completed' | 'Cancelled'
export type PaymentStatus = 'Unpaid' | 'Partial' | 'Paid' | 'Refunded'
export type TripStatus = 'Scheduled' | 'Active' | 'Completed' | 'Cancelled'
export type MaintenanceStatus = 'Upcoming' | 'Due Soon' | 'Overdue' | 'Completed'

export type Vehicle = {
  id: string
  plateNumber: string
  mvFileNumber: string
  engineNumber: string
  chassisVinNumber: string
  make: string
  model: string
  seriesVariant: string
  yearModel: number
  color: string
  vehicleType: string
  bodyType: string
  fuelType: string
  passengerCapacity: number
  classification: string
  grossWeight: string
  currentOdometer: number
  ownershipStatus: 'Owned' | 'Financed' | 'Leased'
  status: VehicleStatus
  remarks: string
}

export type Driver = {
  id: string
  fullName: string
  address: string
  contactNumber: string
  email: string
  emergencyContact: string
  licenseNumber: string
  licenseTypeRestrictions: string
  licenseExpirationDate: string
  status: DriverStatus
  notes: string
}

export type Renter = {
  id: string
  fullName: string
  address: string
  contactNumber: string
  email: string
  validIdType: string
  validIdNumber: string
  driverLicenseNumber?: string
  emergencyContact: string
  isWatchlisted: boolean
  notes: string
}

export type Booking = {
  id: string
  referenceNumber: string
  renterId: string
  vehicleId: string
  driverId?: string
  bookingType: 'Self-drive' | 'With driver' | 'Delivery/logistics' | 'Corporate lease'
  startDateTime: string
  endDateTime: string
  pickupLocation: string
  returnLocation: string
  rateType: 'Daily' | 'Weekly' | 'Monthly' | 'Custom'
  rateAmount: number
  securityDeposit: number
  paymentStatus: PaymentStatus
  bookingStatus: BookingStatus
  notes: string
}

export type Trip = {
  id: string
  tripNumber: string
  bookingId?: string
  bookingReference?: string
  vehicleId: string
  driverId?: string
  renterId: string
  tripType: 'Rental' | 'Delivery' | 'Private booking' | 'Corporate' | 'Other'
  startDateTime: string
  endDateTime?: string
  startingOdometer?: number
  endingOdometer?: number
  fuelExpense: number
  tollExpense: number
  parkingExpense: number
  otherExpenses: number
  grossRevenue: number
  driverProceedCommission: number
  paymentMethod: string
  paymentStatus: PaymentStatus
  remarks: string
  status: TripStatus
}

export type MaintenanceSchedule = {
  id: string
  vehicleId: string
  title: string
  dueDate: string
  dueOdometer: number
  status: MaintenanceStatus
  vendorShop: string
  estimatedCost: number
  notes: string
}

export type DocumentAttachment = {
  id: string
  entityType: string
  entityId: string
  fileName?: string
  originalFileName: string
  fileUrl: string
  displayUrl?: string
  contentType?: string
  fileSize?: number
  documentType: string
  expirationDate?: string
  uploadedAt: string
  isPhoto?: boolean
  isPublic?: boolean
  caption?: string
  displayOrder?: number
}

export type PhotoItem = {
  id: string
  entityType: string
  entityId: string
  originalFileName: string
  fileUrl: string
  displayUrl?: string
  contentType?: string
  fileSize: number
  isPublic: boolean
  caption?: string
  displayOrder: number
  uploadedAt: string
}

export type VehicleFeatureDefinition = {
  id: string
  code: string
  label: string
  icon: string
  sortOrder: number
}

export type PublicVehicleFeature = {
  featureDefinitionId?: string | null
  label: string
  icon: string
  isCustom: boolean
  displayOrder: number
}

export type PublicPageSettings = {
  enabled: boolean
  slug?: string
  publicUrl?: string
  companyName: string
  headline?: string
  description?: string
  bookingInstructions?: string
}

export type PublicVehicleListing = {
  id?: string | null
  vehicleId: string
  vehicleLabel: string
  status: string
  photoCount: number
  publicPhotoCount: number
  isPublished: boolean
  priceAmount?: number | null
  priceUnit?: string | null
  description?: string | null
  rentalNotes?: string | null
  showPlateNumber: boolean
  displayOrder: number
  photos: PhotoItem[]
  features: PublicVehicleFeature[]
}

export type PublicPageManagement = {
  settings: PublicPageSettings
  featureDefinitions: VehicleFeatureDefinition[]
  vehicles: PublicVehicleListing[]
}

export type PublicTenantPhoto = {
  id: string
  displayUrl?: string
  caption?: string
  displayOrder: number
}

export type PublicTenantVehicle = {
  vehicleId: string
  vehicleLabel: string
  plateNumber?: string
  vehicleType?: string
  fuelType?: string
  passengerCapacity: number
  priceAmount?: number | null
  priceUnit?: string | null
  description?: string | null
  rentalNotes?: string | null
  photos: PublicTenantPhoto[]
  features: PublicVehicleFeature[]
}

export type PublicTenantPage = {
  companyName: string
  slug: string
  headline?: string
  description?: string
  bookingInstructions?: string
  vehicles: PublicTenantVehicle[]
}

export type NotificationItem = {
  id: string
  title: string
  message: string
  type: 'Info' | 'Booking' | 'PMS Reminder' | 'Document Expiry' | 'Driver License Expiry' | 'Warning'
  isRead: boolean
  createdAt: string
}
