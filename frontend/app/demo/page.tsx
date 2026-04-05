'use client';

import { useEffect, useState } from 'react';

export default function DemoPage(): React.ReactElement {
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function startDemo(): Promise<void> {
      try {
        const res = await fetch('/api/auth/demo-session', { method: 'POST', credentials: 'include' });
        if (cancelled) return;
        if (res.ok) {
          localStorage.setItem('mechmind_demo', 'true');
          localStorage.setItem('mechmind_demo_start', Date.now().toString());
          localStorage.setItem('mechmind_demo_clicks', '0');
          window.location.href = '/dashboard';
          return;
        }
        setError(true);
      } catch {
        if (!cancelled) setError(true);
      }
    }

    startDemo();
    return () => { cancelled = true; };
  }, []);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--surface-primary)]">
        <div className="text-center">
          <p className="text-lg text-white">Server non disponibile</p>
          <p className="mt-2 text-sm text-[var(--text-tertiary)]">Riprova tra qualche istante.</p>
          <a href="/" className="mt-4 inline-block text-sm text-white underline">
            Torna alla home
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--surface-primary)]">
      <div className="flex flex-col items-center gap-3">
        <span className="inline-block h-8 w-8 animate-spin rounded-full border-3 border-white/20 border-t-white" />
        <p className="text-base text-white">Avvio demo in corso...</p>
      </div>
    </div>
  );
}
