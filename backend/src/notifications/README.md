# MechMind OS - Notification System

Sistema di notifiche transazionali Email/SMS con Resend e Twilio.

## Features

- 📧 **Email con Resend**: 3,000 email/mese gratis
- 📱 **SMS con Twilio**: €0.0075/SMS per l'Italia
- 🔄 **Fallback automatico**: SMS → Email se il primo fallisce
- 📨 **Template React Email**: Email responsive e moderne
- 📊 **Webhook handlers**: Tracking delivery status
- 🐂 **BullMQ queues**: Processamento asincrono

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                 NotificationOrchestratorService         │
│                    (Determina canale)                   │
└────────────────┬────────────────────────────────────────┘
                 │
        ┌────────┴────────┐
        │                 │
   ┌────▼────┐      ┌────▼────┐
   │   SMS   │      │  Email  │
   │ Twilio  │      │ Resend  │
   └────┬────┘      └────┬────┘
        │                 │
   ┌────▼────┐      ┌────▼────┐
   │  Fallisce│      │  Success│
   └────┬────┘      └────┬────┘
        │                 │
   ┌────▼────────────────┐
   │  Fallback → Email   │
   └─────────────────────┘
```

## Configuration

Aggiungi al `.env`:

```env
# Resend (Email)
RESEND_API_KEY=re_your_resend_api_key
RESEND_WEBHOOK_SECRET=your_resend_webhook_secret
EMAIL_FROM_ADDRESS=noreply@mechmind.io
EMAIL_FROM_NAME=MechMind
ENABLE_EMAIL_NOTIFICATIONS=true

# Twilio (SMS)
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=+393331234567
TWILIO_STATUS_CALLBACK_URL=https://api.mechmind.io/webhooks/notifications/twilio
ENABLE_SMS_NOTIFICATIONS=true
```

## Usage

### Basic Notification

```typescript
import { NotificationOrchestratorService, NotificationType, NotificationChannel } from '@notifications';

// Automatic channel selection (SMS first, Email fallback)
await this.notificationService.notifyCustomer(
  customerId,
  tenantId,
  NotificationType.BOOKING_CONFIRMATION,
  {
    service: 'Tagliando',
    date: '2024-03-15',
    time: '14:30',
    vehicle: 'Fiat Panda',
    bookingCode: 'BK-2024-001',
  }
);
```

### Force Specific Channel

```typescript
// Solo SMS
await this.notificationService.notifyCustomer(
  customerId,
  tenantId,
  NotificationType.BOOKING_REMINDER,
  data,
  NotificationChannel.SMS
);

// Solo Email
await this.notificationService.notifyCustomer(
  customerId,
  tenantId,
  NotificationType.INVOICE_READY,
  data,
  NotificationChannel.EMAIL
);

// Entrambi
await this.notificationService.notifyCustomer(
  customerId,
  tenantId,
  NotificationType.BOOKING_CONFIRMATION,
  data,
  NotificationChannel.BOTH
);
```

### Direct Service Usage

```typescript
// Email diretto
await this.emailService.sendBookingConfirmation({
  customerName: 'Mario Rossi',
  customerEmail: 'mario@example.com',
  service: 'Tagliando',
  date: '2024-03-15',
  time: '14:30',
  vehicle: 'Fiat Panda ABC123',
  bookingCode: 'BK-2024-001',
  workshopName: 'Officina Rossi',
  workshopAddress: 'Via Roma 123, Milano',
  workshopPhone: '+39 02 1234567',
});

// SMS diretto
await this.smsService.sendBookingConfirmation('+393331234567', {
  date: '15/03/2024',
  time: '14:30',
  service: 'Tagliando',
  workshopName: 'Officina Rossi',
  bookingCode: 'BK-001',
});
```

## API Endpoints

### Send Notifications

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/notifications/send` | Generic notification |
| POST | `/api/v1/notifications/booking/confirmation` | Booking confirmation |
| POST | `/api/v1/notifications/booking/reminder` | Booking reminder |
| POST | `/api/v1/notifications/invoice/ready` | Invoice ready |
| POST | `/api/v1/notifications/gdpr/export-ready` | GDPR export ready |
| POST | `/api/v1/notifications/bulk` | Bulk notifications |
| POST | `/api/v1/notifications/queue` | Queue for later |
| POST | `/api/v1/notifications/test` | Test notification |

### Utilities

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/notifications/sms/templates` | SMS templates |
| POST | `/api/v1/notifications/sms/calculate-cost` | Calculate SMS cost |
| POST | `/api/v1/notifications/sms/validate-phone` | Validate phone |
| GET | `/api/v1/notifications/email/status/:emailId` | Email status |
| GET | `/api/v1/notifications/stats` | Statistics |
| GET | `/api/v1/notifications/health` | Health check |

### Webhooks

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/webhooks/notifications/resend` | Resend events |
| POST | `/webhooks/notifications/twilio` | Twilio delivery status |
| POST | `/webhooks/notifications/twilio/incoming` | Incoming SMS |

## Email Templates

- `BookingConfirmationEmail` - Conferma prenotazione
- `BookingReminderEmail` - Promemoria appuntamento
- `InvoiceReadyEmail` - Fattura disponibile
- `GdprDataExportEmail` - Esportazione GDPR pronta
- `WelcomeEmail` - Benvenuto nuovo cliente
- `PasswordResetEmail` - Reset password
- `BookingCancelledEmail` - Prenotazione annullata

## SMS Templates

- `booking_confirmation` - Conferma prenotazione
- `booking_reminder` - Promemoria (24h prima)
- `same_day_reminder` - Promemoria (giorno stesso)
- `invoice_ready` - Fattura pronta
- `booking_cancelled` - Prenotazione annullata
- `gdpr_export` - Esportazione dati pronta
- `password_reset` - Codice reset password

## Costs

### Resend (Email)
- **Free tier**: 3,000 email/mese
- **Pro**: $20/mese per 50,000 email

### Twilio (SMS)
- **Italia**: $0.0075 per SMS (~€0.007)
- **Esempio**: 1000 SMS = ~€7

## Webhook Setup

### Resend
1. Vai su https://resend.com/webhooks
2. Aggiungi endpoint: `https://api.mechmind.io/webhooks/notifications/resend`
3. Seleziona eventi: `email.sent`, `email.delivered`, `email.bounced`, `email.complained`

### Twilio
1. Vai su Console → Phone Numbers → Manage → Active Numbers
2. Seleziona il tuo numero
3. Imposta "Messaging" webhook: `https://api.mechmind.io/webhooks/notifications/twilio`
4. Imposta "A MESSAGE COMES IN" webhook: `https://api.mechmind.io/webhooks/notifications/twilio/incoming`

## Testing

```bash
# Test email
curl -X POST http://localhost:3000/api/v1/notifications/test \
  -H "Content-Type: application/json" \
  -d '{
    "type": "booking_confirmation",
    "channel": "email",
    "recipient": "test@example.com"
  }'

# Test SMS
curl -X POST http://localhost:3000/api/v1/notifications/test \
  -H "Content-Type: application/json" \
  -d '{
    "type": "booking_confirmation",
    "channel": "sms",
    "recipient": "+393331234567"
  }'
```

## Events

Il sistema emette eventi per integrazioni:

```typescript
// notification.sent
{
  notificationId: string;
  customerId: string;
  tenantId: string;
  type: NotificationType;
  channel: NotificationChannel;
  success: boolean;
}

// notification.failed
{
  notificationId: string;
  customerId: string;
  tenantId: string;
  type: NotificationType;
  channel: NotificationChannel;
  error: string;
  fallbackAttempted?: boolean;
}
```

## Queue Management

Le notifiche sono processate tramite BullMQ:

```bash
# Monitora la coda
npm run queue:monitor

# Pulisci job completati
npm run queue:clean
```

## Monitoring

- **Logs**: Tutte le notifiche sono loggate con `notificationId`
- **Metrics**: Tracciamento delivery rate, open rate, click rate
- **Alerts**: Alert automatici per failure rate elevato
