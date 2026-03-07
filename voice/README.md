# MechMind OS v10 - Voice AI Integration

AI-powered voice booking system for automotive repair shops using Vapi.ai and Twilio.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         MechMind OS v10 - Voice Layer                    │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐               │
│  │   Vapi.ai    │◄──►│   Webhooks   │◄──►│   Backend    │               │
│  │   (Voice)    │    │   Handlers   │    │     API      │               │
│  └──────────────┘    └──────────────┘    └──────────────┘               │
│         │                   │                                            │
│         │            ┌──────┴──────┐                                     │
│         │            │             │                                     │
│         ▼            ▼             ▼                                     │
│  ┌──────────────┐  ┌──────────┐  ┌──────────┐                           │
│  │   Twilio     │  │ Intents  │  │  Tools   │                           │
│  │  (PSTN/SMS)  │  │ Handlers │  │  Layer   │                           │
│  └──────────────┘  └──────────┘  └──────────┘                           │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

## Directory Structure

```
voice/
├── vapi-config.json          # Vapi assistant configuration
├── index.js                  # Main Express server
├── README.md                 # This file
│
├── webhooks/                 # Webhook handlers
│   ├── call-event-handler.js # Main Vapi call event handler
│   ├── function-handler.js   # Function call processor
│   └── transfer-handler.js   # Human transfer handler
│
├── twilio/                   # Twilio integration
│   ├── sms.js               # SMS sending/receiving
│   └── transfer.js          # Call transfer logic
│
├── intents/                  # Intent handlers
│   ├── booking-intent.js    # Booking requests
│   ├── status-intent.js     # Work status checks
│   ├── complaint-intent.js  # Complaint handling
│   └── general-intent.js    # General inquiries
│
├── tools/                    # Backend tools
│   ├── customer-lookup.js   # Customer data lookup
│   ├── slot-query.js        # Calendar/slot queries
│   ├── booking-tools.js     # Booking CRUD
│   └── escalation-tools.js  # Human escalation
│
└── utils/                    # Utilities
    ├── hmac.js              # HMAC verification
    └── logger.js            # Structured logging
```

## Quick Start

### 1. Environment Variables

```bash
# Vapi Configuration
VAPI_WEBHOOK_SECRET=your_vapi_webhook_secret

# Twilio Configuration
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_SMS_NUMBER=+39123456789

# Backend API
BACKEND_API_URL=https://api.mechmind-os.com
BACKEND_API_TOKEN=your_backend_api_token

# Fallback Numbers
FALLBACK_SHOP_NUMBER=+39987654321

# Server
PORT=3000
NODE_ENV=production
```

### 2. Install Dependencies

```bash
npm install express cors helmet express-rate-limit twilio node-fetch
```

### 3. Start Server

```bash
node index.js
```

## Webhook Endpoints

### Vapi Webhooks

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/webhooks/vapi/call-event` | POST | Main call event handler |
| `/webhooks/vapi/transfer` | POST | Transfer to human |

### Twilio Webhooks

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/twilio/sms-incoming` | POST | Incoming SMS handler |
| `/twilio/sms-status` | POST | SMS delivery status |
| `/twilio/transfer-status` | POST | Transfer status callback |
| `/twilio/queue-check` | POST | Queue status check |
| `/twilio/callback-confirm` | POST | Callback confirmation |
| `/twilio/conference-status` | POST | Conference status |
| `/twilio/recording-status` | POST | Recording status |
| `/twilio/voicemail-received` | POST | Voicemail handler |

### Health & API

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/ready` | GET | Readiness check |
| `/api/config/:shopId` | GET | Shop voice config |
| `/api/stats/:shopId` | GET | Call statistics |

## Voice Flow Architecture

### 1. Call Initiation

```
Customer calls → Twilio PSTN → Vapi AI → Webhook (call.started)
                                        ↓
                              [Lookup customer by phone]
                                        ↓
                              Greeting: "Bentornato [Name]!"
```

### 2. Intent Detection

```
Customer: "Ho bisogno di una revisione"
              ↓
    [Intent Detection]
              ↓
    ┌─────────┴─────────┐
    ↓                   ↓
[Booking Intent]   [Status Intent]
    ↓                   ↓
[Get vehicles]     [Check active work]
    ↓                   ↓
[Show slots]       [Report status]
```

### 3. Booking Flow

```
1. Identify customer (phone lookup)
2. Select vehicle (if multiple)
3. Determine service type
4. Check urgency level
5. Query available slots
6. Customer selects slot
7. Create booking
8. Send SMS confirmation
```

### 4. Escalation Flow

```
AI doesn't understand (2 turns)
              ↓
    OR complaint detected
              ↓
    OR negative sentiment (< -0.6)
              ↓
    [Escalate to Human]
              ↓
    ┌─────────┴─────────┐
    ↓                   ↓
[Staff Available]   [Queue/Callback]
    ↓                   ↓
[Direct Transfer]   [Offer Callback]
```

## Intent Handlers

### Booking Intent

Handles:
- New booking requests
- Booking modifications
- Booking cancellations
- Availability inquiries

Key patterns:
```javascript
/prenot|appunt|revisione|tagliando/i  // Booking keywords
/quando|quanto|libero|disponibile/i    // Availability
```

### Status Intent

Handles:
- Work progress checks
- Completion time inquiries
- Parts availability
- Pickup readiness

Key patterns:
```javascript
/quando.*pront|finit|complet/i         // Completion time
/dove|come.*lavorazione|stato/i        // Progress check
```

### Complaint Intent

Handles:
- Service complaints
- Billing disputes
- Quality issues
- Automatic escalation

Features:
- Sentiment analysis
- De-escalation responses
- Priority escalation
- Manager notification

### General Intent

Handles:
- Opening hours
- Location/directions
- Services offered
- Pricing information
- GDPR requests

## Function Tools

### Customer Lookup

```javascript
lookupCustomerByPhone(phoneNumber, shopId)
// Returns: { found, customer, vehicles, stats }
```

### Vehicle History

```javascript
getVehicleHistory(customerId, vehicleId, shopId)
// Returns: { vehicles, serviceHistory, upcomingMaintenance }
```

### Slot Query

```javascript
getAvailableSlots({ shopId, serviceType, urgency, daysAhead })
// Returns: { found, slots, serviceType, duration }
```

### Booking Creation

```javascript
createBooking({ customerId, shopId, vehicleId, serviceType, scheduledAt })
// Returns: { success, booking, confirmationCode, smsSent }
```

### Escalation

```javascript
escalateToHuman({ phoneNumber, shopId, reason, priority, context })
// Returns: { success, escalated, transferType, estimatedWait }
```

## SMS Templates

### Booking Confirmation
```
Conferma prenotazione [CODE]: [SERVICE] il [DATE] alle [TIME].
Indirizzo: [ADDRESS]. Per modifiche chiama [PHONE]
```

### Booking Reminder
```
Promemoria: domani alle [TIME] hai [SERVICE] in officina.
Conferma: [CODE]. Ci vediamo presto!
```

### Work Ready
```
Buone notizie! La tua [VEHICLE] è pronta per il ritiro.
Orari: [HOURS]. A presto!
```

## Security

### HMAC Verification

All webhooks verify HMAC signatures:

```javascript
const { verifyHmacSignature } = require('./utils/hmac');

// Vapi webhooks
verifyHmacSignature(payload, signature, secret);

// Twilio webhooks
verifyTwilioSignature(authToken, url, params, signature);
```

### Rate Limiting

```javascript
// 100 requests per minute per IP
const webhookLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 100
});
```

## Fail-Safe Patterns

### AI Timeout
```
If AI response > 5 seconds:
  → Transfer to fallback number
  → Log timeout event
  → Send SMS recap
```

### Unknown Intent
```
If unknown intent for 2 consecutive turns:
  → Escalate to human
  → "Mi scuso, ti passo a un collega"
```

### Booking Failure
```
If slot no longer available:
  → Offer alternative slots
  → Or add to waitlist
  → "Purtroppo non ho più slot, ti metto in lista d'attesa"
```

### Call Drop
```
If call drops < 30 seconds:
  → Send SMS recap
  → Schedule callback
  → "Grazie per aver chiamato, ti richiamiamo"
```

## Configuration

### Vapi Assistant Config

See `vapi-config.json` for:
- System prompt (Italian)
- Voice settings (ElevenLabs)
- Function definitions
- First message
- End call phrases

### Service Types

```javascript
const SERVICE_CONFIG = {
  revisione: { durationMinutes: 60 },
  tagliando: { durationMinutes: 90 },
  riparazione: { durationMinutes: 120 },
  gomme: { durationMinutes: 45 },
  elettronica: { durationMinutes: 60 },
  emergenza: { durationMinutes: 30 }
};
```

### Urgency Levels

```javascript
const URGENCY_CONFIG = {
  emergency: { daysToSearch: 2, allowSameDay: true },
  high: { daysToSearch: 3, allowSameDay: true },
  medium: { daysToSearch: 14 },
  low: { daysToSearch: 30 }
};
```

## Monitoring

### Health Checks

- `/health` - Service health
- `/ready` - Readiness (backend, Twilio, Vapi)

### Metrics

- Call volume
- Average call duration
- Escalation rate
- Booking conversion rate
- SMS delivery rate

### Logging

Structured logs for:
- Call events
- Function calls
- Intent detection
- Escalations
- Performance metrics
- Errors

## GDPR Compliance

- Data retention: 30 days without consent
- Right to be forgotten: Immediate deletion
- Consent tracking: Per-customer consent flag
- SMS opt-out: Automatic handling

## Testing

### Local Testing

```bash
# Start with ngrok for webhook testing
ngrok http 3000

# Update Vapi webhook URL
# Update Twilio webhook URLs
```

### Test Scenarios

1. New customer booking
2. Existing customer booking
3. Status check
4. Complaint escalation
5. Emergency request
6. Call drop handling
7. SMS confirmation

## Troubleshooting

### Common Issues

**HMAC verification fails:**
- Check webhook secret
- Verify timestamp tolerance
- Check payload encoding

**Transfer fails:**
- Verify Twilio credentials
- Check staff availability endpoint
- Review transfer handler logs

**SMS not sent:**
- Check Twilio SMS number
- Verify rate limits
- Check SMS status callbacks

## Support

For issues or questions:
- Check logs in `/analytics/call-events`
- Review escalation logs
- Monitor error tracking
- Contact: support@mechmind-os.com

## License

Proprietary - MechMind OS v10
