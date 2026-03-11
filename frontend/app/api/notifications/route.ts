/**
 * Notifications API Route
 * GET: List notifications with filters
 * POST: Send new notification
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  NotificationType,
  NotificationStatus,
  NotificationChannel,
} from '@/types/notifications';

// Validation schemas
const querySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  customerId: z.string().uuid().optional(),
  type: z.nativeEnum(NotificationType).optional(),
  status: z.nativeEnum(NotificationStatus).optional(),
  channel: z.nativeEnum(NotificationChannel).optional(),
  unreadOnly: z.coerce.boolean().default(false),
});

const sendSchema = z.object({
  customerId: z.string().uuid(),
  tenantId: z.string().min(1),
  type: z.nativeEnum(NotificationType),
  channel: z.nativeEnum(NotificationChannel).default(NotificationChannel.AUTO),
  message: z.string().optional(),
  metadata: z.record(z.any()).optional(),
  scheduledAt: z.string().datetime().optional(),
});

// Mock data for development
const mockNotifications = [
  {
    id: 'notif-001',
    customerId: 'cust-001',
    tenantId: 'tenant-001',
    type: NotificationType.BOOKING_CONFIRMATION,
    channel: NotificationChannel.WHATSAPP,
    status: NotificationStatus.DELIVERED,
    message: 'Ciao Mario, appuntamento confermato per 15/03/2024 alle 14:30. Ti aspettiamo!',
    messageId: 'msg-tw-001',
    sentAt: '2024-03-10T10:30:00Z',
    deliveredAt: '2024-03-10T10:31:00Z',
    retries: 0,
    maxRetries: 3,
    createdAt: '2024-03-10T10:30:00Z',
    updatedAt: '2024-03-10T10:31:00Z',
    customer: {
      id: 'cust-001',
      firstName: 'Mario',
      lastName: 'Rossi',
      email: 'mario.rossi@example.com',
      phone: '+393331234567',
    },
  },
  {
    id: 'notif-002',
    customerId: 'cust-002',
    tenantId: 'tenant-001',
    type: NotificationType.INVOICE_READY,
    channel: NotificationChannel.SMS,
    status: NotificationStatus.SENT,
    message: 'Ciao Luca, fattura pronta. Importo: €250.00. Visualizza: https://mechmind.io/portal',
    messageId: 'msg-tw-002',
    sentAt: '2024-03-11T15:00:00Z',
    retries: 0,
    maxRetries: 3,
    createdAt: '2024-03-11T15:00:00Z',
    updatedAt: '2024-03-11T15:00:00Z',
    customer: {
      id: 'cust-002',
      firstName: 'Luca',
      lastName: 'Bianchi',
      email: 'luca.bianchi@example.com',
      phone: '+393337654321',
    },
  },
  {
    id: 'notif-003',
    customerId: 'cust-001',
    tenantId: 'tenant-001',
    type: NotificationType.BOOKING_REMINDER,
    channel: NotificationChannel.WHATSAPP,
    status: NotificationStatus.PENDING,
    message: 'Ciao Mario, ti ricordiamo l\'appuntamento domani 15/03/2024 alle 14:30.',
    retries: 0,
    maxRetries: 3,
    createdAt: '2024-03-14T09:00:00Z',
    updatedAt: '2024-03-14T09:00:00Z',
    customer: {
      id: 'cust-001',
      firstName: 'Mario',
      lastName: 'Rossi',
      email: 'mario.rossi@example.com',
      phone: '+393331234567',
    },
  },
];

/**
 * GET /api/notifications
 * List notifications with pagination and filters
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const validation = querySchema.safeParse({
      page: searchParams.get('page') || '1',
      limit: searchParams.get('limit') || '20',
      customerId: searchParams.get('customerId'),
      type: searchParams.get('type'),
      status: searchParams.get('status'),
      channel: searchParams.get('channel'),
      unreadOnly: searchParams.get('unreadOnly'),
    });

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Parametri non validi', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const { page, limit, customerId, type, status, channel, unreadOnly } = validation.data;

    // Filter notifications
    let filtered = [...mockNotifications];

    if (customerId) {
      filtered = filtered.filter((n) => n.customerId === customerId);
    }

    if (type) {
      filtered = filtered.filter((n) => n.type === type);
    }

    if (status) {
      filtered = filtered.filter((n) => n.status === status);
    }

    if (channel) {
      filtered = filtered.filter((n) => n.channel === channel);
    }

    if (unreadOnly) {
      filtered = filtered.filter((n) => n.status === NotificationStatus.PENDING);
    }

    // Paginate
    const total = filtered.length;
    const totalPages = Math.ceil(total / limit);
    const offset = (page - 1) * limit;
    const paginated = filtered.slice(offset, offset + limit);

    return NextResponse.json({
      notifications: paginated,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/notifications
 * Send a new notification
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const validation = sendSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Dati non validi', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const data = validation.data;

    // In production, call the backend API
    // For now, return mock success response
    const notificationId = `notif-${Date.now()}`;
    
    // Simulate async processing
    await new Promise((resolve) => setTimeout(resolve, 100));

    return NextResponse.json({
      success: true,
      notificationId,
      messageId: `msg-${Date.now()}`,
      status: 'QUEUED',
      message: 'Notifica inviata con successo',
    }, { status: 201 });
  } catch (error) {
    console.error('Error sending notification:', error);
    return NextResponse.json(
      { error: 'Errore nell\'invio della notifica' },
      { status: 500 }
    );
  }
}
