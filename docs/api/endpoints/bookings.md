# Bookings API

The Bookings API manages appointment scheduling for automotive repair shops. It supports real-time slot reservations, booking creation, and lifecycle management.

## Overview

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/v1/bookings` | GET | List bookings |
| `/v1/bookings` | POST | Create booking |
| `/v1/bookings/reserve` | POST | Reserve slot with lock |
| `/v1/bookings/{id}` | GET | Get booking details |
| `/v1/bookings/{id}` | PATCH | Update booking |
| `/v1/bookings/{id}` | DELETE | Cancel booking |
| `/v1/bookings/{id}/confirm` | POST | Confirm reserved booking |

## List Bookings

Retrieve a paginated list of bookings with filtering options.

```http
GET /v1/bookings?start_date=2024-01-01&end_date=2024-01-31&status=confirmed
Authorization: Bearer {token}
```

### Query Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `page` | integer | Page number (default: 1) |
| `limit` | integer | Items per page (default: 20, max: 100) |
| `start_date` | date | Filter from date (YYYY-MM-DD) |
| `end_date` | date | Filter to date (YYYY-MM-DD) |
| `mechanic_id` | uuid | Filter by mechanic |
| `customer_id` | uuid | Filter by customer |
| `status` | string | Filter by status |

### Response

```json
{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "shop_id": "550e8400-e29b-41d4-a716-446655440001",
      "status": "confirmed",
      "customer": {
        "id": "550e8400-e29b-41d4-a716-446655440002",
        "name": "Jane Doe",
        "phone": "+14155551234"
      },
      "mechanic": {
        "id": "550e8400-e29b-41d4-a716-446655440003",
        "name": "Mike Johnson",
        "specialties": ["engine", "transmission"]
      },
      "slot": {
        "id": "550e8400-e29b-41d4-a716-446655440004",
        "start_time": "2024-01-15T09:00:00Z",
        "end_time": "2024-01-15T10:00:00Z"
      },
      "service_type": "Oil Change",
      "vehicle_info": {
        "make": "Toyota",
        "model": "Camry",
        "year": 2020,
        "license_plate": "ABC123"
      },
      "created_at": "2024-01-10T14:30:00Z",
      "confirmed_at": "2024-01-10T14:35:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 156,
    "total_pages": 8,
    "has_next": true,
    "has_prev": false
  }
}
```

## Create Booking

Create a new booking for a customer.

```http
POST /v1/bookings
Authorization: Bearer {token}
Content-Type: application/json

{
  "slot_id": "550e8400-e29b-41d4-a716-446655440004",
  "mechanic_id": "550e8400-e29b-41d4-a716-446655440003",
  "customer_phone": "+14155551234",
  "customer_name": "Jane Doe",
  "customer_email": "jane@example.com",
  "vehicle_info": {
    "make": "Toyota",
    "model": "Camry",
    "year": 2020,
    "license_plate": "ABC123"
  },
  "service_type": "Oil Change",
  "notes": "Customer mentioned hearing a noise",
  "source": "web"
}
```

### Response (201 Created)

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440005",
  "status": "confirmed",
  "customer": {
    "id": "550e8400-e29b-41d4-a716-446655440002",
    "name": "Jane Doe",
    "phone": "+14155551234"
  },
  "slot": {
    "start_time": "2024-01-15T09:00:00Z",
    "end_time": "2024-01-15T10:00:00Z"
  },
  "created_at": "2024-01-10T14:30:00Z"
}
```

### Error Response (409 Conflict)

```json
{
  "error": {
    "code": "SLOT_UNAVAILABLE",
    "message": "The requested time slot is no longer available",
    "details": {
      "slot_id": "550e8400-e29b-41d4-a716-446655440004",
      "suggested_alternatives": [
        {
          "slot_id": "550e8400-e29b-41d4-a716-446655440006",
          "start_time": "2024-01-15T10:00:00Z"
        }
      ]
    }
  }
}
```

## Reserve Slot (Advisory Lock)

Reserve a time slot using PostgreSQL advisory locks to prevent double-booking during voice conversations.

```http
POST /v1/bookings/reserve
Authorization: Bearer {token}
Content-Type: application/json

{
  "slot_id": "550e8400-e29b-41d4-a716-446655440004",
  "mechanic_id": "550e8400-e29b-41d4-a716-446655440003",
  "customer_phone": "+14155551234",
  "reservation_duration": 300
}
```

### Response (201 Created)

```json
{
  "reservation_id": "550e8400-e29b-41d4-a716-446655440007",
  "expires_at": "2024-01-10T14:35:00Z",
  "slot": {
    "id": "550e8400-e29b-41d4-a716-446655440004",
    "start_time": "2024-01-15T09:00:00Z",
    "end_time": "2024-01-15T10:00:00Z",
    "is_reserved": true
  }
}
```

### How Advisory Locks Work

1. **Lock Acquisition**: When a reservation request is made, the system attempts to acquire a PostgreSQL advisory lock on the slot ID
2. **Lock Duration**: Default 5 minutes (300 seconds), maximum 10 minutes
3. **Concurrent Access**: Other requests for the same slot receive a 409 conflict response
4. **Auto-expiry**: Locks automatically release after the duration expires
5. **Confirmation**: Use `/confirm` to convert reservation to confirmed booking

## Get Booking

Retrieve details for a specific booking.

```http
GET /v1/bookings/550e8400-e29b-41d4-a716-446655440005
Authorization: Bearer {token}
```

## Update Booking

Update booking details. Cannot modify completed or cancelled bookings.

```http
PATCH /v1/bookings/550e8400-e29b-41d4-a716-446655440005
Authorization: Bearer {token}
Content-Type: application/json

{
  "status": "in_progress",
  "notes": "Additional work identified during inspection"
}
```

### Valid Status Transitions

| From | To | Allowed |
|------|-----|---------|
| pending | confirmed | Yes |
| pending | cancelled | Yes |
| confirmed | in_progress | Yes |
| confirmed | cancelled | Yes |
| in_progress | completed | Yes |
| in_progress | cancelled | Yes |
| completed | * | No |
| cancelled | * | No |

## Cancel Booking

Cancel a booking and notify the customer.

```http
DELETE /v1/bookings/550e8400-e29b-41d4-a716-446655440005?reason=Customer request
Authorization: Bearer {token}
```

## Confirm Reserved Booking

Convert a reserved slot to a confirmed booking.

```http
POST /v1/bookings/550e8400-e29b-41d4-a716-446655440007/confirm
Authorization: Bearer {token}
Content-Type: application/json

{
  "customer_name": "Jane Doe",
  "vehicle_info": {
    "make": "Toyota",
    "model": "Camry",
    "year": 2020
  },
  "service_type": "Oil Change"
}
```

## Booking Statuses

| Status | Description |
|--------|-------------|
| `pending` | Initial state, awaiting confirmation |
| `confirmed` | Booking confirmed, customer notified |
| `in_progress` | Service currently being performed |
| `completed` | Service finished, payment processed |
| `cancelled` | Booking cancelled |
| `no_show` | Customer did not arrive |

## Code Examples

### Create Booking (Python)

```python
import requests

headers = {"Authorization": f"Bearer {token}"}

booking_data = {
    "slot_id": "550e8400-e29b-41d4-a716-446655440004",
    "mechanic_id": "550e8400-e29b-41d4-a716-446655440003",
    "customer_phone": "+14155551234",
    "service_type": "Oil Change"
}

response = requests.post(
    "https://api.mechmind.io/v1/bookings",
    headers=headers,
    json=booking_data
)

if response.status_code == 201:
    booking = response.json()
    print(f"Booking created: {booking['id']}")
elif response.status_code == 409:
    error = response.json()
    print(f"Slot unavailable: {error['error']['message']}")
```

### Reserve and Confirm (JavaScript)

```javascript
async function createVoiceBooking(slotId, mechanicId, phone) {
  // Step 1: Reserve the slot
  const reserve = await fetch('https://api.mechmind.io/v1/bookings/reserve', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      slot_id: slotId,
      mechanic_id: mechanicId,
      customer_phone: phone
    })
  });
  
  const reservation = await reserve.json();
  
  // Step 2: Confirm after collecting details
  const confirm = await fetch(
    `https://api.mechmind.io/v1/bookings/${reservation.reservation_id}/confirm`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        customer_name: 'Jane Doe',
        service_type: 'Oil Change'
      })
    }
  );
  
  return await confirm.json();
}
```

## Error Handling

| Code | Description | Resolution |
|------|-------------|------------|
| `SLOT_UNAVAILABLE` | Slot already booked | Check suggested alternatives |
| `SLOT_LOCKED` | Slot reserved by another process | Wait or try different slot |
| `INVALID_STATUS_TRANSITION` | Cannot change to requested status | Check valid transitions |
| `BOOKING_NOT_FOUND` | Booking ID doesn't exist | Verify booking ID |
| `MECHANIC_UNAVAILABLE` | Mechanic not available at slot time | Select different mechanic |
