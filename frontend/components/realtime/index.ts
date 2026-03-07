/**
 * Realtime Components
 * 
 * Componenti per il sistema di salvataggio real-time.
 * 
 * @example
 * ```tsx
 * import { 
 *   RealtimeFormWrapper, 
 *   ConflictResolutionDialog 
 * } from '@/components/realtime'
 * 
 * function MyForm() {
 *   return (
 *     <RealtimeFormWrapper
 *       formId="my-form"
 *       formType="customer"
 *       data={formData}
 *     >
 *       <form>...</form>
 *     </RealtimeFormWrapper>
 *   )
 * }
 * ```
 */

// Wrapper
export { 
  RealtimeFormWrapper, 
  SimpleRealtimeFormWrapper,
  type RealtimeFormWrapperProps,
  type SimpleRealtimeFormWrapperProps,
} from './RealtimeFormWrapper'

// Dialog
export { 
  ConflictResolutionDialog, 
  type ConflictResolutionDialogProps 
} from './ConflictResolutionDialog'

// Re-export from UI for convenience
export { 
  SaveStatusIndicator,
  FixedSaveStatusIndicator,
  FormHeaderSaveIndicator,
  type SaveStatusIndicatorProps,
  type FixedSaveStatusIndicatorProps,
  type FormHeaderSaveIndicatorProps,
} from '@/components/ui/SaveStatusIndicator'
