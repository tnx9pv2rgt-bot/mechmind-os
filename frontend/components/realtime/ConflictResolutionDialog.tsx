/**
 * ConflictResolutionDialog Component
 * 
 * Dialog per la risoluzione dei conflitti quando lo stesso form viene
 * modificato da più dispositivi contemporaneamente.
 * 
 * @example
 * ```tsx
 * <ConflictResolutionDialog
 *   isOpen={hasConflict}
 *   remoteData={conflictData.remote}
 *   localData={conflictData.local}
 *   onResolve={(useRemote) => handleResolve(useRemote)}
 *   onCancel={() => setHasConflict(false)}
 * />
 * ```
 */

'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { 
  Monitor, 
  Smartphone, 
  Clock, 
  User, 
  AlertTriangle,
  Check,
  X
} from 'lucide-react'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import type { FormDraft, ConflictData } from '@/hooks/realtime/useRealtimeSave'

// ============================================================================
// TYPES
// ============================================================================

export interface ConflictResolutionDialogProps {
  /** Se il dialog è aperto */
  isOpen: boolean
  /** Dati del conflitto */
  conflictData: ConflictData | null
  /** Callback quando si sceglie la versione */
  onResolve: (useRemote: boolean) => void
  /** Callback per chiudere senza risolvere */
  onCancel?: () => void
}

// ============================================================================
// UTILITIES
// ============================================================================

function formatDeviceInfo(userAgent?: string): { icon: React.ReactNode; label: string } {
  if (!userAgent) return { icon: <Monitor className="w-4 h-4" />, label: 'Dispositivo sconosciuto' }
  
  const isMobile = /Mobile|Android|iPhone|iPad/i.test(userAgent)
  const icon = isMobile ? <Smartphone className="w-4 h-4" /> : <Monitor className="w-4 h-4" />
  
  // Estrai browser info
  const browser = userAgent.match(/(Chrome|Safari|Firefox|Edge|Opera)\/[\d.]+/)?.[0] || 'Browser'
  const os = userAgent.match(/(Windows|Mac|Linux|Android|iOS)[\s\w]*/)?.[0] || 'OS'
  
  return { icon, label: `${browser} · ${os}` }
}

function getChangedFields(
  local: Record<string, unknown>,
  remote: Record<string, unknown>
): string[] {
  const allKeys = new Set([...Object.keys(local), ...Object.keys(remote)])
  const changed: string[] = []
  
  allKeys.forEach(key => {
    if (JSON.stringify(local[key]) !== JSON.stringify(remote[key])) {
      changed.push(key)
    }
  })
  
  return changed
}

// ============================================================================
// COMPONENTS
// ============================================================================

interface VersionCardProps {
  title: string
  timestamp: Date
  deviceInfo?: string
  data: Record<string, unknown>
  changedFields: string[]
  isSelected?: boolean
  onSelect: () => void
  variant: 'local' | 'remote'
}

function VersionCard({
  title,
  timestamp,
  deviceInfo,
  data,
  changedFields,
  isSelected,
  onSelect,
  variant,
}: VersionCardProps) {
  const { icon: deviceIcon, label: deviceLabel } = formatDeviceInfo(deviceInfo)
  const isLocal = variant === 'local'
  
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onSelect}
      className={cn(
        'w-full text-left p-4 rounded-xl border-2 transition-all duration-200',
        isSelected 
          ? isLocal 
            ? 'border-blue-500 bg-blue-50' 
            : 'border-green-500 bg-green-50'
          : 'border-gray-200 bg-white hover:border-gray-300'
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div
            className={cn(
              'w-8 h-8 rounded-full flex items-center justify-center',
              isLocal ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'
            )}
          >
            {isLocal ? <User className="w-4 h-4" /> : deviceIcon}
          </div>
          <div>
            <h4 className="font-semibold text-sm text-gray-900">{title}</h4>
            <p className="text-xs text-gray-500">{deviceLabel}</p>
          </div>
        </div>
        
        {isSelected && (
          <div
            className={cn(
              'w-6 h-6 rounded-full flex items-center justify-center',
              isLocal ? 'bg-blue-500' : 'bg-green-500'
            )}
          >
            <Check className="w-4 h-4 text-white" />
          </div>
        )}
      </div>
      
      {/* Timestamp */}
      <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-3">
        <Clock className="w-3 h-3" />
        <span>{format(timestamp, 'dd/MM/yyyy HH:mm:ss', { locale: it })}</span>
      </div>
      
      {/* Changed Fields */}
      {changedFields.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-gray-600">
            {changedFields.length} campo{changedFields.length > 1 ? 'i' : ''} modificato{changedFields.length > 1 ? 'i' : ''}:
          </p>
          <div className="flex flex-wrap gap-1">
            {changedFields.slice(0, 5).map(field => (
              <span
                key={field}
                className={cn(
                  'px-2 py-0.5 rounded text-[10px] font-medium',
                  isLocal ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
                )}
              >
                {field}
              </span>
            ))}
            {changedFields.length > 5 && (
              <span className="px-2 py-0.5 rounded text-[10px] bg-gray-100 text-gray-600">
                +{changedFields.length - 5}
              </span>
            )}
          </div>
        </div>
      )}
    </motion.button>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function ConflictResolutionDialog({
  isOpen,
  conflictData,
  onResolve,
  onCancel,
}: ConflictResolutionDialogProps) {
  const [selectedVersion, setSelectedVersion] = useState<'local' | 'remote' | null>(null)
  
  if (!isOpen || !conflictData) return null
  
  const { remote, local, timestamp } = conflictData
  const changedFields = getChangedFields(local, remote.data as Record<string, unknown>)
  
  const handleResolve = () => {
    if (selectedVersion) {
      onResolve(selectedVersion === 'remote')
    }
  }
  
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={onCancel}
          />
          
          {/* Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-orange-500 to-red-500 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Conflitto rilevato</h3>
                  <p className="text-white/80 text-sm">
                    Lo stesso form è stato modificato su un altro dispositivo
                  </p>
                </div>
              </div>
            </div>
            
            {/* Content */}
            <div className="p-6">
              <p className="text-gray-600 text-sm mb-6">
                Abbiamo rilevato modifiche simultanee a questo form. Scegli quale versione 
                mantenere. L&apos;altra versione verrà sovrascritta.
              </p>
              
              <div className="grid md:grid-cols-2 gap-4">
                {/* Local Version */}
                <VersionCard
                  title="Versione locale"
                  timestamp={timestamp}
                  deviceInfo={navigator.userAgent}
                  data={local}
                  changedFields={changedFields}
                  isSelected={selectedVersion === 'local'}
                  onSelect={() => setSelectedVersion('local')}
                  variant="local"
                />
                
                {/* Remote Version */}
                <VersionCard
                  title="Versione remota"
                  timestamp={new Date(remote.updated_at)}
                  deviceInfo={remote.device_info}
                  data={remote.data as Record<string, unknown>}
                  changedFields={changedFields}
                  isSelected={selectedVersion === 'remote'}
                  onSelect={() => setSelectedVersion('remote')}
                  variant="remote"
                />
              </div>
            </div>
            
            {/* Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 bg-gray-50 border-t">
              {onCancel && (
                <button
                  onClick={onCancel}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
                >
                  Annulla
                </button>
              )}
              <button
                onClick={handleResolve}
                disabled={!selectedVersion}
                className={cn(
                  'px-6 py-2 rounded-lg text-sm font-medium text-white transition-all',
                  selectedVersion
                    ? 'bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/25'
                    : 'bg-gray-300 cursor-not-allowed'
                )}
              >
                {selectedVersion 
                  ? `Mantieni versione ${selectedVersion === 'local' ? 'locale' : 'remota'}`
                  : 'Seleziona una versione'
                }
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

// ============================================================================
// IMPORTS
// ============================================================================

import { useState } from 'react'

// ============================================================================
// EXPORTS
// ============================================================================

export default ConflictResolutionDialog
