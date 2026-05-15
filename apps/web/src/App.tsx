import {
  AlertTriangle,
  BarChart3,
  Bell,
  Building2,
  CalendarDays,
  Car,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  FileText,
  Filter,
  Fuel,
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
import { type FormEvent, useMemo, useState } from 'react'
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

const navItems = [
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

type CompanyProfile = {
  name: string
  address: string
  contactNumber: string
}

type Toast = {
  title: string
  detail: string
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
}

function App() {
  const [authenticated, setAuthenticated] = useState(true)
  const [company, setCompany] = useState<CompanyProfile>({
    name: 'MetroBeez Demo Fleet',
    address: 'Metro Manila, Philippines',
    contactNumber: '+63 2 8555 0100',
  })
  const [vehicles, setVehicles] = useState(vehiclesSeed)
  const [drivers, setDrivers] = useState(driversSeed)
  const [renters, setRenters] = useState(rentersSeed)
  const [bookings, setBookings] = useState(bookingsSeed)
  const [trips, setTrips] = useState(tripsSeed)
  const [maintenance, setMaintenance] = useState(maintenanceSeed)
  const [documents, setDocuments] = useState(documentsSeed)
  const [notifications, setNotifications] = useState(notificationsSeed)
  const [toast, setToast] = useState<Toast | null>(null)

  const data = { vehicles, drivers, renters, bookings, trips, maintenance, documents, notifications }
  const showToast = (nextToast: Toast) => {
    setToast(nextToast)
    window.setTimeout(() => setToast(null), 3200)
  }

  return (
    <>
      <Routes>
        <Route path="/login" element={<LoginPage onLogin={() => setAuthenticated(true)} showToast={showToast} />} />
        <Route path="/register" element={<RegisterPage showToast={showToast} />} />
        <Route path="/verify-email" element={<VerifyEmailPage showToast={showToast} />} />
        <Route
          path="/onboarding"
          element={<OnboardingPage company={company} setCompany={setCompany} showToast={showToast} />}
        />
        <Route
          element={
            <Shell
              authenticated={authenticated}
              company={company}
              notifications={notifications}
              onLogout={() => setAuthenticated(false)}
            />
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage data={data} />} />
          <Route
            path="/vehicles"
            element={<VehiclesPage vehicles={vehicles} setVehicles={setVehicles} documents={documents} trips={trips} />}
          />
          <Route path="/vehicles/:id" element={<VehicleDetailsPage data={data} />} />
          <Route path="/drivers" element={<DriversPage drivers={drivers} setDrivers={setDrivers} trips={trips} />} />
          <Route path="/drivers/:id" element={<DriverDetailsPage data={data} />} />
          <Route path="/renters" element={<RentersPage renters={renters} setRenters={setRenters} data={data} />} />
          <Route path="/renters/:id" element={<RenterDetailsPage data={data} />} />
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
          <Route path="/bookings/:id" element={<BookingDetailsPage data={data} />} />
          <Route
            path="/trips"
            element={<TripsPage data={data} setTrips={setTrips} setVehicles={setVehicles} showToast={showToast} />}
          />
          <Route path="/trips/:id" element={<TripDetailsPage data={data} />} />
          <Route
            path="/maintenance"
            element={<MaintenancePage data={data} maintenance={maintenance} setMaintenance={setMaintenance} />}
          />
          <Route
            path="/documents"
            element={<DocumentsPage documents={documents} setDocuments={setDocuments} data={data} />}
          />
          <Route
            path="/notifications"
            element={<NotificationsPage notifications={notifications} setNotifications={setNotifications} />}
          />
          <Route path="/reports" element={<ReportsPage data={data} />} />
          <Route
            path="/settings"
            element={<SettingsPage company={company} setCompany={setCompany} showToast={showToast} />}
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
  notifications,
  onLogout,
}: {
  authenticated: boolean
  company: CompanyProfile
  notifications: NotificationItem[]
  onLogout: () => void
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const navigate = useNavigate()

  if (!authenticated) {
    return <Navigate to="/login" replace />
  }

  return (
    <div className="app-shell">
      <aside className={`sidebar ${menuOpen ? 'is-open' : ''}`}>
        <Link className="brand" to="/dashboard" onClick={() => setMenuOpen(false)}>
          <span className="brand-mark">MB</span>
          <span>
            <strong>MetroBeez FMS</strong>
            <small>Fleet command center</small>
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
            <span>{company.name}</span>
          </div>
          <label className="global-search">
            <Search size={17} />
            <input placeholder="Search fleet records" />
          </label>
          <button className="icon-button notification-button" type="button" title="Notifications">
            <Bell size={19} />
            {notifications.some((item) => !item.isRead) && <span className="notification-dot" />}
          </button>
          <button className="avatar-button" type="button" title="Account menu" onClick={() => navigate('/settings')}>
            HA
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
        action={<button className="primary-button" type="button"><Plus size={18} /> New booking</button>}
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
    setVehicles((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        plateNumber: String(form.get('plateNumber')),
        mvFileNumber: '',
        engineNumber: '',
        chassisVinNumber: '',
        make: String(form.get('make')),
        model: String(form.get('model')),
        seriesVariant: String(form.get('seriesVariant') || ''),
        yearModel: Number(form.get('yearModel') || new Date().getFullYear()),
        color: String(form.get('color') || ''),
        vehicleType: String(form.get('vehicleType') || 'Sedan'),
        bodyType: String(form.get('bodyType') || ''),
        fuelType: String(form.get('fuelType') || 'Gasoline'),
        passengerCapacity: Number(form.get('passengerCapacity') || 4),
        classification: 'Private',
        grossWeight: '',
        currentOdometer: Number(form.get('currentOdometer') || 0),
        ownershipStatus: 'Owned',
        status: String(form.get('status')) as VehicleStatus,
        remarks: String(form.get('remarks') || ''),
      },
    ])
    setModalOpen(false)
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

function VehicleDetailsPage({ data }: { data: AppData }) {
  const { id } = useParams()
  const vehicle = data.vehicles.find((item) => item.id === id)
  if (!vehicle) return <NotFound title="Vehicle not found" />

  const relatedTrips = data.trips.filter((trip) => trip.vehicleId === vehicle.id)
  const relatedDocs = data.documents.filter((doc) => doc.entityId === vehicle.id)

  return (
    <Page>
      <PageHeader eyebrow="Vehicle details" title={vehicle.plateNumber} action={<Badge status={vehicle.status} />} />
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
        <Panel title="Documents">
          <CompactList>
            {relatedDocs.map((doc) => (
              <li key={doc.id}><span><strong>{doc.documentType}</strong><small>{doc.originalFileName}</small></span><small>{dateText(doc.expirationDate)}</small></li>
            ))}
          </CompactList>
        </Panel>
      </TwoColumn>
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
  const filtered = drivers.filter((driver) => [driver.fullName, driver.email, driver.licenseNumber].join(' ').toLowerCase().includes(query.toLowerCase()))

  const addDriver = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setDrivers((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        fullName: String(form.get('fullName')),
        address: String(form.get('address') || ''),
        contactNumber: String(form.get('contactNumber') || ''),
        email: String(form.get('email') || ''),
        emergencyContact: String(form.get('emergencyContact') || ''),
        licenseNumber: String(form.get('licenseNumber') || ''),
        licenseTypeRestrictions: String(form.get('licenseTypeRestrictions') || ''),
        licenseExpirationDate: String(form.get('licenseExpirationDate') || ''),
        status: 'Active',
        notes: String(form.get('notes') || ''),
      },
    ])
    setModalOpen(false)
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
              <td className="table-actions"><IconLink to={`/drivers/${driver.id}`} title="View driver" /></td>
            </tr>
          ))}
        </tbody>
      </Table>
      <Modal title="Add driver" open={modalOpen} onClose={() => setModalOpen(false)}>
        <DriverForm onSubmit={addDriver} />
      </Modal>
    </Page>
  )
}

function DriverDetailsPage({ data }: { data: AppData }) {
  const { id } = useParams()
  const driver = data.drivers.find((item) => item.id === id)
  if (!driver) return <NotFound title="Driver not found" />
  const assignedTrips = data.trips.filter((trip) => trip.driverId === driver.id)
  const docs = data.documents.filter((doc) => doc.entityId === driver.id)
  return (
    <Page>
      <PageHeader eyebrow="Driver details" title={driver.fullName} action={<Badge status={driver.status} />} />
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
        <Panel title="Documents">
          <CompactList>
            {docs.map((doc) => <li key={doc.id}><span><strong>{doc.documentType}</strong><small>{doc.originalFileName}</small></span><small>{dateText(doc.expirationDate)}</small></li>)}
          </CompactList>
        </Panel>
      </TwoColumn>
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
  const filtered = renters.filter((renter) => [renter.fullName, renter.email, renter.validIdNumber].join(' ').toLowerCase().includes(query.toLowerCase()))

  const addRenter = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setRenters((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        fullName: String(form.get('fullName')),
        address: String(form.get('address') || ''),
        contactNumber: String(form.get('contactNumber') || ''),
        email: String(form.get('email') || ''),
        validIdType: String(form.get('validIdType') || ''),
        validIdNumber: String(form.get('validIdNumber') || ''),
        emergencyContact: String(form.get('emergencyContact') || ''),
        isWatchlisted: false,
        notes: String(form.get('notes') || ''),
      },
    ])
    setModalOpen(false)
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
              <td className="table-actions"><IconLink to={`/renters/${renter.id}`} title="View renter" /></td>
            </tr>
          ))}
        </tbody>
      </Table>
      <Modal title="Add renter" open={modalOpen} onClose={() => setModalOpen(false)}>
        <RenterForm onSubmit={addRenter} />
      </Modal>
    </Page>
  )
}

function RenterDetailsPage({ data }: { data: AppData }) {
  const { id } = useParams()
  const renter = data.renters.find((item) => item.id === id)
  if (!renter) return <NotFound title="Renter not found" />
  const bookings = data.bookings.filter((booking) => booking.renterId === renter.id)
  const trips = data.trips.filter((trip) => trip.renterId === renter.id)
  return (
    <Page>
      <PageHeader eyebrow="Customer profile" title={renter.fullName} action={renter.isWatchlisted ? <Badge status="Watchlist" /> : <Badge status="Clear" />} />
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

    setBookings((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        referenceNumber: `BK-2026-${String(current.length + 1).padStart(4, '0')}`,
        renterId: String(form.get('renterId')),
        vehicleId,
        driverId: String(form.get('driverId') || '') || undefined,
        bookingType: String(form.get('bookingType')) as Booking['bookingType'],
        startDateTime,
        endDateTime,
        pickupLocation: String(form.get('pickupLocation') || ''),
        returnLocation: String(form.get('returnLocation') || ''),
        rateType: 'Daily',
        rateAmount: Number(form.get('rateAmount') || 0),
        securityDeposit: Number(form.get('securityDeposit') || 0),
        paymentStatus: 'Unpaid',
        bookingStatus: 'Pending',
        notes: String(form.get('notes') || ''),
      },
    ])
    setModalOpen(false)
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
                <IconLink to={`/bookings/${booking.id}`} title="View booking" />
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
      <Modal title="New booking" open={modalOpen} onClose={() => setModalOpen(false)}>
        <BookingForm data={data} onSubmit={addBooking} />
      </Modal>
    </Page>
  )
}

function BookingDetailsPage({ data }: { data: AppData }) {
  const { id } = useParams()
  const booking = data.bookings.find((item) => item.id === id)
  if (!booking) return <NotFound title="Booking not found" />
  return (
    <Page>
      <PageHeader eyebrow="Booking details" title={booking.referenceNumber} action={<Badge status={booking.bookingStatus} />} />
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
    </Page>
  )
}

function TripsPage({
  data,
  setTrips,
  setVehicles,
  showToast,
}: {
  data: AppData
  setTrips: React.Dispatch<React.SetStateAction<Trip[]>>
  setVehicles: React.Dispatch<React.SetStateAction<Vehicle[]>>
  showToast: (toast: Toast) => void
}) {
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<'All' | TripStatus>('All')
  const filtered = data.trips
    .filter((trip) => status === 'All' || trip.status === status)
    .filter((trip) => [trip.tripNumber, trip.bookingReference, renterName(data, trip.renterId), vehicleLabel(data, trip.vehicleId)].join(' ').toLowerCase().includes(query.toLowerCase()))

  const startTrip = (trip: Trip) => {
    setTrips((current) => current.map((item) => item.id === trip.id ? { ...item, status: 'Active', startingOdometer: item.startingOdometer || data.vehicles.find((vehicle) => vehicle.id === item.vehicleId)?.currentOdometer || 0 } : item))
    setVehicles((current) => current.map((vehicle) => vehicle.id === trip.vehicleId ? { ...vehicle, status: 'Booked' } : vehicle))
    showToast({ title: 'Trip started', detail: `${trip.tripNumber} is now active.` })
  }

  const completeTrip = (trip: Trip) => {
    const endingOdometer = (trip.startingOdometer || 0) + 180
    setTrips((current) => current.map((item) => item.id === trip.id ? { ...item, status: 'Completed', endingOdometer, endDateTime: new Date().toISOString(), fuelExpense: item.fuelExpense || 1800, tollExpense: item.tollExpense || 450, driverProceedCommission: item.driverProceedCommission || 1200, paymentStatus: 'Paid' } : item))
    setVehicles((current) => current.map((vehicle) => vehicle.id === trip.vehicleId ? { ...vehicle, status: 'Available', currentOdometer: Math.max(vehicle.currentOdometer, endingOdometer) } : vehicle))
    showToast({ title: 'Trip completed', detail: `${trip.tripNumber} expenses and odometer were updated.` })
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
                <IconLink to={`/trips/${trip.id}`} title="View trip" />
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    </Page>
  )
}

function TripDetailsPage({ data }: { data: AppData }) {
  const { id } = useParams()
  const trip = data.trips.find((item) => item.id === id)
  if (!trip) return <NotFound title="Trip not found" />
  return (
    <Page>
      <PageHeader eyebrow="Trip details" title={trip.tripNumber} action={<Badge status={trip.status} />} />
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
    </Page>
  )
}

function MaintenancePage({
  data,
  maintenance,
  setMaintenance,
}: {
  data: AppData
  maintenance: MaintenanceSchedule[]
  setMaintenance: React.Dispatch<React.SetStateAction<MaintenanceSchedule[]>>
}) {
  const [modalOpen, setModalOpen] = useState(false)
  const addSchedule = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setMaintenance((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        vehicleId: String(form.get('vehicleId')),
        title: String(form.get('title') || 'PMS'),
        dueDate: String(form.get('dueDate')),
        dueOdometer: Number(form.get('dueOdometer') || 0),
        status: 'Upcoming',
        vendorShop: String(form.get('vendorShop') || ''),
        estimatedCost: Number(form.get('estimatedCost') || 0),
        notes: String(form.get('notes') || ''),
      },
    ])
    setModalOpen(false)
  }
  return (
    <Page>
      <PageHeader eyebrow="Maintenance" title="PMS schedules" action={<button className="primary-button" type="button" onClick={() => setModalOpen(true)}><Plus size={18} /> Schedule PMS</button>} />
      <section className="card-grid">
        {maintenance.map((item) => (
          <article className="record-card" key={item.id}>
            <div className="record-card-head">
              <Wrench size={20} />
              <Badge status={item.status} />
            </div>
            <h3>{item.title}</h3>
            <p>{vehicleLabel(data, item.vehicleId)}</p>
            <dl>
              <div><dt>Due date</dt><dd>{dateText(item.dueDate)}</dd></div>
              <div><dt>Due odometer</dt><dd>{item.dueOdometer.toLocaleString()} km</dd></div>
              <div><dt>Vendor</dt><dd>{item.vendorShop}</dd></div>
              <div><dt>Cost</dt><dd>{money.format(item.estimatedCost)}</dd></div>
            </dl>
          </article>
        ))}
      </section>
      <Modal title="Schedule PMS" open={modalOpen} onClose={() => setModalOpen(false)}>
        <MaintenanceForm data={data} onSubmit={addSchedule} />
      </Modal>
    </Page>
  )
}

function DocumentsPage({
  documents,
  setDocuments,
  data,
}: {
  documents: DocumentAttachment[]
  setDocuments: React.Dispatch<React.SetStateAction<DocumentAttachment[]>>
  data: AppData
}) {
  const [query, setQuery] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const filtered = documents.filter((doc) => [doc.entityType, doc.documentType, doc.originalFileName].join(' ').toLowerCase().includes(query.toLowerCase()))

  const addDocument = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setDocuments((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        entityType: String(form.get('entityType')),
        entityId: String(form.get('entityId')),
        originalFileName: String(form.get('originalFileName') || 'uploaded-document.pdf'),
        fileUrl: '#',
        documentType: String(form.get('documentType')),
        expirationDate: String(form.get('expirationDate') || ''),
        uploadedAt: new Date().toISOString(),
      },
    ])
    setModalOpen(false)
  }

  return (
    <Page>
      <PageHeader eyebrow="Compliance" title="Documents" action={<button className="primary-button" type="button" onClick={() => setModalOpen(true)}><Upload size={18} /> Upload</button>} />
      <Toolbar query={query} setQuery={setQuery} placeholder="Search documents" />
      <Table>
        <thead>
          <tr><th>Document</th><th>Entity</th><th>Expiration</th><th>Uploaded</th><th>Status</th></tr>
        </thead>
        <tbody>
          {filtered.map((doc) => (
            <tr key={doc.id}>
              <td>{doc.documentType}<small>{doc.originalFileName}</small></td>
              <td>{doc.entityType}<small>{entityLabel(data, doc.entityType, doc.entityId)}</small></td>
              <td>{dateText(doc.expirationDate)}</td>
              <td>{dateText(doc.uploadedAt)}</td>
              <td><Badge status={doc.expirationDate ? (daysUntil(doc.expirationDate) < 0 ? 'Expired' : daysUntil(doc.expirationDate) <= 7 ? 'Due Soon' : 'Clear') : 'Clear'} /></td>
            </tr>
          ))}
        </tbody>
      </Table>
      <Modal title="Upload document" open={modalOpen} onClose={() => setModalOpen(false)}>
        <DocumentForm data={data} onSubmit={addDocument} />
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
  showToast,
}: {
  company: CompanyProfile
  setCompany: React.Dispatch<React.SetStateAction<CompanyProfile>>
  showToast: (toast: Toast) => void
}) {
  const save = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setCompany({
      name: String(form.get('name')),
      address: String(form.get('address')),
      contactNumber: String(form.get('contactNumber')),
    })
    showToast({ title: 'Settings saved', detail: 'Company profile changes were applied.' })
  }
  return (
    <Page>
      <PageHeader eyebrow="Workspace" title="Settings" />
      <form className="form-panel" onSubmit={save}>
        <Field label="Company name" name="name" defaultValue={company.name} required />
        <Field label="Business address" name="address" defaultValue={company.address} />
        <Field label="Contact number" name="contactNumber" defaultValue={company.contactNumber} />
        <div className="form-actions"><button className="primary-button" type="submit"><Save size={18} /> Save settings</button></div>
      </form>
    </Page>
  )
}

function LoginPage({ onLogin, showToast }: { onLogin: () => void; showToast: (toast: Toast) => void }) {
  const navigate = useNavigate()
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    onLogin()
    showToast({ title: 'Welcome back', detail: 'You are signed in to MetroBeez FMS.' })
    navigate('/dashboard')
  }
  return (
    <AuthShell title="Sign in" subtitle="MetroBeez FMS">
      <form className="auth-form" onSubmit={submit}>
        <Field label="Email" name="email" type="email" defaultValue="owner@metrobeez.example" required />
        <Field label="Password" name="password" type="password" defaultValue="metrobeez-demo" required />
        <button className="primary-button full" type="submit"><ShieldCheck size={18} /> Login</button>
        <Link to="/register">Create an account</Link>
      </form>
    </AuthShell>
  )
}

function RegisterPage({ showToast }: { showToast: (toast: Toast) => void }) {
  const navigate = useNavigate()
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    showToast({ title: 'Verification email queued', detail: 'Tenant creation waits until the email is verified.' })
    navigate('/verify-email')
  }
  return (
    <AuthShell title="Create account" subtitle="MetroBeez FMS">
      <form className="auth-form" onSubmit={submit}>
        <Field label="Full name" name="fullName" required />
        <Field label="Email" name="email" type="email" required />
        <Field label="Password" name="password" type="password" required />
        <button className="primary-button full" type="submit"><MailCheck size={18} /> Register</button>
        <Link to="/login">Back to login</Link>
      </form>
    </AuthShell>
  )
}

function VerifyEmailPage({ showToast }: { showToast: (toast: Toast) => void }) {
  const navigate = useNavigate()
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    showToast({ title: 'Email verified', detail: 'Tenant database provisioning can now begin.' })
    navigate('/onboarding')
  }
  return (
    <AuthShell title="Verify email" subtitle="MetroBeez FMS">
      <form className="auth-form" onSubmit={submit}>
        <Field label="Email" name="email" type="email" required />
        <Field label="Verification token" name="token" required />
        <Field label="Company name" name="companyName" defaultValue="MetroBeez Demo Fleet" required />
        <button className="primary-button full" type="submit"><CheckCircle2 size={18} /> Verify</button>
      </form>
    </AuthShell>
  )
}

function OnboardingPage({
  company,
  setCompany,
  showToast,
}: {
  company: CompanyProfile
  setCompany: React.Dispatch<React.SetStateAction<CompanyProfile>>
  showToast: (toast: Toast) => void
}) {
  const navigate = useNavigate()
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setCompany({
      name: String(form.get('name')),
      address: String(form.get('address')),
      contactNumber: String(form.get('contactNumber')),
    })
    showToast({ title: 'Company profile ready', detail: 'Your fleet workspace is set up.' })
    navigate('/dashboard')
  }
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
        <button className="primary-button full" type="submit"><Save size={18} /> Finish onboarding</button>
      </form>
    </AuthShell>
  )
}

function VehicleForm({ onSubmit }: { onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  return (
    <form className="modal-form" onSubmit={onSubmit}>
      <Field label="Plate number" name="plateNumber" required />
      <Field label="Make" name="make" required />
      <Field label="Model" name="model" required />
      <Field label="Series / variant" name="seriesVariant" />
      <Field label="Year model" name="yearModel" type="number" defaultValue="2026" />
      <Field label="Color" name="color" />
      <Field label="Vehicle type" name="vehicleType" defaultValue="Sedan" />
      <Field label="Body type" name="bodyType" />
      <Field label="Fuel type" name="fuelType" defaultValue="Gasoline" />
      <Field label="Capacity" name="passengerCapacity" type="number" defaultValue="4" />
      <Field label="Current odometer" name="currentOdometer" type="number" defaultValue="0" />
      <label className="field"><span>Status</span><select name="status" defaultValue="Available"><option>Available</option><option>Booked</option><option>Under Maintenance</option><option>Inactive</option></select></label>
      <Field label="Remarks" name="remarks" />
      <button className="primary-button full" type="submit"><Save size={18} /> Save vehicle</button>
    </form>
  )
}

function DriverForm({ onSubmit }: { onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  return (
    <form className="modal-form" onSubmit={onSubmit}>
      <Field label="Full name" name="fullName" required />
      <Field label="Address" name="address" />
      <Field label="Contact number" name="contactNumber" />
      <Field label="Email" name="email" type="email" />
      <Field label="Emergency contact" name="emergencyContact" />
      <Field label="License number" name="licenseNumber" />
      <Field label="License type / restrictions" name="licenseTypeRestrictions" />
      <Field label="License expiration" name="licenseExpirationDate" type="date" />
      <Field label="Notes" name="notes" />
      <button className="primary-button full" type="submit"><Save size={18} /> Save driver</button>
    </form>
  )
}

function RenterForm({ onSubmit }: { onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  return (
    <form className="modal-form" onSubmit={onSubmit}>
      <Field label="Full name" name="fullName" required />
      <Field label="Address" name="address" />
      <Field label="Contact number" name="contactNumber" />
      <Field label="Email" name="email" type="email" />
      <Field label="Valid ID type" name="validIdType" />
      <Field label="Valid ID number" name="validIdNumber" />
      <Field label="Emergency contact" name="emergencyContact" />
      <Field label="Notes" name="notes" />
      <button className="primary-button full" type="submit"><Save size={18} /> Save renter</button>
    </form>
  )
}

function BookingForm({ data, onSubmit }: { data: AppData; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  return (
    <form className="modal-form" onSubmit={onSubmit}>
      <label className="field"><span>Renter</span><select name="renterId">{data.renters.map((renter) => <option key={renter.id} value={renter.id}>{renter.fullName}</option>)}</select></label>
      <label className="field"><span>Vehicle</span><select name="vehicleId">{data.vehicles.map((vehicle) => <option key={vehicle.id} value={vehicle.id}>{vehicle.plateNumber} - {vehicle.make} {vehicle.model}</option>)}</select></label>
      <label className="field"><span>Driver</span><select name="driverId"><option value="">Optional</option>{data.drivers.map((driver) => <option key={driver.id} value={driver.id}>{driver.fullName}</option>)}</select></label>
      <label className="field"><span>Booking type</span><select name="bookingType"><option>Self-drive</option><option>With driver</option><option>Delivery/logistics</option><option>Corporate lease</option></select></label>
      <Field label="Start" name="startDateTime" type="datetime-local" required />
      <Field label="End" name="endDateTime" type="datetime-local" required />
      <Field label="Pickup location" name="pickupLocation" />
      <Field label="Return location" name="returnLocation" />
      <Field label="Rate amount" name="rateAmount" type="number" defaultValue="3500" />
      <Field label="Security deposit" name="securityDeposit" type="number" defaultValue="0" />
      <Field label="Notes" name="notes" />
      <button className="primary-button full" type="submit"><Save size={18} /> Save booking</button>
    </form>
  )
}

function MaintenanceForm({ data, onSubmit }: { data: AppData; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  return (
    <form className="modal-form" onSubmit={onSubmit}>
      <label className="field"><span>Vehicle</span><select name="vehicleId">{data.vehicles.map((vehicle) => <option key={vehicle.id} value={vehicle.id}>{vehicle.plateNumber} - {vehicle.make} {vehicle.model}</option>)}</select></label>
      <Field label="Title" name="title" defaultValue="PMS" />
      <Field label="Due date" name="dueDate" type="date" required />
      <Field label="Due odometer" name="dueOdometer" type="number" />
      <Field label="Vendor / shop" name="vendorShop" />
      <Field label="Estimated cost" name="estimatedCost" type="number" />
      <Field label="Notes" name="notes" />
      <button className="primary-button full" type="submit"><Save size={18} /> Save schedule</button>
    </form>
  )
}

function DocumentForm({ data, onSubmit }: { data: AppData; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  return (
    <form className="modal-form" onSubmit={onSubmit}>
      <label className="field"><span>Entity type</span><select name="entityType"><option>Vehicle</option><option>Driver</option><option>Renter</option><option>Booking</option><option>Trip</option></select></label>
      <label className="field"><span>Entity</span><select name="entityId">{[...data.vehicles, ...data.drivers, ...data.renters].map((item) => <option key={item.id} value={item.id}>{'plateNumber' in item ? item.plateNumber : item.fullName}</option>)}</select></label>
      <Field label="Document type" name="documentType" required />
      <Field label="Original file name" name="originalFileName" defaultValue="document.pdf" />
      <Field label="Expiration date" name="expirationDate" type="date" />
      <button className="primary-button full" type="submit"><Upload size={18} /> Upload document</button>
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

function Field({ label, name, type = 'text', defaultValue, required }: { label: string; name: string; type?: string; defaultValue?: string; required?: boolean }) {
  return <label className="field"><span>{label}</span><input name={name} type={type} defaultValue={defaultValue} required={required} /></label>
}

function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <main className="auth-shell">
      <section className="auth-panel">
        <div className="brand auth-brand"><span className="brand-mark">MB</span><span><strong>MetroBeez FMS</strong><small>{subtitle}</small></span></div>
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
  return entityId
}

function dateText(value?: string) {
  if (!value) return 'N/A'
  return new Date(value).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })
}

function daysUntil(value?: string) {
  if (!value) return 999
  const diff = new Date(value).getTime() - new Date('2026-05-15T00:00:00').getTime()
  return Math.ceil(diff / 86_400_000)
}

export default App
