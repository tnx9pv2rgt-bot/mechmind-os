/**
 * Form Persistence Components
 * 
 * Componenti UI per il sistema di persistenza e UX recovery dei form.
 * 
 * @example
 * ```tsx
 * import { 
 *   FormResumeBanner, 
 *   ExitIntentModal, 
 *   OfflineIndicator,
 *   DataRestoreModal,
 *   SessionTakeoverModal 
 * } from '@/components/form-persistence';
 * 
 * function MyForm() {
 *   const persistence = useFormPersistence(form, { formId: 'my-form' });
 *   const exitIntent = useExitIntent();
 *   const session = useFormSession({ formId: 'my-form' });
 *   const offline = useOfflineQueue();
 *   
 *   const [showExitModal, setShowExitModal] = useState(false);
 *   
 *   useEffect(() => {
 *     if (exitIntent.isTriggered) {
 *       setShowExitModal(true);
 *     }
 *   }, [exitIntent.isTriggered]);
 * 
 *   return (
 *     <>
 *       <FormResumeBanner {...persistence} />
 *       <OfflineIndicator {...offline} />
 *       <DataRestoreModal {...persistence} />
 *       <SessionTakeoverModal {...session} />
 *       <ExitIntentModal 
 *         exitIntent={exitIntent}
 *         isOpen={showExitModal}
 *         onClose={() => setShowExitModal(false)}
 *       />
 *     </>
 *   );
 * }
 * ```
 */

// Main components
export { FormResumeBanner, FormResumeBannerCompact, AutoSaveIndicator } from './form-resume-banner';
export { ExitIntentModal, ExitIntentInline } from './exit-intent-modal';
export { SessionTakeoverModal, CurrentDeviceBadge } from './session-takeover-modal';
export { OfflineIndicator, OfflineBadge, SyncErrorToast } from './offline-indicator';
export { DataRestoreModal, DataRestorePrompt } from './data-restore-modal';

// Save buttons
export { SaveButton, SaveAndContinueButton, SaveButtonGroup } from './save-button';

// Wrapper
export { FormPersistenceWrapper } from './form-persistence-wrapper';
