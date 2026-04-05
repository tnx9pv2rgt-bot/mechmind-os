'use client';

// Intervallo di check per aggiornamenti (ogni 60 secondi in dev, ogni 5 minuti in prod)
const UPDATE_CHECK_INTERVAL =
  process.env.NODE_ENV === 'production' ? 5 * 60 * 1000 : 60 * 1000;

/**
 * Register the service worker for PWA support.
 * Gestisce auto-update: quando una nuova versione è disponibile,
 * ricarica la pagina automaticamente (se non ci sono form in corso).
 */
export function registerServiceWorker(): void {
  if (typeof window === 'undefined') return;
  if (!('serviceWorker' in navigator)) return;

  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
        updateViaCache: 'none', // Forza il browser a NON cachare sw.js
      });

      // Check periodico per aggiornamenti
      setInterval(() => {
        registration.update().catch(() => {
          // Silently ignore update check failures (offline, etc.)
        });
      }, UPDATE_CHECK_INTERVAL);

      // Quando trova una nuova versione
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (!newWorker) return;

        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'activated' && navigator.serviceWorker.controller) {
            // Nuova versione attiva — reload automatico
            handleUpdate();
          }
        });
      });

      // Ascolta messaggi dal SW (es. SW_UPDATED dopo activate)
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data?.type === 'SW_UPDATED') {
          handleUpdate();
        }
      });
    } catch (error) {
      console.error('[SW] Registration failed:', error);
    }
  });
}

/**
 * Gestisce l'aggiornamento: reload automatico.
 * Se l'utente sta compilando un form, aspetta che finisca.
 */
function handleUpdate(): void {
  // Controlla se c'è un form attivo (input con focus)
  const activeElement = document.activeElement;
  const isFormActive =
    activeElement instanceof HTMLInputElement ||
    activeElement instanceof HTMLTextAreaElement ||
    activeElement instanceof HTMLSelectElement;

  if (isFormActive) {
    // Aspetta che l'utente esca dal form, poi ricarica
    const handler = (): void => {
      document.removeEventListener('focusout', handler);
      // Piccolo delay per non interrompere l'interazione
      setTimeout(() => window.location.reload(), 500);
    };
    document.addEventListener('focusout', handler);
  } else {
    // Nessun form attivo — reload immediato
    window.location.reload();
  }
}

/**
 * Subscribe to push notifications.
 */
export async function subscribeToPush(): Promise<PushSubscription | null> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const existing = await registration.pushManager.getSubscription();
    if (existing) return existing;

    // Get VAPID key from server
    const res = await fetch('/api/push/vapid-key', { credentials: 'include' });
    if (!res.ok) return null;
    const { publicKey } = await res.json();

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
    });

    // Send subscription to server
    await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(subscription),
    });

    return subscription;
  } catch (error) {
    console.error('[Push] Subscription failed:', error);
    return null;
  }
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
