/**
 * Notification Preferences API Route
 * GET: Get customer notification preferences
 * PUT: Update notification preferences
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  NotificationChannel,
  NotificationType,
} from '@/types/notifications';

// Validation schemas
const getSchema = z.object({
  customerId: z.string().min(1),
});

const updateSchema = z.object({
  customerId: z.string().min(1),
  channel: z.nativeEnum(NotificationChannel).optional(),
  enabled: z.boolean().optional(),
  preferredChannel: z.nativeEnum(NotificationChannel).optional(),
  language: z.enum(['it', 'en']).default('it'),
  quietHoursStart: z.string().optional(),
  quietHoursEnd: z.string().optional(),
});

// Mock preferences data
const mockPreferences: Record<string, any> = {
  'cust-001': {
    customerId: 'cust-001',
    channels: [
      { channel: NotificationChannel.SMS, enabled: true },
      { channel: NotificationChannel.WHATSAPP, enabled: true },
      { channel: NotificationChannel.EMAIL, enabled: false },
    ],
    types: [
      { type: NotificationType.BOOKING_CONFIRMATION, enabled: true },
      { type: NotificationType.BOOKING_REMINDER, enabled: true },
      { type: NotificationType.INVOICE_READY, enabled: true },
      { type: NotificationType.INSPECTION_COMPLETE, enabled: true },
      { type: NotificationType.MAINTENANCE_DUE, enabled: false },
      { type: NotificationType.VEHICLE_READY, enabled: true },
    ],
    preferredChannel: NotificationChannel.WHATSAPP,
    language: 'it',
    quietHoursStart: '22:00',
    quietHoursEnd: '08:00',
    timezone: 'Europe/Rome',
  },
  'cust-002': {
    customerId: 'cust-002',
    channels: [
      { channel: NotificationChannel.SMS, enabled: true },
      { channel: NotificationChannel.WHATSAPP, enabled: false },
      { channel: NotificationChannel.EMAIL, enabled: true },
    ],
    types: [
      { type: NotificationType.BOOKING_CONFIRMATION, enabled: true },
      { type: NotificationType.BOOKING_REMINDER, enabled: true },
      { type: NotificationType.INVOICE_READY, enabled: true },
      { type: NotificationType.INSPECTION_COMPLETE, enabled: true },
      { type: NotificationType.MAINTENANCE_DUE, enabled: true },
      { type: NotificationType.VEHICLE_READY, enabled: true },
    ],
    preferredChannel: NotificationChannel.SMS,
    language: 'it',
    quietHoursStart: null,
    quietHoursEnd: null,
    timezone: 'Europe/Rome',
  },
};

/**
 * GET /api/notifications/preferences?customerId=xxx
 * Get customer notification preferences
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customerId');

    const validation = getSchema.safeParse({ customerId });

    if (!validation.success) {
      return NextResponse.json(
        { error: 'ID cliente richiesto', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const { customerId: id } = validation.data;

    // In production, fetch from database
    const preferences = mockPreferences[id] || {
      customerId: id,
      channels: [
        { channel: NotificationChannel.SMS, enabled: true },
        { channel: NotificationChannel.WHATSAPP, enabled: true },
        { channel: NotificationChannel.EMAIL, enabled: true },
      ],
      types: Object.values(NotificationType).map((type) => ({
        type,
        enabled: true,
      })),
      preferredChannel: NotificationChannel.AUTO,
      language: 'it',
      timezone: 'Europe/Rome',
    };

    return NextResponse.json(preferences);
  } catch (error) {
    console.error('Error fetching preferences:', error);
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/notifications/preferences
 * Update customer notification preferences
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();

    const validation = updateSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Dati non validi', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const data = validation.data;

    // In production, update in database
    let preferences = mockPreferences[data.customerId];

    if (!preferences) {
      preferences = {
        customerId: data.customerId,
        channels: [
          { channel: NotificationChannel.SMS, enabled: true },
          { channel: NotificationChannel.WHATSAPP, enabled: true },
          { channel: NotificationChannel.EMAIL, enabled: true },
        ],
        types: Object.values(NotificationType).map((type) => ({
          type,
          enabled: true,
        })),
        preferredChannel: NotificationChannel.AUTO,
        language: 'it',
        timezone: 'Europe/Rome',
      };
      mockPreferences[data.customerId] = preferences;
    }

    // Update channel preference
    if (data.channel !== undefined && data.enabled !== undefined) {
      const channelPref = preferences.channels.find(
        (c: any) => c.channel === data.channel
      );
      if (channelPref) {
        channelPref.enabled = data.enabled;
      } else {
        preferences.channels.push({
          channel: data.channel,
          enabled: data.enabled,
        });
      }
    }

    // Update preferred channel
    if (data.preferredChannel) {
      preferences.preferredChannel = data.preferredChannel;
    }

    // Update language
    if (data.language) {
      preferences.language = data.language;
    }

    // Update quiet hours
    if (data.quietHoursStart !== undefined) {
      preferences.quietHoursStart = data.quietHoursStart;
    }
    if (data.quietHoursEnd !== undefined) {
      preferences.quietHoursEnd = data.quietHoursEnd;
    }

    return NextResponse.json({
      success: true,
      preferences,
    });
  } catch (error) {
    console.error('Error updating preferences:', error);
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/notifications/preferences
 * Alternative endpoint for updating preferences (for compatibility)
 */
export async function POST(request: NextRequest) {
  return PUT(request);
}
