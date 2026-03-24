'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Megaphone,
  Plus,
  Mail,
  MessageSquare,
  Users,
  Calendar,
  Clock,
  Send,
  Eye,
  BarChart3,
  ChevronRight,
  Save,
  X,
  CheckCircle,
  AlertCircle,
  Clock3,
  Target,
  Edit,
  Copy,
  Trash2,
  Pause,
  Play,
} from 'lucide-react';
import { formatDate, formatDateTime } from '@/lib/utils';

// Types
interface Campaign {
  id: string;
  name: string;
  type: 'email' | 'sms';
  subject: string;
  content: string;
  segment: string;
  segmentCount: number;
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'paused';
  scheduledFor?: string;
  createdAt: string;
  stats?: {
    sent: number;
    opened: number;
    clicked: number;
    bounced: number;
    openRate: number;
    clickRate: number;
  };
}

interface CampaignTemplate {
  id: string;
  name: string;
  type: 'email' | 'sms';
  subject: string;
  content: string;
  category: string;
}

// Mock Data
const mockCampaigns: Campaign[] = [
  {
    id: '1',
    name: 'Promo Primavera 2026',
    type: 'email',
    subject: '🌸 Offerta Speciale Tagliando di Primavera!',
    content: 'Gentile cliente, approfitta del nostro sconto del 20% sul tagliando completo...',
    segment: 'VIP Customers',
    segmentCount: 45,
    status: 'sent',
    createdAt: '2026-02-20',
    scheduledFor: '2026-02-21T09:00:00',
    stats: {
      sent: 45,
      opened: 38,
      clicked: 22,
      bounced: 0,
      openRate: 84.4,
      clickRate: 48.9,
    },
  },
  {
    id: '2',
    name: 'Recall At-Risk Customers',
    type: 'sms',
    subject: '',
    content:
      'Ciao! Ti manchiamo! Torna a trovarci e ricevi uno sconto del 15% sul prossimo intervento. Prenota ora: 02 1234567',
    segment: 'At-Risk Customers',
    segmentCount: 128,
    status: 'scheduled',
    createdAt: '2026-02-26',
    scheduledFor: '2026-03-01T10:00:00',
  },
  {
    id: '3',
    name: 'Nuovi Servizi Ford',
    type: 'email',
    subject: 'Scopri i nuovi servizi dedicati ai proprietari Ford',
    content: 'Ciao! Abbiamo introdotto nuovi servizi specifici per i veicoli Ford...',
    segment: 'Ford Owners',
    segmentCount: 89,
    status: 'draft',
    createdAt: '2026-02-27',
  },
  {
    id: '4',
    name: 'Promo Cambio Gomme',
    type: 'email',
    subject: 'È ora del cambio gomme! Offerta speciale',
    content: 'La primavera si avvicina, è il momento di cambiare le gomme...',
    segment: 'All Customers',
    segmentCount: 1250,
    status: 'sending',
    createdAt: '2026-02-28',
    scheduledFor: '2026-02-28T14:00:00',
  },
];

const templates: CampaignTemplate[] = [
  {
    id: 't1',
    name: 'Promo Tagliando',
    type: 'email',
    subject: '🚗 Offerta Speciale Tagliando!',
    content:
      'Gentile [NOME], approfitta del nostro sconto del [SCONTO]% sul tagliando completo. Valido fino al [DATA].',
    category: 'Promozioni',
  },
  {
    id: 't2',
    name: 'Recall Clienti',
    type: 'email',
    subject: 'Ti manchiamo! Torna a trovarci',
    content:
      "Ciao [NOME], è da un po' che non ci vediamo! Abbiamo uno sconto speciale del 15% per il tuo prossimo intervento.",
    category: 'Retention',
  },
  {
    id: 't3',
    name: 'Reminder Appuntamento',
    type: 'sms',
    subject: '',
    content:
      "Ciao [NOME], ti ricordiamo l'appuntamento di domani alle [ORA]. Per modifiche chiama 02 1234567",
    category: 'Reminder',
  },
  {
    id: 't4',
    name: 'Offerta Gomme',
    type: 'email',
    subject: '🛞 Cambio Gomme in Offerta',
    content:
      'È tempo di cambiare le gomme! Offerta speciale: 4 gomme + montaggio a soli [PREZZO]€.',
    category: 'Promozioni',
  },
  {
    id: 't5',
    name: 'Promo SMS Flash',
    type: 'sms',
    subject: '',
    content:
      '⚡ FLASH SALE! Solo oggi 20% di sconto su tutti i servizi. Mostra questo SMS in officina.',
    category: 'Promozioni',
  },
];

const segments = [
  { value: 'all', label: 'Tutti i Clienti', count: 1250 },
  { value: 'vip', label: 'Clienti VIP', count: 45 },
  { value: 'at-risk', label: 'Clienti a Rischio', count: 128 },
  { value: 'ford', label: 'Proprietari Ford', count: 89 },
  { value: 'high-value', label: 'Ordini Alto Valore', count: 156 },
  { value: 'new', label: 'Nuovi Clienti', count: 67 },
];

// Components
function StatusBadge({ status }: { status: Campaign['status'] }) {
  const config = {
    draft: { bg: 'bg-gray-100 text-gray-700', icon: Edit, label: 'Bozza' },
    scheduled: { bg: 'bg-blue-100 text-blue-700', icon: Clock3, label: 'Programmata' },
    sending: { bg: 'bg-amber-100 text-amber-700', icon: Send, label: 'In Invio' },
    sent: { bg: 'bg-green-100 text-green-700', icon: CheckCircle, label: 'Inviata' },
    paused: { bg: 'bg-red-100 text-red-700', icon: Pause, label: 'In Pausa' },
  };

  const { bg, icon: Icon, label } = config[status];

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${bg}`}
    >
      <Icon className='h-3.5 w-3.5' />
      {label}
    </span>
  );
}

function TypeBadge({ type }: { type: Campaign['type'] }) {
  const config = {
    email: { bg: 'bg-purple-100 text-purple-700', icon: Mail, label: 'Email' },
    sms: { bg: 'bg-cyan-100 text-cyan-700', icon: MessageSquare, label: 'SMS' },
  };

  const { bg, icon: Icon, label } = config[type];

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${bg}`}
    >
      <Icon className='h-3.5 w-3.5' />
      {label}
    </span>
  );
}

function StatCard({
  label,
  value,
  subtext,
  icon: Icon,
  color,
}: {
  label: string;
  value: string;
  subtext?: string;
  icon: React.ElementType;
  color: string;
}) {
  return (
    <div className='rounded-lg bg-gray-50 p-4 dark:bg-gray-800'>
      <div className='flex items-center gap-3'>
        <div className={`rounded-lg p-2 ${color}`}>
          <Icon className='h-5 w-5 text-white' />
        </div>
        <div>
          <p className='text-sm text-gray-500'>{label}</p>
          <p className='text-xl font-bold text-gray-900 dark:text-white'>{value}</p>
          {subtext && <p className='text-xs text-gray-500'>{subtext}</p>}
        </div>
      </div>
    </div>
  );
}

export function MarketingCampaigns() {
  const [campaigns, setCampaigns] = useState<Campaign[]>(mockCampaigns);
  const [isCreating, setIsCreating] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [viewingStats, setViewingStats] = useState<Campaign | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<CampaignTemplate | null>(null);

  const [formData, setFormData] = useState<Partial<Campaign>>({
    name: '',
    type: 'email',
    subject: '',
    content: '',
    segment: 'all',
    status: 'draft',
  });

  const handleCreateCampaign = () => {
    setIsCreating(true);
    setFormData({
      name: '',
      type: 'email',
      subject: '',
      content: '',
      segment: 'all',
      status: 'draft',
    });
    setSelectedTemplate(null);
  };

  const handleSaveCampaign = () => {
    if (!formData.name) return;

    const segmentInfo = segments.find(s => s.value === formData.segment);

    const newCampaign: Campaign = {
      id: editingCampaign?.id || Date.now().toString(),
      name: formData.name || '',
      type: formData.type as 'email' | 'sms',
      subject: formData.subject || '',
      content: formData.content || '',
      segment: segmentInfo?.label || 'All Customers',
      segmentCount: segmentInfo?.count || 0,
      status: (formData.status as Campaign['status']) || 'draft',
      scheduledFor: formData.scheduledFor,
      createdAt: editingCampaign?.createdAt || new Date().toISOString().split('T')[0],
    };

    if (editingCampaign) {
      setCampaigns(campaigns.map(c => (c.id === editingCampaign.id ? newCampaign : c)));
    } else {
      setCampaigns([newCampaign, ...campaigns]);
    }

    setIsCreating(false);
    setEditingCampaign(null);
  };

  const handleDeleteCampaign = (id: string) => {
    setCampaigns(campaigns.filter(c => c.id !== id));
  };

  const handleDuplicateCampaign = (campaign: Campaign) => {
    const duplicated: Campaign = {
      ...campaign,
      id: Date.now().toString(),
      name: `${campaign.name} (Copy)`,
      status: 'draft',
      createdAt: new Date().toISOString().split('T')[0],
      stats: undefined,
    };
    setCampaigns([duplicated, ...campaigns]);
  };

  const handleApplyTemplate = (template: CampaignTemplate) => {
    setSelectedTemplate(template);
    setFormData({
      ...formData,
      type: template.type,
      subject: template.subject,
      content: template.content,
    });
  };

  const stats = {
    total: campaigns.length,
    active: campaigns.filter(c => c.status === 'sending' || c.status === 'scheduled').length,
    sent: campaigns.filter(c => c.status === 'sent').length,
    avgOpenRate:
      campaigns.filter(c => c.stats).reduce((acc, c) => acc + (c.stats?.openRate || 0), 0) /
        campaigns.filter(c => c.stats).length || 0,
  };

  return (
    <div className='space-y-6'>
      {/* Header */}
      <div className='flex items-center justify-between'>
        <div>
          <h2 className='text-xl font-bold text-gray-900 dark:text-white'>Campagne Marketing</h2>
          <p className='text-sm text-gray-600 dark:text-gray-400'>
            Crea e gestisci campagne email e SMS
          </p>
        </div>
        <Button onClick={handleCreateCampaign}>
          <Plus className='mr-2 h-4 w-4' />
          Nuova Campagna
        </Button>
      </div>

      {/* Stats Row */}
      <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
        <StatCard
          label='Campagne Totali'
          value={stats.total.toString()}
          icon={Megaphone}
          color='bg-brand-600'
        />
        <StatCard label='Attive' value={stats.active.toString()} icon={Send} color='bg-amber-500' />
        <StatCard
          label='Inviate'
          value={stats.sent.toString()}
          icon={CheckCircle}
          color='bg-status-ready'
        />
        <StatCard
          label='Tasso Apertura Medio'
          value={`${stats.avgOpenRate.toFixed(1)}%`}
          icon={Eye}
          color='bg-purple-500'
        />
      </div>

      {/* Campaigns List */}
      <div className='workshop-card p-0'>
        <div className='overflow-x-auto'>
          <table className='data-table'>
            <thead>
              <tr>
                <th>Campagna</th>
                <th>Tipo</th>
                <th>Segmento</th>
                <th>Stato</th>
                <th>Data</th>
                <th>Azioni</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map(campaign => (
                <tr key={campaign.id} className='hover:bg-gray-50 dark:hover:bg-gray-800/50'>
                  <td>
                    <div>
                      <p className='font-medium text-gray-900 dark:text-white'>{campaign.name}</p>
                      {campaign.type === 'email' && (
                        <p className='text-sm text-gray-500 truncate max-w-[250px]'>
                          {campaign.subject}
                        </p>
                      )}
                    </div>
                  </td>
                  <td>
                    <TypeBadge type={campaign.type} />
                  </td>
                  <td>
                    <div className='flex items-center gap-2'>
                      <Users className='h-4 w-4 text-gray-400' />
                      <span className='text-sm'>{campaign.segment}</span>
                      <span className='text-xs text-gray-500'>({campaign.segmentCount})</span>
                    </div>
                  </td>
                  <td>
                    <StatusBadge status={campaign.status} />
                  </td>
                  <td>
                    {campaign.scheduledFor ? (
                      <span className='text-sm text-gray-600 dark:text-gray-400'>
                        {formatDateTime(campaign.scheduledFor)}
                      </span>
                    ) : (
                      <span className='text-sm text-gray-400'>Non programmata</span>
                    )}
                  </td>
                  <td>
                    <div className='flex items-center gap-1'>
                      {campaign.stats && (
                        <Button
                          variant='ghost'
                          size='icon'
                          onClick={() => setViewingStats(campaign)}
                          aria-label='Visualizza statistiche'
                        >
                          <BarChart3 className='h-4 w-4' />
                        </Button>
                      )}
                      <Button
                        variant='ghost'
                        size='icon'
                        onClick={() => {
                          setEditingCampaign(campaign);
                          setFormData(campaign);
                          setIsCreating(true);
                        }}
                        aria-label='Modifica campagna'
                      >
                        <Edit className='h-4 w-4' />
                      </Button>
                      <Button
                        variant='ghost'
                        size='icon'
                        onClick={() => handleDuplicateCampaign(campaign)}
                        aria-label='Duplica campagna'
                      >
                        <Copy className='h-4 w-4' />
                      </Button>
                      <Button
                        variant='ghost'
                        size='icon'
                        onClick={() => handleDeleteCampaign(campaign.id)}
                        className='text-status-urgent hover:text-status-urgent'
                        aria-label='Elimina campagna'
                      >
                        <Trash2 className='h-4 w-4' />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {campaigns.length === 0 && (
          <div className='py-12 text-center'>
            <Megaphone className='mx-auto h-12 w-12 text-gray-300' />
            <p className='mt-4 text-gray-500'>Nessuna campagna</p>
            <Button className='mt-4' onClick={handleCreateCampaign}>
              Crea la tua prima campagna
            </Button>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {(isCreating || editingCampaign) && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4'>
          <div className='max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-xl bg-white p-6 shadow-xl dark:bg-gray-800'>
            <div className='mb-6 flex items-center justify-between'>
              <h3 className='text-lg font-bold text-gray-900 dark:text-white'>
                {editingCampaign ? 'Modifica Campagna' : 'Crea Campagna'}
              </h3>
              <Button
                variant='ghost'
                size='icon'
                onClick={() => {
                  setIsCreating(false);
                  setEditingCampaign(null);
                }}
                aria-label='Chiudi'
              >
                <X className='h-5 w-5' />
              </Button>
            </div>

            <div className='grid gap-6 lg:grid-cols-3'>
              {/* Left Column - Form */}
              <div className='lg:col-span-2 space-y-4'>
                <Input
                  label='Nome Campagna'
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder='es. Promozione Primavera 2026'
                />

                <div>
                  <label className='mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300'>
                    Tipo Campagna
                  </label>
                  <div className='flex gap-3'>
                    <button
                      onClick={() => setFormData({ ...formData, type: 'email' })}
                      className={`flex flex-1 items-center justify-center gap-2 rounded-lg border-2 p-4 transition-all ${
                        formData.type === 'email'
                          ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                          : 'border-gray-200 dark:border-gray-700'
                      }`}
                    >
                      <Mail className='h-5 w-5 text-purple-600' />
                      <span className='font-medium'>Email</span>
                    </button>
                    <button
                      onClick={() => setFormData({ ...formData, type: 'sms' })}
                      className={`flex flex-1 items-center justify-center gap-2 rounded-lg border-2 p-4 transition-all ${
                        formData.type === 'sms'
                          ? 'border-cyan-500 bg-cyan-50 dark:bg-cyan-900/20'
                          : 'border-gray-200 dark:border-gray-700'
                      }`}
                    >
                      <MessageSquare className='h-5 w-5 text-cyan-600' />
                      <span className='font-medium'>SMS</span>
                    </button>
                  </div>
                </div>

                {formData.type === 'email' && (
                  <Input
                    label='Oggetto'
                    value={formData.subject}
                    onChange={e => setFormData({ ...formData, subject: e.target.value })}
                    placeholder='Inserisci oggetto email...'
                  />
                )}

                <div>
                  <label className='mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300'>
                    Contenuto
                  </label>
                  <textarea
                    value={formData.content}
                    onChange={e => setFormData({ ...formData, content: e.target.value })}
                    rows={8}
                    className='w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:border-gray-600 dark:bg-gray-700'
                    placeholder={
                      formData.type === 'email'
                        ? 'Scrivi il contenuto della email...'
                        : 'Scrivi il messaggio SMS (max 160 caratteri)...'
                    }
                  />
                  {formData.type === 'sms' && formData.content && (
                    <p className='mt-1 text-xs text-gray-500'>
                      {formData.content.length} caratteri /{' '}
                      {Math.ceil(formData.content.length / 160)} SMS
                    </p>
                  )}
                </div>

                <div className='grid gap-4 sm:grid-cols-2'>
                  <div>
                    <label className='mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300'>
                      Segmento Target
                    </label>
                    <select
                      value={formData.segment}
                      onChange={e => setFormData({ ...formData, segment: e.target.value })}
                      className='w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700'
                    >
                      {segments.map(s => (
                        <option key={s.value} value={s.value}>
                          {s.label} ({s.count})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className='mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300'>
                      Programmazione
                    </label>
                    <input
                      type='datetime-local'
                      value={formData.scheduledFor}
                      onChange={e => setFormData({ ...formData, scheduledFor: e.target.value })}
                      className='w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700'
                    />
                  </div>
                </div>
              </div>

              {/* Right Column - Templates */}
              <div className='space-y-4'>
                <h4 className='font-medium text-gray-900 dark:text-white'>Modelli</h4>
                <div className='space-y-2'>
                  {templates.map(template => (
                    <button
                      key={template.id}
                      onClick={() => handleApplyTemplate(template)}
                      className={`w-full rounded-lg border p-3 text-left transition-all ${
                        selectedTemplate?.id === template.id
                          ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20'
                          : 'border-gray-200 hover:border-gray-300 dark:border-gray-700'
                      }`}
                    >
                      <div className='flex items-center justify-between'>
                        <span className='font-medium text-sm'>{template.name}</span>
                        <TypeBadge type={template.type} />
                      </div>
                      <p className='mt-1 text-xs text-gray-500'>{template.category}</p>
                    </button>
                  ))}
                </div>

                {/* Preview */}
                <div className='rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800'>
                  <h4 className='mb-3 font-medium text-gray-900 dark:text-white'>Anteprima</h4>
                  <div className='rounded-lg bg-white p-4 shadow-sm dark:bg-gray-700'>
                    {formData.type === 'email' ? (
                      <div className='space-y-2'>
                        <p className='text-sm font-semibold text-gray-500'>Oggetto:</p>
                        <p className='text-sm'>{formData.subject || '(Nessun oggetto)'}</p>
                        <hr className='border-gray-200 dark:border-gray-600' />
                        <p className='text-sm font-semibold text-gray-500'>Corpo:</p>
                        <p className='text-sm whitespace-pre-wrap'>
                          {formData.content || '(Nessun contenuto)'}
                        </p>
                      </div>
                    ) : (
                      <div className='rounded-lg bg-gray-100 p-3 dark:bg-gray-800'>
                        <p className='text-sm'>{formData.content || '(Nessun contenuto)'}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className='mt-6 flex justify-end gap-3'>
              <Button
                variant='outline'
                onClick={() => {
                  setIsCreating(false);
                  setEditingCampaign(null);
                }}
              >
                Annulla
              </Button>
              <Button variant='outline'>
                <Save className='mr-2 h-4 w-4' />
                Salva come Bozza
              </Button>
              <Button onClick={handleSaveCampaign}>
                <Send className='mr-2 h-4 w-4' />
                {formData.scheduledFor ? 'Programma' : editingCampaign ? 'Aggiorna' : 'Invia Ora'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Stats Modal */}
      {viewingStats && viewingStats.stats && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4'>
          <div className='w-full max-w-2xl rounded-xl bg-white p-6 shadow-xl dark:bg-gray-800'>
            <div className='mb-6 flex items-center justify-between'>
              <div>
                <h3 className='text-lg font-bold text-gray-900 dark:text-white'>
                  Statistiche Campagna
                </h3>
                <p className='text-sm text-gray-500'>{viewingStats.name}</p>
              </div>
              <Button
                variant='ghost'
                size='icon'
                onClick={() => setViewingStats(null)}
                aria-label='Chiudi statistiche'
              >
                <X className='h-5 w-5' />
              </Button>
            </div>

            <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
              <div className='rounded-lg bg-brand-50 p-4 text-center dark:bg-brand-900/20'>
                <p className='text-2xl font-bold text-brand-600'>{viewingStats.stats.sent}</p>
                <p className='text-sm text-gray-600'>Inviate</p>
              </div>
              <div className='rounded-lg bg-green-50 p-4 text-center dark:bg-green-900/20'>
                <p className='text-2xl font-bold text-green-600'>{viewingStats.stats.opened}</p>
                <p className='text-sm text-gray-600'>Aperte</p>
              </div>
              <div className='rounded-lg bg-purple-50 p-4 text-center dark:bg-purple-900/20'>
                <p className='text-2xl font-bold text-purple-600'>{viewingStats.stats.clicked}</p>
                <p className='text-sm text-gray-600'>Cliccate</p>
              </div>
              <div className='rounded-lg bg-red-50 p-4 text-center dark:bg-red-900/20'>
                <p className='text-2xl font-bold text-red-600'>{viewingStats.stats.bounced}</p>
                <p className='text-sm text-gray-600'>Respinte</p>
              </div>
            </div>

            <div className='mt-6 grid gap-4 sm:grid-cols-2'>
              <div className='rounded-lg border border-gray-200 p-4 dark:border-gray-700'>
                <div className='flex items-center justify-between'>
                  <span className='text-gray-600'>Tasso Apertura</span>
                  <span className='text-xl font-bold text-gray-900 dark:text-white'>
                    {viewingStats.stats.openRate}%
                  </span>
                </div>
                <div className='mt-2 h-2 rounded-full bg-gray-200 dark:bg-gray-700'>
                  <div
                    className='h-full rounded-full bg-green-500'
                    style={{ width: `${Math.min(viewingStats.stats.openRate, 100)}%` }}
                  />
                </div>
              </div>
              <div className='rounded-lg border border-gray-200 p-4 dark:border-gray-700'>
                <div className='flex items-center justify-between'>
                  <span className='text-gray-600'>Tasso Click</span>
                  <span className='text-xl font-bold text-gray-900 dark:text-white'>
                    {viewingStats.stats.clickRate}%
                  </span>
                </div>
                <div className='mt-2 h-2 rounded-full bg-gray-200 dark:bg-gray-700'>
                  <div
                    className='h-full rounded-full bg-purple-500'
                    style={{ width: `${Math.min(viewingStats.stats.clickRate, 100)}%` }}
                  />
                </div>
              </div>
            </div>

            <div className='mt-6 flex justify-end'>
              <Button onClick={() => setViewingStats(null)}>Chiudi</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
