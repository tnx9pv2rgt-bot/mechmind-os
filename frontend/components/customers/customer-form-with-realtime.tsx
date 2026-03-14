'use client';

/**
 * Customer Form with Realtime Save
 *
 * Esempio di integrazione del sistema Real-Time Save nel form cliente.
 * Mostra come utilizzare RealtimeFormWrapper e useRealtimeSave.
 *
 * @example
 * ```tsx
 * <CustomerFormWithRealtime
 *   customerId="new" // o ID esistente per edit
 * />
 * ```
 */

'use client';

import { useState, useCallback, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { v4 as uuidv4 } from 'uuid';
import { User, Mail, Phone, MapPin, Save, AlertCircle, CheckCircle2 } from 'lucide-react';

// Components
import {
  RealtimeFormWrapper,
  SaveStatusIndicator,
  ConflictResolutionDialog,
} from '@/components/realtime';
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

// Hooks
import { useRealtimeSave, type FormDraft } from '@/hooks/realtime';

// Types
import type { ConflictData } from '@/hooks/realtime';

// ============================================================================
// SCHEMA & TYPES
// ============================================================================

const customerFormSchema = z.object({
  firstName: z.string().min(2, 'Il nome è obbligatorio'),
  lastName: z.string().min(2, 'Il cognome è obbligatorio'),
  email: z.string().email('Email non valida'),
  phone: z.string().min(10, 'Telefono non valido'),
  address: z.string().optional(),
  city: z.string().optional(),
  postalCode: z.string().optional(),
  notes: z.string().optional(),
});

type CustomerFormData = z.infer<typeof customerFormSchema>;

interface CustomerFormWithRealtimeProps {
  /** ID cliente per edit, 'new' per nuovo */
  customerId?: string;
  /** Dati iniziali (per edit) */
  initialData?: Partial<CustomerFormData>;
  /** Callback on success */
  onSuccess?: (data: CustomerFormData) => void;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function CustomerFormWithRealtime({
  customerId = 'new',
  initialData,
  onSuccess,
}: CustomerFormWithRealtimeProps) {
  // Generate unique form ID for this instance
  const [formInstanceId] = useState(() =>
    customerId === 'new' ? `customer-new-${uuidv4()}` : `customer-edit-${customerId}`
  );

  // Form state for realtime save
  const [formData, setFormData] = useState<CustomerFormData>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    postalCode: '',
    notes: '',
    ...initialData,
  });

  // Conflict state
  const [showConflictModal, setShowConflictModal] = useState(false);
  const [conflictData, setConflictData] = useState<ConflictData | null>(null);

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // React Hook Form
  const form = useForm<CustomerFormData>({
    resolver: zodResolver(customerFormSchema),
    defaultValues: formData,
  });

  // Realtime save hook
  const realtimeSave = useRealtimeSave({
    formId: formInstanceId,
    formType: 'customer',
    data: formData,
    debounceMs: 500,
    maxRetries: 3,
    enableRealtime: true,
    onConflict: conflict => {
      setConflictData(conflict);
      setShowConflictModal(true);
    },
    onSave: _draft => {
      // Draft saved successfully
    },
    onError: error => {
      console.error('[RealtimeSave] Error:', error);
    },
  });

  // Sync form data with react-hook-form
  useEffect(() => {
    const subscription = form.watch(value => {
      setFormData(value as CustomerFormData);
    });
    return () => subscription.unsubscribe();
  }, [form]);

  // Load draft on mount
  useEffect(() => {
    const loadDraft = async () => {
      const draft = await realtimeSave.loadDraft();
      if (draft && draft.data) {
        // Merge draft data with form
        const draftData = draft.data as CustomerFormData;
        form.reset(draftData);
        setFormData(draftData);
      }
    };

    loadDraft();
  }, [form, realtimeSave]);

  // Handle conflict resolution
  const handleResolveConflict = useCallback(
    async (useRemote: boolean) => {
      await realtimeSave.resolveConflict(useRemote);
      setShowConflictModal(false);

      if (useRemote && conflictData) {
        // Apply remote data
        const remoteData = conflictData.remote.data as CustomerFormData;
        form.reset(remoteData);
        setFormData(remoteData);
      }
    },
    [realtimeSave, conflictData, form]
  );

  // Handle form submission
  const onSubmit = async (data: CustomerFormData) => {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      // Force save before submission
      await realtimeSave.forceSave();

      // Here you would typically call your API
      // await api.customers.create(data)

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Clear draft on successful submission
      await realtimeSave.deleteDraft();

      setSubmitSuccess(true);
      onSuccess?.(data);

      // Reset success message after 3s
      setTimeout(() => setSubmitSuccess(false), 3000);
    } catch (error) {
      setSubmitError('Errore durante il salvataggio. Riprova.');
      console.error('[Form] Submit error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className='max-w-2xl mx-auto'>
      {/* Header with save status */}
      <div className='flex items-center justify-between mb-6'>
        <div>
          <h1 className='text-2xl font-bold text-gray-900'>
            {customerId === 'new' ? 'Nuovo Cliente' : 'Modifica Cliente'}
          </h1>
          <p className='text-gray-500 text-sm mt-1'>I dati vengono salvati automaticamente</p>
        </div>

        <SaveStatusIndicator
          status={realtimeSave.saveStatus}
          lastSaved={realtimeSave.lastSaved}
          lastSavedText={realtimeSave.lastSavedText}
          pendingChanges={realtimeSave.pendingChanges}
          onRetry={realtimeSave.retry}
          onResolve={() => setShowConflictModal(true)}
        />
      </div>

      {/* Success alert */}
      {submitSuccess && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className='mb-6'
        >
          <Alert className='bg-green-50 border-green-200'>
            <CheckCircle2 className='w-4 h-4 text-green-600' />
            <AlertDescription className='text-green-800'>
              Cliente salvato con successo!
            </AlertDescription>
          </Alert>
        </motion.div>
      )}

      {/* Error alert */}
      {submitError && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className='mb-6'
        >
          <Alert variant='destructive'>
            <AlertCircle className='w-4 h-4' />
            <AlertDescription>{submitError}</AlertDescription>
          </Alert>
        </motion.div>
      )}

      {/* Form Card */}
      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            <User className='w-5 h-5' />
            Informazioni Cliente
          </CardTitle>
        </CardHeader>

        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-6'>
              {/* Name Fields */}
              <div className='grid grid-cols-2 gap-4'>
                <FormField
                  control={form.control}
                  name='firstName'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome *</FormLabel>
                      <FormControl>
                        <Input placeholder='Mario' {...field} className='h-11' />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name='lastName'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cognome *</FormLabel>
                      <FormControl>
                        <Input placeholder='Rossi' {...field} className='h-11' />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Contact Fields */}
              <div className='grid grid-cols-2 gap-4'>
                <FormField
                  control={form.control}
                  name='email'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className='flex items-center gap-2'>
                        <Mail className='w-4 h-4' />
                        Email *
                      </FormLabel>
                      <FormControl>
                        <Input
                          type='email'
                          placeholder='mario.rossi@example.com'
                          {...field}
                          className='h-11'
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name='phone'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className='flex items-center gap-2'>
                        <Phone className='w-4 h-4' />
                        Telefono *
                      </FormLabel>
                      <FormControl>
                        <Input placeholder='+39 333 123 4567' {...field} className='h-11' />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Address */}
              <FormField
                control={form.control}
                name='address'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className='flex items-center gap-2'>
                      <MapPin className='w-4 h-4' />
                      Indirizzo
                    </FormLabel>
                    <FormControl>
                      <Input placeholder='Via Roma 123' {...field} className='h-11' />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* City & Postal Code */}
              <div className='grid grid-cols-2 gap-4'>
                <FormField
                  control={form.control}
                  name='city'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Città</FormLabel>
                      <FormControl>
                        <Input placeholder='Milano' {...field} className='h-11' />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name='postalCode'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>CAP</FormLabel>
                      <FormControl>
                        <Input placeholder='20121' {...field} className='h-11' />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Notes */}
              <FormField
                control={form.control}
                name='notes'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Note</FormLabel>
                    <FormControl>
                      <textarea
                        {...field}
                        rows={4}
                        className='w-full px-3 py-2 border rounded-md text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500'
                        placeholder='Note aggiuntive sul cliente...'
                      />
                    </FormControl>
                    <FormDescription>
                      Informazioni aggiuntive visibili solo allo staff
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Submit Button */}
              <div className='flex items-center justify-between pt-4 border-t'>
                <div className='text-sm text-gray-500'>
                  {realtimeSave.isOnline ? (
                    <span className='flex items-center gap-1.5'>
                      <span className='w-2 h-2 bg-green-500 rounded-full animate-pulse' />
                      Online
                    </span>
                  ) : (
                    <span className='flex items-center gap-1.5 text-amber-600'>
                      <span className='w-2 h-2 bg-amber-500 rounded-full' />
                      Offline · {realtimeSave.pendingChanges} in attesa
                    </span>
                  )}
                </div>

                <div className='flex gap-3'>
                  <Button
                    type='button'
                    variant='outline'
                    onClick={() => realtimeSave.forceSave()}
                    disabled={realtimeSave.saveStatus === 'saving'}
                  >
                    <Save className='w-4 h-4 mr-2' />
                    {realtimeSave.saveStatus === 'saving' ? 'Salvataggio...' : 'Salva bozza'}
                  </Button>

                  <Button
                    type='submit'
                    disabled={isSubmitting || !form.formState.isValid}
                    className='min-w-[120px]'
                  >
                    {isSubmitting ? (
                      <>
                        <span className='w-4 h-4 mr-2 border-2 border-white/30 border-t-white rounded-full animate-spin' />
                        Invio...
                      </>
                    ) : (
                      'Salva Cliente'
                    )}
                  </Button>
                </div>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Fixed save indicator (bottom-left) */}
      <div className='fixed bottom-6 left-6 z-50'>
        <SaveStatusIndicator
          status={realtimeSave.saveStatus}
          lastSaved={realtimeSave.lastSaved}
          lastSavedText={realtimeSave.lastSavedText}
          pendingChanges={realtimeSave.pendingChanges}
          onRetry={realtimeSave.retry}
          onResolve={() => setShowConflictModal(true)}
        />
      </div>

      {/* Conflict Resolution Dialog */}
      {conflictData && (
        <ConflictResolutionDialog
          isOpen={showConflictModal}
          conflictData={conflictData}
          onResolve={handleResolveConflict}
          onCancel={() => setShowConflictModal(false)}
        />
      )}
    </div>
  );
}

export default CustomerFormWithRealtime;
