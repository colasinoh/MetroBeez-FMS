import {
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  Bell,
  Building2,
  CalendarDays,
  Camera,
  Car,
  ChevronLeft,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  Edit3,
  FileText,
  Filter,
  Fuel,
  Globe2,
  History,
  Images,
  KeyRound,
  LayoutDashboard,
  LogOut,
  MailCheck,
  Maximize2,
  Megaphone,
  Menu,
  MessageSquare,
  Moon,
  Plus,
  Route as RouteIcon,
  Save,
  Search,
  Settings as SettingsIcon,
  ShieldCheck,
  Sun,
  Trash2,
  Upload,
  UserRound,
  Users,
  WalletCards,
  Wrench,
  X,
} from 'lucide-react'
import { type FormEvent, useEffect, useMemo, useState } from 'react'
import type * as React from 'react'
import {
  Link,
  Navigate,
  NavLink,
  Outlet,
  Route,
  Routes,
  useNavigate,
  useParams,
  useSearchParams,
} from 'react-router-dom'
import {
  bookingsSeed,
  documentsSeed,
  driversSeed,
  maintenanceSeed,
  notificationsSeed,
  rentersSeed,
  tripsSeed,
  vehiclesSeed,
} from './data'
import type {
  Booking,
  BookingStatus,
  DocumentAttachment,
  Driver,
  MaintenanceSchedule,
  NotificationItem,
  PhotoItem,
  PublicBookingInquiry,
  PublicPageManagement,
  PublicTenantPage,
  PublicTenantVehicle,
  PublicVehicleListing,
  Renter,
  Trip,
  TripStatus,
  Vehicle,
  VehicleStatus,
} from './types'
import './index.css'

const money = new Intl.NumberFormat('en-PH', {
  style: 'currency',
  currency: 'PHP',
  maximumFractionDigits: 0,
})

const tenantNavItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/vehicles', label: 'Vehicles', icon: Car },
  { to: '/drivers', label: 'Drivers', icon: UserRound },
  { to: '/renters', label: 'Renters', icon: Users },
  { to: '/bookings', label: 'Bookings', icon: CalendarDays },
  { to: '/trips', label: 'Trips', icon: RouteIcon },
  { to: '/maintenance', label: 'PMS', icon: Wrench },
  { to: '/documents', label: 'Documents', icon: FileText },
  { to: '/public-page', label: 'Public Page', icon: Globe2 },
  { to: '/notifications', label: 'Notifications', icon: Bell },
  { to: '/reports', label: 'Reports', icon: BarChart3 },
  { to: '/support', label: 'Support', icon: MessageSquare },
  { to: '/settings', label: 'Settings', icon: SettingsIcon },
]

const platformNavItems = [
  { to: '/admin/tenants', label: 'Tenants', icon: ShieldCheck },
  { to: '/admin/announcements', label: 'Announcements', icon: Megaphone },
]

const documentEntityTypes = ['Vehicle', 'Driver', 'Renter', 'Booking', 'Trip', 'Maintenance'] as const

type CompanyProfile = {
  name: string
  address: string
  contactNumber: string
  birDtiLguDocumentUrl?: string
  logoUrl?: string
}

type UserProfile = {
  fullName: string
  email: string
  profilePhotoUrl: string
  profilePhotoDisplayUrl?: string
  gravatarUrl?: string
  address: string
  mobileNumber: string
  jobTitle: string
  emergencyContact: string
  timezone: string
  timeZone?: string
  dateFormat: string
  notificationEmail: string
}

type Toast = {
  title: string
  detail: string
}

type AuthResponse = {
  token: string
  userId: string
  tenantId: string | null
  email: string
  fullName: string
  role: string
  tenantName: string | null
  requiresEmailVerification: boolean
  requiresOnboarding: boolean
}

type AuthSession = {
  token: string
  userId: string
  tenantId: string | null
  email: string
  fullName: string
  role: string
  tenantName: string | null
}

type TenantStatus = 'PendingVerification' | 'Provisioning' | 'Active' | 'Suspended' | 'Cancelled'

type AdminTenant = {
  id: string
  name: string
  slug: string
  databaseName: string
  status: TenantStatus
  subscriptionStatus: string
  ownerUserId: string
  ownerEmail?: string
  ownerName?: string
  userCount: number
  createdAt: string
  updatedAt?: string
}

type AdminTenantVehicle = {
  id: string
  plateNumber: string
  make: string
  model: string
  yearModel: number
  vehicleType?: string | null
  fuelType?: string | null
  passengerCapacity: number
  status: 'Available' | 'Booked' | 'UnderMaintenance' | 'Inactive'
}

type SupportTicket = {
  id: string
  tenantId: string
  tenantName: string
  requesterUserId: string
  requesterName?: string | null
  requesterEmail: string
  subject: string
  message: string
  status: string
  createdAt: string
}

type AdminTenantDetail = {
  tenant: AdminTenant
  vehicles: AdminTenantVehicle[]
  supportTickets: SupportTicket[]
}

type SystemAnnouncement = {
  id: string
  title: string
  message: string
  startsAt: string
  endsAt: string
  isActive: boolean
  createdAt: string
}

type AppData = {
  vehicles: Vehicle[]
  drivers: Driver[]
  renters: Renter[]
  bookings: Booking[]
  trips: Trip[]
  maintenance: MaintenanceSchedule[]
  documents: DocumentAttachment[]
  notifications: NotificationItem[]
  publicInquiries: PublicBookingInquiry[]
  audits: AuditEntry[]
}

type AuditEntry = {
  id: string
  entityType: 'Trip'
  entityId: string
  action: string
  summary: string
  actor: string
  createdAt: string
}

type DocumentEntityOption = {
  id: string
  entityType: string
  label: string
}

type LockedDocumentEntity = {
  entityType: string
  entityId: string
  label: string
}

type VehicleApiDto = {
  id: string
  plateNumber: string
  mvFileNumber?: string | null
  engineNumber?: string | null
  chassisVinNumber?: string | null
  make: string
  model: string
  seriesVariant?: string | null
  yearModel: number
  color?: string | null
  vehicleType?: string | null
  bodyType?: string | null
  fuelType?: string | null
  passengerCapacity: number
  classification?: string | null
  grossWeight?: number | null
  currentOdometer: number
  ownershipStatus: Vehicle['ownershipStatus']
  status: 'Available' | 'Booked' | 'UnderMaintenance' | 'Inactive'
  remarks?: string | null
}

type DriverApiDto = {
  id: string
  fullName: string
  address?: string | null
  contactNumber?: string | null
  email?: string | null
  emergencyContact?: string | null
  licenseNumber?: string | null
  licenseTypeRestrictions?: string | null
  licenseExpirationDate?: string | null
  status: Driver['status']
  notes?: string | null
}

type RenterApiDto = {
  id: string
  fullName: string
  address?: string | null
  contactNumber?: string | null
  email?: string | null
  validIdType?: string | null
  validIdNumber?: string | null
  driverLicenseNumber?: string | null
  emergencyContact?: string | null
  isWatchlisted: boolean
  notes?: string | null
}

type ApiBookingType = 'SelfDrive' | 'WithDriver' | 'DeliveryLogistics' | 'CorporateLease'
type ApiRateType = 'Daily' | 'Weekly' | 'Monthly' | 'Custom'
type ApiTripType = 'Rental' | 'Delivery' | 'PrivateBooking' | 'Corporate' | 'Other'
type ApiMaintenanceStatus = 'Upcoming' | 'DueSoon' | 'Overdue' | 'Completed'
type ApiNotificationType = 'Info' | 'Booking' | 'PmsReminder' | 'DocumentExpiry' | 'DriverLicenseExpiry' | 'Warning'

type BookingApiDto = {
  id: string
  referenceNumber: string
  renterId: string
  vehicleId: string
  driverId?: string | null
  renterName?: string | null
  vehicleLabel?: string | null
  driverName?: string | null
  bookingType: ApiBookingType
  startDateTime: string
  endDateTime: string
  pickupLocation?: string | null
  returnLocation?: string | null
  rateType: ApiRateType
  rateAmount: number
  securityDeposit: number
  paymentStatus: Booking['paymentStatus']
  bookingStatus: BookingStatus
  notes?: string | null
}

type TripApiDto = {
  id: string
  tripNumber: string
  bookingId?: string | null
  bookingReference?: string | null
  vehicleId: string
  driverId?: string | null
  renterId: string
  vehicleLabel?: string | null
  driverName?: string | null
  renterName?: string | null
  tripType: ApiTripType
  startDateTime: string
  endDateTime?: string | null
  startingOdometer?: number | null
  endingOdometer?: number | null
  totalKilometers: number
  fuelExpense: number
  tollExpense: number
  parkingExpense: number
  otherExpenses: number
  grossRevenue: number
  driverProceedCommission: number
  totalExpenses: number
  netProfit: number
  paymentMethod?: string | null
  paymentStatus: Trip['paymentStatus']
  remarks?: string | null
  status: TripStatus
}

type MaintenanceApiDto = {
  id: string
  vehicleId: string
  vehicleLabel?: string | null
  title: string
  dueDate?: string | null
  dueOdometer?: number | null
  status: ApiMaintenanceStatus
  vendorShop?: string | null
  estimatedCost?: number | null
  notes?: string | null
}

type NotificationApiDto = {
  id: string
  title: string
  message: string
  type: ApiNotificationType
  isRead: boolean
  createdAt: string
  relatedEntityType?: string | null
  relatedEntityId?: string | null
}

type GalleryPhoto = {
  id: string
  displayUrl?: string | null
  caption?: string | null
  originalFileName?: string | null
}

const authStorageKey = 'metrobeez.auth'
const authExpiredEventName = 'beezfleet.auth-expired'
let lastAuthExpiredSignalAt = 0
const apiBaseUrl = ((import.meta.env.VITE_API_BASE_URL as string | undefined)
  ?? (['localhost', '127.0.0.1'].includes(window.location.hostname) ? 'http://localhost:5117' : '')).replace(/\/$/, '')

function loadStoredSession() {
  try {
    const value = window.localStorage.getItem(authStorageKey)
    if (!value) {
      return null
    }

    const session = JSON.parse(value) as AuthSession
    if (isJwtExpired(session.token)) {
      window.localStorage.removeItem(authStorageKey)
      return null
    }

    return session
  } catch {
    window.localStorage.removeItem(authStorageKey)
    return null
  }
}

function isJwtExpired(token?: string) {
  if (!token) {
    return true
  }

  try {
    const encodedPayload = token.split('.')[1]
    if (!encodedPayload) {
      return false
    }

    const base64Payload = encodedPayload.replace(/-/g, '+').replace(/_/g, '/')
    const paddedPayload = base64Payload.padEnd(base64Payload.length + ((4 - (base64Payload.length % 4)) % 4), '=')
    const payload = JSON.parse(atob(paddedPayload)) as { exp?: number }
    return typeof payload.exp === 'number' && payload.exp <= Math.floor(Date.now() / 1000) + 30
  } catch {
    return false
  }
}

function storeSession(auth: AuthResponse) {
  const session: AuthSession = {
    token: auth.token,
    userId: auth.userId,
    tenantId: auth.tenantId,
    email: auth.email,
    fullName: auth.fullName,
    role: auth.role,
    tenantName: auth.tenantName,
  }
  window.localStorage.setItem(authStorageKey, JSON.stringify(session))
  return session
}

function landingPathAfterAuth(auth: AuthResponse | AuthSession) {
  if (auth.role === 'SuperAdmin') return '/admin/tenants'
  return 'requiresOnboarding' in auth && auth.requiresOnboarding ? '/onboarding' : '/dashboard'
}

async function postJson<TResponse>(path: string, body: unknown, token?: string) {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  })

  const text = await response.text()
  if (!response.ok) {
    notifyAuthFailure(response.status, text)
    throw new Error(readApiError(text, response.statusText, response.status))
  }

  return (text ? JSON.parse(text) : undefined) as TResponse
}

async function getJson<TResponse>(path: string, token?: string) {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })

  const text = await response.text()
  if (!response.ok) {
    notifyAuthFailure(response.status, text)
    throw new Error(readApiError(text, response.statusText, response.status))
  }

  return (text ? JSON.parse(text) : undefined) as TResponse
}

async function putJson<TResponse>(path: string, body: unknown, token?: string) {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  })

  const text = await response.text()
  if (!response.ok) {
    notifyAuthFailure(response.status, text)
    throw new Error(readApiError(text, response.statusText, response.status))
  }

  return (text ? JSON.parse(text) : undefined) as TResponse
}

async function deleteJson(path: string, token?: string) {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    method: 'DELETE',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })

  const text = await response.text()
  if (!response.ok) {
    notifyAuthFailure(response.status, text)
    throw new Error(readApiError(text, response.statusText, response.status))
  }
}

async function postForm<TResponse>(path: string, body: FormData, token?: string) {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body,
  })

  const text = await response.text()
  if (!response.ok) {
    notifyAuthFailure(response.status, text)
    throw new Error(readApiError(text, response.statusText, response.status))
  }

  return (text ? JSON.parse(text) : undefined) as TResponse
}

function notifyAuthFailure(status: number, text: string) {
  if (status !== 401) {
    return
  }

  const now = Date.now()
  if (now - lastAuthExpiredSignalAt < 1000) {
    return
  }

  lastAuthExpiredSignalAt = now
  window.dispatchEvent(new CustomEvent(authExpiredEventName, {
    detail: { message: readApiError(text, 'Unauthorized', status) },
  }))
}

function readApiError(text: string, fallback: string, status?: number) {
  if (status === 413) {
    return 'The file is too large for the server upload limit. Use a smaller JPG, PNG, or WebP file, or increase nginx client_max_body_size.'
  }

  if (!text) return fallback
  if (/<html[\s>]|<!doctype html/i.test(text)) {
    return fallback === 'Payload Too Large'
      ? 'The file is too large for the server upload limit.'
      : fallback
  }

  try {
    const payload = JSON.parse(text) as { detail?: string; title?: string; errors?: Record<string, string[]> }
    if (payload.detail) return payload.detail
    if (payload.errors) return Object.values(payload.errors).flat().join(' ')
    if (payload.title) return payload.title
  } catch {
    return text
  }

  return fallback
}

async function uploadDocumentFromForm(form: FormData, session: AuthSession | null) {
  if (!session?.token) {
    throw new Error('Please sign in again before uploading documents.')
  }

  const file = form.get('file')
  if (!(file instanceof File) || file.size === 0) {
    throw new Error('Choose the document file to upload.')
  }
  validateDocumentFile(file)

  const entityType = formString(form, 'entityType')
  const entityId = formString(form, 'entityId')
  const documentType = formString(form, 'documentType')
  if (!entityType || !entityId || !documentType) {
    throw new Error('Choose a related record and document type before uploading.')
  }

  const upload = new FormData()
  upload.append('file', file)
  upload.append('entityType', entityType)
  upload.append('entityId', entityId)
  upload.append('documentType', documentType)

  const expirationDate = formString(form, 'expirationDate')
  if (expirationDate) {
    upload.append('expirationDate', expirationDate)
  }

  return postForm<DocumentAttachment>('/api/documents/upload', upload, session.token)
}

async function uploadPhotoFromForm(form: FormData, session: AuthSession | null) {
  if (!session?.token) {
    throw new Error('Please sign in again before uploading photos.')
  }

  const file = form.get('file')
  if (!(file instanceof File) || file.size === 0) {
    throw new Error('Choose an image file to upload.')
  }
  validateBrowserImage(file)

  const entityType = formString(form, 'entityType')
  const entityId = formString(form, 'entityId')
  if (!entityType || !entityId) {
    throw new Error('Choose a related vehicle or driver before uploading.')
  }

  const upload = new FormData()
  upload.append('file', file)
  upload.append('entityType', entityType)
  upload.append('entityId', entityId)
  upload.append('caption', formString(form, 'caption'))
  upload.append('isPublic', 'false')
  upload.append('displayOrder', formString(form, 'displayOrder', '0'))

  return postForm<PhotoItem>('/api/photos/upload', upload, session.token)
}

function validateBrowserImage(file: File) {
  const supportedTypes = new Set(['image/jpeg', 'image/png', 'image/webp'])
  const extension = file.name.split('.').pop()?.toLowerCase()
  const supportedExtensions = new Set(['jpg', 'jpeg', 'png', 'webp'])
  const isSupported = supportedTypes.has(file.type) || (extension ? supportedExtensions.has(extension) : false)
  if (!isSupported) {
    throw new Error('Use a JPG, PNG, or WebP image. HEIC photos need to be converted first so browsers can preview them.')
  }

  const maxBytes = 8 * 1024 * 1024
  if (file.size > maxBytes) {
    throw new Error('Use an image smaller than 8 MB.')
  }
}

function validateDocumentFile(file: File) {
  const maxBytes = 20 * 1024 * 1024
  if (file.size > maxBytes) {
    throw new Error('Use a document smaller than 20 MB.')
  }

  const extension = file.name.split('.').pop()?.toLowerCase()
  const supportedExtensions = new Set(['pdf', 'jpg', 'jpeg', 'png', 'webp', 'doc', 'docx', 'xls', 'xlsx'])
  if (!extension || !supportedExtensions.has(extension)) {
    throw new Error('Use a PDF, JPG, PNG, WebP, Word, or Excel file.')
  }
}

const initialAuditEntries: AuditEntry[] = [
  {
    id: 'audit-trip-1',
    entityType: 'Trip',
    entityId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    action: 'Trip started',
    summary: 'Starting odometer and assigned vehicle status were updated.',
    actor: 'System seed',
    createdAt: '2026-05-14T07:00',
  },
  {
    id: 'audit-trip-2',
    entityType: 'Trip',
    entityId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    action: 'Trip completed',
    summary: 'Ending odometer, expenses, payment status, and profit were recorded.',
    actor: 'System seed',
    createdAt: '2026-05-03T20:00',
  },
]

function App() {
  const [session, setSession] = useState<AuthSession | null>(() => loadStoredSession())
  const [company, setCompany] = useState<CompanyProfile>({
    name: session?.tenantName ?? 'BeezFleet',
    address: '',
    contactNumber: '',
    birDtiLguDocumentUrl: '',
    logoUrl: '',
  })
  const [userProfile, setUserProfile] = useState<UserProfile>({
    fullName: session?.fullName ?? '',
    email: session?.email ?? '',
    profilePhotoUrl: '',
    profilePhotoDisplayUrl: '',
    gravatarUrl: '',
    address: '',
    mobileNumber: '',
    jobTitle: 'Owner / Admin',
    emergencyContact: '',
    timezone: 'Asia/Manila',
    dateFormat: 'MMM d, yyyy',
    notificationEmail: session?.email ?? '',
  })
  const [vehicles, setVehicles] = useState(vehiclesSeed)
  const [drivers, setDrivers] = useState(driversSeed)
  const [renters, setRenters] = useState(rentersSeed)
  const [bookings, setBookings] = useState(bookingsSeed)
  const [trips, setTrips] = useState(tripsSeed)
  const [maintenance, setMaintenance] = useState(maintenanceSeed)
  const [documents, setDocuments] = useState(documentsSeed)
  const [notifications, setNotifications] = useState(notificationsSeed)
  const [publicInquiries, setPublicInquiries] = useState<PublicBookingInquiry[]>([])
  const [auditEntries, setAuditEntries] = useState(initialAuditEntries)
  const [toast, setToast] = useState<Toast | null>(null)
  const [clientGravatarUrl, setClientGravatarUrl] = useState('')

  const data = { vehicles, drivers, renters, bookings, trips, maintenance, documents, notifications, publicInquiries, audits: auditEntries }
  const showToast = (nextToast: Toast) => {
    setToast(nextToast)
    window.setTimeout(() => setToast(null), 3200)
  }
  useEffect(() => {
    const handleAuthExpired = (event: Event) => {
      const message = (event as CustomEvent<{ message?: string }>).detail?.message
      window.localStorage.removeItem(authStorageKey)
      setSession(null)
      showToast({
        title: 'Session expired',
        detail: message && message !== 'Unauthorized' ? message : 'Please log in again before continuing.',
      })
    }

    window.addEventListener(authExpiredEventName, handleAuthExpired)
    return () => window.removeEventListener(authExpiredEventName, handleAuthExpired)
  }, [])
  useEffect(() => {
    if (!session?.token) {
      return
    }

    let active = true
    getJson<UserProfile>('/api/settings/me', session.token)
      .then((profile) => {
        if (active && profile) {
          setUserProfile(normalizeUserProfile(profile, session))
        }
      })
      .catch(() => {
        if (active) {
          setUserProfile((current) => ({
            ...current,
            fullName: current.fullName || session.fullName,
            email: current.email || session.email,
            notificationEmail: current.notificationEmail || session.email,
          }))
        }
      })

    return () => {
      active = false
    }
  }, [session?.token, session?.userId])
  useEffect(() => {
    if (!session?.token || session.role === 'SuperAdmin') {
      return
    }

    let active = true
    Promise.allSettled([
      getJson<VehicleApiDto[]>('/api/vehicles', session.token),
      getJson<DriverApiDto[]>('/api/drivers', session.token),
      getJson<RenterApiDto[]>('/api/renters', session.token),
      getJson<BookingApiDto[]>('/api/bookings', session.token),
      getJson<TripApiDto[]>('/api/trips', session.token),
      getJson<MaintenanceApiDto[]>('/api/maintenance', session.token),
      getJson<DocumentAttachment[]>('/api/documents', session.token),
      getJson<NotificationApiDto[]>('/api/notifications', session.token),
      getJson<PublicBookingInquiry[]>('/api/public-page/booking-inquiries', session.token),
    ])
      .then(([apiVehicles, apiDrivers, apiRenters, apiBookings, apiTrips, apiMaintenance, apiDocuments, apiNotifications, apiPublicInquiries]) => {
        if (!active) return
        if (apiVehicles.status === 'fulfilled') setVehicles(apiVehicles.value.map(vehicleFromApi))
        if (apiDrivers.status === 'fulfilled') setDrivers(apiDrivers.value.map(driverFromApi))
        if (apiRenters.status === 'fulfilled') setRenters(apiRenters.value.map(renterFromApi))
        if (apiBookings.status === 'fulfilled') setBookings(apiBookings.value.map(bookingFromApi))
        if (apiTrips.status === 'fulfilled') setTrips(apiTrips.value.map(tripFromApi))
        if (apiMaintenance.status === 'fulfilled') setMaintenance(apiMaintenance.value.map(maintenanceFromApi))
        if (apiDocuments.status === 'fulfilled') setDocuments(apiDocuments.value.filter((item) => !item.isPhoto))
        if (apiNotifications.status === 'fulfilled') setNotifications(apiNotifications.value.map(notificationFromApi))
        if (apiPublicInquiries.status === 'fulfilled') setPublicInquiries(apiPublicInquiries.value)
      })

    return () => {
      active = false
    }
  }, [session?.token, session?.role])
  useEffect(() => {
    let active = true
    const email = userProfile.email || session?.email
    gravatarUrlFromEmail(email)
      .then((url) => {
        if (active) {
          setClientGravatarUrl(url)
        }
      })
      .catch(() => {
        if (active) {
          setClientGravatarUrl('')
        }
      })

    return () => {
      active = false
    }
  }, [userProfile.email, session?.email])
  const handleAuthenticated = (auth: AuthResponse) => {
    const nextSession = storeSession(auth)
    setSession(nextSession)
    setUserProfile((current) => ({
      ...current,
      fullName: auth.fullName,
      email: auth.email,
      gravatarUrl: current.gravatarUrl,
      notificationEmail: current.notificationEmail || auth.email,
    }))
    if (auth.tenantName) {
      setCompany((current) => ({ ...current, name: auth.tenantName! }))
    }
  }
  const appendTripAudit = (entityId: string, action: string, summary: string) => {
    setAuditEntries((current) => [
      {
        id: crypto.randomUUID(),
        entityType: 'Trip',
        entityId,
        action,
        summary,
        actor: userProfile.fullName || session?.fullName || 'Owner/Admin',
        createdAt: new Date().toISOString(),
      },
      ...current,
    ])
  }
  const handleLogout = () => {
    window.localStorage.removeItem(authStorageKey)
    setSession(null)
  }

  return (
    <>
      <Routes>
        <Route path="/login" element={<LoginPage onAuthenticated={handleAuthenticated} showToast={showToast} />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage showToast={showToast} />} />
        <Route path="/reset-password" element={<ResetPasswordPage showToast={showToast} />} />
        <Route path="/register" element={<RegisterPage showToast={showToast} />} />
        <Route path="/verify-email" element={<VerifyEmailPage onAuthenticated={handleAuthenticated} showToast={showToast} />} />
        <Route path="/privacy" element={<PrivacyPolicyPage />} />
        <Route path="/terms" element={<TermsOfServicePage />} />
        <Route
          path="/onboarding"
          element={<OnboardingPage company={company} session={session} setCompany={setCompany} showToast={showToast} />}
        />
        <Route
          element={
            <Shell
              authenticated={Boolean(session)}
              company={company}
              session={session}
              userProfile={userProfile}
              clientGravatarUrl={clientGravatarUrl}
              notifications={notifications}
              onLogout={handleLogout}
            />
          }
        >
          <Route index element={<Navigate to={session?.role === 'SuperAdmin' ? '/admin/tenants' : '/dashboard'} replace />} />
          <Route path="/admin/tenants" element={<PlatformTenantsPage session={session} showToast={showToast} />} />
          <Route path="/admin/tenants/:id" element={<PlatformTenantDetailsPage session={session} showToast={showToast} />} />
          <Route path="/admin/announcements" element={<PlatformAnnouncementsPage session={session} showToast={showToast} />} />
          <Route path="/dashboard" element={session?.role === 'SuperAdmin' ? <Navigate to="/admin/tenants" replace /> : <DashboardPage data={data} />} />
          <Route
            path="/vehicles"
            element={<VehiclesPage vehicles={vehicles} setVehicles={setVehicles} session={session} showToast={showToast} />}
          />
          <Route path="/vehicles/:id" element={<VehicleDetailsPage data={data} setVehicles={setVehicles} setDocuments={setDocuments} session={session} showToast={showToast} />} />
          <Route path="/drivers" element={<DriversPage drivers={drivers} setDrivers={setDrivers} trips={trips} session={session} showToast={showToast} />} />
          <Route path="/drivers/:id" element={<DriverDetailsPage data={data} setDrivers={setDrivers} setDocuments={setDocuments} session={session} showToast={showToast} />} />
          <Route path="/renters" element={<RentersPage renters={renters} setRenters={setRenters} data={data} session={session} showToast={showToast} />} />
          <Route path="/renters/:id" element={<RenterDetailsPage data={data} setRenters={setRenters} setDocuments={setDocuments} session={session} showToast={showToast} />} />
          <Route
            path="/bookings"
            element={
              <BookingsPage
                data={data}
                setBookings={setBookings}
                setTrips={setTrips}
                setVehicles={setVehicles}
                session={session}
                showToast={showToast}
              />
            }
          />
          <Route path="/bookings/:id" element={<BookingDetailsPage data={data} setBookings={setBookings} setDocuments={setDocuments} session={session} showToast={showToast} />} />
          <Route
            path="/trips"
            element={<TripsPage data={data} setTrips={setTrips} setVehicles={setVehicles} session={session} showToast={showToast} appendTripAudit={appendTripAudit} />}
          />
          <Route path="/trips/:id" element={<TripDetailsPage data={data} setTrips={setTrips} setDocuments={setDocuments} session={session} showToast={showToast} appendTripAudit={appendTripAudit} />} />
          <Route
            path="/maintenance"
            element={<MaintenancePage data={data} maintenance={maintenance} setMaintenance={setMaintenance} setDocuments={setDocuments} session={session} showToast={showToast} />}
          />
          <Route
            path="/documents"
            element={<DocumentsPage documents={documents} setDocuments={setDocuments} data={data} session={session} showToast={showToast} />}
          />
          <Route
            path="/public-page"
            element={<PublicPageManagementPage session={session} showToast={showToast} />}
          />
          <Route
            path="/notifications"
            element={<NotificationsPage data={data} notifications={notifications} setNotifications={setNotifications} setPublicInquiries={setPublicInquiries} session={session} showToast={showToast} />}
          />
          <Route path="/reports" element={<ReportsPage data={data} />} />
          <Route path="/support" element={<SupportPage session={session} userProfile={userProfile} showToast={showToast} />} />
          <Route
            path="/settings"
            element={<SettingsPage company={company} setCompany={setCompany} session={session} setSession={setSession} userProfile={userProfile} clientGravatarUrl={clientGravatarUrl} setUserProfile={setUserProfile} showToast={showToast} />}
          />
        </Route>
        <Route path="/:tenantSlug" element={<TenantPublicPage showToast={showToast} />} />
      </Routes>
      {toast && <ToastMessage toast={toast} />}
    </>
  )
}

function Shell({
  authenticated,
  company,
  session,
  userProfile,
  clientGravatarUrl,
  notifications,
  onLogout,
}: {
  authenticated: boolean
  company: CompanyProfile
  session: AuthSession | null
  userProfile: UserProfile
  clientGravatarUrl: string
  notifications: NotificationItem[]
  onLogout: () => void
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const navigate = useNavigate()
  const isSuperAdmin = session?.role === 'SuperAdmin'
  const navItems = isSuperAdmin ? platformNavItems : tenantNavItems
  const unreadCount = isSuperAdmin ? 0 : notifications.filter((item) => !item.isRead).length

  if (!authenticated) {
    return <Navigate to="/login" replace />
  }

  return (
    <div className="app-shell">
      <aside className={`sidebar ${menuOpen ? 'is-open' : ''}`}>
        <Link className="brand" to={isSuperAdmin ? '/admin/tenants' : '/dashboard'} onClick={() => setMenuOpen(false)}>
          <span className="brand-mark">BF</span>
          <span>
            <strong>BeezFleet</strong>
            <small>{isSuperAdmin ? 'Platform command center' : 'Fleet command center'}</small>
          </span>
        </Link>
        <nav className="nav-list" aria-label="Primary navigation">
          {navItems.map((item) => (
            <NavLink key={item.to} to={item.to} onClick={() => setMenuOpen(false)}>
              <item.icon size={18} aria-hidden="true" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <button className="icon-button mobile-menu" type="button" title="Open navigation" onClick={() => setMenuOpen(true)}>
            <Menu size={20} />
          </button>
          <div className="topbar-company">
            <Building2 size={18} />
            <span>{isSuperAdmin ? 'BeezFleet Platform' : company.name}</span>
          </div>
          <label className="global-search">
            <Search size={17} />
            <input placeholder={isSuperAdmin ? 'Search tenants' : 'Search fleet records'} />
          </label>
          <button className="icon-button notification-button" type="button" title="Notifications" onClick={() => navigate('/notifications')}>
            <Bell size={19} />
            {unreadCount > 0 && <span className="notification-count">{unreadCount}</span>}
          </button>
          <button className="avatar-button" type="button" title="Account menu" onClick={() => navigate(isSuperAdmin ? '/admin/tenants' : '/settings')}>
            <AvatarImage sources={avatarSources(userProfile, clientGravatarUrl)} fallback={initials(userProfile.fullName || session?.fullName)} />
          </button>
          <button className="icon-button" type="button" title="Logout" onClick={onLogout}>
            <LogOut size={18} />
          </button>
        </header>
        <main className="content">
          <Outlet />
        </main>
      </div>
      {menuOpen && <button className="scrim" type="button" aria-label="Close navigation" onClick={() => setMenuOpen(false)} />}
    </div>
  )
}

function DashboardPage({ data }: { data: AppData }) {
  const activeTrips = data.trips.filter((trip) => trip.status === 'Active').length
  const monthlyTrips = data.trips.filter((trip) => trip.startDateTime.startsWith('2026-05'))
  const gross = sum(monthlyTrips.map((trip) => trip.grossRevenue))
  const net = sum(monthlyTrips.map((trip) => netProfit(trip)))
  const fuelToll = sum(monthlyTrips.map((trip) => trip.fuelExpense + trip.tollExpense))
  const inquiryCounts = inquiryCountsByVehicle(data)
  const maxInquiryCount = Math.max(...inquiryCounts.map((item) => item.count), 1)

  return (
    <Page>
      <PageHeader
        eyebrow="Operations"
        title="Dashboard"
      />
      <section className="metric-grid">
        <MetricCard icon={Car} label="Total vehicles" value={data.vehicles.length.toString()} tone="blue" />
        <MetricCard icon={CheckCircle2} label="Available" value={countVehicles(data.vehicles, 'Available').toString()} tone="green" />
        <MetricCard icon={CalendarDays} label="Booked" value={countVehicles(data.vehicles, 'Booked').toString()} tone="gold" />
        <MetricCard icon={Wrench} label="Maintenance" value={countVehicles(data.vehicles, 'Under Maintenance').toString()} tone="red" />
        <MetricCard icon={RouteIcon} label="Active trips" value={activeTrips.toString()} tone="blue" />
        <MetricCard icon={Clock3} label="Upcoming PMS" value={data.maintenance.length.toString()} tone="gold" />
        <MetricCard icon={CircleDollarSign} label="Monthly gross" value={money.format(gross)} tone="green" />
        <MetricCard icon={WalletCards} label="Monthly net" value={money.format(net)} tone="blue" />
        <MetricCard icon={Fuel} label="Fuel + toll" value={money.format(fuelToll)} tone="red" />
        <MetricCard icon={MailCheck} label="Public inquiries" value={data.publicInquiries.length.toString()} tone="gold" />
      </section>
      <section className="dashboard-grid">
        <Panel title="Recent bookings" action={<Link to="/bookings">View all</Link>}>
          <CompactList>
            {data.bookings.slice(0, 4).map((booking) => (
              <li key={booking.id}>
                <span>
                  <strong>{booking.referenceNumber}</strong>
                  <small>{renterName(data, booking.renterId)} · {vehicleLabel(data, booking.vehicleId)}</small>
                </span>
                <Badge status={booking.bookingStatus} />
              </li>
            ))}
          </CompactList>
        </Panel>
        <Panel title="Recent trips" action={<Link to="/trips">View all</Link>}>
          <CompactList>
            {data.trips.slice(0, 4).map((trip) => (
              <li key={trip.id}>
                <span>
                  <strong>{trip.tripNumber}</strong>
                  <small>{driverName(data, trip.driverId)} · {money.format(netProfit(trip))} net</small>
                </span>
                <Badge status={trip.status} />
              </li>
            ))}
          </CompactList>
        </Panel>
        <Panel title="Top inquiry vehicles" action={<Link to="/reports">Insights</Link>}>
          {inquiryCounts.length > 0 ? (
            <div className="bar-list">
              {inquiryCounts.slice(0, 5).map((item) => (
                <div className="bar-row" key={item.key}>
                  <span>{item.label}</span>
                  <div><i style={{ width: `${(item.count / maxInquiryCount) * 100}%` }} /></div>
                  <strong>{item.count}</strong>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="No inquiries yet" detail="Public booking inquiries will appear here." />
          )}
        </Panel>
        <Panel title="Expiring documents" action={<Link to="/documents">Review</Link>}>
          <CompactList>
            {data.documents
              .filter((doc) => doc.expirationDate)
              .map((doc) => (
                <li key={doc.id}>
                  <span>
                    <strong>{doc.documentType}</strong>
                    <small>{doc.entityType} · {dateText(doc.expirationDate)}</small>
                  </span>
                  <Badge status={daysUntil(doc.expirationDate) <= 7 ? 'Overdue' : 'Due Soon'} />
                </li>
              ))}
          </CompactList>
        </Panel>
        <Panel title="Alerts & inquiries" action={<Link to="/notifications">Open</Link>}>
          <CompactList>
            {data.notifications.map((item) => (
              <li key={item.id}>
                <span>
                  <strong>{item.title}</strong>
                  <small>{item.message}</small>
                </span>
                {!item.isRead && <span className="unread-pill">New</span>}
              </li>
            ))}
          </CompactList>
        </Panel>
      </section>
    </Page>
  )
}

const tenantStatusOptions: TenantStatus[] = ['PendingVerification', 'Provisioning', 'Active', 'Suspended', 'Cancelled']

function PlatformTenantsPage({ session, showToast }: { session: AuthSession | null; showToast: (toast: Toast) => void }) {
  const [tenants, setTenants] = useState<AdminTenant[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<AdminTenant | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    if (!session?.token || session.role !== 'SuperAdmin') {
      return
    }

    let active = true
    setLoading(true)
    getJson<AdminTenant[]>('/api/admin/tenants', session.token)
      .then((items) => {
        if (active) {
          setTenants(items)
        }
      })
      .catch((error) => {
        if (active) {
          showToast({ title: 'Tenants not loaded', detail: error instanceof Error ? error.message : 'Please try again.' })
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false)
        }
      })

    return () => {
      active = false
    }
  }, [session?.token, session?.role])

  if (!session || session.role !== 'SuperAdmin') {
    return <Navigate to="/dashboard" replace />
  }

  const filteredTenants = tenants.filter((tenant) =>
    [tenant.name, tenant.slug, tenant.ownerEmail, tenant.databaseName, tenant.status]
      .join(' ')
      .toLowerCase()
      .includes(query.toLowerCase()),
  )

  const updateTenantStatus = async (tenant: AdminTenant, status: TenantStatus) => {
    const previous = tenant.status
    setTenants((current) => current.map((item) => item.id === tenant.id ? { ...item, status } : item))
    try {
      const updated = await putJson<AdminTenant>(`/api/admin/tenants/${tenant.id}/status`, { status }, session.token)
      setTenants((current) => current.map((item) => item.id === tenant.id ? updated : item))
      showToast({ title: 'Tenant updated', detail: `${tenant.name} is now ${statusLabel(status)}.` })
    } catch (error) {
      setTenants((current) => current.map((item) => item.id === tenant.id ? { ...item, status: previous } : item))
      showToast({ title: 'Tenant not updated', detail: error instanceof Error ? error.message : 'Please try again.' })
    }
  }

  const deleteTenant = async () => {
    if (!deleteTarget) return
    try {
      await deleteJson(`/api/admin/tenants/${deleteTarget.id}`, session.token)
      setTenants((current) => current.filter((tenant) => tenant.id !== deleteTarget.id))
      showToast({ title: 'Tenant deleted', detail: `${deleteTarget.name} database and storage folder were removed.` })
      setDeleteTarget(null)
    } catch (error) {
      showToast({ title: 'Tenant not deleted', detail: error instanceof Error ? error.message : 'Please check the API logs.' })
    }
  }

  return (
    <Page>
      <PageHeader eyebrow="Platform" title="Tenants" />
      <Toolbar query={query} setQuery={setQuery} placeholder="Search tenant, owner, database, status" />
      <Panel title="Tenant workspaces">
        <Table>
          <thead>
            <tr>
              <th>Tenant</th>
              <th>Owner</th>
              <th>Database</th>
              <th>Users</th>
              <th>Status</th>
              <th>Created</th>
              <th aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {filteredTenants.map((tenant) => (
              <tr className="clickable-row" key={tenant.id} onClick={() => navigate(`/admin/tenants/${tenant.id}`)}>
                <td>
                  <strong>{tenant.name}</strong>
                  <small>{tenant.slug} - {tenant.subscriptionStatus}</small>
                </td>
                <td>
                  {tenant.ownerName || 'No owner name'}
                  <small>{tenant.ownerEmail || tenant.ownerUserId}</small>
                </td>
                <td><code>{tenant.databaseName}</code></td>
                <td>{tenant.userCount}</td>
                <td>
                  <label className="compact-select">
                    <select value={tenant.status} onClick={(event) => event.stopPropagation()} onChange={(event) => updateTenantStatus(tenant, event.target.value as TenantStatus)}>
                      {tenantStatusOptions.map((status) => <option key={status} value={status}>{statusLabel(status)}</option>)}
                    </select>
                  </label>
                </td>
                <td>{dateText(tenant.createdAt)}</td>
                <td className="table-actions">
                  <button className="icon-button danger" type="button" title="Delete tenant" onClick={(event) => { event.stopPropagation(); setDeleteTarget(tenant) }}><Trash2 size={16} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
        {loading && <EmptyState title="Loading tenants" detail="Fetching platform workspaces." />}
        {!loading && filteredTenants.length === 0 && <EmptyState title="No tenants found" detail="Adjust the search or create a tenant from the registration flow." />}
      </Panel>
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete tenant"
        detail={`This permanently deletes ${deleteTarget?.name ?? 'this tenant'}, its tenant database, and its storage folder. This cannot be undone.`}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={deleteTenant}
      />
    </Page>
  )
}

function PlatformTenantDetailsPage({ session, showToast }: { session: AuthSession | null; showToast: (toast: Toast) => void }) {
  const { id } = useParams()
  const [detail, setDetail] = useState<AdminTenantDetail | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!session?.token || session.role !== 'SuperAdmin' || !id) {
      return
    }

    let active = true
    setLoading(true)
    getJson<AdminTenantDetail>(`/api/admin/tenants/${id}`, session.token)
      .then((item) => {
        if (active) {
          setDetail(item)
        }
      })
      .catch((error) => {
        if (active) {
          showToast({ title: 'Tenant not loaded', detail: error instanceof Error ? error.message : 'Please try again.' })
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false)
        }
      })

    return () => {
      active = false
    }
  }, [id, session?.token, session?.role])

  if (!session || session.role !== 'SuperAdmin') {
    return <Navigate to="/dashboard" replace />
  }

  if (loading) {
    return <Page><PageHeader eyebrow="Platform" title="Tenant details" action={<BackLink to="/admin/tenants" label="Back to tenants" />} /><EmptyState title="Loading tenant" detail="Fetching tenant workspace details." /></Page>
  }

  if (!detail) {
    return <NotFound title="Tenant not found" />
  }

  return (
    <Page>
      <PageHeader eyebrow="Tenant workspace" title={detail.tenant.name} action={<BackLink to="/admin/tenants" label="Back to tenants" />} />
      <Panel title="Tenant details">
        <DetailGrid
          items={[
            ['Owner', detail.tenant.ownerName || 'No owner name'],
            ['Owner email', detail.tenant.ownerEmail || detail.tenant.ownerUserId],
            ['Status', statusLabel(detail.tenant.status)],
            ['Subscription', detail.tenant.subscriptionStatus],
            ['Slug', detail.tenant.slug],
            ['Database', detail.tenant.databaseName],
            ['Users', detail.tenant.userCount.toString()],
            ['Created', dateText(detail.tenant.createdAt)],
          ]}
        />
      </Panel>
      <TwoColumn>
        <Panel title="Vehicles">
          <Table>
            <thead>
              <tr><th>Plate</th><th>Vehicle</th><th>Type</th><th>Capacity</th><th>Status</th></tr>
            </thead>
            <tbody>
              {detail.vehicles.map((vehicle) => (
                <tr key={vehicle.id}>
                  <td><strong>{vehicle.plateNumber}</strong></td>
                  <td>{vehicle.yearModel} {vehicle.make} {vehicle.model}<small>{vehicle.fuelType || 'No fuel type'}</small></td>
                  <td>{vehicle.vehicleType || 'N/A'}</td>
                  <td>{vehicle.passengerCapacity}</td>
                  <td><Badge status={platformVehicleStatusLabel(vehicle.status)} /></td>
                </tr>
              ))}
            </tbody>
          </Table>
          {detail.vehicles.length === 0 && <EmptyState title="No vehicles" detail="This tenant has no vehicle records yet." />}
        </Panel>
        <Panel title="Support tickets">
          <CompactList>
            {detail.supportTickets.map((ticket) => (
              <li key={ticket.id}>
                <span>
                  <strong>{ticket.subject}</strong>
                  <small>{ticket.requesterName || ticket.requesterEmail} - {dateTimeText(ticket.createdAt)}</small>
                  <small>{ticket.message}</small>
                </span>
                <Badge status={ticket.status} />
              </li>
            ))}
          </CompactList>
          {detail.supportTickets.length === 0 && <EmptyState title="No support tickets" detail="Tenant support messages will appear here." />}
        </Panel>
      </TwoColumn>
    </Page>
  )
}

function PlatformAnnouncementsPage({ session, showToast }: { session: AuthSession | null; showToast: (toast: Toast) => void }) {
  const [announcements, setAnnouncements] = useState<SystemAnnouncement[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!session?.token || session.role !== 'SuperAdmin') {
      return
    }

    let active = true
    setLoading(true)
    getJson<SystemAnnouncement[]>('/api/admin/announcements', session.token)
      .then((items) => {
        if (active) {
          setAnnouncements(items)
        }
      })
      .catch((error) => {
        if (active) {
          showToast({ title: 'Announcements not loaded', detail: error instanceof Error ? error.message : 'Please try again.' })
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false)
        }
      })

    return () => {
      active = false
    }
  }, [session?.token, session?.role])

  if (!session || session.role !== 'SuperAdmin') {
    return <Navigate to="/dashboard" replace />
  }

  const createAnnouncement = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitting(true)
    const formElement = event.currentTarget
    const form = new FormData(formElement)
    try {
      const saved = await postJson<SystemAnnouncement>('/api/admin/announcements', {
        title: formString(form, 'title').trim(),
        message: formString(form, 'message').trim(),
        startsAt: formDateTimeOffset(form, 'startsAt'),
        endsAt: formDateTimeOffset(form, 'endsAt'),
        isActive: form.get('isActive') === 'on',
      }, session.token)
      setAnnouncements((current) => [saved, ...current])
      formElement.reset()
      showToast({ title: 'Announcement posted', detail: 'The login page will show it during the scheduled window.' })
    } catch (error) {
      showToast({ title: 'Announcement not saved', detail: error instanceof Error ? error.message : 'Please review the schedule.' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Page>
      <PageHeader eyebrow="Platform" title="Announcements" />
      <TwoColumn>
        <Panel title="System maintenance announcement">
          <form className="modal-form" onSubmit={createAnnouncement}>
            <Field label="Title" name="title" defaultValue="Scheduled system maintenance" required />
            <label className="field full"><span>Message</span><textarea name="message" defaultValue="BeezFleet will undergo scheduled maintenance. Some features may be temporarily unavailable during this window." required /></label>
            <Field label="Start date/time" name="startsAt" type="datetime-local" required />
            <Field label="End date/time" name="endsAt" type="datetime-local" required />
            <label className="toggle-row form-toggle"><input name="isActive" type="checkbox" defaultChecked /> Active</label>
            <button className="primary-button full" type="submit" disabled={submitting}><Megaphone size={18} /> {submitting ? 'Posting...' : 'Post announcement'}</button>
          </form>
        </Panel>
        <Panel title="Recent announcements">
          <CompactList>
            {announcements.map((announcement) => (
              <li key={announcement.id}>
                <span>
                  <strong>{announcement.title}</strong>
                  <small>{dateTimeText(announcement.startsAt)} - {dateTimeText(announcement.endsAt)}</small>
                  <small>{announcement.message}</small>
                </span>
                <Badge status={announcement.isActive ? 'Active' : 'Inactive'} />
              </li>
            ))}
          </CompactList>
          {loading && <EmptyState title="Loading announcements" detail="Fetching platform notices." />}
          {!loading && announcements.length === 0 && <EmptyState title="No announcements" detail="Create one to show it on the login page." />}
        </Panel>
      </TwoColumn>
    </Page>
  )
}

function VehiclesPage({
  vehicles,
  setVehicles,
  session,
  showToast,
}: {
  vehicles: Vehicle[]
  setVehicles: React.Dispatch<React.SetStateAction<Vehicle[]>>
  session: AuthSession | null
  showToast: (toast: Toast) => void
}) {
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<'All' | VehicleStatus>('All')
  const [modalOpen, setModalOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const filtered = useMemo(() => {
    return vehicles
      .filter((vehicle) => status === 'All' || vehicle.status === status)
      .filter((vehicle) =>
        [vehicle.plateNumber, vehicle.make, vehicle.model, vehicle.vehicleType].join(' ').toLowerCase().includes(query.toLowerCase()),
      )
      .sort((a, b) => a.plateNumber.localeCompare(b.plateNumber))
  }, [vehicles, query, status])

  const addVehicle = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!session?.token) {
      showToast({ title: 'Vehicle not saved', detail: 'Please sign in again before changing vehicles.' })
      return
    }

    try {
      const saved = await postJson<VehicleApiDto>('/api/vehicles', vehiclePayloadFromForm(new FormData(event.currentTarget)), session.token)
      setVehicles((current) => [vehicleFromApi(saved), ...current])
      setModalOpen(false)
      showToast({ title: 'Vehicle saved', detail: `${saved.plateNumber} was added to the fleet.` })
    } catch (error) {
      showToast({ title: 'Vehicle not saved', detail: error instanceof Error ? error.message : 'Please review the vehicle details.' })
    }
  }
  const editingVehicle = vehicles.find((vehicle) => vehicle.id === editId)
  const editVehicle = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!editingVehicle) return
    if (!session?.token) {
      showToast({ title: 'Vehicle not saved', detail: 'Please sign in again before changing vehicles.' })
      return
    }

    try {
      const saved = await putJson<VehicleApiDto>(`/api/vehicles/${editingVehicle.id}`, vehiclePayloadFromForm(new FormData(event.currentTarget), editingVehicle), session.token)
      setVehicles((current) => current.map((vehicle) => vehicle.id === editingVehicle.id ? vehicleFromApi(saved) : vehicle))
      setEditId(null)
      showToast({ title: 'Vehicle updated', detail: `${saved.plateNumber} changes were saved.` })
    } catch (error) {
      showToast({ title: 'Vehicle not saved', detail: error instanceof Error ? error.message : 'Please review the vehicle details.' })
    }
  }

  const deleteVehicle = async () => {
    if (!deleteId || !session?.token) {
      setDeleteId(null)
      return
    }

    try {
      await deleteJson(`/api/vehicles/${deleteId}`, session.token)
      setVehicles((current) => current.filter((vehicle) => vehicle.id !== deleteId))
      setDeleteId(null)
      showToast({ title: 'Vehicle deleted', detail: 'The vehicle was removed from the active fleet list.' })
    } catch (error) {
      showToast({ title: 'Vehicle not deleted', detail: error instanceof Error ? error.message : 'Please try again.' })
    }
  }

  return (
    <Page>
      <PageHeader
        eyebrow="Fleet"
        title="Vehicles"
        action={<button className="primary-button" type="button" onClick={() => setModalOpen(true)}><Plus size={18} /> Add vehicle</button>}
      />
      <Toolbar query={query} setQuery={setQuery} placeholder="Search plate, make, model">
        <SelectFilter value={status} onChange={(value) => setStatus(value as 'All' | VehicleStatus)} options={['All', 'Available', 'Booked', 'Under Maintenance', 'Inactive']} />
      </Toolbar>
      <Table>
        <thead>
          <tr>
            <th>Plate</th>
            <th>Vehicle</th>
            <th>Type</th>
            <th>Odometer</th>
            <th>Ownership</th>
            <th>Status</th>
            <th aria-label="Actions" />
          </tr>
        </thead>
        <tbody>
          {filtered.map((vehicle) => (
            <tr key={vehicle.id}>
              <td><Link className="table-link" to={`/vehicles/${vehicle.id}`}>{vehicle.plateNumber}</Link></td>
              <td>{vehicle.yearModel} {vehicle.make} {vehicle.model}<small>{vehicle.color} · {vehicle.fuelType}</small></td>
              <td>{vehicle.vehicleType}</td>
              <td>{vehicle.currentOdometer.toLocaleString()} km</td>
              <td>{vehicle.ownershipStatus}</td>
              <td><Badge status={vehicle.status} /></td>
              <td className="table-actions">
                <button className="icon-button" type="button" title="Edit vehicle" onClick={() => setEditId(vehicle.id)}><Edit3 size={16} /></button>
                <IconLink to={`/vehicles/${vehicle.id}`} title="View vehicle" />
                <button className="icon-button danger" type="button" title="Delete vehicle" onClick={() => setDeleteId(vehicle.id)}><Trash2 size={16} /></button>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
      {filtered.length === 0 && <EmptyState title="No vehicles found" detail="Adjust the search or add a new fleet unit." />}
      <Modal title="Add vehicle" open={modalOpen} onClose={() => setModalOpen(false)}>
        <VehicleForm onSubmit={addVehicle} />
      </Modal>
      <Modal title="Edit vehicle" open={Boolean(editingVehicle)} onClose={() => setEditId(null)}>
        <VehicleForm defaultValues={editingVehicle} onSubmit={editVehicle} submitLabel="Save vehicle changes" />
      </Modal>
      <ConfirmDialog
        open={Boolean(deleteId)}
        title="Delete vehicle"
        detail="This removes the vehicle from this tenant workspace."
        onCancel={() => setDeleteId(null)}
        onConfirm={deleteVehicle}
      />
    </Page>
  )
}

function VehicleDetailsPage({
  data,
  setVehicles,
  setDocuments,
  session,
  showToast,
}: {
  data: AppData
  setVehicles: React.Dispatch<React.SetStateAction<Vehicle[]>>
  setDocuments: React.Dispatch<React.SetStateAction<DocumentAttachment[]>>
  session: AuthSession | null
  showToast: (toast: Toast) => void
}) {
  const { id } = useParams()
  const [editOpen, setEditOpen] = useState(false)
  const vehicle = data.vehicles.find((item) => item.id === id)
  if (!vehicle) return <NotFound title="Vehicle not found" />

  const relatedTrips = data.trips.filter((trip) => trip.vehicleId === vehicle.id)
  const relatedDocs = data.documents.filter((doc) => doc.entityType === 'Vehicle' && doc.entityId === vehicle.id)

  return (
    <Page>
      <PageHeader
        eyebrow="Vehicle details"
        title={vehicle.plateNumber}
        action={<HeaderActions><BackLink to="/vehicles" label="Back to vehicles" /><button className="secondary-button" type="button" onClick={() => setEditOpen(true)}><Edit3 size={16} /> Edit</button><Badge status={vehicle.status} /></HeaderActions>}
      />
      <DetailGrid
        items={[
          ['Make / model', `${vehicle.yearModel} ${vehicle.make} ${vehicle.model}`],
          ['Series', vehicle.seriesVariant],
          ['MV file no.', vehicle.mvFileNumber],
          ['Engine no.', vehicle.engineNumber],
          ['Chassis / VIN', vehicle.chassisVinNumber],
          ['Odometer', `${vehicle.currentOdometer.toLocaleString()} km`],
          ['Fuel', vehicle.fuelType],
          ['Capacity', `${vehicle.passengerCapacity} passengers`],
          ['Ownership', vehicle.ownershipStatus],
          ['Remarks', vehicle.remarks],
        ]}
      />
      <EntityPhotosPanel
        entityType="Vehicle"
        entityId={vehicle.id}
        entityLabel={vehicleLabel(data, vehicle.id)}
        session={session}
        showToast={showToast}
      />
      <TwoColumn>
        <Panel title="Trip history">
          <CompactList>
            {relatedTrips.map((trip) => (
              <li key={trip.id}><span><strong>{trip.tripNumber}</strong><small>{trip.tripType} · {money.format(netProfit(trip))} net</small></span><Badge status={trip.status} /></li>
            ))}
          </CompactList>
        </Panel>
        <EntityDocumentsPanel
          data={data}
          entityType="Vehicle"
          entityId={vehicle.id}
          entityLabel={vehicleLabel(data, vehicle.id)}
          documents={relatedDocs}
          setDocuments={setDocuments}
          session={session}
          showToast={showToast}
        />
      </TwoColumn>
      <Modal title="Edit vehicle" open={editOpen} onClose={() => setEditOpen(false)}>
        <VehicleForm
          defaultValues={vehicle}
          onSubmit={async (event) => {
            event.preventDefault()
            if (!session?.token) {
              showToast({ title: 'Vehicle not saved', detail: 'Please sign in again before changing vehicles.' })
              return
            }

            try {
              const saved = await putJson<VehicleApiDto>(`/api/vehicles/${vehicle.id}`, vehiclePayloadFromForm(new FormData(event.currentTarget), vehicle), session.token)
              setVehicles((current) => current.map((item) => item.id === vehicle.id ? vehicleFromApi(saved) : item))
              setEditOpen(false)
              showToast({ title: 'Vehicle updated', detail: `${saved.plateNumber} changes were saved.` })
            } catch (error) {
              showToast({ title: 'Vehicle not saved', detail: error instanceof Error ? error.message : 'Please review the vehicle details.' })
            }
          }}
          submitLabel="Save vehicle changes"
        />
      </Modal>
    </Page>
  )
}

function DriversPage({
  drivers,
  setDrivers,
  trips,
  session,
  showToast,
}: {
  drivers: Driver[]
  setDrivers: React.Dispatch<React.SetStateAction<Driver[]>>
  trips: Trip[]
  session: AuthSession | null
  showToast: (toast: Toast) => void
}) {
  const [query, setQuery] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const filtered = drivers.filter((driver) => [driver.fullName, driver.email, driver.licenseNumber].join(' ').toLowerCase().includes(query.toLowerCase()))

  const addDriver = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!session?.token) {
      showToast({ title: 'Driver not saved', detail: 'Please sign in again before changing drivers.' })
      return
    }

    try {
      const saved = await postJson<DriverApiDto>('/api/drivers', driverPayloadFromForm(new FormData(event.currentTarget)), session.token)
      setDrivers((current) => [...current, driverFromApi(saved)])
      setModalOpen(false)
      showToast({ title: 'Driver saved', detail: `${saved.fullName} was added to the driver list.` })
    } catch (error) {
      showToast({ title: 'Driver not saved', detail: error instanceof Error ? error.message : 'Please review the driver details.' })
    }
  }
  const editingDriver = drivers.find((driver) => driver.id === editId)
  const editDriver = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!editingDriver) return
    if (!session?.token) {
      showToast({ title: 'Driver not saved', detail: 'Please sign in again before changing drivers.' })
      return
    }

    try {
      const saved = await putJson<DriverApiDto>(`/api/drivers/${editingDriver.id}`, driverPayloadFromForm(new FormData(event.currentTarget), editingDriver), session.token)
      setDrivers((current) => current.map((driver) => driver.id === editingDriver.id ? driverFromApi(saved) : driver))
      setEditId(null)
      showToast({ title: 'Driver updated', detail: `${saved.fullName} changes were saved.` })
    } catch (error) {
      showToast({ title: 'Driver not saved', detail: error instanceof Error ? error.message : 'Please review the driver details.' })
    }
  }

  return (
    <Page>
      <PageHeader eyebrow="People" title="Drivers" action={<button className="primary-button" type="button" onClick={() => setModalOpen(true)}><Plus size={18} /> Add driver</button>} />
      <Toolbar query={query} setQuery={setQuery} placeholder="Search driver, email, license" />
      <Table>
        <thead>
          <tr><th>Name</th><th>Contact</th><th>License</th><th>Assigned trips</th><th>Status</th><th aria-label="Actions" /></tr>
        </thead>
        <tbody>
          {filtered.map((driver) => (
            <tr key={driver.id}>
              <td><Link className="table-link" to={`/drivers/${driver.id}`}>{driver.fullName}</Link><small>{driver.email}</small></td>
              <td>{driver.contactNumber}</td>
              <td>{driver.licenseNumber}<small>Expires {dateText(driver.licenseExpirationDate)}</small></td>
              <td>{trips.filter((trip) => trip.driverId === driver.id).length}</td>
              <td><Badge status={driver.status} /></td>
              <td className="table-actions">
                <button className="icon-button" type="button" title="Edit driver" onClick={() => setEditId(driver.id)}><Edit3 size={16} /></button>
                <IconLink to={`/drivers/${driver.id}`} title="View driver" />
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
      <Modal title="Add driver" open={modalOpen} onClose={() => setModalOpen(false)}>
        <DriverForm onSubmit={addDriver} />
      </Modal>
      <Modal title="Edit driver" open={Boolean(editingDriver)} onClose={() => setEditId(null)}>
        <DriverForm defaultValues={editingDriver} onSubmit={editDriver} submitLabel="Save driver changes" />
      </Modal>
    </Page>
  )
}

function DriverDetailsPage({
  data,
  setDrivers,
  setDocuments,
  session,
  showToast,
}: {
  data: AppData
  setDrivers: React.Dispatch<React.SetStateAction<Driver[]>>
  setDocuments: React.Dispatch<React.SetStateAction<DocumentAttachment[]>>
  session: AuthSession | null
  showToast: (toast: Toast) => void
}) {
  const { id } = useParams()
  const [editOpen, setEditOpen] = useState(false)
  const driver = data.drivers.find((item) => item.id === id)
  if (!driver) return <NotFound title="Driver not found" />
  const assignedTrips = data.trips.filter((trip) => trip.driverId === driver.id)
  const docs = data.documents.filter((doc) => doc.entityType === 'Driver' && doc.entityId === driver.id)
  return (
    <Page>
      <PageHeader
        eyebrow="Driver details"
        title={driver.fullName}
        action={<HeaderActions><BackLink to="/drivers" label="Back to drivers" /><button className="secondary-button" type="button" onClick={() => setEditOpen(true)}><Edit3 size={16} /> Edit</button><Badge status={driver.status} /></HeaderActions>}
      />
      <DetailGrid items={[
        ['Contact', driver.contactNumber],
        ['Email', driver.email],
        ['Address', driver.address],
        ['Emergency contact', driver.emergencyContact],
        ['License no.', driver.licenseNumber],
        ['License type', driver.licenseTypeRestrictions],
        ['License expires', dateText(driver.licenseExpirationDate)],
        ['Notes', driver.notes],
      ]} />
      <EntityPhotosPanel
        entityType="Driver"
        entityId={driver.id}
        entityLabel={driver.fullName}
        session={session}
        showToast={showToast}
      />
      <TwoColumn>
        <Panel title="Assigned trips">
          <CompactList>
            {assignedTrips.map((trip) => <li key={trip.id}><span><strong>{trip.tripNumber}</strong><small>{vehicleLabel(data, trip.vehicleId)}</small></span><Badge status={trip.status} /></li>)}
          </CompactList>
        </Panel>
        <EntityDocumentsPanel
          data={data}
          entityType="Driver"
          entityId={driver.id}
          entityLabel={driver.fullName}
          documents={docs}
          setDocuments={setDocuments}
          session={session}
          showToast={showToast}
        />
      </TwoColumn>
      <Modal title="Edit driver" open={editOpen} onClose={() => setEditOpen(false)}>
        <DriverForm
          defaultValues={driver}
          onSubmit={async (event) => {
            event.preventDefault()
            if (!session?.token) {
              showToast({ title: 'Driver not saved', detail: 'Please sign in again before changing drivers.' })
              return
            }

            try {
              const saved = await putJson<DriverApiDto>(`/api/drivers/${driver.id}`, driverPayloadFromForm(new FormData(event.currentTarget), driver), session.token)
              setDrivers((current) => current.map((item) => item.id === driver.id ? driverFromApi(saved) : item))
              setEditOpen(false)
              showToast({ title: 'Driver updated', detail: `${saved.fullName} changes were saved.` })
            } catch (error) {
              showToast({ title: 'Driver not saved', detail: error instanceof Error ? error.message : 'Please review the driver details.' })
            }
          }}
          submitLabel="Save driver changes"
        />
      </Modal>
    </Page>
  )
}

function RentersPage({
  renters,
  setRenters,
  data,
  session,
  showToast,
}: {
  renters: Renter[]
  setRenters: React.Dispatch<React.SetStateAction<Renter[]>>
  data: AppData
  session: AuthSession | null
  showToast: (toast: Toast) => void
}) {
  const [query, setQuery] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const filtered = renters.filter((renter) => [renter.fullName, renter.email, renter.validIdNumber].join(' ').toLowerCase().includes(query.toLowerCase()))

  const addRenter = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!session?.token) {
      showToast({ title: 'Renter not saved', detail: 'Please sign in again before changing renters.' })
      return
    }

    try {
      const saved = await postJson<RenterApiDto>('/api/renters', renterPayloadFromForm(new FormData(event.currentTarget)), session.token)
      setRenters((current) => [...current, renterFromApi(saved)])
      setModalOpen(false)
      showToast({ title: 'Renter saved', detail: `${saved.fullName} was added to the customer list.` })
    } catch (error) {
      showToast({ title: 'Renter not saved', detail: error instanceof Error ? error.message : 'Please review the renter details.' })
    }
  }
  const editingRenter = renters.find((renter) => renter.id === editId)
  const editRenter = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!editingRenter) return
    if (!session?.token) {
      showToast({ title: 'Renter not saved', detail: 'Please sign in again before changing renters.' })
      return
    }

    try {
      const saved = await putJson<RenterApiDto>(`/api/renters/${editingRenter.id}`, renterPayloadFromForm(new FormData(event.currentTarget), editingRenter), session.token)
      setRenters((current) => current.map((renter) => renter.id === editingRenter.id ? renterFromApi(saved) : renter))
      setEditId(null)
      showToast({ title: 'Renter updated', detail: `${saved.fullName} changes were saved.` })
    } catch (error) {
      showToast({ title: 'Renter not saved', detail: error instanceof Error ? error.message : 'Please review the renter details.' })
    }
  }

  return (
    <Page>
      <PageHeader eyebrow="Customers" title="Renters" action={<button className="primary-button" type="button" onClick={() => setModalOpen(true)}><Plus size={18} /> Add renter</button>} />
      <Toolbar query={query} setQuery={setQuery} placeholder="Search customer, email, ID" />
      <Table>
        <thead>
          <tr><th>Name</th><th>Contact</th><th>Valid ID</th><th>Bookings</th><th>Risk</th><th aria-label="Actions" /></tr>
        </thead>
        <tbody>
          {filtered.map((renter) => (
            <tr key={renter.id}>
              <td><Link className="table-link" to={`/renters/${renter.id}`}>{renter.fullName}</Link><small>{renter.email}</small></td>
              <td>{renter.contactNumber}</td>
              <td>{renter.validIdType}<small>{renter.validIdNumber}</small></td>
              <td>{data.bookings.filter((booking) => booking.renterId === renter.id).length}</td>
              <td>{renter.isWatchlisted ? <Badge status="Watchlist" /> : <Badge status="Clear" />}</td>
              <td className="table-actions">
                <button className="icon-button" type="button" title="Edit renter" onClick={() => setEditId(renter.id)}><Edit3 size={16} /></button>
                <IconLink to={`/renters/${renter.id}`} title="View renter" />
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
      <Modal title="Add renter" open={modalOpen} onClose={() => setModalOpen(false)}>
        <RenterForm onSubmit={addRenter} />
      </Modal>
      <Modal title="Edit renter" open={Boolean(editingRenter)} onClose={() => setEditId(null)}>
        <RenterForm defaultValues={editingRenter} onSubmit={editRenter} submitLabel="Save renter changes" />
      </Modal>
    </Page>
  )
}

function RenterDetailsPage({
  data,
  setRenters,
  setDocuments,
  session,
  showToast,
}: {
  data: AppData
  setRenters: React.Dispatch<React.SetStateAction<Renter[]>>
  setDocuments: React.Dispatch<React.SetStateAction<DocumentAttachment[]>>
  session: AuthSession | null
  showToast: (toast: Toast) => void
}) {
  const { id } = useParams()
  const [editOpen, setEditOpen] = useState(false)
  const renter = data.renters.find((item) => item.id === id)
  if (!renter) return <NotFound title="Renter not found" />
  const bookings = data.bookings.filter((booking) => booking.renterId === renter.id)
  const trips = data.trips.filter((trip) => trip.renterId === renter.id)
  const docs = data.documents.filter((doc) => doc.entityType === 'Renter' && doc.entityId === renter.id)
  return (
    <Page>
      <PageHeader
        eyebrow="Customer profile"
        title={renter.fullName}
        action={<HeaderActions><BackLink to="/renters" label="Back to renters" /><button className="secondary-button" type="button" onClick={() => setEditOpen(true)}><Edit3 size={16} /> Edit</button>{renter.isWatchlisted ? <Badge status="Watchlist" /> : <Badge status="Clear" />}</HeaderActions>}
      />
      <DetailGrid items={[
        ['Contact', renter.contactNumber],
        ['Email', renter.email],
        ['Address', renter.address],
        ['Valid ID', `${renter.validIdType} · ${renter.validIdNumber}`],
        ['Driver license', renter.driverLicenseNumber || 'Not provided'],
        ['Emergency contact', renter.emergencyContact],
        ['Notes', renter.notes],
      ]} />
      <TwoColumn>
        <Panel title="Booking history">
          <CompactList>{bookings.map((booking) => <li key={booking.id}><span><strong>{booking.referenceNumber}</strong><small>{vehicleLabel(data, booking.vehicleId)}</small></span><Badge status={booking.bookingStatus} /></li>)}</CompactList>
        </Panel>
        <Panel title="Trip history">
          <CompactList>{trips.map((trip) => <li key={trip.id}><span><strong>{trip.tripNumber}</strong><small>{money.format(trip.grossRevenue)} gross</small></span><Badge status={trip.status} /></li>)}</CompactList>
        </Panel>
      </TwoColumn>
      <EntityDocumentsPanel
        data={data}
        entityType="Renter"
        entityId={renter.id}
        entityLabel={renter.fullName}
        documents={docs}
        setDocuments={setDocuments}
        session={session}
        showToast={showToast}
      />
      <Modal title="Edit renter" open={editOpen} onClose={() => setEditOpen(false)}>
        <RenterForm
          defaultValues={renter}
          onSubmit={async (event) => {
            event.preventDefault()
            if (!session?.token) {
              showToast({ title: 'Renter not saved', detail: 'Please sign in again before changing renters.' })
              return
            }

            try {
              const saved = await putJson<RenterApiDto>(`/api/renters/${renter.id}`, renterPayloadFromForm(new FormData(event.currentTarget), renter), session.token)
              setRenters((current) => current.map((item) => item.id === renter.id ? renterFromApi(saved) : item))
              setEditOpen(false)
              showToast({ title: 'Renter updated', detail: `${saved.fullName} changes were saved.` })
            } catch (error) {
              showToast({ title: 'Renter not saved', detail: error instanceof Error ? error.message : 'Please review the renter details.' })
            }
          }}
          submitLabel="Save renter changes"
        />
      </Modal>
    </Page>
  )
}

function BookingsPage({
  data,
  setBookings,
  setTrips,
  setVehicles,
  session,
  showToast,
}: {
  data: AppData
  setBookings: React.Dispatch<React.SetStateAction<Booking[]>>
  setTrips: React.Dispatch<React.SetStateAction<Trip[]>>
  setVehicles: React.Dispatch<React.SetStateAction<Vehicle[]>>
  session: AuthSession | null
  showToast: (toast: Toast) => void
}) {
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<'All' | BookingStatus>('All')
  const [modalOpen, setModalOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const filtered = data.bookings
    .filter((booking) => status === 'All' || booking.bookingStatus === status)
    .filter((booking) => [booking.referenceNumber, renterName(data, booking.renterId), vehicleLabel(data, booking.vehicleId)].join(' ').toLowerCase().includes(query.toLowerCase()))

  const addBooking = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const formElement = event.currentTarget
    const form = new FormData(formElement)
    const vehicleId = String(form.get('vehicleId'))
    const startDateTime = String(form.get('startDateTime'))
    const endDateTime = String(form.get('endDateTime'))
    const conflict = data.bookings.some((booking) => booking.vehicleId === vehicleId && ['Pending', 'Confirmed', 'Active'].includes(booking.bookingStatus) && booking.startDateTime < endDateTime && booking.endDateTime > startDateTime)
    if (conflict) {
      showToast({ title: 'Booking conflict', detail: 'That vehicle already has an overlapping booking.' })
      return
    }

    if (!session?.token) {
      showToast({ title: 'Booking not saved', detail: 'Please sign in again before changing bookings.' })
      return
    }

    try {
      const saved = await postJson<BookingApiDto>('/api/bookings', bookingPayloadFromForm(form), session.token)
      setBookings((current) => [...current, bookingFromApi(saved)])
      setModalOpen(false)
      showToast({ title: 'Booking saved', detail: `${saved.referenceNumber} was added to the calendar.` })
    } catch (error) {
      showToast({ title: 'Booking not saved', detail: error instanceof Error ? error.message : 'Please review the booking details.' })
    }
  }
  const editingBooking = data.bookings.find((booking) => booking.id === editId)
  const editBooking = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!editingBooking) return
    const form = new FormData(event.currentTarget)
    const vehicleId = String(form.get('vehicleId'))
    const startDateTime = String(form.get('startDateTime'))
    const endDateTime = String(form.get('endDateTime'))
    const conflict = data.bookings.some((booking) => booking.id !== editingBooking.id && booking.vehicleId === vehicleId && ['Pending', 'Confirmed', 'Active'].includes(booking.bookingStatus) && booking.startDateTime < endDateTime && booking.endDateTime > startDateTime)
    if (conflict) {
      showToast({ title: 'Booking conflict', detail: 'That vehicle already has an overlapping booking.' })
      return
    }

    if (!session?.token) {
      showToast({ title: 'Booking not saved', detail: 'Please sign in again before changing bookings.' })
      return
    }

    try {
      const saved = await putJson<BookingApiDto>(`/api/bookings/${editingBooking.id}`, bookingPayloadFromForm(form, editingBooking), session.token)
      setBookings((current) => current.map((booking) => booking.id === editingBooking.id ? bookingFromApi(saved) : booking))
      setEditId(null)
      showToast({ title: 'Booking updated', detail: `${saved.referenceNumber} changes were saved.` })
    } catch (error) {
      showToast({ title: 'Booking not saved', detail: error instanceof Error ? error.message : 'Please review the booking details.' })
    }
  }

  const convertToTrip = async (booking: Booking) => {
    const tripExists = data.trips.some((trip) => trip.bookingReference === booking.referenceNumber)
    if (tripExists) return
    if (!session?.token) {
      showToast({ title: 'Trip not created', detail: 'Please sign in again before converting bookings.' })
      return
    }

    try {
      const saved = await postJson<TripApiDto>(`/api/bookings/${booking.id}/convert-to-trip`, {}, session.token)
      setTrips((current) => [...current, tripFromApi(saved)])
      setBookings((current) => current.map((item) => item.id === booking.id ? { ...item, bookingStatus: 'Active' } : item))
      setVehicles((current) => current.map((vehicle) => vehicle.id === booking.vehicleId ? { ...vehicle, status: 'Booked' } : vehicle))
      showToast({ title: 'Trip created', detail: `${booking.referenceNumber} was converted to a scheduled trip.` })
    } catch (error) {
      showToast({ title: 'Trip not created', detail: error instanceof Error ? error.message : 'Please try again.' })
    }
  }

  return (
    <Page>
      <PageHeader eyebrow="Reservations" title="Bookings" action={<button className="primary-button" type="button" onClick={() => setModalOpen(true)}><Plus size={18} /> New booking</button>} />
      <Toolbar query={query} setQuery={setQuery} placeholder="Search bookings">
        <SelectFilter value={status} onChange={(value) => setStatus(value as 'All' | BookingStatus)} options={['All', 'Pending', 'Confirmed', 'Active', 'Completed', 'Cancelled']} />
      </Toolbar>
      <CalendarStrip bookings={filtered} data={data} />
      <Table>
        <thead>
          <tr><th>Reference</th><th>Customer</th><th>Vehicle</th><th>Schedule</th><th>Amount</th><th>Status</th><th aria-label="Actions" /></tr>
        </thead>
        <tbody>
          {filtered.map((booking) => (
            <tr key={booking.id}>
              <td><Link className="table-link" to={`/bookings/${booking.id}`}>{booking.referenceNumber}</Link><small>{booking.bookingType}</small></td>
              <td>{renterName(data, booking.renterId)}</td>
              <td>{vehicleLabel(data, booking.vehicleId)}<small>{driverName(data, booking.driverId)}</small></td>
              <td>{dateText(booking.startDateTime)}<small>to {dateText(booking.endDateTime)}</small></td>
              <td>{money.format(booking.rateAmount)}<small>{booking.paymentStatus}</small></td>
              <td><Badge status={booking.bookingStatus} /></td>
              <td className="table-actions">
                <button className="icon-button" type="button" title="Convert to trip" onClick={() => convertToTrip(booking)}><RouteIcon size={16} /></button>
                <button className="icon-button" type="button" title="Edit booking" onClick={() => setEditId(booking.id)}><Edit3 size={16} /></button>
                <IconLink to={`/bookings/${booking.id}`} title="View booking" />
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
      <Modal title="New booking" open={modalOpen} onClose={() => setModalOpen(false)}>
        <BookingForm data={data} onSubmit={addBooking} />
      </Modal>
      <Modal title="Edit booking" open={Boolean(editingBooking)} onClose={() => setEditId(null)}>
        <BookingForm data={data} defaultValues={editingBooking} onSubmit={editBooking} submitLabel="Save booking changes" />
      </Modal>
    </Page>
  )
}

function BookingDetailsPage({
  data,
  setBookings,
  setDocuments,
  session,
  showToast,
}: {
  data: AppData
  setBookings: React.Dispatch<React.SetStateAction<Booking[]>>
  setDocuments: React.Dispatch<React.SetStateAction<DocumentAttachment[]>>
  session: AuthSession | null
  showToast: (toast: Toast) => void
}) {
  const { id } = useParams()
  const [editOpen, setEditOpen] = useState(false)
  const booking = data.bookings.find((item) => item.id === id)
  if (!booking) return <NotFound title="Booking not found" />
  const docs = data.documents.filter((doc) => doc.entityType === 'Booking' && doc.entityId === booking.id)
  return (
    <Page>
      <PageHeader
        eyebrow="Booking details"
        title={booking.referenceNumber}
        action={<HeaderActions><BackLink to="/bookings" label="Back to bookings" /><button className="secondary-button" type="button" onClick={() => setEditOpen(true)}><Edit3 size={16} /> Edit</button><Badge status={booking.bookingStatus} /></HeaderActions>}
      />
      <DetailGrid items={[
        ['Renter', renterName(data, booking.renterId)],
        ['Vehicle', vehicleLabel(data, booking.vehicleId)],
        ['Driver', driverName(data, booking.driverId)],
        ['Type', booking.bookingType],
        ['Schedule', `${dateText(booking.startDateTime)} to ${dateText(booking.endDateTime)}`],
        ['Pickup', booking.pickupLocation],
        ['Return', booking.returnLocation],
        ['Rate', `${money.format(booking.rateAmount)} · ${booking.rateType}`],
        ['Deposit', money.format(booking.securityDeposit)],
        ['Payment', booking.paymentStatus],
        ['Notes', booking.notes],
      ]} />
      <EntityDocumentsPanel
        data={data}
        entityType="Booking"
        entityId={booking.id}
        entityLabel={booking.referenceNumber}
        documents={docs}
        setDocuments={setDocuments}
        session={session}
        showToast={showToast}
      />
      <Modal title="Edit booking" open={editOpen} onClose={() => setEditOpen(false)}>
        <BookingForm
          data={data}
          defaultValues={booking}
          onSubmit={async (event) => {
            event.preventDefault()
            if (!session?.token) {
              showToast({ title: 'Booking not saved', detail: 'Please sign in again before changing bookings.' })
              return
            }

            try {
              const saved = await putJson<BookingApiDto>(`/api/bookings/${booking.id}`, bookingPayloadFromForm(new FormData(event.currentTarget), booking), session.token)
              setBookings((current) => current.map((item) => item.id === booking.id ? bookingFromApi(saved) : item))
              setEditOpen(false)
              showToast({ title: 'Booking updated', detail: `${saved.referenceNumber} changes were saved.` })
            } catch (error) {
              showToast({ title: 'Booking not saved', detail: error instanceof Error ? error.message : 'Please review the booking details.' })
            }
          }}
          submitLabel="Save booking changes"
        />
      </Modal>
    </Page>
  )
}

function TripsPage({
  data,
  setTrips,
  setVehicles,
  session,
  showToast,
  appendTripAudit,
}: {
  data: AppData
  setTrips: React.Dispatch<React.SetStateAction<Trip[]>>
  setVehicles: React.Dispatch<React.SetStateAction<Vehicle[]>>
  session: AuthSession | null
  showToast: (toast: Toast) => void
  appendTripAudit: (entityId: string, action: string, summary: string) => void
}) {
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<'All' | TripStatus>('All')
  const [editId, setEditId] = useState<string | null>(null)
  const filtered = data.trips
    .filter((trip) => status === 'All' || trip.status === status)
    .filter((trip) => [trip.tripNumber, trip.bookingReference, renterName(data, trip.renterId), vehicleLabel(data, trip.vehicleId)].join(' ').toLowerCase().includes(query.toLowerCase()))

  const startTrip = async (trip: Trip) => {
    if (!session?.token) {
      showToast({ title: 'Trip not started', detail: 'Please sign in again before changing trips.' })
      return
    }

    const startingOdometer = trip.startingOdometer || data.vehicles.find((vehicle) => vehicle.id === trip.vehicleId)?.currentOdometer || 0
    try {
      const saved = await putJson<TripApiDto>(`/api/trips/${trip.id}/start`, {
        startingOdometer,
        remarks: trip.remarks || null,
      }, session.token)
      setTrips((current) => current.map((item) => item.id === trip.id ? tripFromApi(saved) : item))
      setVehicles((current) => current.map((vehicle) => vehicle.id === trip.vehicleId ? { ...vehicle, status: 'Booked' } : vehicle))
      appendTripAudit(trip.id, 'Trip started', 'Trip status moved to Active and starting odometer was captured.')
      showToast({ title: 'Trip started', detail: `${trip.tripNumber} is now active.` })
    } catch (error) {
      showToast({ title: 'Trip not started', detail: error instanceof Error ? error.message : 'Please try again.' })
    }
  }

  const completeTrip = async (trip: Trip) => {
    if (!session?.token) {
      showToast({ title: 'Trip not completed', detail: 'Please sign in again before changing trips.' })
      return
    }

    const endingOdometer = (trip.startingOdometer || 0) + 180
    try {
      const saved = await putJson<TripApiDto>(`/api/trips/${trip.id}/complete`, {
        endDateTime: new Date().toISOString(),
        endingOdometer,
        fuelExpense: trip.fuelExpense || 1800,
        tollExpense: trip.tollExpense || 450,
        parkingExpense: trip.parkingExpense || 0,
        otherExpenses: trip.otherExpenses || 0,
        driverProceedCommission: trip.driverProceedCommission || 1200,
        remarks: trip.remarks || null,
      }, session.token)
      setTrips((current) => current.map((item) => item.id === trip.id ? tripFromApi(saved) : item))
      setVehicles((current) => current.map((vehicle) => vehicle.id === trip.vehicleId ? { ...vehicle, status: 'Available', currentOdometer: Math.max(vehicle.currentOdometer, endingOdometer) } : vehicle))
      appendTripAudit(trip.id, 'Trip completed', 'Ending odometer, expenses, payment status, and vehicle availability were updated.')
      showToast({ title: 'Trip completed', detail: `${trip.tripNumber} expenses and odometer were updated.` })
    } catch (error) {
      showToast({ title: 'Trip not completed', detail: error instanceof Error ? error.message : 'Please try again.' })
    }
  }
  const editingTrip = data.trips.find((trip) => trip.id === editId)
  const editTrip = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!editingTrip) return
    const form = new FormData(event.currentTarget)
    if (!session?.token) {
      showToast({ title: 'Trip not saved', detail: 'Please sign in again before changing trips.' })
      return
    }

    try {
      const saved = await putJson<TripApiDto>(`/api/trips/${editingTrip.id}`, tripPayloadFromForm(form, editingTrip), session.token)
      setTrips((current) => current.map((trip) => trip.id === editingTrip.id ? tripFromApi(saved) : trip))
      appendTripAudit(editingTrip.id, 'Trip edited', 'Trip schedule, assignments, odometer, expenses, or payment fields were changed.')
      setEditId(null)
      showToast({ title: 'Trip updated', detail: `${saved.tripNumber} changes were saved.` })
    } catch (error) {
      showToast({ title: 'Trip not saved', detail: error instanceof Error ? error.message : 'Please review the trip details.' })
    }
  }

  return (
    <Page>
      <PageHeader eyebrow="Operations" title="Trips" action={<Link className="primary-button" to="/bookings"><Plus size={18} /> From booking</Link>} />
      <Toolbar query={query} setQuery={setQuery} placeholder="Search trips">
        <SelectFilter value={status} onChange={(value) => setStatus(value as 'All' | TripStatus)} options={['All', 'Scheduled', 'Active', 'Completed', 'Cancelled']} />
      </Toolbar>
      <Table>
        <thead>
          <tr><th>Trip</th><th>Vehicle</th><th>Driver</th><th>Customer</th><th>Kilometers</th><th>Profit</th><th>Status</th><th aria-label="Actions" /></tr>
        </thead>
        <tbody>
          {filtered.map((trip) => (
            <tr key={trip.id}>
              <td><Link className="table-link" to={`/trips/${trip.id}`}>{trip.tripNumber}</Link><small>{trip.bookingReference || trip.tripType}</small></td>
              <td>{vehicleLabel(data, trip.vehicleId)}</td>
              <td>{driverName(data, trip.driverId)}</td>
              <td>{renterName(data, trip.renterId)}</td>
              <td>{kilometers(trip).toLocaleString()} km</td>
              <td>{money.format(netProfit(trip))}<small>{money.format(totalExpenses(trip))} expenses</small></td>
              <td><Badge status={trip.status} /></td>
              <td className="table-actions">
                {trip.status === 'Scheduled' && <button className="icon-button" type="button" title="Start trip" onClick={() => startTrip(trip)}><CheckCircle2 size={16} /></button>}
                {trip.status === 'Active' && <button className="icon-button" type="button" title="Complete trip" onClick={() => completeTrip(trip)}><Save size={16} /></button>}
                <button className="icon-button" type="button" title="Edit trip" onClick={() => setEditId(trip.id)}><Edit3 size={16} /></button>
                <IconLink to={`/trips/${trip.id}`} title="View trip" />
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
      <Modal title="Edit trip" open={Boolean(editingTrip)} onClose={() => setEditId(null)}>
        <TripForm data={data} defaultValues={editingTrip} onSubmit={editTrip} submitLabel="Save trip changes" />
      </Modal>
    </Page>
  )
}

function TripDetailsPage({
  data,
  setTrips,
  setDocuments,
  session,
  showToast,
  appendTripAudit,
}: {
  data: AppData
  setTrips: React.Dispatch<React.SetStateAction<Trip[]>>
  setDocuments: React.Dispatch<React.SetStateAction<DocumentAttachment[]>>
  session: AuthSession | null
  showToast: (toast: Toast) => void
  appendTripAudit: (entityId: string, action: string, summary: string) => void
}) {
  const { id } = useParams()
  const [editOpen, setEditOpen] = useState(false)
  const trip = data.trips.find((item) => item.id === id)
  if (!trip) return <NotFound title="Trip not found" />
  const auditHistory = data.audits.filter((entry) => entry.entityType === 'Trip' && entry.entityId === trip.id)
  const docs = data.documents.filter((doc) => doc.entityType === 'Trip' && doc.entityId === trip.id)
  return (
    <Page>
      <PageHeader
        eyebrow="Trip details"
        title={trip.tripNumber}
        action={<HeaderActions><BackLink to="/trips" label="Back to trips" /><button className="secondary-button" type="button" onClick={() => setEditOpen(true)}><Edit3 size={16} /> Edit</button><Badge status={trip.status} /></HeaderActions>}
      />
      <DetailGrid items={[
        ['Booking', trip.bookingReference || 'Direct trip'],
        ['Vehicle', vehicleLabel(data, trip.vehicleId)],
        ['Driver', driverName(data, trip.driverId)],
        ['Customer', renterName(data, trip.renterId)],
        ['Schedule', `${dateText(trip.startDateTime)} to ${dateText(trip.endDateTime)}`],
        ['Odometer', `${trip.startingOdometer || 0} to ${trip.endingOdometer || 0}`],
        ['Total kilometers', `${kilometers(trip).toLocaleString()} km`],
        ['Gross revenue', money.format(trip.grossRevenue)],
        ['Total expenses', money.format(totalExpenses(trip))],
        ['Net profit', money.format(netProfit(trip))],
        ['Payment', `${trip.paymentStatus} · ${trip.paymentMethod || 'N/A'}`],
        ['Remarks', trip.remarks],
      ]} />
      <EntityDocumentsPanel
        data={data}
        entityType="Trip"
        entityId={trip.id}
        entityLabel={trip.tripNumber}
        documents={docs}
        setDocuments={setDocuments}
        session={session}
        showToast={showToast}
      />
      <Panel title="Audit history" action={<History size={18} />}>
        <CompactList>
          {auditHistory.map((entry) => (
            <li key={entry.id}>
              <span>
                <strong>{entry.action}</strong>
                <small>{entry.summary}</small>
              </span>
              <small>{entry.actor} - {dateText(entry.createdAt)}</small>
            </li>
          ))}
        </CompactList>
        {auditHistory.length === 0 && <EmptyState title="No audit history yet" detail="Trip actions will appear here after edits, starts, and completions." />}
      </Panel>
      <Modal title="Edit trip" open={editOpen} onClose={() => setEditOpen(false)}>
        <TripForm
          data={data}
          defaultValues={trip}
          onSubmit={async (event) => {
            event.preventDefault()
            if (!session?.token) {
              showToast({ title: 'Trip not saved', detail: 'Please sign in again before changing trips.' })
              return
            }

            try {
              const saved = await putJson<TripApiDto>(`/api/trips/${trip.id}`, tripPayloadFromForm(new FormData(event.currentTarget), trip), session.token)
              setTrips((current) => current.map((item) => item.id === trip.id ? tripFromApi(saved) : item))
              appendTripAudit(trip.id, 'Trip edited', 'Trip details were updated from the detail page.')
              setEditOpen(false)
              showToast({ title: 'Trip updated', detail: `${saved.tripNumber} changes were saved.` })
            } catch (error) {
              showToast({ title: 'Trip not saved', detail: error instanceof Error ? error.message : 'Please review the trip details.' })
            }
          }}
          submitLabel="Save trip changes"
        />
      </Modal>
    </Page>
  )
}

function MaintenancePage({
  data,
  maintenance,
  setMaintenance,
  setDocuments,
  session,
  showToast,
}: {
  data: AppData
  maintenance: MaintenanceSchedule[]
  setMaintenance: React.Dispatch<React.SetStateAction<MaintenanceSchedule[]>>
  setDocuments: React.Dispatch<React.SetStateAction<DocumentAttachment[]>>
  session: AuthSession | null
  showToast: (toast: Toast) => void
}) {
  const [modalOpen, setModalOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [uploadTarget, setUploadTarget] = useState<MaintenanceSchedule | null>(null)
  const [uploading, setUploading] = useState(false)
  const addSchedule = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!session?.token) {
      showToast({ title: 'PMS not saved', detail: 'Please sign in again before changing maintenance schedules.' })
      return
    }

    try {
      const saved = await postJson<MaintenanceApiDto>('/api/maintenance', maintenancePayloadFromForm(new FormData(event.currentTarget)), session.token)
      setMaintenance((current) => [...current, maintenanceFromApi(saved)])
      setModalOpen(false)
      showToast({ title: 'PMS scheduled', detail: `${saved.title} was added to maintenance.` })
    } catch (error) {
      showToast({ title: 'PMS not saved', detail: error instanceof Error ? error.message : 'Please review the schedule details.' })
    }
  }
  const editingSchedule = maintenance.find((item) => item.id === editId)
  const editSchedule = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!editingSchedule) return
    if (!session?.token) {
      showToast({ title: 'PMS not saved', detail: 'Please sign in again before changing maintenance schedules.' })
      return
    }

    try {
      const saved = await putJson<MaintenanceApiDto>(`/api/maintenance/${editingSchedule.id}`, maintenancePayloadFromForm(new FormData(event.currentTarget), editingSchedule), session.token)
      setMaintenance((current) => current.map((item) => item.id === editingSchedule.id ? maintenanceFromApi(saved) : item))
      setEditId(null)
      showToast({ title: 'PMS updated', detail: `${saved.title} changes were saved.` })
    } catch (error) {
      showToast({ title: 'PMS not saved', detail: error instanceof Error ? error.message : 'Please review the schedule details.' })
    }
  }
  const uploadMaintenanceDocument = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!uploadTarget) return

    setUploading(true)
    try {
      const uploaded = await uploadDocumentFromForm(new FormData(event.currentTarget), session)
      setDocuments((current) => [uploaded, ...current])
      setUploadTarget(null)
      showToast({ title: 'PMS document uploaded', detail: 'The document was saved to this schedule.' })
    } catch (error) {
      showToast({ title: 'Upload failed', detail: error instanceof Error ? error.message : 'Please try again.' })
    } finally {
      setUploading(false)
    }
  }
  return (
    <Page>
      <PageHeader eyebrow="Maintenance" title="PMS schedules" action={<button className="primary-button" type="button" onClick={() => setModalOpen(true)}><Plus size={18} /> Schedule PMS</button>} />
      <section className="card-grid">
        {maintenance.map((item) => (
          <article className="record-card" key={item.id}>
            <div className="record-card-head">
              <Wrench size={20} />
              <span className="card-actions">
                <button className="icon-button" type="button" title="Upload PMS document" onClick={() => setUploadTarget(item)}><Upload size={16} /></button>
                <button className="icon-button" type="button" title="Edit PMS schedule" onClick={() => setEditId(item.id)}><Edit3 size={16} /></button>
                <Badge status={item.status} />
              </span>
            </div>
            <h3>{item.title}</h3>
            <p>{vehicleLabel(data, item.vehicleId)}</p>
            <dl>
              <div><dt>Due date</dt><dd>{dateText(item.dueDate)}</dd></div>
              <div><dt>Due odometer</dt><dd>{item.dueOdometer.toLocaleString()} km</dd></div>
              <div><dt>Vendor</dt><dd>{item.vendorShop}</dd></div>
              <div><dt>Cost</dt><dd>{money.format(item.estimatedCost)}</dd></div>
              <div><dt>Documents</dt><dd>{data.documents.filter((doc) => doc.entityType === 'Maintenance' && doc.entityId === item.id).length}</dd></div>
            </dl>
          </article>
        ))}
      </section>
      <Modal title="Schedule PMS" open={modalOpen} onClose={() => setModalOpen(false)}>
        <MaintenanceForm data={data} onSubmit={addSchedule} />
      </Modal>
      <Modal title="Edit PMS schedule" open={Boolean(editingSchedule)} onClose={() => setEditId(null)}>
        <MaintenanceForm data={data} defaultValues={editingSchedule} onSubmit={editSchedule} submitLabel="Save PMS changes" />
      </Modal>
      <Modal title="Upload PMS document" open={Boolean(uploadTarget)} onClose={() => setUploadTarget(null)}>
        {uploadTarget && (
          <DocumentForm
            data={data}
            lockedEntity={{ entityType: 'Maintenance', entityId: uploadTarget.id, label: uploadTarget.title }}
            onSubmit={uploadMaintenanceDocument}
            submitLabel={uploading ? 'Uploading...' : 'Upload document'}
          />
        )}
      </Modal>
    </Page>
  )
}

function DocumentsPage({
  documents,
  setDocuments,
  data,
  session,
  showToast,
}: {
  documents: DocumentAttachment[]
  setDocuments: React.Dispatch<React.SetStateAction<DocumentAttachment[]>>
  data: AppData
  session: AuthSession | null
  showToast: (toast: Toast) => void
}) {
  const [query, setQuery] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [uploading, setUploading] = useState(false)
  const filtered = documents.filter((doc) => [doc.entityType, doc.documentType, doc.originalFileName].join(' ').toLowerCase().includes(query.toLowerCase()))

  const addDocument = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setUploading(true)
    try {
      const uploaded = await uploadDocumentFromForm(new FormData(event.currentTarget), session)
      setDocuments((current) => [uploaded, ...current])
      setModalOpen(false)
      showToast({ title: 'Document uploaded', detail: 'The document was saved to this record.' })
    } catch (error) {
      showToast({ title: 'Upload failed', detail: error instanceof Error ? error.message : 'Please try again.' })
    } finally {
      setUploading(false)
    }
  }

  return (
    <Page>
      <PageHeader eyebrow="Compliance" title="Documents" action={<button className="primary-button" type="button" onClick={() => setModalOpen(true)}><Upload size={18} /> Upload</button>} />
      <Toolbar query={query} setQuery={setQuery} placeholder="Search documents" />
      <Table>
        <thead>
          <tr><th>Document</th><th>Entity</th><th>Expiration</th><th>Uploaded</th><th>Status</th><th aria-label="Actions" /></tr>
        </thead>
        <tbody>
          {filtered.map((doc) => (
            <tr key={doc.id}>
              <td>{doc.documentType}<small>{doc.originalFileName}</small></td>
              <td>{doc.entityType}<small>{entityLabel(data, doc.entityType, doc.entityId)}</small></td>
              <td>{dateText(doc.expirationDate)}</td>
              <td>{dateText(doc.uploadedAt)}</td>
              <td><Badge status={doc.expirationDate ? (daysUntil(doc.expirationDate) < 0 ? 'Expired' : daysUntil(doc.expirationDate) <= 7 ? 'Due Soon' : 'Clear') : 'Clear'} /></td>
              <td className="table-actions">
                {displayableAssetUrl(doc.displayUrl)
                  ? <a className="icon-button" href={displayableAssetUrl(doc.displayUrl)} target="_blank" rel="noreferrer" title="Open document"><FileText size={16} /></a>
                  : <span className="muted-action">Stored</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
      {filtered.length === 0 && <EmptyState title="No documents found" detail="Upload IDs, contracts, receipts, permits, and expiry-sensitive files." />}
      <Modal title="Upload document" open={modalOpen} onClose={() => setModalOpen(false)}>
        <DocumentForm data={data} onSubmit={addDocument} submitLabel={uploading ? 'Uploading...' : 'Upload document'} />
      </Modal>
    </Page>
  )
}

function PublicPageManagementPage({ session, showToast }: { session: AuthSession | null; showToast: (toast: Toast) => void }) {
  const [model, setModel] = useState<PublicPageManagement | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!session?.token) {
      return
    }

    let active = true
    setLoading(true)
    getJson<PublicPageManagement>('/api/public-page', session.token)
      .then((result) => {
        if (active) {
          setModel(result)
        }
      })
      .catch((error) => {
        if (active) {
          showToast({ title: 'Public page not loaded', detail: error instanceof Error ? error.message : 'Please try again.' })
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false)
        }
      })

    return () => {
      active = false
    }
  }, [session?.token])

  if (!session?.token) {
    return <Navigate to="/login" replace />
  }

  const updateSettings = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!model) return

    const formElement = event.currentTarget
    const form = new FormData(formElement)
    try {
      const settings = await putJson<PublicPageManagement['settings']>('/api/public-page/settings', {
        enabled: form.get('enabled') === 'on',
        headline: formString(form, 'headline') || null,
        description: formString(form, 'description') || null,
        bookingInstructions: formString(form, 'bookingInstructions') || null,
      }, session.token)
      setModel((current) => current ? { ...current, settings } : current)
      showToast({ title: 'Public page saved', detail: settings.enabled ? 'Your tenant page is enabled.' : 'Your tenant page is disabled.' })
    } catch (error) {
      showToast({ title: 'Public page not saved', detail: error instanceof Error ? error.message : 'Please try again.' })
    }
  }

  const updatePhotoVisibility = async (listing: PublicVehicleListing, photo: PhotoItem, isPublic: boolean) => {
    try {
      const updated = await putJson<PhotoItem>(`/api/photos/${photo.id}`, {
        isPublic,
        caption: photo.caption || null,
        displayOrder: photo.displayOrder,
      }, session.token)

      setModel((current) => current ? {
        ...current,
        vehicles: current.vehicles.map((vehicle) => vehicle.vehicleId === listing.vehicleId
          ? {
              ...vehicle,
              photos: vehicle.photos.map((item) => item.id === photo.id ? updated : item),
              publicPhotoCount: vehicle.photos.map((item) => item.id === photo.id ? updated : item).filter((item) => item.isPublic).length,
            }
          : vehicle),
      } : current)
    } catch (error) {
      showToast({ title: 'Photo setting not saved', detail: error instanceof Error ? error.message : 'Please try again.' })
    }
  }

  const saveListing = async (listing: PublicVehicleListing, event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const priceRaw = formString(form, 'priceAmount')
    const featureDefinitionIds = form.getAll('featureDefinitionIds').map(String).filter(Boolean)
    const customFeatures = parseCustomFeatures(formString(form, 'customFeatures'))

    try {
      const updated = await putJson<PublicVehicleListing>(`/api/public-page/vehicles/${listing.vehicleId}`, {
        isPublished: form.get('isPublished') === 'on',
        priceAmount: priceRaw ? Number(priceRaw) : null,
        priceUnit: formString(form, 'priceUnit', 'per day'),
        description: formString(form, 'description') || null,
        rentalNotes: formString(form, 'rentalNotes') || null,
        showPlateNumber: form.get('showPlateNumber') === 'on',
        displayOrder: formNumber(form, 'displayOrder', listing.displayOrder),
        featureDefinitionIds,
        customFeatures,
      }, session.token)

      setModel((current) => current ? {
        ...current,
        vehicles: current.vehicles.map((vehicle) => vehicle.vehicleId === updated.vehicleId ? updated : vehicle),
      } : current)
      showToast({ title: 'Vehicle listing saved', detail: `${updated.vehicleLabel} public listing was updated.` })
    } catch (error) {
      showToast({ title: 'Vehicle listing not saved', detail: error instanceof Error ? error.message : 'Please choose at least one public photo before publishing.' })
    }
  }

  const customFeatureText = (listing: PublicVehicleListing) =>
    listing.features
      .filter((feature) => feature.isCustom)
      .map((feature) => `${feature.icon || '+'} | ${feature.label}`)
      .join('\n')

  return (
    <Page>
      <PageHeader eyebrow="Showcase" title="Public page" />
      {loading && <EmptyState title="Loading public page settings" detail="Fetching tenant showcase options." />}
      {model && (
        <>
          <form className="form-panel public-settings-panel" onSubmit={updateSettings}>
            <h2>Tenant public page</h2>
            <label className="toggle-row">
              <input name="enabled" type="checkbox" defaultChecked={model.settings.enabled} />
              <span>Enable public page</span>
            </label>
            {model.settings.publicUrl && (
              <div className="public-page-link-row">
                <span>Public page</span>
                {model.settings.slug && <code>/{model.settings.slug}</code>}
                <a className="secondary-button compact-button" href={model.settings.publicUrl} target="_blank" rel="noreferrer">Open</a>
              </div>
            )}
            <Field label="Headline" name="headline" defaultValue={model.settings.headline || ''} />
            <label className="field">
              <span>Description</span>
              <textarea name="description" defaultValue={model.settings.description || ''} rows={3} />
            </label>
            <label className="field">
              <span>Booking instructions</span>
              <textarea name="bookingInstructions" defaultValue={model.settings.bookingInstructions || ''} rows={3} />
            </label>
            <div className="form-actions"><button className="primary-button" type="submit"><Save size={18} /> Save public page</button></div>
          </form>

          <section className="public-manager-grid">
            {model.vehicles.map((listing) => {
              const selectedFeatureIds = new Set(listing.features.filter((feature) => !feature.isCustom && feature.featureDefinitionId).map((feature) => feature.featureDefinitionId))
              return (
                <form className="public-listing-card" key={listing.vehicleId} onSubmit={(event) => saveListing(listing, event)}>
                  <header>
                    <div>
                      <h2>{listing.vehicleLabel}</h2>
                      <p>{listing.status} - {listing.publicPhotoCount}/{listing.photoCount} public photos</p>
                    </div>
                    <label className="toggle-row publish-toggle">
                      <input name="isPublished" type="checkbox" defaultChecked={listing.isPublished} disabled={listing.publicPhotoCount === 0} />
                      <span>Published</span>
                    </label>
                  </header>

                  {listing.photoCount === 0 && <p className="warning-line">Add at least one vehicle photo before this can be published.</p>}
                  {listing.photoCount > 0 && listing.publicPhotoCount === 0 && <p className="warning-line">Tick at least one photo below before publishing.</p>}

                  <div className="public-photo-strip">
                    {listing.photos.map((photo) => {
                      return (
                        <label className="public-photo-choice" key={photo.id}>
                          <span>
                            <SafeImage src={photo.displayUrl} alt={photo.caption || photo.originalFileName} fallback={<Camera size={18} />} />
                          </span>
                          <input type="checkbox" checked={photo.isPublic} onChange={(event) => updatePhotoVisibility(listing, photo, event.target.checked)} />
                        </label>
                      )
                    })}
                  </div>

                  <div className="form-grid">
                    <Field label="Price" name="priceAmount" type="number" defaultValue={listing.priceAmount?.toString() || ''} />
                    <Field label="Price unit" name="priceUnit" defaultValue={listing.priceUnit || 'per day'} />
                    <Field label="Display order" name="displayOrder" type="number" defaultValue={String(listing.displayOrder)} />
                    <label className="toggle-row form-toggle">
                      <input name="showPlateNumber" type="checkbox" defaultChecked={listing.showPlateNumber} />
                      <span>Show plate number</span>
                    </label>
                  </div>

                  <label className="field">
                    <span>Short renter-facing description</span>
                    <textarea name="description" rows={3} defaultValue={listing.description || ''} />
                  </label>
                  <label className="field">
                    <span>Rental notes</span>
                    <textarea name="rentalNotes" rows={3} defaultValue={listing.rentalNotes || ''} />
                  </label>

                  <fieldset className="feature-fieldset">
                    <legend>Predefined features</legend>
                    <div className="feature-check-grid">
                      {model.featureDefinitions.map((feature) => (
                        <label key={feature.id}>
                          <input name="featureDefinitionIds" type="checkbox" value={feature.id} defaultChecked={selectedFeatureIds.has(feature.id)} />
                          <span>{feature.icon} {feature.label}</span>
                        </label>
                      ))}
                    </div>
                  </fieldset>

                  <label className="field">
                    <span>Custom features</span>
                    <textarea name="customFeatures" rows={3} defaultValue={customFeatureText(listing)} placeholder="+ | Child seat available" />
                  </label>

                  <div className="form-actions"><button className="primary-button" type="submit"><Save size={18} /> Save listing</button></div>
                </form>
              )
            })}
          </section>
        </>
      )}
    </Page>
  )
}

function TenantPublicPage({ showToast }: { showToast: (toast: Toast) => void }) {
  const { tenantSlug } = useParams()
  const [page, setPage] = useState<PublicTenantPage | null>(null)
  const [loading, setLoading] = useState(true)
  const [dark, setDark] = useState(true)
  const [selectedVehicleId, setSelectedVehicleId] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [preview, setPreview] = useState<{ title: string; photos: GalleryPhoto[]; activeId: string } | null>(null)

  useEffect(() => {
    if (!tenantSlug) return

    let active = true
    setLoading(true)
    getJson<PublicTenantPage>(`/api/public/${encodeURIComponent(tenantSlug)}`)
      .then((result) => {
        if (active) {
          setPage(result)
          setSelectedVehicleId(result.vehicles[0]?.vehicleId || '')
        }
      })
      .catch(() => {
        if (active) {
          setPage(null)
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false)
        }
      })

    return () => {
      active = false
    }
  }, [tenantSlug])

  const selectVehicle = (vehicle: PublicTenantVehicle) => {
    setSelectedVehicleId(vehicle.vehicleId)
    window.setTimeout(() => document.getElementById('public-booking-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 20)
  }

  const submitInquiry = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!tenantSlug) return

    const formElement = event.currentTarget
    const form = new FormData(formElement)
    let startDateTime: Date
    let endDateTime: Date
    try {
      startDateTime = publicDateTimeFromForm(form, 'start')
      endDateTime = publicDateTimeFromForm(form, 'end')
    } catch (error) {
      showToast({ title: 'Inquiry not sent', detail: error instanceof Error ? error.message : 'Choose a valid start and end date/time.' })
      return
    }

    if (endDateTime <= startDateTime) {
      showToast({ title: 'Inquiry not sent', detail: 'End date/time must be after the start date/time.' })
      return
    }

    setSubmitting(true)
    try {
      await postJson(`/api/public/${encodeURIComponent(tenantSlug)}/booking-inquiries`, {
        vehicleId: formString(form, 'vehicleId'),
        renterName: formString(form, 'renterName'),
        contactNumber: formString(form, 'contactNumber'),
        email: formString(form, 'email') || null,
        startDateTime: startDateTime.toISOString(),
        endDateTime: endDateTime.toISOString(),
        message: formString(form, 'message') || null,
      })
      formElement.reset()
      setSelectedVehicleId(page?.vehicles[0]?.vehicleId || '')
      showToast({ title: 'Inquiry sent', detail: 'The fleet owner will review your booking request.' })
    } catch (error) {
      showToast({ title: 'Inquiry not sent', detail: error instanceof Error ? error.message : 'Please review the form.' })
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return <main className={`public-page ${dark ? 'theme-dark' : 'theme-light'}`}><p>Loading...</p></main>
  }

  if (!page) {
    return <main className="public-page theme-dark"><section className="public-empty"><h1>Page unavailable</h1><p>This fleet page is not currently published.</p></section></main>
  }

  return (
    <main className={`public-page ${dark ? 'theme-dark' : 'theme-light'}`}>
      <header className="public-header">
        <Link className="public-brand" to={`/${page.slug}`}>{page.companyName}</Link>
        <button className="public-theme-toggle" type="button" onClick={() => setDark((current) => !current)}>
          {dark ? <Sun size={16} /> : <Moon size={16} />}
          {dark ? 'Light' : 'Dark'}
        </button>
      </header>

      <section className="public-intro">
        <p>{page.headline || 'Available fleet'}</p>
        {page.description && <span>{page.description}</span>}
      </section>

      <section className="public-vehicle-grid">
        {page.vehicles.map((vehicle) => {
          const galleryPhotos = vehicle.photos.map((photo) => ({
            id: photo.id,
            displayUrl: photo.displayUrl,
            caption: photo.caption,
          }))
          const openGallery = (photoId = galleryPhotos[0]?.id) => {
            if (photoId) {
              setPreview({ title: vehicle.vehicleLabel, photos: galleryPhotos, activeId: photoId })
            }
          }

          return (
            <article className="public-vehicle-card" key={vehicle.vehicleId}>
              <div className="public-vehicle-gallery">
                <button className="public-vehicle-photo" type="button" onClick={() => openGallery()} aria-label={`Open ${vehicle.vehicleLabel} photos`}>
                  <SafeImage src={vehicle.photos[0]?.displayUrl} alt={vehicle.vehicleLabel} fallback={<Camera size={24} />} loading="eager" />
                  {vehicle.photos.length > 0 && <span><Images size={14} /> {vehicle.photos.length}</span>}
                </button>
                {vehicle.photos.length > 1 && (
                  <div className="public-photo-thumbs" aria-label={`${vehicle.vehicleLabel} photo thumbnails`}>
                    {vehicle.photos.slice(0, 5).map((photo, index) => (
                      <button key={photo.id} type="button" onClick={() => openGallery(photo.id)} aria-label={`Open photo ${index + 1} of ${vehicle.vehicleLabel}`}>
                        <SafeImage src={photo.displayUrl} alt={photo.caption || `${vehicle.vehicleLabel} photo ${index + 1}`} fallback={<Camera size={14} />} />
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="public-vehicle-body">
                <div className="public-vehicle-title">
                  <h2>{vehicle.vehicleLabel}</h2>
                  {vehicle.priceAmount && <span>{money.format(vehicle.priceAmount)} {vehicle.priceUnit || ''}</span>}
                </div>
                <p>{vehicle.description || [vehicle.vehicleType, vehicle.fuelType, `${vehicle.passengerCapacity} seats`].filter(Boolean).join(' · ')}</p>
                <div className="public-features">
                  {vehicle.features.map((feature) => <span key={`${vehicle.vehicleId}-${feature.label}`}>{feature.icon} {feature.label}</span>)}
                </div>
                {vehicle.rentalNotes && <small>{vehicle.rentalNotes}</small>}
                <button className="public-select-button" type="button" onClick={() => selectVehicle(vehicle)}>Select this vehicle</button>
              </div>
            </article>
          )
        })}
      </section>

      {page.vehicles.length === 0 && <section className="public-empty"><h2>No vehicles are published yet.</h2><p>Please check back soon.</p></section>}

      {page.vehicles.length > 0 && (
        <section className="public-booking-panel" id="public-booking-form">
          <div>
            <h2>Request a booking</h2>
            <p>{page.bookingInstructions || 'Send your preferred schedule and contact details. The fleet team will confirm availability.'}</p>
          </div>
          <form onSubmit={submitInquiry}>
            <label>
              <span>Vehicle</span>
              <select name="vehicleId" value={selectedVehicleId} onChange={(event) => setSelectedVehicleId(event.target.value)} required>
                {page.vehicles.map((vehicle) => <option key={vehicle.vehicleId} value={vehicle.vehicleId}>{vehicle.vehicleLabel}</option>)}
              </select>
            </label>
            <label><span>Name</span><input name="renterName" required /></label>
            <label><span>Contact number</span><input name="contactNumber" required /></label>
            <label><span>Email</span><input name="email" type="email" /></label>
            <label><span>Start date</span><input name="startDate" type="date" required /></label>
            <label><span>Start time</span><input name="startTime" type="time" required /></label>
            <label><span>End date</span><input name="endDate" type="date" required /></label>
            <label><span>End time</span><input name="endTime" type="time" required /></label>
            <label className="public-form-wide"><span>Message</span><textarea name="message" rows={4} /></label>
            <button className="public-submit-button" type="submit" disabled={submitting}>{submitting ? 'Sending...' : 'Send inquiry'}</button>
          </form>
        </section>
      )}
      {preview && (
        <GalleryLightbox
          title={preview.title}
          photos={preview.photos}
          activeId={preview.activeId}
          onActiveIdChange={(activeId) => setPreview((current) => current ? { ...current, activeId } : current)}
          onClose={() => setPreview(null)}
        />
      )}
    </main>
  )
}

function NotificationsPage({
  data,
  notifications,
  setNotifications,
  setPublicInquiries,
  session,
  showToast,
}: {
  data: AppData
  notifications: NotificationItem[]
  setNotifications: React.Dispatch<React.SetStateAction<NotificationItem[]>>
  setPublicInquiries: React.Dispatch<React.SetStateAction<PublicBookingInquiry[]>>
  session: AuthSession | null
  showToast: (toast: Toast) => void
}) {
  const [query, setQuery] = useState('')
  const [selectedInquiry, setSelectedInquiry] = useState<PublicBookingInquiry | null>(null)
  const [loadingInquiryId, setLoadingInquiryId] = useState<string | null>(null)
  const filtered = notifications.filter((item) => [item.title, item.message, item.type].join(' ').toLowerCase().includes(query.toLowerCase()))

  const isInquiryNotification = (item: NotificationItem) =>
    item.relatedEntityType === 'PublicBookingInquiry' && Boolean(item.relatedEntityId)

  const markRead = async (item: NotificationItem) => {
    if (!session?.token) {
      showToast({ title: 'Notification not saved', detail: 'Please sign in again before changing notifications.' })
      return
    }

    try {
      await putJson(`/api/notifications/${item.id}/read`, {}, session.token)
      setNotifications((current) => current.map((notification) => notification.id === item.id ? { ...notification, isRead: true } : notification))
    } catch (error) {
      showToast({ title: 'Notification not saved', detail: error instanceof Error ? error.message : 'Please try again.' })
    }
  }

  const openInquiryNotification = async (item: NotificationItem) => {
    if (!isInquiryNotification(item) || !item.relatedEntityId) {
      return
    }

    if (!item.isRead) {
      void markRead(item)
    }

    const cached = data.publicInquiries.find((inquiry) => inquiry.id === item.relatedEntityId)
    if (cached) {
      setSelectedInquiry(cached)
      return
    }

    if (!session?.token) {
      showToast({ title: 'Inquiry not loaded', detail: 'Please sign in again to view inquiry details.' })
      return
    }

    setLoadingInquiryId(item.relatedEntityId)
    try {
      const inquiry = await getJson<PublicBookingInquiry>(`/api/public-page/booking-inquiries/${item.relatedEntityId}`, session.token)
      setPublicInquiries((current) => current.some((existing) => existing.id === inquiry.id) ? current : [inquiry, ...current])
      setSelectedInquiry(inquiry)
    } catch (error) {
      showToast({ title: 'Inquiry not loaded', detail: error instanceof Error ? error.message : 'Please try again.' })
    } finally {
      setLoadingInquiryId(null)
    }
  }

  const markAllRead = async () => {
    if (!session?.token) {
      showToast({ title: 'Notifications not saved', detail: 'Please sign in again before changing notifications.' })
      return
    }

    const unread = notifications.filter((item) => !item.isRead)
    try {
      await Promise.all(unread.map((item) => putJson(`/api/notifications/${item.id}/read`, {}, session.token)))
      setNotifications((current) => current.map((item) => ({ ...item, isRead: true })))
      showToast({ title: 'Notifications cleared', detail: 'All notifications were marked read.' })
    } catch (error) {
      showToast({ title: 'Notifications not saved', detail: error instanceof Error ? error.message : 'Please try again.' })
    }
  }

  return (
    <Page>
      <PageHeader eyebrow="Alerts" title="Notifications" action={<button className="primary-button" type="button" onClick={markAllRead}><CheckCircle2 size={18} /> Mark all read</button>} />
      <Toolbar query={query} setQuery={setQuery} placeholder="Search notifications" />
      <Table>
        <thead>
          <tr><th>Notification</th><th>Type</th><th>Created</th><th>Status</th><th aria-label="Actions" /></tr>
        </thead>
        <tbody>
          {filtered.map((item) => (
            <tr
              className={isInquiryNotification(item) ? 'clickable-row' : undefined}
              key={item.id}
              onClick={isInquiryNotification(item) ? () => void openInquiryNotification(item) : undefined}
            >
              <td>{item.title}<small>{item.message}</small></td>
              <td>{item.type}</td>
              <td>{dateText(item.createdAt)}</td>
              <td>{item.isRead ? <Badge status="Clear" /> : <span className="unread-pill">New</span>}</td>
              <td className="table-actions">
                {isInquiryNotification(item) ? (
                  <button
                    className="icon-button"
                    type="button"
                    title="Open inquiry"
                    disabled={loadingInquiryId === item.relatedEntityId}
                    onClick={(event) => {
                      event.stopPropagation()
                      void openInquiryNotification(item)
                    }}
                  >
                    <MailCheck size={16} />
                  </button>
                ) : !item.isRead && (
                  <button
                    className="icon-button"
                    type="button"
                    title="Mark read"
                    onClick={(event) => {
                      event.stopPropagation()
                      void markRead(item)
                    }}
                  >
                    <CheckCircle2 size={16} />
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
      <Modal title="Booking inquiry details" open={Boolean(selectedInquiry)} onClose={() => setSelectedInquiry(null)}>
        {selectedInquiry && (
          <div className="inquiry-details">
            <DetailGrid
              items={[
                ['Vehicle', inquiryVehicleLabel(data, selectedInquiry)],
                ['Customer', selectedInquiry.renterName],
                ['Contact number', selectedInquiry.contactNumber],
                ['Email', selectedInquiry.email || 'N/A'],
                ['Start', dateTimeText(selectedInquiry.startDateTime)],
                ['End', dateTimeText(selectedInquiry.endDateTime)],
                ['Status', selectedInquiry.status],
                ['Submitted', dateTimeText(selectedInquiry.createdAt)],
                ['Message', selectedInquiry.message || 'No message provided'],
              ]}
            />
            {selectedInquiry.vehicleId && (
              <div className="inquiry-detail-actions">
                <Link className="secondary-button" to={`/vehicles/${selectedInquiry.vehicleId}`}>Open vehicle</Link>
              </div>
            )}
          </div>
        )}
      </Modal>
    </Page>
  )
}

function ReportsPage({ data }: { data: AppData }) {
  const gross = sum(data.trips.map((trip) => trip.grossRevenue))
  const net = sum(data.trips.map((trip) => netProfit(trip)))
  const maxVehicleRevenue = Math.max(...data.vehicles.map((vehicle) => vehicleRevenue(data, vehicle.id)), 1)
  const inquiryCounts = inquiryCountsByVehicle(data)
  const maxInquiryCount = Math.max(...inquiryCounts.map((item) => item.count), 1)
  return (
    <Page>
      <PageHeader eyebrow="Financials" title="Reports" />
      <section className="metric-grid reports">
        <MetricCard icon={CircleDollarSign} label="Gross revenue" value={money.format(gross)} tone="green" />
        <MetricCard icon={WalletCards} label="Net profit" value={money.format(net)} tone="blue" />
        <MetricCard icon={Fuel} label="Fuel expenses" value={money.format(sum(data.trips.map((trip) => trip.fuelExpense)))} tone="red" />
        <MetricCard icon={Wrench} label="Maintenance estimate" value={money.format(sum(data.maintenance.map((item) => item.estimatedCost)))} tone="gold" />
        <MetricCard icon={MailCheck} label="Booking inquiries" value={data.publicInquiries.length.toString()} tone="gold" />
      </section>
      <TwoColumn>
        <Panel title="Revenue per vehicle">
          <div className="bar-list">
            {data.vehicles.map((vehicle) => {
              const revenue = vehicleRevenue(data, vehicle.id)
              return (
                <div className="bar-row" key={vehicle.id}>
                  <span>{vehicle.plateNumber}</span>
                  <div><i style={{ width: `${(revenue / maxVehicleRevenue) * 100}%` }} /></div>
                  <strong>{money.format(revenue)}</strong>
                </div>
              )
            })}
          </div>
        </Panel>
        <Panel title="Expenses by category">
          <div className="expense-grid">
            <Expense label="Fuel" value={sum(data.trips.map((trip) => trip.fuelExpense))} />
            <Expense label="Toll" value={sum(data.trips.map((trip) => trip.tollExpense))} />
            <Expense label="Parking" value={sum(data.trips.map((trip) => trip.parkingExpense))} />
            <Expense label="Driver proceeds" value={sum(data.trips.map((trip) => trip.driverProceedCommission))} />
          </div>
        </Panel>
        <Panel title="Inquiries by vehicle">
          {inquiryCounts.length > 0 ? (
            <div className="bar-list">
              {inquiryCounts.map((item) => (
                <div className="bar-row" key={item.key}>
                  <span>{item.label}</span>
                  <div><i style={{ width: `${(item.count / maxInquiryCount) * 100}%` }} /></div>
                  <strong>{item.count}</strong>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="No inquiry data" detail="Public booking inquiries will be counted after visitors submit the form." />
          )}
        </Panel>
      </TwoColumn>
    </Page>
  )
}

function SupportPage({ session, userProfile, showToast }: { session: AuthSession | null; userProfile: UserProfile; showToast: (toast: Toast) => void }) {
  const [tickets, setTickets] = useState<SupportTicket[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!session?.token || session.role === 'SuperAdmin') {
      return
    }

    let active = true
    setLoading(true)
    getJson<SupportTicket[]>('/api/support/tickets', session.token)
      .then((items) => {
        if (active) {
          setTickets(items)
        }
      })
      .catch(() => {
        if (active) {
          setTickets([])
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false)
        }
      })

    return () => {
      active = false
    }
  }, [session?.token, session?.role])

  if (!session || session.role === 'SuperAdmin') {
    return <Navigate to="/dashboard" replace />
  }

  const submitTicket = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitting(true)
    const formElement = event.currentTarget
    const form = new FormData(formElement)
    try {
      const saved = await postJson<SupportTicket>('/api/support/tickets', {
        subject: formString(form, 'subject').trim(),
        message: formString(form, 'message').trim(),
      }, session.token)
      setTickets((current) => [saved, ...current])
      formElement.reset()
      showToast({ title: 'Support ticket sent', detail: 'BeezFleet support and your email both received the ticket details.' })
    } catch (error) {
      showToast({ title: 'Support ticket not sent', detail: error instanceof Error ? error.message : 'Please try again.' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Page>
      <PageHeader eyebrow="Tenant help" title="Support & legal" />
      <section className="support-layout">
        <Panel title="Contact support">
          <form className="modal-form" onSubmit={submitTicket}>
            <p className="muted-line">Signed in as {userProfile.fullName || session.fullName} - {userProfile.email || session.email}</p>
            <Field label="Subject" name="subject" defaultValue="Help with my BeezFleet workspace" required />
            <label className="field full"><span>Message</span><textarea name="message" placeholder="Tell us what happened, which page you were on, and what you expected." required /></label>
            <button className="primary-button full" type="submit" disabled={submitting}><MailCheck size={18} /> {submitting ? 'Sending...' : 'Send support ticket'}</button>
          </form>
        </Panel>
        <Panel title="Legal links">
          <div className="legal-link-grid">
            <Link to="/privacy"><strong>Privacy Policy</strong><small>How BeezFleet handles tenant, user, fleet, rental, and support data.</small></Link>
            <Link to="/terms"><strong>Terms of Service</strong><small>Rules for using BeezFleet as a fleet-management SaaS workspace.</small></Link>
            <Link to="/support"><strong>Contact support</strong><small>Create a ticket that is emailed to the platform superadmin and copied to you.</small></Link>
          </div>
        </Panel>
      </section>
      <Panel title="Recent support tickets">
        <CompactList>
          {tickets.map((ticket) => (
            <li key={ticket.id}>
              <span>
                <strong>{ticket.subject}</strong>
                <small>{dateTimeText(ticket.createdAt)} - {ticket.requesterEmail}</small>
                <small>{ticket.message}</small>
              </span>
              <Badge status={ticket.status} />
            </li>
          ))}
        </CompactList>
        {loading && <EmptyState title="Loading tickets" detail="Checking support history for this tenant." />}
        {!loading && tickets.length === 0 && <EmptyState title="No tickets yet" detail="New support requests will appear here after submission." />}
      </Panel>
    </Page>
  )
}

function PrivacyPolicyPage() {
  return (
    <LegalPage title="Privacy Policy" eyebrow="BeezFleet">
      <p>BeezFleet is a fleet management platform for vehicle rental and fleet service operations. This policy explains how BeezFleet handles information that tenant owners, managers, drivers, and customers place in the workspace.</p>
      <h2>Information We Process</h2>
      <p>Tenant workspaces may include company profile details, user accounts, vehicle records, driver and renter information, booking and trip records, maintenance schedules, uploaded documents, photos, public page listings, public booking inquiries, notifications, and support tickets.</p>
      <h2>How We Use Information</h2>
      <p>We use workspace data to operate the service, authenticate users, provide tenant-specific fleet tools, generate notifications, process public booking inquiries, respond to support requests, protect the platform, and improve BeezFleet reliability.</p>
      <h2>Tenant Responsibility</h2>
      <p>Tenants are responsible for making sure they have permission to upload renter, driver, employee, vehicle, document, and photo data into BeezFleet. Tenants should avoid uploading unnecessary sensitive information.</p>
      <h2>Email and Support</h2>
      <p>BeezFleet may send transactional emails such as account verification, password reset, support ticket confirmation, and operational notices. Demo or seeded data should not trigger real reminder emails.</p>
      <h2>Security and Access</h2>
      <p>BeezFleet uses tenant-scoped access controls so each tenant workspace is separated from other tenants. Super administrators may access tenant details and support tickets when needed for platform operations, troubleshooting, billing, or security.</p>
      <h2>Contact</h2>
      <p>For privacy questions, tenant users can submit a support ticket from the Support page after signing in.</p>
      <div className="legal-actions"><Link className="secondary-button" to="/terms">Terms of Service</Link><Link className="secondary-button" to="/login">Back to login</Link></div>
    </LegalPage>
  )
}

function TermsOfServicePage() {
  return (
    <LegalPage title="Terms of Service" eyebrow="BeezFleet">
      <p>These terms govern access to and use of BeezFleet, a SaaS platform for managing fleet, rental, maintenance, document, public listing, and inquiry workflows.</p>
      <h2>Tenant Accounts</h2>
      <p>Each tenant is responsible for account users, workspace configuration, uploaded records, public page listings, and the accuracy of operational data entered into BeezFleet.</p>
      <h2>Acceptable Use</h2>
      <p>Users may not use BeezFleet to upload unlawful content, violate privacy rights, impersonate others, interfere with platform security, or send abusive support requests. Public pages should only display vehicles and information the tenant is authorized to publish.</p>
      <h2>Operational Data</h2>
      <p>BeezFleet helps organize records, reminders, and insights, but tenants remain responsible for business decisions, regulatory compliance, vehicle safety, insurance, permits, contracts, and renter or driver verification.</p>
      <h2>Availability and Maintenance</h2>
      <p>We may perform system maintenance to improve reliability and security. Active maintenance announcements may be shown on the login page with the expected date and time window.</p>
      <h2>Support</h2>
      <p>Tenant users can submit support tickets through the Support page. A copy of the ticket details is emailed to the tenant requester for reference.</p>
      <h2>Changes</h2>
      <p>BeezFleet may update these terms as the service evolves. Continued use after updates means the tenant accepts the current terms.</p>
      <div className="legal-actions"><Link className="secondary-button" to="/privacy">Privacy Policy</Link><Link className="secondary-button" to="/login">Back to login</Link></div>
    </LegalPage>
  )
}

function LegalPage({ eyebrow, title, children }: { eyebrow: string; title: string; children: React.ReactNode }) {
  return (
    <main className="legal-shell">
      <section className="legal-panel">
        <Link className="brand legal-brand" to="/login"><span className="brand-mark">BF</span><span><strong>BeezFleet</strong><small>{eyebrow}</small></span></Link>
        <h1>{title}</h1>
        <div className="legal-copy">{children}</div>
      </section>
    </main>
  )
}

function SettingsPage({
  company,
  setCompany,
  session,
  setSession,
  userProfile,
  clientGravatarUrl,
  setUserProfile,
  showToast,
}: {
  company: CompanyProfile
  setCompany: React.Dispatch<React.SetStateAction<CompanyProfile>>
  session: AuthSession | null
  setSession: React.Dispatch<React.SetStateAction<AuthSession | null>>
  userProfile: UserProfile
  clientGravatarUrl: string
  setUserProfile: React.Dispatch<React.SetStateAction<UserProfile>>
  showToast: (toast: Toast) => void
}) {
  const [saving, setSaving] = useState(false)
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState('')

  useEffect(() => {
    return () => {
      if (photoPreviewUrl) {
        URL.revokeObjectURL(photoPreviewUrl)
      }
    }
  }, [photoPreviewUrl])

  const handleProfilePhotoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0]
    if (file) {
      try {
        validateBrowserImage(file)
      } catch (error) {
        event.currentTarget.value = ''
        showToast({ title: 'Photo not selected', detail: error instanceof Error ? error.message : 'Choose a different image.' })
        setPhotoPreviewUrl((current) => {
          if (current) {
            URL.revokeObjectURL(current)
          }

          return ''
        })
        return
      }
    }

    setPhotoPreviewUrl((current) => {
      if (current) {
        URL.revokeObjectURL(current)
      }

      return file ? URL.createObjectURL(file) : ''
    })
  }

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!session?.token) {
      showToast({ title: 'Settings not saved', detail: 'Please sign in again before updating your profile.' })
      return
    }

    setSaving(true)
    const form = new FormData(event.currentTarget)
    const nextCompany = {
      name: String(form.get('name')),
      address: String(form.get('address')),
      contactNumber: String(form.get('contactNumber')),
      birDtiLguDocumentUrl: String(form.get('birDtiLguDocumentUrl') || ''),
      logoUrl: String(form.get('logoUrl') || ''),
    }

    try {
      let uploadedPhotoUrl = userProfile.profilePhotoUrl || ''
      const profilePhotoFile = form.get('profilePhotoFile')
      if (profilePhotoFile instanceof File && profilePhotoFile.size > 0) {
        validateBrowserImage(profilePhotoFile)
        const uploadForm = new FormData()
        uploadForm.append('file', profilePhotoFile)
        const uploadedProfile = await postForm<UserProfile>('/api/settings/profile-photo', uploadForm, session.token)
        uploadedPhotoUrl = uploadedProfile.profilePhotoUrl || uploadedPhotoUrl
      }

      const savedProfile = await putJson<UserProfile>('/api/settings/me', {
        fullName: String(form.get('fullName')),
        profilePhotoUrl: uploadedPhotoUrl || null,
        address: String(form.get('userAddress') || ''),
        mobileNumber: String(form.get('mobileNumber') || ''),
        jobTitle: String(form.get('jobTitle') || ''),
        emergencyContact: String(form.get('emergencyContact') || ''),
        timeZone: String(form.get('timezone') || 'Asia/Manila'),
        dateFormat: String(form.get('dateFormat') || 'MMM d, yyyy'),
        notificationEmail: String(form.get('notificationEmail') || userProfile.email || session.email),
      }, session.token)

      await postJson('/api/auth/onboarding', {
        companyName: nextCompany.name,
        businessAddress: nextCompany.address || null,
        contactNumber: nextCompany.contactNumber || null,
        birDtiLguDocumentUrl: nextCompany.birDtiLguDocumentUrl || null,
        logoUrl: nextCompany.logoUrl || null,
      }, session.token)

      const normalizedProfile = normalizeUserProfile(savedProfile, session)
      setCompany(nextCompany)
      setUserProfile(normalizedProfile)
      setPhotoPreviewUrl((current) => {
        if (current) {
          URL.revokeObjectURL(current)
        }

        return ''
      })
      const nextSession = {
        ...session,
        fullName: normalizedProfile.fullName,
        tenantName: nextCompany.name,
      }
      setSession(nextSession)
      window.localStorage.setItem(authStorageKey, JSON.stringify(nextSession))
      showToast({ title: 'Settings saved', detail: 'User and company details were updated.' })
    } catch (error) {
      showToast({ title: 'Settings not saved', detail: error instanceof Error ? error.message : 'Please try again.' })
    } finally {
      setSaving(false)
    }
  }
  const changePassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!session?.token) {
      showToast({ title: 'Password not changed', detail: 'Please sign in again before changing your password.' })
      return
    }

    const passwordFormElement = event.currentTarget
    const form = new FormData(passwordFormElement)
    const currentPassword = String(form.get('currentPassword'))
    const newPassword = String(form.get('newPassword'))
    const confirmPassword = String(form.get('confirmPassword'))
    if (newPassword !== confirmPassword) {
      showToast({ title: 'Password not changed', detail: 'New password and confirmation do not match.' })
      return
    }

    try {
      await postJson('/api/auth/change-password', { currentPassword, newPassword }, session.token)
      passwordFormElement.reset()
      showToast({ title: 'Password changed', detail: 'Use the new password the next time you sign in.' })
    } catch (error) {
      showToast({ title: 'Password not changed', detail: error instanceof Error ? error.message : 'Please check the current password.' })
    }
  }
  return (
    <Page>
      <PageHeader eyebrow="Workspace" title="Settings" />
      <form className="settings-grid" onSubmit={save} key={`${userProfile.email}-${userProfile.profilePhotoUrl}-${company.name}`}>
        <Panel title="Super user profile">
          <div className="settings-avatar-row">
            <span className="avatar-preview">
              <AvatarImage sources={[photoPreviewUrl, ...avatarSources(userProfile, clientGravatarUrl)]} fallback={initials(userProfile.fullName || session?.fullName)} />
            </span>
            <label className="field">
              <span><Camera size={14} /> Profile photo</span>
              <input name="profilePhotoFile" type="file" accept="image/jpeg,image/png,image/webp" onChange={handleProfilePhotoChange} />
            </label>
          </div>
          <div className="form-grid">
            <Field label="Full name" name="fullName" defaultValue={userProfile.fullName || session?.fullName || ''} required />
            <Field label="Email" name="email" type="email" defaultValue={userProfile.email || session?.email || ''} readOnly />
            <Field label="Mobile number" name="mobileNumber" defaultValue={userProfile.mobileNumber} />
            <Field label="Address" name="userAddress" defaultValue={userProfile.address} />
            <Field label="Job title" name="jobTitle" defaultValue={userProfile.jobTitle} />
            <Field label="Emergency contact" name="emergencyContact" defaultValue={userProfile.emergencyContact} />
            <Field label="Notification email" name="notificationEmail" type="email" defaultValue={userProfile.notificationEmail} />
            <label className="field"><span>Timezone</span><select name="timezone" defaultValue={userProfile.timezone}><option>Asia/Manila</option><option>UTC</option><option>Asia/Singapore</option></select></label>
            <label className="field"><span>Date format</span><select name="dateFormat" defaultValue={userProfile.dateFormat}><option>MMM d, yyyy</option><option>yyyy-MM-dd</option><option>MM/dd/yyyy</option></select></label>
          </div>
        </Panel>
        <Panel title="Tenant company profile">
          <div className="form-grid">
            <Field label="Company name" name="name" defaultValue={company.name} required />
            <Field label="Business address" name="address" defaultValue={company.address} />
            <Field label="Contact number" name="contactNumber" defaultValue={company.contactNumber} />
            <Field label="Logo URL" name="logoUrl" defaultValue={company.logoUrl} />
            <Field label="BIR / DTI / LGU document URL" name="birDtiLguDocumentUrl" defaultValue={company.birDtiLguDocumentUrl} />
          </div>
        </Panel>
        <div className="form-actions settings-actions"><button className="primary-button" type="submit" disabled={saving}><Save size={18} /> {saving ? 'Saving...' : 'Save settings'}</button></div>
      </form>
      <form className="form-panel" onSubmit={changePassword}>
        <h2>Change password</h2>
        <Field label="Current password" name="currentPassword" type="password" required />
        <Field label="New password" name="newPassword" type="password" required />
        <Field label="Confirm new password" name="confirmPassword" type="password" required />
        <div className="form-actions"><button className="primary-button" type="submit"><KeyRound size={18} /> Change password</button></div>
      </form>
    </Page>
  )
}

function LoginPage({ onAuthenticated, showToast }: { onAuthenticated: (auth: AuthResponse) => void; showToast: (toast: Toast) => void }) {
  const navigate = useNavigate()
  const [submitting, setSubmitting] = useState(false)
  const [announcements, setAnnouncements] = useState<SystemAnnouncement[]>([])
  useEffect(() => {
    let active = true
    getJson<SystemAnnouncement[]>('/api/announcements/active')
      .then((items) => {
        if (active) {
          setAnnouncements(items)
        }
      })
      .catch(() => {
        if (active) {
          setAnnouncements([])
        }
      })

    return () => {
      active = false
    }
  }, [])
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitting(true)
    const form = new FormData(event.currentTarget)
    try {
      const auth = await postJson<AuthResponse>('/api/auth/login', {
        email: String(form.get('email')),
        password: String(form.get('password')),
      })

      if (auth.requiresEmailVerification) {
        showToast({ title: 'Verify your email', detail: 'Open the BeezFleet verification email before logging in.' })
        navigate(`/verify-email?email=${encodeURIComponent(auth.email)}`)
        return
      }

      if (!auth.token) {
        showToast({ title: 'Onboarding pending', detail: 'Verify your email first so your tenant workspace can be created.' })
        navigate(`/verify-email?email=${encodeURIComponent(auth.email)}`)
        return
      }

      onAuthenticated(auth)
      showToast({ title: 'Welcome back', detail: 'You are signed in to BeezFleet.' })
      navigate(landingPathAfterAuth(auth))
    } catch (error) {
      showToast({ title: 'Login failed', detail: error instanceof Error ? error.message : 'Please check your credentials.' })
    } finally {
      setSubmitting(false)
    }
  }
  return (
    <AuthShell title="Login" subtitle="BeezFleet">
      {announcements.map((announcement) => (
        <div className="announcement-banner" key={announcement.id}>
          <Megaphone size={18} />
          <span>
            <strong>{announcement.title}</strong>
            <small>{announcement.message} {dateTimeText(announcement.startsAt)} - {dateTimeText(announcement.endsAt)}</small>
          </span>
        </div>
      ))}
      <form className="auth-form" onSubmit={submit}>
        <Field label="Email" name="email" type="email" required />
        <Field label="Password" name="password" type="password" required />
        <button className="primary-button full" type="submit" disabled={submitting}><ShieldCheck size={18} /> {submitting ? 'Logging in...' : 'Login'}</button>
        <Link to="/forgot-password">Forgot password?</Link>
        <Link to="/register">Create an account</Link>
        <div className="auth-links"><Link to="/privacy">Privacy</Link><Link to="/terms">Terms</Link></div>
      </form>
    </AuthShell>
  )
}

function ForgotPasswordPage({ showToast }: { showToast: (toast: Toast) => void }) {
  const navigate = useNavigate()
  const [submitting, setSubmitting] = useState(false)
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitting(true)
    const form = new FormData(event.currentTarget)
    try {
      await postJson('/api/auth/forgot-password', {
        email: String(form.get('email')),
      })
      showToast({ title: 'Reset email sent', detail: 'Check your inbox and spam folder for the password reset link.' })
      navigate('/login')
    } catch (error) {
      showToast({ title: 'Reset email failed', detail: error instanceof Error ? error.message : 'Please try again.' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthShell title="Forgot password" subtitle="BeezFleet">
      <form className="auth-form" onSubmit={submit}>
        <Field label="Email" name="email" type="email" required />
        <button className="primary-button full" type="submit" disabled={submitting}><MailCheck size={18} /> {submitting ? 'Sending...' : 'Send reset link'}</button>
        <Link to="/login">Back to login</Link>
      </form>
    </AuthShell>
  )
}

function ResetPasswordPage({ showToast }: { showToast: (toast: Toast) => void }) {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [submitting, setSubmitting] = useState(false)
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitting(true)
    const form = new FormData(event.currentTarget)
    const newPassword = String(form.get('newPassword'))
    const confirmPassword = String(form.get('confirmPassword'))
    if (newPassword !== confirmPassword) {
      showToast({ title: 'Password not reset', detail: 'New password and confirmation do not match.' })
      setSubmitting(false)
      return
    }

    try {
      await postJson('/api/auth/reset-password', {
        email: String(form.get('email')),
        token: String(form.get('token')),
        newPassword,
      })
      showToast({ title: 'Password reset', detail: 'You can now sign in with your new password.' })
      navigate('/login')
    } catch (error) {
      showToast({ title: 'Password not reset', detail: error instanceof Error ? error.message : 'Please request a new reset link.' })
    } finally {
      setSubmitting(false)
    }
  }
  const email = searchParams.get('email') ?? ''
  const token = searchParams.get('token') ?? ''

  return (
    <AuthShell title="Reset password" subtitle="BeezFleet">
      <form className="auth-form" onSubmit={submit}>
        <Field label="Email" name="email" type="email" defaultValue={email} required />
        <Field label="Reset token" name="token" defaultValue={token} required />
        <Field label="New password" name="newPassword" type="password" required />
        <Field label="Confirm new password" name="confirmPassword" type="password" required />
        <button className="primary-button full" type="submit" disabled={submitting}><KeyRound size={18} /> {submitting ? 'Resetting...' : 'Reset password'}</button>
        <Link to="/login">Back to login</Link>
      </form>
    </AuthShell>
  )
}

function RegisterPage({ showToast }: { showToast: (toast: Toast) => void }) {
  const navigate = useNavigate()
  const [submitting, setSubmitting] = useState(false)
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitting(true)
    const form = new FormData(event.currentTarget)
    const email = String(form.get('email'))
    try {
      await postJson('/api/auth/register', {
        fullName: String(form.get('fullName')),
        email,
        password: String(form.get('password')),
      })
      showToast({ title: 'Verification email sent', detail: 'Check your inbox and spam folder before tenant onboarding.' })
      navigate(`/verify-email?email=${encodeURIComponent(email)}`)
    } catch (error) {
      showToast({ title: 'Account not created', detail: error instanceof Error ? error.message : 'Please try again.' })
    } finally {
      setSubmitting(false)
    }
  }
  return (
    <AuthShell title="Create account" subtitle="BeezFleet">
      <form className="auth-form" onSubmit={submit}>
        <Field label="Full name" name="fullName" required />
        <Field label="Email" name="email" type="email" required />
        <Field label="Password" name="password" type="password" required />
        <button className="primary-button full" type="submit" disabled={submitting}><MailCheck size={18} /> {submitting ? 'Creating account...' : 'Create account'}</button>
        <Link to="/login">Back to login</Link>
      </form>
    </AuthShell>
  )
}

function VerifyEmailPage({ onAuthenticated, showToast }: { onAuthenticated: (auth: AuthResponse) => void; showToast: (toast: Toast) => void }) {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [email, setEmail] = useState(searchParams.get('email') ?? '')
  const [submitting, setSubmitting] = useState(false)
  const [resending, setResending] = useState(false)
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitting(true)
    const form = new FormData(event.currentTarget)
    try {
      const auth = await postJson<AuthResponse>('/api/auth/verify-email', {
        email: String(form.get('email')),
        token: String(form.get('token')),
        companyName: String(form.get('companyName')),
      })
      onAuthenticated(auth)
      showToast({ title: 'Email verified', detail: 'Your tenant workspace has been created.' })
      navigate(landingPathAfterAuth(auth))
    } catch (error) {
      showToast({ title: 'Verification failed', detail: error instanceof Error ? error.message : 'Please check the email link.' })
    } finally {
      setSubmitting(false)
    }
  }

  const resend = async () => {
    if (!email.trim()) {
      showToast({ title: 'Email required', detail: 'Enter the email address that needs verification.' })
      return
    }

    setResending(true)
    try {
      await postJson('/api/auth/resend-verification', { email })
      showToast({ title: 'Verification email sent', detail: 'Check the inbox and spam folder for the newest BeezFleet email.' })
    } catch (error) {
      showToast({ title: 'Verification email not sent', detail: error instanceof Error ? error.message : 'Please try again.' })
    } finally {
      setResending(false)
    }
  }

  const token = searchParams.get('token') ?? ''
  return (
    <AuthShell title="Verify email" subtitle="BeezFleet">
      <form className="auth-form" onSubmit={submit}>
        <label className="field"><span>Email</span><input name="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
        <Field label="Verification token" name="token" defaultValue={token} required />
        <Field label="Company name" name="companyName" required />
        <button className="primary-button full" type="submit" disabled={submitting}><CheckCircle2 size={18} /> {submitting ? 'Verifying...' : 'Verify email'}</button>
        <button className="secondary-button full" type="button" disabled={resending} onClick={resend}><MailCheck size={18} /> {resending ? 'Sending...' : 'Resend verification email'}</button>
      </form>
    </AuthShell>
  )
}

function OnboardingPage({
  company,
  session,
  setCompany,
  showToast,
}: {
  company: CompanyProfile
  session: AuthSession | null
  setCompany: React.Dispatch<React.SetStateAction<CompanyProfile>>
  showToast: (toast: Toast) => void
}) {
  const navigate = useNavigate()
  const [submitting, setSubmitting] = useState(false)
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!session?.token) {
      navigate('/login')
      return
    }

    setSubmitting(true)
    const form = new FormData(event.currentTarget)
    const nextCompany = {
      name: String(form.get('name')),
      address: String(form.get('address')),
      contactNumber: String(form.get('contactNumber')),
    }
    try {
      await postJson('/api/auth/onboarding', {
        companyName: nextCompany.name,
        businessAddress: nextCompany.address,
        contactNumber: nextCompany.contactNumber,
        birDtiLguDocumentUrl: null,
        logoUrl: null,
      }, session.token)
      setCompany(nextCompany)
      showToast({ title: 'Company profile ready', detail: 'Your fleet workspace is set up.' })
      navigate('/dashboard')
    } catch (error) {
      showToast({ title: 'Onboarding failed', detail: error instanceof Error ? error.message : 'Please try again.' })
    } finally {
      setSubmitting(false)
    }
  }
  if (!session?.token) return <Navigate to="/login" replace />

  return (
    <AuthShell title="Company profile" subtitle="Onboarding">
      <form className="auth-form" onSubmit={submit}>
        <Field label="Company name" name="name" defaultValue={company.name} required />
        <Field label="Business address" name="address" defaultValue={company.address} />
        <Field label="Contact number" name="contactNumber" defaultValue={company.contactNumber} />
        <label className="field">
          <span>Logo upload</span>
          <input name="logo" type="file" />
        </label>
        <button className="primary-button full" type="submit" disabled={submitting}><Save size={18} /> {submitting ? 'Saving...' : 'Finish onboarding'}</button>
      </form>
    </AuthShell>
  )
}

function VehicleForm({
  onSubmit,
  defaultValues,
  submitLabel = 'Save vehicle',
}: {
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  defaultValues?: Vehicle
  submitLabel?: string
}) {
  return (
    <form className="modal-form" onSubmit={onSubmit}>
      <Field label="Plate number" name="plateNumber" defaultValue={defaultValues?.plateNumber} required />
      <Field label="MV file number" name="mvFileNumber" defaultValue={defaultValues?.mvFileNumber} />
      <Field label="Engine number" name="engineNumber" defaultValue={defaultValues?.engineNumber} />
      <Field label="Chassis / VIN" name="chassisVinNumber" defaultValue={defaultValues?.chassisVinNumber} />
      <Field label="Make" name="make" defaultValue={defaultValues?.make} required />
      <Field label="Model" name="model" defaultValue={defaultValues?.model} required />
      <Field label="Series / variant" name="seriesVariant" defaultValue={defaultValues?.seriesVariant} />
      <Field label="Year model" name="yearModel" type="number" defaultValue={String(defaultValues?.yearModel ?? 2026)} />
      <Field label="Color" name="color" defaultValue={defaultValues?.color} />
      <Field label="Vehicle type" name="vehicleType" defaultValue={defaultValues?.vehicleType ?? 'Sedan'} />
      <Field label="Body type" name="bodyType" defaultValue={defaultValues?.bodyType} />
      <Field label="Fuel type" name="fuelType" defaultValue={defaultValues?.fuelType ?? 'Gasoline'} />
      <Field label="Capacity" name="passengerCapacity" type="number" defaultValue={String(defaultValues?.passengerCapacity ?? 4)} />
      <Field label="Classification" name="classification" defaultValue={defaultValues?.classification ?? 'Private'} />
      <Field label="Gross weight" name="grossWeight" defaultValue={defaultValues?.grossWeight} />
      <Field label="Current odometer" name="currentOdometer" type="number" defaultValue={String(defaultValues?.currentOdometer ?? 0)} />
      <label className="field"><span>Ownership</span><select name="ownershipStatus" defaultValue={defaultValues?.ownershipStatus ?? 'Owned'}><option>Owned</option><option>Financed</option><option>Leased</option></select></label>
      <label className="field"><span>Status</span><select name="status" defaultValue={defaultValues?.status ?? 'Available'}><option>Available</option><option>Booked</option><option>Under Maintenance</option><option>Inactive</option></select></label>
      <Field label="Remarks" name="remarks" defaultValue={defaultValues?.remarks} />
      <button className="primary-button full" type="submit"><Save size={18} /> {submitLabel}</button>
    </form>
  )
}

function DriverForm({
  onSubmit,
  defaultValues,
  submitLabel = 'Save driver',
}: {
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  defaultValues?: Driver
  submitLabel?: string
}) {
  return (
    <form className="modal-form" onSubmit={onSubmit}>
      <Field label="Full name" name="fullName" defaultValue={defaultValues?.fullName} required />
      <Field label="Address" name="address" defaultValue={defaultValues?.address} />
      <Field label="Contact number" name="contactNumber" defaultValue={defaultValues?.contactNumber} />
      <Field label="Email" name="email" type="email" defaultValue={defaultValues?.email} />
      <Field label="Emergency contact" name="emergencyContact" defaultValue={defaultValues?.emergencyContact} />
      <Field label="License number" name="licenseNumber" defaultValue={defaultValues?.licenseNumber} />
      <Field label="License type / restrictions" name="licenseTypeRestrictions" defaultValue={defaultValues?.licenseTypeRestrictions} />
      <Field label="License expiration" name="licenseExpirationDate" type="date" defaultValue={defaultValues?.licenseExpirationDate} />
      <label className="field"><span>Status</span><select name="status" defaultValue={defaultValues?.status ?? 'Active'}><option>Active</option><option>Inactive</option><option>Suspended</option></select></label>
      <Field label="Notes" name="notes" defaultValue={defaultValues?.notes} />
      <button className="primary-button full" type="submit"><Save size={18} /> {submitLabel}</button>
    </form>
  )
}

function RenterForm({
  onSubmit,
  defaultValues,
  submitLabel = 'Save renter',
}: {
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  defaultValues?: Renter
  submitLabel?: string
}) {
  return (
    <form className="modal-form" onSubmit={onSubmit}>
      <Field label="Full name" name="fullName" defaultValue={defaultValues?.fullName} required />
      <Field label="Address" name="address" defaultValue={defaultValues?.address} />
      <Field label="Contact number" name="contactNumber" defaultValue={defaultValues?.contactNumber} />
      <Field label="Email" name="email" type="email" defaultValue={defaultValues?.email} />
      <Field label="Valid ID type" name="validIdType" defaultValue={defaultValues?.validIdType} />
      <Field label="Valid ID number" name="validIdNumber" defaultValue={defaultValues?.validIdNumber} />
      <Field label="Driver license" name="driverLicenseNumber" defaultValue={defaultValues?.driverLicenseNumber} />
      <Field label="Emergency contact" name="emergencyContact" defaultValue={defaultValues?.emergencyContact} />
      <label className="field"><span>Risk flag</span><select name="isWatchlisted" defaultValue={defaultValues?.isWatchlisted ? 'true' : 'false'}><option value="false">Clear</option><option value="true">Watchlist</option></select></label>
      <Field label="Notes" name="notes" defaultValue={defaultValues?.notes} />
      <button className="primary-button full" type="submit"><Save size={18} /> {submitLabel}</button>
    </form>
  )
}

function BookingForm({
  data,
  onSubmit,
  defaultValues,
  submitLabel = 'Save booking',
}: {
  data: AppData
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  defaultValues?: Booking
  submitLabel?: string
}) {
  return (
    <form className="modal-form" onSubmit={onSubmit}>
      <label className="field"><span>Renter</span><select name="renterId" defaultValue={defaultValues?.renterId}>{data.renters.map((renter) => <option key={renter.id} value={renter.id}>{renter.fullName}</option>)}</select></label>
      <label className="field"><span>Vehicle</span><select name="vehicleId" defaultValue={defaultValues?.vehicleId}>{data.vehicles.map((vehicle) => <option key={vehicle.id} value={vehicle.id}>{vehicle.plateNumber} - {vehicle.make} {vehicle.model}</option>)}</select></label>
      <label className="field"><span>Driver</span><select name="driverId" defaultValue={defaultValues?.driverId ?? ''}><option value="">Optional</option>{data.drivers.map((driver) => <option key={driver.id} value={driver.id}>{driver.fullName}</option>)}</select></label>
      <label className="field"><span>Booking type</span><select name="bookingType" defaultValue={defaultValues?.bookingType ?? 'Self-drive'}><option>Self-drive</option><option>With driver</option><option>Delivery/logistics</option><option>Corporate lease</option></select></label>
      <Field label="Start" name="startDateTime" type="datetime-local" defaultValue={dateTimeInputValue(defaultValues?.startDateTime)} required />
      <Field label="End" name="endDateTime" type="datetime-local" defaultValue={dateTimeInputValue(defaultValues?.endDateTime)} required />
      <Field label="Pickup location" name="pickupLocation" defaultValue={defaultValues?.pickupLocation} />
      <Field label="Return location" name="returnLocation" defaultValue={defaultValues?.returnLocation} />
      <label className="field"><span>Rate type</span><select name="rateType" defaultValue={defaultValues?.rateType ?? 'Daily'}><option>Daily</option><option>Weekly</option><option>Monthly</option><option>Custom</option></select></label>
      <Field label="Rate amount" name="rateAmount" type="number" defaultValue={String(defaultValues?.rateAmount ?? 3500)} />
      <Field label="Security deposit" name="securityDeposit" type="number" defaultValue={String(defaultValues?.securityDeposit ?? 0)} />
      <label className="field"><span>Payment status</span><select name="paymentStatus" defaultValue={defaultValues?.paymentStatus ?? 'Unpaid'}><option>Unpaid</option><option>Partial</option><option>Paid</option><option>Refunded</option></select></label>
      <label className="field"><span>Booking status</span><select name="bookingStatus" defaultValue={defaultValues?.bookingStatus ?? 'Pending'}><option>Pending</option><option>Confirmed</option><option>Active</option><option>Completed</option><option>Cancelled</option></select></label>
      <Field label="Notes" name="notes" defaultValue={defaultValues?.notes} />
      <button className="primary-button full" type="submit"><Save size={18} /> {submitLabel}</button>
    </form>
  )
}

function TripForm({
  data,
  onSubmit,
  defaultValues,
  submitLabel = 'Save trip',
}: {
  data: AppData
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  defaultValues?: Trip
  submitLabel?: string
}) {
  return (
    <form className="modal-form" onSubmit={onSubmit}>
      <label className="field"><span>Vehicle</span><select name="vehicleId" defaultValue={defaultValues?.vehicleId}>{data.vehicles.map((vehicle) => <option key={vehicle.id} value={vehicle.id}>{vehicle.plateNumber} - {vehicle.make} {vehicle.model}</option>)}</select></label>
      <label className="field"><span>Driver</span><select name="driverId" defaultValue={defaultValues?.driverId ?? ''}><option value="">Optional</option>{data.drivers.map((driver) => <option key={driver.id} value={driver.id}>{driver.fullName}</option>)}</select></label>
      <label className="field"><span>Renter</span><select name="renterId" defaultValue={defaultValues?.renterId}>{data.renters.map((renter) => <option key={renter.id} value={renter.id}>{renter.fullName}</option>)}</select></label>
      <label className="field"><span>Trip type</span><select name="tripType" defaultValue={defaultValues?.tripType ?? 'Rental'}><option>Rental</option><option>Delivery</option><option>Private booking</option><option>Corporate</option><option>Other</option></select></label>
      <Field label="Booking reference" name="bookingReference" defaultValue={defaultValues?.bookingReference} />
      <Field label="Start" name="startDateTime" type="datetime-local" defaultValue={dateTimeInputValue(defaultValues?.startDateTime)} required />
      <Field label="End" name="endDateTime" type="datetime-local" defaultValue={dateTimeInputValue(defaultValues?.endDateTime)} />
      <Field label="Starting odometer" name="startingOdometer" type="number" defaultValue={String(defaultValues?.startingOdometer ?? '')} />
      <Field label="Ending odometer" name="endingOdometer" type="number" defaultValue={String(defaultValues?.endingOdometer ?? '')} />
      <Field label="Fuel expense" name="fuelExpense" type="number" defaultValue={String(defaultValues?.fuelExpense ?? 0)} />
      <Field label="Toll expense" name="tollExpense" type="number" defaultValue={String(defaultValues?.tollExpense ?? 0)} />
      <Field label="Parking expense" name="parkingExpense" type="number" defaultValue={String(defaultValues?.parkingExpense ?? 0)} />
      <Field label="Other expenses" name="otherExpenses" type="number" defaultValue={String(defaultValues?.otherExpenses ?? 0)} />
      <Field label="Gross revenue" name="grossRevenue" type="number" defaultValue={String(defaultValues?.grossRevenue ?? 0)} />
      <Field label="Driver proceed / commission" name="driverProceedCommission" type="number" defaultValue={String(defaultValues?.driverProceedCommission ?? 0)} />
      <Field label="Payment method" name="paymentMethod" defaultValue={defaultValues?.paymentMethod} />
      <label className="field"><span>Payment status</span><select name="paymentStatus" defaultValue={defaultValues?.paymentStatus ?? 'Unpaid'}><option>Unpaid</option><option>Partial</option><option>Paid</option><option>Refunded</option></select></label>
      <label className="field"><span>Status</span><select name="status" defaultValue={defaultValues?.status ?? 'Scheduled'}><option>Scheduled</option><option>Active</option><option>Completed</option><option>Cancelled</option></select></label>
      <Field label="Remarks" name="remarks" defaultValue={defaultValues?.remarks} />
      <button className="primary-button full" type="submit"><Save size={18} /> {submitLabel}</button>
    </form>
  )
}

function MaintenanceForm({
  data,
  onSubmit,
  defaultValues,
  submitLabel = 'Save schedule',
}: {
  data: AppData
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  defaultValues?: MaintenanceSchedule
  submitLabel?: string
}) {
  return (
    <form className="modal-form" onSubmit={onSubmit}>
      <label className="field"><span>Vehicle</span><select name="vehicleId" defaultValue={defaultValues?.vehicleId}>{data.vehicles.map((vehicle) => <option key={vehicle.id} value={vehicle.id}>{vehicle.plateNumber} - {vehicle.make} {vehicle.model}</option>)}</select></label>
      <Field label="Title" name="title" defaultValue={defaultValues?.title ?? 'PMS'} />
      <Field label="Due date" name="dueDate" type="date" defaultValue={defaultValues?.dueDate} required />
      <Field label="Due odometer" name="dueOdometer" type="number" defaultValue={String(defaultValues?.dueOdometer ?? '')} />
      <label className="field"><span>Status</span><select name="status" defaultValue={defaultValues?.status ?? 'Upcoming'}><option>Upcoming</option><option>Due Soon</option><option>Overdue</option><option>Completed</option></select></label>
      <Field label="Vendor / shop" name="vendorShop" defaultValue={defaultValues?.vendorShop} />
      <Field label="Estimated cost" name="estimatedCost" type="number" defaultValue={String(defaultValues?.estimatedCost ?? 0)} />
      <Field label="Notes" name="notes" defaultValue={defaultValues?.notes} />
      <button className="primary-button full" type="submit"><Save size={18} /> {submitLabel}</button>
    </form>
  )
}

function DocumentForm({
  data,
  onSubmit,
  defaultValues,
  submitLabel = 'Upload document',
  lockedEntity,
}: {
  data: AppData
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  defaultValues?: DocumentAttachment
  submitLabel?: string
  lockedEntity?: LockedDocumentEntity
}) {
  const [entityType, setEntityType] = useState(lockedEntity?.entityType ?? defaultValues?.entityType ?? 'Vehicle')
  const entityOptions = documentEntityOptions(data)
  const filteredEntityOptions = entityOptions.filter((item) => item.entityType === entityType)
  const documentTypes = documentTypeOptionsFor(entityType)
  const selectedDocumentType = defaultValues?.documentType && documentTypes.includes(defaultValues.documentType)
    ? defaultValues.documentType
    : documentTypes[0]

  return (
    <form className="modal-form" onSubmit={onSubmit}>
      {lockedEntity ? (
        <>
          <input type="hidden" name="entityType" value={lockedEntity.entityType} />
          <input type="hidden" name="entityId" value={lockedEntity.entityId} />
          <p className="muted-line full">{lockedEntity.label}</p>
        </>
      ) : (
        <>
          <label className="field">
            <span>Module</span>
            <select name="entityType" value={entityType} onChange={(event) => setEntityType(event.target.value)}>
              {documentEntityTypes.map((item) => <option key={item}>{item}</option>)}
            </select>
          </label>
          <label className="field">
            <span>Record</span>
            <select key={entityType} name="entityId" defaultValue={defaultValues?.entityId ?? filteredEntityOptions[0]?.id} required>
              {filteredEntityOptions.map((item) => <option key={`${item.entityType}-${item.id}`} value={item.id}>{item.label}</option>)}
            </select>
          </label>
        </>
      )}
      <label className="field">
        <span>Document type</span>
        <select key={`${entityType}-document-type`} name="documentType" defaultValue={selectedDocumentType} required>
          {documentTypes.map((item) => <option key={item}>{item}</option>)}
        </select>
      </label>
      <Field label="Expiration date" name="expirationDate" type="date" defaultValue={defaultValues?.expirationDate} />
      <label className="field full">
        <span>Document file</span>
        <input name="file" type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx,application/pdf" required />
        <small>PDF, JPG, PNG, WebP, Word, or Excel up to 20 MB.</small>
      </label>
      <button className="primary-button full" type="submit"><Upload size={18} /> {submitLabel}</button>
    </form>
  )
}

function Page({ children }: { children: React.ReactNode }) {
  return <div className="page-stack">{children}</div>
}

function PageHeader({ eyebrow, title, action }: { eyebrow: string; title: string; action?: React.ReactNode }) {
  return (
    <div className="page-header">
      <div><span>{eyebrow}</span><h1>{title}</h1></div>
      {action}
    </div>
  )
}

function HeaderActions({ children }: { children: React.ReactNode }) {
  return <div className="header-actions">{children}</div>
}

function BackLink({ to, label }: { to: string; label: string }) {
  return <Link className="secondary-button" to={to}><ArrowLeft size={16} /> {label}</Link>
}

function MetricCard({ icon: Icon, label, value, tone }: { icon: typeof Car; label: string; value: string; tone: string }) {
  return (
    <article className={`metric-card tone-${tone}`}>
      <span><Icon size={20} /></span>
      <div><small>{label}</small><strong>{value}</strong></div>
    </article>
  )
}

function Panel({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="panel">
      <header><h2>{title}</h2>{action}</header>
      {children}
    </section>
  )
}

function EntityDocumentsPanel({
  data,
  entityType,
  entityId,
  entityLabel,
  documents,
  setDocuments,
  session,
  showToast,
}: {
  data: AppData
  entityType: string
  entityId: string
  entityLabel: string
  documents: DocumentAttachment[]
  setDocuments: React.Dispatch<React.SetStateAction<DocumentAttachment[]>>
  session: AuthSession | null
  showToast: (toast: Toast) => void
}) {
  const [uploadOpen, setUploadOpen] = useState(false)
  const [uploading, setUploading] = useState(false)

  const upload = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setUploading(true)
    try {
      const uploaded = await uploadDocumentFromForm(new FormData(event.currentTarget), session)
      setDocuments((current) => [uploaded, ...current])
      setUploadOpen(false)
      showToast({ title: 'Document uploaded', detail: 'The document was saved to this record.' })
    } catch (error) {
      showToast({ title: 'Upload failed', detail: error instanceof Error ? error.message : 'Please try again.' })
    } finally {
      setUploading(false)
    }
  }

  return (
    <Panel
      title="Documents"
      action={<button className="secondary-button" type="button" onClick={() => setUploadOpen(true)}><Upload size={16} /> Upload</button>}
    >
      <CompactList>
        {documents.map((doc) => (
          <li key={doc.id}>
            <span>
              <strong>{doc.documentType}</strong>
              <small>{doc.originalFileName}{doc.expirationDate ? ` - expires ${dateText(doc.expirationDate)}` : ''}</small>
            </span>
            {displayableAssetUrl(doc.displayUrl)
              ? <a className="secondary-button compact-button" href={displayableAssetUrl(doc.displayUrl)} target="_blank" rel="noreferrer">Open</a>
              : <Badge status={doc.expirationDate ? (daysUntil(doc.expirationDate) <= 7 ? 'Due Soon' : 'Clear') : 'Clear'} />}
          </li>
        ))}
      </CompactList>
      {documents.length === 0 && <EmptyState title="No documents yet" detail="Upload compliance files, IDs, contracts, or receipts for this record." />}
      <Modal title={`Upload ${entityType.toLowerCase()} document`} open={uploadOpen} onClose={() => setUploadOpen(false)}>
        <DocumentForm
          data={data}
          lockedEntity={{ entityType, entityId, label: entityLabel }}
          onSubmit={upload}
          submitLabel={uploading ? 'Uploading...' : 'Upload document'}
        />
      </Modal>
    </Panel>
  )
}

function EntityPhotosPanel({
  entityType,
  entityId,
  entityLabel,
  session,
  showToast,
}: {
  entityType: 'Vehicle' | 'Driver'
  entityId: string
  entityLabel: string
  session: AuthSession | null
  showToast: (toast: Toast) => void
}) {
  const [photos, setPhotos] = useState<PhotoItem[]>([])
  const [uploadOpen, setUploadOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [uploading, setUploading] = useState(false)
  const [previewPhotoId, setPreviewPhotoId] = useState('')

  useEffect(() => {
    if (!session?.token || !entityId) {
      setPhotos([])
      return
    }

    let active = true
    setLoading(true)
    setLoadError('')
    getJson<PhotoItem[]>(`/api/photos?entityType=${encodeURIComponent(entityType)}&entityId=${encodeURIComponent(entityId)}`, session.token)
      .then((items) => {
        if (active) {
          setPhotos(items)
        }
      })
      .catch((error) => {
        if (active) {
          const message = error instanceof Error ? error.message : 'Photos are temporarily unavailable.'
          setLoadError(message)
          showToast({ title: 'Photos unavailable', detail: message })
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false)
        }
      })

    return () => {
      active = false
    }
  }, [entityType, entityId, session?.token])

  const upload = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setUploading(true)
    try {
      const uploaded = await uploadPhotoFromForm(new FormData(event.currentTarget), session)
      setPhotos((current) => [uploaded, ...current].sort((a, b) => a.displayOrder - b.displayOrder))
      setUploadOpen(false)
      showToast({ title: 'Photo uploaded', detail: 'The photo was saved to this record.' })
    } catch (error) {
      showToast({ title: 'Photo not uploaded', detail: error instanceof Error ? error.message : 'Please try again.' })
    } finally {
      setUploading(false)
    }
  }

  const removePhoto = async (photo: PhotoItem) => {
    if (!session?.token) return

    try {
      await deleteJson(`/api/photos/${photo.id}`, session.token)
      setPhotos((current) => current.filter((item) => item.id !== photo.id))
      showToast({ title: 'Photo removed', detail: 'The photo was removed from this record.' })
    } catch (error) {
      showToast({ title: 'Photo not removed', detail: error instanceof Error ? error.message : 'Please try again.' })
    }
  }

  return (
    <Panel
      title="Photos"
      action={<button className="secondary-button" type="button" onClick={() => setUploadOpen(true)}><Images size={16} /> Add photo</button>}
    >
      {loading && <p className="muted-line">Loading photos...</p>}
      {!loading && loadError && <EmptyState title="Photos are not ready" detail={loadError} />}
      {!loading && !loadError && photos.length === 0 && <EmptyState title="No photos yet" detail={`Add ${entityType.toLowerCase()} photos here. Vehicle photos can be selected later for the public page.`} />}
      <div className="photo-grid">
        {photos.map((photo) => {
          return (
            <article className="photo-card" key={photo.id}>
              <button className="photo-thumb photo-thumb-button" type="button" onClick={() => setPreviewPhotoId(photo.id)} aria-label={`Enlarge ${photo.caption || photo.originalFileName}`}>
                <SafeImage src={photo.displayUrl} alt={photo.caption || photo.originalFileName} fallback={<Camera size={24} />} />
                <span><Maximize2 size={14} /> Open</span>
              </button>
              <button className="photo-remove-button" type="button" title="Remove photo" onClick={() => removePhoto(photo)}><Trash2 size={15} /></button>
              <div className="photo-card-body">
                <span className="photo-name">{photo.caption || photo.originalFileName}</span>
                {photo.isPublic && <Badge status="Public" />}
              </div>
            </article>
          )
        })}
      </div>
      {previewPhotoId && (
        <GalleryLightbox
          title={`${entityLabel} photos`}
          photos={photos}
          activeId={previewPhotoId}
          onActiveIdChange={setPreviewPhotoId}
          onClose={() => setPreviewPhotoId('')}
        />
      )}
      <Modal title="Add photo" open={uploadOpen} onClose={() => setUploadOpen(false)}>
        <form className="modal-form photo-upload-form" onSubmit={upload}>
          <input type="hidden" name="entityType" value={entityType} />
          <input type="hidden" name="entityId" value={entityId} />
          <input type="hidden" name="displayOrder" value="0" />
          <label className="field full">
            <span>Image</span>
            <input name="file" type="file" accept="image/jpeg,image/png,image/webp" required />
            <small>JPG, PNG, or WebP up to 8 MB.</small>
          </label>
          <label className="field full">
            <span>Caption</span>
            <input name="caption" placeholder={`${entityType} photo`} />
          </label>
          <p className="muted-line full">{entityLabel}</p>
          <button className="primary-button full" type="submit" disabled={uploading}><Upload size={18} /> {uploading ? 'Uploading...' : 'Add photo'}</button>
        </form>
      </Modal>
    </Panel>
  )
}

function Toolbar({ query, setQuery, placeholder, children }: { query: string; setQuery: (value: string) => void; placeholder: string; children?: React.ReactNode }) {
  return (
    <div className="toolbar">
      <label className="search-box"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={placeholder} /></label>
      {children}
    </div>
  )
}

function SelectFilter({ value, onChange, options }: { value: string; onChange: (value: string) => void; options: string[] }) {
  return (
    <label className="select-filter"><Filter size={16} /><select value={value} onChange={(event) => onChange(event.target.value)}>{options.map((option) => <option key={option}>{option}</option>)}</select></label>
  )
}

function Table({ children }: { children: React.ReactNode }) {
  return <div className="table-wrap"><table>{children}</table></div>
}

function CompactList({ children }: { children: React.ReactNode }) {
  return <ul className="compact-list">{children}</ul>
}

function Badge({ status }: { status: string }) {
  return <span className={`badge badge-${status.toLowerCase().replaceAll(' ', '-').replace('/', '-')}`}>{status}</span>
}

function IconLink({ to, title }: { to: string; title: string }) {
  return <Link className="icon-button" to={to} title={title}><ChevronRight size={16} /></Link>
}

function Modal({ title, open, onClose, children }: { title: string; open: boolean; onClose: () => void; children: React.ReactNode }) {
  if (!open) return null
  return (
    <div className="modal-layer" role="dialog" aria-modal="true" aria-label={title}>
      <div className="modal">
        <header><h2>{title}</h2><button className="icon-button" type="button" title="Close modal" onClick={onClose}><X size={18} /></button></header>
        {children}
      </div>
    </div>
  )
}

function GalleryLightbox({
  title,
  photos,
  activeId,
  onActiveIdChange,
  onClose,
}: {
  title: string
  photos: GalleryPhoto[]
  activeId: string
  onActiveIdChange: (id: string) => void
  onClose: () => void
}) {
  const activeIndex = Math.max(0, photos.findIndex((photo) => photo.id === activeId))
  const activePhoto = photos[activeIndex]
  const canNavigate = photos.length > 1

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }

      if (event.key === 'ArrowLeft' && canNavigate) {
        onActiveIdChange(photos[(activeIndex - 1 + photos.length) % photos.length].id)
      }

      if (event.key === 'ArrowRight' && canNavigate) {
        onActiveIdChange(photos[(activeIndex + 1) % photos.length].id)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [activeIndex, canNavigate, onActiveIdChange, onClose, photos])

  if (!activePhoto) return null

  const previous = () => onActiveIdChange(photos[(activeIndex - 1 + photos.length) % photos.length].id)
  const next = () => onActiveIdChange(photos[(activeIndex + 1) % photos.length].id)

  return (
    <div className="gallery-lightbox-layer" role="dialog" aria-modal="true" aria-label={title}>
      <div className="gallery-lightbox">
        <header>
          <div>
            <h2>{title}</h2>
            <span>{activeIndex + 1} of {photos.length}</span>
          </div>
          <button className="icon-button" type="button" title="Close gallery" onClick={onClose}><X size={18} /></button>
        </header>
        <div className="gallery-lightbox-stage">
          {canNavigate && <button className="gallery-nav previous" type="button" title="Previous photo" onClick={previous}><ChevronLeft size={22} /></button>}
          <SafeImage src={activePhoto.displayUrl} alt={activePhoto.caption || activePhoto.originalFileName || title} fallback={<Camera size={32} />} loading="eager" />
          {canNavigate && <button className="gallery-nav next" type="button" title="Next photo" onClick={next}><ChevronRight size={22} /></button>}
        </div>
        {(activePhoto.caption || activePhoto.originalFileName) && <p>{activePhoto.caption || activePhoto.originalFileName}</p>}
        {photos.length > 1 && (
          <div className="gallery-lightbox-thumbs">
            {photos.map((photo, index) => (
              <button
                className={photo.id === activePhoto.id ? 'active' : ''}
                key={photo.id}
                type="button"
                onClick={() => onActiveIdChange(photo.id)}
                aria-label={`Show photo ${index + 1}`}
              >
                <SafeImage src={photo.displayUrl} alt={photo.caption || photo.originalFileName || `${title} photo ${index + 1}`} fallback={<Camera size={14} />} />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function ConfirmDialog({ open, title, detail, onCancel, onConfirm }: { open: boolean; title: string; detail: string; onCancel: () => void; onConfirm: () => void }) {
  if (!open) return null
  return (
    <div className="modal-layer" role="dialog" aria-modal="true" aria-label={title}>
      <div className="confirm-box">
        <AlertTriangle size={24} />
        <h2>{title}</h2>
        <p>{detail}</p>
        <div><button className="secondary-button" type="button" onClick={onCancel}>Cancel</button><button className="danger-button" type="button" onClick={onConfirm}>Delete</button></div>
      </div>
    </div>
  )
}

function EmptyState({ title, detail }: { title: string; detail: string }) {
  return <div className="empty-state"><FileText size={24} /><h2>{title}</h2><p>{detail}</p></div>
}

function NotFound({ title }: { title: string }) {
  return <Page><EmptyState title={title} detail="The record is not available in this workspace." /></Page>
}

function DetailGrid({ items }: { items: Array<[string, string]> }) {
  return <dl className="detail-grid">{items.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
}

function TwoColumn({ children }: { children: React.ReactNode }) {
  return <section className="two-column">{children}</section>
}

function Field({
  label,
  name,
  type = 'text',
  defaultValue,
  required,
  readOnly,
}: {
  label: string
  name: string
  type?: string
  defaultValue?: string
  required?: boolean
  readOnly?: boolean
}) {
  return <label className="field"><span>{label}</span><input name={name} type={type} defaultValue={defaultValue} required={required} readOnly={readOnly} /></label>
}

function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <main className="auth-shell">
      <section className="auth-panel">
        <div className="brand auth-brand"><span className="brand-mark">BF</span><span><strong>BeezFleet</strong><small>{subtitle}</small></span></div>
        <h1>{title}</h1>
        {children}
      </section>
    </main>
  )
}

function CalendarStrip({ bookings, data }: { bookings: Booking[]; data: AppData }) {
  return (
    <div className="calendar-strip">
      {bookings.slice(0, 6).map((booking) => (
        <Link key={booking.id} to={`/bookings/${booking.id}`}>
          <strong>{new Date(booking.startDateTime).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}</strong>
          <span>{booking.referenceNumber}</span>
          <small>{vehicleLabel(data, booking.vehicleId)}</small>
        </Link>
      ))}
    </div>
  )
}

function Expense({ label, value }: { label: string; value: number }) {
  return <div className="expense-item"><span>{label}</span><strong>{money.format(value)}</strong></div>
}

function ToastMessage({ toast }: { toast: Toast }) {
  return <div className="toast"><CheckCircle2 size={20} /><span><strong>{toast.title}</strong><small>{toast.detail}</small></span></div>
}

function countVehicles(vehicles: Vehicle[], status: VehicleStatus) {
  return vehicles.filter((vehicle) => vehicle.status === status).length
}

function sum(values: number[]) {
  return values.reduce((total, value) => total + value, 0)
}

function kilometers(trip: Trip) {
  return trip.startingOdometer && trip.endingOdometer ? Math.max(0, trip.endingOdometer - trip.startingOdometer) : 0
}

function totalExpenses(trip: Trip) {
  return trip.fuelExpense + trip.tollExpense + trip.parkingExpense + trip.otherExpenses + trip.driverProceedCommission
}

function netProfit(trip: Trip) {
  return trip.grossRevenue - totalExpenses(trip)
}

function vehicleRevenue(data: AppData, vehicleId: string) {
  return sum(data.trips.filter((trip) => trip.vehicleId === vehicleId).map((trip) => trip.grossRevenue))
}

function inquiryCountsByVehicle(data: AppData) {
  const counts = new Map<string, { key: string; label: string; count: number }>()
  for (const inquiry of data.publicInquiries) {
    const key = inquiry.vehicleId || inquiry.vehicleLabel || 'unassigned'
    const label = inquiryVehicleLabel(data, inquiry)
    const current = counts.get(key)
    counts.set(key, { key, label, count: (current?.count ?? 0) + 1 })
  }

  return [...counts.values()].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
}

function inquiryVehicleLabel(data: AppData, inquiry: PublicBookingInquiry) {
  return inquiry.vehicleLabel || vehicleLabel(data, inquiry.vehicleId || undefined)
}

function vehicleLabel(data: AppData, id?: string) {
  const vehicle = data.vehicles.find((item) => item.id === id)
  return vehicle ? `${vehicle.plateNumber} - ${vehicle.make} ${vehicle.model}` : 'Unassigned'
}

function driverName(data: AppData, id?: string) {
  return data.drivers.find((item) => item.id === id)?.fullName || 'No driver'
}

function renterName(data: AppData, id: string) {
  return data.renters.find((item) => item.id === id)?.fullName || 'Unknown customer'
}

function entityLabel(data: AppData, entityType: string, entityId: string) {
  if (entityType === 'Vehicle') return vehicleLabel(data, entityId)
  if (entityType === 'Driver') return driverName(data, entityId)
  if (entityType === 'Renter') return renterName(data, entityId)
  if (entityType === 'Booking') return data.bookings.find((item) => item.id === entityId)?.referenceNumber || entityId
  if (entityType === 'Trip') return data.trips.find((item) => item.id === entityId)?.tripNumber || entityId
  if (entityType === 'Maintenance') return data.maintenance.find((item) => item.id === entityId)?.title || entityId
  return entityId
}

function dateText(value?: string) {
  if (!value) return 'N/A'
  return new Date(value).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })
}

function dateTimeText(value?: string) {
  if (!value) return 'N/A'
  return new Date(value).toLocaleString('en-PH', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })
}

function statusLabel(status: string) {
  return status.replace(/([a-z])([A-Z])/g, '$1 $2')
}

function platformVehicleStatusLabel(status: AdminTenantVehicle['status']) {
  return status === 'UnderMaintenance' ? 'Under Maintenance' : status
}

function daysUntil(value?: string) {
  if (!value) return 999
  const diff = new Date(value).getTime() - new Date('2026-05-15T00:00:00').getTime()
  return Math.ceil(diff / 86_400_000)
}

function formString(form: FormData, name: string, fallback?: string) {
  const value = form.get(name)
  return typeof value === 'string' && value.length > 0 ? value : fallback ?? ''
}

function nullableFormString(form: FormData, name: string, fallback?: string) {
  const value = formString(form, name, fallback).trim()
  return value || null
}

function nullableFormNumber(form: FormData, name: string, fallback?: string | number) {
  const rawValue = formString(form, name, fallback === undefined ? undefined : String(fallback)).replace(/[^\d.-]/g, '')
  if (!rawValue) {
    return null
  }

  const value = Number(rawValue)
  return Number.isFinite(value) ? value : null
}

function formNumber(form: FormData, name: string, fallback = 0) {
  const value = Number(form.get(name))
  return Number.isFinite(value) ? value : fallback
}

function publicDateTimeFromForm(form: FormData, prefix: 'start' | 'end') {
  const date = formString(form, `${prefix}Date`)
  const time = formString(form, `${prefix}Time`)
  const value = new Date(`${date}T${time}`)
  if (!date || !time || Number.isNaN(value.getTime())) {
    throw new Error('Choose a valid start and end date/time.')
  }

  return value
}

function parseCustomFeatures(value: string) {
  return value
    .split('\n')
    .map((line, index) => {
      const trimmed = line.trim()
      if (!trimmed) return null

      const [rawIcon, ...labelParts] = trimmed.split('|')
      const label = labelParts.length > 0 ? labelParts.join('|').trim() : trimmed
      return {
        icon: labelParts.length > 0 ? rawIcon.trim() || '+' : '+',
        label,
        displayOrder: 1000 + index,
      }
    })
    .filter((feature): feature is { icon: string; label: string; displayOrder: number } => Boolean(feature?.label))
}

function vehicleFromApi(vehicle: VehicleApiDto): Vehicle {
  return {
    id: vehicle.id,
    plateNumber: vehicle.plateNumber,
    mvFileNumber: vehicle.mvFileNumber || '',
    engineNumber: vehicle.engineNumber || '',
    chassisVinNumber: vehicle.chassisVinNumber || '',
    make: vehicle.make,
    model: vehicle.model,
    seriesVariant: vehicle.seriesVariant || '',
    yearModel: vehicle.yearModel,
    color: vehicle.color || '',
    vehicleType: vehicle.vehicleType || '',
    bodyType: vehicle.bodyType || '',
    fuelType: vehicle.fuelType || '',
    passengerCapacity: vehicle.passengerCapacity,
    classification: vehicle.classification || '',
    grossWeight: vehicle.grossWeight ? `${vehicle.grossWeight.toLocaleString()} kg` : '',
    currentOdometer: vehicle.currentOdometer,
    ownershipStatus: vehicle.ownershipStatus,
    status: vehicle.status === 'UnderMaintenance' ? 'Under Maintenance' : vehicle.status,
    remarks: vehicle.remarks || '',
  }
}

function driverFromApi(driver: DriverApiDto): Driver {
  return {
    id: driver.id,
    fullName: driver.fullName,
    address: driver.address || '',
    contactNumber: driver.contactNumber || '',
    email: driver.email || '',
    emergencyContact: driver.emergencyContact || '',
    licenseNumber: driver.licenseNumber || '',
    licenseTypeRestrictions: driver.licenseTypeRestrictions || '',
    licenseExpirationDate: driver.licenseExpirationDate || '',
    status: driver.status,
    notes: driver.notes || '',
  }
}

function renterFromApi(renter: RenterApiDto): Renter {
  return {
    id: renter.id,
    fullName: renter.fullName,
    address: renter.address || '',
    contactNumber: renter.contactNumber || '',
    email: renter.email || '',
    validIdType: renter.validIdType || '',
    validIdNumber: renter.validIdNumber || '',
    driverLicenseNumber: renter.driverLicenseNumber || '',
    emergencyContact: renter.emergencyContact || '',
    isWatchlisted: renter.isWatchlisted,
    notes: renter.notes || '',
  }
}

function bookingFromApi(booking: BookingApiDto): Booking {
  return {
    id: booking.id,
    referenceNumber: booking.referenceNumber,
    renterId: booking.renterId,
    vehicleId: booking.vehicleId,
    driverId: booking.driverId || undefined,
    bookingType: fromApiBookingType(booking.bookingType),
    startDateTime: booking.startDateTime,
    endDateTime: booking.endDateTime,
    pickupLocation: booking.pickupLocation || '',
    returnLocation: booking.returnLocation || '',
    rateType: booking.rateType,
    rateAmount: booking.rateAmount,
    securityDeposit: booking.securityDeposit,
    paymentStatus: booking.paymentStatus,
    bookingStatus: booking.bookingStatus,
    notes: booking.notes || '',
  }
}

function tripFromApi(trip: TripApiDto): Trip {
  return {
    id: trip.id,
    tripNumber: trip.tripNumber,
    bookingId: trip.bookingId || undefined,
    bookingReference: trip.bookingReference || undefined,
    vehicleId: trip.vehicleId,
    driverId: trip.driverId || undefined,
    renterId: trip.renterId,
    tripType: fromApiTripType(trip.tripType),
    startDateTime: trip.startDateTime,
    endDateTime: trip.endDateTime || undefined,
    startingOdometer: trip.startingOdometer ?? undefined,
    endingOdometer: trip.endingOdometer ?? undefined,
    fuelExpense: trip.fuelExpense,
    tollExpense: trip.tollExpense,
    parkingExpense: trip.parkingExpense,
    otherExpenses: trip.otherExpenses,
    grossRevenue: trip.grossRevenue,
    driverProceedCommission: trip.driverProceedCommission,
    paymentMethod: trip.paymentMethod || '',
    paymentStatus: trip.paymentStatus,
    remarks: trip.remarks || '',
    status: trip.status,
  }
}

function maintenanceFromApi(schedule: MaintenanceApiDto): MaintenanceSchedule {
  return {
    id: schedule.id,
    vehicleId: schedule.vehicleId,
    title: schedule.title,
    dueDate: schedule.dueDate || '',
    dueOdometer: schedule.dueOdometer ?? 0,
    status: fromApiMaintenanceStatus(schedule.status),
    vendorShop: schedule.vendorShop || '',
    estimatedCost: schedule.estimatedCost ?? 0,
    notes: schedule.notes || '',
  }
}

function notificationFromApi(notification: NotificationApiDto): NotificationItem {
  return {
    id: notification.id,
    title: notification.title,
    message: notification.message,
    type: fromApiNotificationType(notification.type),
    isRead: notification.isRead,
    createdAt: notification.createdAt,
    relatedEntityType: notification.relatedEntityType,
    relatedEntityId: notification.relatedEntityId,
  }
}

function vehiclePayloadFromForm(form: FormData, existing?: Vehicle): Omit<VehicleApiDto, 'id'> {
  return {
    plateNumber: formString(form, 'plateNumber', existing?.plateNumber).trim(),
    mvFileNumber: nullableFormString(form, 'mvFileNumber', existing?.mvFileNumber),
    engineNumber: nullableFormString(form, 'engineNumber', existing?.engineNumber),
    chassisVinNumber: nullableFormString(form, 'chassisVinNumber', existing?.chassisVinNumber),
    make: formString(form, 'make', existing?.make).trim(),
    model: formString(form, 'model', existing?.model).trim(),
    seriesVariant: nullableFormString(form, 'seriesVariant', existing?.seriesVariant),
    yearModel: formNumber(form, 'yearModel', existing?.yearModel ?? new Date().getFullYear()),
    color: nullableFormString(form, 'color', existing?.color),
    vehicleType: nullableFormString(form, 'vehicleType', existing?.vehicleType ?? 'Sedan'),
    bodyType: nullableFormString(form, 'bodyType', existing?.bodyType),
    fuelType: nullableFormString(form, 'fuelType', existing?.fuelType ?? 'Gasoline'),
    passengerCapacity: formNumber(form, 'passengerCapacity', existing?.passengerCapacity ?? 4),
    classification: nullableFormString(form, 'classification', existing?.classification ?? 'Private'),
    grossWeight: nullableFormNumber(form, 'grossWeight', existing?.grossWeight),
    currentOdometer: formNumber(form, 'currentOdometer', existing?.currentOdometer ?? 0),
    ownershipStatus: formString(form, 'ownershipStatus', existing?.ownershipStatus ?? 'Owned') as Vehicle['ownershipStatus'],
    status: toApiVehicleStatus(formString(form, 'status', existing?.status ?? 'Available') as VehicleStatus),
    remarks: nullableFormString(form, 'remarks', existing?.remarks),
  }
}

function toApiVehicleStatus(status: VehicleStatus): VehicleApiDto['status'] {
  return status === 'Under Maintenance' ? 'UnderMaintenance' : status
}

function driverPayloadFromForm(form: FormData, existing?: Driver): Omit<DriverApiDto, 'id'> {
  return {
    fullName: formString(form, 'fullName', existing?.fullName).trim(),
    address: nullableFormString(form, 'address', existing?.address),
    contactNumber: nullableFormString(form, 'contactNumber', existing?.contactNumber),
    email: nullableFormString(form, 'email', existing?.email),
    emergencyContact: nullableFormString(form, 'emergencyContact', existing?.emergencyContact),
    licenseNumber: nullableFormString(form, 'licenseNumber', existing?.licenseNumber),
    licenseTypeRestrictions: nullableFormString(form, 'licenseTypeRestrictions', existing?.licenseTypeRestrictions),
    licenseExpirationDate: nullableFormString(form, 'licenseExpirationDate', existing?.licenseExpirationDate),
    status: formString(form, 'status', existing?.status ?? 'Active') as Driver['status'],
    notes: nullableFormString(form, 'notes', existing?.notes),
  }
}

function renterPayloadFromForm(form: FormData, existing?: Renter) {
  return {
    fullName: formString(form, 'fullName', existing?.fullName).trim(),
    address: nullableFormString(form, 'address', existing?.address),
    contactNumber: nullableFormString(form, 'contactNumber', existing?.contactNumber),
    email: nullableFormString(form, 'email', existing?.email),
    birthdate: null,
    validIdType: nullableFormString(form, 'validIdType', existing?.validIdType),
    validIdNumber: nullableFormString(form, 'validIdNumber', existing?.validIdNumber),
    idExpirationDate: null,
    driverLicenseNumber: nullableFormString(form, 'driverLicenseNumber', existing?.driverLicenseNumber),
    emergencyContact: nullableFormString(form, 'emergencyContact', existing?.emergencyContact),
    isWatchlisted: formString(form, 'isWatchlisted', existing?.isWatchlisted ? 'true' : 'false') === 'true',
    notes: nullableFormString(form, 'notes', existing?.notes),
  }
}

function bookingPayloadFromForm(form: FormData, existing?: Booking) {
  return {
    renterId: formString(form, 'renterId', existing?.renterId),
    vehicleId: formString(form, 'vehicleId', existing?.vehicleId),
    driverId: nullableFormString(form, 'driverId', existing?.driverId),
    bookingType: toApiBookingType(formString(form, 'bookingType', existing?.bookingType ?? 'Self-drive') as Booking['bookingType']),
    startDateTime: formDateTimeOffset(form, 'startDateTime', existing?.startDateTime),
    endDateTime: formDateTimeOffset(form, 'endDateTime', existing?.endDateTime),
    pickupLocation: nullableFormString(form, 'pickupLocation', existing?.pickupLocation),
    returnLocation: nullableFormString(form, 'returnLocation', existing?.returnLocation),
    rateType: formString(form, 'rateType', existing?.rateType ?? 'Daily') as ApiRateType,
    rateAmount: formNumber(form, 'rateAmount', existing?.rateAmount ?? 0),
    securityDeposit: formNumber(form, 'securityDeposit', existing?.securityDeposit ?? 0),
    paymentStatus: formString(form, 'paymentStatus', existing?.paymentStatus ?? 'Unpaid') as Booking['paymentStatus'],
    bookingStatus: formString(form, 'bookingStatus', existing?.bookingStatus ?? 'Pending') as BookingStatus,
    notes: nullableFormString(form, 'notes', existing?.notes),
  }
}

function tripPayloadFromForm(form: FormData, existing: Trip) {
  return {
    bookingId: existing.bookingId || null,
    vehicleId: formString(form, 'vehicleId', existing.vehicleId),
    driverId: nullableFormString(form, 'driverId', existing.driverId),
    renterId: formString(form, 'renterId', existing.renterId),
    tripType: toApiTripType(formString(form, 'tripType', existing.tripType) as Trip['tripType']),
    startDateTime: formDateTimeOffset(form, 'startDateTime', existing.startDateTime),
    endDateTime: nullableFormDateTimeOffset(form, 'endDateTime', existing.endDateTime),
    startingOdometer: nullableFormNumber(form, 'startingOdometer', existing.startingOdometer),
    endingOdometer: nullableFormNumber(form, 'endingOdometer', existing.endingOdometer),
    fuelExpense: formNumber(form, 'fuelExpense', existing.fuelExpense),
    tollExpense: formNumber(form, 'tollExpense', existing.tollExpense),
    parkingExpense: formNumber(form, 'parkingExpense', existing.parkingExpense),
    otherExpenses: formNumber(form, 'otherExpenses', existing.otherExpenses),
    grossRevenue: formNumber(form, 'grossRevenue', existing.grossRevenue),
    driverProceedCommission: formNumber(form, 'driverProceedCommission', existing.driverProceedCommission),
    paymentMethod: nullableFormString(form, 'paymentMethod', existing.paymentMethod),
    paymentStatus: formString(form, 'paymentStatus', existing.paymentStatus) as Trip['paymentStatus'],
    remarks: nullableFormString(form, 'remarks', existing.remarks),
    status: formString(form, 'status', existing.status) as TripStatus,
  }
}

function maintenancePayloadFromForm(form: FormData, existing?: MaintenanceSchedule) {
  return {
    vehicleId: formString(form, 'vehicleId', existing?.vehicleId),
    title: formString(form, 'title', existing?.title ?? 'PMS'),
    dueDate: nullableFormString(form, 'dueDate', existing?.dueDate),
    dueOdometer: nullableFormNumber(form, 'dueOdometer', existing?.dueOdometer),
    reminderDaysBefore: 7,
    reminderKilometersBefore: 500,
    status: toApiMaintenanceStatus(formString(form, 'status', existing?.status ?? 'Upcoming') as MaintenanceSchedule['status']),
    vendorShop: nullableFormString(form, 'vendorShop', existing?.vendorShop),
    estimatedCost: nullableFormNumber(form, 'estimatedCost', existing?.estimatedCost),
    notes: nullableFormString(form, 'notes', existing?.notes),
  }
}

function formDateTimeOffset(form: FormData, name: string, fallback?: string) {
  const rawValue = formString(form, name, fallback)
  const date = new Date(rawValue)
  return Number.isNaN(date.getTime()) ? rawValue : date.toISOString()
}

function nullableFormDateTimeOffset(form: FormData, name: string, fallback?: string) {
  const rawValue = formString(form, name, fallback)
  if (!rawValue) {
    return null
  }

  const date = new Date(rawValue)
  return Number.isNaN(date.getTime()) ? rawValue : date.toISOString()
}

function fromApiBookingType(value: ApiBookingType): Booking['bookingType'] {
  switch (value) {
    case 'SelfDrive':
      return 'Self-drive'
    case 'WithDriver':
      return 'With driver'
    case 'DeliveryLogistics':
      return 'Delivery/logistics'
    case 'CorporateLease':
      return 'Corporate lease'
    default:
      return 'Self-drive'
  }
}

function toApiBookingType(value: Booking['bookingType']): ApiBookingType {
  switch (value) {
    case 'Self-drive':
      return 'SelfDrive'
    case 'With driver':
      return 'WithDriver'
    case 'Delivery/logistics':
      return 'DeliveryLogistics'
    case 'Corporate lease':
      return 'CorporateLease'
    default:
      return 'SelfDrive'
  }
}

function fromApiTripType(value: ApiTripType): Trip['tripType'] {
  return value === 'PrivateBooking' ? 'Private booking' : value
}

function toApiTripType(value: Trip['tripType']): ApiTripType {
  return value === 'Private booking' ? 'PrivateBooking' : value
}

function fromApiMaintenanceStatus(value: ApiMaintenanceStatus): MaintenanceSchedule['status'] {
  return value === 'DueSoon' ? 'Due Soon' : value
}

function toApiMaintenanceStatus(value: MaintenanceSchedule['status']): ApiMaintenanceStatus {
  return value === 'Due Soon' ? 'DueSoon' : value
}

function fromApiNotificationType(value: ApiNotificationType): NotificationItem['type'] {
  switch (value) {
    case 'PmsReminder':
      return 'PMS Reminder'
    case 'DocumentExpiry':
      return 'Document Expiry'
    case 'DriverLicenseExpiry':
      return 'Driver License Expiry'
    default:
      return value
  }
}

function dateTimeInputValue(value?: string) {
  return value ? value.slice(0, 16) : undefined
}

function documentEntityOptions(data: AppData) {
  return [
    ...data.vehicles.map((vehicle) => ({ id: vehicle.id, entityType: 'Vehicle', label: `Vehicle - ${vehicle.plateNumber}` })),
    ...data.drivers.map((driver) => ({ id: driver.id, entityType: 'Driver', label: `Driver - ${driver.fullName}` })),
    ...data.renters.map((renter) => ({ id: renter.id, entityType: 'Renter', label: `Renter - ${renter.fullName}` })),
    ...data.bookings.map((booking) => ({ id: booking.id, entityType: 'Booking', label: `Booking - ${booking.referenceNumber}` })),
    ...data.trips.map((trip) => ({ id: trip.id, entityType: 'Trip', label: `Trip - ${trip.tripNumber}` })),
    ...data.maintenance.map((item) => ({ id: item.id, entityType: 'Maintenance', label: `PMS - ${item.title}` })),
  ] satisfies DocumentEntityOption[]
}

function documentTypeOptionsFor(entityType: string) {
  switch (entityType) {
    case 'Vehicle':
      return ['OR', 'CR', 'Insurance Policy', 'Registration', 'Deed of Sale', 'Emission Test', 'LTFRB / CPC', 'PMS Record', 'Warranty', 'Violation / Incident Report', 'Other']
    case 'Driver':
      return ['Driver License Front', 'Driver License Back', 'NBI Clearance', 'Barangay Clearance', 'Police Clearance', 'Medical Certificate', 'Training Certificate', 'Other']
    case 'Renter':
      return ['Valid ID Front', 'Valid ID Back', 'Driver License', 'Signed Rental Agreement', 'Authorization Letter', 'Other']
    case 'Booking':
      return ['Signed Contract', 'Booking Agreement', 'Deposit Receipt', 'Authorization Document', 'Other']
    case 'Trip':
      return ['Fuel Receipt', 'Toll Receipt', 'Parking Receipt', 'Customer Contract', 'Proof of Delivery', 'Trip Photo', 'Other']
    case 'Maintenance':
      return ['PMS Receipt', 'Vendor Invoice', 'Service Report', 'Parts Receipt', 'Warranty Claim', 'Other']
    default:
      return ['General Document', 'Other']
  }
}

function initials(value?: string) {
  const parts = (value || 'BeezFleet').trim().split(/\s+/).filter(Boolean)
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || 'BF'
}

function normalizeUserProfile(profile: Partial<UserProfile>, session?: AuthSession | null): UserProfile {
  return {
    fullName: profile.fullName || session?.fullName || '',
    email: profile.email || session?.email || '',
    profilePhotoUrl: profile.profilePhotoUrl || '',
    profilePhotoDisplayUrl: profile.profilePhotoDisplayUrl || '',
    gravatarUrl: profile.gravatarUrl || '',
    address: profile.address || '',
    mobileNumber: profile.mobileNumber || '',
    jobTitle: profile.jobTitle || 'Owner / Admin',
    emergencyContact: profile.emergencyContact || '',
    timezone: profile.timezone || profile.timeZone || 'Asia/Manila',
    timeZone: profile.timeZone || profile.timezone || 'Asia/Manila',
    dateFormat: profile.dateFormat || 'MMM d, yyyy',
    notificationEmail: profile.notificationEmail || profile.email || session?.email || '',
  }
}

function avatarSources(profile: UserProfile, clientGravatarUrl: string) {
  return [profile.profilePhotoDisplayUrl, profile.gravatarUrl, clientGravatarUrl]
    .map(displayableAssetUrl)
    .filter(Boolean) as string[]
}

function displayableAssetUrl(value?: string | null) {
  const rawValue = value?.trim()
  if (!rawValue) {
    return ''
  }

  if (/^(https?:|blob:|data:)/i.test(rawValue)) {
    return rawValue
  }

  if (rawValue.startsWith('/')) {
    return `${apiBaseUrl}${rawValue}`
  }

  return ''
}

async function gravatarUrlFromEmail(email?: string) {
  const normalized = email?.trim().toLowerCase()
  if (!normalized || !window.crypto?.subtle) {
    return ''
  }

  const bytes = await window.crypto.subtle.digest('SHA-256', new TextEncoder().encode(normalized))
  const hash = Array.from(new Uint8Array(bytes))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')

  return `https://www.gravatar.com/avatar/${hash}?s=160&d=404`
}

function SafeImage({
  src,
  alt,
  fallback,
  loading = 'lazy',
}: {
  src?: string | null
  alt: string
  fallback: React.ReactNode
  loading?: 'lazy' | 'eager'
}) {
  const displayUrl = displayableAssetUrl(src)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    setFailed(false)
  }, [displayUrl])

  if (!displayUrl || failed) {
    return <div className="image-fallback">{fallback}</div>
  }

  return (
    <img
      src={displayUrl}
      alt={alt}
      loading={loading}
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
    />
  )
}

function AvatarImage({ sources, fallback }: { sources: string[]; fallback: string }) {
  const [loadedSrc, setLoadedSrc] = useState('')
  const sourceKey = sources.join('|')

  useEffect(() => {
    let cancelled = false
    const candidates = Array.from(new Set(sources.filter(Boolean)))

    setLoadedSrc('')

    const tryCandidate = (index: number) => {
      const src = candidates[index]
      if (!src || cancelled) {
        return
      }

      const image = new Image()
      image.referrerPolicy = 'no-referrer'
      image.onload = () => {
        if (!cancelled) {
          setLoadedSrc(src)
        }
      }
      image.onerror = () => tryCandidate(index + 1)
      image.src = src
    }

    tryCandidate(0)

    return () => {
      cancelled = true
    }
  }, [sourceKey])

  if (!loadedSrc) {
    return <>{fallback}</>
  }

  return <img src={loadedSrc} alt="" referrerPolicy="no-referrer" />
}

export default App
