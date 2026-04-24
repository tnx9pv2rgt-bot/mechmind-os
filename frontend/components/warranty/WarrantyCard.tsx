'use client';

import * as React from 'react';
import {
  Shield,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Car,
  Gauge,
  Euro,
  ChevronRight,
} from 'lucide-react';

import { cn, formatCurrency, formatDate } from '@/lib/utils';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Warranty,
  WarrantyStatus,
  WarrantyType,
  WarrantyClaim,
  WarrantyWithClaims,
} from '@/lib/services/warrantyService';

interface WarrantyCardProps {
  warranty: WarrantyWithClaims;
  onClick?: () => void;
  className?: string;
}

const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  ACTIVE: {
    label: 'Attiva',
    color: 'bg-[var(--status-success-subtle)] text-[var(--status-success)] border-[var(--status-success)]/30',
    icon: <CheckCircle2 className='h-4 w-4' />,
  },
  EXPIRING_SOON: {
    label: 'In Scadenza',
    color: 'bg-[var(--status-warning)]/10 text-[var(--status-warning)] border-[var(--status-warning)]/30',
    icon: <AlertTriangle className='h-4 w-4' />,
  },
  EXPIRED: {
    label: 'Scaduta',
    color: 'bg-[var(--status-error-subtle)] text-[var(--status-error)] border-[var(--status-error)]/30',
    icon: <XCircle className='h-4 w-4' />,
  },
  VOID: {
    label: 'Annullata',
    color: 'bg-[var(--surface-secondary)] text-[var(--text-primary)] border-[var(--border-default)]',
    icon: <XCircle className='h-4 w-4' />,
  },
};

const typeConfig: Record<string, { label: string; color: string }> = {
  MANUFACTURER: {
    label: 'Produttore',
    color: 'bg-[var(--status-info-subtle)] text-[var(--status-info)]',
  },
  EXTENDED: {
    label: 'Estesa',
    color: 'bg-[var(--brand)]/10 text-[var(--brand)]',
  },
  DEALER: {
    label: 'Concessionario',
    color: 'bg-[var(--status-success)]/10 text-[var(--status-success)]',
  },
  AS_IS: {
    label: 'Come-&Egrave;',
    color: 'bg-[var(--surface-secondary)] text-[var(--text-primary)]',
  },
};

function calculateProgress(startDate: Date | string, expirationDate: Date | string): number {
  const start = new Date(startDate).getTime();
  const end = new Date(expirationDate).getTime();
  const now = new Date().getTime();

  if (now >= end) return 100;
  if (now <= start) return 0;

  const total = end - start;
  const elapsed = now - start;
  return Math.round((elapsed / total) * 100);
}

function calculateDaysRemaining(expirationDate: Date | string): number {
  const now = new Date().getTime();
  const expiry = new Date(expirationDate).getTime();
  const diff = expiry - now;
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export function WarrantyCard({ warranty, onClick, className }: WarrantyCardProps) {
  const w = warranty as unknown as Record<string, unknown>;
  const status = statusConfig[warranty.status];
  const type = typeConfig[String(w.type ?? warranty.coverageType ?? '')];
  const progress = calculateProgress(warranty.startDate, warranty.expirationDate);
  const daysRemaining = calculateDaysRemaining(warranty.expirationDate);

  const totalClaims = warranty.claims?.length || 0;
  const approvedClaims =
    warranty.claims?.filter(c => c.status === 'APPROVED' || c.status === 'PAID').length || 0;
  const totalClaimed =
    warranty.claims?.reduce(
      (sum, c) => sum + ((c as unknown as Record<string, number>).approvedAmount || c.amount || 0),
      0
    ) || 0;
  const maxCoverage = (w.maxCoverage as number) ?? warranty.maxClaimAmount ?? 0;
  const remainingCoverage = maxCoverage - totalClaimed;

  return (
    <Card
      className={cn(
        'cursor-pointer transition-all hover:shadow-md hover:border-[var(--border-default)]',
        onClick && 'hover:translate-y-[-2px]',
        className
      )}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={
        onClick
          ? (e: React.KeyboardEvent) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
    >
      <CardHeader className='pb-3'>
        <div className='flex items-start justify-between'>
          <div className='flex items-center gap-3'>
            <div
              className={cn(
                'p-2 rounded-lg',
                warranty.status === WarrantyStatus.ACTIVE
                  ? 'bg-[var(--status-success-subtle)]'
                  : warranty.status === WarrantyStatus.EXPIRING_SOON
                    ? 'bg-[var(--status-warning-subtle)]'
                    : warranty.status === WarrantyStatus.EXPIRED
                      ? 'bg-[var(--status-error-subtle)]'
                      : 'bg-[var(--surface-secondary)]'
              )}
            >
              <Shield
                className={cn(
                  'h-5 w-5',
                  warranty.status === WarrantyStatus.ACTIVE
                    ? 'text-[var(--status-success)]'
                    : warranty.status === WarrantyStatus.EXPIRING_SOON
                      ? 'text-[var(--status-warning)]'
                      : warranty.status === WarrantyStatus.EXPIRED
                        ? 'text-[var(--status-error)]'
                        : 'text-[var(--text-secondary)]'
                )}
              />
            </div>
            <div>
              <h3 className='font-semibold text-[var(--text-primary)]'>
                {warranty.vehicle
                  ? `${warranty.vehicle.make} ${warranty.vehicle.model} ${warranty.vehicle.year}`
                  : 'Garanzia Veicolo'}
              </h3>
              <p className='text-sm text-[var(--text-tertiary)]'>{String(w.provider ?? '')}</p>
            </div>
          </div>
          <ChevronRight className='h-5 w-5 text-[var(--text-tertiary)]' />
        </div>
      </CardHeader>

      <CardContent className='space-y-4'>
        {/* Status Badge */}
        <div className='flex items-center gap-2'>
          <Badge variant='outline' className={cn('flex items-center gap-1', status.color)}>
            {status.icon}
            {status.label}
          </Badge>
          <Badge className={cn(type.color, 'border-0')}>{type.label}</Badge>
        </div>

        {/* Progress */}
        <div className='space-y-2'>
          <div className='flex items-center justify-between text-sm'>
            <span className='text-[var(--text-secondary)]'>Periodo Copertura</span>
            <span className='font-medium text-[var(--text-primary)]'>{progress}% trascorso</span>
          </div>
          <Progress value={progress} className='h-2' />
          <div className='flex items-center justify-between text-xs text-[var(--text-tertiary)]'>
            <span>{formatDate(warranty.startDate)}</span>
            <span>{formatDate(warranty.expirationDate)}</span>
          </div>
        </div>

        {/* Days Remaining */}
        {warranty.status !== WarrantyStatus.EXPIRED && warranty.status !== WarrantyStatus.VOID && (
          <div
            className={cn(
              'flex items-center gap-2 p-3 rounded-lg text-sm',
              daysRemaining <= 30
                ? 'bg-[var(--status-error-subtle)] text-[var(--status-error)]'
                : daysRemaining <= 60
                  ? 'bg-[var(--status-warning)]/5 text-[var(--status-warning)]'
                  : 'bg-[var(--status-success-subtle)] text-[var(--status-success)]'
            )}
          >
            <Calendar className='h-4 w-4' />
            <span className='font-medium'>
              {daysRemaining > 0 ? `${daysRemaining} giorni rimanenti` : 'Scade oggi'}
            </span>
          </div>
        )}

        {/* Coverage Info */}
        <div className='grid grid-cols-2 gap-3'>
          <div className='bg-[var(--surface-secondary)] rounded-lg p-3'>
            <div className='flex items-center gap-2 text-xs text-[var(--text-secondary)] mb-1'>
              <Euro className='h-3 w-3' />
              <span>Rimanente</span>
            </div>
            <div className='font-semibold text-[var(--text-primary)]'>{formatCurrency(remainingCoverage)}</div>
            <div className='text-xs text-[var(--text-tertiary)]'>di {formatCurrency(maxCoverage)}</div>
          </div>
          <div className='bg-[var(--surface-secondary)] rounded-lg p-3'>
            <div className='flex items-center gap-2 text-xs text-[var(--text-secondary)] mb-1'>
              <Gauge className='h-3 w-3' />
              <span>Copertura</span>
            </div>
            <div className='font-semibold text-[var(--text-primary)]'>
              {warranty.mileageLimit
                ? `${warranty.mileageLimit.toLocaleString()} km`
                : 'Illimitato'}
            </div>
            <div className='text-xs text-[var(--text-tertiary)]'>
              Franchigia:{' '}
              {formatCurrency((w.deductible as number) ?? warranty.deductibleAmount ?? 0)}
            </div>
          </div>
        </div>

        {/* Claims Summary */}
        {totalClaims > 0 && (
          <div className='flex items-center justify-between pt-2 border-t border-[var(--border-default)]'>
            <span className='text-sm text-[var(--text-secondary)]'>
              {totalClaims} reclam{totalClaims !== 1 ? 'i' : 'o'} presentat
              {totalClaims !== 1 ? 'i' : 'o'}
            </span>
            <span className='text-sm text-[var(--text-primary)]'>
              {approvedClaims} approvat{approvedClaims !== 1 ? 'i' : 'o'}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default WarrantyCard;
