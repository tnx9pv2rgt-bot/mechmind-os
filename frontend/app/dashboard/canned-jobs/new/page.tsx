'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

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
    <div className='flex items-center justify-center h-96 bg-[#1a1a1a]'>
      <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-white' />
    </div>
  );
}
