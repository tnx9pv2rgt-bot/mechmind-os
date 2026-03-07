/**
 * Notification Detail API Route
 * GET: Get notification details
 * PATCH: Mark as read
 * DELETE: Delete notification
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  NotificationStatus,
  NotificationType,
  NotificationChannel,
} from '@/types/notifications';

// Validation schema for ID param
const paramsSchema = z.object({
  id: z.string().min(1),
});

// Mock notification data
const mockNotifications: Record<string, any> = {
  'notif-001': {
    id: 'notif-001',
    customerId: 'cust-001',
    tenantId: 'tenant-001',
    type: NotificationType.BOOKING_CONFIRMATION,
    channel: NotificationChannel.WHATSAPP,
    status: NotificationStatus.DELIVERED,
    message: 'Ciao Mario, appuntamento confermato per 15/03/2024 alle 14:30. Ti aspettiamo!',
    messageId: 'msg-tw-001',
    metadata: {
      customerName: 'Mario',
      service: 'Tagliando completo',
      date: '15/03/2024',
      time: '14:30',
      vehicle: 'Fiat Panda',
      bookingCode: 'BK-2024-001',
    },
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
  'notif-002': {
    id: 'notif-002',
    customerId: 'cust-002',
    tenantId: 'tenant-001',
    type: NotificationType.INVOICE_READY,
    channel: NotificationChannel.SMS,
    status: NotificationStatus.SENT,
    message: 'Ciao Luca, fattura pronta. Importo: €250.00. Visualizza: https://mechmind.io/portal',
    messageId: 'msg-tw-002',
    metadata: {
      customerName: 'Luca',
      invoiceNumber: 'INV-2024-001',
      invoiceDate: '11/03/2024',
      amount: '€250.00',
      downloadUrl: 'https://mechmind.io/invoice/inv-2024-001',
    },
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
};

/**
 * GET /api/notifications/[id]
 * Get notification details by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const validation = paramsSchema.safeParse(params);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'ID notifica non valido' },
        { status: 400 }
      );
    }

    const { id } = validation.data;

    // In production, fetch from database
    const notification = mockNotifications[id];

    if (!notification) {
      return NextResponse.json(
        { error: 'Notifica non trovata' },
        { status: 404 }
      );
    }

    return NextResponse.json(notification);
  } catch (error) {
    console.error('Error fetching notification:', error);
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/notifications/[id]
 * Mark notification as read or update status
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const validation = paramsSchema.safeParse(params);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'ID notifica non valido' },
        { status: 400 }
      );
    }

    const { id } = validation.data;
    const body = await request.json().catch(() => ({}));

    // In production, update in database
    const notification = mockNotifications[id];

    if (!notification) {
      return NextResponse.json(
        { error: 'Notifica non trovata' },
        { status: 404 }
      );
    }

    // Update status if provided
    if (body.status) {
      notification.status = body.status;
      notification.updatedAt = new Date().toISOString();

      if (body.status === NotificationStatus.DELIVERED) {
        notification.deliveredAt = new Date().toISOString();
      }
    }

    // Mark as read
    if (body.isRead) {
      notification.isRead = true;
      notification.readAt = new Date().toISOString();
    }

    return NextResponse.json({
      success: true,
      notification,
    });
  } catch (error) {
    console.error('Error updating notification:', error);
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/notifications/[id]
 * Delete notification
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const validation = paramsSchema.safeParse(params);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'ID notifica non valido' },
        { status: 400 }
      );
    }

    const { id } = validation.data;

    // In production, delete from database
    const notification = mockNotifications[id];

    if (!notification) {
      return NextResponse.json(
        { error: 'Notifica non trovata' },
        { status: 404 }
      );
    }

    // Simulate deletion
    delete mockNotifications[id];

    return NextResponse.json({
      success: true,
      message: 'Notifica eliminata',
    });
  } catch (error) {
    console.error('Error deleting notification:', error);
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    );
  }
}
