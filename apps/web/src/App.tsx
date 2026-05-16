import {
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  Bell,
  Building2,
  CalendarDays,
  Camera,
  Car,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  Edit3,
  FileText,
  Filter,
  Fuel,
  History,
  KeyRound,
  LayoutDashboard,
  LogOut,
  MailCheck,
  Menu,
  Plus,
  Route as RouteIcon,
  Save,
  Search,
  Settings as SettingsIcon,
  ShieldCheck,
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
  { to: '/notifications', label: 'Notifications', icon: Bell },
  { to: '/reports', label: 'Reports', icon: BarChart3 },
  { to: '/settings', label: 'Settings', icon: SettingsIcon },
]

const platformNavItems = [
  { to: '/admin/tenants', label: 'Tenants', icon: ShieldCheck },
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

type AppData = {
  vehicles: Vehicle[]
  drivers: Driver[]
  renters: Renter[]
  bookings: Booking[]
  trips: Trip[]
  maintenance: MaintenanceSchedule[]
  documents: DocumentAttachment[]
  notifications: NotificationItem[]
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

const authStorageKey = 'metrobeez.auth'
const apiBaseUrl = ((import.meta.env.VITE_API_BASE_URL as string | undefined)
  ?? (['localhost', '127.0.0.1'].includes(window.location.hostname) ? 'http://localhost:5117' : '')).replace(/\/$/, '')
const s3AssetRegion = ((import.meta.env.VITE_AWS_REGION as string | undefined) ?? 'ap-southeast-1').trim()
const s3PublicBaseUrl = ((import.meta.env.VITE_S3_PUBLIC_BASE_URL as string | undefined) ?? '').replace(/\/$/, '')

function loadStoredSession() {
  try {
    const value = window.localStorage.getItem(authStorageKey)
    return value ? (JSON.parse(value) as AuthSession) : null
  } catch {
    window.localStorage.removeItem(authStorageKey)
    return null
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
    throw new Error(readApiError(text, response.statusText))
  }

  return (text ? JSON.parse(text) : undefined) as TResponse
}

async function getJson<TResponse>(path: string, token?: string) {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })

  const text = await response.text()
  if (!response.ok) {
    throw new Error(readApiError(text, response.statusText))
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
    throw new Error(readApiError(text, response.statusText))
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
    throw new Error(readApiError(text, response.statusText))
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
    throw new Error(readApiError(text, response.statusText))
  }

  return (text ? JSON.parse(text) : undefined) as TResponse
}

function readApiError(text: string, fallback: string) {
  if (!text) return fallback
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
  const [auditEntries, setAuditEntries] = useState(initialAuditEntries)
  const [toast, setToast] = useState<Toast | null>(null)
  const [clientGravatarUrl, setClientGravatarUrl] = useState('')

  const data = { vehicles, drivers, renters, bookings, trips, maintenance, documents, notifications, audits: auditEntries }
  const showToast = (nextToast: Toast) => {
    setToast(nextToast)
    window.setTimeout(() => setToast(null), 3200)
  }
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
          <Route path="/dashboard" element={session?.role === 'SuperAdmin' ? <Navigate to="/admin/tenants" replace /> : <DashboardPage data={data} />} />
          <Route
            path="/vehicles"
            element={<VehiclesPage vehicles={vehicles} setVehicles={setVehicles} documents={documents} trips={trips} />}
          />
          <Route path="/vehicles/:id" element={<VehicleDetailsPage data={data} setVehicles={setVehicles} setDocuments={setDocuments} session={session} showToast={showToast} />} />
          <Route path="/drivers" element={<DriversPage drivers={drivers} setDrivers={setDrivers} trips={trips} />} />
          <Route path="/drivers/:id" element={<DriverDetailsPage data={data} setDrivers={setDrivers} setDocuments={setDocuments} session={session} showToast={showToast} />} />
          <Route path="/renters" element={<RentersPage renters={renters} setRenters={setRenters} data={data} />} />
          <Route path="/renters/:id" element={<RenterDetailsPage data={data} setRenters={setRenters} setDocuments={setDocuments} session={session} showToast={showToast} />} />
          <Route
            path="/bookings"
            element={
              <BookingsPage
                data={data}
                setBookings={setBookings}
                setTrips={setTrips}
                showToast={showToast}
              />
            }
          />
          <Route path="/bookings/:id" element={<BookingDetailsPage data={data} setBookings={setBookings} setDocuments={setDocuments} session={session} showToast={showToast} />} />
          <Route
            path="/trips"
            element={<TripsPage data={data} setTrips={setTrips} setVehicles={setVehicles} showToast={showToast} appendTripAudit={appendTripAudit} />}
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
            path="/notifications"
            element={<NotificationsPage notifications={notifications} setNotifications={setNotifications} />}
          />
          <Route path="/reports" element={<ReportsPage data={data} />} />
          <Route
            path="/settings"
            element={<SettingsPage company={company} setCompany={setCompany} session={session} setSession={setSession} userProfile={userProfile} clientGravatarUrl={clientGravatarUrl} setUserProfile={setUserProfile} showToast={showToast} />}
          />
        </Route>
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
        <Panel title="Driver activity" action={<Link to="/notifications">Open</Link>}>
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
              <tr key={tenant.id}>
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
                    <select value={tenant.status} onChange={(event) => updateTenantStatus(tenant, event.target.value as TenantStatus)}>
                      {tenantStatusOptions.map((status) => <option key={status} value={status}>{statusLabel(status)}</option>)}
                    </select>
                  </label>
                </td>
                <td>{dateText(tenant.createdAt)}</td>
                <td className="table-actions">
                  <button className="icon-button danger" type="button" title="Delete tenant" onClick={() => setDeleteTarget(tenant)}><Trash2 size={16} /></button>
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

function VehiclesPage({
  vehicles,
  setVehicles,
}: {
  vehicles: Vehicle[]
  setVehicles: React.Dispatch<React.SetStateAction<Vehicle[]>>
  documents: DocumentAttachment[]
  trips: Trip[]
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

  const addVehicle = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setVehicles((current) => [...current, vehicleFromForm(form)])
    setModalOpen(false)
  }
  const editingVehicle = vehicles.find((vehicle) => vehicle.id === editId)
  const editVehicle = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!editingVehicle) return
    const form = new FormData(event.currentTarget)
    setVehicles((current) => current.map((vehicle) => vehicle.id === editingVehicle.id ? vehicleFromForm(form, editingVehicle) : vehicle))
    setEditId(null)
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
        detail="This will soft-delete the vehicle record in the backend pattern."
        onCancel={() => setDeleteId(null)}
        onConfirm={() => {
          setVehicles((current) => current.filter((vehicle) => vehicle.id !== deleteId))
          setDeleteId(null)
        }}
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
          onSubmit={(event) => {
            event.preventDefault()
            const form = new FormData(event.currentTarget)
            setVehicles((current) => current.map((item) => item.id === vehicle.id ? vehicleFromForm(form, vehicle) : item))
            setEditOpen(false)
            showToast({ title: 'Vehicle updated', detail: `${vehicle.plateNumber} changes were saved.` })
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
}: {
  drivers: Driver[]
  setDrivers: React.Dispatch<React.SetStateAction<Driver[]>>
  trips: Trip[]
}) {
  const [query, setQuery] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const filtered = drivers.filter((driver) => [driver.fullName, driver.email, driver.licenseNumber].join(' ').toLowerCase().includes(query.toLowerCase()))

  const addDriver = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setDrivers((current) => [...current, driverFromForm(form)])
    setModalOpen(false)
  }
  const editingDriver = drivers.find((driver) => driver.id === editId)
  const editDriver = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!editingDriver) return
    const form = new FormData(event.currentTarget)
    setDrivers((current) => current.map((driver) => driver.id === editingDriver.id ? driverFromForm(form, editingDriver) : driver))
    setEditId(null)
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
          onSubmit={(event) => {
            event.preventDefault()
            const form = new FormData(event.currentTarget)
            setDrivers((current) => current.map((item) => item.id === driver.id ? driverFromForm(form, driver) : item))
            setEditOpen(false)
            showToast({ title: 'Driver updated', detail: `${driver.fullName} changes were saved.` })
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
}: {
  renters: Renter[]
  setRenters: React.Dispatch<React.SetStateAction<Renter[]>>
  data: AppData
}) {
  const [query, setQuery] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const filtered = renters.filter((renter) => [renter.fullName, renter.email, renter.validIdNumber].join(' ').toLowerCase().includes(query.toLowerCase()))

  const addRenter = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setRenters((current) => [...current, renterFromForm(form)])
    setModalOpen(false)
  }
  const editingRenter = renters.find((renter) => renter.id === editId)
  const editRenter = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!editingRenter) return
    const form = new FormData(event.currentTarget)
    setRenters((current) => current.map((renter) => renter.id === editingRenter.id ? renterFromForm(form, editingRenter) : renter))
    setEditId(null)
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
          onSubmit={(event) => {
            event.preventDefault()
            const form = new FormData(event.currentTarget)
            setRenters((current) => current.map((item) => item.id === renter.id ? renterFromForm(form, renter) : item))
            setEditOpen(false)
            showToast({ title: 'Renter updated', detail: `${renter.fullName} changes were saved.` })
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
  showToast,
}: {
  data: AppData
  setBookings: React.Dispatch<React.SetStateAction<Booking[]>>
  setTrips: React.Dispatch<React.SetStateAction<Trip[]>>
  showToast: (toast: Toast) => void
}) {
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<'All' | BookingStatus>('All')
  const [modalOpen, setModalOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const filtered = data.bookings
    .filter((booking) => status === 'All' || booking.bookingStatus === status)
    .filter((booking) => [booking.referenceNumber, renterName(data, booking.renterId), vehicleLabel(data, booking.vehicleId)].join(' ').toLowerCase().includes(query.toLowerCase()))

  const addBooking = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const vehicleId = String(form.get('vehicleId'))
    const startDateTime = String(form.get('startDateTime'))
    const endDateTime = String(form.get('endDateTime'))
    const conflict = data.bookings.some((booking) => booking.vehicleId === vehicleId && ['Pending', 'Confirmed', 'Active'].includes(booking.bookingStatus) && booking.startDateTime < endDateTime && booking.endDateTime > startDateTime)
    if (conflict) {
      showToast({ title: 'Booking conflict', detail: 'That vehicle already has an overlapping booking.' })
      return
    }

    setBookings((current) => [...current, bookingFromForm(form, undefined, `BK-2026-${String(current.length + 1).padStart(4, '0')}`)])
    setModalOpen(false)
  }
  const editingBooking = data.bookings.find((booking) => booking.id === editId)
  const editBooking = (event: FormEvent<HTMLFormElement>) => {
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

    setBookings((current) => current.map((booking) => booking.id === editingBooking.id ? bookingFromForm(form, editingBooking) : booking))
    setEditId(null)
    showToast({ title: 'Booking updated', detail: `${editingBooking.referenceNumber} changes were saved.` })
  }

  const convertToTrip = (booking: Booking) => {
    const tripExists = data.trips.some((trip) => trip.bookingReference === booking.referenceNumber)
    if (tripExists) return
    setTrips((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        tripNumber: `TR-2026-${String(current.length + 1).padStart(4, '0')}`,
        bookingReference: booking.referenceNumber,
        vehicleId: booking.vehicleId,
        driverId: booking.driverId,
        renterId: booking.renterId,
        tripType: booking.bookingType === 'Delivery/logistics' ? 'Delivery' : 'Rental',
        startDateTime: booking.startDateTime,
        endDateTime: booking.endDateTime,
        fuelExpense: 0,
        tollExpense: 0,
        parkingExpense: 0,
        otherExpenses: 0,
        grossRevenue: booking.rateAmount,
        driverProceedCommission: 0,
        paymentMethod: '',
        paymentStatus: booking.paymentStatus,
        remarks: 'Converted from booking',
        status: 'Scheduled',
      },
    ])
    showToast({ title: 'Trip created', detail: `${booking.referenceNumber} was converted to a scheduled trip.` })
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
          onSubmit={(event) => {
            event.preventDefault()
            const form = new FormData(event.currentTarget)
            setBookings((current) => current.map((item) => item.id === booking.id ? bookingFromForm(form, booking) : item))
            setEditOpen(false)
            showToast({ title: 'Booking updated', detail: `${booking.referenceNumber} changes were saved.` })
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
  showToast,
  appendTripAudit,
}: {
  data: AppData
  setTrips: React.Dispatch<React.SetStateAction<Trip[]>>
  setVehicles: React.Dispatch<React.SetStateAction<Vehicle[]>>
  showToast: (toast: Toast) => void
  appendTripAudit: (entityId: string, action: string, summary: string) => void
}) {
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<'All' | TripStatus>('All')
  const [editId, setEditId] = useState<string | null>(null)
  const filtered = data.trips
    .filter((trip) => status === 'All' || trip.status === status)
    .filter((trip) => [trip.tripNumber, trip.bookingReference, renterName(data, trip.renterId), vehicleLabel(data, trip.vehicleId)].join(' ').toLowerCase().includes(query.toLowerCase()))

  const startTrip = (trip: Trip) => {
    setTrips((current) => current.map((item) => item.id === trip.id ? { ...item, status: 'Active', startingOdometer: item.startingOdometer || data.vehicles.find((vehicle) => vehicle.id === item.vehicleId)?.currentOdometer || 0 } : item))
    setVehicles((current) => current.map((vehicle) => vehicle.id === trip.vehicleId ? { ...vehicle, status: 'Booked' } : vehicle))
    appendTripAudit(trip.id, 'Trip started', 'Trip status moved to Active and starting odometer was captured.')
    showToast({ title: 'Trip started', detail: `${trip.tripNumber} is now active.` })
  }

  const completeTrip = (trip: Trip) => {
    const endingOdometer = (trip.startingOdometer || 0) + 180
    setTrips((current) => current.map((item) => item.id === trip.id ? { ...item, status: 'Completed', endingOdometer, endDateTime: new Date().toISOString(), fuelExpense: item.fuelExpense || 1800, tollExpense: item.tollExpense || 450, driverProceedCommission: item.driverProceedCommission || 1200, paymentStatus: 'Paid' } : item))
    setVehicles((current) => current.map((vehicle) => vehicle.id === trip.vehicleId ? { ...vehicle, status: 'Available', currentOdometer: Math.max(vehicle.currentOdometer, endingOdometer) } : vehicle))
    appendTripAudit(trip.id, 'Trip completed', 'Ending odometer, expenses, payment status, and vehicle availability were updated.')
    showToast({ title: 'Trip completed', detail: `${trip.tripNumber} expenses and odometer were updated.` })
  }
  const editingTrip = data.trips.find((trip) => trip.id === editId)
  const editTrip = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!editingTrip) return
    const form = new FormData(event.currentTarget)
    setTrips((current) => current.map((trip) => trip.id === editingTrip.id ? tripFromForm(form, editingTrip) : trip))
    appendTripAudit(editingTrip.id, 'Trip edited', 'Trip schedule, assignments, odometer, expenses, or payment fields were changed.')
    setEditId(null)
    showToast({ title: 'Trip updated', detail: `${editingTrip.tripNumber} changes were saved.` })
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
          onSubmit={(event) => {
            event.preventDefault()
            const form = new FormData(event.currentTarget)
            setTrips((current) => current.map((item) => item.id === trip.id ? tripFromForm(form, trip) : item))
            appendTripAudit(trip.id, 'Trip edited', 'Trip details were updated from the detail page.')
            setEditOpen(false)
            showToast({ title: 'Trip updated', detail: `${trip.tripNumber} changes were saved.` })
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
  const addSchedule = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setMaintenance((current) => [...current, maintenanceFromForm(form)])
    setModalOpen(false)
  }
  const editingSchedule = maintenance.find((item) => item.id === editId)
  const editSchedule = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!editingSchedule) return
    const form = new FormData(event.currentTarget)
    setMaintenance((current) => current.map((item) => item.id === editingSchedule.id ? maintenanceFromForm(form, editingSchedule) : item))
    setEditId(null)
    showToast({ title: 'PMS updated', detail: `${editingSchedule.title} changes were saved.` })
  }
  const uploadMaintenanceDocument = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!uploadTarget) return

    setUploading(true)
    try {
      const uploaded = await uploadDocumentFromForm(new FormData(event.currentTarget), session)
      setDocuments((current) => [uploaded, ...current])
      setUploadTarget(null)
      showToast({ title: 'PMS document uploaded', detail: `${uploaded.originalFileName} was saved to S3.` })
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
      showToast({ title: 'Document uploaded', detail: `${uploaded.originalFileName} was saved to S3.` })
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
                {doc.fileUrl && doc.fileUrl !== '#'
                  ? <a className="icon-button" href={doc.fileUrl} target="_blank" rel="noreferrer" title="Open document"><FileText size={16} /></a>
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

function NotificationsPage({
  notifications,
  setNotifications,
}: {
  notifications: NotificationItem[]
  setNotifications: React.Dispatch<React.SetStateAction<NotificationItem[]>>
}) {
  const [query, setQuery] = useState('')
  const filtered = notifications.filter((item) => [item.title, item.message, item.type].join(' ').toLowerCase().includes(query.toLowerCase()))
  return (
    <Page>
      <PageHeader eyebrow="Alerts" title="Notifications" action={<button className="primary-button" type="button" onClick={() => setNotifications((current) => current.map((item) => ({ ...item, isRead: true })))}><CheckCircle2 size={18} /> Mark all read</button>} />
      <Toolbar query={query} setQuery={setQuery} placeholder="Search notifications" />
      <Table>
        <thead>
          <tr><th>Notification</th><th>Type</th><th>Created</th><th>Status</th><th aria-label="Actions" /></tr>
        </thead>
        <tbody>
          {filtered.map((item) => (
            <tr key={item.id}>
              <td>{item.title}<small>{item.message}</small></td>
              <td>{item.type}</td>
              <td>{dateText(item.createdAt)}</td>
              <td>{item.isRead ? <Badge status="Clear" /> : <span className="unread-pill">New</span>}</td>
              <td className="table-actions">
                {!item.isRead && (
                  <button className="icon-button" type="button" title="Mark read" onClick={() => setNotifications((current) => current.map((notification) => notification.id === item.id ? { ...notification, isRead: true } : notification))}>
                    <CheckCircle2 size={16} />
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    </Page>
  )
}

function ReportsPage({ data }: { data: AppData }) {
  const gross = sum(data.trips.map((trip) => trip.grossRevenue))
  const net = sum(data.trips.map((trip) => netProfit(trip)))
  const maxVehicleRevenue = Math.max(...data.vehicles.map((vehicle) => vehicleRevenue(data, vehicle.id)), 1)
  return (
    <Page>
      <PageHeader eyebrow="Financials" title="Reports" />
      <section className="metric-grid reports">
        <MetricCard icon={CircleDollarSign} label="Gross revenue" value={money.format(gross)} tone="green" />
        <MetricCard icon={WalletCards} label="Net profit" value={money.format(net)} tone="blue" />
        <MetricCard icon={Fuel} label="Fuel expenses" value={money.format(sum(data.trips.map((trip) => trip.fuelExpense)))} tone="red" />
        <MetricCard icon={Wrench} label="Maintenance estimate" value={money.format(sum(data.maintenance.map((item) => item.estimatedCost)))} tone="gold" />
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
      </TwoColumn>
    </Page>
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

    const form = new FormData(event.currentTarget)
    const currentPassword = String(form.get('currentPassword'))
    const newPassword = String(form.get('newPassword'))
    const confirmPassword = String(form.get('confirmPassword'))
    if (newPassword !== confirmPassword) {
      showToast({ title: 'Password not changed', detail: 'New password and confirmation do not match.' })
      return
    }

    try {
      await postJson('/api/auth/change-password', { currentPassword, newPassword }, session.token)
      event.currentTarget.reset()
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
              <input name="profilePhotoFile" type="file" accept="image/*" onChange={handleProfilePhotoChange} />
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
      <form className="auth-form" onSubmit={submit}>
        <Field label="Email" name="email" type="email" required />
        <Field label="Password" name="password" type="password" required />
        <button className="primary-button full" type="submit" disabled={submitting}><ShieldCheck size={18} /> {submitting ? 'Logging in...' : 'Login'}</button>
        <Link to="/forgot-password">Forgot password?</Link>
        <Link to="/register">Create an account</Link>
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
          <label className="field full">
            <span>Related record</span>
            <input value={`${lockedEntity.entityType} - ${lockedEntity.label}`} readOnly />
          </label>
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
        <input name="file" type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx,image/*,application/pdf" required />
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
      showToast({ title: 'Document uploaded', detail: `${uploaded.originalFileName} was saved to S3.` })
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
            {doc.fileUrl && doc.fileUrl !== '#'
              ? <a className="secondary-button compact-button" href={doc.fileUrl} target="_blank" rel="noreferrer">Open</a>
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

function statusLabel(status: string) {
  return status.replace(/([a-z])([A-Z])/g, '$1 $2')
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

function formNumber(form: FormData, name: string, fallback = 0) {
  const value = Number(form.get(name))
  return Number.isFinite(value) ? value : fallback
}

function formOptionalNumber(form: FormData, name: string) {
  const raw = form.get(name)
  if (raw === null || raw === '') return undefined
  const value = Number(raw)
  return Number.isFinite(value) ? value : undefined
}

function vehicleFromForm(form: FormData, existing?: Vehicle): Vehicle {
  return {
    id: existing?.id ?? crypto.randomUUID(),
    plateNumber: formString(form, 'plateNumber', existing?.plateNumber),
    mvFileNumber: formString(form, 'mvFileNumber', existing?.mvFileNumber),
    engineNumber: formString(form, 'engineNumber', existing?.engineNumber),
    chassisVinNumber: formString(form, 'chassisVinNumber', existing?.chassisVinNumber),
    make: formString(form, 'make', existing?.make),
    model: formString(form, 'model', existing?.model),
    seriesVariant: formString(form, 'seriesVariant', existing?.seriesVariant),
    yearModel: formNumber(form, 'yearModel', existing?.yearModel ?? new Date().getFullYear()),
    color: formString(form, 'color', existing?.color),
    vehicleType: formString(form, 'vehicleType', existing?.vehicleType ?? 'Sedan'),
    bodyType: formString(form, 'bodyType', existing?.bodyType),
    fuelType: formString(form, 'fuelType', existing?.fuelType ?? 'Gasoline'),
    passengerCapacity: formNumber(form, 'passengerCapacity', existing?.passengerCapacity ?? 4),
    classification: formString(form, 'classification', existing?.classification ?? 'Private'),
    grossWeight: formString(form, 'grossWeight', existing?.grossWeight),
    currentOdometer: formNumber(form, 'currentOdometer', existing?.currentOdometer ?? 0),
    ownershipStatus: formString(form, 'ownershipStatus', existing?.ownershipStatus ?? 'Owned') as Vehicle['ownershipStatus'],
    status: formString(form, 'status', existing?.status ?? 'Available') as VehicleStatus,
    remarks: formString(form, 'remarks', existing?.remarks),
  }
}

function driverFromForm(form: FormData, existing?: Driver): Driver {
  return {
    id: existing?.id ?? crypto.randomUUID(),
    fullName: formString(form, 'fullName', existing?.fullName),
    address: formString(form, 'address', existing?.address),
    contactNumber: formString(form, 'contactNumber', existing?.contactNumber),
    email: formString(form, 'email', existing?.email),
    emergencyContact: formString(form, 'emergencyContact', existing?.emergencyContact),
    licenseNumber: formString(form, 'licenseNumber', existing?.licenseNumber),
    licenseTypeRestrictions: formString(form, 'licenseTypeRestrictions', existing?.licenseTypeRestrictions),
    licenseExpirationDate: formString(form, 'licenseExpirationDate', existing?.licenseExpirationDate),
    status: formString(form, 'status', existing?.status ?? 'Active') as Driver['status'],
    notes: formString(form, 'notes', existing?.notes),
  }
}

function renterFromForm(form: FormData, existing?: Renter): Renter {
  return {
    id: existing?.id ?? crypto.randomUUID(),
    fullName: formString(form, 'fullName', existing?.fullName),
    address: formString(form, 'address', existing?.address),
    contactNumber: formString(form, 'contactNumber', existing?.contactNumber),
    email: formString(form, 'email', existing?.email),
    validIdType: formString(form, 'validIdType', existing?.validIdType),
    validIdNumber: formString(form, 'validIdNumber', existing?.validIdNumber),
    driverLicenseNumber: formString(form, 'driverLicenseNumber', existing?.driverLicenseNumber),
    emergencyContact: formString(form, 'emergencyContact', existing?.emergencyContact),
    isWatchlisted: formString(form, 'isWatchlisted', existing?.isWatchlisted ? 'true' : 'false') === 'true',
    notes: formString(form, 'notes', existing?.notes),
  }
}

function bookingFromForm(form: FormData, existing?: Booking, referenceNumber?: string): Booking {
  return {
    id: existing?.id ?? crypto.randomUUID(),
    referenceNumber: existing?.referenceNumber ?? referenceNumber ?? 'BK-2026-0001',
    renterId: formString(form, 'renterId', existing?.renterId),
    vehicleId: formString(form, 'vehicleId', existing?.vehicleId),
    driverId: formString(form, 'driverId', existing?.driverId) || undefined,
    bookingType: formString(form, 'bookingType', existing?.bookingType ?? 'Self-drive') as Booking['bookingType'],
    startDateTime: formString(form, 'startDateTime', existing?.startDateTime),
    endDateTime: formString(form, 'endDateTime', existing?.endDateTime),
    pickupLocation: formString(form, 'pickupLocation', existing?.pickupLocation),
    returnLocation: formString(form, 'returnLocation', existing?.returnLocation),
    rateType: formString(form, 'rateType', existing?.rateType ?? 'Daily') as Booking['rateType'],
    rateAmount: formNumber(form, 'rateAmount', existing?.rateAmount ?? 0),
    securityDeposit: formNumber(form, 'securityDeposit', existing?.securityDeposit ?? 0),
    paymentStatus: formString(form, 'paymentStatus', existing?.paymentStatus ?? 'Unpaid') as Booking['paymentStatus'],
    bookingStatus: formString(form, 'bookingStatus', existing?.bookingStatus ?? 'Pending') as BookingStatus,
    notes: formString(form, 'notes', existing?.notes),
  }
}

function tripFromForm(form: FormData, existing: Trip): Trip {
  return {
    ...existing,
    bookingReference: formString(form, 'bookingReference', existing.bookingReference),
    vehicleId: formString(form, 'vehicleId', existing.vehicleId),
    driverId: formString(form, 'driverId', existing.driverId) || undefined,
    renterId: formString(form, 'renterId', existing.renterId),
    tripType: formString(form, 'tripType', existing.tripType) as Trip['tripType'],
    startDateTime: formString(form, 'startDateTime', existing.startDateTime),
    endDateTime: formString(form, 'endDateTime', existing.endDateTime),
    startingOdometer: formOptionalNumber(form, 'startingOdometer'),
    endingOdometer: formOptionalNumber(form, 'endingOdometer'),
    fuelExpense: formNumber(form, 'fuelExpense', existing.fuelExpense),
    tollExpense: formNumber(form, 'tollExpense', existing.tollExpense),
    parkingExpense: formNumber(form, 'parkingExpense', existing.parkingExpense),
    otherExpenses: formNumber(form, 'otherExpenses', existing.otherExpenses),
    grossRevenue: formNumber(form, 'grossRevenue', existing.grossRevenue),
    driverProceedCommission: formNumber(form, 'driverProceedCommission', existing.driverProceedCommission),
    paymentMethod: formString(form, 'paymentMethod', existing.paymentMethod),
    paymentStatus: formString(form, 'paymentStatus', existing.paymentStatus) as Trip['paymentStatus'],
    remarks: formString(form, 'remarks', existing.remarks),
    status: formString(form, 'status', existing.status) as TripStatus,
  }
}

function maintenanceFromForm(form: FormData, existing?: MaintenanceSchedule): MaintenanceSchedule {
  return {
    id: existing?.id ?? crypto.randomUUID(),
    vehicleId: formString(form, 'vehicleId', existing?.vehicleId),
    title: formString(form, 'title', existing?.title ?? 'PMS'),
    dueDate: formString(form, 'dueDate', existing?.dueDate),
    dueOdometer: formNumber(form, 'dueOdometer', existing?.dueOdometer ?? 0),
    status: formString(form, 'status', existing?.status ?? 'Upcoming') as MaintenanceSchedule['status'],
    vendorShop: formString(form, 'vendorShop', existing?.vendorShop),
    estimatedCost: formNumber(form, 'estimatedCost', existing?.estimatedCost ?? 0),
    notes: formString(form, 'notes', existing?.notes),
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
  return [profile.profilePhotoDisplayUrl, profile.profilePhotoUrl, profile.gravatarUrl, clientGravatarUrl]
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

  if (rawValue.startsWith('s3://')) {
    const withoutScheme = rawValue.slice('s3://'.length)
    const slashIndex = withoutScheme.indexOf('/')
    if (slashIndex <= 0) {
      return ''
    }

    const bucket = withoutScheme.slice(0, slashIndex)
    let key = withoutScheme.slice(slashIndex + 1)
    if (s3PublicBaseUrl) {
      const prefixMatch = s3PublicBaseUrl.match(/\/([^/]+)$/)
      const trailingPrefix = prefixMatch?.[1]
      if (trailingPrefix && key.startsWith(`${trailingPrefix}/`)) {
        key = key.slice(trailingPrefix.length + 1)
      }

      return `${s3PublicBaseUrl}/${encodeURI(key)}`
    }

    return `https://${bucket}.s3.${s3AssetRegion}.amazonaws.com/${encodeURI(key)}`
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
