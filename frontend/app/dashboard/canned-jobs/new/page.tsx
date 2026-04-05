'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

/**
 * Redirect /dashboard/canned-jobs/new to the main page with ?action=create
 * The main page handles inline create via modal dialog.
 */
export default function NewCannedJobPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboard/canned-jobs?action=create');
  }, [router]);

  return (
    <div className='flex items-center justify-center h-96'>
      <Loader2 className='h-8 w-8 animate-spin text-apple-blue' />
    </div>
  );
}
