/**
 * Security Audit Logging
 * Client-side audit logger that buffers events and sends them to /api/audit.
 * In development mode, events are also logged to the console.
 */

export interface AuditEvent {
  action: string;
  userId?: string;
  ip?: string;
  timestamp: Date;
  details?: Record<string, unknown>;
}

export interface SecurityEvent {
  type: string;
  severity: string;
  ip?: string;
  userAgent?: string;
  path?: string;
  method?: string;
  details?: Record<string, unknown>;
}

const BUFFER_FLUSH_INTERVAL_MS = 5_000;
const BUFFER_MAX_SIZE = 20;

let eventBuffer: AuditEvent[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Flushes buffered audit events to the backend.
 * Silently drops events on network failure to avoid blocking the UI.
 */
async function flushBuffer(): Promise<void> {
  if (eventBuffer.length === 0) return;

  const batch = [...eventBuffer];
  eventBuffer = [];

  try {
    const response = await fetch('/api/audit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ events: batch }),
    });

    if (!response.ok && process.env.NODE_ENV === 'development') {
      console.warn('[AUDIT] Failed to flush events:', response.status);
    }
  } catch (error: unknown) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[AUDIT] Network error flushing events:', error);
    }
  }
}

function scheduleFlush(): void {
  if (flushTimer !== null) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    void flushBuffer();
  }, BUFFER_FLUSH_INTERVAL_MS);
}

/**
 * Logs an audit event. Events are buffered and sent in batches.
 * In development, also logs to the console for visibility.
 */
export async function logAuditEvent(event: AuditEvent): Promise<void> {
  const enrichedEvent: AuditEvent = {
    ...event,
    timestamp: event.timestamp ?? new Date(),
  };

  if (process.env.NODE_ENV === 'development') {
    console.info('[AUDIT]', enrichedEvent.action, enrichedEvent.details);
  }

  eventBuffer.push(enrichedEvent);

  if (eventBuffer.length >= BUFFER_MAX_SIZE) {
    await flushBuffer();
  } else {
    scheduleFlush();
  }
}

export async function logSecurityEvent(event: SecurityEvent): Promise<void> {
  return logAuditEvent({
    action: `security:${event.type}`,
    ip: event.ip,
    timestamp: new Date(),
    details: {
      severity: event.severity,
      userAgent: event.userAgent,
      path: event.path,
      method: event.method,
      ...event.details,
    },
  });
}

/**
 * Retrieves recent audit events from the backend.
 */
export async function getAuditLog(filters?: Record<string, unknown>): Promise<AuditEvent[]> {
  try {
    const params = new URLSearchParams();
    if (filters) {
      for (const [key, value] of Object.entries(filters)) {
        if (value !== undefined && value !== null) {
          params.set(key, String(value));
        }
      }
    }
    const url = `/api/audit${params.toString() ? `?${params.toString()}` : ''}`;
    const response = await fetch(url);
    if (!response.ok) return [];
    const data: { events: AuditEvent[] } = await response.json();
    return data.events ?? [];
  } catch {
    return [];
  }
}
