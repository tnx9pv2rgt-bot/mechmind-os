/**
 * API Proxy Helper — reads HttpOnly auth_token cookie and forwards
 * requests to the NestJS backend with Bearer authorization.
 *
 * Used by Next.js API route handlers under /api/dashboard/*, /api/bookings/*, etc.
 */

import { cookies } from 'next/headers';
import { NextResponse, type NextRequest } from 'next/server';

// Normalize: strip trailing /v1 and slashes — callers pass full paths like 'v1/bookings'
const RAW_BACKEND_URL =
  process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000';
const BACKEND_URL = RAW_BACKEND_URL.replace(/\/+$/, '').replace(/\/v1$/, '');
const TIMEOUT_MS = 30_000;

interface ProxyConfig {
  /** NestJS path without leading slash, e.g. 'v1/bookings' */
  backendPath: string;
  method?: string;
  body?: unknown;
  /** Extra query params to forward */
  params?: Record<string, string>;
}

/**
 * Proxy a request from a Next.js API route to the NestJS backend.
 * Automatically attaches the auth_token and tenant headers.
 * In demo mode (demo_session cookie), returns mock data without calling backend.
 */
export async function proxyToNestJS(config: ProxyConfig): Promise<NextResponse> {
  const { backendPath, method = 'GET', body, params } = config;
  const cookieStore = await cookies();

  // Demo session — return mock data, never call backend
  if (cookieStore.get('demo_session')?.value === '1') {
    return NextResponse.json(getDemoData(backendPath, method));
  }

  const token = cookieStore.get('auth_token')?.value;
  let tenantId = cookieStore.get('tenant_id')?.value;
  let tenantSlug = cookieStore.get('tenant_slug')?.value;

  // Fallback: extract tenant info from JWT if cookies are missing
  if (token && (!tenantId || !tenantSlug)) {
    try {
      const parts = token.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf-8')) as {
          tenantId?: string;
          sub?: string;
        };
        if (!tenantId) {
          tenantId = payload.tenantId || '';
          if (!tenantId && payload.sub) {
            const subParts = payload.sub.split(':');
            if (subParts.length >= 2) tenantId = subParts[1];
          }
        }
      }
    } catch {
      /* ignore */
    }
  }

  let url = `${BACKEND_URL}/${backendPath}`;
  if (params) {
    const qs = new URLSearchParams(params).toString();
    if (qs) url += `?${qs}`;
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  if (tenantId) {
    headers['x-tenant-id'] = tenantId;
  }
  if (tenantSlug) {
    headers['x-tenant-slug'] = tenantSlug;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    let res = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    // Auto-refresh on 401: use refresh_token to get a new access token
    if (res.status === 401 && token) {
      const refreshToken = cookieStore.get('refresh_token')?.value;
      if (refreshToken) {
        const refreshRes = await fetch(`${BACKEND_URL}/v1/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        }).catch(() => null);

        if (refreshRes?.ok) {
          const refreshData = (await refreshRes.json()) as {
            data?: { accessToken?: string; refreshToken?: string; expiresIn?: number };
          };
          const newToken = refreshData.data?.accessToken;
          if (newToken) {
            // Retry original request with new token
            headers['Authorization'] = `Bearer ${newToken}`;
            res = await fetch(url, {
              method,
              headers,
              body: body ? JSON.stringify(body) : undefined,
            });

            // Set updated cookies in response
            const data: unknown = await res
              .json()
              .catch(() => ({ error: 'Invalid JSON response' }));
            const response = NextResponse.json(data, { status: res.status });
            const isProduction = process.env.NODE_ENV === 'production';
            response.cookies.set('auth_token', newToken, {
              httpOnly: true,
              secure: isProduction,
              sameSite: 'lax',
              path: '/',
              maxAge: refreshData.data?.expiresIn || 3600,
            });
            if (refreshData.data?.refreshToken) {
              response.cookies.set('refresh_token', refreshData.data.refreshToken, {
                httpOnly: true,
                secure: isProduction,
                sameSite: 'lax',
                path: '/',
                maxAge: 7 * 24 * 60 * 60,
              });
            }
            return response;
          }
        }
      }
    }

    const data: unknown = await res.json().catch(() => ({ error: 'Invalid JSON response' }));
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      return NextResponse.json(
        { error: { code: 'BACKEND_COLD_START', message: 'Server in avvio, riprova...' } },
        { status: 503 }
      );
    }
    console.error(`[api-proxy] ${method} ${url}:`, error);
    return NextResponse.json(
      { error: { code: 'BACKEND_UNAVAILABLE', message: 'Backend non raggiungibile' } },
      { status: 502 }
    );
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Helper to extract query params from a NextRequest.
 */
export function getQueryParams(request: NextRequest): Record<string, string> {
  const params: Record<string, string> = {};
  request.nextUrl.searchParams.forEach((value, key) => {
    params[key] = value;
  });
  return params;
}

// =============================================================================
// Demo Mode — mock data for all API routes
// =============================================================================

const DEMO_BOOKINGS = [
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
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
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
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
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
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
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
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
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
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const DEMO_CUSTOMERS = [
  {
    id: 'c-001',
    firstName: 'Marco',
    lastName: 'Rossi',
    email: 'marco.rossi@email.it',
    phone: '+39 333 1234567',
    vehicleCount: 2,
    totalSpent: 1450,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'c-002',
    firstName: 'Laura',
    lastName: 'Bianchi',
    email: 'laura.b@email.it',
    phone: '+39 340 9876543',
    vehicleCount: 1,
    totalSpent: 890,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'c-003',
    firstName: 'Giuseppe',
    lastName: 'Verdi',
    email: 'g.verdi@email.it',
    phone: '+39 347 5551234',
    vehicleCount: 3,
    totalSpent: 3200,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'c-004',
    firstName: 'Anna',
    lastName: 'Ferrari',
    email: 'anna.ferrari@email.it',
    phone: '+39 328 4445678',
    vehicleCount: 1,
    totalSpent: 560,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const DEMO_VEHICLES = [
  {
    id: 'v-001',
    plate: 'AB123CD',
    brand: 'Fiat',
    model: 'Panda',
    year: 2021,
    customerId: 'c-001',
    ownerName: 'Marco Rossi',
    status: 'in_service',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'v-002',
    plate: 'EF456GH',
    brand: 'Volkswagen',
    model: 'Golf',
    year: 2020,
    customerId: 'c-002',
    ownerName: 'Laura Bianchi',
    status: 'in_service',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'v-003',
    plate: 'IJ789KL',
    brand: 'BMW',
    model: '320d',
    year: 2022,
    customerId: 'c-003',
    ownerName: 'Giuseppe Verdi',
    status: 'ready',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'v-004',
    plate: 'MN012OP',
    brand: 'Audi',
    model: 'A3',
    year: 2023,
    customerId: 'c-004',
    ownerName: 'Anna Ferrari',
    status: 'waiting_parts',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'v-005',
    plate: 'QR345ST',
    brand: 'Mercedes',
    model: 'Classe A',
    year: 2021,
    customerId: 'c-003',
    ownerName: 'Giuseppe Verdi',
    status: 'in_service',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'v-006',
    plate: 'UV678WX',
    brand: 'Toyota',
    model: 'Yaris',
    year: 2024,
    customerId: 'c-001',
    ownerName: 'Marco Rossi',
    status: 'ready',
    createdAt: new Date().toISOString(),
  },
];

function getDemoData(backendPath: string, method: string): unknown {
  // Write operations — always success
  if (method !== 'GET') {
    return { success: true, message: 'Demo — operazione simulata' };
  }

  // Dashboard KPIs (must come before generic dashboard match)
  if (backendPath.includes('analytics/dashboard-kpis')) {
    return {
      data: {
        clientiTotali: 120,
        veicoliTotali: 156,
        fatturatoMese: 45230,
        prenotazioniOggi: 8,
        workOrderAperti: 6,
      },
    };
  }

  // Dashboard
  if (backendPath.includes('analytics/dashboard') || backendPath.includes('dashboard')) {
    return {
      revenue: 4250,
      revenueChange: 12,
      bookingsToday: 8,
      bookingsChange: 5,
      avgTicket: 320,
      avgTicketChange: 3,
      vehiclesInShop: 6,
      vehiclesChange: 2,
      recentBookings: DEMO_BOOKINGS.slice(0, 4),
      alerts: [],
      tenantName: 'Officina Demo',
    };
  }

  // Bookings
  if (backendPath.includes('bookings')) {
    return { data: DEMO_BOOKINGS, total: DEMO_BOOKINGS.length, page: 1, limit: 20 };
  }

  // Customers
  if (backendPath.includes('customers')) {
    return { data: DEMO_CUSTOMERS, total: DEMO_CUSTOMERS.length, page: 1, limit: 20 };
  }

  // Vehicles
  if (backendPath.includes('vehicles')) {
    return { data: DEMO_VEHICLES, total: DEMO_VEHICLES.length, page: 1, limit: 20 };
  }

  // Parts
  if (backendPath.includes('parts/suppliers')) {
    return {
      data: [
        { id: 's-001', name: 'Autodoc', code: 'AUTODOC' },
        { id: 's-002', name: 'Mister Auto', code: 'MISTERAUTO' },
      ],
      total: 2,
    };
  }
  if (backendPath.includes('parts')) {
    return { data: [], total: 0, page: 1, limit: 20 };
  }

  // Settings
  if (backendPath.includes('settings')) {
    return {
      name: 'Officina Demo',
      address: 'Via Roma 42, Milano',
      phone: '+39 02 1234567',
      email: 'info@officinademo.it',
      vatNumber: 'IT12345678901',
    };
  }

  // MFA status
  if (backendPath.includes('mfa/status')) {
    return { enabled: false };
  }

  // Subscription
  if (backendPath.includes('subscription/current')) {
    return {
      id: 'sub-demo',
      plan: 'PROFESSIONAL',
      status: 'ACTIVE',
      currentPeriodStart: new Date().toISOString(),
      currentPeriodEnd: new Date(Date.now() + 30 * 86400000).toISOString(),
      trialEndsAt: null,
      aiAddonEnabled: false,
      features: ['BASIC', 'STANDARD', 'PREMIUM'],
      limits: {
        maxUsers: 10,
        maxLocations: 5,
        maxApiCallsPerMonth: 10000,
        maxStorageBytes: 5368709120,
      },
      stripe: { paymentMethodRequired: false },
    };
  }
  if (backendPath.includes('subscription/usage')) {
    return {
      plan: 'PROFESSIONAL',
      status: 'ACTIVE',
      aiAddonEnabled: false,
      period: {
        start: new Date().toISOString(),
        end: new Date(Date.now() + 30 * 86400000).toISOString(),
        daysRemaining: 30,
      },
      usage: {
        users: { current: 3, limit: 10, percentage: 30 },
        locations: { current: 1, limit: 5, percentage: 20 },
        apiCalls: { current: 245, limit: 10000, percentage: 2 },
        storage: { current: 52428800, limit: 5368709120, percentage: 1 },
        customers: { current: 120, limit: null, percentage: 0 },
        inspections: { current: 45, limit: null, percentage: 0 },
      },
    };
  }
  if (backendPath.includes('subscription/pricing')) {
    return [
      {
        id: 'STARTER',
        name: 'Starter',
        nameIt: 'Base',
        description: 'Per piccole officine',
        monthlyPrice: 29,
        yearlyPrice: 290,
        yearlyDiscountPercent: 17,
        monthlyPriceFormatted: '€29',
        yearlyPriceFormatted: '€290',
        isCustomPricing: false,
        features: ['BASIC'],
        limits: { maxUsers: 3, maxLocations: 1 },
      },
      {
        id: 'PROFESSIONAL',
        name: 'Professional',
        nameIt: 'Professionale',
        description: 'Per officine in crescita',
        monthlyPrice: 79,
        yearlyPrice: 790,
        yearlyDiscountPercent: 17,
        monthlyPriceFormatted: '€79',
        yearlyPriceFormatted: '€790',
        isCustomPricing: false,
        features: ['BASIC', 'STANDARD', 'PREMIUM'],
        limits: { maxUsers: 10, maxLocations: 5 },
      },
      {
        id: 'ENTERPRISE',
        name: 'Enterprise',
        nameIt: 'Enterprise',
        description: 'Per grandi catene',
        monthlyPrice: 199,
        yearlyPrice: 1990,
        yearlyDiscountPercent: 17,
        monthlyPriceFormatted: '€199',
        yearlyPriceFormatted: '€1990',
        isCustomPricing: false,
        features: [
          'BASIC',
          'STANDARD',
          'PREMIUM',
          'AI_ANALYSIS',
          'UNLIMITED_USERS',
          'API_ACCESS',
          'PRIORITY_SUPPORT',
        ],
        limits: { maxUsers: null, maxLocations: null },
      },
    ];
  }

  // Admin subscriptions
  if (backendPath.includes('admin/subscriptions/analytics')) {
    return {
      totalSubscriptions: 42,
      byPlan: { STARTER: 15, PROFESSIONAL: 20, ENTERPRISE: 7 },
      byStatus: { ACTIVE: 35, TRIAL: 5, PAST_DUE: 1, CANCELLED: 1 },
      trialConversions: 28,
      aiAddonRevenue: 2450.0,
    };
  }
  if (backendPath.includes('admin/subscriptions')) {
    return [];
  }

  // Inspections
  if (backendPath.includes('inspections')) {
    return {
      data: [
        {
          id: 'insp-001',
          type: 'PRE_PURCHASE',
          status: 'COMPLETED',
          vehiclePlate: 'AB123CD',
          customerName: 'Mario Rossi',
          scheduledDate: new Date().toISOString(),
          score: 85,
        },
        {
          id: 'insp-002',
          type: 'PERIODIC',
          status: 'IN_PROGRESS',
          vehiclePlate: 'EF456GH',
          customerName: 'Luigi Verdi',
          scheduledDate: new Date().toISOString(),
          score: null,
        },
      ],
      total: 2,
      page: 1,
      limit: 20,
    };
  }

  // Invoices
  if (backendPath.includes('invoices')) {
    return {
      data: [
        {
          id: 'inv-001',
          number: 'FT-2026-001',
          status: 'PAID',
          total: 450.0,
          customerName: 'Mario Rossi',
          issuedAt: new Date().toISOString(),
          paidAt: new Date().toISOString(),
        },
        {
          id: 'inv-002',
          number: 'FT-2026-002',
          status: 'SENT',
          total: 320.5,
          customerName: 'Luigi Verdi',
          issuedAt: new Date().toISOString(),
          paidAt: null,
        },
      ],
      total: 2,
      page: 1,
      limit: 20,
    };
  }

  // Work Orders
  if (backendPath.includes('work-orders')) {
    return {
      data: [
        {
          id: 'wo-001',
          number: 'OL-2026-001',
          status: 'IN_PROGRESS',
          vehiclePlate: 'AB123CD',
          customerName: 'Mario Rossi',
          createdAt: new Date().toISOString(),
        },
        {
          id: 'wo-002',
          number: 'OL-2026-002',
          status: 'OPEN',
          vehiclePlate: 'EF456GH',
          customerName: 'Luigi Verdi',
          createdAt: new Date().toISOString(),
        },
      ],
      total: 2,
      page: 1,
      limit: 20,
    };
  }

  // Warranties
  if (backendPath.includes('warranty') || backendPath.includes('warranties')) {
    return {
      data: [
        {
          id: 'war-001',
          type: 'MANUFACTURER',
          status: 'ACTIVE',
          vehiclePlate: 'AB123CD',
          expiresAt: new Date(Date.now() + 365 * 86400000).toISOString(),
        },
      ],
      total: 1,
      page: 1,
      limit: 20,
    };
  }

  // Locations
  if (backendPath.includes('locations')) {
    return {
      data: [
        {
          id: 'loc-001',
          name: 'Sede Principale',
          address: 'Via Roma 42, Milano',
          phone: '+39 02 1234567',
          isActive: true,
        },
      ],
      total: 1,
      page: 1,
      limit: 20,
    };
  }

  // Notifications
  if (backendPath.includes('notifications')) {
    return { data: [], total: 0, unreadCount: 0 };
  }

  // Analytics / Metabase
  if (backendPath.includes('analytics/metabase')) {
    return { success: true, data: { enabled: false, url: null, dashboards: {} } };
  }

  // Default — empty data
  return { data: [], total: 0 };
}
