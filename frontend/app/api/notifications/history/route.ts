/**
 * Notification History API Route
 * GET: Get notification history with pagination
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  NotificationType,
  NotificationStatus,
  NotificationChannel,
} from '@/types/notifications';

// Validation schema
const querySchema = z.object({
  customerId: z.string().min(1),
  type: z.nativeEnum(NotificationType).optional(),
  limit: z.coerce.number().min(1).max(100).default(50),
  offset: z.coerce.number().min(0).default(0),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

// Mock notification history data
interface NotificationHistoryItem {
  id: string
  customerId: string
  tenantId: string
  type: NotificationType
  channel: NotificationChannel
  status: NotificationStatus
  message: string
  messageId: string | undefined
  metadata: Record<string, string>
  sentAt: string | undefined
  deliveredAt: string | undefined
  error: string | undefined
  retries: number
  maxRetries: number
  createdAt: string
  updatedAt: string
}

const generateMockHistory = (customerId: string): NotificationHistoryItem[] => {
  const types = [
    NotificationType.BOOKING_CONFIRMATION,
    NotificationType.BOOKING_REMINDER,
    NotificationType.INVOICE_READY,
    NotificationType.INSPECTION_COMPLETE,
  ];

  const channels = [
    NotificationChannel.SMS,
    NotificationChannel.WHATSAPP,
    NotificationChannel.EMAIL,
  ];

  const statuses = [
    NotificationStatus.DELIVERED,
    NotificationStatus.SENT,
    NotificationStatus.FAILED,
    NotificationStatus.PENDING,
  ];

  const history: NotificationHistoryItem[] = [];
  const baseDate = new Date('2024-03-01');

  for (let i = 0; i < 25; i++) {
    const type = types[i % types.length];
    const channel = channels[i % channels.length];
    const status = statuses[i % statuses.length];
    const date = new Date(baseDate);
    date.setDate(date.getDate() + i);

    history.push({
      id: `notif-${customerId}-${i}`,
      customerId,
      tenantId: 'tenant-001',
      type,
      channel,
      status,
      message: getMockMessage(type),
      messageId: status !== NotificationStatus.PENDING ? `msg-${i}` : undefined,
      metadata: {
        customerName: 'Mario Rossi',
      },
      sentAt: status !== NotificationStatus.PENDING ? date.toISOString() : undefined,
      deliveredAt: status === NotificationStatus.DELIVERED 
        ? new Date(date.getTime() + 60000).toISOString() 
        : undefined,
      error: status === NotificationStatus.FAILED ? 'Numero non valido' : undefined,
      retries: status === NotificationStatus.FAILED ? 3 : 0,
      maxRetries: 3,
      createdAt: date.toISOString(),
      updatedAt: date.toISOString(),
    });
  }

  return history.reverse();
};

function getMockMessage(type: NotificationType): string {
  const messages: Record<NotificationType, string> = {
    [NotificationType.BOOKING_CONFIRMATION]: 'Ciao Mario, appuntamento confermato per 15/03/2024 alle 14:30. Ti aspettiamo!',
    [NotificationType.BOOKING_REMINDER]: 'Ciao Mario, ti ricordiamo l\'appuntamento domani 15/03/2024 alle 14:30.',
    [NotificationType.BOOKING_CANCELLED]: 'Ciao Mario, l\'appuntamento del 15/03/2024 alle 14:30 è stato cancellato.',
    [NotificationType.INVOICE_READY]: 'Ciao Mario, fattura pronta. Importo: €250.00.',
    [NotificationType.INSPECTION_COMPLETE]: 'Ciao Mario, ispezione completata! Score: 8/10.',
    [NotificationType.MAINTENANCE_DUE]: 'Ciao Mario, tagliando dovuto tra 30 giorni.',
    [NotificationType.VEHICLE_READY]: 'Ciao Mario, il tuo veicolo è pronto per il ritiro!',
    [NotificationType.STATUS_UPDATE]: 'Ciao Mario, aggiornamento: in lavorazione.',
    [NotificationType.PAYMENT_REMINDER]: 'Ciao Mario, promemoria pagamento fattura di €250.00.',
    [NotificationType.WELCOME]: 'Benvenuto Mario! Grazie per esserti registrato.',
    [NotificationType.PASSWORD_RESET]: 'Ciao Mario, per reimpostare la password clicca qui.',
    [NotificationType.CUSTOM]: 'Ciao Mario, hai un nuovo messaggio da MechMind OS.',
    [NotificationType.GDPR_EXPORT_READY]: 'Ciao Mario, i tuoi dati sono pronti per il download.',
  };

  return messages[type];
}

/**
 * GET /api/notifications/history
 * Get notification history for a customer
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const validation = querySchema.safeParse({
      customerId: searchParams.get('customerId'),
      type: searchParams.get('type') || undefined,
      limit: searchParams.get('limit') || '50',
      offset: searchParams.get('offset') || '0',
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
    });

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Parametri non validi', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const { customerId, type, limit, offset, startDate, endDate } = validation.data;

    // Generate mock data
    let history = generateMockHistory(customerId);

    // Apply filters
    if (type) {
      history = history.filter((n) => n.type === type);
    }

    if (startDate) {
      const start = new Date(startDate);
      history = history.filter((n) => new Date(n.createdAt) >= start);
    }

    if (endDate) {
      const end = new Date(endDate);
      history = history.filter((n) => new Date(n.createdAt) <= end);
    }

    // Apply pagination
    const total = history.length;
    const paginated = history.slice(offset, offset + limit);

    return NextResponse.json({
      notifications: paginated,
      total,
      pagination: {
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    });
  } catch (error) {
    console.error('Error fetching notification history:', error);
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    );
  }
}
