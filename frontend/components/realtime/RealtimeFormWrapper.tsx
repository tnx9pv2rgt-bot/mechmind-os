/**
 * RealtimeFormWrapper Component
 * 
 * Wrapper completo per form con salvataggio real-time su Supabase.
 * Integra useRealtimeSave, SaveStatusIndicator e ConflictResolutionDialog.
 * 
 * @example
 * ```tsx
 * function CustomerForm() {
 *   const [formData, setFormData] = useState({ name: '', email: '' })
 *   
 *   return (
 *     <RealtimeFormWrapper
 *       formId="customer-new-uuid"
 *       formType="customer"
 *       data={formData}
 *       onDraftLoaded={(draft) => setFormData(draft.data)}
 *     >
 *       {({ saveStatus, lastSaved, forceSave }) => (
 *         <form>
 *           <input 
 *             value={formData.name}
 *             onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
 *           />
 *           <button type="submit" onClick={() => forceSave()}>
 *             Salva
 *           </button>
 *         </form>
 *       )}
 *     </RealtimeFormWrapper>
 *   )
 * }
 * ```
 */

'use client'

import { useCallback, useEffect, useState, ReactNode } from 'react'
import { motion } from 'framer-motion'
import { WifiOff, Save, CheckCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { 
  useRealtimeSave, 
  type UseRealtimeSaveOptions, 
  type UseRealtimeSaveReturn,
  type FormDraft 
} from '@/hooks/realtime/useRealtimeSave'
import { SaveStatusIndicator, FixedSaveStatusIndicator } from '@/components/ui/SaveStatusIndicator'
import { ConflictResolutionDialog } from './ConflictResolutionDialog'

// ============================================================================
// TYPES
// ============================================================================

export interface RealtimeFormWrapperProps extends Omit<UseRealtimeSaveOptions, 'onConflict'> {
  /** Children render prop con accesso allo stato del salvataggio */
  children: (props: UseRealtimeSaveReturn) => ReactNode
  /** Callback quando il draft viene caricato */
  onDraftLoaded?: (draft: FormDraft) => void
  /** Se mostrare l'indicatore fisso (default: true) */
  showFixedIndicator?: boolean
  /** Se mostrare il dialog di conflitto (default: true) */
  showConflictDialog?: boolean
  /** Callback quando c'è un conflitto */
  onConflict?: (conflict: NonNullable<UseRealtimeSaveReturn['conflictData']>) => void
  /** Classe CSS aggiuntiva */
  className?: string
  /** Titolo del form (per header indicator) */
  title?: string
  /** Se mostrare l'header con titolo e indicatore (default: false) */
  showHeader?: boolean
}

// ============================================================================
// OFFLINE BANNER
// ============================================================================

interface OfflineBannerProps {
  pendingChanges: number
  onRetry?: () => void
}

function OfflineBanner({ pendingChanges, onRetry }: OfflineBannerProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className={cn(
        'bg-amber-50 border-b border-amber-200',
        'px-4 py-3 flex items-center justify-between'
      )}
    >
      <div className="flex items-center gap-2">
        <WifiOff className="w-4 h-4 text-amber-600" />
        <span className="text-sm text-amber-800">
          Sei offline. {pendingChanges > 0 && (
            <span className="font-medium">
              {pendingChanges} modifiche in attesa.
            </span>
          )}
        </span>
      </div>
      
      {onRetry && (
        <button
          onClick={onRetry}
          className="text-sm font-medium text-amber-700 hover:text-amber-900"
        >
          Riprova
        </button>
      )}
    </motion.div>
  )
}

// ============================================================================
// SAVED TOAST
// ============================================================================

interface SavedToastProps {
  visible: boolean
}

function SavedToast({ visible }: SavedToastProps) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className={cn(
            'fixed top-4 right-4 z-50',
            'bg-green-500 text-white',
            'px-4 py-2 rounded-lg shadow-lg',
            'flex items-center gap-2'
          )}
        >
          <CheckCircle className="w-4 h-4" />
          <span className="text-sm font-medium">Salvato!</span>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

import { AnimatePresence } from 'framer-motion'

export function RealtimeFormWrapper({
  children,
  onDraftLoaded,
  showFixedIndicator = true,
  showConflictDialog = true,
  onConflict,
  className,
  title,
  showHeader = false,
  ...saveOptions
}: RealtimeFormWrapperProps) {
  const [showSavedToast, setShowSavedToast] = useState(false)
  const [showConflictModal, setShowConflictModal] = useState(false)
  
  const {
    saveStatus,
    lastSaved,
    lastSavedText,
    pendingChanges,
    isOnline,
    hasConflict,
    conflictData,
    forceSave,
    resolveConflict,
    retry,
    ...otherMethods
  } = useRealtimeSave({
    ...saveOptions,
    onConflict: (conflict) => {
      setShowConflictModal(true)
      onConflict?.(conflict)
    },
    onSave: (draft) => {
      saveOptions.onSave?.(draft)
      setShowSavedToast(true)
      setTimeout(() => setShowSavedToast(false), 2000)
    },
  })

  // Load draft on mount
  useEffect(() => {
    const loadDraft = async () => {
      const draft = await otherMethods.loadDraft()
      if (draft) {
        onDraftLoaded?.(draft)
      }
    }
    
    loadDraft()
  }, [onDraftLoaded])

  // Handle conflict modal visibility
  useEffect(() => {
    setShowConflictModal(hasConflict)
  }, [hasConflict])

  const handleResolveConflict = useCallback(async (useRemote: boolean) => {
    await resolveConflict(useRemote)
    setShowConflictModal(false)
  }, [resolveConflict])

  const handleCancelConflict = useCallback(() => {
    setShowConflictModal(false)
    // Non chiudere completamente, lascia l'indicatore di conflitto visibile
  }, [])

  const realtimeState: UseRealtimeSaveReturn = {
    saveStatus,
    lastSaved,
    lastSavedText,
    pendingChanges,
    isOnline,
    hasConflict,
    conflictData,
    forceSave,
    resolveConflict,
    retry,
    ...otherMethods,
  }

  return (
    <div className={cn('relative', className)}>
      {/* Offline Banner */}
      <AnimatePresence>
        {!isOnline && (
          <OfflineBanner 
            pendingChanges={pendingChanges} 
            onRetry={retry}
          />
        )}
      </AnimatePresence>
      
      {/* Header with title and save status */}
      {showHeader && (
        <div className="flex items-center justify-between px-4 py-3 border-b">
          {title && (
            <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
          )}
          <SaveStatusIndicator 
            status={saveStatus}
            lastSaved={lastSaved}
            lastSavedText={lastSavedText}
            pendingChanges={pendingChanges}
            onRetry={retry}
            onResolve={() => setShowConflictModal(true)}
          />
        </div>
      )}
      
      {/* Main content */}
      <div className="relative">
        {children(realtimeState)}
      </div>
      
      {/* Fixed save indicator */}
      {showFixedIndicator && (
        <FixedSaveStatusIndicator
          status={saveStatus}
          lastSaved={lastSaved}
          lastSavedText={lastSavedText}
          pendingChanges={pendingChanges}
          onRetry={retry}
          onResolve={() => setShowConflictModal(true)}
          bottom={24}
          left={24}
        />
      )}
      
      {/* Saved toast */}
      <SavedToast visible={showSavedToast} />
      
      {/* Conflict resolution dialog */}
      {showConflictDialog && (
        <ConflictResolutionDialog
          isOpen={showConflictModal}
          conflictData={conflictData}
          onResolve={handleResolveConflict}
          onCancel={handleCancelConflict}
        />
      )}
    </div>
  )
}

// ============================================================================
// SIMPLE WRAPPER (senza render prop)
// ============================================================================

export interface SimpleRealtimeFormWrapperProps extends Omit<RealtimeFormWrapperProps, 'children'> {
  /** Children normale (non render prop) */
  children: ReactNode
}

/**
 * Versione semplificata che non usa render props.
 * L'indicatore di stato è gestito automaticamente.
 */
export function SimpleRealtimeFormWrapper({
  children,
  ...props
}: SimpleRealtimeFormWrapperProps) {
  return (
    <RealtimeFormWrapper {...props}>
      {() => children}
    </RealtimeFormWrapper>
  )
}

// ============================================================================
// EXPORTS
// ============================================================================

export default RealtimeFormWrapper
