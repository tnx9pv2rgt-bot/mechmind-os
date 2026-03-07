# MechMind OS - SMS/WhatsApp Notifications Implementation

## Overview

Complete SMS and WhatsApp notification system for MechMind OS using Twilio integration. This implementation includes database schema, backend services, API routes, and React components.

## Files Created

### 1. Database Schema

| File | Description |
|------|-------------|
| `backend/prisma/schema.prisma` | Added Notification model and enums |
| `backend/prisma/migrations/009_add_notifications.sql` | Migration for notification tables |

**Models Added:**
- `Notification` - Stores all sent notifications
- `CustomerNotificationPreference` - Customer channel preferences
- Enums: `NotificationType`, `NotificationChannel`, `NotificationStatus`

### 2. Backend Services

| File | Description |
|------|-------------|
| `backend/src/notifications/services/notification-v2.service.ts` | Core notification service with Twilio integration |
| `backend/src/notifications/services/notification-triggers.service.ts` | Event-based notification triggers |
| `backend/src/notifications/controllers/notifications-v2.controller.ts` | REST API endpoints |
| `backend/src/notifications/dto/create-notification.dto.ts` | Data transfer objects |

### 3. Frontend Templates

| File | Description |
|------|-------------|
| `frontend/lib/notifications/templates/it.ts` | Italian message templates |
| `frontend/lib/notifications/templates/en.ts` | English message templates |
| `frontend/lib/notifications/templates/index.ts` | Template utilities and exports |

### 4. Frontend API Routes

| File | Description |
|------|-------------|
| `frontend/app/api/notifications/route.ts` | GET/POST for notifications |
| `frontend/app/api/notifications/[id]/route.ts` | Individual notification operations |
| `frontend/app/api/notifications/send/route.ts` | Send immediate notification |
| `frontend/app/api/notifications/templates/route.ts` | Template management |
| `frontend/app/api/notifications/preferences/route.ts` | Customer preferences |

### 5. Frontend Components

| File | Description |
|------|-------------|
| `frontend/components/notifications/NotificationHistory.tsx` | List of sent notifications |
| `frontend/components/notifications/NotificationPreferences.tsx` | Channel toggle preferences |
| `frontend/components/notifications/SendNotificationButton.tsx` | Manual send dialog |
| `frontend/components/notifications/index.ts` | Component exports |

### 6. Cron Job Script

| File | Description |
|------|-------------|
| `frontend/scripts/send-notifications.ts` | Automated notification processing |

### 7. Environment Configuration

| File | Description |
|------|-------------|
| `backend/.env.example` | Added Twilio configuration variables |

## Environment Variables

Add these to your `.env` file:

```bash
# Twilio Configuration
TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_PHONE_NUMBER=+1234567890
TWILIO_WHATSAPP_NUMBER=+1234567890
TWILIO_STATUS_CALLBACK_URL=https://api.mechmind.io/webhooks/notifications/twilio
TWILIO_VERIFY_SERVICE_SID=VA_your_verify_service_sid
TWILIO_MESSAGING_SERVICE_SID=MG_your_messaging_service_sid

# Feature Flags
ENABLE_SMS_NOTIFICATIONS=true
ENABLE_WHATSAPP_NOTIFICATIONS=true
```

## Notification Types

1. **BOOKING_REMINDER** - Sent 24h before appointment
2. **BOOKING_CONFIRMATION** - Sent on booking creation
3. **STATUS_UPDATE** - Service status changes
4. **INVOICE_READY** - Invoice generated notification
5. **MAINTENANCE_DUE** - Scheduled maintenance reminder
6. **INSPECTION_COMPLETE** - DVI inspection results
7. **PAYMENT_REMINDER** - Payment due notification

## Usage Examples

### Send SMS Notification

```typescript
import { NotificationV2Service } from './services/notification-v2.service';

const result = await notificationService.sendImmediate({
  customerId: 'uuid',
  tenantId: 'uuid',
  type: NotificationType.BOOKING_CONFIRMATION,
  channel: NotificationChannel.SMS,
  metadata: {
    date: '15/03/2026',
    time: '14:30',
    bookingCode: 'ABC123',
  },
});
```

### React Component Usage

```tsx
import { SendNotificationButton, NotificationHistory, NotificationPreferences } from '@/components/notifications';

// Send notification button
<SendNotificationButton 
  customerId="uuid" 
  customerName="Mario Rossi"
  defaultType="BOOKING_REMINDER"
/>

// View notification history
<NotificationHistory customerId="uuid" limit={50} />

// Manage preferences
<NotificationPreferences customerId="uuid" />
```

### API Usage

```bash
# Send notification
curl -X POST /api/notifications/send \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "uuid",
    "type": "BOOKING_CONFIRMATION",
    "channel": "SMS",
    "metadata": { "date": "15/03/2026" }
  }'

# Get notification history
curl /api/notifications?customerId=uuid&limit=50

# Update preferences
curl -X PUT /api/notifications/preferences \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "uuid",
    "channel": "WHATSAPP",
    "enabled": true
  }'
```

## Setting Up Twilio

1. **Create Twilio Account:**
   - Sign up at https://www.twilio.com/try-twilio
   - Verify your phone number

2. **Get Credentials:**
   - Account SID from Console Dashboard
   - Auth Token from Console Dashboard

3. **Phone Number:**
   - Buy a phone number in Twilio Console
   - For WhatsApp: Use sandbox or request business approval

4. **WhatsApp Setup:**
   - Go to Messaging → Try it out → Send a WhatsApp message
   - Join sandbox by sending code to the number
   - Or apply for WhatsApp Business API

5. **Webhooks:**
   - Configure status callback URL in Twilio
   - Point to: `https://api.mechmind.io/webhooks/notifications/twilio`

## Running the Cron Job

### Local Development
```bash
npx ts-node scripts/send-notifications.ts
```

### Production (Crontab)
```bash
# Run every hour
0 * * * * cd /path/to/project && npx ts-node scripts/send-notifications.ts >> /var/log/notifications.log 2>&1
```

### Using PM2
```bash
pm2 start scripts/send-notifications.ts --name "notifications-cron" --cron "0 * * * *"
```

## Testing

### SMS Test
```bash
curl -X POST /api/notifications/v2/send \
  -d '{
    "customerId": "test-uuid",
    "tenantId": "test-tenant",
    "type": "STATUS_UPDATE",
    "channel": "SMS",
    "message": "Test SMS from MechMind"
  }'
```

### WhatsApp Test (Sandbox)
```bash
curl -X POST /api/notifications/v2/send \
  -d '{
    "customerId": "test-uuid",
    "type": "STATUS_UPDATE",
    "channel": "WHATSAPP",
    "message": "Test WhatsApp from MechMind"
  }'
```

### Template Preview
```bash
curl -X POST /api/notifications/templates \
  -d '{
    "type": "BOOKING_CONFIRMATION",
    "language": "it",
    "variables": {
      "customerName": "Mario",
      "date": "15/03/2026",
      "time": "14:30"
    }
  }'
```

## Database Migration

Run the migration to create notification tables:

```bash
cd backend
npx prisma migrate dev --name add_notifications
# or
npx prisma db push
```

## Monitoring

### Check Notification Status
```sql
-- Pending notifications
SELECT COUNT(*) FROM notifications WHERE status = 'PENDING';

-- Failed notifications
SELECT * FROM notifications WHERE status = 'FAILED' ORDER BY failed_at DESC;

-- Notifications by type
SELECT type, COUNT(*) FROM notifications GROUP BY type;
```

### API Health Check
```bash
curl /api/notifications/v2/health
```

## Costs

- **SMS (Italy):** ~$0.0075 per segment
- **WhatsApp:** ~$0.005 per message (session-based)
- **Segment calculation:**
  - GSM-7: 160 chars (single), 153 chars (concatenated)
  - UCS-2: 70 chars (single), 67 chars (concatenated)

## Troubleshooting

### Common Issues

1. **SMS not sending:**
   - Check TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN
   - Verify phone number format (E.164)
   - Check Twilio logs in console

2. **WhatsApp not sending:**
   - Ensure number joined sandbox
   - Check WhatsApp Business API approval
   - Verify `whatsapp:` prefix in from number

3. **Notifications stuck in PENDING:**
   - Check cron job is running
   - Verify backend API is accessible
   - Check for errors in logs

### Debug Mode

Set in `.env`:
```bash
NODE_ENV=development
LOG_LEVEL=debug
```

In development mode without Twilio credentials, messages are logged to console instead of being sent.

## Security Considerations

1. **PII Protection:** Phone numbers are encrypted in database
2. **Rate Limiting:** Implemented on all notification endpoints
3. **Authentication:** JWT required for all API calls
4. **Authorization:** Role-based access control (RBAC)

## Future Enhancements

- [ ] Email template support
- [ ] Push notifications
- [ ] Rich media messages (WhatsApp)
- [ ] Scheduled notifications
- [ ] A/B testing for message templates
- [ ] Analytics dashboard
- [ ] Customer opt-in/opt-out management

## Support

For issues or questions:
- Check logs: `pm2 logs` or `/var/log/notifications.log`
- Review Twilio console for delivery status
- Contact: support@mechmind.io
