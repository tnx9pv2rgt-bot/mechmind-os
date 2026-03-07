'use client';

import { useState, useEffect, ReactNode } from 'react';
import { UseFormReturn, FieldValues } from 'react-hook-form';
import { useFormPersistence, useExitIntent, useOfflineQueue, useFormSession } from '@/hooks/form-persistence';
import type { UseFormPersistenceOptions, UseExitIntentOptions, UseOfflineQueueOptions, UseFormSessionOptions } from '@/hooks/form-persistence';
import { FormResumeBanner } from './form-resume-banner';
import { ExitIntentModal } from './exit-intent-modal';
import { SessionTakeoverModal } from './session-takeover-modal';
import { OfflineIndicator } from './offline-indicator';
import { DataRestoreModal } from './data-restore-modal';
import { CurrentDeviceBadge } from './session-takeover-modal';
import { AutoSaveIndicator, OfflineBadge } from './index';

// ============================================================================
// TYPES
// ============================================================================

interface FormPersistenceWrapperProps<TFieldValues extends FieldValues = FieldValues> {
  /** React Hook Form instance */
  form: UseFormReturn<TFieldValues>;
  /** Form ID univoco */
  formId: string;
  /** Numero totale di step */
  totalSteps: number;
  /** Step corrente */
  currentStep: number;
  /** Funzione per cambiare step */
  setCurrentStep: (step: number) => void;
  /** Callback quando il form viene ripristinato */
  onRestore?: (step: number, data: TFieldValues) => void;
  /** Callback quando il form viene salvato con successo */
  onSaveSuccess?: () => void;
  /** Opzioni aggiuntive per useFormPersistence */
  persistenceOptions?: Partial<UseFormPersistenceOptions>;
  /** Opzioni aggiuntive per useExitIntent */
  exitIntentOptions?: Partial<UseExitIntentOptions>;
  /** Opzioni aggiuntive per useOfflineQueue */
  offlineQueueOptions?: Partial<UseOfflineQueueOptions>;
  /** Opzioni aggiuntive per useFormSession */
  sessionOptions?: Partial<UseFormSessionOptions>;
  /** Se mostrare il banner di resume */
  showResumeBanner?: boolean;
  /** Se mostrare l'exit intent modal */
  showExitIntent?: boolean;
  /** Se mostrare l'indicatore offline */
  showOfflineIndicator?: boolean;
  /** Se mostrare il takeover modal */
  showSessionTakeover?: boolean;
  /** Se mostrare l'indicatore di autosave */
  showAutoSaveIndicator?: boolean;
  /** Children */
  children: ReactNode;
  /** Classe CSS aggiuntiva */
  className?: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * Wrapper completo che integra tutti i sistemi di persistenza form.
 * 
 * @example
 * ```tsx
 * function MyForm() {
 *   const form = useForm<FormData>();
 *   const [currentStep, setCurrentStep] = useState(1);
 *   
 *   return (
 *     <FormPersistenceWrapper
 *       form={form}
 *       formId="customer-registration"
 *       totalSteps={5}
 *       currentStep={currentStep}
 *       setCurrentStep={setCurrentStep}
 *       onRestore={(step, data) => {
 *         setCurrentStep(step);
 *         // data è già ripristinata nel form
 *       }}
 *     >
 *       <form>
 *         // form content
 *       </form>
 *     </FormPersistenceWrapper>
 *   );
 * }
 * ```
 */
export function FormPersistenceWrapper<TFieldValues extends FieldValues = FieldValues>({
  form,
  formId,
  totalSteps,
  currentStep,
  setCurrentStep,
  onRestore,
  onSaveSuccess,
  persistenceOptions,
  exitIntentOptions,
  offlineQueueOptions,
  sessionOptions,
  showResumeBanner = true,
  showExitIntent = true,
  showOfflineIndicator = true,
  showSessionTakeover = true,
  showAutoSaveIndicator = true,
  children,
  className = '',
}: FormPersistenceWrapperProps<TFieldValues>) {
  // State
  const [showExitModal, setShowExitModal] = useState(false);
  const [isRestored, setIsRestored] = useState(false);

  // Initialize hooks
  const persistence = useFormPersistence(form, {
    formId,
    version: 1,
    expirationDays: 7,
    autoSaveInterval: 30000,
    saveOnBlur: true,
    onRestore: (data) => {
      setIsRestored(true);
      setCurrentStep(data.currentStep);
      onRestore?.(data.currentStep, data.data as TFieldValues);
    },
    onSave: () => {
      // Update session progress on save
      session.setProgress(currentStep, totalSteps);
    },
    ...persistenceOptions,
  });

  const exitIntent = useExitIntent({
    maxTriggers: 1,
    activationDelay: 5000,
    onExitIntent: () => {
      if (showExitIntent) {
        setShowExitModal(true);
      }
    },
    ...exitIntentOptions,
  });

  const offlineQueue = useOfflineQueue({
    persistQueue: true,
    maxRetries: 3,
    ...offlineQueueOptions,
  });

  const session = useFormSession({
    formId,
    enableCrossTabSync: true,
    enableCrossDeviceSync: false,
    onTakeover: () => {
      // Refresh to get fresh state
      window.location.reload();
    },
    ...sessionOptions,
  });

  // Update session progress when step changes
  useEffect(() => {
    session.setProgress(currentStep, totalSteps);
    
    // Update persistence step ref
    // @ts-expect-error - internal method
    form.__setPersistenceStep?.(currentStep);
  }, [currentStep, totalSteps, session, form]);

  // Handle form submission success
  const handleSaveSuccess = (): void => {
    persistence.clearSavedData();
    onSaveSuccess?.();
  };

  // Handle exit intent actions
  const handleCompleteNow = (): void => {
    setShowExitModal(false);
    exitIntent.reset();
    // Focus sul form o scroll
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSaveForLater = (): void => {
    persistence.forceSave();
    setShowExitModal(false);
    exitIntent.reset();
  };

  // Handle restore
  const handleRestore = (): void => {
    persistence.restoreForm();
  };

  return (
    <div className={className}>
      {/* Offline Indicator */}
      {showOfflineIndicator && (
        <OfflineIndicator
          isOnline={offlineQueue.isOnline}
          queueLength={offlineQueue.queueLength}
          isProcessing={offlineQueue.isProcessing}
          processQueue={offlineQueue.processQueue}
          completedRequests={offlineQueue.completedRequests}
          failedRequests={offlineQueue.failedRequests}
        />
      )}

      {/* Resume Banner */}
      {showResumeBanner && (
        <FormResumeBanner
          hasRestorableData={persistence.hasRestorableData && !isRestored}
          daysSinceSave={persistence.daysSinceSave}
          lastSavedText={persistence.lastSavedText}
          restoreForm={handleRestore}
          clearSavedData={persistence.clearSavedData}
        />
      )}

      {/* Main Content */}
      <div className="relative">
        {/* Auto-save indicator */}
        {showAutoSaveIndicator && (
          <div className="absolute top-2 right-2 z-10">
            <AutoSaveIndicator 
              lastSavedText={persistence.lastSavedText}
              isSaving={false}
            />
          </div>
        )}

        {/* Device badge */}
        <div className="absolute top-2 left-2 z-10">
          <CurrentDeviceBadge sessionId={session.sessionId} />
        </div>

        {/* Offline badge */}
        {!offlineQueue.isOnline && (
          <div className="absolute top-2 right-2 z-10">
            <OfflineBadge 
              isOnline={offlineQueue.isOnline}
              queueLength={offlineQueue.queueLength}
            />
          </div>
        )}

        {children}
      </div>

      {/* Modals */}
      <DataRestoreModal
        showRestoreModal={persistence.showRestoreModal}
        daysSinceSave={persistence.daysSinceSave}
        lastSavedText={persistence.lastSavedText}
        restoreForm={handleRestore}
        clearSavedData={persistence.clearSavedData}
        dismissRestoreModal={persistence.dismissRestoreModal}
      />

      {showExitIntent && (
        <ExitIntentModal
          exitIntent={exitIntent}
          isOpen={showExitModal}
          onClose={() => setShowExitModal(false)}
          onCompleteNow={handleCompleteNow}
          onSaveForLater={handleSaveForLater}
          daysUntilExpiry={7}
        />
      )}

      {showSessionTakeover && (
        <SessionTakeoverModal
          showTakeoverModal={session.showTakeoverModal}
          otherSession={session.otherSession}
          takeOverSession={session.takeOverSession}
          keepOtherSession={session.keepOtherSession}
          dismissTakeoverModal={session.dismissTakeoverModal}
        />
      )}
    </div>
  );
}

export default FormPersistenceWrapper;
