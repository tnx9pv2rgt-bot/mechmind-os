import { type NextRequest } from 'next/server';
import { proxyToNestJS, getQueryParams } from '@/lib/auth/api-proxy';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/dashboard/calendar/events?from=&to=
 * Merges bookings + work orders into a unified calendar events response.
 */
export async function GET(request: NextRequest): Promise<Response> {
  const params = getQueryParams(request);

  const [bookingsRes, workOrdersRes] = await Promise.allSettled([
    proxyToNestJS({ backendPath: 'v1/bookings', params }),
    proxyToNestJS({ backendPath: 'v1/work-orders', params }),
  ]);

  interface BookingItem {
    id: string;
    customerName?: string;
    vehiclePlate?: string;
    serviceName?: string;
    serviceCategory?: string;
    scheduledAt?: string;
    estimatedEndAt?: string;
    durationMinutes?: number;
    status?: string;
  }

  interface WorkOrderItem {
    id: string;
    customerName?: string;
    vehiclePlate?: string;
    vehicleMake?: string;
    vehicleModel?: string;
    description?: string;
    status?: string;
    estimatedCompletion?: string;
    createdAt?: string;
  }

  let bookings: BookingItem[] = [];
  let workOrders: WorkOrderItem[] = [];

  if (bookingsRes.status === 'fulfilled') {
    try {
      const raw: unknown = await bookingsRes.value.json();
      const parsed = raw as { data?: BookingItem[] } | BookingItem[];
      bookings = Array.isArray(parsed) ? parsed : (parsed.data ?? []);
    } catch {
      /* backend unavailable — continue with empty */
    }
  }

  if (workOrdersRes.status === 'fulfilled') {
    try {
      const raw: unknown = await workOrdersRes.value.json();
      const parsed = raw as { data?: WorkOrderItem[] } | WorkOrderItem[];
      workOrders = Array.isArray(parsed) ? parsed : (parsed.data ?? []);
    } catch {
      /* backend unavailable — continue with empty */
    }
  }

  interface CalendarEvent {
    id: string;
    title: string;
    start: string;
    end: string;
    type: 'booking' | 'work_order';
    status: string;
    customerName: string;
    vehiclePlate: string;
    resourceId: string;
  }

  const bookingEvents: CalendarEvent[] = bookings.map((b) => {
    const start = b.scheduledAt ?? new Date().toISOString();
    const durationMs = (b.durationMinutes ?? 60) * 60_000;
    const end = b.estimatedEndAt ?? new Date(new Date(start).getTime() + durationMs).toISOString();
    return {
      id: b.id,
      title: `${b.customerName ?? 'Cliente'} - ${b.serviceName ?? b.serviceCategory ?? 'Servizio'}`,
      start,
      end,
      type: 'booking' as const,
      status: b.status ?? 'pending',
      customerName: b.customerName ?? '',
      vehiclePlate: b.vehiclePlate ?? '',
      resourceId: b.id,
    };
  });

  const woEvents: CalendarEvent[] = workOrders.map((wo) => {
    const start = wo.createdAt ?? new Date().toISOString();
    const end = wo.estimatedCompletion ?? new Date(new Date(start).getTime() + 3_600_000).toISOString();
    return {
      id: wo.id,
      title: `OdL: ${wo.customerName ?? 'Cliente'} - ${wo.vehiclePlate ?? ''}`,
      start,
      end,
      type: 'work_order' as const,
      status: wo.status ?? 'open',
      customerName: wo.customerName ?? '',
      vehiclePlate: wo.vehiclePlate ?? '',
      resourceId: wo.id,
    };
  });

  return NextResponse.json({
    data: [...bookingEvents, ...woEvents],
    total: bookingEvents.length + woEvents.length,
  });
}
