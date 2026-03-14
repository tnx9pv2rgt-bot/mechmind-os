'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { 
  Mail, 
  ArrowLeft,
  ArrowRight,
  Loader2,
  CheckCircle2,
  AlertCircle
} from 'lucide-react'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

// Utility per classi condizionali
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Animation variants per Framer Motion (stessi di /auth)
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 24,
    },
  },
}

const cardVariants = {
  hidden: { 
    opacity: 0, 
    y: 40,
    scale: 0.96,
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 30,
      duration: 0.6,
    },
  },
}

const backgroundVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      duration: 1.2,
      ease: 'easeOut',
    },
  },
}

// Componente Input stile iOS (identico a /auth)
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  icon?: React.ReactNode
  error?: string
}

function IOSInput({ label, icon, error, className, type, ...props }: InputProps) {
  return (
    <div className="w-full">
      {label && (
        <label className="mb-2 block text-sm font-medium text-foreground/80">
          {label}
        </label>
      )}
      <div
        className={cn(
          'group relative flex items-center overflow-hidden rounded-2xl bg-white/50 dark:bg-[#2f2f2f]/50 backdrop-blur-sm transition-all duration-300',
          'border border-white/30 dark:border-[#424242]/30 shadow-sm',
          'focus-within:border-apple-blue/50 focus-within:bg-white/80 dark:focus-within:bg-[#2f2f2f]/80 focus-within:shadow-md',
          'hover:bg-white/60 dark:hover:bg-[#353535]/60',
          error && 'border-apple-red/50 focus-within:border-apple-red/50',
          className
        )}
      >
        {icon && (
          <div className="pointer-events-none absolute left-4 flex items-center justify-center text-foreground/40 transition-colors group-focus-within:text-apple-blue">
            {icon}
          </div>
        )}
        <input
          type={type}
          className={cn(
            'h-14 w-full bg-transparent px-4 text-body text-foreground placeholder:text-foreground/40',
            'focus:outline-none',
            icon && 'pl-12'
          )}
          {...props}
        />
      </div>
      {error && (
        <motion.p
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-2 flex items-center gap-1.5 text-sm text-apple-red"
        >
          <AlertCircle className="h-4 w-4" />
          {error}
        </motion.p>
      )}
    </div>
  )
}

// Componente Button stile Apple (identico a /auth)
type ButtonVariant = 'primary' | 'secondary' | 'outline'
type ButtonSize = 'default' | 'lg'

interface AppleButtonProps {
  children: React.ReactNode
  variant?: ButtonVariant
  size?: ButtonSize
  isLoading?: boolean
  disabled?: boolean
  className?: string
  type?: 'button' | 'submit' | 'reset'
  onClick?: React.MouseEventHandler<HTMLButtonElement>
  ariaLabel?: string
}

function AppleButton({
  children,
  variant = 'primary',
  size = 'default',
  isLoading,
  disabled,
  className,
  type = 'button',
  ariaLabel,
  ...props
}: AppleButtonProps) {
  const variants = {
    primary: 'bg-apple-blue text-white hover:bg-apple-blue-hover shadow-lg shadow-apple-blue/25',
    secondary: 'bg-white/80 text-apple-dark dark:text-[#ececec] hover:bg-white shadow-md backdrop-blur-sm',
    outline: 'bg-transparent text-apple-dark dark:text-[#ececec] border border-foreground/20 hover:bg-foreground/5',
  }

  const sizes = {
    default: 'h-12 px-6 text-base',
    lg: 'h-14 px-8 text-lg',
  }

  return (
    <motion.button
      type={type}
      aria-label={ariaLabel}
      whileHover={{ scale: disabled || isLoading ? 1 : 1.02 }}
      whileTap={{ scale: disabled || isLoading ? 1 : 0.98 }}
      transition={{ type: 'spring', stiffness: 400, damping: 17 }}
      className={cn(
        'relative inline-flex items-center justify-center rounded-2xl font-medium transition-all duration-300',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-apple-blue focus-visible:ring-offset-2',
        variants[variant],
        sizes[size],
        (disabled || isLoading) && 'opacity-50 cursor-not-allowed',
        className
      )}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="h-5 w-5 animate-spin" />
      ) : (
        children
      )}
    </motion.button>
  )
}

// Main Component
export default function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [email, setEmail] = useState('')

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    // Validazione email
    if (!email) {
      setError('Inserisci la tua email')
      setIsLoading(false)
      return
    }
    
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Inserisci un\'email valida')
      setIsLoading(false)
      return
    }

    try {
      // Chiamata API per richiedere reset password
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      if (!response.ok) {
        throw new Error('Errore durante l\'invio')
      }

      setIsSuccess(true)
    } catch (err) {
      setError('Non siamo riusciti a inviare l\'email. Riprova più tardi.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-apple-light-gray dark:bg-[#212121]">
      {/* Background Gradient Orbs - Liquid Glass Effect (identico a /auth) */}
      <motion.div
        variants={backgroundVariants}
        initial="hidden"
        animate="visible"
        className="pointer-events-none fixed inset-0"
      >
        {/* Gradient Orbs */}
        <div className="absolute -left-[20%] -top-[10%] h-[70vh] w-[70vh] rounded-full bg-gradient-to-br from-apple-blue/30 via-apple-purple/20 to-transparent blur-[120px]" />
        <div className="absolute -right-[20%] top-[20%] h-[60vh] w-[60vh] rounded-full bg-gradient-to-bl from-apple-blue/25 via-cyan-400/20 to-transparent blur-[100px]" />
        <div className="absolute bottom-[5%] left-[10%] h-[50vh] w-[50vh] rounded-full bg-gradient-to-tr from-apple-purple/20 via-apple-blue/15 to-transparent blur-[90px]" />
        
        {/* Noise texture overlay */}
        <div 
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          }}
        />
      </motion.div>

      {/* Main Content */}
      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
        <motion.div
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          className="w-full max-w-[420px]"
        >
          {/* Glass Card */}
          <div className="relative overflow-hidden rounded-[32px] bg-white/70 dark:bg-[#2f2f2f]/70 p-8 shadow-2xl shadow-apple-dark/5 backdrop-blur-3xl ring-1 ring-white/50 dark:ring-[#424242]/50 sm:p-10">
            {/* Card Shine Effect */}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/50 via-transparent to-transparent" />
            
            {/* Card Border Glow */}
            <div className="pointer-events-none absolute inset-0 rounded-[32px] ring-1 ring-inset ring-white/60" />

            {/* Content */}
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="relative"
            >
              {/* Back Link */}
              <motion.div variants={itemVariants} className="mb-6">
                <Link
                  href="/auth"
                  className="inline-flex items-center gap-2 text-sm font-medium text-apple-gray dark:text-[#636366] transition-colors hover:text-apple-blue"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Torna al login
                </Link>
              </motion.div>

              {/* Title & Description */}
              <motion.div variants={itemVariants} className="mb-8 text-center">
                <h1 className="text-title-1 font-semibold tracking-tight text-apple-dark dark:text-[#ececec]">
                  Password dimenticata?
                </h1>
                <p className="mt-2 text-body text-apple-gray dark:text-[#636366]">
                  Inserisci la tua email e ti invieremo un link per reimpostare la password
                </p>
              </motion.div>

              {/* Success State */}
              {isSuccess ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center"
                >
                  <div className="mb-4 flex justify-center">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                      <CheckCircle2 className="h-8 w-8 text-green-600" />
                    </div>
                  </div>
                  <h2 className="mb-2 text-lg font-semibold text-apple-dark dark:text-[#ececec]">
                    Email inviata!
                  </h2>
                  <p className="mb-6 text-sm text-apple-gray dark:text-[#636366]">
                    Controlla la tua casella di posta per il link di reset. Se non trovi l&apos;email, controlla anche nella cartella spam.
                  </p>
                  <Link href="/auth">
                    <AppleButton variant="secondary" className="w-full">
                      Torna al login
                    </AppleButton>
                  </Link>
                </motion.div>
              ) : (
                /* Forgot Password Form */
                <form onSubmit={handleSubmit} className="space-y-5">
                  <motion.div variants={itemVariants}>
                    <IOSInput
                      name="email"
                      type="email"
                      label="Email"
                      placeholder="nome@officina.it"
                      icon={<Mail className="h-5 w-5" />}
                      error={error || undefined}
                      autoComplete="email"
                      autoFocus
                      aria-label="Indirizzo email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </motion.div>

                  <motion.div variants={itemVariants}>
                    <AppleButton
                      type="submit"
                      size="lg"
                      isLoading={isLoading}
                      disabled={!email}
                      className="w-full"
                    >
                      {!isLoading && (
                        <>
                          Invia link di reset
                          <ArrowRight className="ml-2 h-5 w-5" />
                        </>
                      )}
                    </AppleButton>
                  </motion.div>

                  {/* Help Text */}
                  <motion.p 
                    variants={itemVariants}
                    className="text-center text-xs text-apple-gray dark:text-[#636366]"
                  >
                    Non ricordi l&apos;email?{' '}
                    <Link 
                      href="/support" 
                      className="text-apple-blue hover:underline"
                    >
                      Contatta il supporto
                    </Link>
                  </motion.p>
                </form>
              )}

              {/* Footer Links */}
              {!isSuccess && (
                <motion.div variants={itemVariants} className="mt-8 text-center">
                  <p className="text-sm text-apple-gray dark:text-[#636366]">
                    Ricordi la password?{' '}
                    <Link
                      href="/auth"
                      className="font-medium text-apple-blue transition-colors hover:text-apple-blue-hover hover:underline"
                    >
                      Accedi
                    </Link>
                  </p>
                </motion.div>
              )}
            </motion.div>
          </div>

          {/* Version Badge */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2 }}
            className="mt-6 text-center text-xs text-foreground/20"
          >
            MechMind OS v10.0
          </motion.p>
        </motion.div>
      </div>
    </div>
  )
}
