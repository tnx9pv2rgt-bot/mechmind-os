/**
 * Form Persistence Hooks
 * 
 * Sistema completo di persistenza e UX recovery per form multi-step.
 * 
 * @example
 * ```tsx
 * function MyForm() {
 *   const form = useForm<FormData>();
 *   
 *   const persistence = useFormPersistence(form, {
 *     formId: 'customer-registration',
 *     version: 1,
 *   });
 *   
 *   const exitIntent = useExitIntent({
 *     onExitIntent: () => setShowModal(true),
 *   });
 *   
 *   const offlineQueue = useOfflineQueue({ formId: 'customer-registration' });
 *   
 *   const session = useFormSession({
 *     formId: 'customer-registration',
 *   });
 *   
 *   return (
 *     <>
 *       <FormResumeBanner {...persistence} />
 *       <ExitIntentModal exitIntent={exitIntent} />
 *       <SessionTakeoverModal {...session} />
 *       <OfflineIndicator {...offlineQueue} />
 *       
 *       <form>...</form>
 *     </>
 *   );
 * }
 * ```
 */

// Core hooks
export { useFormPersistence, type UseFormPersistenceOptions, type UseFormPersistenceReturn } from './useFormPersistence';
export { useExitIntent, type UseExitIntentOptions, type UseExitIntentReturn } from './useExitIntent';
export { useOfflineQueue, type OfflineQueueOptions, type UseOfflineQueueReturn, type QueuedSubmission } from './useOfflineQueue';
export { useFormSession, type UseFormSessionOptions, type UseFormSessionReturn } from './useFormSession';

// Additional utilities
export { useFormSaveButton, type UseFormSaveButtonOptions, type UseFormSaveButtonReturn } from './useFormSaveButton';

// Re-export types
export type { PersistedFormData } from './useFormPersistence';
export type { SessionData } from './useFormSession';
