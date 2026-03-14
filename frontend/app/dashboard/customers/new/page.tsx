'use client'

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function NewCustomerRedirect() {
  const router = useRouter();
  
  useEffect(() => {
    router.replace('/dashboard/customers/new/step1');
  }, [router]);
  
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-pulse text-gray-400 dark:text-[#6e6e6e]">Caricamento...</div>
    </div>
  );
}
