'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import useSWR from 'swr';
import { fetcher } from '@/lib/swr-fetcher';
import { motion } from 'framer-motion';
import { AppleCard, AppleCardContent, AppleCardHeader } from '@/components/ui/apple-card';
import { AppleButton } from '@/components/ui/apple-button';
import { Input } from '@/components/ui/input';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import {
  Mail,
  MessageSquare,
  ArrowRight,
  ArrowLeft,
  Check,
  Users,
  FileText,
  Calendar,
  Loader2,
  AlertCircle,
} from 'lucide-react';

const campaignSchema = z.object({
  name: z.string().min(1, 'Il nome della campagna è obbligatorio'),
  type: z.enum(['EMAIL', 'SMS', 'WHATSAPP'], { required_error: 'Seleziona il tipo di campagna' }),
  subject: z.string().optional(),
  body: z.string().min(1, 'Il contenuto del messaggio è obbligatorio'),
  segmentId: z.string().optional(),
  scheduledAt: z.string().optional(),
  sendNow: z.boolean().optional(),
});

type CampaignForm = z.infer<typeof campaignSchema>;

interface Segment {
  id: string;
  name: string;
  customerCount: number;
}

const STEPS = [
  { label: 'Tipo', icon: Mail },
  { label: 'Destinatari', icon: Users },
  { label: 'Contenuto', icon: FileText },
  { label: 'Pianificazione', icon: Calendar },
  { label: 'Riepilogo', icon: Check },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] } },
};

export default function NewCampaignPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<CampaignForm>({
    resolver: zodResolver(campaignSchema),
    defaultValues: { type: 'EMAIL', sendNow: true },
  });

  const { data: segmentsData, isLoading: segmentsLoading } = useSWR<{ data?: Segment[] } | Segment[]>(
    '/api/dashboard/campaigns/segments',
    fetcher
  );

  const segments: Segment[] = (() => {
    if (!segmentsData) return [];
    const list = (segmentsData as { data?: Segment[] }).data || segmentsData;
    return Array.isArray(list) ? list : [];
  })();

  const formValues = watch();

  const onSubmit = async (data: CampaignForm) => {
    setSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        name: data.name,
        type: data.type,
        subject: data.subject,
        body: data.body,
        segmentId: data.segmentId || undefined,
      };
      if (!data.sendNow && data.scheduledAt) {
        body.scheduledAt = new Date(data.scheduledAt).toISOString();
      }

      const res = await fetch('/api/dashboard/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error('Errore nella creazione della campagna');
      const json = await res.json();
      toast.success('Campagna creata con successo');
      const newId = json.data?.id || json.id;
      router.push(newId ? `/dashboard/marketing/${newId}` : '/dashboard/marketing');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Errore nella creazione');
    } finally {
      setSubmitting(false);
    }
  };

  const canGoNext = (): boolean => {
    switch (step) {
      case 0: return !!formValues.type && !!formValues.name;
      case 1: return true;
      case 2: return !!formValues.body;
      case 3: return true;
      default: return true;
    }
  };

  return (
    <div>
      <header className='bg-[#1a1a1a] border-b border-[#4e4e4e]'>
        <div className='px-8 py-5'>
          <Breadcrumb
            items={[
              { label: 'Dashboard', href: '/dashboard' },
              { label: 'Marketing', href: '/dashboard/marketing' },
              { label: 'Nuova Campagna' },
            ]}
          />
          <h1 className='text-headline text-white'>Nuova Campagna</h1>
        </div>
      </header>

      <div className='p-8 max-w-3xl mx-auto'>
        {/* Step Indicator */}
        <div className='flex items-center justify-between mb-8'>
          {STEPS.map((s, i) => (
            <div key={s.label} className='flex items-center'>
              <div className={`flex items-center gap-2 ${i <= step ? 'text-white' : 'text-[#888]'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                  i < step ? 'bg-white text-[#0d0d0d]' : i === step ? 'bg-[#383838] text-white border-2 border-[#ececec]' : 'bg-[#2f2f2f] border border-[#4e4e4e] text-[#888]'
                }`}>
                  {i < step ? <Check className='h-4 w-4' /> : i + 1}
                </div>
                <span className='text-xs font-medium hidden sm:inline'>{s.label}</span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`w-8 sm:w-16 h-0.5 mx-2 ${i < step ? 'bg-white' : 'bg-[#4e4e4e]'}`} />
              )}
            </div>
          ))}
        </div>

        <motion.div initial='hidden' animate='visible' variants={containerVariants}>
          <form onSubmit={handleSubmit(onSubmit)}>
            {/* Step 1: Type */}
            {step === 0 && (
              <motion.div variants={cardVariants}>
                <AppleCard hover={false}>
                  <AppleCardHeader>
                    <h2 className='text-title-2 font-semibold text-white'>
                      Tipo e Nome
                    </h2>
                  </AppleCardHeader>
                  <AppleCardContent className='space-y-6'>
                    <div>
                      <label className='text-sm font-medium text-white mb-2 block'>
                        Nome campagna
                      </label>
                      <Input
                        {...register('name')}
                        placeholder='Es: Promozione Tagliando Primavera'
                      />
                      {errors.name && <p className='text-xs text-red-500 mt-1'>{errors.name.message}</p>}
                    </div>
                    <div>
                      <label className='text-sm font-medium text-white mb-3 block'>
                        Tipo di campagna
                      </label>
                      <div className='grid grid-cols-3 gap-3'>
                        {[
                          { value: 'EMAIL' as const, label: 'Email', icon: Mail, desc: 'Newsletter e promozioni' },
                          { value: 'SMS' as const, label: 'SMS', icon: MessageSquare, desc: 'Messaggi brevi' },
                          { value: 'WHATSAPP' as const, label: 'WhatsApp', icon: MessageSquare, desc: 'Messaggi WhatsApp' },
                        ].map(t => (
                          <button
                            key={t.value}
                            type='button'
                            onClick={() => setValue('type', t.value)}
                            className={`p-4 rounded-2xl text-left transition-all border ${
                              formValues.type === t.value
                                ? 'border-[#ececec] bg-[#383838]'
                                : 'border-[#4e4e4e] bg-[#2f2f2f] hover:bg-[#383838]'
                            }`}
                          >
                            <t.icon className={`h-6 w-6 mb-2 ${formValues.type === t.value ? 'text-white' : 'text-[#888]'}`} />
                            <p className='text-sm font-semibold text-white'>{t.label}</p>
                            <p className='text-xs text-[#888]'>{t.desc}</p>
                          </button>
                        ))}
                      </div>
                    </div>
                  </AppleCardContent>
                </AppleCard>
              </motion.div>
            )}

            {/* Step 2: Recipients */}
            {step === 1 && (
              <motion.div variants={cardVariants}>
                <AppleCard hover={false}>
                  <AppleCardHeader>
                    <h2 className='text-title-2 font-semibold text-white'>
                      Destinatari
                    </h2>
                  </AppleCardHeader>
                  <AppleCardContent className='space-y-4'>
                    <p className='text-body text-[#888]'>
                      Seleziona un segmento di clienti o invia a tutti i clienti.
                    </p>
                    {segmentsLoading ? (
                      <div className='flex items-center justify-center py-8'>
                        <Loader2 className='h-6 w-6 animate-spin text-white' />
                      </div>
                    ) : (
                      <div className='space-y-3'>
                        <button
                          type='button'
                          onClick={() => setValue('segmentId', '')}
                          className={`w-full p-4 rounded-2xl text-left transition-all border ${
                            !formValues.segmentId
                              ? 'border-[#ececec] bg-[#383838]'
                              : 'border-[#4e4e4e] bg-[#2f2f2f] hover:bg-[#383838]'
                          }`}
                        >
                          <div className='flex items-center gap-3'>
                            <Users className='h-5 w-5 text-white' />
                            <div>
                              <p className='text-sm font-semibold text-white'>Tutti i clienti</p>
                              <p className='text-xs text-[#888]'>Invia a tutti i clienti registrati</p>
                            </div>
                          </div>
                        </button>
                        {segments.map(seg => (
                          <button
                            key={seg.id}
                            type='button'
                            onClick={() => setValue('segmentId', seg.id)}
                            className={`w-full p-4 rounded-2xl text-left transition-all border ${
                              formValues.segmentId === seg.id
                                ? 'border-[#ececec] bg-[#383838]'
                                : 'border-[#4e4e4e] bg-[#2f2f2f] hover:bg-[#383838]'
                            }`}
                          >
                            <div className='flex items-center justify-between'>
                              <div className='flex items-center gap-3'>
                                <Users className='h-5 w-5 text-[#888]' />
                                <div>
                                  <p className='text-sm font-semibold text-white'>{seg.name}</p>
                                  <p className='text-xs text-[#888]'>{seg.customerCount} clienti</p>
                                </div>
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </AppleCardContent>
                </AppleCard>
              </motion.div>
            )}

            {/* Step 3: Content */}
            {step === 2 && (
              <motion.div variants={cardVariants}>
                <AppleCard hover={false}>
                  <AppleCardHeader>
                    <h2 className='text-title-2 font-semibold text-white'>
                      Contenuto
                    </h2>
                  </AppleCardHeader>
                  <AppleCardContent className='space-y-4'>
                    {formValues.type === 'EMAIL' && (
                      <div>
                        <label className='text-sm font-medium text-white mb-2 block'>
                          Oggetto email
                        </label>
                        <Input
                          {...register('subject')}
                          placeholder='Es: Offerta speciale per te!'
                        />
                      </div>
                    )}
                    <div>
                      <label className='text-sm font-medium text-white mb-2 block'>
                        Corpo del messaggio
                      </label>
                      <textarea
                        {...register('body')}
                        rows={8}
                        className='w-full rounded-2xl border border-[#4e4e4e] bg-[#2f2f2f] text-white placeholder-[#888] px-5 py-3 outline-none text-sm resize-none'
                        placeholder='Scrivi il contenuto del messaggio...'
                      />
                      {errors.body && <p className='text-xs text-red-500 mt-1'>{errors.body.message}</p>}
                    </div>
                  </AppleCardContent>
                </AppleCard>
              </motion.div>
            )}

            {/* Step 4: Schedule */}
            {step === 3 && (
              <motion.div variants={cardVariants}>
                <AppleCard hover={false}>
                  <AppleCardHeader>
                    <h2 className='text-title-2 font-semibold text-white'>
                      Pianificazione
                    </h2>
                  </AppleCardHeader>
                  <AppleCardContent className='space-y-4'>
                    <div className='space-y-3'>
                      <button
                        type='button'
                        onClick={() => setValue('sendNow', true)}
                        className={`w-full p-4 rounded-2xl text-left transition-all border ${
                          formValues.sendNow
                            ? 'border-[#ececec] bg-[#383838]'
                            : 'border-[#4e4e4e] bg-[#2f2f2f] hover:bg-[#383838]'
                        }`}
                      >
                        <p className='text-sm font-semibold text-white'>Invia subito</p>
                        <p className='text-xs text-[#888]'>La campagna verrà inviata immediatamente</p>
                      </button>
                      <button
                        type='button'
                        onClick={() => setValue('sendNow', false)}
                        className={`w-full p-4 rounded-2xl text-left transition-all border ${
                          !formValues.sendNow
                            ? 'border-[#ececec] bg-[#383838]'
                            : 'border-[#4e4e4e] bg-[#2f2f2f] hover:bg-[#383838]'
                        }`}
                      >
                        <p className='text-sm font-semibold text-white'>Pianifica invio</p>
                        <p className='text-xs text-[#888]'>Scegli data e ora per l&apos;invio</p>
                      </button>
                    </div>
                    {!formValues.sendNow && (
                      <div>
                        <label className='text-sm font-medium text-white mb-2 block'>
                          Data e ora di invio
                        </label>
                        <Input
                          type='datetime-local'
                          {...register('scheduledAt')}
                        />
                      </div>
                    )}
                  </AppleCardContent>
                </AppleCard>
              </motion.div>
            )}

            {/* Step 5: Summary */}
            {step === 4 && (
              <motion.div variants={cardVariants}>
                <AppleCard hover={false}>
                  <AppleCardHeader>
                    <h2 className='text-title-2 font-semibold text-white'>
                      Riepilogo Campagna
                    </h2>
                  </AppleCardHeader>
                  <AppleCardContent className='space-y-4'>
                    <div className='space-y-3'>
                      {[
                        { label: 'Nome', value: formValues.name },
                        { label: 'Tipo', value: formValues.type },
                        { label: 'Oggetto', value: formValues.subject || '-' },
                        { label: 'Destinatari', value: formValues.segmentId ? segments.find(s => s.id === formValues.segmentId)?.name || 'Segmento selezionato' : 'Tutti i clienti' },
                        { label: 'Invio', value: formValues.sendNow ? 'Immediato' : formValues.scheduledAt ? new Date(formValues.scheduledAt).toLocaleString('it-IT') : 'Non pianificato' },
                      ].map(row => (
                        <div key={row.label} className='flex justify-between text-sm py-2 border-b border-[#4e4e4e]'>
                          <span className='text-[#888]'>{row.label}</span>
                          <span className='font-medium text-white'>{row.value}</span>
                        </div>
                      ))}
                    </div>
                    <div className='mt-4'>
                      <p className='text-sm text-[#888] mb-2'>Anteprima messaggio</p>
                      <div className='p-4 bg-[#383838] border border-[#4e4e4e] rounded-2xl text-sm text-white whitespace-pre-wrap max-h-40 overflow-y-auto'>
                        {formValues.body || 'Nessun contenuto'}
                      </div>
                    </div>
                  </AppleCardContent>
                </AppleCard>
              </motion.div>
            )}

            {/* Navigation */}
            <div className='flex items-center justify-between mt-6'>
              <AppleButton
                variant='ghost'
                type='button'
                icon={<ArrowLeft className='h-4 w-4' />}
                onClick={() => step > 0 ? setStep(step - 1) : router.push('/dashboard/marketing')}
              >
                {step === 0 ? 'Annulla' : 'Indietro'}
              </AppleButton>
              {step < 4 ? (
                <AppleButton
                  type='button'
                  icon={<ArrowRight className='h-4 w-4' />}
                  disabled={!canGoNext()}
                  onClick={() => setStep(step + 1)}
                >
                  Avanti
                </AppleButton>
              ) : (
                <AppleButton
                  type='submit'
                  icon={<Check className='h-4 w-4' />}
                  loading={submitting}
                >
                  Crea Campagna
                </AppleButton>
              )}
            </div>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
