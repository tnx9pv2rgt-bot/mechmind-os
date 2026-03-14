/**
 * MSW Request Handlers — Demo Mode
 *
 * Intercepts all /api/* requests and returns realistic mock data.
 * The app code never knows it's in demo mode.
 */
import { http, HttpResponse } from 'msw'

// =============================================================================
// Demo Data
// =============================================================================

const demoBookings = [
  {
    id: 'bk-001',
    customerName: 'Marco Rossi',
    vehiclePlate: 'AB123CD',
    vehicleBrand: 'Fiat',
    vehicleModel: 'Panda',
    serviceName: 'Tagliando',
    serviceCategory: 'Manutenzione',
    status: 'confirmed',
    scheduledAt: new Date().toISOString(),
    estimatedCost: 180,
  },
  {
    id: 'bk-002',
    customerName: 'Laura Bianchi',
    vehiclePlate: 'EF456GH',
    vehicleBrand: 'Volkswagen',
    vehicleModel: 'Golf',
    serviceName: 'Cambio freni',
    serviceCategory: 'Riparazione',
    status: 'in_progress',
    scheduledAt: new Date().toISOString(),
    estimatedCost: 350,
  },
  {
    id: 'bk-003',
    customerName: 'Giuseppe Verdi',
    vehiclePlate: 'IJ789KL',
    vehicleBrand: 'BMW',
    vehicleModel: '320d',
    serviceName: 'Diagnosi elettronica',
    serviceCategory: 'Diagnostica',
    status: 'pending',
    scheduledAt: new Date(Date.now() + 3600000).toISOString(),
    estimatedCost: 90,
  },
  {
    id: 'bk-004',
    customerName: 'Anna Ferrari',
    vehiclePlate: 'MN012OP',
    vehicleBrand: 'Audi',
    vehicleModel: 'A3',
    serviceName: 'Cambio olio',
    serviceCategory: 'Manutenzione',
    status: 'completed',
    scheduledAt: new Date(Date.now() - 7200000).toISOString(),
    estimatedCost: 120,
  },
  {
    id: 'bk-005',
    customerName: 'Paolo Colombo',
    vehiclePlate: 'QR345ST',
    vehicleBrand: 'Mercedes',
    vehicleModel: 'Classe A',
    serviceName: 'Sostituzione pneumatici',
    serviceCategory: 'Pneumatici',
    status: 'confirmed',
    scheduledAt: new Date(Date.now() + 7200000).toISOString(),
    estimatedCost: 480,
  },
]

const demoDashboard = {
  revenue: 4250,
  revenueChange: 12,
  bookingsToday: 8,
  bookingsChange: 5,
  avgTicket: 320,
  avgTicketChange: 3,
  vehiclesInShop: 6,
  vehiclesChange: 2,
  recentBookings: demoBookings.slice(0, 4),
  alerts: [],
  tenantName: 'Officina Demo',
}

const demoCustomers = [
  { id: 'c-001', firstName: 'Marco', lastName: 'Rossi', email: 'marco.rossi@email.it', phone: '+39 333 1234567', vehicleCount: 2, totalSpent: 1450 },
  { id: 'c-002', firstName: 'Laura', lastName: 'Bianchi', email: 'laura.b@email.it', phone: '+39 340 9876543', vehicleCount: 1, totalSpent: 890 },
  { id: 'c-003', firstName: 'Giuseppe', lastName: 'Verdi', email: 'g.verdi@email.it', phone: '+39 347 5551234', vehicleCount: 3, totalSpent: 3200 },
  { id: 'c-004', firstName: 'Anna', lastName: 'Ferrari', email: 'anna.ferrari@email.it', phone: '+39 328 4445678', vehicleCount: 1, totalSpent: 560 },
]

const demoVehicles = [
  { id: 'v-001', plate: 'AB123CD', brand: 'Fiat', model: 'Panda', year: 2021, customerId: 'c-001', customerName: 'Marco Rossi', status: 'in_service' },
  { id: 'v-002', plate: 'EF456GH', brand: 'Volkswagen', model: 'Golf', year: 2020, customerId: 'c-002', customerName: 'Laura Bianchi', status: 'in_service' },
  { id: 'v-003', plate: 'IJ789KL', brand: 'BMW', model: '320d', year: 2022, customerId: 'c-003', customerName: 'Giuseppe Verdi', status: 'ready' },
  { id: 'v-004', plate: 'MN012OP', brand: 'Audi', model: 'A3', year: 2023, customerId: 'c-004', customerName: 'Anna Ferrari', status: 'waiting_parts' },
  { id: 'v-005', plate: 'QR345ST', brand: 'Mercedes', model: 'Classe A', year: 2021, customerId: 'c-003', customerName: 'Giuseppe Verdi', status: 'in_service' },
  { id: 'v-006', plate: 'UV678WX', brand: 'Toyota', model: 'Yaris', year: 2024, customerId: 'c-001', customerName: 'Marco Rossi', status: 'ready' },
]

const demoSuppliers = [
  { id: 's-001', name: 'Autodoc', code: 'AUTODOC', contactName: 'Support', email: 'info@autodoc.it', phone: '+39 02 1234567' },
  { id: 's-002', name: 'Mister Auto', code: 'MISTERAUTO', contactName: 'Support', email: 'info@misterauto.it', phone: '+39 02 7654321' },
]

// =============================================================================
// Handlers
// =============================================================================

export const handlers = [
  // Auth
  http.get('/api/auth/me', () => {
    return HttpResponse.json({
      user: {
        id: 'demo-user',
        email: 'demo@mechmind.it',
        name: 'Utente Demo',
        role: 'OWNER',
        tenantId: 'demo-tenant',
        tenantName: 'Officina Demo',
      },
    })
  }),

  // Dashboard
  http.get('/api/dashboard', () => {
    return HttpResponse.json(demoDashboard)
  }),

  // Bookings
  http.get('/api/bookings', () => {
    return HttpResponse.json({ data: demoBookings, total: demoBookings.length, page: 1, limit: 20 })
  }),

  http.get('/api/bookings/:id', ({ params }) => {
    const booking = demoBookings.find(b => b.id === params.id)
    return booking
      ? HttpResponse.json(booking)
      : HttpResponse.json({ error: 'Not found' }, { status: 404 })
  }),

  // Customers
  http.get('/api/customers', () => {
    return HttpResponse.json({ data: demoCustomers, total: demoCustomers.length, page: 1, limit: 20 })
  }),

  // Vehicles
  http.get('/api/vehicles', () => {
    return HttpResponse.json({ data: demoVehicles, total: demoVehicles.length, page: 1, limit: 20 })
  }),

  // Parts & Suppliers
  http.get('/api/parts', () => {
    return HttpResponse.json({ data: [], total: 0, page: 1, limit: 20 })
  }),

  http.get('/api/parts/suppliers', () => {
    return HttpResponse.json({ data: demoSuppliers, total: 2 })
  }),

  // Settings
  http.get('/api/settings', () => {
    return HttpResponse.json({
      shopName: 'Officina Demo',
      address: 'Via Roma 42, Milano',
      phone: '+39 02 1234567',
      email: 'info@officinademo.it',
      vatNumber: 'IT12345678901',
      openingHours: '08:00 - 18:00',
    })
  }),

  // Catch-all for any other /api/* GET — return empty data
  http.get('/api/*', () => {
    return HttpResponse.json({ data: [], total: 0 })
  }),

  // Catch-all for any /api/* POST/PUT/PATCH/DELETE — return success
  http.post('/api/*', () => {
    return HttpResponse.json({ success: true, message: 'Demo mode — operazione simulata' })
  }),
  http.put('/api/*', () => {
    return HttpResponse.json({ success: true })
  }),
  http.patch('/api/*', () => {
    return HttpResponse.json({ success: true })
  }),
  http.delete('/api/*', () => {
    return HttpResponse.json({ success: true })
  }),
]
