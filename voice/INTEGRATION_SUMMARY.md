# MechMind OS v10 - Voice AI Integration Summary

## Overview

This document provides a comprehensive summary of the Voice AI Integration layer for MechMind OS v10, implementing an AI-powered voice booking system for Italian automotive repair shops using Vapi.ai and Twilio.

---

## Files Created

### Configuration Files
| File | Purpose |
|------|---------|
| `vapi-config.json` | Vapi assistant configuration with Italian system prompt |
| `package.json` | Node.js dependencies and scripts |
| `.env.example` | Environment variable template |

### Core Server
| File | Purpose |
|------|---------|
| `index.js` | Express server with all webhook routes and middleware |

### Webhook Handlers (`webhooks/`)
| File | Purpose |
|------|---------|
| `call-event-handler.js` | Main Vapi call event handler (started, ended, function_call, status_update, transcript) |
| `function-handler.js` | Processes all Vapi function calls (7 functions) |
| `transfer-handler.js` | Human transfer logic with queue management |

### Twilio Integration (`twilio/`)
| File | Purpose |
|------|---------|
| `sms.js` | SMS sending/receiving with templates |
| `transfer.js` | Call transfer logic with conference bridging |

### Intent Handlers (`intents/`)
| File | Purpose |
|------|---------|
| `booking-intent.js` | Booking requests, modifications, cancellations |
| `status-intent.js` | Work status checks, parts inquiries |
| `complaint-intent.js` | Complaint handling with de-escalation |
| `general-intent.js` | Opening hours, location, services, pricing |

### Backend Tools (`tools/`)
| File | Purpose |
|------|---------|
| `customer-lookup.js` | Phone-based customer lookup with caching |
| `slot-query.js` | Calendar availability queries |
| `booking-tools.js` | Booking CRUD operations |
| `escalation-tools.js` | Human escalation with priority handling |

### Utilities (`utils/`)
| File | Purpose |
|------|---------|
| `hmac.js` | HMAC signature verification for security |
| `logger.js` | Structured logging for analytics |

### Documentation
| File | Purpose |
|------|---------|
| `README.md` | Complete integration guide |
| `INTEGRATION_SUMMARY.md` | This document |

---

## Voice Flow Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        VOICE FLOW DIAGRAM                                    │
└─────────────────────────────────────────────────────────────────────────────┘

[INCOMING CALL]
      │
      ▼
┌─────────────────┐
│ 1. CALL STARTED │ ──► Lookup customer by phone
└────────┬────────┘      Pre-fetch data for faster response
         │
         ▼
┌─────────────────┐
│ 2. GREETING     │ ──► "Bentornato [Name]!" or "Benvenuto!"
└────────┬────────┘
         │
         ▼
┌─────────────────┐     ┌─────────────────┐
│ 3. INTENT       │────►│ BOOKING         │
│    DETECTION    │     │ REQUEST         │
└────────┬────────┘     └────────┬────────┘
         │                        │
         │                        ▼
         │               ┌─────────────────┐
         │               │ Get vehicles    │
         │               │ Get slots       │
         │               │ Create booking  │
         │               │ Send SMS conf   │
         │               └────────┬────────┘
         │                        │
         │     ┌─────────────────┐│
         └────►│ STATUS CHECK    ││
               │ REQUEST         ││
               └────────┬────────┘│
                        │         │
                        ▼         │
               ┌─────────────────┐│
               │ Check active    ││
               │ work status     ││
               │ Report progress ││
               └────────┬────────┘│
                        │         │
         ┌──────────────┘         │
         │     ┌─────────────────┐│
         └────►│ COMPLAINT       ││
               │ DETECTED        ││
               └────────┬────────┘│
                        │         │
                        ▼         │
               ┌─────────────────┐│
               │ Sentiment       ││
               │ analysis        ││
               │ De-escalation   ││
               │ OR Escalate     │◄┘
               └────────┬────────┘
                        │
                        ▼
               ┌─────────────────┐
               │ ESCALATE TO     │
               │ HUMAN           │
               └────────┬────────┘
                        │
         ┌──────────────┴──────────────┐
         │                             │
         ▼                             ▼
┌─────────────────┐          ┌─────────────────┐
│ DIRECT TRANSFER │          │ QUEUE/CALLBACK  │
│ (staff avail)   │          │ (staff busy)    │
└─────────────────┘          └─────────────────┘
```

---

## Vapi Function Definitions

The system exposes 7 functions to the Vapi AI assistant:

### 1. `lookup_customer_by_phone`
```javascript
{
  name: "lookup_customer_by_phone",
  description: "Cerca cliente nel database per numero telefonico",
  parameters: {
    phone_number: "string (E.164 format)"
  }
}
```

### 2. `get_vehicle_history`
```javascript
{
  name: "get_vehicle_history",
  description: "Recupera storico veicolo e ultimi interventi",
  parameters: {
    customer_id: "string",
    license_plate: "string (optional)"
  }
}
```

### 3. `get_available_slots`
```javascript
{
  name: "get_available_slots",
  description: "Ottiene slot disponibili per prenotazione",
  parameters: {
    shop_id: "string",
    service_type: "string",
    days_ahead: "integer (default 14)",
    urgency: "enum: low, medium, high, emergency"
  }
}
```

### 4. `create_booking`
```javascript
{
  name: "create_booking",
  description: "Crea una nuova prenotazione",
  parameters: {
    customer_id: "string",
    shop_id: "string",
    vehicle_id: "string",
    service_type: "string",
    scheduled_at: "string (ISO 8601)",
    duration_minutes: "integer",
    notes: "string",
    urgency: "enum"
  }
}
```

### 5. `check_booking_status`
```javascript
{
  name: "check_booking_status",
  description: "Verifica stato lavorazione veicolo",
  parameters: {
    customer_id: "string",
    license_plate: "string (optional)"
  }
}
```

### 6. `escalate_to_human`
```javascript
{
  name: "escalate_to_human",
  description: "Trasferisce chiamata a operatore umano",
  parameters: {
    reason: "string",
    priority: "enum: low, normal, high, urgent",
    context: "string"
  }
}
```

### 7. `send_sms_confirmation`
```javascript
{
  name: "send_sms_confirmation",
  description: "Invia SMS di conferma prenotazione",
  parameters: {
    phone_number: "string",
    booking_id: "string",
    message_type: "enum: confirmation, reminder, cancellation, ready"
  }
}
```

---

## Webhook Endpoints

### Vapi Endpoints
| Endpoint | Method | Security |
|----------|--------|----------|
| `/webhooks/vapi/call-event` | POST | HMAC signature |
| `/webhooks/vapi/transfer` | POST | HMAC signature |

### Twilio Endpoints
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/twilio/sms-incoming` | POST | Incoming SMS |
| `/twilio/sms-status` | POST | SMS delivery status |
| `/twilio/transfer-status` | POST | Transfer status |
| `/twilio/queue-check` | POST | Queue status check |
| `/twilio/callback-confirm` | POST | Callback confirmation |
| `/twilio/conference-status` | POST | Conference events |
| `/twilio/recording-status` | POST | Recording status |
| `/twilio/voicemail-received` | POST | Voicemail handling |

### Health & API
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Service health |
| `/ready` | GET | Readiness check |
| `/api/config/:shopId` | GET | Shop voice config |
| `/api/stats/:shopId` | GET | Call statistics |

---

## Integration Points with Backend

### Required Backend API Endpoints

```
# Customer Management
GET  /customers/lookup?phone={phone}
POST /customers
GET  /customers/{id}/vehicles
GET  /customers/{id}/loyalty

# Booking Management
GET  /bookings/{id}
POST /bookings
PATCH /bookings/{id}
POST /bookings/{id}/cancel
GET  /customers/{id}/bookings/active
GET  /bookings/{id}/status

# Calendar/Slots
GET  /shops/{id}/slots/available
POST /shops/{id}/slots/check
GET  /shops/{id}/slots/emergency
GET  /shops/{id}/schedule

# Shop Management
GET  /shops/{id}
GET  /shops/{id}/staff/available
GET  /shops/{id}/staff/availability

# Escalation
POST /escalations
POST /escalation-queue
GET  /escalation-queue/status

# Waitlist
POST /waitlist

# Callbacks
POST /callbacks

# Analytics
POST /analytics/call-events
POST /analytics/transfers
POST /analytics/sms
POST /logs/batch

# Health
GET  /health
```

---

## Fail-Safe Patterns

### 1. AI Timeout (> 5 seconds)
```
Action: Transfer to fallback number
Message: "Aspetta un momento, ti passo a un collega umano"
Log: timeout event for analytics
```

### 2. Unknown Intent (2 consecutive turns)
```
Action: Escalate to human
Message: "Mi scuso, non capisco bene. Ti passo a un collega"
Log: unknown_intent escalation
```

### 3. Booking Conflict (slot taken)
```
Action: Offer alternative slots or waitlist
Message: "Lo slot non è più disponibile. Ho queste alternative..."
Fallback: Add to waitlist
```

### 4. Call Drop (< 30 seconds)
```
Action: Send SMS recap
Message: "Grazie per aver chiamato. Ti richiamiamo al più presto"
Schedule: Automatic callback
```

### 5. Negative Sentiment (< -0.6)
```
Action: Immediate escalation
Message: De-escalation attempt first, then transfer
Priority: high/urgent
```

---

## Environment Variables Required

```bash
# Required
VAPI_WEBHOOK_SECRET=
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_SMS_NUMBER=
BACKEND_API_URL=
BACKEND_API_TOKEN=
FALLBACK_SHOP_NUMBER=
WEBHOOK_BASE_URL=

# Optional (with defaults)
NODE_ENV=production
PORT=3000
LOG_LEVEL=info
ALLOWED_ORIGINS=
ENABLE_SMS_CONFIRMATIONS=true
MAX_RESPONSE_TIME_MS=2500
```

---

## Security Features

1. **HMAC Signature Verification** - All webhooks verified
2. **Rate Limiting** - 100 requests/minute per IP
3. **CORS** - Origin whitelist
4. **Helmet** - Security headers
5. **Timestamp Validation** - Prevent replay attacks
6. **Timing-Safe Comparison** - Signature verification

---

## GDPR Compliance

- **Data Retention**: 30 days without explicit consent
- **Right to Erasure**: Immediate deletion on request
- **Consent Tracking**: Per-customer consent flag
- **SMS Opt-out**: Automatic handling
- **Logging**: Hashed PII in logs

---

## Performance Targets

| Metric | Target | Implementation |
|--------|--------|----------------|
| Response Time | < 2.5s | Cached lookups, optimized queries |
| Fallback Timeout | 5s | Automatic transfer on timeout |
| SMS Delivery | < 10s | Async sending with retry |
| Escalation | < 30s | Direct transfer or callback offer |

---

## Next Steps for Integration

1. **Deploy Server**
   ```bash
   npm install
   cp .env.example .env
   # Edit .env with your credentials
   npm start
   ```

2. **Configure Vapi**
   - Import `vapi-config.json`
   - Set webhook URL to `/webhooks/vapi/call-event`
   - Configure phone number

3. **Configure Twilio**
   - Set webhook URLs for voice and SMS
   - Configure fallback numbers

4. **Test Flows**
   - New customer booking
   - Existing customer booking
   - Status check
   - Complaint escalation
   - Emergency request

5. **Monitor**
   - Check `/health` endpoint
   - Review logs in backend
   - Monitor escalation rates

---

## File Locations

All files are located at:
```
/mnt/okcomputer/output/mechmind-os/voice/
```

---

## Support

For questions or issues:
- Review README.md for detailed documentation
- Check logs in backend analytics
- Monitor error tracking
- Contact: support@mechmind-os.com
