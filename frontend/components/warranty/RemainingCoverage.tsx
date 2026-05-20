'use client';

import * as React from 'react';
import { Gauge, Euro, TrendingDown, Info } from 'lucide-react';

import { cn, formatCurrency } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface RemainingCoverageProps {
  maxCoverage: number;
  usedCoverage: number;
  coverageKm?: number | null;
  currentKm?: number;
  startKm?: number;
  className?: string;
}

export function RemainingCoverage({
  maxCoverage,
  usedCoverage,
  coverageKm,
  currentKm,
  startKm = 0,
  className,
}: RemainingCoverageProps) {
  const remainingAmount = Math.max(0, maxCoverage - usedCoverage);
  const usedPercentage = Math.min(100, (usedCoverage / maxCoverage) * 100);
  const remainingPercentage = 100 - usedPercentage;

  // Calculate km coverage if applicable
  let kmUsed = 0;
  let kmRemaining: number | null = null;
  let kmPercentage = 0;

  if (coverageKm !== null && coverageKm !== undefined && currentKm !== undefined) {
    kmUsed = Math.max(0, currentKm - startKm);
    kmRemaining = Math.max(0, coverageKm - kmUsed);
    kmPercentage = Math.min(100, (kmUsed / coverageKm) * 100);
  }

  const isLowAmount = remainingPercentage <= 20;
  const isLowKm = kmRemaining !== null && kmRemaining / (coverageKm || 1) <= 0.2;

  return (
    <TooltipProvider>
      <Card className={className}>
        <CardHeader className='pb-3'>
          <CardTitle className='text-lg flex items-center gap-2'>
            <Gauge className='h-5 w-5 text-[var(--status-info)]' />
            Copertura Residua
          </CardTitle>
        </CardHeader>
        <CardContent className='space-y-6'>
          {/* Financial Coverage */}
          <div className='space-y-3'>
            <div className='flex items-center justify-between'>
              <div className='flex items-center gap-2'>
                <Euro className='h-4 w-4 text-[var(--text-tertiary)]' />
                <span className='text-sm font-medium text-[var(--text-secondary)]'>Copertura Finanziaria</span>
              </div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className='h-4 w-4 text-[var(--text-tertiary)] cursor-help' />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Importo copertura totale meno reclami approvati</p>
                </TooltipContent>
              </Tooltip>
            </div>

            <div className='bg-[var(--surface-secondary)] rounded-lg p-4'>
              <div className='flex items-end justify-between mb-2'>
                <div>
                  <div className='text-2xl font-bold text-[var(--text-primary)]'>
                    {formatCurrency(remainingAmount)}
                  </div>
                  <div className='text-sm text-[var(--text-tertiary)]'>
                    di {formatCurrency(maxCoverage)} totali
                  </div>
                </div>
                <div className={cn('text-right', isLowAmount ? 'text-[var(--status-error)]' : 'text-[var(--status-success)]')}>
                  <div className='text-lg font-semibold'>{remainingPercentage.toFixed(0)}%</div>
                  <div className='text-xs'>residuo</div>
                </div>
              </div>

              <Progress value={usedPercentage} className='h-2' />

              <div className='flex items-center justify-between mt-2 text-xs text-[var(--text-tertiary)]'>
                <span>Utilizzato: {formatCurrency(usedCoverage)}</span>
                <span>Residuo: {formatCurrency(remainingAmount)}</span>
              </div>

              {isLowAmount && (
                <div className='mt-3 p-2 bg-[var(--status-error-subtle)] text-[var(--status-error)] text-sm rounded flex items-center gap-2'>
                  <TrendingDown className='h-4 w-4' />
                  <span>Copertura residua bassa</span>
                </div>
              )}
            </div>
          </div>

          {/* KM Coverage */}
          {coverageKm !== null && coverageKm !== undefined && currentKm !== undefined && (
            <div className='space-y-3'>
              <div className='flex items-center gap-2'>
                <Gauge className='h-4 w-4 text-[var(--text-tertiary)]' />
                <span className='text-sm font-medium text-[var(--text-secondary)]'>Copertura Chilometrica</span>
              </div>

              <div className='bg-[var(--surface-secondary)] rounded-lg p-4'>
                <div className='flex items-end justify-between mb-2'>
                  <div>
                    <div className='text-2xl font-bold text-[var(--text-primary)]'>
                      {kmRemaining?.toLocaleString()} km
                    </div>
                    <div className='text-sm text-[var(--text-tertiary)]'>
                      di {coverageKm.toLocaleString()} km totali
                    </div>
                  </div>
                  <div className={cn('text-right', isLowKm ? 'text-[var(--status-error)]' : 'text-[var(--status-success)]')}>
                    <div className='text-lg font-semibold'>
                      {Math.max(0, 100 - kmPercentage).toFixed(0)}%
                    </div>
                    <div className='text-xs'>residuo</div>
                  </div>
                </div>

                <Progress value={kmPercentage} className='h-2' />

                <div className='flex items-center justify-between mt-2 text-xs text-[var(--text-tertiary)]'>
                  <span>Utilizzati: {kmUsed.toLocaleString()} km</span>
                  <span>Residui: {kmRemaining?.toLocaleString()} km</span>
                </div>

                {isLowKm && (
                  <div className='mt-3 p-2 bg-[var(--status-error-subtle)] text-[var(--status-error)] text-sm rounded flex items-center gap-2'>
                    <TrendingDown className='h-4 w-4' />
                    <span>Chilometraggio residuo basso</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Unlimited Mileage Note */}
          {(coverageKm === null || coverageKm === undefined) && (
            <div className='flex items-center gap-2 p-3 bg-[var(--status-success-subtle)] text-[var(--status-success)] rounded-lg text-sm'>
              <Gauge className='h-4 w-4' />
              <span>Copertura chilometrica illimitata</span>
            </div>
          )}
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}

export default RemainingCoverage;
