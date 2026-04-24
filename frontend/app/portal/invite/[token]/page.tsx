'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Car,
  Eye,
  EyeOff,
  Lock,
  AlertCircle,
  CheckCircle,
  Loader2,
  UserPlus,
} from 'lucide-react';
import { AppleCard, AppleCardContent } from '@/components/ui/apple-card';
import { AppleButton } from '@/components/ui/apple-button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

// ============================================
// SCHEMA
// ============================================

const inviteSchema = z
  .object({
    password: z.string().min(8, 'La password deve avere almeno 8 caratteri'),
    confirmPassword: z.string().min(1, 'Conferma la password'),
  })
  .refine(data => data.password === data.confirmPassword, {
    message: 'Le password non coincidono',
    path: ['confirmPassword'],
  });

type InviteForm = z.infer<typeof inviteSchema>;

interface InvitationDetails {
  shopName: string;
  inviterName: string;
  email: string;
  role: string;
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function PortalInvitePage(): React.ReactElement {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;

  const [invitation, setInvitation] = useState<InvitationDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<InviteForm>({
    resolver: zodResolver(inviteSchema),
  });

  // Load invitation details
  useEffect(() => {
    const loadInvitation = async (): Promise<void> => {
      try {
        const res = await fetch(`/api/portal/auth/invite/${token}`);
        if (!res.ok) {
          const data = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
          throw new Error(data?.error?.message || 'Invito non valido o scaduto');
        }
        const data = (await res.json()) as { data?: InvitationDetails };
        if (data.data) {
          setInvitation(data.data);
        } else {
          throw new Error('Dati invito non trovati');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Errore nel caricamento dell\'invito');
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      loadInvitation();
    }
  }, [token]);

  const onSubmit = async (data: InviteForm): Promise<void> => {
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/portal/auth/invite/${token}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: data.password }),
      });

      if (!res.ok) {
        const errData = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
        throw new Error(errData?.error?.message || 'Errore durante l\'accettazione dell\'invito');
      }

      setSuccess(true);
      toast.success('Invito accettato! Accesso in corso...');

      setTimeout(() => {
        router.push('/portal/dashboard');
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore sconosciuto');
    } finally {
      setSubmitting(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className='min-h-screen bg-[var(--surface-tertiary)] dark:bg-[var(--surface-primary)] flex items-center justify-center p-4'>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className='text-center'
        >
          <Loader2 className='h-10 w-10 text-[var(--brand)] animate-spin mx-auto mb-4' />
          <p className='text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]'>Caricamento invito...</p>
        </motion.div>
      </div>
    );
  }

  // Error state (invalid/expired token)
  if (!invitation && error) {
    return (
      <div className='min-h-screen bg-[var(--surface-tertiary)] dark:bg-[var(--surface-primary)] flex items-center justify-center p-4'>
        <div className='w-full max-w-md'>
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className='text-center mb-8'
          >
            <div className='w-20 h-20 rounded-3xl bg-[var(--status-error-subtle)] dark:bg-[var(--status-error-subtle)] flex items-center justify-center mx-auto mb-4'>
              <AlertCircle className='h-10 w-10 text-[var(--status-error)]' />
            </div>
            <h1 className='text-2xl font-bold text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
              Invito non valido
            </h1>
            <p className='text-[var(--text-tertiary)] dark:text-[var(--text-secondary)] mt-2'>{error}</p>
          </motion.div>
          <div className='text-center'>
            <AppleButton variant='secondary' onClick={() => router.push('/portal/login')}>
              Vai al login
            </AppleButton>
          </div>
        </div>
      </div>
    );
  }

  // Success state
  if (success) {
    return (
      <div className='min-h-screen bg-[var(--surface-tertiary)] dark:bg-[var(--surface-primary)] flex items-center justify-center p-4'>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className='text-center'
        >
          <CheckCircle className='h-16 w-16 text-[var(--status-success)] mx-auto mb-4' />
          <h2 className='text-xl font-bold text-[var(--text-primary)] dark:text-[var(--text-primary)] mb-2'>
            Benvenuto nel team!
          </h2>
          <p className='text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]'>Reindirizzamento in corso...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className='min-h-screen bg-[var(--surface-tertiary)] dark:bg-[var(--surface-primary)] flex items-center justify-center p-4'>
      <div className='w-full max-w-md'>
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className='text-center mb-8'
        >
          <div className='w-20 h-20 rounded-3xl bg-gradient-to-br from-[var(--brand)] to-[var(--status-info)] flex items-center justify-center mx-auto mb-4'>
            <UserPlus className='h-10 w-10 text-[var(--text-on-brand)]' />
          </div>
          <h1 className='text-2xl font-bold text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
            Sei stato invitato!
          </h1>
          {invitation && (
            <p className='text-[var(--text-tertiary)] dark:text-[var(--text-secondary)] mt-2'>
              <span className='font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                {invitation.inviterName}
              </span>{' '}
              ti ha invitato a unirti a{' '}
              <span className='font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                {invitation.shopName}
              </span>
            </p>
          )}
        </motion.div>

        {/* Invitation Details */}
        {invitation && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className='mb-6'
          >
            <div className='flex items-center justify-center gap-4 text-sm'>
              <div className='px-3 py-1.5 rounded-full bg-[var(--brand)]/10 text-[var(--brand)] font-medium'>
                {invitation.role}
              </div>
              <span className='text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]'>{invitation.email}</span>
            </div>
          </motion.div>
        )}

        {/* Password Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <AppleCard>
            <AppleCardContent className='p-6 sm:p-8'>
              <h2 className='text-base font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)] mb-1'>
                Imposta la tua password
              </h2>
              <p className='text-sm text-[var(--text-tertiary)] dark:text-[var(--text-secondary)] mb-5'>
                Scegli una password sicura per il tuo account
              </p>

              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className='mb-5 p-4 bg-[var(--status-error-subtle)] dark:bg-[var(--status-error-subtle)] border border-[var(--status-error)]/30 dark:border-[var(--status-error)]/50 rounded-xl flex items-center gap-3'
                >
                  <AlertCircle className='h-5 w-5 text-[var(--status-error)] flex-shrink-0' />
                  <p className='text-sm text-[var(--status-error)]'>{error}</p>
                </motion.div>
              )}

              <form onSubmit={handleSubmit(onSubmit)} className='space-y-5'>
                {/* Password */}
                <div className='space-y-2'>
                  <Label htmlFor='password' className='text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                    Password
                  </Label>
                  <div className='relative'>
                    <Lock className='absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[var(--text-tertiary)]' />
                    <Input
                      id='password'
                      type={showPassword ? 'text' : 'password'}
                      placeholder='Minimo 8 caratteri'
                      autoComplete='new-password'
                      className='pl-12 pr-12 h-12 rounded-xl border-[var(--border-default)] dark:border-[var(--border-default)] bg-[var(--surface-secondary)] dark:bg-[var(--surface-elevated)] text-[var(--text-primary)] dark:text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:border-[var(--brand)] focus:ring-apple-blue/20'
                      {...register('password')}
                    />
                    <button
                      type='button'
                      onClick={() => setShowPassword(!showPassword)}
                      className='absolute right-4 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors p-1 min-w-[24px] min-h-[24px] flex items-center justify-center'
                      aria-label={showPassword ? 'Nascondi password' : 'Mostra password'}
                    >
                      {showPassword ? <EyeOff className='h-5 w-5' /> : <Eye className='h-5 w-5' />}
                    </button>
                  </div>
                  {errors.password && (
                    <p className='text-xs text-[var(--status-error)]'>{errors.password.message}</p>
                  )}
                </div>

                {/* Confirm Password */}
                <div className='space-y-2'>
                  <Label htmlFor='confirmPassword' className='text-[var(--text-primary)] dark:text-[var(--text-primary)]'>
                    Conferma Password
                  </Label>
                  <div className='relative'>
                    <Lock className='absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[var(--text-tertiary)]' />
                    <Input
                      id='confirmPassword'
                      type={showPassword ? 'text' : 'password'}
                      placeholder='Ripeti la password'
                      autoComplete='new-password'
                      className='pl-12 h-12 rounded-xl border-[var(--border-default)] dark:border-[var(--border-default)] bg-[var(--surface-secondary)] dark:bg-[var(--surface-elevated)] text-[var(--text-primary)] dark:text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:border-[var(--brand)] focus:ring-apple-blue/20'
                      {...register('confirmPassword')}
                    />
                  </div>
                  {errors.confirmPassword && (
                    <p className='text-xs text-[var(--status-error)]'>{errors.confirmPassword.message}</p>
                  )}
                </div>

                {/* Submit */}
                <AppleButton
                  type='submit'
                  fullWidth
                  loading={submitting}
                  icon={<Car className='h-4 w-4' />}
                  className='h-12'
                >
                  Accetta invito
                </AppleButton>
              </form>
            </AppleCardContent>
          </AppleCard>
        </motion.div>
      </div>
    </div>
  );
}
