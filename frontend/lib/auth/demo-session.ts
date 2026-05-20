const DEMO_STORAGE_KEY = 'mechmind_demo';
const DEMO_START_KEY = 'mechmind_demo_start';
const DEMO_DURATION_MS = 60 * 60 * 1000; // 1 ora (allineato con demo-context.tsx)

interface DemoSessionResult {
  success: boolean;
  error?: string;
}

export async function createDemoSession(): Promise<DemoSessionResult> {
  try {
    const response = await fetch('/api/auth/demo-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      const body = (await response.json()) as { message?: string };
      return {
        success: false,
        error: body.message ?? `Errore ${response.status}: impossibile creare la sessione demo`,
      };
    }

    localStorage.setItem(DEMO_STORAGE_KEY, 'true');
    localStorage.setItem(DEMO_START_KEY, String(Date.now()));

    return { success: true };
  } catch (err: unknown) {
    const message =
      err instanceof Error
        ? err.message
        : 'Errore di rete: impossibile raggiungere il server';
    return { success: false, error: message };
  }
}

export function isDemoSession(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(DEMO_STORAGE_KEY) === 'true';
}

export function clearDemoSession(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(DEMO_STORAGE_KEY);
  localStorage.removeItem(DEMO_START_KEY);
}

export function getDemoTimeRemaining(): number {
  if (typeof window === 'undefined') return 0;

  const startStr = localStorage.getItem(DEMO_START_KEY);
  if (!startStr) return 0;

  const start = Number(startStr);
  if (Number.isNaN(start)) return 0;

  const elapsed = Date.now() - start;
  const remaining = DEMO_DURATION_MS - elapsed;

  return remaining > 0 ? remaining : 0;
}
