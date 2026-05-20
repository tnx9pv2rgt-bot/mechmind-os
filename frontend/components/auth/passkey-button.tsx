'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Fingerprint, 
  Shield, 
  Check, 
  AlertCircle, 
  Loader2,
  Smartphone,
  Key,
  ChevronRight
} from 'lucide-react'
import { cn } from '@/lib/utils'
import styles from '@/app/auth/auth.module.css'
import { usePasskey, usePasskeySupport, type UsePasskeyOptions } from '@/hooks/usePasskey'

// ============================================
// TYPES
// ============================================

export interface PasskeyButtonProps extends UsePasskeyOptions {
  /** Variante del bottone */
  variant?: 'primary' | 'secondary' | 'glass' | 'minimal'
  /** Dimensione del bottone */
  size?: 'sm' | 'md' | 'lg'
  /** Larghezza piena */
  fullWidth?: boolean
  /** Testo personalizzato */
  label?: string
  /** Testo per piattaforma iOS/macOS */
  appleLabel?: string
  /** Classe CSS aggiuntiva */
  className?: string
  /** Disabilita il bottone */
  disabled?: boolean
  /** Callback quando non supportato */
  onUnsupported?: () => void
  /** Mostra icona piattaforma */
  showPlatformIcon?: boolean
}

export interface AuthMethodSelectorProps extends UsePasskeyOptions {
  /** Titolo della schermata */
  title?: string
  /** Sottotitolo */
  subtitle?: string
  /** Callback per selezione password */
  onPasswordSelect: () => void
  /** Callback per selezione passkey */
  onPasskeySelect?: () => void
  /** Classe CSS aggiuntiva */
  className?: string
}

export interface PasskeyRegistrationPromptProps extends UsePasskeyOptions {
  userId: string
  email: string
  /** Callback quando l'utente salta */
  onSkip: () => void
  /** Mostra il pulsante salta */
  showSkip?: boolean
}

// ============================================
// PASSKEY BUTTON
// ============================================

export function PasskeyButton({
  variant = 'primary',
  size = 'md',
  fullWidth = true,
  label,
  appleLabel,
  className,
  disabled = false,
  onUnsupported,
  showPlatformIcon = true,
  ...passkeyOptions
}: PasskeyButtonProps) {
  const { isSupported, isPlatformAvailable, isLoading: supportLoading } = usePasskeySupport()
  const { authenticate, isAuthenticating, error, clearError } = usePasskey(passkeyOptions)
  const [isHovered, setIsHovered] = useState(false)

  // Non renderizzare se non supportato (con fallback)
  useEffect(() => {
    if (!supportLoading && !isSupported && onUnsupported) {
      onUnsupported()
    }
  }, [isSupported, supportLoading, onUnsupported])

  if (!isSupported || supportLoading) {
    return null
  }

  // Determina il testo in base alla piattaforma
  const getLabel = () => {
    if (label) return label
    
    const isApple = /iPhone|iPad|iPod|Macintosh/.test(navigator.userAgent)
    if (isApple && appleLabel) return appleLabel
    
    if (isApple) return 'Accedi con Face ID'
    if (isPlatformAvailable) return 'Accedi con impronta'
    return 'Accedi con Passkey'
  }

  // Stili in base alla variante
  const variantStyles = {
    primary: 'bg-gradient-to-r from-[var(--status-info)] to-[var(--status-info)] text-[var(--text-on-brand)] shadow-lg shadow-blue-500/25',
    secondary: 'bg-[var(--surface-secondary)] text-[var(--text-primary)] border border-[var(--border-default)]/50 shadow-md',
    glass: 'bg-[var(--surface-secondary)]/20 backdrop-blur-xl text-[var(--text-on-brand)] border border-[var(--border-default)]/30 shadow-lg',
    minimal: 'bg-transparent text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)]/50',
  }

  const sizeStyles = {
    sm: 'h-11 px-4 text-sm rounded-xl',
    md: 'h-14 px-6 text-base rounded-2xl',
    lg: 'h-16 px-8 text-lg rounded-2xl',
  }

  // Icona in base alla piattaforma
  const PlatformIcon = () => {
    if (!showPlatformIcon) return <Fingerprint className="w-5 h-5" />
    
    const isApple = /iPhone|iPad|iPod|Macintosh/.test(navigator.userAgent)
    if (isApple) {
      return (
        <svg 
          viewBox="0 0 24 24" 
          className="w-5 h-5 fill-current"
          aria-hidden="true"
        >
          <path d="M17.5 9C17.5 9 17.5 9 17.5 9C17.5 6.5 15.5 4.5 13 4.5C11.5 4.5 10 5.2 9 6.3C8 5.2 6.5 4.5 5 4.5C2.5 4.5 0.5 6.5 0.5 9C0.5 9 0.5 9 0.5 9C0.5 12.5 4 17 9 21.5C14 17 17.5 12.5 17.5 9Z"/>
        </svg>
      )
    }
    return <Fingerprint className="w-5 h-5" />
  }

  return (
    <motion.button
      type="button"
      onClick={authenticate}
      disabled={disabled || isAuthenticating}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      whileHover={{ scale: disabled ? 1 : 1.02 }}
      whileTap={{ scale: disabled ? 1 : 0.98 }}
      className={cn(
        'relative inline-flex items-center justify-center gap-3 font-medium transition-all duration-300',
        'focus:outline-none focus-visible:ring-0',
        'disabled:opacity-60 disabled:cursor-not-allowed',
        variantStyles[variant],
        sizeStyles[size],
        fullWidth && 'w-full',
        className
      )}
      aria-label={getLabel()}
    >
      {/* Background shimmer effect */}
      {variant === 'primary' && (
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-[var(--surface-secondary)]/20 to-transparent"
          initial={{ x: '-100%' }}
          animate={{ x: isHovered ? '100%' : '-100%' }}
          transition={{ duration: 0.6, ease: 'easeInOut' }}
        />
      )}

      {/* Content */}
      <AnimatePresence mode="wait">
        {isAuthenticating ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="flex items-center gap-2"
          >
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Verifica...</span>
          </motion.div>
        ) : (
          <motion.div
            key="idle"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-3"
          >
            <PlatformIcon />
            <span>{getLabel()}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error tooltip */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute -bottom-12 left-1/2 -translate-x-1/2 z-50"
            onClick={(e) => {
              e.stopPropagation()
              clearError()
            }}
          >
            <div className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-lg text-sm whitespace-nowrap',
              'bg-[var(--status-error-subtle)]0 text-[var(--text-on-brand)] shadow-lg'
            )}>
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.button>
  )
}

// ============================================
// PASSKEY REGISTRATION BUTTON
// ============================================

export function PasskeyRegistrationButton({
  userId,
  email,
  onSkip,
  showSkip = true,
  ...passkeyOptions
}: PasskeyRegistrationPromptProps) {
  const { isSupported, isPlatformAvailable } = usePasskeySupport()
  const { register, isRegistering, error, clearError } = usePasskey(passkeyOptions)
  const [showSuccess, setShowSuccess] = useState(false)

  if (!isSupported) {
    return (
      <div className={styles.authSubtitle}>
        Il tuo browser non supporta i passkey.
      </div>
    )
  }

  const handleRegister = async () => {
    const success = await register(userId, email)
    if (success) {
      setShowSuccess(true)
    }
  }

  const getTitle = () => {
    const isApple = /iPhone|iPad|iPod|Macintosh/.test(navigator.userAgent)
    if (isApple) return 'Configura Face ID'
    if (isPlatformAvailable) return 'Configura impronta digitale'
    return 'Configura Passkey'
  }

  const getDescription = () => {
    const isApple = /iPhone|iPad|iPod|Macintosh/.test(navigator.userAgent)
    if (isApple) {
      return 'Usa Face ID per accedere in modo sicuro e veloce, senza password.'
    }
    return 'Usa la tua impronta digitale o il riconoscimento facciale per accedere in modo sicuro.'
  }

  return (
    <div className="w-full max-w-sm mx-auto space-y-6">
      {/* Icon */}
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 200 }}
        className="mx-auto w-20 h-20 rounded-full bg-gradient-to-br from-[var(--status-info)] to-[var(--brand)] flex items-center justify-center shadow-lg shadow-blue-500/25"
      >
        <AnimatePresence mode="wait">
          {showSuccess ? (
            <motion.div
              key="success"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
            >
              <Check className="w-10 h-10 text-[var(--text-on-brand)]" strokeWidth={3} />
            </motion.div>
          ) : (
            <motion.div
              key="shield"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
            >
              <Shield className="w-10 h-10 text-[var(--text-on-brand)]" />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Text */}
      <div className="text-center space-y-2">
        <h3 className={styles.authTitle}>
          {showSuccess ? 'Passkey configurato!' : getTitle()}
        </h3>
        <p className={styles.authSubtitle}>
          {showSuccess 
            ? 'Ora puoi accedere velocemente e in sicurezza.'
            : getDescription()
          }
        </p>
      </div>

      {/* Error */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center gap-2 p-3 rounded-xl bg-[var(--status-error-subtle)] text-[var(--status-error)] text-sm"
          >
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
            <button 
              onClick={clearError}
              className="ml-auto text-xs underline"
            >
              Chiudi
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Actions */}
      {!showSuccess && (
        <div className="space-y-3">
          <motion.button
            onClick={handleRegister}
            disabled={isRegistering}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={cn(
              'w-full h-14 flex items-center justify-center gap-3',
              'bg-gradient-to-r from-[var(--status-info)] to-[var(--status-info)] text-[var(--text-on-brand)]',
              'rounded-2xl font-medium shadow-lg shadow-blue-500/25',
              'disabled:opacity-60'
            )}
          >
            {isRegistering ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Configurazione...</span>
              </>
            ) : (
              <>
                <Fingerprint className="w-5 h-5" />
                <span>Attiva ora</span>
              </>
            )}
          </motion.button>

          {showSkip && (
            <button
              onClick={onSkip}
              disabled={isRegistering}
              className={cn(
                'w-full h-12 text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]',
                'text-sm font-medium transition-colors',
                'disabled:opacity-50'
              )}
            >
              Salta per ora
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ============================================
// AUTH METHOD SELECTOR
// ============================================

export function AuthMethodSelector({
  title = 'Come vuoi proteggere il tuo account?',
  subtitle,
  onPasswordSelect,
  onPasskeySelect,
  className,
  ...passkeyOptions
}: AuthMethodSelectorProps) {
  const { isSupported, isPlatformAvailable } = usePasskeySupport()

  const handlePasskeySelect = () => {
    onPasskeySelect?.()
  }

  const getPasskeyTitle = () => {
    const isApple = /iPhone|iPad|iPod|Macintosh/.test(navigator.userAgent)
    if (isApple) return 'Face ID / Touch ID'
    if (isPlatformAvailable) return 'Impronta digitale'
    return 'Passkey'
  }

  const getPasskeyDescription = () => {
    const isApple = /iPhone|iPad|iPod|Macintosh/.test(navigator.userAgent)
    if (isApple) return 'Il modo più sicuro e veloce'
    return 'Sicuro e senza password'
  }

  return (
    <div className={cn('w-full max-w-sm mx-auto space-y-6', className)}>
      {/* Header */}
      <div className="text-center space-y-2">
        <h3 className={styles.authTitle}>{title}</h3>
        {subtitle && <p className={styles.authSubtitle}>{subtitle}</p>}
      </div>

      {/* Options */}
      <div className="space-y-3">
        {/* Passkey Option */}
        {isSupported && (
          <motion.button
            onClick={handlePasskeySelect}
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            className={cn(
              'w-full p-5 flex items-center gap-4',
              'bg-gradient-to-br from-[var(--status-info)]/5 to-[var(--brand)]/5',
              'border-2 border-[var(--status-info)]/30 hover:border-[var(--status-info)]/40',
              'rounded-2xl transition-all duration-300',
              'group'
            )}
          >
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[var(--status-info)] to-[var(--status-info)] flex items-center justify-center shadow-lg shadow-blue-500/25 group-hover:shadow-blue-500/40 transition-shadow">
              <Fingerprint className="w-7 h-7 text-[var(--text-on-brand)]" />
            </div>
            <div className="flex-1 text-left">
              <div className="font-semibold text-[var(--text-primary)] flex items-center gap-2">
                {getPasskeyTitle()}
                <span className="px-2 py-0.5 text-xs bg-[var(--status-success-subtle)] text-[var(--status-success)] rounded-full font-medium">
                  Consigliato
                </span>
              </div>
              <div className="text-sm text-[var(--text-tertiary)]">{getPasskeyDescription()}</div>
            </div>
            <ChevronRight className="w-5 h-5 text-[var(--text-tertiary)] group-hover:text-[var(--status-info)] transition-colors" />
          </motion.button>
        )}

        {/* Divider */}
        <div className="relative py-2">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-[var(--border-default)]" />
          </div>
          <div className="relative flex justify-center">
            <span className="px-3 bg-[var(--surface-secondary)] text-sm text-[var(--text-tertiary)]">oppure</span>
          </div>
        </div>

        {/* Password Option */}
        <motion.button
          onClick={onPasswordSelect}
          whileHover={{ scale: 1.02, y: -2 }}
          whileTap={{ scale: 0.98 }}
          className={cn(
            'w-full p-5 flex items-center gap-4',
            'bg-[var(--surface-secondary)] hover:bg-[var(--surface-secondary)]',
            'border border-[var(--border-default)] hover:border-[var(--border-strong)]',
            'rounded-2xl transition-all duration-300',
            'group'
          )}
        >
          <div className="w-14 h-14 rounded-xl bg-[var(--surface-secondary)] border border-[var(--border-default)] flex items-center justify-center group-hover:border-[var(--border-default)] transition-colors">
            <Key className="w-7 h-7 text-[var(--text-tertiary)]" />
          </div>
          <div className="flex-1 text-left">
            <div className="font-semibold text-[var(--text-primary)]">Password</div>
            <div className="text-sm text-[var(--text-tertiary)]">Tradizionale ma sicuro</div>
          </div>
          <ChevronRight className="w-5 h-5 text-[var(--text-tertiary)] group-hover:text-[var(--text-secondary)] transition-colors" />
        </motion.button>
      </div>

      {/* Info */}
      <p className="text-center text-xs text-[var(--text-tertiary)] px-4">
        I passkey sono protetti dalla crittografia del tuo dispositivo e non vengono mai condivisi con i server.
      </p>
    </div>
  )
}

// ============================================
// PASSKEY STATUS BADGE
// ============================================

export function PasskeyStatusBadge({ 
  count = 0 
}: { 
  count?: number 
}) {
  const { isSupported } = usePasskeySupport()

  if (!isSupported) return null

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        'inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium',
        count > 0 
          ? 'bg-[var(--status-success-subtle)] text-[var(--status-success)]' 
          : 'bg-[var(--surface-secondary)] text-[var(--text-secondary)]'
      )}
    >
      <Shield className="w-3.5 h-3.5" />
      <span>
        {count > 0 
          ? `${count} Passkey attiv${count === 1 ? 'o' : 'i'}` 
          : 'Passkey disponibile'
        }
      </span>
    </motion.div>
  )
}

// ============================================
// PASSKEY LIST
// ============================================

export function PasskeyList() {
  const { userPasskeys, isLoading, refreshPasskeys, deletePasskey } = usePasskey()

  useEffect(() => {
    refreshPasskeys()
  }, [refreshPasskeys])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-[var(--text-tertiary)]" />
      </div>
    )
  }

  if (userPasskeys.length === 0) {
    return (
      <div className="text-center py-8 text-[var(--text-tertiary)]">
        <Smartphone className="w-12 h-12 mx-auto mb-3 text-[var(--text-tertiary)]" />
        <p className="text-sm">Nessun passkey configurato</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {userPasskeys.map((passkey, index) => (
        <motion.div
          key={passkey.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
          className={cn(
            'flex items-center gap-4 p-4',
            'bg-[var(--surface-secondary)] rounded-xl border border-[var(--border-default)]',
            'shadow-sm'
          )}
        >
          <div className="w-10 h-10 rounded-lg bg-[var(--status-info-subtle)] flex items-center justify-center">
            <Smartphone className="w-5 h-5 text-[var(--status-info)]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-[var(--text-primary)] truncate">{passkey.deviceName}</p>
            <p className="text-xs text-[var(--text-tertiary)]">
              Aggiunto il {new Date(passkey.createdAt).toLocaleDateString('it-IT')}
            </p>
          </div>
          <button
            onClick={() => deletePasskey(passkey.credentialId)}
            className="p-2 text-[var(--text-tertiary)] hover:text-[var(--status-error)] hover:bg-[var(--status-error-subtle)] rounded-lg transition-colors"
            title="Rimuovi"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </motion.div>
      ))}
    </div>
  )
}

// ============================================
// EXPORTS
// ============================================

export default PasskeyButton
