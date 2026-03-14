'use client';

/**
 * Example Usage - Progressive Profiling
 * Esempio di utilizzo del sistema di profilazione progressiva
 * Design: Apple 2026 Liquid Glass
 */

import { useState } from 'react';
import { ProfileCompletionBanner } from './profile-completion-banner';
import { ProfileCompletionModal } from './profile-completion-modal';
import { useProgressiveProfiling } from '@/hooks/useProgressiveProfiling';

// Esempio 1: Banner nella Dashboard
export function DashboardWithProfiling() {
  return (
    <div className='max-w-[900px] mx-auto p-6'>
      {/* Banner di completamento profilo */}
      <ProfileCompletionBanner
        customerId='cust_123456'
        onComplete={() => {
          // Profile completed
        }}
        dismissable={true}
      />

      {/* Resto della dashboard... */}
      <div className='bg-white/70 backdrop-blur-3xl rounded-[24px] p-6 shadow-apple'>
        <h1 className='text-2xl font-semibold text-gray-900'>Dashboard</h1>
        <p className='text-gray-600 mt-2'>Benvenuto nella tua area personale</p>
      </div>
    </div>
  );
}

// Esempio 2: Uso del Hook diretto
export function CustomProfilingComponent() {
  const {
    profile,
    missingFields,
    currentStage,
    completionPercentage,
    isLoading,
    updateProfile,
    getNextField,
    getStageIncentive,
  } = useProgressiveProfiling({
    customerId: 'cust_123456',
    autoFetch: true,
  });

  const handleQuickUpdate = async () => {
    const success = await updateProfile({
      phone: '+39 333 123 4567',
    });

    if (success) {
      // Phone updated
    }
  };

  return (
    <div className='p-6'>
      <h2 className='text-lg font-semibold mb-4'>Completamento Profilo: {completionPercentage}%</h2>

      {isLoading ? (
        <p>Caricamento...</p>
      ) : (
        <>
          <p className='text-gray-600 mb-2'>
            Stage attuale: <span className='font-medium'>{currentStage}</span>
          </p>
          <p className='text-gray-600 mb-2'>Campi mancanti: {missingFields.length}</p>
          <p className='text-gray-600 mb-4'>Prossimo campo: {getNextField()}</p>
          <p className='text-blue-600 font-medium mb-4'>Incentive: {getStageIncentive()}</p>

          <button
            onClick={handleQuickUpdate}
            className='px-4 py-2 bg-blue-500 text-white rounded-lg'
          >
            Aggiungi Telefono
          </button>
        </>
      )}
    </div>
  );
}

// Esempio 3: Modal standalone
export function StandaloneProfilingModal() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className='px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 
                   text-white rounded-2xl font-medium shadow-lg shadow-blue-500/25'
      >
        Completa Profilo
      </button>

      <ProfileCompletionModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        customerId='cust_123456'
        onComplete={() => {
          setIsOpen(false);
        }}
      />
    </>
  );
}

// Esempio 4: Integrazione in form cliente esistente
export function CustomerFormWithProfiling({
  customerId,
  children,
}: {
  customerId: string;
  children: React.ReactNode;
}) {
  return (
    <div className='space-y-6'>
      {/* Banner sopra il form */}
      <ProfileCompletionBanner
        customerId={customerId}
        dismissable={false}
        className='shadow-apple-lg'
      />

      {/* Form esistente */}
      <div className='bg-white/80 backdrop-blur-3xl rounded-[24px] shadow-apple overflow-hidden'>
        {children}
      </div>
    </div>
  );
}

export default {
  DashboardWithProfiling,
  CustomProfilingComponent,
  StandaloneProfilingModal,
  CustomerFormWithProfiling,
};
