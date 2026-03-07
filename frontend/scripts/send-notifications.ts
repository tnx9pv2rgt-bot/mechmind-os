/**
 * Notification Cron Job Script
 * 
 * Run every hour to:
 * 1. Process PENDING notifications
 * 2. Send BOOKING_REMINDER 24h before
 * 3. Send MAINTENANCE_DUE 7 days before
 * 4. Retry FAILED notifications (max 3 retries)
 * 
 * Usage:
 *   npx ts-node scripts/send-notifications.ts
 *   
 * Or add to crontab:
 *   0 * * * * cd /path/to/project && npx ts-node scripts/send-notifications.ts
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { addHours, addDays, format, subHours } from 'date-fns';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface NotificationTask {
  type: string;
  description: string;
  execute: () => Promise<{ processed: number; failed: number }>;
}

// ==========================================
// TASK 1: Process pending notifications
// ==========================================
async function processPendingNotifications(): Promise<{ processed: number; failed: number }> {
  console.log('📨 Processing pending notifications...');

  const { data: pendingNotifications, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('status', 'PENDING')
    .order('created_at', { ascending: true })
    .limit(100);

  if (error) {
    console.error('Error fetching pending notifications:', error);
    return { processed: 0, failed: 0 };
  }

  let processed = 0;
  let failed = 0;

  for (const notification of pendingNotifications || []) {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/notifications/v2/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseServiceKey}`,
        },
        body: JSON.stringify({
          notificationId: notification.id,
          customerId: notification.customer_id,
          type: notification.type,
          channel: notification.channel,
          message: notification.message,
          metadata: notification.metadata,
          tenantId: notification.tenant_id,
        }),
      });

      if (response.ok) {
        processed++;
      } else {
        failed++;
        console.error(`Failed to send notification ${notification.id}`);
      }
    } catch (err) {
      failed++;
      console.error(`Error sending notification ${notification.id}:`, err);
    }

    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log(`✅ Processed ${processed}, Failed ${failed}`);
  return { processed, failed };
}

// ==========================================
// TASK 2: Send booking reminders (24h before)
// ==========================================
async function sendBookingReminders(): Promise<{ processed: number; failed: number }> {
  console.log('📅 Sending booking reminders...');

  const tomorrow = addHours(new Date(), 24);
  const tomorrowStart = new Date(tomorrow.setHours(0, 0, 0, 0));
  const tomorrowEnd = new Date(tomorrow.setHours(23, 59, 59, 999));

  const { data: bookings, error } = await supabase
    .from('bookings')
    .select(`
      id,
      scheduled_date,
      customer_id,
      tenant_id,
      customers:customer_id (encrypted_phone, encrypted_first_name)
    `)
    .gte('scheduled_date', tomorrowStart.toISOString())
    .lte('scheduled_date', tomorrowEnd.toISOString())
    .eq('status', 'CONFIRMED');

  if (error) {
    console.error('Error fetching bookings:', error);
    return { processed: 0, failed: 0 };
  }

  let processed = 0;
  let failed = 0;

  for (const booking of bookings || []) {
    // Check if reminder already sent
    const { data: existing } = await supabase
      .from('notifications')
      .select('id')
      .eq('customer_id', booking.customer_id)
      .eq('type', 'BOOKING_REMINDER')
      .eq('metadata->bookingId', booking.id)
      .gte('created_at', subHours(new Date(), 48).toISOString())
      .maybeSingle();

    if (existing) {
      console.log(`Reminder already sent for booking ${booking.id}`);
      continue;
    }

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/notifications/v2/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseServiceKey}`,
        },
        body: JSON.stringify({
          customerId: booking.customer_id,
          tenantId: booking.tenant_id,
          type: 'BOOKING_REMINDER',
          channel: 'SMS',
          metadata: {
            bookingId: booking.id,
            date: format(new Date(booking.scheduled_date), 'dd/MM/yyyy'),
            time: format(new Date(booking.scheduled_date), 'HH:mm'),
          },
        }),
      });

      if (response.ok) {
        processed++;
        console.log(`Reminder sent for booking ${booking.id}`);
      } else {
        failed++;
        console.error(`Failed to send reminder for booking ${booking.id}`);
      }
    } catch (err) {
      failed++;
      console.error(`Error sending reminder for booking ${booking.id}:`, err);
    }

    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log(`✅ Sent ${processed} reminders, Failed ${failed}`);
  return { processed, failed };
}

// ==========================================
// TASK 3: Send maintenance due reminders (7 days before)
// ==========================================
async function sendMaintenanceReminders(): Promise<{ processed: number; failed: number }> {
  console.log('🔧 Sending maintenance reminders...');

  // This would query a maintenance schedule table
  // For now, placeholder implementation
  console.log('⚠️ Maintenance reminders not yet implemented');
  return { processed: 0, failed: 0 };
}

// ==========================================
// TASK 4: Retry failed notifications
// ==========================================
async function retryFailedNotifications(): Promise<{ processed: number; failed: number }> {
  console.log('🔄 Retrying failed notifications...');

  const { data: failedNotifications, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('status', 'FAILED')
    .lt('retries', 3)
    .order('failed_at', { ascending: true })
    .limit(50);

  if (error) {
    console.error('Error fetching failed notifications:', error);
    return { processed: 0, failed: 0 };
  }

  let processed = 0;
  let failed = 0;

  for (const notification of failedNotifications || []) {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/notifications/v2/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseServiceKey}`,
        },
        body: JSON.stringify({
          notificationId: notification.id,
          customerId: notification.customer_id,
          type: notification.type,
          channel: notification.channel,
          message: notification.message,
          metadata: notification.metadata,
          tenantId: notification.tenant_id,
        }),
      });

      if (response.ok) {
        processed++;
        console.log(`Retried notification ${notification.id} successfully`);
      } else {
        failed++;
        console.error(`Retry failed for notification ${notification.id}`);
      }
    } catch (err) {
      failed++;
      console.error(`Error retrying notification ${notification.id}:`, err);
    }

    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log(`✅ Retried ${processed}, Failed ${failed}`);
  return { processed, failed };
}

// ==========================================
// MAIN EXECUTION
// ==========================================
async function main() {
  console.log('🚀 Starting notification cron job...');
  console.log(`⏰ ${new Date().toISOString()}`);
  console.log('');

  const tasks: NotificationTask[] = [
    { type: 'pending', description: 'Process pending notifications', execute: processPendingNotifications },
    { type: 'reminders', description: 'Send booking reminders', execute: sendBookingReminders },
    { type: 'maintenance', description: 'Send maintenance reminders', execute: sendMaintenanceReminders },
    { type: 'retry', description: 'Retry failed notifications', execute: retryFailedNotifications },
  ];

  const results: Record<string, { processed: number; failed: number }> = {};

  for (const task of tasks) {
    console.log(`\n--- ${task.description} ---`);
    try {
      const result = await task.execute();
      results[task.type] = result;
    } catch (err) {
      console.error(`Task ${task.type} failed:`, err);
      results[task.type] = { processed: 0, failed: 0 };
    }
  }

  // Summary
  console.log('\n========================================');
  console.log('📊 SUMMARY');
  console.log('========================================');
  for (const [type, result] of Object.entries(results)) {
    console.log(`${type}: ${result.processed} processed, ${result.failed} failed`);
  }
  console.log('========================================');

  process.exit(0);
}

// Run if executed directly
if (require.main === module) {
  main().catch(err => {
    console.error('Cron job failed:', err);
    process.exit(1);
  });
}

export { processPendingNotifications, sendBookingReminders, sendMaintenanceReminders, retryFailedNotifications };
