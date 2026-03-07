# Real-time Notifications with SSE and Redis Pub/Sub - Implementation Summary

## Overview

Sistema di notifiche real-time implementato per MechMind OS utilizzando:
- **SSE (Server-Sent Events)** per la comunicazione client-server
- **Redis Pub/Sub** per multi-instance scaling
- **Framer Motion** per animazioni UI

## File Creati/Modificati

### Backend (NestJS)

#### Nuovi File

| File | Descrizione |
|------|-------------|
| `backend/src/notifications/dto/notification-event.dto.ts` | DTOs per tipi di eventi notifica |
| `backend/src/notifications/services/redis-pubsub.service.ts` | Servizio Redis Pub/Sub |
| `backend/src/notifications/services/sse.service.ts` | Gestione connessioni SSE |
| `backend/src/notifications/services/notifications-v2.service.ts` | API per inviare notifiche |
| `backend/src/notifications/controllers/sse.controller.ts` | Endpoint SSE |
| `backend/src/notifications/index.ts` | Barrel exports |
| `backend/src/notifications/examples/integration.example.ts` | Esempi di integrazione |
| `backend/src/notifications/README.md` | Documentazione completa |
| `backend/src/notifications/services/notifications.service.spec.ts` | Test unitari |

#### File Modificati

| File | Modifiche |
|------|-----------|
| `backend/src/notifications/notifications.module.ts` | Aggiunti nuovi servizi e controller |

### Frontend (Next.js)

#### Nuovi File

| File | Descrizione |
|------|-------------|
| `frontend/hooks/useNotifications.ts` | Hook React per SSE con auto-reconnection |
| `frontend/lib/notification-context.tsx` | Context provider con toast integration |
| `frontend/components/notifications/NotificationToast.tsx` | Toast notifications con Framer Motion |
| `frontend/components/notifications/index.ts` | Barrel exports |
| `frontend/components/ui/use-toast.tsx` | Hook toast semplice |
| `frontend/app/dashboard/layout.tsx` | Esempio layout con NotificationBell |

#### File Modificati

| File | Modifiche |
|------|-----------|
| `frontend/components/notifications/notification-bell.tsx` | Integrazione con nuovo sistema |
| `frontend/components/providers.tsx` | Aggiunti NotificationProvider e ToastProvider |

## API Endpoints

### SSE Endpoints

```
GET /api/notifications/sse/stream
Authorization: Bearer <jwt_token>
Query: userOnly=true|false

GET /api/notifications/sse/stream/personal
Authorization: Bearer <jwt_token>
```

### REST Endpoints

```
GET    /api/notifications
GET    /api/notifications/unread-count
PATCH  /api/notifications/:id/read
POST   /api/notifications/mark-all-read
POST   /api/notifications/test
```

## Eventi Supportati

- `booking_created`
- `booking_confirmed`
- `booking_cancelled`
- `invoice_paid`
- `gdpr_deletion_scheduled`

## Utilizzo Rapido

### Backend - Invio Notifica

```typescript
import { NotificationsV2Service } from './notifications/services/notifications-v2.service';

@Injectable()
export class BookingService {
  constructor(private readonly notificationsService: NotificationsV2Service) {}

  async createBooking(data: CreateBookingDto) {
    // ... logic ...
    
    await this.notificationsService.notifyBookingCreated(
      data.tenantId,
      booking.id,
      data.customerName,
    );
  }
}
```

### Frontend - Ricezione Notifica

```tsx
import { NotificationBell } from '@/components/notifications';
import { useNotificationContext } from '@/lib/notification-context';

function Header() {
  const { unreadCount, isConnected } = useNotificationContext();
  
  return <NotificationBell />;
}
```

### Frontend - Configurazione Provider

```tsx
// app/layout.tsx o components/providers.tsx
import { NotificationProvider } from '@/lib/notification-context';

<NotificationProvider
  apiUrl="/api"
  enableToasts={true}
  autoReconnect={true}
>
  {children}
</NotificationProvider>
```

## Configurazione Redis

```env
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_password
REDIS_PUBSUB_DB=2
REDIS_TLS=false
```

## Caratteristiche Implementate

### Backend
- ✅ SSE con `@nestjs/platform-express` (Sse decorator)
- ✅ Redis Pub/Sub con `ioredis`
- ✅ Filtraggio per tenant (RLS) e user
- ✅ JWT authentication per SSE
- ✅ Heartbeat (30s) per mantenere connessione
- ✅ Multi-instance scaling via Redis
- ✅ Backward compatibility con WebSocket esistente

### Frontend
- ✅ Hook `useNotifications` con SSE
- ✅ Auto-reconnection con exponential backoff
- ✅ Toast notifications con Framer Motion
- ✅ NotificationBell con UI completa
- ✅ Context provider per global state
- ✅ Connection status indicator

## Testing

```bash
# Backend tests
cd backend && npm test -- notifications.service.spec.ts

# Frontend build
cd frontend && npm run build
```

## Note di Implementazione

1. **Backward Compatibility**: Il vecchio sistema WebSocket (`NotificationsGateway`, `NotificationsService`) rimane funzionante per non rompere codice esistente.

2. **Redis Scaling**: Ogni istanza del backend si sottoscrive al canale Redis del tenant. Quando una notifica viene pubblicata, tutte le istanze la ricevono e la inviano ai loro client SSE connessi.

3. **Reconnection Strategy**: Implementato exponential backoff: 1s, 2s, 4s, 8s, max 30s.

4. **Security**: L'endpoint SSE richiede autenticazione JWT. Le notifiche sono filtrate automaticamente per tenant e opzionalmente per user.

5. **Heartbeat**: Il server invia heartbeat ogni 30 secondi per prevenire timeout dei proxy.
