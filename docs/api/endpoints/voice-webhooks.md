# Voice Webhooks API

MechMind OS integrates with Vapi for AI-powered voice booking. These webhook endpoints receive events from the voice system and handle booking intents.

## Overview

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/webhooks/vapi/call-event` | POST | Signature | General call events |
| `/webhooks/vapi/booking-intent` | POST | Signature | Booking intent from voice |

## Webhook Security

All webhooks from Vapi are signed with an HMAC-SHA256 signature for verification.

### Signature Verification

```python
import hmac
import hashlib

def verify_webhook_signature(payload, signature, secret):
    """Verify Vapi webhook signature"""
    expected = hmac.new(
        secret.encode(),
        payload.encode(),
        hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(f"sha256={expected}", signature)
```

### Headers

| Header | Description |
|--------|-------------|
| `X-Vapi-Signature` | HMAC-SHA256 signature |
| `X-Vapi-Event-Id` | Unique event ID |
| `X-Vapi-Timestamp` | Event timestamp |

## Call Event Webhook

Receives all voice call events from Vapi.

```http
POST /webhooks/vapi/call-event
X-Vapi-Signature: sha256=abc123...
Content-Type: application/json

{
  "event_type": "call.ended",
  "call_id": "call_abc123",
  "timestamp": "2024-01-15T09:30:00Z",
  "payload": {
    "duration_seconds": 180,
    "transcript": [
      {"speaker": "ai", "text": "Hello, how can I help?"},
      {"speaker": "customer", "text": "I need to book an oil change"}
    ],
    "outcome": "booking_confirmed",
    "booking_id": "550e8400-e29b-41d4-a716-446655440000"
  }
}
```

### Event Types

| Event Type | Description |
|------------|-------------|
| `call.started` | Call connected |
| `call.ended` | Call disconnected |
| `call.transcript` | Transcript update |
| `booking.intent` | Customer expressed booking intent |
| `booking.confirmed` | Booking confirmed by customer |

### Response

```json
{
  "status": "processed",
  "event_id": "evt_abc123"
}
```

## Booking Intent Webhook

Handles booking intent extracted from voice conversation.

```http
POST /webhooks/vapi/booking-intent
X-Vapi-Signature: sha256=abc123...
Content-Type: application/json

{
  "call_id": "call_abc123",
  "customer_phone": "+14155551234",
  "requested_date": "2024-01-20",
  "service_type": "Oil Change",
  "preferred_time": "morning",
  "customer_name": "John Smith"
}
```

### Response

```json
{
  "reservation_id": "550e8400-e29b-41d4-a716-446655440001",
  "available_slots": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440002",
      "start_time": "2024-01-20T09:00:00Z",
      "end_time": "2024-01-20T10:00:00Z",
      "mechanic": {
        "id": "550e8400-e29b-41d4-a716-446655440003",
        "name": "Mike Johnson"
      }
    },
    {
      "id": "550e8400-e29b-41d4-a716-446655440004",
      "start_time": "2024-01-20T10:00:00Z",
      "end_time": "2024-01-20T11:00:00Z",
      "mechanic": {
        "id": "550e8400-e29b-41d4-a716-446655440003",
        "name": "Mike Johnson"
      }
    }
  ],
  "confirmation_required": true
}
```

## Voice Booking Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Customer  │────▶│  Vapi AI    │────▶│   Webhook   │
│    Calls    │     │  Assistant  │     │   Handler   │
└─────────────┘     └─────────────┘     └──────┬──────┘
                                               │
                    ┌─────────────┐     ┌──────▼──────┐
                    │  Customer   │◀────│   Reserve   │
                    │  Confirms   │     │    Slot     │
                    └─────────────┘     └─────────────┘
```

### Flow Steps

1. **Incoming Call**: Customer calls the shop's voice number
2. **AI Greeting**: Vapi AI assistant answers and identifies intent
3. **Intent Extraction**: AI extracts booking details (date, service, preferences)
4. **Webhook Trigger**: `booking-intent` webhook sent to MechMind OS
5. **Slot Query**: System finds available slots matching preferences
6. **Slot Reservation**: First matching slot is reserved (5-min lock)
7. **AI Response**: AI presents options to customer
8. **Confirmation**: Customer confirms booking
9. **Booking Created**: Reservation converted to confirmed booking

## Webhook Handler Implementation

### Python (FastAPI)

```python
from fastapi import FastAPI, Request, HTTPException
import hmac
import hashlib

app = FastAPI()
VAPI_WEBHOOK_SECRET = "your_webhook_secret"

async def verify_signature(request: Request) -> bool:
    body = await request.body()
    signature = request.headers.get("X-Vapi-Signature", "")
    
    expected = hmac.new(
        VAPI_WEBHOOK_SECRET.encode(),
        body,
        hashlib.sha256
    ).hexdigest()
    
    return hmac.compare_digest(f"sha256={expected}", signature)

@app.post("/webhooks/vapi/booking-intent")
async def handle_booking_intent(request: Request):
    if not await verify_signature(request):
        raise HTTPException(status_code=401, detail="Invalid signature")
    
    data = await request.json()
    
    # Find available slots
    slots = await find_available_slots(
        date=data["requested_date"],
        service_type=data["service_type"],
        preferred_time=data.get("preferred_time")
    )
    
    if not slots:
        return {
            "reservation_id": None,
            "available_slots": [],
            "message": "No slots available for the requested date"
        }
    
    # Reserve the first available slot
    reservation = await reserve_slot(
        slot_id=slots[0]["id"],
        customer_phone=data["customer_phone"]
    )
    
    return {
        "reservation_id": reservation["id"],
        "available_slots": slots[:3],  # Return top 3 options
        "confirmation_required": True
    }
```

### Node.js (Express)

```javascript
const express = require('express');
const crypto = require('crypto');

const app = express();
const VAPI_WEBHOOK_SECRET = process.env.VAPI_WEBHOOK_SECRET;

function verifySignature(payload, signature) {
  const expected = crypto
    .createHmac('sha256', VAPI_WEBHOOK_SECRET)
    .update(payload)
    .digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(`sha256=${expected}`)
  );
}

app.post('/webhooks/vapi/booking-intent', 
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    const signature = req.headers['x-vapi-signature'];
    
    if (!verifySignature(req.body, signature)) {
      return res.status(401).json({ error: 'Invalid signature' });
    }
    
    const data = JSON.parse(req.body);
    
    // Process booking intent
    const slots = await findAvailableSlots(data);
    
    if (slots.length === 0) {
      return res.json({
        reservation_id: null,
        available_slots: [],
        message: 'No slots available'
      });
    }
    
    const reservation = await reserveSlot(slots[0].id, data.customer_phone);
    
    res.json({
      reservation_id: reservation.id,
      available_slots: slots.slice(0, 3),
      confirmation_required: true
    });
  }
);
```

## Error Handling

### Webhook Timeouts

Vapi expects a response within 5 seconds. Implement async processing:

```python
@app.post("/webhooks/vapi/booking-intent")
async def handle_booking_intent(request: Request):
    # Verify signature
    # ...
    
    data = await request.json()
    
    # Queue for async processing
    await queue_background_task("process_booking_intent", data)
    
    # Return immediate acknowledgment
    return {
        "status": "processing",
        "check_status_url": f"/v1/booking-status/{data['call_id']}"
    }
```

### Retry Logic

Vapi retries failed webhooks with exponential backoff:

| Attempt | Delay |
|---------|-------|
| 1 | Immediate |
| 2 | 5 seconds |
| 3 | 25 seconds |
| 4 | 2 minutes |
| 5 | 10 minutes |

Ensure your endpoint is idempotent to handle retries safely.

## Testing Webhooks

### Using ngrok for Local Development

```bash
# Start your local server
python app.py

# Expose via ngrok
ngrok http 8000

# Configure webhook URL in Vapi dashboard
# https://your-ngrok-url.ngrok.io/webhooks/vapi/booking-intent
```

### Webhook Testing Tool

```bash
# Send test webhook
curl -X POST http://localhost:8000/webhooks/vapi/booking-intent \
  -H "Content-Type: application/json" \
  -H "X-Vapi-Signature: sha256=test" \
  -d '{
    "call_id": "test_call_123",
    "customer_phone": "+14155551234",
    "requested_date": "2024-01-20",
    "service_type": "Oil Change"
  }'
```
