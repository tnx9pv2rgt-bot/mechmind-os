'use client';

import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { AppleButton } from '@/components/ui/apple-button';
import { WorkflowBuilder } from '@/components/workflow/workflow-builder';

export default function NewWorkflowPage(): React.ReactElement {
  const router = useRouter();

  return (
    <div>
      {/* Header */}
      <header className=''>
        <div className='px-8 py-5 flex items-center justify-between'>
          <div className='flex items-center gap-4'>
            <AppleButton
              variant='ghost'
              size='sm'
              icon={<ArrowLeft className='h-4 w-4' />}
              onClick={() => router.push('/dashboard/workflows')}
            />
            <div>
              <h1 className='text-headline text-[var(--text-primary)] dark:text-[var(--text-primary)]'>Nuovo Workflow</h1>
              <p className='text-[var(--text-tertiary)] dark:text-[var(--text-secondary)] text-body mt-1'>
                Definisci trigger e azioni per automatizzare le operazioni
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className='p-8'>
        <WorkflowBuilder />
      </div>
    </div>
  );
}
