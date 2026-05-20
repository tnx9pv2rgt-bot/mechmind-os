'use client';

import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  CheckCircle,
  AlertTriangle,
  XCircle,
  Clock,
  FileText,
  Download,
  Share2,
  Mail,
  MessageSquare,
  Car,
  Wrench,
  ChevronDown,
  ChevronUp,
  Image as ImageIcon,
} from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import {
  DigitalInspection,
  InspectionItem,
  STATUS_COLORS,
  CATEGORY_LABELS,
} from '@/types/inspection';

interface InspectionReportProps {
  inspection: DigitalInspection;
  onApprove?: () => void;
  onDecline?: (reason: string) => void;
  onShare?: (method: 'email' | 'sms') => void;
  onDownloadPDF?: () => void;
  isCustomerView?: boolean;
}

export function InspectionReport({
  inspection,
  onApprove,
  onDecline,
  onShare,
  onDownloadPDF,
  isCustomerView = false,
}: InspectionReportProps) {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [declineReason, setDeclineReason] = useState('');
  const [showDeclineForm, setShowDeclineForm] = useState(false);

  const toggleItem = (id: string) => {
    const newSet = new Set(expandedItems);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setExpandedItems(newSet);
  };

  const needsAttentionItems = inspection.items.filter(
    i => i.status === 'needs_attention' || i.status === 'urgent'
  );
  const goodItems = inspection.items.filter(i => i.status === 'good' || i.status === 'fair');

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'critical':
        return <XCircle className='h-4 w-4 text-[var(--status-error)]' />;
      case 'high':
        return <AlertTriangle className='h-4 w-4 text-[var(--status-warning)]' />;
      case 'medium':
        return <Clock className='h-4 w-4 text-[var(--status-warning)]' />;
      default:
        return <CheckCircle className='h-4 w-4 text-[var(--status-success)]' />;
    }
  };

  return (
    <div className='max-w-4xl mx-auto space-y-6'>
      {/* Header */}
      <div className='text-center space-y-2'>
        <h1 className='text-2xl font-bold text-[var(--text-primary)]'>Rapporto di Ispezione Digitale</h1>
        <p className='text-[var(--text-secondary)]'>
          Generato il{' '}
          {new Date(inspection.completedAt || inspection.startedAt).toLocaleDateString('it-IT')} da{' '}
          {inspection.technicianName}
        </p>
      </div>

      {/* Summary Cards */}
      <div className='grid grid-cols-4 gap-4'>
        <Card
          className={cn(
            'border-l-4',
            inspection.summary.urgentCount > 0
              ? 'border-l-red-500 bg-[var(--status-error-subtle)]'
              : 'border-l-green-500 bg-[var(--status-success-subtle)]'
          )}
        >
          <CardContent className='p-4'>
            <div className='text-3xl font-bold'>{inspection.summary.urgentCount}</div>
            <div className='text-sm text-[var(--text-secondary)]'>Interventi urgenti</div>
          </CardContent>
        </Card>
        <Card className='border-l-4 border-l-yellow-500 bg-[var(--status-warning)]/10'>
          <CardContent className='p-4'>
            <div className='text-3xl font-bold'>{inspection.summary.needsAttentionCount}</div>
            <div className='text-sm text-[var(--text-secondary)]'>Da monitorare</div>
          </CardContent>
        </Card>
        <Card className='border-l-4 border-l-green-500 bg-[var(--status-success-subtle)]'>
          <CardContent className='p-4'>
            <div className='text-3xl font-bold'>{inspection.summary.goodCount}</div>
            <div className='text-sm text-[var(--text-secondary)]'>In ordine</div>
          </CardContent>
        </Card>
        <Card className='border-l-4 border-l-blue-500 bg-[var(--status-info-subtle)]'>
          <CardContent className='p-4'>
            <div className='text-3xl font-bold'>
              €{inspection.summary.estimatedTotal.toFixed(0)}
            </div>
            <div className='text-sm text-[var(--text-secondary)]'>Stima totale</div>
          </CardContent>
        </Card>
      </div>

      {/* Urgent Items Alert */}
      {needsAttentionItems.length > 0 && (
        <Card className='border-[var(--status-error)]/30 bg-[var(--status-error-subtle)]'>
          <CardHeader className='pb-3'>
            <CardTitle className='text-lg flex items-center gap-2 text-[var(--status-error)]'>
              <AlertTriangle className='h-5 w-5' />
              Richiede attenzione
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className='space-y-2'>
              {needsAttentionItems.slice(0, 5).map(item => (
                <li key={item.id} className='flex items-center gap-2 text-[var(--status-error)]'>
                  <span className='w-2 h-2 rounded-full bg-[var(--status-error-subtle)]0' />
                  {item.name} - {item.description || 'Necessita intervento'}
                  {item.estimatedCost && (
                    <Badge variant='outline' className='ml-2'>
                      €{item.estimatedCost}
                    </Badge>
                  )}
                </li>
              ))}
              {needsAttentionItems.length > 5 && (
                <li className='text-sm text-[var(--status-error)]'>
                  ...e altri {needsAttentionItems.length - 5} elementi
                </li>
              )}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Detailed Items */}
      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            <Wrench className='h-5 w-5' />
            Dettaglio Ispezione
          </CardTitle>
        </CardHeader>
        <CardContent className='space-y-4'>
          {inspection.items.map(item => {
            const isExpanded = expandedItems.has(item.id);
            const colors = STATUS_COLORS[item.status];

            return (
              <div
                key={item.id}
                className={cn(
                  'border rounded-lg overflow-hidden transition-all',
                  colors.border,
                  item.status === 'urgent' && 'bg-[var(--status-error-subtle)]/50',
                  item.status === 'needs_attention' && 'bg-[var(--status-warning)]/10/50'
                )}
              >
                <button
                  onClick={() => toggleItem(item.id)}
                  className='w-full px-4 py-3 flex items-center justify-between hover:bg-[var(--surface-secondary)]/50'
                >
                  <div className='flex items-center gap-3'>
                    <Badge className={cn(colors.bg, colors.text)}>{colors.label}</Badge>
                    <span className='font-medium'>{item.name}</span>
                    <span className='text-sm text-[var(--text-tertiary)]'>
                      • {CATEGORY_LABELS[item.category]}
                    </span>
                  </div>
                  <div className='flex items-center gap-3'>
                    {item.estimatedCost && (
                      <span className='text-sm font-medium'>€{item.estimatedCost}</span>
                    )}
                    {getPriorityIcon(item.priority)}
                    {isExpanded ? (
                      <ChevronUp className='h-4 w-4' />
                    ) : (
                      <ChevronDown className='h-4 w-4' />
                    )}
                  </div>
                </button>

                {isExpanded && (
                  <div className='px-4 pb-4 border-t border-[var(--border-default)]'>
                    {item.description && <p className='mt-3 text-[var(--text-secondary)]'>{item.description}</p>}
                    {item.technicianNotes && (
                      <div className='mt-3 p-3 bg-[var(--surface-secondary)] rounded text-sm'>
                        <span className='font-medium'>Note tecnico:</span> {item.technicianNotes}
                      </div>
                    )}
                    {item.photos.length > 0 && (
                      <div className='mt-3 flex gap-2'>
                        {item.photos.map(photo => (
                          <div
                            key={photo.id}
                            className='w-24 h-24 rounded-lg overflow-hidden border cursor-pointer hover:opacity-80'
                          >
                            <Image
                              src={photo.thumbnailUrl}
                              alt=''
                              className='w-full h-full object-cover'
                              width={200}
                              height={200}
                              unoptimized
                            />
                          </div>
                        ))}
                      </div>
                    )}
                    {item.laborHours && (
                      <div className='mt-2 text-sm text-[var(--text-tertiary)]'>
                        Tempo stimato: {item.laborHours} ore
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Customer Actions */}
      {isCustomerView && inspection.status === 'completed' && (
        <Card className='bg-gradient-to-r from-[var(--status-info)]/5 to-[var(--brand)]/5 border-[var(--status-info)]/30'>
          <CardHeader>
            <CardTitle>Azioni Richieste</CardTitle>
            <CardDescription>
              Approva o rifiuta gli interventi suggeriti direttamente da qui
            </CardDescription>
          </CardHeader>
          <CardContent className='space-y-4'>
            {showDeclineForm ? (
              <div className='space-y-3'>
                <textarea
                  className='w-full p-3 border rounded-lg'
                  placeholder='Motivo del rifiuto...'
                  value={declineReason}
                  onChange={e => setDeclineReason(e.target.value)}
                  rows={3}
                />
                <div className='flex gap-2'>
                  <Button variant='outline' onClick={() => setShowDeclineForm(false)}>
                    Annulla
                  </Button>
                  <Button
                    variant='destructive'
                    onClick={() => onDecline?.(declineReason)}
                    disabled={!declineReason.trim()}
                  >
                    Conferma Rifiuto
                  </Button>
                </div>
              </div>
            ) : (
              <div className='flex flex-wrap gap-3'>
                <Button size='lg' className='bg-[var(--status-success)] hover:bg-[var(--status-success)]' onClick={onApprove}>
                  <CheckCircle className='h-5 w-5 mr-2' />
                  Approva Tutti gli Interventi
                </Button>
                <Button size='lg' variant='outline' onClick={() => setShowDeclineForm(true)}>
                  <XCircle className='h-5 w-5 mr-2' />
                  Rifiuta
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Shop Actions */}
      {!isCustomerView && (
        <div className='flex flex-wrap gap-3 justify-center'>
          <Button variant='outline' onClick={() => onShare?.('email')}>
            <Mail className='h-4 w-4 mr-2' />
            Invia via Email
          </Button>
          <Button variant='outline' onClick={() => onShare?.('sms')}>
            <MessageSquare className='h-4 w-4 mr-2' />
            Invia via SMS
          </Button>
          <Button variant='outline' onClick={onDownloadPDF}>
            <Download className='h-4 w-4 mr-2' />
            Scarica PDF
          </Button>
        </div>
      )}
    </div>
  );
}
