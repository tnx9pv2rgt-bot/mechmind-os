'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

export default function DemoPage() {
  const router = useRouter();
  const didRun = useRef(false);

  useEffect(() => {
    if (didRun.current) return;
    didRun.current = true;

    async function startDemo() {
      try {
        // Create demo session via HttpOnly cookie (30 min)
        // MUST wait for response to ensure cookie is written before navigating
        const res = await fetch('/api/auth/demo-session', { method: 'POST', credentials: 'include' });
        if (!res.ok) {
          console.warn('Demo session creation failed, redirecting anyway');
        }
      } catch {
        console.warn('Demo session API unavailable, redirecting anyway');
      }

      // Set client-side flag for DemoProvider UI (banner + click tracking)
      localStorage.setItem('mechmind_demo', 'true');
      localStorage.setItem('mechmind_demo_clicks', '0');

      // Use window.location instead of router.replace to ensure
      // the browser sends the new cookie on the very first request
      window.location.href = '/dashboard';
    }

    startDemo();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen bg-[#f4f4f4] dark:bg-[#212121] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-4 border-[#e5e5e5] dark:border-[#424242] border-t-[#0d0d0d] dark:border-t-[#ececec] rounded-full animate-spin" />
        <p className="text-[15px] text-[#636366]">Preparazione demo...</p>
      </div>
    </div>
  );
}
